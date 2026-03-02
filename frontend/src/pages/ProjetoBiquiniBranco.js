import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, XCircle, UserCheck, Utensils, Activity, Trophy, 
  MessageCircle, Instagram, Star, ChevronDown, ChevronUp,
  Brain, Camera, Users, Dumbbell, Flame, Clock, Scale,
  Calendar, Award, Sparkles, Heart, ArrowRight, Phone,
  Zap, Target, Crown, Gift, Shield, Rocket, TrendingUp,
  Play, Check, ChevronRight, Gem, PartyPopper
} from 'lucide-react';
import WhatsAppFloating from '@/components/WhatsAppFloating';
import { supabase } from '@/lib/supabase';

const ProjetoBiquiniBranco = () => {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Dados padrão baseados no flyer
  const defaultData = {
    projectName: 'Projeto Biquíni Branco',
    heroSubtitle: 'EMAGRECIMENTO INTELIGENTE',
    heroTagline: 'Um processo completo para emagrecer com saúde, sem efeito sanfona e sem sofrimento.',
    
    myths: [
      'Emagrecer em 1 mês é furada',
      'Remédio não resolve',
      'O resultado só permanece quando você aprende a comer',
      'A mudança começa na mente e reflete no corpo'
    ],
    
    benefits: [
      { icon: 'Calendar', text: '3 meses de acompanhamento', detail: 'Suporte completo durante toda sua transformação' },
      { icon: 'Utensils', text: '3 ajustes estratégicos na dieta', detail: 'Protocolo adaptado ao seu corpo' },
      { icon: 'Clock', text: 'Mudança de protocolo a cada 30 dias', detail: 'Evolução constante e resultados reais' }
    ],
    
    biweeklyTasks: [
      'Envio de peso',
      'Fotos de acompanhamento'
    ],
    
    supportGroups: [
      { icon: 'Users', text: 'Grupo de bate-papo', detail: 'Comunidade de apoio 24h' },
      { icon: 'Camera', text: 'Fotos das refeições', detail: 'Feedback diário das suas refeições' },
      { icon: 'Dumbbell', text: 'Treinos e academia', detail: 'Dicas exclusivas de exercícios' }
    ],
    
    plans: [
      { 
        name: 'TRIMESTRAL', 
        price: 'R$ 200', 
        priceNote: 'Plano trimestral',
        duration: '3 meses',
        tagline: '3 MESES DE FOCO TOTAL',
        features: [
          'Plano alimentar personalizado',
          'Checklist diário',
          'Suporte WhatsApp',
          'Ajustes a cada 30 dias',
          'Acesso aos 2 grupos'
        ],
        highlight: true,
        badge: 'MAIS ESCOLHIDO',
        gradient: 'from-pink-500 via-rose-500 to-orange-500'
      },
      { 
        name: 'SEMESTRAL', 
        price: 'R$ 360', 
        priceNote: 'Economia de R$40',
        duration: '6 meses',
        tagline: '6 MESES PARA TRANSFORMAR',
        features: [
          'Tudo do plano trimestral',
          'Receitas exclusivas',
          'Prioridade no atendimento',
          'Suplementação básica'
        ],
        highlight: false,
        gradient: 'from-purple-500 to-indigo-600'
      },
      { 
        name: 'ANUAL', 
        price: 'R$ 660', 
        priceNote: 'Melhor custo-benefício',
        duration: '12 meses',
        tagline: '1 ANO PELA SUA SAÚDE',
        features: [
          'Tudo dos planos anteriores',
          'Grupo VIP exclusivo',
          'Consultas extras',
          'Bônus surpresa'
        ],
        highlight: false,
        badge: 'ECONOMIA MÁXIMA',
        gradient: 'from-amber-500 to-orange-600'
      }
    ],
    
    testimonials: [
      { name: 'Ana Paula', text: 'Perdi 12kg em 3 meses! Finalmente entendi como comer direito.', result: '-12kg', avatar: 'AP' },
      { name: 'Carla Santos', text: 'O suporte no grupo faz toda diferença. Não me sinto sozinha!', result: '-8kg', avatar: 'CS' },
      { name: 'Mariana Costa', text: 'Sem passar fome e sem efeito sanfona. Recomendo muito!', result: '-10kg', avatar: 'MC' }
    ],
    
    faq: [
      { question: 'Como funciona o acompanhamento?', answer: 'Você terá acesso à plataforma FitJourney com seu plano personalizado, tarefas diárias, e suporte direto comigo via WhatsApp. A cada 15 dias você envia seu peso e fotos para ajustarmos o protocolo.' },
      { question: 'Preciso malhar?', answer: 'Não é obrigatório, mas atividade física potencializa os resultados. Temos um grupo específico para treinos onde compartilhamos dicas e exercícios.' },
      { question: 'Vou passar fome?', answer: 'De jeito nenhum! O diferencial do programa é ensinar você a comer de forma inteligente. Você vai se alimentar bem e ainda assim emagrecer.' },
      { question: 'E se eu não conseguir seguir?', answer: 'Por isso temos os grupos de suporte! Você não está sozinha. Compartilhamos dificuldades, conquistas e nos motivamos juntas.' }
    ],
    
    ctaMain: 'QUERO TRANSFORMAR MEU CORPO',
    ctaUrgency: '🔥 VAGAS LIMITADAS',
    ctaEmotional: 'Seu biquíni branco não vai se conquistar sozinho. Garanta sua vaga agora e comece a mudança hoje!',
    
    whatsappNumber: '5591980124814',
    instagramUrl: 'https://www.instagram.com/dr_wylkem_raiol/'
  };

  useEffect(() => {
    loadProjectData();
  }, []);

  const loadProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('project_showcase')
        .select('*')
        .eq('project_name', 'biquini_branco')
        .maybeSingle();

      if (error || !data) {
        setProjectData(defaultData);
      } else {
        setProjectData({ ...defaultData, ...data.content });
      }
    } catch (error) {
      console.error('Erro:', error);
      setProjectData(defaultData);
    } finally {
      setLoading(false);
    }
  };

  const handleCTA = (planName = '') => {
    const message = planName 
      ? `Olá! Quero participar do Projeto Biquíni Branco - Plano ${planName}! 🔥`
      : 'Olá! Quero saber mais sobre o Projeto Biquíni Branco e transformar meu corpo! 💪';
    
    window.open(`https://wa.me/${projectData.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getIcon = (iconName) => {
    const icons = {
      Calendar, Utensils, Clock, Users, Camera, Dumbbell, Scale,
      UserCheck, Activity, Trophy, Brain, Flame, Award, Target,
      Heart, Sparkles, Shield, Rocket, TrendingUp, Gift
    };
    return icons[iconName] || Activity;
  };

  if (loading || !projectData) {
    return (
      <Layout title="Carregando..." userType="visitor">
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-pink-200 rounded-full animate-spin border-t-pink-600" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-pink-600" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={projectData.projectName} userType="visitor">
      <WhatsAppFloating 
        phoneNumber={projectData.whatsappNumber}
        message="Olá! Quero saber mais sobre o Projeto Biquíni Branco!"
      />

      <div className="space-y-16 -mt-8">
        
        {/* ==================== HERO PREMIUM ==================== */}
        <section className="relative -mx-8 overflow-hidden">
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          {/* Floating elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          
          {/* Floating icons */}
          <div className="absolute top-24 right-20 text-white/20 animate-bounce" style={{ animationDuration: '3s' }}>
            <Flame className="w-16 h-16" />
          </div>
          <div className="absolute bottom-32 left-16 text-white/15 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>
            <Heart className="w-12 h-12" />
          </div>
          <div className="absolute top-40 left-1/4 text-yellow-300/20 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>
            <Star className="w-10 h-10 fill-current" />
          </div>
          
          <div className="relative z-10 px-8 py-20 md:py-28 text-white text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-2.5 rounded-full mb-8 border border-white/30 shadow-xl">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="font-bold text-sm tracking-wide">PROJETO EXCLUSIVO</span>
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            
            {/* Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 drop-shadow-2xl tracking-tight">
              <span className="bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
                {projectData.projectName.toUpperCase()}
              </span>
            </h1>
            
            {/* Subtitle */}
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-300" />
              <h2 className="text-2xl md:text-3xl font-bold text-yellow-300 tracking-widest">
                {projectData.heroSubtitle}
              </h2>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-300" />
            </div>
            
            {/* Tagline */}
            <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-white/90 leading-relaxed font-medium">
              {projectData.heroTagline}
            </p>
            
            {/* CTA Button */}
            <div className="flex flex-col items-center gap-4">
              <Button 
                onClick={() => handleCTA()}
                className="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xl px-12 py-8 rounded-full shadow-2xl shadow-green-900/30 transform hover:scale-105 transition-all duration-300 border-2 border-white/20"
                size="lg"
              >
                <div className="absolute inset-0 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <MessageCircle className="mr-3 relative z-10" size={26} />
                <span className="relative z-10 font-bold">{projectData.ctaMain}</span>
                <ChevronRight className="ml-2 relative z-10 group-hover:translate-x-1 transition-transform" size={24} />
              </Button>
              
              {/* Urgency */}
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-300"></span>
                </span>
                <p className="text-yellow-300 font-bold text-lg">
                  {projectData.ctaUrgency}
                </p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 md:gap-16">
              {[
                { value: '500+', label: 'Transformações' },
                { value: '98%', label: 'Satisfação' },
                { value: '12kg', label: 'Média perdida' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-4xl md:text-5xl font-black text-white">{stat.value}</p>
                  <p className="text-sm text-white/70 font-medium mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== MITOS / VERDADES ==================== */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-12 shadow-2xl border border-gray-700">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full mb-4">
                  <Shield className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm">IMPORTANTE</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                  {projectData.sectionTitles?.myths || '⚠️ VERDADES QUE NINGUÉM TE CONTA'}
                </h2>
                {projectData.sectionDescriptions?.myths && (
                  <p className="text-gray-400 text-lg">{projectData.sectionDescriptions.myths}</p>
                )}
              </div>
              
              {/* Myths Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {projectData.myths.map((myth, index) => (
                  <div 
                    key={index} 
                    className="group flex items-start gap-4 bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-green-500/50 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
                      <Check className="text-white w-5 h-5" />
                    </div>
                    <p className="text-lg text-white/90 font-medium leading-relaxed pt-1">{myth}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== BENEFÍCIOS ==================== */}
        <section className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-pink-100 px-4 py-2 rounded-full mb-4">
              <Gift className="w-5 h-5 text-pink-600" />
              <span className="text-pink-600 font-bold text-sm">BENEFÍCIOS EXCLUSIVOS</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              {projectData.sectionTitles?.benefits || '✅ O QUE VOCÊ VAI TER'}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {projectData.sectionTitles?.benefitsSubtitle || 'Um programa completo para transformação real'}
            </p>
          </div>
          
          {/* Benefits Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {projectData.benefits.map((benefit, index) => {
              const Icon = getIcon(benefit.icon);
              return (
                <div 
                  key={index} 
                  className="group relative overflow-hidden rounded-3xl bg-white border-2 border-gray-100 hover:border-pink-300 shadow-lg hover:shadow-2xl hover:shadow-pink-100 transition-all duration-500 hover:-translate-y-2"
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative p-8 text-center">
                    {/* Icon */}
                    <div className="relative mx-auto mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                      <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                        <Icon className="text-white w-10 h-10" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.text}</h3>
                    {benefit.detail && (
                      <p className="text-gray-500 text-sm">{benefit.detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Biweekly Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 p-1 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 opacity-90" />
            <div className="relative z-10 px-8 py-6 flex flex-col md:flex-row items-center justify-center gap-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Camera className="w-7 h-7" />
                </div>
                <span className="text-2xl font-bold">{projectData.sectionTitles?.biweekly || 'A cada 15 dias:'}</span>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {projectData.biweeklyTasks.map((task, index) => (
                  <span key={index} className="bg-white/20 backdrop-blur-sm px-5 py-2.5 rounded-full font-semibold border border-white/30">
                    ✓ {task}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== SUPORTE EXCLUSIVO ==================== */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            
            {/* Floating elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 px-8 py-14 text-white text-center">
              {/* Header */}
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/30">
                <Users className="w-5 h-5" />
                <span className="font-bold text-sm">COMUNIDADE EXCLUSIVA</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-black mb-3">
                {projectData.sectionTitles?.support || '👥 SUPORTE EXCLUSIVO EM 2 GRUPOS'}
              </h2>
              <p className="text-xl text-purple-200 mb-10">
                {projectData.sectionTitles?.supportSubtitle || 'Você não vai estar sozinha nessa jornada!'}
              </p>
              
              {/* Support Groups */}
              <div className="grid md:grid-cols-3 gap-6">
                {projectData.supportGroups.map((group, index) => {
                  const Icon = getIcon(group.icon);
                  return (
                    <div 
                      key={index} 
                      className="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-7 h-7" />
                      </div>
                      <p className="font-bold text-lg mb-1">{group.text}</p>
                      {group.detail && (
                        <p className="text-sm text-purple-200">{group.detail}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== PLANOS PREMIUM ==================== */}
        <section className="max-w-6xl mx-auto px-4" id="planos">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-100 px-4 py-2 rounded-full mb-4">
              <Crown className="w-5 h-5 text-amber-600" />
              <span className="text-amber-600 font-bold text-sm">INVESTIMENTO</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              {projectData.sectionTitles?.plans || '🏆 PLANOS DE SUCESSO'}
            </h2>
            <p className="text-gray-600 text-lg">
              {projectData.sectionTitles?.plansSubtitle || 'Escolha o plano ideal para sua transformação'}
            </p>
          </div>
          
          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {projectData.plans.filter(plan => plan.active !== false).map((plan, index) => (
              <div 
                key={index}
                className={`relative group ${plan.highlight ? 'md:-mt-6 md:mb-6' : ''}`}
                onMouseEnter={() => setSelectedPlan(index)}
                onMouseLeave={() => setSelectedPlan(null)}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className={`px-5 py-1.5 bg-gradient-to-r ${plan.gradient} rounded-full text-white text-xs font-bold shadow-lg flex items-center gap-1.5`}>
                      {plan.highlight ? <Flame className="w-3.5 h-3.5" /> : <Gem className="w-3.5 h-3.5" />}
                      {plan.badge}
                    </div>
                  </div>
                )}
                
                {/* Card */}
                <Card className={`relative overflow-hidden transition-all duration-500 h-full
                  ${plan.highlight 
                    ? 'border-4 border-pink-400 shadow-2xl shadow-pink-200/50 bg-gradient-to-br from-pink-50 to-white' 
                    : 'border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl bg-white'
                  }
                  ${selectedPlan === index ? 'scale-[1.02]' : ''}
                `}>
                  {/* Gradient bar */}
                  <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${plan.gradient}`} />
                  
                  <CardContent className="pt-10 pb-8 px-6">
                    {/* Plan name */}
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-black text-gray-900 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className={`text-5xl font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                          {plan.price}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{plan.priceNote}</p>
                      <p className={`font-bold mt-2 bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                        {plan.tagline}
                      </p>
                    </div>
                    
                    {/* Features */}
                    <div className="space-y-3 mb-8">
                      {plan.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center`}>
                            <Check className="text-white w-3.5 h-3.5" />
                          </div>
                          <span className="text-gray-700 font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* CTA */}
                    <Button 
                      onClick={() => handleCTA(plan.name)}
                      className={`w-full py-7 text-lg font-bold rounded-xl transition-all duration-300
                        ${plan.highlight 
                          ? `bg-gradient-to-r ${plan.gradient} hover:opacity-90 shadow-lg shadow-pink-300/30` 
                          : 'bg-gray-900 hover:bg-gray-800'
                        } text-white
                      `}
                    >
                      QUERO ESSE PLANO
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== DEPOIMENTOS ==================== */}
        <section className="max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-rose-100 px-4 py-2 rounded-full mb-4">
              <Heart className="w-5 h-5 text-rose-600" />
              <span className="text-rose-600 font-bold text-sm">RESULTADOS REAIS</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              {projectData.sectionTitles?.testimonials || '💬 TRANSFORMAÇÕES REAIS'}
            </h2>
          </div>
          
          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {projectData.testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-50 via-white to-purple-50 border border-pink-100 hover:border-pink-300 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Top decoration */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-pink-500/10 to-purple-500/10" />
                
                <div className="relative p-6">
                  {/* Image placeholder */}
                  {testimonial.image && (
                    <div className="mb-4 rounded-2xl overflow-hidden shadow-lg">
                      <img
                        src={testimonial.image}
                        alt={`Depoimento de ${testimonial.name}`}
                        className="w-full h-44 object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Avatar and Info */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full blur-md opacity-50" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {testimonial.avatar || testimonial.name.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{testimonial.name}</p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <p className="text-xl font-black text-green-600">{testimonial.result}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stars */}
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className="text-amber-400 fill-current w-5 h-5" />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <p className="text-gray-700 italic leading-relaxed">"{testimonial.text}"</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== FAQ PREMIUM ==================== */}
        <section className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-indigo-100 px-4 py-2 rounded-full mb-4">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
              <span className="text-indigo-600 font-bold text-sm">DÚVIDAS</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900">
              {projectData.sectionTitles?.faq || '❓ PERGUNTAS FREQUENTES'}
            </h2>
          </div>
          
          {/* FAQ Items */}
          <div className="space-y-4">
            {projectData.faq.map((item, index) => (
              <div 
                key={index}
                className={`overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer
                  ${expandedFaq === index 
                    ? 'border-pink-400 shadow-lg shadow-pink-100 bg-gradient-to-br from-pink-50 to-white' 
                    : 'border-gray-200 bg-white hover:border-pink-200 hover:shadow-md'
                  }
                `}
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <div className="p-5 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">{item.question}</h3>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${expandedFaq === index 
                      ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white rotate-180' 
                      : 'bg-gray-100 text-gray-400'
                    }
                  `}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
                
                {expandedFaq === index && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="p-4 bg-white rounded-xl border border-pink-100">
                      <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ==================== CTA FINAL PREMIUM ==================== */}
        <section className="max-w-5xl mx-auto px-4 pb-8">
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            
            {/* Floating elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/4 opacity-20">
              <Heart className="w-24 h-24 text-white" />
            </div>
            <div className="absolute bottom-1/4 right-1/4 opacity-20">
              <Sparkles className="w-20 h-20 text-yellow-300" />
            </div>
            
            <div className="relative z-10 px-8 py-16 text-center text-white">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-2 rounded-full mb-6 border border-white/30">
                <PartyPopper className="w-5 h-5 text-yellow-300" />
                <span className="font-bold text-sm">SUA VEZ CHEGOU</span>
              </div>
              
              {/* Title */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 max-w-3xl mx-auto leading-tight">
                {projectData.ctaEmotional}
              </h2>
              
              {/* Subtitle */}
              <p className="text-xl mb-10 text-white/90 max-w-2xl mx-auto">
                {projectData.ctaFinal || 'Centenas de mulheres já transformaram suas vidas. Agora é sua vez!'}
              </p>
              
              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => handleCTA()}
                  className="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xl px-12 py-8 rounded-full shadow-2xl shadow-green-900/40 transition-all duration-300 border-2 border-white/20"
                  size="lg"
                >
                  <div className="absolute inset-0 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <MessageCircle className="mr-3 relative z-10" size={26} />
                  <span className="relative z-10 font-bold">FALAR NO WHATSAPP</span>
                </Button>
                
                <Button 
                  onClick={() => window.open(projectData.instagramUrl, '_blank')}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-2 border-white/40 text-xl px-10 py-8 rounded-full transition-all duration-300"
                  size="lg"
                >
                  <Instagram className="mr-3" size={24} />
                  VER NO INSTAGRAM
                </Button>
              </div>
              
              {/* Final urgency */}
              <div className="mt-10 flex items-center justify-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-300"></span>
                </span>
                <p className="text-yellow-300 font-black text-xl animate-pulse">
                  ⚠️ VAGAS LIMITADAS - GARANTA A SUA AGORA!
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default ProjetoBiquiniBranco;
