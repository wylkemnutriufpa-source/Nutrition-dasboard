/**
 * automationEngine.js
 * Motor de automação que avalia regras contra dados de pacientes
 * Executa ações automaticamente (notificações, lembretes, etc.)
 */

import {
  createNotification,
  createReminder,
  getAutomationLogs,
  createAutomationLog,
  updateAutomationRuleExecution,
  syncTemplatesForPatient
} from '@/lib/supabase';

// ==================== AVALIAÇÃO DE CONDIÇÕES ====================

/**
 * Avalia se a condição do gatilho é verdadeira para um paciente
 */
const evaluateCondition = (rule, patient) => {
  const { trigger_type, trigger_value } = rule;
  const threshold = trigger_value || 3;

  switch (trigger_type) {
    case 'inactive_days': {
      // Paciente sem login há X dias
      const lastLogin = patient.last_login || patient.last_sign_in_at || patient.updated_at;
      if (!lastLogin) return true; // Nunca logou = inativo
      const daysSince = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= threshold;
    }

    case 'low_checklist': {
      // Checklist abaixo de X% (usar engagementScore como proxy)
      const score = patient.engagementScore || 0;
      return score < threshold;
    }

    case 'plan_expiring': {
      // Plano vence em X dias
      const planEnd = patient.stats?.plan_end_date || patient.plan_end_date;
      if (!planEnd) return false;
      const daysUntil = Math.floor((new Date(planEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= threshold;
    }

    case 'new_patient': {
      // Paciente criado há menos de X horas (default: 24)
      const created = patient.created_at;
      if (!created) return false;
      const hoursSince = (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60);
      return hoursSince <= (threshold * 24); // threshold em dias
    }

    case 'high_risk': {
      // Score de risco acima de X
      const riskScore = patient.dashboardRisk?.score || 0;
      return riskScore >= threshold;
    }

    case 'no_feedback': {
      // Sem feedback há X dias
      const lastFeedback = patient.stats?.last_feedback_at;
      if (!lastFeedback) return true;
      const daysSince = Math.floor((Date.now() - new Date(lastFeedback).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= threshold;
    }

    default:
      return false;
  }
};

// ==================== VERIFICAÇÃO DE COOLDOWN ====================

/**
 * Verifica se a regra pode ser executada para o paciente (respeitando cooldown)
 */
const checkCooldown = async (ruleId, patientId, cooldownHours, recentLogs) => {
  // Usar logs já carregados para evitar N+1 queries
  const relevantLog = recentLogs.find(
    log => log.rule_id === ruleId && log.patient_id === patientId
  );

  if (!relevantLog) return true; // Nunca executou

  const hoursSince = (Date.now() - new Date(relevantLog.created_at).getTime()) / (1000 * 60 * 60);
  return hoursSince >= cooldownHours;
};

// ==================== EXECUÇÃO DE AÇÕES ====================

/**
 * Executa a ação definida na regra
 */
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
        // Also send welcome notification for new patients
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
 * Retorna array de ações executadas
 */
export const runAutomationEngine = async (rules, patients, professionalId) => {
  if (!rules?.length || !patients?.length || !professionalId) {
    return { executed: 0, actions: [] };
  }

  const activeRules = rules.filter(r => r.is_active);
  if (activeRules.length === 0) return { executed: 0, actions: [] };

  // Buscar logs recentes (últimas 48h) para cooldown
  const { data: recentLogs } = await getAutomationLogs(professionalId, 500);
  const logsData = recentLogs || [];

  const actions = [];
  let executed = 0;

  for (const rule of activeRules) {
    for (const patient of patients) {
      try {
        const shouldTrigger = evaluateCondition(rule, patient);
        if (!shouldTrigger) continue;

        const canExecute = await checkCooldown(
          rule.id, patient.id, rule.cooldown_hours || 24, logsData
        );
        if (!canExecute) continue;

        // Executar ação
        const result = await executeAction(rule, patient, professionalId);

        // Registrar log
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

        // Atualizar contador de execução
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
  }
];

export default runAutomationEngine;
