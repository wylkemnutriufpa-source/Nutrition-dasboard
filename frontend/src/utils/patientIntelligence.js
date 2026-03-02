/**
 * Painel Inteligente do Paciente
 * Sistema frontend-first de análise de aderência e insights
 */

// ==================== SCORE DE ADERÊNCIA ====================

/**
 * Calcula score de aderência (0-100) baseado em múltiplos sinais
 * @param {Object} data - { tasks, feedbacks, agenda, plan, tips }
 * @returns {Object} { score, breakdown, level }
 */
export const computeAdherenceScore = (data = {}) => {
  const { tasks = [], feedbacks = [], agenda = [], plan = null } = data;
  
  let totalScore = 0;
  let breakdown = {};

  // 1. Checklist (40 pontos) - Principal indicador
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const checklistScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 40) : 20;
  breakdown.checklist = { score: checklistScore, weight: 40, completed: completedTasks, total: totalTasks };
  totalScore += checklistScore;

  // 2. Plano Ativo (20 pontos) - Ter plano é importante
  const planScore = plan ? 20 : 5;
  breakdown.plan = { score: planScore, weight: 20, hasPlan: !!plan };
  totalScore += planScore;

  // 3. Feedbacks/Engajamento (20 pontos) - Interação com profissional
  const recentFeedbacks = feedbacks.filter(f => {
    if (!f.created_at) return false;
    const feedbackDate = new Date(f.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return feedbackDate >= weekAgo;
  });
  const feedbackScore = Math.min(recentFeedbacks.length * 5, 20);
  breakdown.engagement = { score: feedbackScore, weight: 20, recentCount: recentFeedbacks.length };
  totalScore += feedbackScore;

  // 4. Consultas Agendadas (10 pontos) - Próximas consultas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingAppointments = agenda.filter(a => {
    if (!a.date) return false;
    const appointmentDate = new Date(a.date + 'T00:00:00');
    return appointmentDate >= today;
  });
  const agendaScore = upcomingAppointments.length > 0 ? 10 : 3;
  breakdown.appointments = { score: agendaScore, weight: 10, upcoming: upcomingAppointments.length };
  totalScore += agendaScore;

  // 5. Consistência (10 pontos) - Bonus se mantém rotina
  const consistencyScore = checklistScore >= 30 && planScore > 10 ? 10 : 5;
  breakdown.consistency = { score: consistencyScore, weight: 10 };
  totalScore += consistencyScore;

  // Determinar nível
  let level = 'low';
  let levelLabel = 'Iniciante';
  let levelColor = 'text-orange-600';
  
  if (totalScore >= 80) {
    level = 'excellent';
    levelLabel = 'Excelente';
    levelColor = 'text-green-600';
  } else if (totalScore >= 60) {
    level = 'good';
    levelLabel = 'Bom';
    levelColor = 'text-blue-600';
  } else if (totalScore >= 40) {
    level = 'moderate';
    levelLabel = 'Moderado';
    levelColor = 'text-yellow-600';
  }

  return {
    score: Math.round(totalScore),
    breakdown,
    level,
    levelLabel,
    levelColor
  };
};

// ==================== ALERTAS INTELIGENTES ====================

/**
 * Gera alertas inteligentes baseados no contexto do paciente
 * @param {Object} context - { score, tasks, plan, tips, feedbacks, agenda }
 * @returns {Array} Lista de até 3 alertas priorizados
 */
export const generateSmartAlerts = (context = {}) => {
  const { score = 0, tasks = [], plan = null, feedbacks = [], agenda = [] } = context;
  const alerts = [];

  // Alerta 1: Checklist incompleto
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  if (totalTasks > 0 && completedTasks < totalTasks * 0.7) {
    alerts.push({
      id: 'checklist_incomplete',
      type: 'warning',
      icon: '⚠️',
      title: 'Checklist Incompleto',
      message: `Você completou ${completedTasks} de ${totalTasks} tarefas hoje. Continue!`,
      priority: 1,
      color: 'bg-orange-50 border-orange-300',
      textColor: 'text-orange-700'
    });
  }

  // Alerta 2: Sem plano ativo
  if (!plan) {
    alerts.push({
      id: 'no_plan',
      type: 'info',
      icon: '📋',
      title: 'Aguardando Plano',
      message: 'Seu nutricionista ainda está preparando seu plano personalizado.',
      priority: 2,
      color: 'bg-blue-50 border-blue-300',
      textColor: 'text-blue-700'
    });
  }

  // Alerta 3: Score baixo
  if (score < 40) {
    alerts.push({
      id: 'low_score',
      type: 'alert',
      icon: '🚨',
      title: 'Aderência Baixa',
      message: 'Sua aderência está abaixo do esperado. Pequenos passos fazem diferença!',
      priority: 1,
      color: 'bg-red-50 border-red-300',
      textColor: 'text-red-700'
    });
  }

  // Alerta 4: Sem consultas agendadas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingAppointments = agenda.filter(a => {
    if (!a.date) return false;
    const appointmentDate = new Date(a.date + 'T00:00:00');
    return appointmentDate >= today;
  });
  
  if (upcomingAppointments.length === 0 && plan) {
    alerts.push({
      id: 'no_appointments',
      type: 'info',
      icon: '📅',
      title: 'Agende sua Consulta',
      message: 'Você não tem consultas futuras agendadas. Entre em contato com seu nutricionista.',
      priority: 2,
      color: 'bg-purple-50 border-purple-300',
      textColor: 'text-purple-700'
    });
  }

  // Alerta 5: Boa performance (positivo!)
  if (score >= 80) {
    alerts.push({
      id: 'excellent_performance',
      type: 'success',
      icon: '🏆',
      title: 'Parabéns!',
      message: 'Você está mantendo uma excelente aderência ao seu plano!',
      priority: 3,
      color: 'bg-green-50 border-green-300',
      textColor: 'text-green-700'
    });
  }

  // Alerta 6: Feedbacks pendentes
  const pendingFeedbacks = feedbacks.filter(f => !f.patient_response);
  if (pendingFeedbacks.length > 0) {
    alerts.push({
      id: 'pending_feedbacks',
      type: 'info',
      icon: '💬',
      title: 'Feedback do Nutricionista',
      message: `Você tem ${pendingFeedbacks.length} feedback(s) aguardando resposta.`,
      priority: 2,
      color: 'bg-indigo-50 border-indigo-300',
      textColor: 'text-indigo-700'
    });
  }

  // Ordenar por prioridade e retornar top 3
  return alerts.sort((a, b) => a.priority - b.priority).slice(0, 3);
};

// ==================== PRÓXIMO MELHOR PASSO ====================

/**
 * Determina a próxima melhor ação que o paciente deve tomar
 * @param {Object} context - { tasks, feedbacks, agenda, plan, anamnesis }
 * @returns {Object} Ação recomendada com CTA
 */
export const pickNextBestAction = (context = {}) => {
  const { tasks = [], feedbacks = [], agenda = [], plan = null, anamnesis = null } = context;

  // Prioridade 1: Completar anamnese
  if (!anamnesis || anamnesis.status !== 'complete') {
    return {
      id: 'complete_anamnesis',
      icon: '📝',
      title: 'Complete sua Anamnese',
      description: 'Preencha seus dados para receber um plano personalizado.',
      actionText: 'Preencher Agora',
      actionLink: '/patient/anamnesis',
      priority: 1,
      color: 'bg-gradient-to-r from-teal-600 to-teal-700',
      urgent: true
    };
  }

  // Prioridade 2: Completar tarefas do dia
  const incompleteTasks = tasks.filter(t => !t.completed);
  if (incompleteTasks.length > 0) {
    return {
      id: 'complete_checklist',
      icon: '✅',
      title: 'Complete suas Tarefas',
      description: `Você tem ${incompleteTasks.length} tarefa(s) pendente(s) hoje.`,
      actionText: 'Ver Checklist',
      actionLink: '#checklist',
      priority: 2,
      color: 'bg-gradient-to-r from-blue-600 to-blue-700',
      urgent: false
    };
  }

  // Prioridade 3: Responder feedbacks
  const pendingFeedbacks = feedbacks.filter(f => !f.patient_response);
  if (pendingFeedbacks.length > 0) {
    return {
      id: 'respond_feedback',
      icon: '💬',
      title: 'Responda seu Nutricionista',
      description: `${pendingFeedbacks.length} feedback(s) aguardando resposta.`,
      actionText: 'Ver Feedbacks',
      actionLink: '/patient/feedbacks',
      priority: 3,
      color: 'bg-gradient-to-r from-purple-600 to-purple-700',
      urgent: false
    };
  }

  // Prioridade 4: Ver plano alimentar
  if (plan) {
    return {
      id: 'review_plan',
      icon: '🥗',
      title: 'Revise seu Plano',
      description: 'Confira seu plano alimentar personalizado.',
      actionText: 'Ver Plano',
      actionLink: '/patient/meal-plan',
      priority: 4,
      color: 'bg-gradient-to-r from-green-600 to-green-700',
      urgent: false
    };
  }

  // Prioridade 5: Explorar receitas
  return {
    id: 'explore_recipes',
    icon: '👨‍🍳',
    title: 'Explore Receitas',
    description: 'Descubra receitas saudáveis e saborosas.',
    actionText: 'Ver Receitas',
    actionLink: '/patient/receitas',
    priority: 5,
    color: 'bg-gradient-to-r from-orange-600 to-orange-700',
    urgent: false
  };
};

// ==================== DICA DO DIA ====================

/**
 * Seleciona uma dica personalizada do dia com deduplicação
 * @param {Object} context - { tips, patientData }
 * @returns {Object|null} Dica do dia ou null se já foi vista
 */
export const pickDailyTip = (context = {}) => {
  const { tips = [], patientData = {} } = context;

  if (tips.length === 0) {
    return null;
  }

  // Verificar se já viu dica hoje
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `daily_tip_${today}`;
  const seenTipId = localStorage.getItem(storageKey);

  // Filtrar dicas já vistas
  const availableTips = tips.filter(tip => {
    if (!tip.id) return true;
    return tip.id !== seenTipId;
  });

  if (availableTips.length === 0) {
    // Se viu todas, permitir repetir
    return tips[0];
  }

  // Priorizar dicas de alta prioridade
  const highPriorityTips = availableTips.filter(t => t.priority === 'high');
  const selectedTip = highPriorityTips.length > 0 
    ? highPriorityTips[0] 
    : availableTips[0];

  // Marcar como vista
  if (selectedTip.id) {
    localStorage.setItem(storageKey, selectedTip.id);
  }

  return {
    ...selectedTip,
    isNew: true,
    date: today
  };
};

// ==================== HELPERS ====================

/**
 * Verifica se o paciente tem dados suficientes para análise
 */
export const hasSufficientData = (context = {}) => {
  const { tasks = [], plan = null, anamnesis = null } = context;
  return tasks.length > 0 || plan !== null || (anamnesis && anamnesis.status === 'complete');
};

/**
 * Gera mensagem quando não há dados suficientes
 */
export const getInsufficientDataMessage = (context = {}) => {
  const { anamnesis = null, plan = null, tasks = [] } = context;

  if (!anamnesis || anamnesis.status !== 'complete') {
    return {
      icon: '📝',
      title: 'Complete sua Anamnese',
      message: 'Precisamos conhecer você melhor! Complete sua anamnese para receber insights personalizados.',
      actionText: 'Preencher Anamnese',
      actionLink: '/patient/anamnesis'
    };
  }

  if (!plan) {
    return {
      icon: '⏳',
      title: 'Aguardando seu Plano',
      message: 'Seu nutricionista está preparando seu plano alimentar personalizado. Em breve você terá insights detalhados!',
      actionText: null,
      actionLink: null
    };
  }

  return {
    icon: '🌟',
    title: 'Comece sua Jornada',
    message: 'Adicione hábitos ao seu checklist diário para começar a receber insights personalizados.',
    actionText: 'Adicionar Hábitos',
    actionLink: '#checklist'
  };
};

export default {
  computeAdherenceScore,
  generateSmartAlerts,
  pickNextBestAction,
  pickDailyTip,
  hasSufficientData,
  getInsufficientDataMessage
};
