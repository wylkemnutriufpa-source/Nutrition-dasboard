import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle, Heart, Target, Shield, Star } from 'lucide-react';

/**
 * ProjectCTA - Componente de Call-to-Action para o Projeto Biquíni Branco
 * Aparece ao final de testes e calculadoras com mensagens personalizadas por categoria
 * 
 * @param {string} category - magreza | normal | sobrepeso | obesidade
 * @param {object} userData - dados do usuário (weight, imc, goal, etc)
 * @param {string} source - origem (weight-calculator, water-calculator, health-check)
 */
const ProjectCTA = ({ category = 'normal', userData = {}, source = 'calculator' }) => {
  const navigate = useNavigate();

  // Configuração de mensagens emocionais por categoria
  const ctaConfig = {
    magreza: {
      icon: Heart,
      gradient: 'from-blue-500 to-teal-500',
      bgGradient: 'from-blue-50 via-teal-50 to-white',
      borderColor: 'border-blue-200',
      title: 'Seu corpo merece nutrição de qualidade',
      subtitle: 'Ganhar peso de forma saudável é um processo delicado que requer acompanhamento profissional.',
      emotional: '💙 Você não está sozinha nessa jornada. Com o plano certo, é possível nutrir seu corpo e conquistar mais energia e vitalidade.',
      cta: 'Quero ganhar peso com saúde',
      whatsappText: 'Olá! Fiz o teste e meu resultado indica que estou abaixo do peso. Quero saber como o Projeto Biquíni Branco pode me ajudar a ganhar peso de forma saudável!'
    },
    normal: {
      icon: Star,
      gradient: 'from-teal-500 to-green-500',
      bgGradient: 'from-teal-50 via-green-50 to-white',
      borderColor: 'border-teal-200',
      title: 'Mantenha sua conquista e vá além!',
      subtitle: 'Você está no caminho certo. Que tal potencializar seus resultados com acompanhamento profissional?',
      emotional: '✨ Parabéns por cuidar de você! Mas sabia que muitas pessoas no peso "normal" ainda sentem que podem melhorar? O Projeto Biquíni Branco é para quem quer mais: mais energia, mais disposição, mais confiança.',
      cta: 'Quero potencializar meus resultados',
      whatsappText: 'Olá! Fiz o teste e estou no peso ideal, mas quero melhorar ainda mais! Como funciona o Projeto Biquíni Branco?'
    },
    sobrepeso: {
      icon: Target,
      gradient: 'from-orange-500 to-pink-500',
      bgGradient: 'from-orange-50 via-pink-50 to-white',
      borderColor: 'border-orange-200',
      title: 'É hora de transformar sua vida!',
      subtitle: 'Cada jornada começa com um primeiro passo. O seu pode ser agora.',
      emotional: '🔥 Imagine-se daqui a 90 dias: mais leve, mais disposta, vestindo aquela roupa que está guardada no armário. No Projeto Biquíni Branco, você terá todo suporte para essa transformação acontecer.',
      cta: 'Quero iniciar minha transformação',
      whatsappText: 'Olá! Fiz o teste e percebi que estou acima do peso. Quero muito mudar! Como posso participar do Projeto Biquíni Branco?'
    },
    obesidade: {
      icon: Shield,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 via-pink-50 to-white',
      borderColor: 'border-purple-200',
      title: 'Sua saúde merece cuidado profissional',
      subtitle: 'Não é sobre estética, é sobre qualidade de vida. Você merece viver melhor.',
      emotional: '💜 Eu sei que não é fácil. Muitas pessoas já tentaram de tudo e se frustraram. O Projeto Biquíni Branco é diferente: é um acompanhamento humanizado, sem julgamentos, focado em você e suas necessidades reais. Vamos juntas?',
      cta: 'Quero cuidar da minha saúde',
      whatsappText: 'Olá! Fiz o teste e sei que preciso de ajuda profissional para mudar minha saúde. Pode me explicar como funciona o Projeto Biquíni Branco?'
    }
  };

  const config = ctaConfig[category] || ctaConfig.normal;
  const Icon = config.icon;

  const handleKnowMore = () => {
    navigate('/visitor/projeto');
  };

  const handleWhatsApp = () => {
    const phone = '5591980124814';
    const message = encodeURIComponent(config.whatsappText);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <Card className={`mt-8 border-2 ${config.borderColor} bg-gradient-to-br ${config.bgGradient} overflow-hidden relative`}>
      {/* Decoração de fundo */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Sparkles className="w-full h-full text-pink-500" />
      </div>
      
      <CardHeader className="text-center relative z-10">
        {/* Badge do Projeto */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="text-white" size={32} />
          </div>
        </div>
        
        <div className="inline-flex items-center gap-2 px-4 py-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-full mx-auto mb-3" style={{ fontSize: 'var(--badge-size, 0.75rem)' }}>
          <Sparkles size={12} />
          PROJETO BIQUÍNI BRANCO
        </div>
        
        <CardTitle className="text-2xl md:text-3xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent" style={{ fontSize: 'var(--font-size-heading, 2rem)' }}>
          {config.title}
        </CardTitle>
        <CardDescription className="mt-2 text-gray-600" style={{ fontSize: 'var(--font-size-body, 1rem)' }}>
          {config.subtitle}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 relative z-10">
        {/* Mensagem emocional */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-700 text-center leading-relaxed" style={{ fontSize: 'var(--font-size-body, 1rem)' }}>
            {config.emotional}
          </p>
        </div>
        
        {/* Benefícios rápidos */}
        <div className="grid grid-cols-3 gap-2 text-center" style={{ fontSize: 'var(--font-size-small, 0.875rem)' }}>
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-1">👙</span>
            <span className="text-gray-600">Programa completo</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-1">📊</span>
            <span className="text-gray-600">Plano personalizado</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-1">💪</span>
            <span className="text-gray-600">Resultados em 90 dias</span>
          </div>
        </div>
        
        {/* Botões CTA */}
        <div className="space-y-3">
          <Button 
            onClick={handleKnowMore}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white py-6 shadow-lg hover:shadow-xl transition-all"
            style={{ fontSize: 'var(--button-size, 1rem)' }}
            size="lg"
          >
            <Sparkles className="mr-2" size={20} />
            Conhecer o Projeto
          </Button>
          
          <Button 
            onClick={handleWhatsApp}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-6 shadow-md hover:shadow-lg transition-all"
            style={{ fontSize: 'var(--button-size, 1rem)' }}
            size="lg"
          >
            <MessageCircle className="mr-2" size={20} />
            {config.cta}
          </Button>
        </div>
        
        {/* Urgência */}
        <p className="text-center text-gray-500" style={{ fontSize: 'var(--font-size-small, 0.875rem)' }}>
          🔥 Vagas limitadas para acompanhamento personalizado
        </p>
      </CardContent>
    </Card>
  );
};

export default ProjectCTA;
