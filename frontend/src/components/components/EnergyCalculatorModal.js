import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, Activity, Zap, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Modal de Cálculo Energético
 * Fórmulas: Harris-Benedict, Mifflin-St Jeor
 * Dados: Anamnese/Avaliação Física ou Manual
 * 
 * Props:
 *   patient          - dados do perfil do paciente (profiles)
 *   anamnesis        - dados da anamnese
 *   physicalAssessment - dados da avaliação física
 */
const EnergyCalculatorModal = ({ 
  open, 
  onClose, 
  patient,
  anamnesis, 
  physicalAssessment,
  onApplyCalories
}) => {
  const [formula, setFormula] = useState('mifflin'); // 'harris' ou 'mifflin'
  const [autoLoaded, setAutoLoaded] = useState(false); // indica se dados foram carregados automaticamente
  
  // Dados do paciente
  const [data, setData] = useState({
    age: '',
    weight: '',
    height: '',
    gender: 'female',
    activityLevel: '1.375', // Leve
    goal: '',
    goalWeight: ''
  });

  // Resultados
  const [results, setResults] = useState(null);
  
  // Distribuição de macros (%)
  const [macros, setMacros] = useState({
    protein: 25,
    carbs: 50,
    fat: 25
  });

  // Resetar ao fechar
  useEffect(() => {
    if (!open) {
      setResults(null);
      setAutoLoaded(false);
    }
  }, [open]);

  /**
   * Carrega dados do paciente de múltiplas fontes (prioridade):
   * 1. Avaliação Física (mais recente)
   * 2. Anamnese
   * 3. Perfil do paciente (profiles)
   */
  const loadPatientData = useCallback(() => {
    const pa = physicalAssessment || {};
    const an = anamnesis || {};
    const pt = patient || {};

    // Idade: avaliação > anamnese > calcular da data de nascimento
    let age = pa.idade || an.idade || an.age || '';
    if (!age && (pt.birth_date || an.data_nascimento)) {
      const birthDate = pt.birth_date || an.data_nascimento;
      const today = new Date();
      const birth = new Date(birthDate);
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    }

    // Peso: avaliação física > perfil > anamnese
    const weight = pa.weight || pa.peso_atual || pt.current_weight || an.peso || an.current_weight || an.weight || '';

    // Altura: avaliação > perfil > anamnese
    const height = pa.height || pa.altura || pt.height || an.altura || an.height || '';

    // Sexo: anamnese > perfil
    const sexRaw = an.sexo || an.gender || pt.gender || '';
    const gender = sexRaw.toLowerCase?.().includes('masculino') || sexRaw.toLowerCase?.() === 'male' ? 'male' : 'female';

    // Nível de atividade: anamnese
    let activityLevel = '1.375'; // Padrão: leve
    const activity = (an.nivel_atividade_fisica || an.activity_level || '').toLowerCase();
    if (activity.includes('sedentário') || activity.includes('sedentario')) activityLevel = '1.2';
    else if (activity.includes('leve') || activity.includes('light')) activityLevel = '1.375';
    else if (activity.includes('moderado') || activity.includes('moderate')) activityLevel = '1.55';
    else if (activity.includes('intenso') || activity.includes('pesado') || activity.includes('heavy')) activityLevel = '1.725';
    else if (activity.includes('muito intenso') || activity.includes('atleta')) activityLevel = '1.9';

    // Objetivo e peso meta
    const goal = an.objetivo || pt.goal || '';
    const goalWeight = an.peso_meta || pt.goal_weight || '';

    const newData = { age: age || '', weight: weight || '', height: height || '', gender, activityLevel, goal, goalWeight };
    setData(newData);

    // Verificar se algum dado foi carregado
    const hasData = newData.age || newData.weight || newData.height;
    setAutoLoaded(!!hasData);

    if (hasData) {
      const loaded = [];
      if (newData.age) loaded.push('Idade');
      if (newData.weight) loaded.push('Peso');
      if (newData.height) loaded.push('Altura');
      toast.success(`📊 Dados carregados: ${loaded.join(', ')}`);
    } else {
      toast.info('Nenhum dado encontrado. Preencha manualmente.');
    }
  }, [patient, anamnesis, physicalAssessment]);

  const calculateBMR = () => {
    const { age, weight, height, gender } = data;
    
    // Validar campos
    const missingFields = [];
    if (!age || age === '') missingFields.push('Idade');
    if (!weight || weight === '') missingFields.push('Peso');
    if (!height || height === '') missingFields.push('Altura');
    
    if (missingFields.length > 0) {
      toast.error(`Preencha: ${missingFields.join(', ')}`);
      return null;
    }

    const ageNum = parseFloat(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    let bmr = 0;

    if (formula === 'harris') {
      // Harris-Benedict
      if (gender === 'male') {
        bmr = 88.362 + (13.397 * weightNum) + (4.799 * heightNum) - (5.677 * ageNum);
      } else {
        bmr = 447.593 + (9.247 * weightNum) + (3.098 * heightNum) - (4.330 * ageNum);
      }
    } else {
      // Mifflin-St Jeor (mais moderno)
      if (gender === 'male') {
        bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) + 5;
      } else {
        bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) - 161;
      }
    }

    return bmr;
  };

  const calculateTDEE = () => {
    const bmr = calculateBMR();
    if (!bmr) return;

    const activityMultiplier = parseFloat(data.activityLevel);
    const tdee = bmr * activityMultiplier;

    // Calcular macros em gramas
    const proteinCal = (tdee * macros.protein) / 100;
    const carbsCal = (tdee * macros.carbs) / 100;
    const fatCal = (tdee * macros.fat) / 100;

    const proteinGrams = Math.round(proteinCal / 4);
    const carbsGrams = Math.round(carbsCal / 4);
    const fatGrams = Math.round(fatCal / 9);

    setResults({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      weight: parseFloat(data.weight) || 70,
      formula: formula,
      macros: {
        protein: { percent: macros.protein, grams: proteinGrams, calories: Math.round(proteinCal) },
        carbs: { percent: macros.carbs, grams: carbsGrams, calories: Math.round(carbsCal) },
        fat: { percent: macros.fat, grams: fatGrams, calories: Math.round(fatCal) }
      }
    });
  };

  const activityLevels = [
    { value: '1.2', label: 'Sedentário', desc: 'Pouco ou nenhum exercício' },
    { value: '1.375', label: 'Leve', desc: '1-3 dias/semana' },
    { value: '1.55', label: 'Moderado', desc: '3-5 dias/semana' },
    { value: '1.725', label: 'Intenso', desc: '6-7 dias/semana' },
    { value: '1.9', label: 'Muito Intenso', desc: 'Atleta, 2x/dia' }
  ];

  // Campo helper para onChange seguro com type="number"
  const handleFieldChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <Calculator size={20} />
            </div>
            Cálculo Energético
          </DialogTitle>
        </DialogHeader>

        {/* ===== BOTÃO CARREGAR DADOS AUTOMÁTICOS ===== */}
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Dados do Paciente</p>
                <p className="text-xs text-blue-600">
                  Puxa automaticamente da Anamnese, Avaliação Física e Perfil
                </p>
              </div>
            </div>
            <Button
              onClick={loadPatientData}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-md"
              size="sm"
            >
              <Download size={14} className="mr-2" />
              Carregar Dados
            </Button>
          </div>
          {autoLoaded && (
            <div className="flex items-center gap-2 mt-3 text-xs text-green-700 bg-green-50 rounded-lg p-2 border border-green-200">
              <CheckCircle2 size={14} className="text-green-600" />
              Dados carregados automaticamente. Você pode editar qualquer campo abaixo.
            </div>
          )}
          {data.goal && (
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">
                Objetivo: {data.goal}
              </Badge>
              {data.goalWeight && (
                <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                  Meta: {data.goalWeight} kg
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ===== FORMULÁRIO - SEMPRE EDITÁVEL ===== */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="text-xs flex items-center gap-1">
              Idade (anos) *
              {autoLoaded && data.age && <CheckCircle2 size={12} className="text-green-500" />}
            </Label>
            <Input
              type="number"
              value={data.age}
              onChange={(e) => handleFieldChange('age', e.target.value)}
              placeholder="Ex: 30"
              className={`h-9 text-sm ${autoLoaded && data.age ? 'border-green-300 bg-green-50/50' : ''} ${!data.age ? 'border-red-300' : ''}`}
            />
            {!data.age && <p className="text-[10px] text-red-500 mt-1">Campo obrigatório</p>}
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              Peso atual (kg) *
              {autoLoaded && data.weight && <CheckCircle2 size={12} className="text-green-500" />}
            </Label>
            <Input
              type="number"
              value={data.weight}
              onChange={(e) => handleFieldChange('weight', e.target.value)}
              placeholder="Ex: 70"
              className={`h-9 text-sm ${autoLoaded && data.weight ? 'border-green-300 bg-green-50/50' : ''} ${!data.weight ? 'border-red-300' : ''}`}
            />
            {!data.weight && <p className="text-[10px] text-red-500 mt-1">Campo obrigatório</p>}
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              Altura (cm) *
              {autoLoaded && data.height && <CheckCircle2 size={12} className="text-green-500" />}
            </Label>
            <Input
              type="number"
              value={data.height}
              onChange={(e) => handleFieldChange('height', e.target.value)}
              placeholder="Ex: 165"
              className={`h-9 text-sm ${autoLoaded && data.height ? 'border-green-300 bg-green-50/50' : ''} ${!data.height ? 'border-red-300' : ''}`}
            />
            {!data.height && <p className="text-[10px] text-red-500 mt-1">Campo obrigatório</p>}
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              Sexo
              {autoLoaded && <CheckCircle2 size={12} className="text-green-500" />}
            </Label>
            <select
              value={data.gender}
              onChange={(e) => handleFieldChange('gender', e.target.value)}
              className="w-full h-9 text-sm border rounded-md px-3"
            >
              <option value="female">Feminino</option>
              <option value="male">Masculino</option>
            </select>
          </div>
        </div>

        {/* Nível de Atividade */}
        <div className="mt-4">
          <Label className="text-xs mb-2 block">Nível de Atividade Física</Label>
          <div className="grid grid-cols-3 gap-2">
            {activityLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => setData({...data, activityLevel: level.value})}
                className={`p-3 rounded-lg border text-left transition-all ${
                  data.activityLevel === level.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <p className="text-xs font-semibold text-gray-900">{level.label}</p>
                <p className="text-[10px] text-gray-500">{level.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Fórmula */}
        <div className="mt-4 flex items-center gap-3">
          <Label className="text-xs">Fórmula:</Label>
          <div className="flex gap-2">
            <Badge
              className={`cursor-pointer ${formula === 'mifflin' ? 'bg-emerald-600' : 'bg-gray-300'}`}
              onClick={() => setFormula('mifflin')}
            >
              Mifflin-St Jeor (2023)
            </Badge>
            <Badge
              className={`cursor-pointer ${formula === 'harris' ? 'bg-emerald-600' : 'bg-gray-300'}`}
              onClick={() => setFormula('harris')}
            >
              Harris-Benedict
            </Badge>
          </div>
        </div>

        {/* Distribuição de Macros */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <Label className="text-xs mb-3 block">Distribuição de Macronutrientes (%)</Label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-[10px] text-gray-600">Proteínas</Label>
              <Input
                type="number"
                value={macros.protein}
                onChange={(e) => setMacros({...macros, protein: parseFloat(e.target.value) || 0})}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-[10px] text-gray-600">Carboidratos</Label>
              <Input
                type="number"
                value={macros.carbs}
                onChange={(e) => setMacros({...macros, carbs: parseFloat(e.target.value) || 0})}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-[10px] text-gray-600">Gorduras</Label>
              <Input
                type="number"
                value={macros.fat}
                onChange={(e) => setMacros({...macros, fat: parseFloat(e.target.value) || 0})}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            Total: {macros.protein + macros.carbs + macros.fat}% 
            {macros.protein + macros.carbs + macros.fat !== 100 && (
              <span className="text-red-600 ml-2">⚠️ Deve totalizar 100%</span>
            )}
          </p>
        </div>

        {/* Botão Calcular */}
        <Button
          onClick={calculateTDEE}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white mt-4"
        >
          <Calculator size={16} className="mr-2" />
          Calcular
        </Button>

        {/* Resultados */}
        {results && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 mb-1">Taxa Metabólica Basal (TMB)</p>
                <p className="text-2xl font-bold text-blue-900">{results.bmr} <span className="text-sm">kcal/dia</span></p>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-700 mb-1">Gasto Energético Total (GET)</p>
                <p className="text-2xl font-bold text-emerald-900">{results.tdee} <span className="text-sm">kcal/dia</span></p>
              </div>
            </div>

            {/* Gráfico de Pizza (visual simplificado) */}
            <div className="p-4 bg-white border rounded-lg">
              <p className="text-sm font-semibold mb-3">📊 Distribuição de Macronutrientes</p>
              <div className="flex h-8 rounded-full overflow-hidden">
                <div
                  className="bg-red-400 flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${macros.protein}%` }}
                >
                  {macros.protein > 15 && `${macros.protein}%`}
                </div>
                <div
                  className="bg-blue-400 flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${macros.carbs}%` }}
                >
                  {macros.carbs > 15 && `${macros.carbs}%`}
                </div>
                <div
                  className="bg-yellow-400 flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${macros.fat}%` }}
                >
                  {macros.fat > 15 && `${macros.fat}%`}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <p className="text-xs font-semibold">Proteínas</p>
                  </div>
                  <p className="text-sm font-bold">{results.macros.protein.grams}g</p>
                  <p className="text-[10px] text-gray-500">{results.macros.protein.calories} kcal</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <p className="text-xs font-semibold">Carboidratos</p>
                  </div>
                  <p className="text-sm font-bold">{results.macros.carbs.grams}g</p>
                  <p className="text-[10px] text-gray-500">{results.macros.carbs.calories} kcal</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <p className="text-xs font-semibold">Gorduras</p>
                  </div>
                  <p className="text-sm font-bold">{results.macros.fat.grams}g</p>
                  <p className="text-[10px] text-gray-500">{results.macros.fat.calories} kcal</p>
                </div>
              </div>
            </div>

            {/* Aplicar ao Plano */}
            {onApplyCalories && (
              <Button
                onClick={() => {
                  onApplyCalories(results);
                  toast.success('✅ Valores aplicados ao plano!');
                  onClose();
                }}
                variant="outline"
                className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <TrendingUp size={16} className="mr-2" />
                Aplicar ao Plano
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnergyCalculatorModal;
