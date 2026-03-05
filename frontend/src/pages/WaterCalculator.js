import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Droplets, Loader2, RefreshCw, Info, Sparkles, Sun, Moon, Coffee, GlassWater, Activity, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getAnamnesis, supabase } from '@/lib/supabase';
import ProjectCTA from '@/components/ProjectCTA';

const WaterCalculator = ({ userType = 'visitor' }) => {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loadingData, setLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [formData, setFormData] = useState({
    weight: '',
    activityLevel: '',
    climate: '',
    currentIntake: '',
    routine: ''
  });
  const [result, setResult] = useState(null);

  // Auto-carregar dados do paciente
  useEffect(() => {
    if (userType === 'patient' && profile?.id) {
      loadPatientData();
    }
  }, [userType, profile?.id]);

  const loadPatientData = async () => {
    if (!profile?.id) return;
    setLoadingData(true);
    try {
      // Buscar peso da anamnese ou perfil
      const { data: anamnesis } = await getAnamnesis(profile.id);
      let weight = null;

      if (anamnesis) {
        weight = anamnesis.current_weight || anamnesis.peso_atual || anamnesis.weight;
      }

      // Buscar do perfil
      if (!weight) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('weight, height')
          .eq('id', profile.id)
          .maybeSingle();
        if (profileData?.weight) weight = profileData.weight;
      }

      // Buscar da avaliacao fisica
      if (!weight) {
        const { data: assessment } = await supabase
          .from('physical_assessments')
          .select('weight')
          .eq('patient_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (assessment?.weight) weight = assessment.weight;
      }

      if (weight) {
        setFormData(prev => ({ ...prev, weight: String(weight) }));
        setDataLoaded(true);
        toast.success(`Peso carregado: ${weight} kg`);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCalculate = () => {
    const weight = parseFloat(formData.weight);
    if (!weight || weight <= 0) { toast.error('Informe um peso valido'); return; }

    let baseWater = weight * 35;
    if (formData.activityLevel === 'intenso') baseWater += 500;
    else if (formData.activityLevel === 'moderado') baseWater += 300;
    else if (formData.activityLevel === 'leve') baseWater += 150;
    if (formData.climate === 'quente') baseWater += 300;
    if (formData.routine === 'ativa') baseWater += 200;

    const recommendedWater = (baseWater / 1000).toFixed(1);
    const recommendedMl = Math.round(baseWater);
    const currentIntake = parseFloat(formData.currentIntake) || 0;
    const difference = (recommendedWater - currentIntake).toFixed(1);
    const glasses = Math.ceil(baseWater / 250);
    const bottles = (baseWater / 500).toFixed(1);

    // Horarios sugeridos
    const schedule = [
      { time: '06:30', label: 'Ao acordar', icon: Sun, amount: '250ml', tip: 'Agua com limao para hidratar apos a noite' },
      { time: '09:00', label: 'Manha', icon: Coffee, amount: '300ml', tip: 'Entre cafe e lanche' },
      { time: '11:30', label: 'Pre-almoco', icon: GlassWater, amount: '250ml', tip: '30 min antes do almoco' },
      { time: '14:00', label: 'Pos-almoco', icon: Droplets, amount: '300ml', tip: 'Ajuda na digestao' },
      { time: '16:00', label: 'Tarde', icon: Activity, amount: '300ml', tip: 'Combate o cansaco da tarde' },
      { time: '18:30', label: 'Pre-jantar', icon: GlassWater, amount: '250ml', tip: '30 min antes do jantar' },
      { time: '20:30', label: 'Noite', icon: Moon, amount: '200ml', tip: 'Hidratacao leve antes de dormir' }
    ];

    let diagnosis = '';
    let level = 'low';
    if (currentIntake <= 0) {
      diagnosis = `Sua necessidade diaria de agua e de ${recommendedWater}L (${recommendedMl}ml). Isso equivale a aproximadamente ${glasses} copos de 250ml.`;
      level = 'info';
    } else if (currentIntake < recommendedWater * 0.7) {
      diagnosis = `Voce esta bebendo ${currentIntake}L por dia, mas deveria beber ${recommendedWater}L. Isso esta significativamente abaixo do recomendado. Aumente gradualmente para evitar desidratacao.`;
      level = 'low';
    } else if (currentIntake < recommendedWater) {
      diagnosis = `Quase la! Voce bebe ${currentIntake}L, e o recomendado e ${recommendedWater}L. Faltam apenas ${difference}L a mais por dia.`;
      level = 'medium';
    } else {
      diagnosis = `Parabens! Voce esta bem hidratado(a), bebendo ${currentIntake}L por dia. O recomendado e ${recommendedWater}L. Continue assim!`;
      level = 'high';
    }

    setResult({ recommendedWater, recommendedMl, currentIntake, difference, diagnosis, level, glasses, bottles, schedule, weight });
  };

  // ==================== STEP 1: DADOS BASICOS ====================
  const renderStep1 = () => (
    <div className="space-y-6">
      {userType === 'patient' && (
        <div className={`p-4 rounded-xl ${dataLoaded ? 'bg-teal-50 border border-teal-200' : 'bg-blue-50 border border-blue-200'} flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dataLoaded ? 'bg-teal-100' : 'bg-blue-100'}`}>
            {loadingData ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> :
              dataLoaded ? <Sparkles className="w-5 h-5 text-teal-600" /> : <Info className="w-5 h-5 text-blue-600" />}
          </div>
          <div className="flex-1">
            {loadingData ? <p className="text-sm text-blue-700">Carregando seus dados...</p> :
              dataLoaded ? <p className="text-sm text-teal-700 font-medium">Peso carregado do seu perfil. Voce pode editar se necessario.</p> :
                <div>
                  <p className="text-sm text-blue-700">Preencha seu peso para calcular a hidratacao ideal.</p>
                  <button onClick={loadPatientData} className="text-xs text-blue-600 underline mt-1">Tentar carregar novamente</button>
                </div>}
          </div>
        </div>
      )}

      <div>
        <Label className="text-sm font-semibold text-gray-700">Seu peso (kg)</Label>
        <Input data-testid="water-weight-input" type="number" value={formData.weight}
          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
          placeholder="Ex: 70" className="mt-1 text-lg py-5" />
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-700">Nivel de atividade fisica</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {[
            { value: 'sedentario', label: 'Sedentario', desc: 'Pouco exercicio', icon: '🪑' },
            { value: 'leve', label: 'Leve', desc: '1-3 dias/semana', icon: '🚶' },
            { value: 'moderado', label: 'Moderado', desc: '3-5 dias/semana', icon: '🏃' },
            { value: 'intenso', label: 'Intenso', desc: '6-7 dias/semana', icon: '💪' }
          ].map(opt => (
            <button key={opt.value} data-testid={`activity-${opt.value}`}
              onClick={() => setFormData({ ...formData, activityLevel: opt.value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${formData.activityLevel === opt.value ? 'border-cyan-500 bg-cyan-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className="text-xl">{opt.icon}</span>
              <p className="text-sm font-semibold text-gray-900 mt-1">{opt.label}</p>
              <p className="text-xs text-gray-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <Button data-testid="water-next-btn" onClick={() => setStep(2)}
        className="w-full bg-cyan-600 hover:bg-cyan-700 py-5 text-base font-semibold" size="lg"
        disabled={!formData.weight || !formData.activityLevel}>
        Proximo <Droplets className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );

  // ==================== STEP 2: CLIMA E ROTINA ====================
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-semibold text-gray-700">Clima onde voce vive</Label>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { value: 'frio', label: 'Frio', icon: '❄️' },
            { value: 'temperado', label: 'Temperado', icon: '🌤️' },
            { value: 'quente', label: 'Quente', icon: '☀️' }
          ].map(opt => (
            <button key={opt.value} data-testid={`climate-${opt.value}`}
              onClick={() => setFormData({ ...formData, climate: opt.value })}
              className={`p-4 rounded-xl border-2 text-center transition-all ${formData.climate === opt.value ? 'border-cyan-500 bg-cyan-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className="text-2xl">{opt.icon}</span>
              <p className="text-sm font-semibold text-gray-900 mt-1">{opt.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-700">Quanta agua voce bebe atualmente? (litros/dia)</Label>
        <Input data-testid="water-current-input" type="number" step="0.1" value={formData.currentIntake}
          onChange={(e) => setFormData({ ...formData, currentIntake: e.target.value })}
          placeholder="Ex: 1.5" className="mt-1 text-lg py-5" />
        <p className="text-xs text-gray-400 mt-1">Deixe 0 se nao sabe</p>
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-700">Sua rotina</Label>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { value: 'escritorio', label: 'Escritorio', icon: '💻' },
            { value: 'ativa', label: 'Ativa', icon: '🏋️' },
            { value: 'variada', label: 'Variada', icon: '🔄' }
          ].map(opt => (
            <button key={opt.value} data-testid={`routine-${opt.value}`}
              onClick={() => setFormData({ ...formData, routine: opt.value })}
              className={`p-4 rounded-xl border-2 text-center transition-all ${formData.routine === opt.value ? 'border-cyan-500 bg-cyan-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className="text-2xl">{opt.icon}</span>
              <p className="text-sm font-semibold text-gray-900 mt-1">{opt.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => setStep(1)} variant="outline" className="flex-1 py-5 text-base" size="lg">Voltar</Button>
        <Button data-testid="water-calculate-btn" onClick={handleCalculate}
          className="flex-1 bg-cyan-600 hover:bg-cyan-700 py-5 text-base font-semibold" size="lg"
          disabled={!formData.climate || !formData.routine}>
          <Droplets className="mr-2 w-4 h-4" /> Calcular
        </Button>
      </div>
    </div>
  );

  // ==================== RESULTADO ====================
  const renderResult = () => {
    const levelColors = {
      high: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
      medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
      low: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
      info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' }
    };
    const c = levelColors[result.level] || levelColors.info;

    return (
      <div data-testid="water-result" className="space-y-6">
        {/* Hero Result */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-white text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-8 -translate-x-8" />
          <div className="relative z-10">
            <Droplets className="mx-auto w-12 h-12 mb-3 animate-bounce" style={{ animationDuration: '2s' }} />
            <p className="text-lg text-white/80 font-medium">Voce precisa beber</p>
            <p data-testid="water-recommended" className="text-6xl font-black mt-1">{result.recommendedWater}L</p>
            <p className="text-cyan-100 text-sm mt-1">{result.recommendedMl} ml por dia</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-cyan-100">
              <span>{result.glasses} copos (250ml)</span>
              <span className="w-1 h-1 bg-white/50 rounded-full" />
              <span>{result.bottles} garrafas (500ml)</span>
            </div>
          </div>
        </div>

        {/* Diagnostico */}
        <Card className={`${c.bg} ${c.border} border-2`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Diagnostico</CardTitle>
              <Badge className={c.badge}>
                {result.level === 'high' ? 'Otimo' : result.level === 'medium' ? 'Quase la' : result.level === 'low' ? 'Atencao' : 'Resultado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className={`${c.text} leading-relaxed text-sm`}>{result.diagnosis}</p>
          </CardContent>
        </Card>

        {/* Metricas rapidas */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center p-4">
            <p className="text-2xl font-bold text-cyan-600">{result.weight}kg</p>
            <p className="text-xs text-gray-500 mt-1">Seu peso</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-2xl font-bold text-blue-600">{result.glasses}</p>
            <p className="text-xs text-gray-500 mt-1">Copos/dia</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-2xl font-bold text-indigo-600">35ml</p>
            <p className="text-xs text-gray-500 mt-1">Por kg</p>
          </Card>
        </div>

        {/* Horarios sugeridos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Cronograma Sugerido</CardTitle>
            <CardDescription className="text-xs">Distribua sua agua ao longo do dia para melhor absorcao</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.schedule.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-cyan-50 transition-colors">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                      <Icon className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded">{item.time}</span>
                        <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{item.tip}</p>
                    </div>
                    <span className="text-sm font-bold text-cyan-600 flex-shrink-0">{item.amount}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 p-3 bg-cyan-50 rounded-xl text-center">
              <p className="text-xs text-cyan-700">
                Total sugerido: <strong>1.850ml</strong> distribuidos + restante durante atividades e refeicoes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dicas */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dicas de Hidratacao</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><span className="text-cyan-500 mt-0.5">&#8226;</span> Beba um copo de agua ao acordar para reidratar o corpo</li>
              <li className="flex items-start gap-2"><span className="text-cyan-500 mt-0.5">&#8226;</span> Tenha sempre uma garrafa por perto como lembrete visual</li>
              <li className="flex items-start gap-2"><span className="text-cyan-500 mt-0.5">&#8226;</span> Evite beber muita agua durante as refeicoes</li>
              <li className="flex items-start gap-2"><span className="text-cyan-500 mt-0.5">&#8226;</span> Frutas como melancia e laranja ajudam na hidratacao</li>
              <li className="flex items-start gap-2"><span className="text-cyan-500 mt-0.5">&#8226;</span> Urina clara = boa hidratacao. Urina escura = beba mais agua</li>
            </ul>
          </CardContent>
        </Card>

        <Button data-testid="water-recalculate-btn" onClick={() => { setStep(1); setResult(null); }} variant="outline" className="w-full py-5" size="lg">
          <RefreshCw className="mr-2 w-4 h-4" /> Fazer Novo Calculo
        </Button>

        {userType === 'visitor' && (
          <ProjectCTA category="normal" userData={{ water: result.recommendedWater }} source="water-calculator" />
        )}
      </div>
    );
  };

  return (
    <Layout title="Calculadora de Agua" showBack userType={userType}>
      <div data-testid="water-calculator" className="max-w-2xl mx-auto pb-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl mb-6">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-5 text-white">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Calculadora de Agua</h1>
                <p className="text-cyan-100 text-sm">Descubra a quantidade ideal de agua para o seu corpo</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-600" />
              {!result ? 'Calcule sua Hidratacao Ideal' : 'Seu Resultado Personalizado'}
            </CardTitle>
            <CardDescription>{!result ? `Etapa ${step} de 2` : `Baseado no peso de ${result.weight}kg`}</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && step === 1 && renderStep1()}
            {!result && step === 2 && renderStep2()}
            {result && renderResult()}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default WaterCalculator;
