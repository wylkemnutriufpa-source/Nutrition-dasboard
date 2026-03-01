import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, ClipboardList, Utensils, Camera, User, MessageSquare,
  Bell, AlertTriangle, Shield, TrendingUp, Calculator, Calendar, 
  FileText, Copy, BarChart3, Settings, Sparkles, ChevronRight,
  CheckCircle2, Play, BookOpen, Lightbulb, Rocket, Heart, Star,
  Zap, Target, Award, Crown, Gift, HelpCircle, ExternalLink,
  ShoppingCart, Pill, ChefHat, Activity, Brain, Flame, Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ==================== DADOS DAS FUNCIONALIDADES ====================

const PLATFORM_FEATURES = [
  {
    id: 'patients',
    category: '👥 Gestão de Pacientes',
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'from-blue-50 to-indigo-50',
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
        action: 'add',
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
    category: '🥗 Planos Alimentares',
    color: 'from-green-500 to-emerald-600',
    bgLight: 'from-green-50 to-emerald-50',
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
    category: '🤖 Análises por IA',
    color: 'from-purple-500 to-pink-600',
    bgLight: 'from-purple-50 to-pink-50',
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
    category: '💬 Comunicação',
    color: 'from-amber-500 to-orange-600',
    bgLight: 'from-amber-50 to-orange-50',
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
    category: '📊 Monitoramento',
    color: 'from-teal-500 to-cyan-600',
    bgLight: 'from-teal-50 to-cyan-50',
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
    category: '🛠️ Ferramentas',
    color: 'from-slate-500 to-gray-600',
    bgLight: 'from-slate-50 to-gray-50',
    features: [
      {
        id: 'calculators',
        title: 'Calculadoras',
        description: 'TMB, GET, IMC, água e outras calculadoras nutricionais',
        icon: Calculator,
        route: '/professional/calculators',
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
        id: 'schedule',
        title: 'Agenda',
        description: 'Gerencie consultas e compromissos com seus pacientes',
        icon: Calendar,
        route: '/professional/agenda',
        status: 'coming_soon'
      },
      {
        id: 'reports',
        title: 'Relatórios',
        description: 'Gere relatórios de evolução e acompanhamento',
        icon: FileText,
        route: '/professional/reports',
        status: 'coming_soon'
      }
    ]
  }
];

const QUICK_TIPS = [
  {
    id: 1,
    icon: '💡',
    title: 'Comece pela Anamnese',
    description: 'Uma anamnese completa ajuda a IA a calcular melhor o score de risco'
  },
  {
    id: 2,
    icon: '📸',
    title: 'Incentive Fotos de Pratos',
    description: 'Pacientes que enviam fotos têm 40% mais adesão ao plano'
  },
  {
    id: 3,
    icon: '🎯',
    title: 'Use Templates',
    description: 'Crie templates para agilizar a criação de planos similares'
  },
  {
    id: 4,
    icon: '⚡',
    title: 'Responda SOS Rápido',
    description: 'Pacientes atendidos em SOS têm 3x mais chances de continuar'
  }
];

// ==================== COMPONENTES ====================

const FeatureCard = ({ feature, onNavigate }) => {
  const Icon = feature.icon;
  const isComingSoon = feature.status === 'coming_soon';
  
  return (
    <div
      onClick={() => !isComingSoon && onNavigate(feature.route)}
      className={`
        relative overflow-hidden p-4 rounded-xl border border-gray-100 bg-white
        transition-all duration-300 group
        ${isComingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg hover:border-gray-200 hover:scale-[1.02] cursor-pointer'}
      `}
    >
      {isComingSoon && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-gray-500 text-white text-[9px]">
            <Lock className="h-2.5 w-2.5 mr-1" />
            Em breve
          </Badge>
        </div>
      )}
      
      {feature.badge && !isComingSoon && (
        <div className="absolute top-2 right-2">
          <Badge className={`
            text-[9px] border-0
            ${feature.badge === 'IA Premium' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
              feature.badge === 'IA' ? 'bg-purple-100 text-purple-700' :
              feature.badge === 'Novo' ? 'bg-green-100 text-green-700' :
              feature.badge === 'Crítico' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }
          `}>
            {feature.badge}
          </Badge>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className={`
          p-2.5 rounded-xl transition-all
          ${isComingSoon ? 'bg-gray-100' : 'bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-teal-500 group-hover:to-emerald-600'}
        `}>
          <Icon className={`h-5 w-5 ${isComingSoon ? 'text-gray-400' : 'text-gray-600 group-hover:text-white'} transition-colors`} />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h4 className="font-semibold text-gray-900 text-sm mb-1">{feature.title}</h4>
          <p className="text-xs text-gray-500 line-clamp-2">{feature.description}</p>
        </div>
      </div>
      
      {!isComingSoon && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="h-5 w-5 text-teal-500" />
        </div>
      )}
    </div>
  );
};

const CategorySection = ({ category, onNavigate }) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          w-full flex items-center justify-between p-4 rounded-2xl
          bg-gradient-to-r ${category.bgLight} border border-gray-100
          hover:shadow-md transition-all
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center`}>
            <span className="text-lg">{category.category.split(' ')[0]}</span>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">{category.category.split(' ').slice(1).join(' ')}</h3>
            <p className="text-xs text-gray-500">{category.features.length} funcionalidades</p>
          </div>
        </div>
        <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
          {category.features.map(feature => (
            <FeatureCard key={feature.id} feature={feature} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
};

const TipCard = ({ tip }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all">
    <span className="text-2xl">{tip.icon}</span>
    <div>
      <h4 className="font-semibold text-gray-900 text-sm">{tip.title}</h4>
      <p className="text-xs text-gray-500">{tip.description}</p>
    </div>
  </div>
);

const StatsCard = ({ icon: Icon, value, label, gradient }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white`}>
    <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
    <div className="relative z-10 flex items-center gap-3">
      <div className="bg-white/20 p-2 rounded-xl">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-white/80">{label}</p>
      </div>
    </div>
  </div>
);

// ==================== PÁGINA PRINCIPAL ====================

const PlatformGuide = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleNavigate = (route) => {
    if (route) {
      navigate(route);
    }
  };

  const totalFeatures = PLATFORM_FEATURES.reduce((acc, cat) => acc + cat.features.length, 0);
  const activeFeatures = PLATFORM_FEATURES.reduce((acc, cat) => 
    acc + cat.features.filter(f => f.status === 'active').length, 0
  );
  const aiFeatures = PLATFORM_FEATURES.reduce((acc, cat) => 
    acc + cat.features.filter(f => f.badge?.includes('IA')).length, 0
  );

  return (
    <Layout title="Central de Recursos" userType="professional">
      <div className="max-w-5xl mx-auto space-y-6 pb-8">

        {/* HEADER PREMIUM */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700 p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Rocket className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Central de Recursos</h1>
                <p className="text-purple-200">Tudo que a FitJourney pode fazer por você</p>
              </div>
            </div>
            
            <p className="text-purple-100 max-w-2xl mb-6">
              Explore todas as funcionalidades da plataforma, descubra recursos de IA e aprenda a extrair o máximo para seus pacientes.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              <StatsCard icon={Sparkles} value={totalFeatures} label="Funcionalidades" gradient="from-white/20 to-white/10" />
              <StatsCard icon={Brain} value={aiFeatures} label="Com IA" gradient="from-white/20 to-white/10" />
              <StatsCard icon={CheckCircle2} value={`${Math.round((activeFeatures/totalFeatures)*100)}%`} label="Disponíveis" gradient="from-white/20 to-white/10" />
            </div>
          </div>
        </div>

        {/* DICAS RÁPIDAS */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardTitle className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2 rounded-xl">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Dicas para Começar</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {QUICK_TIPS.map(tip => (
                <TipCard key={tip.id} tip={tip} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AÇÕES RÁPIDAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/professional/dashboard')}
            className="p-4 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-center hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            <BarChart3 className="h-8 w-8 mx-auto mb-2" />
            <span className="font-semibold text-sm">Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/professional/patients')}
            className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-center hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            <Users className="h-8 w-8 mx-auto mb-2" />
            <span className="font-semibold text-sm">Pacientes</span>
          </button>
          <button
            onClick={() => navigate('/professional/templates')}
            className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white text-center hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            <Copy className="h-8 w-8 mx-auto mb-2" />
            <span className="font-semibold text-sm">Templates</span>
          </button>
          <button
            onClick={() => navigate('/professional/feedbacks')}
            className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-center hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            <span className="font-semibold text-sm">Feedbacks</span>
          </button>
        </div>

        {/* CATEGORIAS DE FUNCIONALIDADES */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-purple-600" />
            Explore por Categoria
          </h2>
          
          {PLATFORM_FEATURES.map(category => (
            <CategorySection key={category.id} category={category} onNavigate={handleNavigate} />
          ))}
        </div>

        {/* PRECISA DE AJUDA */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-900 to-gray-800 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Precisa de Ajuda?</h3>
                  <p className="text-gray-400 text-sm">Nossa equipe está pronta para te ajudar</p>
                </div>
              </div>
              <Button className="bg-white text-gray-900 hover:bg-gray-100">
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar com Suporte
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
};

export default PlatformGuide;
