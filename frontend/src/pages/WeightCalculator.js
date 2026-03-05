import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import ProjectCTA from '@/components/ProjectCTA';

// Função para determinar categoria baseada no IMC
const getIMCCategory = (imc) => {
  if (imc < 18.5) return 'magreza';
  if (imc < 25) return 'normal';
  if (imc < 30) return 'sobrepeso';
  return 'obesidade';
};

const WeightCalculator = ({ userType = 'visitor' }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    age: '',
    gender: '',
    bodyPerception: '',
    goal: '',
    activityLevel: ''
  });
  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);
    const age = parseFloat(formData.age);
    const heightInMeters = height / 100;
    const imc = weight / (heightInMeters * heightInMeters);
    
    // Cálculo do peso ideal
    let idealWeight;
    if (formData.gender === 'masculino') {
      idealWeight = (height - 100) * 0.9;
    } else {
      idealWeight = (height - 100) * 0.85;
    }

    // Cálculo TMB (Taxa Metabólica Basal) - Fórmula de Harris-Benedict
    let tmb;
    if (formData.gender === 'masculino') {
      tmb = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      tmb = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }

    // Fator de atividade física para GET (Gasto Energético Total)
    const activityFactors = {
      'sedentario': 1.2,
      'leve': 1.375,
      'moderado': 1.55,
      'intenso': 1.725,
      'muito_intenso': 1.9
    };

    const activityFactor = activityFactors[formData.activityLevel] || 1.2;
    const get = tmb * activityFactor;

    // Recomendações calóricas baseadas no objetivo
    let caloriesRecommendation = {};
    if (formData.goal === 'perder') {
      caloriesRecommendation = {
        type: 'Emagrecimento',
        calories: Math.round(get - 500), // Déficit de 500 kcal
        message: 'Para perder peso de forma saudável (0,5-1kg/semana)',
        tip: 'Déficit calórico moderado + treino = resultados sustentáveis'
      };
    } else if (formData.goal === 'manter') {
      caloriesRecommendation = {
        type: 'Manutenção',
        calories: Math.round(get),
        message: 'Para manter seu peso atual',
        tip: 'Equilíbrio entre calorias consumidas e gastas'
      };
    } else if (formData.goal === 'ganhar') {
      caloriesRecommendation = {
        type: 'Ganho de Massa Muscular',
        calories: Math.round(get + 300), // Superávit de 300 kcal
        message: 'Para ganhar massa muscular de qualidade',
        tip: 'Superávit calórico + treino de força + proteínas adequadas'
      };
    }

    // Diagnóstico baseado no IMC
    let diagnosis = '';
    let category = getIMCCategory(imc);
    
    if (imc < 18.5) {
      diagnosis = 'Você está abaixo do peso ideal. Recomendamos uma dieta balanceada para ganho de massa muscular.';
    } else if (imc < 25) {
      diagnosis = 'Parabéns! Você está no peso ideal. Continue mantendo hábitos saudáveis.';
    } else if (imc < 30) {
      diagnosis = 'Você está com sobrepeso. Um plano alimentar adequado pode ajudá-lo a atingir seu peso ideal.';
    } else {
      diagnosis = 'Você está em obesidade. É importante buscar acompanhamento profissional para um plano personalizado.';
    }

    setResult({
      idealWeight: idealWeight.toFixed(1),
      currentWeight: weight,
      imc: imc.toFixed(1),
      difference: (weight - idealWeight).toFixed(1),
      diagnosis,
      category,
      tmb: Math.round(tmb),
      get: Math.round(get),
      caloriesRecommendation
    });
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Altura (cm)</Label>
          <Input
            type="number"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            placeholder="170"
          />
        </div>
        <div>
          <Label>Peso Atual (kg)</Label>
          <Input
            type="number"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            placeholder="70"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Idade</Label>
          <Input
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder="30"
          />
        </div>
        <div>
          <Label>Sexo</Label>
          <RadioGroup value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="masculino" id="masculino" />
              <Label htmlFor="masculino">Masculino</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="feminino" id="feminino" />
              <Label htmlFor="feminino">Feminino</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      <Button
        onClick={() => setStep(2)}
        className="w-full bg-teal-700 hover:bg-teal-800"
        size="lg"
        disabled={!formData.height || !formData.weight || !formData.age || !formData.gender}
      >
        Próximo
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label>Como você se considera?</Label>
        <RadioGroup value={formData.bodyPerception} onValueChange={(v) => setFormData({ ...formData, bodyPerception: v })}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="magro" id="magro" />
            <Label htmlFor="magro">Magro(a)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="normal" id="normal" />
            <Label htmlFor="normal">Peso normal</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="acima" id="acima" />
            <Label htmlFor="acima">Acima do peso</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Qual é seu objetivo?</Label>
        <RadioGroup value={formData.goal} onValueChange={(v) => setFormData({ ...formData, goal: v })}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="perder" id="perder" />
            <Label htmlFor="perder">Perder peso</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="manter" id="manter" />
            <Label htmlFor="manter">Manter peso</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ganhar" id="ganhar" />
            <Label htmlFor="ganhar">Ganhar massa muscular</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Nível de atividade física</Label>
        <RadioGroup value={formData.activityLevel} onValueChange={(v) => setFormData({ ...formData, activityLevel: v })}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sedentario" id="sedentario" />
            <Label htmlFor="sedentario">Sedentário</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="leve" id="leve" />
            <Label htmlFor="leve">Atividade leve (1-3x/semana)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="moderado" id="moderado" />
            <Label htmlFor="moderado">Atividade moderada (3-5x/semana)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="intenso" id="intenso" />
            <Label htmlFor="intenso">Atividade intensa (5-7x/semana)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => setStep(1)} variant="outline" className="flex-1" size="lg">
          Voltar
        </Button>
        <Button
          onClick={handleCalculate}
          className="flex-1 bg-teal-700 hover:bg-teal-800"
          size="lg"
          disabled={!formData.bodyPerception || !formData.goal || !formData.activityLevel}
        >
          Calcular
        </Button>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="space-y-6">
      {/* Peso de Referência */}
      <div>
        <h3 className="text-base font-semibold mb-3 text-gray-700">Análise de Peso</h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-gray-600 mb-1">Peso Ideal</p>
              <p className="text-2xl font-bold text-teal-700">{result.idealWeight} kg</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-gray-600 mb-1">IMC</p>
              <p className="text-2xl font-bold text-blue-700">{result.imc}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-gray-600 mb-1">Diferença</p>
              <p className="text-2xl font-bold text-purple-700">
                {result.difference > 0 ? '+' : ''}{result.difference} kg
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TMB e GET */}
      <div>
        <h3 className="text-base font-semibold mb-3 text-gray-700">Gasto Energético</h3>
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-600 mb-1">TMB (Basal)</p>
              <p className="text-2xl font-bold text-orange-700 mb-1">{result.tmb} kcal</p>
              <p className="text-xs text-gray-500">Em repouso</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-600 mb-1">GET (Total)</p>
              <p className="text-2xl font-bold text-green-700 mb-1">{result.get} kcal</p>
              <p className="text-xs text-gray-500">Com atividades</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recomendação Calórica */}
      <Card className="bg-gradient-to-br from-teal-600 to-blue-600 text-white">
        <CardContent className="pt-6 text-center">
          <p className="text-sm opacity-90 mb-2">Para {result.caloriesRecommendation.type}</p>
          <p className="text-5xl font-bold mb-1">{result.caloriesRecommendation.calories}</p>
          <p className="text-xl font-semibold mb-3">calorias/dia</p>
          <p className="text-sm mb-3 opacity-90">{result.caloriesRecommendation.message}</p>
          <div className="bg-white/20 rounded-lg p-3 text-sm">
            💡 {result.caloriesRecommendation.tip}
          </div>
        </CardContent>
      </Card>

      {/* Diagnóstico */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">{result.diagnosis}</p>
      </div>

      <Button onClick={() => { setStep(1); setResult(null); }} variant="outline" className="w-full" size="lg">
        Fazer Novo Cálculo
      </Button>

      {/* CTA para Projeto Biquíni Branco */}
      {userType === 'visitor' && (
        <ProjectCTA 
          category={result.category} 
          userData={{ weight: result.currentWeight, imc: result.imc, goal: result.caloriesRecommendation.type }}
          source="weight-calculator"
        />
      )}
    </div>
  );

  return (
    <Layout title="Calculadora de Peso" showBack userType={userType}>
      <div data-testid="weight-calculator" className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Calcule seu Peso de Referência</CardTitle>
            <CardDescription>
              {!result ? `Passo ${step} de 2` : 'Seu resultado'}
            </CardDescription>
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

export default WeightCalculator;