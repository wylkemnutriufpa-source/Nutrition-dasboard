import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, Moon, Dumbbell, Scale, Brain, Droplet, Activity,
  AlertCircle, CheckCircle, Mail, Phone, User, Download,
  ArrowRight, ArrowLeft, MessageCircle, Instagram
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import WhatsAppFloating from '@/components/WhatsAppFloating';
import ProjectCTA from '@/components/ProjectCTA';

// Função para determinar categoria baseada no score
const getScoreCategory = (score) => {
  if (score >= 80) return 'normal';
  if (score >= 60) return 'sobrepeso';
  if (score >= 40) return 'sobrepeso';
  return 'obesidade';
};

// Configuração das perguntas
const QUESTIONS = [
  {
    id: 'symptoms',
    title: 'O que você está sentindo atualmente?',
    subtitle: 'Selecione todos que se aplicam',
    type: 'multi-select',
    options: [
      { value: 'fatigue', label: 'Cansaço frequente', icon: Zap },
      { value: 'bloating', label: 'Inchaço abdominal', icon: Droplet },
      { value: 'weight_difficulty', label: 'Dificuldade para emagrecer', icon: Scale },
      { value: 'hair_loss', label: 'Queda de cabelo', icon: Activity },
      { value: 'anxiety', label: 'Ansiedade alimentar', icon: Brain },
      { value: 'muscle_pain', label: 'Dores musculares', icon: Dumbbell },
      { value: 'other', label: 'Outro', icon: AlertCircle }
    ]
  },
  {
    id: 'duration',
    title: 'Há quanto tempo sente isso?',
    type: 'single-select',
    options: [
      { value: 'less_1_month', label: 'Menos de 1 mês' },
      { value: '1_3_months', label: '1–3 meses' },
      { value: 'more_3_months', label: 'Mais de 3 meses' }
    ]
  },
  {
    id: 'routine',
    title: 'Como está sua rotina?',
    type: 'single-select',
    options: [
      { value: 'sedentary', label: 'Sedentário', icon: Moon },
      { value: 'light_1_2', label: 'Treino leve 1–2x semana', icon: Dumbbell },
      { value: 'moderate_3_4', label: 'Treino moderado 3–4x', icon: Dumbbell },
      { value: 'intense_5_6', label: 'Treino intenso 5–6x', icon: Activity }
    ]
  },
  {
    id: 'sleep',
    title: 'Como está seu sono?',
    type: 'single-select',
    options: [
      { value: 'good', label: 'Durmo bem', icon: Moon },
      { value: 'irregular', label: 'Sono irregular', icon: Moon },
      { value: 'tired', label: 'Acordo cansado', icon: Zap }
    ]
  },
  {
    id: 'exams',
    title: 'Você já realizou exames recentes?',
    subtitle: 'Últimos 6 meses',
    type: 'single-select',
    options: [
      { value: 'yes', label: 'Sim' },
      { value: 'no', label: 'Não' }
    ]
  }
];

// Lógica de análise com Índice Nutricional (0-100)
const analyzeResults = (answers) => {
  const alerts = [];
  let score = 100;

  const symptoms = answers.symptoms || [];
  const duration = answers.duration;
  const routine = answers.routine;
  const sleep = answers.sleep;
  const exams = answers.exams;

  // Análise de sintomas combinados
  if (symptoms.includes('fatigue') && sleep !== 'good') {
    alerts.push({
      type: 'warning',
      title: 'Desequilíbrio energético identificado',
      message: 'Padrão de cansaço associado à baixa qualidade do sono sugere necessidade de revisão da rotina alimentar e recuperação'
    });
    score -= 10;
  }

  if (symptoms.includes('bloating') && symptoms.includes('anxiety')) {
    alerts.push({
      type: 'warning',
      title: 'Padrão alimentar desregulado',
      message: 'A combinação de sintomas digestivos e ansiedade alimentar pode indicar escolhas nutricionais que não favorecem seu equilíbrio'
    });
    score -= 15;
  }

  if (symptoms.includes('weight_difficulty') && (routine === 'moderate_3_4' || routine === 'intense_5_6')) {
    alerts.push({
      type: 'warning',
      title: 'Possível sobrecarga metabólica',
      message: 'Atividade física frequente sem resultados esperados sugere necessidade de ajuste estratégico nutricional'
    });
    score -= 15;
  }

  if (symptoms.includes('hair_loss') || symptoms.includes('muscle_pain')) {
    alerts.push({
      type: 'warning',
      title: 'Sinais de possível deficiência nutricional',
      message: 'Manifestações como queda capilar ou dores musculares podem estar associadas a carências de micronutrientes'
    });
    score -= 15;
  }

  // Análise de duração dos sintomas
  if (duration === 'more_3_months') {
    alerts.push({
      type: 'info',
      title: 'Sintomas prolongados',
      message: 'Manifestações persistentes por mais de 3 meses justificam investigação profissional detalhada'
    });
    score -= 10;
  }

  // Análise de sono
  if (sleep === 'tired' || sleep === 'irregular') {
    alerts.push({
      type: 'info',
      title: 'Qualidade do sono comprometida',
      message: 'O sono inadequado impacta diretamente processos metabólicos e recuperação celular'
    });
    score -= 10;
  }

  // Análise de sedentarismo
  if (routine === 'sedentary') {
    alerts.push({
      type: 'warning',
      title: 'Padrão sedentário',
      message: 'A ausência de atividade física regular é reconhecida como fator de risco para doenças crônicas'
    });
    score -= 15;
  }

  // Bônus por atividade regular
  if (routine === 'moderate_3_4' || routine === 'intense_5_6') {
    score += 5; // Pequeno bônus
  }

  // Exames
  if (exams === 'no' && symptoms.length >= 3) {
    alerts.push({
      type: 'warning',
      title: 'Avaliação clínica recomendada',
      message: 'Múltiplos sintomas sem avaliação laboratorial recente justificam investigação complementar'
    });
    score -= 10;
  }

  // Mensagem positiva se score alto
  if (score >= 80) {
    alerts.push({
      type: 'success',
      title: 'Equilíbrio adequado identificado',
      message: 'Seus padrões indicam bom gerenciamento nutricional. Otimizações pontuais podem potencializar ainda mais seus resultados'
    });
  }

  return { alerts, score: Math.max(score, 0) };
};

// Função para determinar categoria e cor do índice
const getNutritionalIndex = (score) => {
  if (score >= 80) {
    return {
      category: 'Equilíbrio adequado',
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      message: 'Seu Índice Nutricional indica padrões saudáveis. Continue mantendo boas práticas.'
    };
  } else if (score >= 60) {
    return {
      category: 'Atenção leve',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      message: 'Seu Índice Nutricional sugere oportunidades de melhoria em alguns aspectos da rotina.'
    };
  } else if (score >= 40) {
    return {
      category: 'Atenção moderada',
      color: 'bg-orange-500',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      message: 'Seu Índice Nutricional indica necessidade de ajustes estratégicos na rotina.'
    };
  } else {
    return {
      category: 'Necessita ajuste prioritário',
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      message: 'Seu Índice Nutricional sugere que ajustes nutricionais devem ser priorizados.'
    };
  }
};

const HealthCheckQuiz = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const currentQuestion = QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  const handleSelectMulti = (value) => {
    const current = answers[currentQuestion.id] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setAnswers({ ...answers, [currentQuestion.id]: updated });
  };

  const handleSelectSingle = (value) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finalizar quiz e gerar resultado
      const analysisResult = analyzeResults(answers);
      setResult(analysisResult);
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === 'multi-select') {
      return answer && answer.length > 0;
    }
    return !!answer;
  };

  const saveToSupabase = async (withLead = false) => {
    setSaving(true);
    try {
      const data = {
        symptoms: answers.symptoms || [],
        duration: answers.duration,
        routine: answers.routine,
        sleep_quality: answers.sleep,
        recent_exams: answers.exams,
        alerts: result.alerts,
        score: result.score,
        converted_to_lead: withLead,
        ...(withLead && {
          visitor_name: leadData.name,
          visitor_email: leadData.email,
          visitor_phone: leadData.phone
        })
      };

      const { error } = await supabase
        .from('health_check_responses')
        .insert(data);

      if (error) throw error;

      if (withLead) {
        toast.success('Resultado enviado para seu email!');
      }
    } catch (error) {
      console.error('Error saving health check:', error);
      if (withLead) {
        toast.error('Erro ao enviar. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCTA = async (action) => {
    if (action === 'email') {
      setShowLeadCapture(true);
    } else if (action === 'whatsapp') {
      await saveToSupabase(false);
      // Abrir WhatsApp (ajuste o número)
      window.open('https://wa.me/5511999999999?text=Olá! Fiz o Check Nutricional e quero uma consultoria personalizada', '_blank');
    } else if (action === 'instagram') {
      await saveToSupabase(false);
      // Abrir Instagram (ajuste o @)
      window.open('https://instagram.com/seu_instagram', '_blank');
    } else if (action === 'consult') {
      await saveToSupabase(false);
      toast.success('Em breve entraremos em contato!');
    }
  };

  const handleLeadSubmit = async () => {
    if (!leadData.name || !leadData.email) {
      toast.error('Preencha nome e email');
      return;
    }

    await saveToSupabase(true);
    setShowLeadCapture(false);
    
    // Aqui você pode gerar PDF ou enviar email
    toast.success('PDF será enviado para seu email em breve!');
  };

  if (showResult) {
    const indexData = getNutritionalIndex(result.score);
    
    return (
      <Layout title="Resultado do Check" userType="visitor">
        {/* Botão WhatsApp Flutuante */}
        <WhatsAppFloating 
          phoneNumber="5511999999999"
          message="Olá! Fiz o Check Nutricional e quero saber mais"
        />
        
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Seu Check Nutricional
            </h1>
            <p className="text-gray-600">Análise baseada nas suas respostas</p>
          </div>

          {/* Índice Nutricional */}
          <Card className="mb-6 bg-white shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Índice Nutricional
                </h3>
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-teal-600 to-blue-600 text-white mb-4">
                  <span className="text-5xl font-bold">{result.score}</span>
                </div>
                <p className="text-lg font-semibold text-gray-700 mb-4">
                  {indexData.category}
                </p>
              </div>

              {/* Barra de progresso colorida */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className={`${indexData.color} h-6 rounded-full transition-all duration-1000 flex items-center justify-end pr-2`}
                    style={{ width: `${result.score}%` }}
                  >
                    <span className="text-white text-xs font-bold">{result.score}/100</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>40</span>
                  <span>60</span>
                  <span>80</span>
                  <span>100</span>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-l-4 ${indexData.borderColor} ${indexData.bgColor}`}>
                <p className={`text-sm font-medium ${indexData.textColor}`}>
                  {indexData.message}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alertas Personalizados */}
          <Card className="mb-6 bg-white shadow-lg">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="mr-2 text-teal-600" size={20} />
                Pontos identificados na sua avaliação:
              </h3>
              
              <div className="space-y-4">
                {result.alerts.map((alert, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.type === 'warning' 
                        ? 'bg-amber-50 border-amber-500' 
                        : alert.type === 'success'
                        ? 'bg-green-50 border-green-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {alert.title}
                    </h4>
                    <p className="text-sm text-gray-700">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Alerta personalizado por faixa */}
              {result.score < 60 && (
                <div className="mt-6 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <p className="text-sm font-medium text-orange-900">
                    ⚠️ {result.score < 40 
                      ? 'Recomendamos fortemente considerar uma avaliação profissional detalhada para investigar possíveis desequilíbrios.'
                      : 'Os padrões identificados sugerem que seu corpo pode estar enfrentando um nível de sobrecarga metabólica que merece atenção preventiva.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contexto Institucional */}
          <Card className="mb-6 bg-gray-50 shadow-lg border border-gray-200">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                📚 Contexto de Saúde Pública
              </h3>
              
              <div className="space-y-4 text-sm text-gray-700">
                <p>
                  Segundo a <strong>Organização Mundial da Saúde (OMS)</strong>, o excesso de peso e o sedentarismo estão entre os principais fatores de risco modificáveis para doenças crônicas.
                </p>
                <p>
                  De acordo com a <strong>Sociedade Brasileira de Cardiologia</strong>, hábitos alimentares inadequados e baixa atividade física aumentam significativamente o risco cardiovascular ao longo do tempo.
                </p>
              </div>

              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 flex items-center">
                  <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                  <strong>Importante:</strong> Este resultado não substitui avaliação médica ou nutricional profissional.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CTA Emocional */}
          {!showLeadCapture ? (
            <Card className="bg-gradient-to-br from-teal-600 to-blue-600 text-white shadow-xl">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-2 text-center">
                  Transforme informação em ação
                </h3>
                <p className="text-center mb-6 text-white/90">
                  Pequenos ajustes hoje podem reduzir riscos futuros e melhorar sua qualidade de vida. 
                  Receba uma análise ampliada com orientações práticas e prioridades personalizadas.
                </p>

                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold mb-3">O que você vai receber:</p>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center">
                      <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                      Interpretação detalhada do seu índice
                    </p>
                    <p className="flex items-center">
                      <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                      Pontos críticos da sua rotina
                    </p>
                    <p className="flex items-center">
                      <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                      Sugestões iniciais de melhoria
                    </p>
                    <p className="flex items-center">
                      <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                      Direcionamento profissional
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={() => setShowLeadCapture(true)}
                    className="w-full bg-white text-teal-700 hover:bg-gray-100 text-lg py-6 font-bold"
                    size="lg"
                  >
                    Quero Minha Análise Estratégica
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => handleCTA('whatsapp')}
                      className="w-full bg-green-600 hover:bg-green-700 py-4"
                    >
                      <MessageCircle className="mr-2" size={18} />
                      WhatsApp
                    </Button>
                    
                    <Button 
                      onClick={() => handleCTA('instagram')}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-4"
                    >
                      <Instagram className="mr-2" size={18} />
                      Instagram
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white shadow-xl">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                  Receba sua análise completa
                </h3>
                <p className="text-sm text-gray-600 text-center mb-6">
                  Seus dados são confidenciais e utilizados apenas para envio da análise.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <Label>Nome completo *</Label>
                    <Input
                      value={leadData.name}
                      onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                      placeholder="Seu nome"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={leadData.email}
                      onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label>WhatsApp (opcional)</Label>
                    <Input
                      type="tel"
                      value={leadData.phone}
                      onChange={(e) => setLeadData({ ...leadData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="mt-1"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleLeadSubmit}
                    disabled={saving}
                    className="w-full bg-teal-600 hover:bg-teal-700 py-6"
                    size="lg"
                  >
                    {saving ? 'Enviando...' : 'Receber Análise Completa'}
                  </Button>
                  
                  <Button 
                    onClick={() => setShowLeadCapture(false)}
                    variant="ghost"
                    className="w-full"
                  >
                    Voltar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTA Projeto Biquíni Branco */}
          <ProjectCTA 
            category={getScoreCategory(result.score)}
            userData={{ score: result.score }}
            source="health-check"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Check Nutricional" userType="visitor">
      {/* Botão WhatsApp Flutuante */}
      <WhatsAppFloating 
        phoneNumber="5511999999999"
        message="Olá! Fiz o Check Nutricional e quero saber mais"
      />
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Check Nutricional Inteligente
          </h1>
          <p className="text-gray-600">
            Responda com sinceridade para receber orientações personalizadas
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Pergunta {currentStep + 1} de {QUESTIONS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="bg-white shadow-xl">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentQuestion.title}
            </h2>
            {currentQuestion.subtitle && (
              <p className="text-gray-600 mb-6">{currentQuestion.subtitle}</p>
            )}

            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const Icon = option.icon;
                const isSelected = currentQuestion.type === 'multi-select'
                  ? (answers[currentQuestion.id] || []).includes(option.value)
                  : answers[currentQuestion.id] === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => 
                      currentQuestion.type === 'multi-select'
                        ? handleSelectMulti(option.value)
                        : handleSelectSingle(option.value)
                    }
                    className={`w-full p-4 rounded-lg border-2 transition-all flex items-center ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                    }`}
                  >
                    {Icon && (
                      <Icon 
                        className={`mr-3 ${isSelected ? 'text-teal-600' : 'text-gray-400'}`} 
                        size={24} 
                      />
                    )}
                    <span className={`text-lg ${isSelected ? 'font-semibold text-teal-900' : 'text-gray-700'}`}>
                      {option.label}
                    </span>
                    {isSelected && (
                      <CheckCircle className="ml-auto text-teal-600" size={24} />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-4 mt-6">
          <Button
            onClick={handleBack}
            disabled={currentStep === 0}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="mr-2" size={18} />
            Voltar
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            {currentStep === QUESTIONS.length - 1 ? 'Ver Resultado' : 'Próxima'}
            <ArrowRight className="ml-2" size={18} />
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default HealthCheckQuiz;
