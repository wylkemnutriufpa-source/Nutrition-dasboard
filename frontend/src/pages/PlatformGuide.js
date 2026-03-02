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
  CircleDot, Info, Coffee, Dumbbell, Salad, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { trackProfessionalFeature } from '@/utils/featureTracking';

// ==================== DADOS DAS TABS ====================

const TABS = [
  { id: 'inicio', label: 'Início', icon: Rocket },
  { id: 'tutorial', label: 'Tutorial', icon: GraduationCap },
  { id: 'funcionalidades', label: 'Funcionalidades', icon: Layers },
  { id: 'novidades', label: 'Novidades', icon: PartyPopper },
  { id: 'dicas', label: 'Dicas Pro', icon: Lightbulb }
];

// ==================== GETTING STARTED STEPS ====================

const GETTING_STARTED_STEPS = [
  {
    step: 1,
    title: 'Configure seu Perfil',
    description: 'Personalize sua marca, logo, cores e informações profissionais para que seus pacientes tenham uma experiência única.',
    detailedTips: [
      'Vá em Personalização para adicionar seu logo',
      'Configure cores que representam sua marca',
      'Preencha suas informações profissionais em Configurações'
    ],
    icon: Palette,
    route: '/professional/branding',
    gradient: 'from-pink-500 to-rose-600',
    duration: '2 min'
  },
  {
    step: 2,
    title: 'Cadastre seu Primeiro Paciente',
    description: 'Adicione pacientes manualmente ou envie um link de convite. Eles terão acesso ao app do paciente automaticamente.',
    detailedTips: [
      'Clique em "Novo Paciente" na lista de pacientes',
      'Preencha email e dados básicos',
      'O paciente receberá acesso automático'
    ],
    icon: UserPlus,
    route: '/professional/patients',
    gradient: 'from-blue-500 to-indigo-600',
    duration: '1 min'
  },
  {
    step: 3,
    title: 'Preencha a Anamnese',
    description: 'A anamnese completa alimenta a IA do sistema. Quanto mais dados, melhor o Score de Risco e as recomendações automáticas.',
    detailedTips: [
      'Acesse o perfil do paciente',
      'Clique na aba "Anamnese"',
      'Preencha todos os campos - cada dado melhora a IA'
    ],
    icon: ClipboardList,
    route: '/professional/patients',
    gradient: 'from-emerald-500 to-teal-600',
    duration: '5 min'
  },
  {
    step: 4,
    title: 'Crie um Plano Alimentar',
    description: 'Monte planos personalizados com refeições, horários e macros. Use templates para agilizar planos similares.',
    detailedTips: [
      'Acesse o perfil do paciente → Plano Alimentar',
      'Adicione refeições com alimentos e quantidades',
      'Salve como template para reutilizar'
    ],
    icon: Utensils,
    route: '/professional/patients',
    gradient: 'from-amber-500 to-orange-600',
    duration: '10 min'
  },
  {
    step: 5,
    title: 'Monitore o Dashboard',
    description: 'Acompanhe seus pacientes pela Central de Comando. Veja alertas SOS, scores de risco, engajamento e recomendações da IA.',
    detailedTips: [
      'O Dashboard atualiza em tempo real',
      'Priorize pacientes com SOS ativo',
      'Use as recomendações da IA para agir proativamente'
    ],
    icon: BarChart3,
    route: '/professional/dashboard',
    gradient: 'from-purple-500 to-violet-600',
    duration: '3 min'
  },
  {
    step: 6,
    title: 'Explore a IA Premium',
    description: 'Ative análise de pratos por foto, análise corporal e recomendações inteligentes para elevar o acompanhamento nutricional.',
    detailedTips: [
      'Pacientes podem enviar fotos de refeições',
      'A IA analisa qualidade, macros e adesão',
      'Alertas automáticos aparecem no seu dashboard'
    ],
    icon: Brain,
    route: '/professional/dashboard',
    gradient: 'from-fuchsia-500 to-pink-600',
    duration: '2 min'
  }
];

// ==================== DADOS DAS FUNCIONALIDADES ====================

const PLATFORM_FEATURES = [
  {
    id: 'patients',
    category: 'Gestão de Pacientes',
    emoji: '👥',
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    features: [
      {
        id: 'patient_list',
        title: 'Lista de Pacientes',
        description: 'Visualize todos seus pacientes, filtre por status e acesse perfis detalhados',
        icon: Users,
        route: '/professional/patients',
        status: 'active'
      },
      {
        id: 'add_patient',
        title: 'Adicionar Paciente',
        description: 'Cadastre novos pacientes com link de convite ou cadastro manual',
        icon: UserPlus,
        route: '/professional/patients',
        status: 'active'
      },
      {
        id: 'patient_profile',
        title: 'Perfil Completo',
        description: 'Anamnese, histórico, planos, feedbacks e evolução em um só lugar',
        icon: FileText,
        route: '/professional/patients',
        status: 'active'
      },
      {
        id: 'risk_score',
        title: 'Score de Risco',
        description: 'IA calcula automaticamente o risco de abandono de cada paciente',
        icon: AlertTriangle,
        route: '/professional/dashboard',
        status: 'active',
        badge: 'IA'
      }
    ]
  },
  {
    id: 'nutrition',
    category: 'Planos Alimentares',
    emoji: '🥗',
    color: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    features: [
      {
        id: 'meal_plan',
        title: 'Criar Plano Alimentar',
        description: 'Monte planos personalizados com refeições, horários e macros',
        icon: Utensils,
        route: '/professional/patients',
        status: 'active'
      },
      {
        id: 'templates',
        title: 'Templates Globais',
        description: 'Crie templates reutilizáveis e aplique em múltiplos pacientes',
        icon: Copy,
        route: '/professional/templates',
        status: 'active',
        badge: 'Novo'
      },
      {
        id: 'recipes',
        title: 'Biblioteca de Receitas',
        description: 'Adicione receitas com ingredientes, modo de preparo e valores nutricionais',
        icon: ChefHat,
        route: '/professional/receitas',
        status: 'active'
      },
      {
        id: 'shopping_list',
        title: 'Lista de Compras',
        description: 'Gere automaticamente lista de compras baseada no plano',
        icon: ShoppingCart,
        route: '/professional/patients',
        status: 'active'
      },
      {
        id: 'supplements',
        title: 'Suplementação',
        description: 'Prescreva suplementos com dosagem, horários e instruções',
        icon: Pill,
        route: '/professional/patients',
        status: 'active'
      }
    ]
  },
  {
    id: 'ai_analysis',
    category: 'Análises por IA',
    emoji: '🤖',
    color: 'from-purple-500 to-pink-600',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    features: [
      {
        id: 'meal_photo',
        title: 'Análise de Pratos',
        description: 'Paciente envia foto da refeição e IA analisa qualidade, macros e adesão',
        icon: Camera,
        route: '/patient/meal-photo',
        status: 'active',
        badge: 'IA Premium'
      },
      {
        id: 'body_analysis',
        title: 'Análise Corporal',
        description: 'Análise de composição corporal por fotos: % gordura, definição, evolução',
        icon: User,
        route: '/patient/body-analysis',
        status: 'active',
        badge: 'IA Premium'
      },
      {
        id: 'smart_recommendations',
        title: 'Recomendações Inteligentes',
        description: 'IA sugere ações baseadas no comportamento e dados dos pacientes',
        icon: Brain,
        route: '/professional/dashboard',
        status: 'active',
        badge: 'IA'
      },
      {
        id: 'risk_alerts',
        title: 'Alertas Automáticos',
        description: 'Sistema detecta padrões de risco e gera alertas prioritários',
        icon: Bell,
        route: '/professional/dashboard',
        status: 'active',
        badge: 'IA'
      }
    ]
  },
  {
    id: 'communication',
    category: 'Comunicação',
    emoji: '💬',
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    features: [
      {
        id: 'feedbacks',
        title: 'Sistema de Feedbacks',
        description: 'Receba feedbacks periódicos dos pacientes com fotos e relatos',
        icon: MessageSquare,
        route: '/professional/feedbacks',
        status: 'active'
      },
      {
        id: 'sos_emergency',
        title: 'SOS Emergência',
        description: 'Pacientes podem acionar emergência nutricional com prioridade máxima',
        icon: Shield,
        route: '/professional/dashboard',
        status: 'active',
        badge: 'Crítico'
      },
      {
        id: 'notifications',
        title: 'Notificações',
        description: 'Alertas em tempo real sobre atividades dos pacientes',
        icon: Bell,
        route: '/professional/dashboard',
        status: 'active'
      }
    ]
  },
  {
    id: 'monitoring',
    category: 'Monitoramento',
    emoji: '📊',
    color: 'from-teal-500 to-cyan-600',
    bgLight: 'bg-teal-50',
    borderColor: 'border-teal-200',
    features: [
      {
        id: 'dashboard',
        title: 'Central de Comando',
        description: 'Dashboard executivo com métricas, alertas e visão geral dos pacientes',
        icon: BarChart3,
        route: '/professional/dashboard',
        status: 'active'
      },
      {
        id: 'checklist',
        title: 'Checklist Diário',
        description: 'Acompanhe a adesão diária dos pacientes às tarefas do plano',
        icon: CheckCircle2,
        route: '/professional/patients',
        status: 'active'
      },
      {
        id: 'physical_eval',
        title: 'Avaliação Física',
        description: 'Registro de medidas, bioimpedância e evolução antropométrica',
        icon: Activity,
        route: '/professional/patients',
        status: 'active'
      },
      {
        id: 'engagement',
        title: 'Engajamento',
        description: 'Gráficos de adesão e participação ao longo do tempo',
        icon: TrendingUp,
        route: '/professional/dashboard',
        status: 'active'
      }
    ]
  },
  {
    id: 'tools',
    category: 'Ferramentas',
    emoji: '🛠️',
    color: 'from-slate-500 to-gray-600',
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-200',
    features: [
      {
        id: 'calculators',
        title: 'Calculadoras',
        description: 'TMB, GET, IMC, água e outras calculadoras nutricionais',
        icon: Calculator,
        route: '/professional/patients',
        status: 'active'
      },
      {
        id: 'anamnesis',
        title: 'Anamnese Completa',
        description: 'Questionário detalhado com histórico de saúde e hábitos',
        icon: ClipboardList,
        route: '/professional/patients',
        status: 'active'
      },
      {
        id: 'food_database',
        title: 'Banco de Alimentos',
        description: 'Database completo com informações nutricionais de alimentos',
        icon: Salad,
        route: '/professional/food-database',
        status: 'active'
      },
      {
        id: 'schedule',
        title: 'Agenda',
        description: 'Gerencie consultas e compromissos com seus pacientes',
        icon: Calendar,
        route: '/professional/agenda',
        status: 'active'
      },
      {
        id: 'financeiro',
        title: 'Financeiro',
        description: 'Controle de pagamentos e receitas dos pacientes',
        icon: Target,
        route: '/professional/financeiro',
        status: 'active'
      },
      {
        id: 'branding',
        title: 'Personalização',
        description: 'Customize cores, logo e identidade visual da plataforma',
        icon: Palette,
        route: '/professional/branding',
        status: 'active'
      }
    ]
  }
];

// ==================== NOVIDADES ====================

const WHATS_NEW = [
  {
    id: 1,
    date: 'Julho 2025',
    title: 'Central de Recursos Premium',
    description: 'Hub interativo com tutorial completo, dicas pro e guia de todas as funcionalidades da plataforma.',
    icon: BookOpen,
    type: 'feature',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 2,
    date: 'Julho 2025',
    title: 'Análise de Pratos por IA',
    description: 'Pacientes enviam foto da refeição e a IA analisa qualidade, macronutrientes e adesão ao plano.',
    icon: Camera,
    type: 'ia',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 3,
    date: 'Julho 2025',
    title: 'Dashboard Inteligente',
    description: 'Central de Comando com alertas SOS, ranking de risco, recomendações da IA e métricas executivas.',
    icon: BarChart3,
    type: 'improvement',
    gradient: 'from-emerald-500 to-teal-500'
  },
  {
    id: 4,
    date: 'Junho 2025',
    title: 'Templates Globais',
    description: 'Crie templates de planos alimentares e aplique em múltiplos pacientes com um clique.',
    icon: Copy,
    type: 'feature',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    id: 5,
    date: 'Junho 2025',
    title: 'SOS Emergência',
    description: 'Sistema de emergência nutricional com prioridade máxima e alertas instantâneos.',
    icon: Shield,
    type: 'feature',
    gradient: 'from-red-500 to-rose-500'
  },
  {
    id: 6,
    date: 'Maio 2025',
    title: 'Risk Score Engine',
    description: 'Motor de inteligência que calcula automaticamente o risco de abandono dos pacientes.',
    icon: Brain,
    type: 'ia',
    gradient: 'from-violet-500 to-purple-500'
  }
];

// ==================== DICAS PRO ====================

const PRO_TIPS = [
  {
    id: 1,
    category: 'Produtividade',
    icon: Zap,
    title: 'Use Templates para Escalar',
    description: 'Crie 3-5 templates base (emagrecimento, hipertrofia, manutenção) e customize para cada paciente. Economize até 70% do tempo.',
    gradient: 'from-yellow-500 to-amber-600'
  },
  {
    id: 2,
    category: 'Engajamento',
    icon: Heart,
    title: 'Responda SOS em até 1h',
    description: 'Dados mostram que pacientes atendidos em SOS rapidamente têm 3x mais chances de continuar o acompanhamento.',
    gradient: 'from-rose-500 to-pink-600'
  },
  {
    id: 3,
    category: 'IA & Dados',
    icon: Brain,
    title: 'Anamnese Completa = IA Melhor',
    description: 'Uma anamnese com 100% dos campos preenchidos permite que a IA calcule scores de risco 40% mais precisos.',
    gradient: 'from-purple-500 to-violet-600'
  },
  {
    id: 4,
    category: 'Retenção',
    icon: Target,
    title: 'Monitore o Dashboard Diariamente',
    description: 'Profissionais que checam o dashboard diariamente identificam problemas 5 dias antes e retêm 60% mais pacientes.',
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    id: 5,
    category: 'Nutrição',
    icon: Camera,
    title: 'Incentive Fotos de Pratos',
    description: 'Pacientes que enviam fotos de refeições têm 40% mais adesão ao plano. A IA analisa e gera insights automáticos.',
    gradient: 'from-emerald-500 to-teal-600'
  },
  {
    id: 6,
    category: 'Personalização',
    icon: Palette,
    title: 'Customize sua Marca',
    description: 'Pacientes confiam mais em plataformas personalizadas. Configure logo, cores e nome para profissionalizar seu atendimento.',
    gradient: 'from-fuchsia-500 to-pink-600'
  },
  {
    id: 7,
    category: 'Eficiência',
    icon: ListChecks,
    title: 'Configure o Menu do Paciente',
    description: 'Personalize quais funcionalidades cada paciente vê no menu. Menos opções = menos confusão = mais adesão.',
    gradient: 'from-cyan-500 to-blue-600'
  },
  {
    id: 8,
    category: 'Acompanhamento',
    icon: TrendingUp,
    title: 'Use Avaliação Física Regular',
    description: 'Registre medidas a cada 15 dias. Pacientes que veem evolução no gráfico mantêm motivação 2x maior.',
    gradient: 'from-orange-500 to-red-600'
  }
];

// ==================== FAQ ====================

const FAQ_ITEMS = [
  {
    q: 'Como a IA calcula o Score de Risco?',
    a: 'O Score de Risco é calculado automaticamente com base em múltiplos fatores: frequência de login, adesão ao plano alimentar, envio de feedbacks, respostas ao checklist, dados da anamnese e padrões de comportamento. Quanto mais dados, mais preciso o score.'
  },
  {
    q: 'Meus pacientes podem ver o Score de Risco deles?',
    a: 'Não. O Score de Risco é visível apenas para o profissional no Dashboard e no perfil do paciente. Os pacientes veem apenas seu progresso e conquistas positivas.'
  },
  {
    q: 'Como funciona o SOS Emergência?',
    a: 'Quando um paciente aciona o SOS, você recebe uma notificação prioritária no Dashboard com detalhes do motivo. O alerta fica marcado como P0 (prioridade máxima) até ser resolvido.'
  },
  {
    q: 'Posso personalizar o menu do paciente?',
    a: 'Sim! No perfil de cada paciente, acesse "Configurar Menu" para escolher quais funcionalidades ficam visíveis. Você pode ativar/desativar e reordenar os itens.'
  },
  {
    q: 'Como funciona a Análise de Pratos por IA?',
    a: 'O paciente tira foto da refeição pelo app, a IA (GPT-4o Vision) analisa automaticamente o prato identificando alimentos, estimando macronutrientes, avaliando qualidade e comparando com o plano prescrito.'
  },
  {
    q: 'Os templates são compartilhados entre profissionais?',
    a: 'Atualmente, templates são privados de cada profissional. Em breve teremos uma biblioteca comunitária de templates.'
  },
  {
    q: 'Como faço para personalizar as cores e logo?',
    a: 'Acesse "Personalização" no menu lateral. Lá você pode configurar logo, nome da marca, cor primária e cor de destaque. As mudanças refletem em toda a experiência do paciente.'
  },
  {
    q: 'Existe limite de pacientes?',
    a: 'Não há limite de pacientes na plataforma. Você pode cadastrar quantos pacientes precisar.'
  }
];

// ==================== COMPONENTES ====================

// --- Tab Navigation ---
const TabNavigation = ({ activeTab, onTabChange }) => (
  <div className="flex gap-1 p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
    {TABS.map(tab => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
            ${isActive 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-200' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }
          `}
        >
          <Icon className="h-4 w-4" />
          {tab.label}
        </button>
      );
    })}
  </div>
);

// --- Step Card (Tutorial) ---
const StepCard = ({ step, isExpanded, onToggle, onNavigate }) => {
  const Icon = step.icon;
  return (
    <div className={`
      relative overflow-hidden rounded-2xl border transition-all duration-300
      ${isExpanded ? 'border-purple-200 shadow-xl shadow-purple-100/50 bg-white' : 'border-gray-100 bg-white hover:shadow-lg hover:border-gray-200'}
    `}>
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 text-left"
      >
        {/* Step Number */}
        <div className={`
          relative w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient}
          flex items-center justify-center text-white shadow-lg flex-shrink-0
        `}>
          <span className="text-xl font-bold">{step.step}</span>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Icon className="h-3 w-3 text-gray-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 text-lg">{step.title}</h3>
            <Badge className="bg-gray-100 text-gray-500 text-[10px] border-0 font-normal">
              ~{step.duration}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2">{step.description}</p>
        </div>

        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-purple-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
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
          
          <Button
            onClick={() => onNavigate(step.route)}
            className={`bg-gradient-to-r ${step.gradient} text-white hover:opacity-90 shadow-lg`}
          >
            Ir para {step.title.split(' ').slice(-1)[0]}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// --- Feature Card ---
const FeatureCard = ({ feature, onNavigate }) => {
  const Icon = feature.icon;
  const isComingSoon = feature.status === 'coming_soon';
  
  return (
    <div
      onClick={() => !isComingSoon && onNavigate(feature.route)}
      className={`
        relative overflow-hidden p-4 rounded-xl border bg-white
        transition-all duration-300 group
        ${isComingSoon ? 'opacity-60 cursor-not-allowed border-gray-100' : 'hover:shadow-lg hover:border-purple-200 hover:scale-[1.01] cursor-pointer border-gray-100'}
      `}
    >
      {isComingSoon && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-gray-200 text-gray-500 text-[9px] border-0">
            <Lock className="h-2.5 w-2.5 mr-1" />
            Em breve
          </Badge>
        </div>
      )}
      
      {feature.badge && !isComingSoon && (
        <div className="absolute top-2 right-2">
          <Badge className={`
            text-[9px] border-0 font-semibold
            ${feature.badge === 'IA Premium' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
              feature.badge === 'IA' ? 'bg-purple-100 text-purple-700' :
              feature.badge === 'Novo' ? 'bg-green-100 text-green-700' :
              feature.badge === 'Crítico' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }
          `}>
            {feature.badge === 'IA Premium' && <Sparkles className="h-2.5 w-2.5 mr-1" />}
            {feature.badge}
          </Badge>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-pink-600 transition-all">
          <Icon className="h-5 w-5 text-gray-600 group-hover:text-white transition-colors" />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h4 className="font-semibold text-gray-900 text-sm mb-1">{feature.title}</h4>
          <p className="text-xs text-gray-500 line-clamp-2">{feature.description}</p>
        </div>
      </div>
      
      {!isComingSoon && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="h-5 w-5 text-purple-500" />
        </div>
      )}
    </div>
  );
};

// --- Category Section (for Funcionalidades tab) ---
const CategorySection = ({ category, onNavigate, isExpanded, onToggle }) => (
  <div className="space-y-3">
    <button
      onClick={onToggle}
      className={`
        w-full flex items-center justify-between p-4 rounded-2xl
        ${category.bgLight} border ${category.borderColor}
        hover:shadow-md transition-all
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-md`}>
          <span className="text-lg">{category.emoji}</span>
        </div>
        <div className="text-left">
          <h3 className="font-bold text-gray-900">{category.category}</h3>
          <p className="text-xs text-gray-500">{category.features.length} funcionalidades</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className="bg-white/80 text-gray-600 text-[10px] border-0">
          {category.features.filter(f => f.status === 'active').length} ativas
        </Badge>
        <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
      </div>
    </button>
    
    {isExpanded && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 animate-in fade-in slide-in-from-top-2 duration-300">
        {category.features.map(feature => (
          <FeatureCard key={feature.id} feature={feature} onNavigate={onNavigate} />
        ))}
      </div>
    )}
  </div>
);

// --- What's New Card ---
const WhatsNewCard = ({ item }) => {
  const Icon = item.icon;
  const typeConfig = {
    feature: { label: 'Novo Recurso', color: 'bg-green-100 text-green-700' },
    ia: { label: 'IA', color: 'bg-purple-100 text-purple-700' },
    improvement: { label: 'Melhoria', color: 'bg-blue-100 text-blue-700' }
  };
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

// --- Pro Tip Card ---
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
          <div>
            <Badge className="bg-gray-100 text-gray-600 text-[10px] border-0">{tip.category}</Badge>
          </div>
        </div>
        <h4 className="font-bold text-gray-900 mb-2">{tip.title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{tip.description}</p>
      </div>
    </div>
  );
};

// --- FAQ Accordion ---
const FAQItem = ({ item, isOpen, onToggle }) => (
  <div className={`rounded-xl border transition-all ${isOpen ? 'border-purple-200 shadow-md bg-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 text-left"
    >
      <span className="font-semibold text-gray-900 text-sm pr-4">{item.q}</span>
      {isOpen ? (
        <ChevronUp className="h-4 w-4 text-purple-500 flex-shrink-0" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
      )}
    </button>
    {isOpen && (
      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
        <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
      </div>
    )}
  </div>
);

// --- Quick Action Button ---
const QuickAction = ({ icon: Icon, label, route, gradient, onNavigate }) => (
  <button
    onClick={() => onNavigate(route)}
    className={`
      relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br ${gradient} 
      text-white text-center hover:shadow-xl hover:scale-[1.03] transition-all group
    `}
  >
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
    <Icon className="h-8 w-8 mx-auto mb-2 relative z-10" />
    <span className="font-bold text-sm relative z-10">{label}</span>
    <div className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
      <ArrowRight className="h-4 w-4 text-white/70" />
    </div>
  </button>
);

// --- Stats Card ---
const StatsCard = ({ icon: Icon, value, label, sublabel }) => (
  <div className="text-center">
    <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
      <Icon className="h-6 w-6 text-white" />
    </div>
    <p className="text-3xl font-black text-white">{value}</p>
    <p className="text-sm text-white/80 font-medium">{label}</p>
    {sublabel && <p className="text-xs text-white/60">{sublabel}</p>}
  </div>
);

// ==================== PÁGINA PRINCIPAL ====================

const PlatformGuide = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStep, setExpandedStep] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [openFAQ, setOpenFAQ] = useState(null);

  // Track page view
  useEffect(() => { trackProfessionalFeature('view_platform_guide'); }, []);

  const handleNavigate = (route) => {
    if (route) navigate(route);
  };

  // Stats
  const totalFeatures = PLATFORM_FEATURES.reduce((acc, cat) => acc + cat.features.length, 0);
  const activeFeatures = PLATFORM_FEATURES.reduce((acc, cat) => 
    acc + cat.features.filter(f => f.status === 'active').length, 0
  );
  const aiFeatures = PLATFORM_FEATURES.reduce((acc, cat) => 
    acc + cat.features.filter(f => f.badge?.includes('IA')).length, 0
  );
  const categories = PLATFORM_FEATURES.length;

  // Search filter
  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return PLATFORM_FEATURES;
    const q = searchQuery.toLowerCase();
    return PLATFORM_FEATURES.map(cat => ({
      ...cat,
      features: cat.features.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.badge && f.badge.toLowerCase().includes(q))
      )
    })).filter(cat => cat.features.length > 0);
  }, [searchQuery]);

  // Toggle category expansion
  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // ==================== RENDER TABS ====================

  // --- TAB: INÍCIO ---
  const renderInicio = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction icon={BarChart3} label="Dashboard" route="/professional/dashboard" gradient="from-teal-500 to-emerald-600" onNavigate={handleNavigate} />
          <QuickAction icon={Users} label="Pacientes" route="/professional/patients" gradient="from-blue-500 to-indigo-600" onNavigate={handleNavigate} />
          <QuickAction icon={Copy} label="Templates" route="/professional/templates" gradient="from-purple-500 to-pink-600" onNavigate={handleNavigate} />
          <QuickAction icon={MessageSquare} label="Feedbacks" route="/professional/feedbacks" gradient="from-amber-500 to-orange-600" onNavigate={handleNavigate} />
        </div>
      </div>

      {/* Getting Started Mini */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Primeiros Passos</h3>
                <p className="text-purple-200 text-sm">6 passos para dominar a plataforma</p>
              </div>
            </div>
            <Button 
              onClick={() => setActiveTab('tutorial')}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              Ver Tutorial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GETTING_STARTED_STEPS.slice(0, 3).map(step => {
              const Icon = step.icon;
              return (
                <button
                  key={step.step}
                  onClick={() => handleNavigate(step.route)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all text-left"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white flex-shrink-0 shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{step.title}</p>
                    <p className="text-xs text-gray-500">~{step.duration}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* What's New Preview */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-base">
                <PartyPopper className="h-5 w-5 text-pink-500" />
                Novidades
              </span>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('novidades')} className="text-purple-600 text-xs">
                Ver todas <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {WHATS_NEW.slice(0, 2).map(item => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Pro Tips Preview */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-base">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Dicas Pro
              </span>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('dicas')} className="text-purple-600 text-xs">
                Ver todas <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PRO_TIPS.slice(0, 2).map(tip => {
              const Icon = tip.icon;
              return (
                <div key={tip.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tip.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{tip.title}</p>
                    <p className="text-xs text-gray-500">{tip.category}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Feature Categories Overview */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-500" />
          Explore por Categoria
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PLATFORM_FEATURES.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab('funcionalidades');
                setExpandedCategories(prev => ({ ...prev, [cat.id]: true }));
              }}
              className={`
                p-4 rounded-2xl ${cat.bgLight} border ${cat.borderColor}
                hover:shadow-lg transition-all text-left group
              `}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2 shadow-md`}>
                <span className="text-lg">{cat.emoji}</span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{cat.category}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{cat.features.length} funcionalidades</p>
              <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-purple-600 font-semibold flex items-center gap-1">
                  Explorar <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // --- TAB: TUTORIAL ---
  const renderTutorial = () => (
    <div className="space-y-6">
      {/* Tutorial Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-xl">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tutorial Completo</h2>
            <p className="text-gray-600">Siga os {GETTING_STARTED_STEPS.length} passos abaixo para dominar a FitJourney</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Progresso do Tutorial</span>
            <span className="text-purple-600 font-bold">{GETTING_STARTED_STEPS.length} passos</span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '100%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">Tempo total estimado: ~23 minutos</p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {GETTING_STARTED_STEPS.map((step) => (
          <StepCard
            key={step.step}
            step={step}
            isExpanded={expandedStep === step.step}
            onToggle={() => setExpandedStep(expandedStep === step.step ? null : step.step)}
            onNavigate={handleNavigate}
          />
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-purple-600" />
          Perguntas Frequentes
        </h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={i}
              item={item}
              isOpen={openFAQ === i}
              onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // --- TAB: FUNCIONALIDADES ---
  const renderFuncionalidades = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Buscar funcionalidades... (ex: análise, template, score)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 py-6 text-base rounded-2xl border-gray-200 focus:border-purple-300 focus:ring-purple-200 bg-white shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Search Results Count */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Search className="h-4 w-4" />
          {filteredFeatures.reduce((acc, cat) => acc + cat.features.length, 0)} resultados para "{searchQuery}"
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {filteredFeatures.map(category => (
          <CategorySection
            key={category.id}
            category={category}
            onNavigate={handleNavigate}
            isExpanded={!!expandedCategories[category.id] || !!searchQuery}
            onToggle={() => toggleCategory(category.id)}
          />
        ))}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma funcionalidade encontrada</p>
          <p className="text-sm text-gray-400 mt-1">Tente buscar por outro termo</p>
        </div>
      )}
    </div>
  );

  // --- TAB: NOVIDADES ---
  const renderNovidades = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <PartyPopper className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">O que há de Novo</h2>
            <p className="text-gray-600 text-sm">Últimas atualizações e recursos da plataforma</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {WHATS_NEW.map(item => (
          <WhatsNewCard key={item.id} item={item} />
        ))}
      </div>

      {/* Roadmap Preview */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Em Breve</h3>
              <p className="text-gray-400 text-sm">Próximas funcionalidades no roadmap</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: FileText, label: 'Relatórios Avançados', desc: 'PDFs automáticos de evolução' },
              { icon: MessageSquare, label: 'Chat Integrado', desc: 'Comunicação direta com pacientes' },
              { icon: Star, label: 'Gamificação', desc: 'Sistema de conquistas e recompensas' },
              { icon: Activity, label: 'Integrações Wearables', desc: 'Sincronização com smartwatches' }
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-white/70" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white/90">{item.label}</p>
                    <p className="text-xs text-white/50">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // --- TAB: DICAS PRO ---
  const renderDicasPro = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
            <Lightbulb className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dicas Pro</h2>
            <p className="text-gray-600 text-sm">Estratégias avançadas para maximizar resultados com seus pacientes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRO_TIPS.map(tip => (
          <ProTipCard key={tip.id} tip={tip} />
        ))}
      </div>

      {/* Bonus: Best Practices */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white">
          <div className="flex items-center gap-3">
            <Award className="h-7 w-7" />
            <div>
              <h3 className="font-bold text-lg">Boas Práticas de Uso</h3>
              <p className="text-emerald-100 text-sm">Checklist do profissional de alto desempenho</p>
            </div>
          </div>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { text: 'Verificar Dashboard no início do dia', icon: BarChart3 },
              { text: 'Responder SOS em até 1 hora', icon: Shield },
              { text: 'Revisar pacientes em risco semanalmente', icon: AlertTriangle },
              { text: 'Atualizar planos alimentares mensalmente', icon: Utensils },
              { text: 'Incentivar feedbacks com fotos', icon: Camera },
              { text: 'Manter anamneses completas e atualizadas', icon: ClipboardList },
              { text: 'Usar templates para escalar atendimentos', icon: Copy },
              { text: 'Personalizar experiência do paciente', icon: Palette }
            ].map((practice, i) => {
              const Icon = practice.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{practice.text}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Platform Shortcuts */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MousePointer className="h-5 w-5 text-indigo-500" />
            Atalhos Úteis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { action: 'Novo Paciente', path: 'Pacientes → Novo Paciente', route: '/professional/patients' },
              { action: 'Ver SOS Ativos', path: 'Dashboard → Atenção Hoje', route: '/professional/dashboard' },
              { action: 'Criar Template', path: 'Templates Globais → Novo Template', route: '/professional/templates' },
              { action: 'Configurar Marca', path: 'Personalização → Logo & Cores', route: '/professional/branding' },
              { action: 'Ver Feedbacks', path: 'Feedbacks → Lista Completa', route: '/professional/feedbacks' },
              { action: 'Score de Risco', path: 'Dashboard → Ranking de Risco', route: '/professional/dashboard' }
            ].map((shortcut, i) => (
              <button
                key={i}
                onClick={() => handleNavigate(shortcut.route)}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-left group"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{shortcut.action}</p>
                  <p className="text-xs text-gray-500">{shortcut.path}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'inicio': return renderInicio();
      case 'tutorial': return renderTutorial();
      case 'funcionalidades': return renderFuncionalidades();
      case 'novidades': return renderNovidades();
      case 'dicas': return renderDicasPro();
      default: return renderInicio();
    }
  };

  return (
    <Layout title="Central de Recursos" userType="professional">
      <div className="max-w-5xl mx-auto space-y-6 pb-8">

        {/* ==================== HEADER PREMIUM ==================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700 p-8 text-white shadow-2xl">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-36 translate-x-36" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/10 rounded-full translate-y-28 -translate-x-28" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute bottom-4 right-20 w-20 h-20 bg-white/5 rounded-full" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                    <Crown className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-black tracking-tight">Central de Recursos</h1>
                      <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold backdrop-blur-sm">
                        PREMIUM
                      </Badge>
                    </div>
                    <p className="text-purple-200 text-sm">Tudo que a FitJourney pode fazer por você e seus pacientes</p>
                  </div>
                </div>
                
                <p className="text-purple-100 max-w-xl text-sm leading-relaxed mb-6">
                  Explore funcionalidades, aprenda com tutoriais interativos, descubra dicas pro e acompanhe as novidades da plataforma.
                </p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-6 max-w-2xl">
              <StatsCard icon={Sparkles} value={totalFeatures} label="Funcionalidades" />
              <StatsCard icon={Brain} value={aiFeatures} label="Com IA" />
              <StatsCard icon={Layers} value={categories} label="Categorias" />
              <StatsCard icon={CheckCircle2} value={`${Math.round((activeFeatures/totalFeatures)*100)}%`} label="Disponíveis" />
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
                  <p className="text-gray-400 text-sm">Nossa equipe está pronta para te ajudar a aproveitar tudo da plataforma</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setActiveTab('tutorial')}
                  variant="outline" 
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Tutorial
                </Button>
                <Button className="bg-white text-gray-900 hover:bg-gray-100">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Suporte
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
