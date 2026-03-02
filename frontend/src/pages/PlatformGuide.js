import React, { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, ClipboardList, Utensils, Camera, User, MessageSquare,
  Bell, AlertTriangle, Shield, TrendingUp, Calculator, Calendar, 
  FileText, Copy, BarChart3, Settings, Sparkles, ChevronRight,
  CheckCircle2, Play, BookOpen, Lightbulb, Rocket, Heart, Star,
  Zap, Target, Award, Crown, Gift, HelpCircle, ExternalLink,
  ShoppingCart, Pill, ChefHat, Activity, Brain, Flame, Lock,
  Search, ChevronDown, ChevronUp, ArrowRight, GraduationCap,
  Palette, Eye, MousePointer, Layers, ListChecks, PartyPopper,
  CircleDot, Info, Coffee, Dumbbell, Salad, X, Trophy, Compass,
  Map, Gem, CircleCheck, Circle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { useProfessionalJourney } from '@/hooks/useProfessionalJourney';
import { 
  PLATFORM_FEATURES as INVENTORY_FEATURES, 
  FEATURE_CATEGORIES, 
  CATEGORY_EMOJIS, 
  CATEGORY_GRADIENTS,
  getFeaturesByCategory 
} from '@/constants/platformFeatureInventory';

// ==================== TABS ====================
const TABS = [
  { id: 'jornada', label: 'Minha Jornada', icon: Map },
  { id: 'funcionalidades', label: 'Funcionalidades', icon: Layers },
  { id: 'tutorial', label: 'Tutorial', icon: GraduationCap },
  { id: 'novidades', label: 'Novidades', icon: PartyPopper },
  { id: 'dicas', label: 'Dicas Pro', icon: Lightbulb }
];

// ==================== GETTING STARTED STEPS ====================
const GETTING_STARTED_STEPS = [
  {
    step: 1, title: 'Configure seu Perfil',
    description: 'Personalize sua marca, logo, cores e informacoes profissionais.',
    detailedTips: ['Va em Personalizacao para adicionar seu logo', 'Configure cores que representam sua marca', 'Preencha suas informacoes profissionais em Configuracoes'],
    icon: Palette, route: '/professional/branding', gradient: 'from-pink-500 to-rose-600', duration: '2 min'
  },
  {
    step: 2, title: 'Cadastre seu Primeiro Paciente',
    description: 'Adicione pacientes manualmente ou envie um link de convite.',
    detailedTips: ['Clique em "Novo Paciente" na lista de pacientes', 'Preencha email e dados basicos', 'O paciente recebera acesso automatico'],
    icon: UserPlus, route: '/professional/patients', gradient: 'from-blue-500 to-indigo-600', duration: '1 min'
  },
  {
    step: 3, title: 'Preencha a Anamnese',
    description: 'A anamnese completa alimenta a IA do sistema.',
    detailedTips: ['Acesse o perfil do paciente', 'Clique na aba "Anamnese"', 'Preencha todos os campos - cada dado melhora a IA'],
    icon: ClipboardList, route: '/professional/patients', gradient: 'from-emerald-500 to-teal-600', duration: '5 min'
  },
  {
    step: 4, title: 'Crie um Plano Alimentar',
    description: 'Monte planos personalizados com refeicoes, horarios e macros.',
    detailedTips: ['Acesse o perfil do paciente -> Plano Alimentar', 'Adicione refeicoes com alimentos e quantidades', 'Salve como template para reutilizar'],
    icon: Utensils, route: '/professional/patients', gradient: 'from-amber-500 to-orange-600', duration: '10 min'
  },
  {
    step: 5, title: 'Monitore o Dashboard',
    description: 'Acompanhe seus pacientes pela Central de Comando.',
    detailedTips: ['O Dashboard atualiza em tempo real', 'Priorize pacientes com SOS ativo', 'Use as recomendacoes da IA para agir proativamente'],
    icon: BarChart3, route: '/professional/dashboard', gradient: 'from-purple-500 to-violet-600', duration: '3 min'
  },
  {
    step: 6, title: 'Explore a IA Premium',
    description: 'Ative analise de pratos por foto, analise corporal e recomendacoes inteligentes.',
    detailedTips: ['Pacientes podem enviar fotos de refeicoes', 'A IA analisa qualidade, macros e adesao', 'Alertas automaticos aparecem no seu dashboard'],
    icon: Brain, route: '/professional/dashboard', gradient: 'from-fuchsia-500 to-pink-600', duration: '2 min'
  }
];

// ==================== FEATURE ICON MAP ====================
const FEATURE_ICON_MAP = {
  view_patients_list: Users, create_patient: UserPlus, view_patient_profile: FileText,
  configure_patient_menu: Settings, create_anamnesis: ClipboardList, create_meal_plan: Utensils,
  edit_meal_plan: Utensils, create_draft_plan: FileText, create_supplement: Pill,
  view_templates: Copy, create_template: Rocket, use_meal_photo_analysis: Camera,
  use_body_analysis: User, view_smart_recommendations: Brain, view_risk_ranking: AlertTriangle,
  view_feedbacks: MessageSquare, reply_feedback: MessageSquare, respond_sos: Shield,
  send_patient_message: MessageSquare, create_feedback_reminder: Bell,
  view_dashboard: BarChart3, view_engagement_chart: TrendingUp, create_physical_assessment: Activity,
  create_checklist_template: ListChecks, view_agenda: Calendar, create_calendar_event: Calendar,
  view_financeiro: Target, create_financial_record: Target, configure_branding: Palette,
  view_settings: Settings, view_food_database: Salad, create_custom_food: Salad,
  view_recipes: ChefHat, create_recipe: ChefHat, create_personalized_tip: Lightbulb,
  view_platform_guide: BookOpen
};

// ==================== NOVIDADES ====================
const WHATS_NEW = [
  { id: 1, date: 'Janeiro 2026', title: 'HUB Interativo da Jornada', description: 'Acompanhe seu progresso real de ativacao de funcionalidades com gamificacao e medalhas.', icon: Map, type: 'feature', gradient: 'from-indigo-500 to-purple-500' },
  { id: 2, date: 'Janeiro 2026', title: 'Tracking Inteligente de Uso', description: 'O sistema agora rastreia automaticamente quais funcionalidades voce ja usou.', icon: Target, type: 'ia', gradient: 'from-teal-500 to-emerald-500' },
  { id: 3, date: 'Julho 2025', title: 'Analise de Pratos por IA', description: 'Pacientes enviam foto da refeicao e a IA analisa qualidade, macronutrientes e adesao ao plano.', icon: Camera, type: 'ia', gradient: 'from-blue-500 to-cyan-500' },
  { id: 4, date: 'Julho 2025', title: 'Dashboard Inteligente', description: 'Central de Comando com alertas SOS, ranking de risco, recomendacoes da IA e metricas executivas.', icon: BarChart3, type: 'improvement', gradient: 'from-emerald-500 to-teal-500' },
  { id: 5, date: 'Junho 2025', title: 'Templates Globais', description: 'Crie templates de planos alimentares e aplique em multiplos pacientes com um clique.', icon: Copy, type: 'feature', gradient: 'from-amber-500 to-orange-500' },
  { id: 6, date: 'Junho 2025', title: 'SOS Emergencia', description: 'Sistema de emergencia nutricional com prioridade maxima e alertas instantaneos.', icon: Shield, type: 'feature', gradient: 'from-red-500 to-rose-500' }
];

// ==================== DICAS PRO ====================
const PRO_TIPS = [
  { id: 1, category: 'Produtividade', icon: Zap, title: 'Use Templates para Escalar', description: 'Crie 3-5 templates base e customize para cada paciente. Economize ate 70% do tempo.', gradient: 'from-yellow-500 to-amber-600' },
  { id: 2, category: 'Engajamento', icon: Heart, title: 'Responda SOS em ate 1h', description: 'Pacientes atendidos em SOS rapidamente tem 3x mais chances de continuar o acompanhamento.', gradient: 'from-rose-500 to-pink-600' },
  { id: 3, category: 'IA & Dados', icon: Brain, title: 'Anamnese Completa = IA Melhor', description: 'Uma anamnese com 100% dos campos permite que a IA calcule scores 40% mais precisos.', gradient: 'from-purple-500 to-violet-600' },
  { id: 4, category: 'Retencao', icon: Target, title: 'Monitore o Dashboard Diariamente', description: 'Profissionais que checam o dashboard diariamente retem 60% mais pacientes.', gradient: 'from-blue-500 to-indigo-600' },
  { id: 5, category: 'Nutricao', icon: Camera, title: 'Incentive Fotos de Pratos', description: 'Pacientes que enviam fotos tem 40% mais adesao ao plano. A IA gera insights automaticos.', gradient: 'from-emerald-500 to-teal-600' },
  { id: 6, category: 'Personalizacao', icon: Palette, title: 'Customize sua Marca', description: 'Configure logo, cores e nome para profissionalizar seu atendimento.', gradient: 'from-fuchsia-500 to-pink-600' },
  { id: 7, category: 'Eficiencia', icon: ListChecks, title: 'Configure o Menu do Paciente', description: 'Personalize quais funcionalidades cada paciente ve. Menos opcoes = mais adesao.', gradient: 'from-cyan-500 to-blue-600' },
  { id: 8, category: 'Acompanhamento', icon: TrendingUp, title: 'Use Avaliacao Fisica Regular', description: 'Registre medidas a cada 15 dias. Pacientes que veem evolucao mantem motivacao 2x maior.', gradient: 'from-orange-500 to-red-600' }
];

// ==================== FAQ ====================
const FAQ_ITEMS = [
  { q: 'Como a IA calcula o Score de Risco?', a: 'O Score de Risco e calculado automaticamente com base em multiplos fatores: frequencia de login, adesao ao plano, envio de feedbacks, respostas ao checklist, dados da anamnese e padroes de comportamento.' },
  { q: 'Meus pacientes podem ver o Score de Risco deles?', a: 'Nao. O Score de Risco e visivel apenas para o profissional no Dashboard e no perfil do paciente.' },
  { q: 'Como funciona o SOS Emergencia?', a: 'Quando um paciente aciona o SOS, voce recebe uma notificacao prioritaria no Dashboard com detalhes do motivo.' },
  { q: 'Posso personalizar o menu do paciente?', a: 'Sim! No perfil de cada paciente, acesse "Configurar Menu" para escolher quais funcionalidades ficam visiveis.' },
  { q: 'Como funciona a Analise de Pratos por IA?', a: 'O paciente tira foto da refeicao pelo app, a IA analisa automaticamente o prato identificando alimentos, estimando macronutrientes e comparando com o plano prescrito.' },
  { q: 'Os templates sao compartilhados entre profissionais?', a: 'Atualmente, templates sao privados de cada profissional. Em breve teremos uma biblioteca comunitaria.' },
  { q: 'Como faco para personalizar as cores e logo?', a: 'Acesse "Personalizacao" no menu lateral. La voce pode configurar logo, nome da marca, cor primaria e cor de destaque.' },
  { q: 'Existe limite de pacientes?', a: 'Nao ha limite de pacientes na plataforma.' }
];

// ==================== LEVEL CONFIG ====================
const LEVEL_ICONS = { iniciante: Compass, explorador: Compass, ativo: Flame, estrategico: Target, avancado: Rocket, elite: Crown };

// ==================== COMPONENTES ====================

const TabNavigation = ({ activeTab, onTabChange }) => (
  <div data-testid="hub-tab-navigation" className="flex gap-1 p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
    {TABS.map(tab => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return (
        <button key={tab.id} onClick={() => onTabChange(tab.id)} data-testid={`hub-tab-${tab.id}`}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
            ${isActive ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
          <Icon className="h-4 w-4" />
          {tab.label}
        </button>
      );
    })}
  </div>
);

const StepCard = ({ step, isExpanded, onToggle, onNavigate }) => {
  const Icon = step.icon;
  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${isExpanded ? 'border-indigo-200 shadow-xl shadow-indigo-100/50 bg-white' : 'border-gray-100 bg-white hover:shadow-lg hover:border-gray-200'}`}>
      <button onClick={onToggle} className="w-full p-5 flex items-center gap-4 text-left">
        <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
          <span className="text-xl font-bold">{step.step}</span>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Icon className="h-3 w-3 text-gray-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 text-lg">{step.title}</h3>
            <Badge className="bg-gray-100 text-gray-500 text-[10px] border-0 font-normal">~{step.duration}</Badge>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2">{step.description}</p>
        </div>
        <div className="flex-shrink-0">
          {isExpanded ? <ChevronUp className="h-5 w-5 text-indigo-500" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
      </button>
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          <div className="space-y-2">
            {step.detailedTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <span className="text-white text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-sm text-gray-700">{tip}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => onNavigate(step.route)} className={`bg-gradient-to-r ${step.gradient} text-white hover:opacity-90 shadow-lg`}>
            Ir agora <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const WhatsNewCard = ({ item }) => {
  const Icon = item.icon;
  const typeConfig = { feature: { label: 'Novo Recurso', color: 'bg-green-100 text-green-700' }, ia: { label: 'IA', color: 'bg-purple-100 text-purple-700' }, improvement: { label: 'Melhoria', color: 'bg-blue-100 text-blue-700' } };
  const config = typeConfig[item.type] || typeConfig.feature;
  return (
    <div className="relative overflow-hidden p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-lg transition-all group">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${config.color} text-[10px] border-0`}>{config.label}</Badge>
            <span className="text-[11px] text-gray-400">{item.date}</span>
          </div>
          <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
          <p className="text-sm text-gray-500">{item.description}</p>
        </div>
      </div>
    </div>
  );
};

const ProTipCard = ({ tip }) => {
  const Icon = tip.icon;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white hover:shadow-xl transition-all group">
      <div className={`h-2 bg-gradient-to-r ${tip.gradient}`} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tip.gradient} flex items-center justify-center text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          <Badge className="bg-gray-100 text-gray-600 text-[10px] border-0">{tip.category}</Badge>
        </div>
        <h4 className="font-bold text-gray-900 mb-2">{tip.title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{tip.description}</p>
      </div>
    </div>
  );
};

const FAQItem = ({ item, isOpen, onToggle }) => (
  <div className={`rounded-xl border transition-all ${isOpen ? 'border-indigo-200 shadow-md bg-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
      <span className="font-semibold text-gray-900 text-sm pr-4">{item.q}</span>
      {isOpen ? <ChevronUp className="h-4 w-4 text-indigo-500 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
    </button>
    {isOpen && (
      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
        <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
      </div>
    )}
  </div>
);

// ==================== PAGINA PRINCIPAL ====================

const PlatformGuide = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('jornada');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStep, setExpandedStep] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [openFAQ, setOpenFAQ] = useState(null);

  const journey = useProfessionalJourney(profile?.id);

  useEffect(() => { trackProfessionalFeature('view_platform_guide'); }, []);

  const handleNavigate = (route) => { if (route) navigate(route); };

  const featuresByCategory = useMemo(() => getFeaturesByCategory(), []);

  // ==================== TAB: MINHA JORNADA (PRINCIPAL) ====================
  const renderJornada = () => {
    const { loading, activatedFeaturesCount, activationPercentage, totalFeatures, currentLevel, nextLevel, suggestedFeatures, featuresUntilNextLevel, medals, monthlyGoal, activatedFeatures } = journey;

    if (loading) {
      return (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      );
    }

    const LevelIcon = currentLevel ? (LEVEL_ICONS[currentLevel.id] || Crown) : Compass;
    const topSuggestions = suggestedFeatures.slice(0, 5);

    return (
      <div className="space-y-6" data-testid="hub-jornada-tab">
        {/* Level Card Premium */}
        {currentLevel && (
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <div className={`bg-gradient-to-br ${currentLevel.badgeColor} p-6 md:p-8 text-white relative`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-xl">
                    <LevelIcon className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/80 text-sm font-medium">Seu nivel atual</span>
                      {nextLevel && (
                        <Badge className="bg-white/20 text-white border-0 text-[10px]">{featuresUntilNextLevel} para {nextLevel.emoji} {nextLevel.name}</Badge>
                      )}
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">{currentLevel.emoji} {currentLevel.name}</h2>
                    <p className="text-white/80 text-sm mt-1">{currentLevel.message}</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/90 font-medium">{activatedFeaturesCount} de {totalFeatures} funcionalidades ativadas</span>
                    <span className="text-white font-bold text-lg">{activationPercentage}%</span>
                  </div>
                  <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-md" style={{ width: `${Math.max(3, activationPercentage)}%` }} />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center bg-white/10 rounded-xl p-3">
                    <p className="text-2xl font-black text-white">{activatedFeaturesCount}</p>
                    <p className="text-xs text-white/70">Ativadas</p>
                  </div>
                  <div className="text-center bg-white/10 rounded-xl p-3">
                    <p className="text-2xl font-black text-white">{medals.length}</p>
                    <p className="text-xs text-white/70">Medalhas</p>
                  </div>
                  <div className="text-center bg-white/10 rounded-xl p-3">
                    <p className="text-2xl font-black text-white">{monthlyGoal?.activated_count || 0}/{monthlyGoal?.target_features_to_activate || 5}</p>
                    <p className="text-xs text-white/70">Meta Mensal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medals */}
        {medals.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Suas Medalhas
            </h3>
            <div className="flex flex-wrap gap-2">
              {medals.map(medal => (
                <div key={medal.category} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm ${medal.type === 'gold' ? 'bg-amber-50 border-amber-200' : medal.type === 'silver' ? 'bg-gray-50 border-gray-200' : 'bg-orange-50 border-orange-200'}`}>
                  <span className="text-xl">{medal.emoji}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-xs">{medal.label}</p>
                    <p className="text-[10px] text-gray-500">{medal.category} ({medal.usedCount}/{medal.totalCount})</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Progress Grid */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            Progresso por Categoria
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(featuresByCategory).map(([category, features]) => {
              const gradient = CATEGORY_GRADIENTS[category] || 'from-gray-400 to-gray-500';
              const emoji = CATEGORY_EMOJIS[category] || '';
              const totalInCat = features.length;
              const usedInCat = features.filter(f => activatedFeatures.has(f.key)).length;
              const pct = totalInCat > 0 ? Math.round((usedInCat / totalInCat) * 100) : 0;
              const medalData = medals.find(m => m.category === category);

              return (
                <button key={category} onClick={() => { setActiveTab('funcionalidades'); setExpandedCategories(p => ({ ...p, [category]: true })); }}
                  data-testid={`hub-category-${category.toLowerCase().replace(/\s/g, '-')}`}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:border-indigo-200 transition-all text-left group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                    <span className="text-lg">{emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{category}</h4>
                      {medalData && <span className="text-sm">{medalData.emoji}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600 whitespace-nowrap">{usedInCat}/{totalInCat}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Smart Suggestions */}
        {topSuggestions.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Proximas Conquistas
              <Badge className="bg-amber-100 text-amber-700 text-[9px] border-0">IA</Badge>
            </h3>
            <div className="space-y-2">
              {topSuggestions.map(feature => {
                const gradient = CATEGORY_GRADIENTS[feature.category] || 'from-gray-400 to-gray-500';
                const FeatureIcon = FEATURE_ICON_MAP[feature.key] || Zap;
                return (
                  <button key={feature.key} onClick={() => feature.route && handleNavigate(feature.route)}
                    data-testid={`hub-suggestion-${feature.key}`}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all text-left group">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                      <FeatureIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{feature.label}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${feature.impactLevel === 'strategic' ? 'bg-purple-100 text-purple-700' : feature.impactLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          {feature.impactLevel === 'strategic' ? 'Estrategico' : feature.impactLevel === 'high' ? 'Alto Impacto' : 'Medio'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{feature.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Goal */}
        {monthlyGoal && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5" />
                <div>
                  <h3 className="font-bold">Meta do Mes {monthlyGoal.month_reference}</h3>
                  <p className="text-indigo-200 text-xs">Ativar {monthlyGoal.target_features_to_activate} novas funcionalidades</p>
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, monthlyGoal.target_features_to_activate > 0 ? ((monthlyGoal.activated_count || 0) / monthlyGoal.target_features_to_activate) * 100 : 0)}%` }} />
                </div>
                <span className="font-bold text-gray-900 text-sm">{monthlyGoal.activated_count || 0}/{monthlyGoal.target_features_to_activate}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ==================== TAB: FUNCIONALIDADES ====================
  const renderFuncionalidades = () => {
    const { activatedFeatures } = journey;

    const filteredCategories = useMemo(() => {
      const cats = Object.entries(featuresByCategory);
      if (!searchQuery.trim()) return cats;
      const q = searchQuery.toLowerCase();
      return cats.map(([cat, features]) => [cat, features.filter(f => f.label.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))]).filter(([, features]) => features.length > 0);
    }, [searchQuery, featuresByCategory]);

    return (
      <div className="space-y-6" data-testid="hub-funcionalidades-tab">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input placeholder="Buscar funcionalidades... (ex: analise, template, score)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="hub-search-input"
            className="pl-12 py-6 text-base rounded-2xl border-gray-200 focus:border-indigo-300 focus:ring-indigo-200 bg-white shadow-sm" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Search className="h-4 w-4" />
            {filteredCategories.reduce((acc, [, f]) => acc + f.length, 0)} resultados para "{searchQuery}"
          </div>
        )}

        {/* Categories with features */}
        <div className="space-y-4">
          {filteredCategories.map(([category, features]) => {
            const gradient = CATEGORY_GRADIENTS[category] || 'from-gray-400 to-gray-500';
            const emoji = CATEGORY_EMOJIS[category] || '';
            const usedInCat = features.filter(f => activatedFeatures.has(f.key)).length;
            const isExpanded = !!expandedCategories[category] || !!searchQuery;

            return (
              <div key={category} className="space-y-3">
                <button onClick={() => setExpandedCategories(p => ({ ...p, [category]: !p[category] }))}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
                      <span className="text-lg">{emoji}</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900">{category}</h3>
                      <p className="text-xs text-gray-500">{usedInCat}/{features.length} ativadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all`} style={{ width: `${features.length > 0 ? (usedInCat / features.length) * 100 : 0}%` }} />
                    </div>
                    <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                    {features.map(feature => {
                      const isActivated = activatedFeatures.has(feature.key);
                      const FeatureIcon = FEATURE_ICON_MAP[feature.key] || Zap;
                      return (
                        <div key={feature.key} onClick={() => feature.route && handleNavigate(feature.route)}
                          data-testid={`hub-feature-${feature.key}`}
                          className={`relative overflow-hidden p-4 rounded-xl border bg-white transition-all duration-300 group cursor-pointer
                            ${isActivated ? 'border-green-200 hover:shadow-lg hover:border-green-300' : 'border-gray-100 hover:shadow-lg hover:border-indigo-200'} hover:scale-[1.01]`}>
                          {/* Activated indicator */}
                          <div className="absolute top-3 right-3">
                            {isActivated ? (
                              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                <CircleCheck className="h-3 w-3" />
                                <span className="text-[9px] font-bold">Ativada</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                <Circle className="h-3 w-3" />
                                <span className="text-[9px] font-medium">Pendente</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-start gap-3 pr-20">
                            <div className={`p-2.5 rounded-xl transition-all ${isActivated ? `bg-gradient-to-br ${gradient} text-white shadow-md` : 'bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-600 text-gray-600 group-hover:text-white'}`}>
                              <FeatureIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-sm mb-1">{feature.label}</h4>
                              <p className="text-xs text-gray-500 line-clamp-2">{feature.description}</p>
                              <span className={`inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full
                                ${feature.impactLevel === 'strategic' ? 'bg-purple-100 text-purple-700' : feature.impactLevel === 'high' ? 'bg-red-100 text-red-700' : feature.impactLevel === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                {feature.impactLevel === 'strategic' ? 'Estrategico' : feature.impactLevel === 'high' ? 'Alto Impacto' : feature.impactLevel === 'medium' ? 'Medio' : 'Basico'}
                              </span>
                            </div>
                          </div>
                          
                          {!isActivated && feature.route && (
                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ChevronRight className="h-5 w-5 text-indigo-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhuma funcionalidade encontrada</p>
          </div>
        )}
      </div>
    );
  };

  // ==================== TAB: TUTORIAL ====================
  const renderTutorial = () => (
    <div className="space-y-6" data-testid="hub-tutorial-tab">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tutorial Completo</h2>
            <p className="text-gray-600">Siga os {GETTING_STARTED_STEPS.length} passos abaixo para dominar a FitJourney</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Progresso do Tutorial</span>
            <span className="text-indigo-600 font-bold">{GETTING_STARTED_STEPS.length} passos</span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: '100%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">Tempo total estimado: ~23 minutos</p>
        </div>
      </div>
      <div className="space-y-3">
        {GETTING_STARTED_STEPS.map((step) => (
          <StepCard key={step.step} step={step} isExpanded={expandedStep === step.step} onToggle={() => setExpandedStep(expandedStep === step.step ? null : step.step)} onNavigate={handleNavigate} />
        ))}
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-indigo-600" />
          Perguntas Frequentes
        </h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} item={item} isOpen={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? null : i)} />
          ))}
        </div>
      </div>
    </div>
  );

  // ==================== TAB: NOVIDADES ====================
  const renderNovidades = () => (
    <div className="space-y-6" data-testid="hub-novidades-tab">
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <PartyPopper className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">O que ha de Novo</h2>
            <p className="text-gray-600 text-sm">Ultimas atualizacoes e recursos da plataforma</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {WHATS_NEW.map(item => <WhatsNewCard key={item.id} item={item} />)}
      </div>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Rocket className="h-5 w-5" /></div>
            <div><h3 className="font-bold text-lg">Em Breve</h3><p className="text-gray-400 text-sm">Proximas funcionalidades</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: FileText, label: 'Relatorios Avancados', desc: 'PDFs automaticos de evolucao' },
              { icon: MessageSquare, label: 'Chat Integrado', desc: 'Comunicacao direta com pacientes' },
              { icon: Star, label: 'Gamificacao Completa', desc: 'Conquistas e recompensas' },
              { icon: Activity, label: 'Integracoes Wearables', desc: 'Sincronizacao com smartwatches' }
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><Icon className="h-4 w-4 text-white/70" /></div>
                  <div><p className="font-semibold text-sm text-white/90">{item.label}</p><p className="text-xs text-white/50">{item.desc}</p></div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ==================== TAB: DICAS PRO ====================
  const renderDicasPro = () => (
    <div className="space-y-6" data-testid="hub-dicas-tab">
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
            <Lightbulb className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dicas Pro</h2>
            <p className="text-gray-600 text-sm">Estrategias avancadas para maximizar resultados com seus pacientes</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRO_TIPS.map(tip => <ProTipCard key={tip.id} tip={tip} />)}
      </div>
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white">
          <div className="flex items-center gap-3">
            <Award className="h-7 w-7" />
            <div><h3 className="font-bold text-lg">Boas Praticas de Uso</h3><p className="text-emerald-100 text-sm">Checklist do profissional de alto desempenho</p></div>
          </div>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { text: 'Verificar Dashboard no inicio do dia', icon: BarChart3 },
              { text: 'Responder SOS em ate 1 hora', icon: Shield },
              { text: 'Revisar pacientes em risco semanalmente', icon: AlertTriangle },
              { text: 'Atualizar planos alimentares mensalmente', icon: Utensils },
              { text: 'Incentivar feedbacks com fotos', icon: Camera },
              { text: 'Manter anamneses completas e atualizadas', icon: ClipboardList },
              { text: 'Usar templates para escalar atendimentos', icon: Copy },
              { text: 'Personalizar experiencia do paciente', icon: Palette }
            ].map((practice, i) => {
              const Icon = practice.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0"><Icon className="h-4 w-4 text-emerald-600" /></div>
                  <span className="text-sm text-gray-700 font-medium">{practice.text}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'jornada': return renderJornada();
      case 'funcionalidades': return renderFuncionalidades();
      case 'tutorial': return renderTutorial();
      case 'novidades': return renderNovidades();
      case 'dicas': return renderDicasPro();
      default: return renderJornada();
    }
  };

  // Stats
  const totalFeatures = INVENTORY_FEATURES.length;
  const aiFeatures = INVENTORY_FEATURES.filter(f => f.category === FEATURE_CATEGORIES.IA).length;
  const categories = Object.keys(FEATURE_CATEGORIES).length;

  return (
    <Layout title="Central de Recursos" userType="professional">
      <div className="max-w-5xl mx-auto space-y-6 pb-8" data-testid="platform-guide-page">

        {/* ==================== HEADER PREMIUM ==================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full -translate-y-36 translate-x-36" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/10 rounded-full translate-y-28 -translate-x-28" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/10">
                    <Gem className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-black tracking-tight">HUB Interativo</h1>
                      <Badge className="bg-white/15 text-white border-0 text-[10px] font-bold backdrop-blur-sm">PREMIUM</Badge>
                    </div>
                    <p className="text-indigo-300 text-sm">Sua jornada profissional na FitJourney</p>
                  </div>
                </div>
                <p className="text-indigo-200/80 max-w-xl text-sm leading-relaxed mb-6">
                  Descubra tudo que a plataforma oferece, acompanhe seu progresso, desbloqueie medalhas e torne-se um Profissional Elite.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-6 max-w-2xl">
              {[
                { icon: Sparkles, value: totalFeatures, label: 'Funcionalidades' },
                { icon: Brain, value: aiFeatures, label: 'Com IA' },
                { icon: Layers, value: categories, label: 'Categorias' },
                { icon: Trophy, value: journey.activatedFeaturesCount || 0, label: 'Ativadas' }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/5">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-3xl font-black text-white">{stat.value}</p>
                    <p className="text-sm text-white/60 font-medium">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==================== TAB NAVIGATION ==================== */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ==================== TAB CONTENT ==================== */}
        {renderTabContent()}

        {/* ==================== FOOTER CTA ==================== */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-900 to-gray-800 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Precisa de Ajuda?</h3>
                  <p className="text-gray-400 text-sm">Nossa equipe esta pronta para te ajudar</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setActiveTab('tutorial')} variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                  <GraduationCap className="mr-2 h-4 w-4" /> Tutorial
                </Button>
                <Button className="bg-white text-gray-900 hover:bg-gray-100">
                  <MessageSquare className="mr-2 h-4 w-4" /> Suporte
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PlatformGuide;
