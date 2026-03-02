import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, XCircle, UserCheck, Utensils, Activity, Trophy, 
  MessageCircle, Instagram, Star, ChevronDown, ChevronUp,
  Brain, Camera, Users, Dumbbell, Flame, Clock, Scale,
  Calendar, Award, Sparkles, Heart, ArrowRight, Phone
} from 'lucide-react';
import WhatsAppFloating from '@/components/WhatsAppFloating';
import { supabase } from '@/lib/supabase';

const ProjetoBiquiniBranco = () => {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dados padrão baseados no flyer
  const defaultData = {
    // Hero Section
    projectName: 'Projeto Biquíni Branco',
    heroSubtitle: 'EMAGRECIMENTO INTELIGENTE',
    heroTagline: 'Um processo completo para emagrecer com saúde, sem efeito sanfona e sem sofrimento.',
    
    // Mitos (checkmarks vermelhos)
    myths: [
      'Emagrecer em 1 mês é furada',
      'Remédio não resolve',
      'O resultado só permanece quando você aprende a comer',
      'A mudança começa na mente e reflete no corpo'
    ],
    
    // O que você vai ter
    benefits: [
      { icon: 'Calendar', text: '3 meses de acompanhamento' },
      { icon: 'Utensils', text: '3 ajustes estratégicos na dieta' },
      { icon: 'Clock', text: 'Mudança de protocolo a cada 30 dias' }
    ],
    
    // A cada 15 dias
    biweeklyTasks: [
      'Envio de peso',
      'Fotos de acompanhamento'
    ],
    
    // Suporte em grupos
    supportGroups: [
      { icon: 'Users', text: 'Grupo de bate-papo' },
      { icon: 'Camera', text: 'Fotos das refeições' },
      { icon: 'Dumbbell', text: 'Treinos e academia' }
    ],
    
    // Planos
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
        highlight: true
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
        highlight: false
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
        highlight: false
      }
    ],
    
    // Depoimentos
    testimonials: [
      { name: 'Ana Paula', text: 'Perdi 12kg em 3 meses! Finalmente entendi como comer direito.', result: '-12kg' },
      { name: 'Carla Santos', text: 'O suporte no grupo faz toda diferença. Não me sinto sozinha!', result: '-8kg' },
      { name: 'Mariana Costa', text: 'Sem passar fome e sem efeito sanfona. Recomendo muito!', result: '-10kg' }
    ],
    
    // FAQ
    faq: [
      { question: 'Como funciona o acompanhamento?', answer: 'Você terá acesso à plataforma FitJourney com seu plano personalizado, tarefas diárias, e suporte direto comigo via WhatsApp. A cada 15 dias você envia seu peso e fotos para ajustarmos o protocolo.' },
      { question: 'Preciso malhar?', answer: 'Não é obrigatório, mas atividade física potencializa os resultados. Temos um grupo específico para treinos onde compartilhamos dicas e exercícios.' },
      { question: 'Vou passar fome?', answer: 'De jeito nenhum! O diferencial do programa é ensinar você a comer de forma inteligente. Você vai se alimentar bem e ainda assim emagrecer.' },
      { question: 'E se eu não conseguir seguir?', answer: 'Por isso temos os grupos de suporte! Você não está sozinha. Compartilhamos dificuldades, conquistas e nos motivamos juntas.' }
    ],
    
    // CTAs
    ctaMain: 'QUERO TRANSFORMAR MEU CORPO',
    ctaUrgency: '🔥 VAGAS LIMITADAS',
    ctaEmotional: 'Seu biquíni branco não vai se conquistar sozinho. Garanta sua vaga agora e comece a mudança hoje!',
    
    // WhatsApp
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
      UserCheck, Activity, Trophy, Brain, Flame, Award
    };
    return icons[iconName] || Activity;
  };

  if (loading || !projectData) {
    return (
      <Layout title="Carregando..." userType="visitor">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={projectData.projectName} userType="visitor">
      {/* WhatsApp Flutuante */}
      <WhatsAppFloating 
        phoneNumber={projectData.whatsappNumber}
        message="Olá! Quero saber mais sobre o Projeto Biquíni Branco!"
      />

      <div className="space-y-12">
        
        {/* HERO SECTION */}
        <section className="relative -mt-8 -mx-8 px-8 py-16 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10">
              <Flame className="w-32 h-32" />
            </div>
            <div className="absolute bottom-10 right-10">
              <Flame className="w-24 h-24" />
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold">PROJETO</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-4 drop-shadow-lg">
              {projectData.projectName.toUpperCase()}
            </h1>
            
            <h2 className="text-2xl md:text-3xl font-bold text-yellow-300 mb-6">
              {projectData.heroSubtitle}
            </h2>
            
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-white/90">
              {projectData.heroTagline}
            </p>
            
            <Button 
              onClick={() => handleCTA()}
              className="bg-green-500 hover:bg-green-600 text-white text-xl px-10 py-7 rounded-full shadow-2xl transform hover:scale-105 transition-all"
              size="lg"
            >
              <MessageCircle className="mr-3" size={24} />
              {projectData.ctaMain}
            </Button>
            
            <p className="mt-6 text-yellow-300 font-bold text-lg animate-pulse">
              {projectData.ctaUrgency}
            </p>
          </div>
        </section>

        {/* MITOS - O QUE VOCÊ PRECISA SABER */}
        <section className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0">
            <CardContent className="pt-8 pb-8">
              <h2 className="text-2xl font-bold text-center mb-4 text-yellow-400">
                {projectData.sectionTitles?.myths || '⚠️ VERDADES QUE NINGUÉM TE CONTA'}
              </h2>
              {projectData.sectionDescriptions?.myths && (
                <p className="text-center text-white/80 mb-6">{projectData.sectionDescriptions.myths}</p>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                {projectData.myths.map((myth, index) => (
                  <div key={index} className="flex items-start gap-3 bg-white/10 p-4 rounded-lg">
                    <CheckCircle className="text-green-400 flex-shrink-0 mt-1" size={24} />
                    <p className="text-lg">{myth}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* O QUE VOCÊ VAI TER */}
        <section className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            {projectData.sectionTitles?.benefits || '✅ O QUE VOCÊ VAI TER'}
          </h2>
          {projectData.sectionDescriptions?.benefits && (
            <p className="text-center text-gray-600 mb-2 text-base">{projectData.sectionDescriptions.benefits}</p>
          )}
          <p className="text-center text-gray-600 mb-10 text-lg">
            {projectData.sectionTitles?.benefitsSubtitle || 'Um programa completo para transformação real'}
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {projectData.benefits.map((benefit, index) => {
              const Icon = getIcon(benefit.icon);
              return (
                <Card key={index} className="text-center hover:shadow-xl transition-all border-2 hover:border-pink-300 bg-gradient-to-br from-white to-pink-50">
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                      <Icon className="text-white" size={32} />
                    </div>
                    <p className="text-lg font-semibold text-gray-800">{benefit.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* A cada 15 dias */}
          <Card className="bg-gradient-to-r from-teal-500 to-green-500 text-white border-0">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="flex items-center gap-3">
                  <Camera className="w-8 h-8" />
                  <span className="text-xl font-bold">{projectData.sectionTitles?.biweekly || 'A cada 15 dias:'}</span>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  {projectData.biweeklyTasks.map((task, index) => (
                    <span key={index} className="bg-white/20 px-4 py-2 rounded-full font-medium">
                      • {task}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SUPORTE EXCLUSIVO */}
        <section className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white border-0 overflow-hidden">
            <CardContent className="py-10">
              <h2 className="text-3xl font-bold text-center mb-2">
                {projectData.sectionTitles?.support || '👥 SUPORTE EXCLUSIVO EM 2 GRUPOS'}
              </h2>
              <p className="text-center text-purple-200 mb-8">
                {projectData.sectionTitles?.supportSubtitle || 'Você não vai estar sozinha nessa jornada!'}
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                {projectData.supportGroups.map((group, index) => {
                  const Icon = getIcon(group.icon);
                  return (
                    <div key={index} className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                      <Icon className="w-10 h-10 mx-auto mb-3" />
                      <p className="font-semibold text-lg">{group.text}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* PLANOS DE SUCESSO */}
        <section className="max-w-6xl mx-auto" id="planos">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-2">
            {projectData.sectionTitles?.plans || '🏆 PLANOS DE SUCESSO'}
          </h2>
          <p className="text-center text-gray-600 mb-10 text-lg">
            {projectData.sectionTitles?.plansSubtitle || 'Escolha o plano ideal para sua transformação'}
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {projectData.plans.filter(plan => plan.active !== false).map((plan, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden transition-all hover:shadow-2xl ${
                  plan.highlight 
                    ? 'border-4 border-pink-500 transform scale-105 shadow-xl' 
                    : 'border-2 border-gray-200'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-center py-2 font-bold">
                    🔥 MAIS ESCOLHIDO
                  </div>
                )}
                
                <CardContent className={`pt-${plan.highlight ? '12' : '6'}`}>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <p className="text-5xl font-black text-green-600 mb-1">{plan.price}</p>
                    <p className="text-sm text-gray-500">{plan.priceNote}</p>
                    <p className="text-pink-600 font-semibold mt-2">{plan.tagline}</p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, fIndex) => (
                      <div key={fIndex} className="flex items-center gap-2">
                        <CheckCircle className="text-green-500 flex-shrink-0" size={18} />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => handleCTA(plan.name)}
                    className={`w-full py-6 text-lg font-bold ${
                      plan.highlight 
                        ? 'bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600' 
                        : 'bg-gray-800 hover:bg-gray-900'
                    }`}
                  >
                    QUERO ESSE PLANO
                    <ArrowRight className="ml-2" size={20} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* DEPOIMENTOS */}
        <section className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-10">
            {projectData.sectionTitles?.testimonials || '💬 TRANSFORMAÇÕES REAIS'}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {projectData.testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-gradient-to-br from-pink-50 to-purple-50 border-0 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  {testimonial.image && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img
                        src={testimonial.image}
                        alt={`Depoimento de ${testimonial.name}`}
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="font-bold text-gray-900">{testimonial.name}</p>
                      <p className="text-lg text-green-600 font-bold">{testimonial.result}</p>
                    </div>
                  </div>
                  <div className="flex mb-3">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className="text-yellow-400 fill-current" size={18} />
                    ))}
                  </div>
                  <p className="text-gray-700 italic">"{testimonial.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-10">
            {projectData.sectionTitles?.faq || '❓ PERGUNTAS FREQUENTES'}
          </h2>
          
          <div className="space-y-4">
            {projectData.faq.map((item, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-pink-300"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                    {expandedFaq === index ? (
                      <ChevronUp className="text-pink-600" size={24} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={24} />
                    )}
                  </div>
                  {expandedFaq === index && (
                    <p className="mt-4 text-gray-700 bg-pink-50 p-4 rounded-lg">{item.answer}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white border-0 overflow-hidden">
            <CardContent className="py-12 text-center relative">
              <div className="absolute top-0 right-0 opacity-20">
                <Heart className="w-32 h-32" />
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {projectData.ctaEmotional}
              </h2>
              
              <p className="text-xl mb-8 text-white/90">
                {projectData.ctaFinal || 'Centenas de mulheres já transformaram suas vidas. Agora é sua vez!'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => handleCTA()}
                  className="bg-green-500 hover:bg-green-600 text-white text-xl px-10 py-7 rounded-full shadow-xl"
                  size="lg"
                >
                  <MessageCircle className="mr-3" size={24} />
                  FALAR NO WHATSAPP
                </Button>
                
                <Button 
                  onClick={() => window.open(projectData.instagramUrl, '_blank')}
                  className="bg-white/20 hover:bg-white/30 text-white border-2 border-white text-xl px-10 py-7 rounded-full"
                  size="lg"
                >
                  <Instagram className="mr-3" size={24} />
                  VER NO INSTAGRAM
                </Button>
              </div>
              
              <p className="mt-8 text-yellow-300 font-bold text-xl animate-pulse">
                ⚠️ VAGAS LIMITADAS - GARANTA A SUA AGORA!
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
};

export default ProjetoBiquiniBranco;
