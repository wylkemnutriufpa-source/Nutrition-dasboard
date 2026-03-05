/**
 * automationEngine.js
 * Motor de automação que avalia regras contra dados de pacientes
 * Executa ações automaticamente (notificações, lembretes, etc.)
 *
 * BLINDAGEM:
 * - Cooldown verificado no BANCO (RPC/query única) - não mais no JS
 * - Suporte a regras avançadas com config JSONB (plano programado)
 * - Nenhum caminho paralelo: todas as queries passam por supabase.js
 */

import {
  createNotification,
  createReminder,
  createAutomationLog,
  updateAutomationRuleExecution,
  syncTemplatesForPatient,
  checkCooldownInDB,
  getPatientWeightInWindow,
  countPatientFeedbacksInWindow,
  activateMealPlan,
  updateRuleLastEvaluated
} from '@/lib/supabase';

// ==================== AVALIAÇÃO DE CONDIÇÕES BÁSICAS ====================

/**
 * Avalia se a condição do gatilho é verdadeira para um paciente
 */
const evaluateCondition = (rule, patient) => {
  const { trigger_type, trigger_value } = rule;
  const threshold = trigger_value || 3;

  switch (trigger_type) {
    case 'inactive_days': {
      const lastLogin = patient.last_login || patient.last_sign_in_at || patient.updated_at;
      if (!lastLogin) return true;
      const daysSince = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= threshold;
    }

    case 'low_checklist': {
      const score = patient.engagementScore || 0;
      return score < threshold;
    }

    case 'plan_expiring': {
      const planEnd = patient.stats?.plan_end_date || patient.plan_end_date;
      if (!planEnd) return false;
      const daysUntil = Math.floor((new Date(planEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= threshold;
    }

    case 'new_patient': {
      const created = patient.created_at;
      if (!created) return false;
      const hoursSince = (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60);
      return hoursSince <= (threshold * 24);
    }

    case 'high_risk': {
      const riskScore = patient.dashboardRisk?.score || 0;
      return riskScore >= threshold;
    }

    case 'no_feedback': {
      const lastFeedback = patient.stats?.last_feedback_at;
      if (!lastFeedback) return true;
      const daysSince = Math.floor((Date.now() - new Date(lastFeedback).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= threshold;
    }

    case 'scheduled_plan': {
      // Regras avançadas são avaliadas por evaluateAdvancedCondition
      return true; // Permitir que passe para a avaliação avançada
    }

    default:
      return false;
  }
};

// ==================== AVALIAÇÃO AVANÇADA (PLANO PROGRAMADO) ====================

/**
 * Operadores de comparação dinâmicos
 */
const OPERATORS = {
  '>=': (a, b) => a >= b,
  '>': (a, b) => a > b,
  '<=': (a, b) => a <= b,
  '<': (a, b) => a < b,
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b
};

/**
 * Avalia um requisito individual contra dados reais do paciente
 */
const evaluateRequirement = async (req, patientId, windowDays) => {
  const { type, operator, value } = req;
  const compare = OPERATORS[operator] || OPERATORS['>='];

  switch (type) {
    case 'weight_feedback_count': {
      const { count } = await countPatientFeedbacksInWindow(patientId, windowDays, 'weight');
      return { met: compare(count, value), actual: count, expected: value, type };
    }

    case 'photo_feedback_count': {
      const { count } = await countPatientFeedbacksInWindow(patientId, windowDays, 'photo');
      return { met: compare(count, value), actual: count, expected: value, type };
    }

    case 'weight_loss_kg': {
      const { data: weights } = await getPatientWeightInWindow(patientId, windowDays);
      if (!weights || weights.length < 2) {
        return { met: false, actual: 0, expected: value, type, reason: 'Dados insuficientes' };
      }
      const first = weights[0].weight;
      const last = weights[weights.length - 1].weight;
      const loss = first - last;
      return { met: compare(loss, value), actual: parseFloat(loss.toFixed(2)), expected: value, type };
    }

    case 'weight_gain_kg': {
      const { data: weights } = await getPatientWeightInWindow(patientId, windowDays);
      if (!weights || weights.length < 2) {
        return { met: false, actual: 0, expected: value, type, reason: 'Dados insuficientes' };
      }
      const first = weights[0].weight;
      const last = weights[weights.length - 1].weight;
      const gain = last - first;
      return { met: compare(gain, value), actual: parseFloat(gain.toFixed(2)), expected: value, type };
    }

    case 'checklist_completion': {
      const score = 0; // Será preenchido com dados reais
      return { met: compare(score, value), actual: score, expected: value, type };
    }

    default:
      return { met: false, actual: null, expected: value, type, reason: 'Tipo desconhecido' };
  }
};

/**
 * Avalia uma regra avançada completa contra um paciente
 * Retorna { allMet, results[], action }
 */
const evaluateAdvancedCondition = async (rule, patient) => {
  const config = rule.config || {};
  const requirements = config.requirements || [];
  const windowDays = config.evaluation_window_days || 15;

  if (requirements.length === 0) {
    return { allMet: false, results: [], reason: 'Sem requisitos configurados' };
  }

  // Verificar schedule_at (se ainda não chegou a data, não avaliar)
  if (rule.schedule_at) {
    const scheduleDate = new Date(rule.schedule_at);
    if (scheduleDate > new Date()) {
      return { allMet: false, results: [], reason: 'Agendamento ainda não chegou' };
    }
  }

  const results = [];
  for (const req of requirements) {
    const result = await evaluateRequirement(req, patient.id, windowDays);
    results.push(result);
  }

  const allMet = results.every(r => r.met);

  return {
    allMet,
    results,
    action: allMet ? (config.on_success || {}) : (config.on_fail || {}),
    reason: allMet ? 'Todos os requisitos atendidos' : 'Requisitos não atendidos'
  };
};

/**
 * Executa ação avançada (ativar plano, estender ciclo, etc.)
 */
const executeAdvancedAction = async (actionConfig, patient, professionalId, rule) => {
  const patientName = patient.full_name || patient.name || 'Paciente';
  const action = actionConfig.action || 'notify_professional';

  try {
    switch (action) {
      case 'activate_plan': {
        if (actionConfig.plan_id) {
          await activateMealPlan(actionConfig.plan_id, patient.id);
          await createNotification(patient.id, {
            title: '🔄 Novo Plano Alimentar Ativado',
            message: 'Seu plano alimentar foi atualizado automaticamente. Confira as novidades!',
            type: 'automation',
            link: '/patient/meal-plan'
          });
          await createNotification(professionalId, {
            title: `🤖 Plano Ativado - ${patientName}`,
            message: `O plano programado de ${patientName} foi ativado automaticamente (metas atingidas).`,
            type: 'automation',
            link: `/professional/patient/${patient.id}`
          });
          return { success: true, action: `Plano ativado para ${patientName} (metas atingidas)` };
        }
        return { success: false, action: 'plan_id não configurado' };
      }

      case 'extend_cycle': {
        const extendDays = actionConfig.days || 15;
        const newSchedule = new Date();
        newSchedule.setDate(newSchedule.getDate() + extendDays);
        // Atualizar schedule_at da regra para a próxima avaliação
        const { updateAutomationRule } = await import('@/lib/supabase');
        await updateAutomationRule(rule.id, {
          schedule_at: newSchedule.toISOString(),
          last_evaluated_at: new Date().toISOString()
        });
        await createNotification(professionalId, {
          title: `⏰ Ciclo Estendido - ${patientName}`,
          message: `Metas não atingidas. Ciclo estendido por mais ${extendDays} dias. Próxima avaliação: ${newSchedule.toLocaleDateString('pt-BR')}.`,
          type: 'automation',
          link: `/professional/patient/${patient.id}`
        });
        return { success: true, action: `Ciclo estendido +${extendDays} dias para ${patientName} (metas não atingidas)` };
      }

      case 'maintain_plan': {
        await createNotification(professionalId, {
          title: `📋 Plano Mantido - ${patientName}`,
          message: `As metas de ${patientName} não foram atingidas. Plano atual mantido.`,
          type: 'automation',
          link: `/professional/patient/${patient.id}`
        });
        return { success: true, action: `Plano mantido para ${patientName} (metas não atingidas)` };
      }

      case 'switch_to_alternate': {
        if (actionConfig.plan_id) {
          await activateMealPlan(actionConfig.plan_id, patient.id);
          await createNotification(professionalId, {
            title: `🔀 Plano Alternativo - ${patientName}`,
            message: `Metas não atingidas. Plano alternativo ativado para ${patientName}.`,
            type: 'automation',
            link: `/professional/patient/${patient.id}`
          });
          return { success: true, action: `Plano alternativo ativado para ${patientName}` };
        }
        return { success: false, action: 'plan_id alternativo não configurado' };
      }

      default:
        return { success: false, action: `Ação desconhecida: ${action}` };
    }
  } catch (error) {
    console.error(`Erro na ação avançada ${action}:`, error);
    return { success: false, action: `Erro: ${error.message}` };
  }
};

// ==================== EXECUÇÃO DE AÇÕES BÁSICAS ====================

const executeAction = async (rule, patient, professionalId) => {
  const patientName = patient.full_name || patient.name || 'Paciente';
  const customMessage = rule.action_message || '';

  try {
    switch (rule.action_type) {
      case 'notify_patient': {
        const message = customMessage || getDefaultMessage(rule.trigger_type, patientName, 'patient');
        await createNotification(patient.id, {
          title: getNotificationTitle(rule.trigger_type),
          message,
          type: 'automation',
          link: getPatientLink(rule.trigger_type)
        });
        return { success: true, action: `Notificação enviada para ${patientName}` };
      }

      case 'notify_professional': {
        const message = customMessage || getDefaultMessage(rule.trigger_type, patientName, 'professional');
        await createNotification(professionalId, {
          title: `🤖 ${rule.name}`,
          message: `${patientName}: ${message}`,
          type: 'automation',
          link: `/professional/patient/${patient.id}`
        });
        return { success: true, action: `Alerta criado sobre ${patientName}` };
      }

      case 'create_reminder': {
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + 1);
        await createReminder({
          patient_id: patient.id,
          professional_id: professionalId,
          title: `🤖 ${rule.name} - ${patientName}`,
          date: reminderDate.toISOString().split('T')[0],
          type: 'lembrete',
          status: 'scheduled',
          notes: customMessage || `Automação: ${rule.description}`
        });
        return { success: true, action: `Lembrete criado para ${patientName}` };
      }

      case 'assign_templates': {
        await syncTemplatesForPatient(patient.id, professionalId);
        if (rule.trigger_type === 'new_patient') {
          await createNotification(patient.id, {
            title: '🎉 Bem-vindo(a) ao FitJourney!',
            message: customMessage || 'Seu nutricionista configurou tudo para você. Comece preenchendo sua anamnese!',
            type: 'welcome',
            link: '/patient/dashboard'
          });
          await createNotification(patient.id, {
            title: '📋 Preencha sua Anamnese',
            message: 'A anamnese é essencial para personalizar seu acompanhamento.',
            type: 'automation',
            link: '/patient/anamnese'
          });
        }
        return { success: true, action: `Templates + onboarding para ${patientName}` };
      }

      case 'activate_plan':
      case 'extend_cycle': {
        // Ações avançadas delegadas ao evaluateAdvancedCondition
        return { success: false, action: 'Usar avaliação avançada' };
      }

      default:
        return { success: false, action: 'Ação desconhecida' };
    }
  } catch (error) {
    console.error(`Erro na automação ${rule.name}:`, error);
    return { success: false, action: `Erro: ${error.message}` };
  }
};

// ==================== MENSAGENS PADRÃO ====================

const getNotificationTitle = (triggerType) => {
  const titles = {
    inactive_days: '👋 Sentimos sua falta!',
    low_checklist: '📋 Seus hábitos precisam de atenção',
    plan_expiring: '⏰ Seu plano está vencendo',
    new_patient: '🎉 Bem-vindo(a)!',
    high_risk: '⚠️ Atenção à sua saúde',
    no_feedback: '💬 Conte-nos como está indo'
  };
  return titles[triggerType] || '🔔 Notificação';
};

const getDefaultMessage = (triggerType, patientName, target) => {
  if (target === 'patient') {
    const messages = {
      inactive_days: 'Faz tempo que não te vemos! Entre e confira suas tarefas do dia.',
      low_checklist: 'Seus hábitos diários precisam de mais atenção. Vamos melhorar juntos?',
      plan_expiring: 'Seu plano alimentar está próximo do vencimento. Converse com seu nutricionista.',
      new_patient: 'Bem-vindo(a) ao FitJourney! Comece preenchendo sua anamnese.',
      high_risk: 'Identificamos pontos de atenção no seu acompanhamento. Confira suas tarefas.',
      no_feedback: 'Gostaríamos de saber como você está! Envie um feedback ao seu nutricionista.'
    };
    return messages[triggerType] || 'Você tem uma nova notificação.';
  } else {
    const messages = {
      inactive_days: `${patientName} está inativo há vários dias.`,
      low_checklist: `${patientName} está com baixa adesão ao checklist.`,
      plan_expiring: `O plano de ${patientName} está próximo do vencimento.`,
      new_patient: `${patientName} é um novo paciente. Onboarding automático executado.`,
      high_risk: `${patientName} está com score de risco elevado.`,
      no_feedback: `${patientName} não enviou feedback recentemente.`
    };
    return messages[triggerType] || `Automação disparada para ${patientName}.`;
  }
};

const getPatientLink = (triggerType) => {
  const links = {
    inactive_days: '/patient/dashboard',
    low_checklist: '/patient/tarefas',
    plan_expiring: '/patient/meu-plano',
    new_patient: '/patient/dashboard',
    high_risk: '/patient/dashboard',
    no_feedback: '/patient/feedback'
  };
  return links[triggerType] || '/patient/dashboard';
};

// ==================== MOTOR PRINCIPAL ====================

/**
 * Avalia todas as regras contra todos os pacientes
 * BLINDAGEM: cooldown verificado no BANCO (não mais no JS)
 */
export const runAutomationEngine = async (rules, patients, professionalId) => {
  if (!rules?.length || !patients?.length || !professionalId) {
    return { executed: 0, actions: [] };
  }

  const activeRules = rules.filter(r => r.is_active);
  if (activeRules.length === 0) return { executed: 0, actions: [] };

  const actions = [];
  let executed = 0;

  for (const rule of activeRules) {
    // Regras avançadas (scheduled_plan) processam pacientes de forma especial
    const isAdvanced = rule.trigger_type === 'scheduled_plan';

    for (const patient of patients) {
      try {
        // 1. Avaliar condição básica
        const shouldTrigger = evaluateCondition(rule, patient);
        if (!shouldTrigger) continue;

        // 2. Verificar cooldown NO BANCO (query única, índice otimizado)
        const canExecute = await checkCooldownInDB(
          rule.id, patient.id, rule.cooldown_hours || 24
        );
        if (!canExecute) continue;

        let result;

        if (isAdvanced) {
          // 3a. Avaliação avançada (plano programado)
          const evaluation = await evaluateAdvancedCondition(rule, patient);
          if (evaluation.reason === 'Agendamento ainda não chegou') continue;

          result = await executeAdvancedAction(evaluation.action, patient, professionalId, rule);
          result.action = `[${evaluation.reason}] ${result.action}`;
          // Atualizar last_evaluated_at
          await updateRuleLastEvaluated(rule.id);
        } else {
          // 3b. Ação básica
          result = await executeAction(rule, patient, professionalId);
        }

        // 4. Registrar log
        await createAutomationLog({
          rule_id: rule.id,
          rule_name: rule.name,
          professional_id: professionalId,
          patient_id: patient.id,
          patient_name: patient.full_name || patient.name || 'Paciente',
          trigger_type: rule.trigger_type,
          action_type: rule.action_type,
          action_detail: result.action
        });

        // 5. Atualizar contador de execução
        await updateAutomationRuleExecution(rule.id);

        actions.push({
          rule: rule.name,
          patient: patient.full_name || patient.name,
          action: result.action,
          success: result.success
        });

        executed++;
      } catch (error) {
        console.error(`Erro processando regra ${rule.name} para paciente ${patient.id}:`, error);
      }
    }
  }

  if (executed > 0) {
    console.log(`🤖 Automação: ${executed} ações executadas`);
  }

  return { executed, actions };
};

// ==================== TEMPLATES DE AUTOMAÇÃO ====================

export const AUTOMATION_TEMPLATES = [
  {
    id: 'inactive_notify',
    name: '🔔 Notificar Paciente Inativo',
    description: 'Envia notificação quando paciente não faz login há X dias',
    trigger_type: 'inactive_days',
    trigger_value: 3,
    action_type: 'notify_patient',
    action_message: '',
    cooldown_hours: 48,
    icon: '🔔',
    gradient: 'from-amber-500 to-orange-600',
    category: 'engajamento'
  },
  {
    id: 'inactive_alert',
    name: '⚠️ Alerta de Inatividade',
    description: 'Alerta o profissional sobre pacientes inativos há X dias',
    trigger_type: 'inactive_days',
    trigger_value: 5,
    action_type: 'notify_professional',
    action_message: '',
    cooldown_hours: 72,
    icon: '⚠️',
    gradient: 'from-red-500 to-rose-600',
    category: 'monitoramento'
  },
  {
    id: 'low_checklist',
    name: '📋 Checklist Baixo',
    description: 'Alerta quando engajamento do paciente fica abaixo de X%',
    trigger_type: 'low_checklist',
    trigger_value: 40,
    action_type: 'notify_professional',
    action_message: '',
    cooldown_hours: 48,
    icon: '📋',
    gradient: 'from-purple-500 to-indigo-600',
    category: 'monitoramento'
  },
  {
    id: 'plan_expiring',
    name: '⏰ Plano Vencendo',
    description: 'Cria lembrete quando plano do paciente vence em X dias',
    trigger_type: 'plan_expiring',
    trigger_value: 7,
    action_type: 'create_reminder',
    action_message: '',
    cooldown_hours: 168,
    icon: '⏰',
    gradient: 'from-cyan-500 to-blue-600',
    category: 'gestao'
  },
  {
    id: 'onboarding',
    name: '🚀 Onboarding Automático',
    description: 'Atribui templates e envia boas-vindas para novos pacientes',
    trigger_type: 'new_patient',
    trigger_value: 1,
    action_type: 'assign_templates',
    action_message: '',
    cooldown_hours: 999,
    icon: '🚀',
    gradient: 'from-emerald-500 to-teal-600',
    category: 'onboarding'
  },
  {
    id: 'high_risk',
    name: '🔴 Risco Elevado',
    description: 'Alerta quando score de risco do paciente ultrapassa X',
    trigger_type: 'high_risk',
    trigger_value: 70,
    action_type: 'notify_professional',
    action_message: '',
    cooldown_hours: 24,
    icon: '🔴',
    gradient: 'from-red-600 to-pink-600',
    category: 'monitoramento'
  },
  {
    id: 'no_feedback',
    name: '💬 Solicitar Feedback',
    description: 'Notifica paciente que não enviou feedback há X dias',
    trigger_type: 'no_feedback',
    trigger_value: 7,
    action_type: 'notify_patient',
    action_message: '',
    cooldown_hours: 72,
    icon: '💬',
    gradient: 'from-blue-500 to-indigo-600',
    category: 'engajamento'
  },
  {
    id: 'scheduled_plan',
    name: '📅 Plano Programado',
    description: 'Troca de plano alimentar baseada em critérios configuráveis (peso, feedbacks, fotos)',
    trigger_type: 'scheduled_plan',
    trigger_value: 15,
    action_type: 'activate_plan',
    action_message: '',
    cooldown_hours: 999,
    icon: '📅',
    gradient: 'from-emerald-600 to-cyan-600',
    category: 'gestao',
    isAdvanced: true
  }
];

export default runAutomationEngine;
