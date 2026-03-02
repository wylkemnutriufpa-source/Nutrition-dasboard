/**
 * INVENTÁRIO COMPLETO DE FUNCIONALIDADES DA PLATAFORMA FITJOURNEY
 * 
 * Mapeado a partir de:
 * - Sidebar do profissional (Sidebar.js)
 * - Rotas protegidas (App.js)
 * - Componentes e ações reais (supabase.js, pages/*.js)
 * 
 * Cada item reflete uma funcionalidade REAL do sistema.
 * Nada inventado, nada fictício.
 */

export const FEATURE_CATEGORIES = {
  PACIENTES: 'Pacientes',
  NUTRICAO: 'Nutrição',
  IA: 'Inteligência Artificial',
  COMUNICACAO: 'Comunicação',
  MONITORAMENTO: 'Monitoramento',
  GESTAO: 'Gestão',
  FERRAMENTAS: 'Ferramentas'
};

export const PLATFORM_FEATURES = [
  // ==================== PACIENTES ====================
  {
    key: 'view_patients_list',
    label: 'Lista de Pacientes',
    description: 'Visualizar e filtrar todos os pacientes cadastrados',
    category: FEATURE_CATEGORIES.PACIENTES,
    route: '/professional/patients',
    impactLevel: 'basic'
  },
  {
    key: 'create_patient',
    label: 'Cadastrar Paciente',
    description: 'Adicionar novo paciente à plataforma',
    category: FEATURE_CATEGORIES.PACIENTES,
    action: 'createPatientByProfessional',
    impactLevel: 'high'
  },
  {
    key: 'view_patient_profile',
    label: 'Perfil do Paciente',
    description: 'Acessar perfil completo com todas as informações do paciente',
    category: FEATURE_CATEGORIES.PACIENTES,
    route: '/professional/patient/:id',
    impactLevel: 'basic'
  },
  {
    key: 'configure_patient_menu',
    label: 'Configurar Menu do Paciente',
    description: 'Personalizar funcionalidades visíveis para cada paciente',
    category: FEATURE_CATEGORIES.PACIENTES,
    action: 'upsertPatientMenuConfig',
    impactLevel: 'medium'
  },
  {
    key: 'create_anamnesis',
    label: 'Preencher Anamnese',
    description: 'Criar ou atualizar anamnese completa do paciente',
    category: FEATURE_CATEGORIES.PACIENTES,
    action: 'createAnamnesis',
    impactLevel: 'high'
  },

  // ==================== NUTRIÇÃO ====================
  {
    key: 'create_meal_plan',
    label: 'Criar Plano Alimentar',
    description: 'Montar plano personalizado com refeições, horários e macros',
    category: FEATURE_CATEGORIES.NUTRICAO,
    action: 'createMealPlan',
    impactLevel: 'high'
  },
  {
    key: 'edit_meal_plan',
    label: 'Editar Plano Alimentar',
    description: 'Modificar plano alimentar existente de um paciente',
    category: FEATURE_CATEGORIES.NUTRICAO,
    route: '/professional/meal-plan-editor',
    impactLevel: 'medium'
  },
  {
    key: 'create_draft_plan',
    label: 'Rascunho de Plano',
    description: 'Salvar rascunho de plano alimentar para revisão',
    category: FEATURE_CATEGORIES.NUTRICAO,
    action: 'saveDraftMealPlan',
    impactLevel: 'medium'
  },
  {
    key: 'create_supplement',
    label: 'Prescrever Suplementação',
    description: 'Criar prescrição de suplementos com dosagem e horários',
    category: FEATURE_CATEGORIES.NUTRICAO,
    action: 'createSupplement',
    impactLevel: 'medium'
  },
  {
    key: 'view_templates',
    label: 'Acessar Templates Globais',
    description: 'Visualizar e gerenciar templates de planos reutilizáveis',
    category: FEATURE_CATEGORIES.NUTRICAO,
    route: '/professional/templates',
    impactLevel: 'medium'
  },
  {
    key: 'create_template',
    label: 'Criar Template Global',
    description: 'Criar template reutilizável para múltiplos pacientes',
    category: FEATURE_CATEGORIES.NUTRICAO,
    action: 'createTemplate',
    impactLevel: 'strategic'
  },

  // ==================== INTELIGÊNCIA ARTIFICIAL ====================
  {
    key: 'use_meal_photo_analysis',
    label: 'Análise de Pratos por IA',
    description: 'Analisar qualidade e macros de refeições a partir de fotos',
    category: FEATURE_CATEGORIES.IA,
    action: 'createMealAnalysis',
    impactLevel: 'strategic'
  },
  {
    key: 'use_body_analysis',
    label: 'Análise Corporal por IA',
    description: 'Análise de composição corporal por fotos com IA',
    category: FEATURE_CATEGORIES.IA,
    action: 'createBodyAnalysis',
    impactLevel: 'strategic'
  },
  {
    key: 'view_smart_recommendations',
    label: 'Recomendações Inteligentes',
    description: 'Visualizar recomendações automáticas da IA no dashboard',
    category: FEATURE_CATEGORIES.IA,
    route: '/professional/dashboard',
    impactLevel: 'strategic'
  },
  {
    key: 'view_risk_ranking',
    label: 'Ranking de Risco',
    description: 'Visualizar ranking de pacientes por score de risco calculado pela IA',
    category: FEATURE_CATEGORIES.IA,
    route: '/professional/dashboard',
    impactLevel: 'high'
  },

  // ==================== COMUNICAÇÃO ====================
  {
    key: 'view_feedbacks',
    label: 'Visualizar Feedbacks',
    description: 'Acessar lista de feedbacks enviados pelos pacientes',
    category: FEATURE_CATEGORIES.COMUNICACAO,
    route: '/professional/feedbacks',
    impactLevel: 'basic'
  },
  {
    key: 'reply_feedback',
    label: 'Responder Feedback',
    description: 'Enviar resposta a um feedback de paciente',
    category: FEATURE_CATEGORIES.COMUNICACAO,
    action: 'sendFeedbackReply',
    impactLevel: 'high'
  },
  {
    key: 'respond_sos',
    label: 'Responder SOS',
    description: 'Atender emergência nutricional de paciente com prioridade máxima',
    category: FEATURE_CATEGORIES.COMUNICACAO,
    action: 'updateFeedbackStatus',
    impactLevel: 'strategic'
  },
  {
    key: 'send_patient_message',
    label: 'Enviar Mensagem',
    description: 'Enviar mensagem direta para paciente',
    category: FEATURE_CATEGORIES.COMUNICACAO,
    action: 'createPatientMessage',
    impactLevel: 'medium'
  },
  {
    key: 'create_feedback_reminder',
    label: 'Criar Lembrete de Feedback',
    description: 'Agendar lembrete para paciente enviar feedback',
    category: FEATURE_CATEGORIES.COMUNICACAO,
    action: 'createFeedbackReminder',
    impactLevel: 'medium'
  },

  // ==================== MONITORAMENTO ====================
  {
    key: 'view_dashboard',
    label: 'Acessar Dashboard',
    description: 'Visualizar Central de Comando com métricas executivas',
    category: FEATURE_CATEGORIES.MONITORAMENTO,
    route: '/professional/dashboard',
    impactLevel: 'basic'
  },
  {
    key: 'view_engagement_chart',
    label: 'Gráfico de Engajamento',
    description: 'Visualizar gráfico de adesão ao checklist dos últimos 7 dias',
    category: FEATURE_CATEGORIES.MONITORAMENTO,
    route: '/professional/dashboard',
    impactLevel: 'medium'
  },
  {
    key: 'create_physical_assessment',
    label: 'Avaliação Física',
    description: 'Registrar medidas antropométricas e bioimpedância do paciente',
    category: FEATURE_CATEGORIES.MONITORAMENTO,
    action: 'createPhysicalAssessment',
    impactLevel: 'high'
  },
  {
    key: 'create_checklist_template',
    label: 'Criar Checklist',
    description: 'Criar template de checklist diário para pacientes',
    category: FEATURE_CATEGORIES.MONITORAMENTO,
    action: 'createChecklistTemplate',
    impactLevel: 'high'
  },

  // ==================== GESTÃO ====================
  {
    key: 'view_agenda',
    label: 'Acessar Agenda',
    description: 'Visualizar e gerenciar agenda de consultas',
    category: FEATURE_CATEGORIES.GESTAO,
    route: '/professional/agenda',
    impactLevel: 'basic'
  },
  {
    key: 'create_calendar_event',
    label: 'Criar Evento na Agenda',
    description: 'Agendar consulta ou compromisso com paciente',
    category: FEATURE_CATEGORIES.GESTAO,
    action: 'createCalendarEvent',
    impactLevel: 'medium'
  },
  {
    key: 'view_financeiro',
    label: 'Acessar Financeiro',
    description: 'Visualizar controle financeiro de pagamentos',
    category: FEATURE_CATEGORIES.GESTAO,
    route: '/professional/financeiro',
    impactLevel: 'basic'
  },
  {
    key: 'create_financial_record',
    label: 'Registrar Pagamento',
    description: 'Criar registro financeiro de paciente',
    category: FEATURE_CATEGORIES.GESTAO,
    action: 'createFinancialRecord',
    impactLevel: 'medium'
  },
  {
    key: 'configure_branding',
    label: 'Personalizar Marca',
    description: 'Configurar logo, cores e identidade visual da plataforma',
    category: FEATURE_CATEGORIES.GESTAO,
    route: '/professional/branding',
    impactLevel: 'medium'
  },
  {
    key: 'view_settings',
    label: 'Configurações',
    description: 'Acessar configurações da conta profissional',
    category: FEATURE_CATEGORIES.GESTAO,
    route: '/professional/settings',
    impactLevel: 'basic'
  },

  // ==================== FERRAMENTAS ====================
  {
    key: 'view_food_database',
    label: 'Banco de Alimentos',
    description: 'Acessar database de informações nutricionais',
    category: FEATURE_CATEGORIES.FERRAMENTAS,
    route: '/professional/food-database',
    impactLevel: 'basic'
  },
  {
    key: 'create_custom_food',
    label: 'Cadastrar Alimento',
    description: 'Adicionar alimento customizado ao banco de dados',
    category: FEATURE_CATEGORIES.FERRAMENTAS,
    action: 'createCustomFood',
    impactLevel: 'medium'
  },
  {
    key: 'view_recipes',
    label: 'Biblioteca de Receitas',
    description: 'Acessar e gerenciar receitas nutricionais',
    category: FEATURE_CATEGORIES.FERRAMENTAS,
    route: '/professional/receitas',
    impactLevel: 'basic'
  },
  {
    key: 'create_recipe',
    label: 'Criar Receita',
    description: 'Adicionar receita com ingredientes e modo de preparo',
    category: FEATURE_CATEGORIES.FERRAMENTAS,
    action: 'createRecipe',
    impactLevel: 'medium'
  },
  {
    key: 'create_personalized_tip',
    label: 'Criar Dica Personalizada',
    description: 'Criar dica de nutrição personalizada para paciente',
    category: FEATURE_CATEGORIES.FERRAMENTAS,
    action: 'createPersonalizedTip',
    impactLevel: 'medium'
  },
  {
    key: 'view_platform_guide',
    label: 'Central de Recursos',
    description: 'Explorar tutorial e guia completo da plataforma',
    category: FEATURE_CATEGORIES.FERRAMENTAS,
    route: '/professional/guide',
    impactLevel: 'basic'
  }
];

export const TOTAL_FEATURES = PLATFORM_FEATURES.length;

// Conjunto de keys que são IA
const AI_FEATURE_KEYS = new Set([
  'view_dashboard', 'view_risk_ranking', 'view_dynamic_tips', 'analyze_meal_photo',
  'view_smart_recommendations', 'view_automations', 'create_automation',
  'view_weekly_report', 'activate_automation_template'
]);

// Adicionar is_ai a cada feature dinamicamente
PLATFORM_FEATURES.forEach(f => {
  f.is_ai = AI_FEATURE_KEYS.has(f.key) || f.category === FEATURE_CATEGORIES.IA;
});

/**
 * Contagens dinâmicas (NUNCA hardcoded)
 */
export const DYNAMIC_COUNTS = {
  get total() { return PLATFORM_FEATURES.length; },
  get totalAI() { return PLATFORM_FEATURES.filter(f => f.is_ai).length; },
  get totalCategories() { return new Set(PLATFORM_FEATURES.map(f => f.category)).size; },
  get totalActive() { return PLATFORM_FEATURES.filter(f => f.is_active !== false).length; }
};

/**
 * Retorna features agrupadas por categoria
 */
export const getFeaturesByCategory = () => {
  const grouped = {};
  for (const cat of Object.values(FEATURE_CATEGORIES)) {
    grouped[cat] = PLATFORM_FEATURES.filter(f => f.category === cat);
  }
  return grouped;
};

/**
 * Retorna um mapa de featureKey → feature para lookup rápido
 */
export const FEATURE_MAP = Object.fromEntries(
  PLATFORM_FEATURES.map(f => [f.key, f])
);

/**
 * Emojis por categoria para exibição
 */
export const CATEGORY_EMOJIS = {
  [FEATURE_CATEGORIES.PACIENTES]: '👥',
  [FEATURE_CATEGORIES.NUTRICAO]: '🥗',
  [FEATURE_CATEGORIES.IA]: '🤖',
  [FEATURE_CATEGORIES.COMUNICACAO]: '💬',
  [FEATURE_CATEGORIES.MONITORAMENTO]: '📊',
  [FEATURE_CATEGORIES.GESTAO]: '⚙️',
  [FEATURE_CATEGORIES.FERRAMENTAS]: '🛠️'
};

/**
 * Gradientes por categoria para UI
 */
export const CATEGORY_GRADIENTS = {
  [FEATURE_CATEGORIES.PACIENTES]: 'from-blue-500 to-indigo-600',
  [FEATURE_CATEGORIES.NUTRICAO]: 'from-green-500 to-emerald-600',
  [FEATURE_CATEGORIES.IA]: 'from-purple-500 to-pink-600',
  [FEATURE_CATEGORIES.COMUNICACAO]: 'from-amber-500 to-orange-600',
  [FEATURE_CATEGORIES.MONITORAMENTO]: 'from-teal-500 to-cyan-600',
  [FEATURE_CATEGORIES.GESTAO]: 'from-slate-500 to-gray-600',
  [FEATURE_CATEGORIES.FERRAMENTAS]: 'from-rose-500 to-red-600'
};
