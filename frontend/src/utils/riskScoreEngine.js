/**
 * FitJourney Intelligence Layer - Risk Score Engine
 * Motor de cálculo de riscos multimodal para pacientes
 * 
 * FASE 1: Risk Score Expandido
 * - Risco Cardiovascular
 * - Risco Metabólico
 * - Risco Musculoesquelético
 * - Risco Nutricional
 */

// ==================== CONSTANTES ====================

const RISK_LEVELS = {
  LOW: { label: 'Baixo', color: 'green', value: 'low', minScore: 80 },
  MODERATE: { label: 'Moderado', color: 'yellow', value: 'moderate', minScore: 60 },
  HIGH: { label: 'Alto', color: 'orange', value: 'high', minScore: 40 },
  CRITICAL: { label: 'Crítico', color: 'red', value: 'critical', minScore: 0 }
};

const RISK_WEIGHTS = {
  cardiovascular: 0.30,  // 30% do score total
  metabolic: 0.25,       // 25% do score total
  musculoskeletal: 0.20, // 20% do score total
  nutritional: 0.25      // 25% do score total
};

// ==================== SCORE CALCULATORS ====================

/**
 * Calcula Risco Cardiovascular
 * Fatores: IMC, pressão arterial, circunferência abdominal, colesterol, idade
 */
export const calculateCardiovascularRisk = (data = {}) => {
  const { anamnesis: _anamnesis, assessment: _assessment, patient: _patient } = data;
  const anamnesis = _anamnesis || {};
  const assessment = _assessment || {};
  const patient = _patient || {};
  
  let score = 100;
  const factors = [];
  const recommendations = [];

  // 1. IMC (até -25 pontos)
  const weight = parseFloat(assessment.weight || anamnesis.current_weight);
  const height = parseFloat(assessment.height || anamnesis.height);
  
  if (weight && height) {
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    
    if (bmi >= 35) {
      score -= 25;
      factors.push({ factor: 'IMC', value: bmi.toFixed(1), impact: 'critical', description: 'Obesidade grau II ou superior' });
      recommendations.push({ action: 'Programa intensivo de perda de peso com acompanhamento médico', priority: 'critical' });
    } else if (bmi >= 30) {
      score -= 18;
      factors.push({ factor: 'IMC', value: bmi.toFixed(1), impact: 'high', description: 'Obesidade grau I' });
      recommendations.push({ action: 'Plano nutricional focado em deficit calórico saudável', priority: 'high' });
    } else if (bmi >= 25) {
      score -= 10;
      factors.push({ factor: 'IMC', value: bmi.toFixed(1), impact: 'moderate', description: 'Sobrepeso' });
      recommendations.push({ action: 'Ajustes na alimentação e aumento de atividade física', priority: 'medium' });
    } else if (bmi >= 18.5) {
      factors.push({ factor: 'IMC', value: bmi.toFixed(1), impact: 'low', description: 'Peso adequado' });
    } else {
      score -= 8;
      factors.push({ factor: 'IMC', value: bmi.toFixed(1), impact: 'moderate', description: 'Abaixo do peso' });
      recommendations.push({ action: 'Plano para ganho de peso saudável', priority: 'medium' });
    }
  }

  // 2. Pressão Arterial (até -25 pontos)
  const systolic = parseInt(assessment.blood_pressure_systolic);
  const diastolic = parseInt(assessment.blood_pressure_diastolic);
  
  if (systolic && diastolic) {
    if (systolic >= 180 || diastolic >= 120) {
      score -= 25;
      factors.push({ factor: 'Pressão Arterial', value: `${systolic}/${diastolic}`, impact: 'critical', description: 'Crise hipertensiva' });
      recommendations.push({ action: 'Avaliação médica urgente necessária', priority: 'critical' });
    } else if (systolic >= 140 || diastolic >= 90) {
      score -= 18;
      factors.push({ factor: 'Pressão Arterial', value: `${systolic}/${diastolic}`, impact: 'high', description: 'Hipertensão' });
      recommendations.push({ action: 'Reduzir sódio, aumentar potássio e magnésio na dieta', priority: 'high' });
    } else if (systolic >= 130 || diastolic >= 80) {
      score -= 10;
      factors.push({ factor: 'Pressão Arterial', value: `${systolic}/${diastolic}`, impact: 'moderate', description: 'Pré-hipertensão' });
      recommendations.push({ action: 'Monitorar e ajustar estilo de vida', priority: 'medium' });
    } else {
      factors.push({ factor: 'Pressão Arterial', value: `${systolic}/${diastolic}`, impact: 'low', description: 'Normal' });
    }
  }

  // 3. Circunferência Abdominal (até -20 pontos)
  const waist = parseFloat(assessment.waist_circumference);
  const isMale = patient.gender === 'male' || patient.sex === 'male';
  
  if (waist) {
    const highRisk = (isMale && waist > 102) || (!isMale && waist > 88);
    const moderateRisk = (isMale && waist > 94) || (!isMale && waist > 80);
    
    if (highRisk) {
      score -= 20;
      factors.push({ factor: 'Circ. Abdominal', value: `${waist}cm`, impact: 'high', description: 'Gordura visceral elevada' });
      recommendations.push({ action: 'Foco em exercícios aeróbicos e redução de carboidratos refinados', priority: 'high' });
    } else if (moderateRisk) {
      score -= 10;
      factors.push({ factor: 'Circ. Abdominal', value: `${waist}cm`, impact: 'moderate', description: 'Atenção à gordura visceral' });
      recommendations.push({ action: 'Incluir mais fibras e atividade física regular', priority: 'medium' });
    } else {
      factors.push({ factor: 'Circ. Abdominal', value: `${waist}cm`, impact: 'low', description: 'Normal' });
    }
  }

  // 4. Histórico de Colesterol (até -15 pontos)
  const conditions = anamnesis.medical_conditions || [];
  if (conditions.includes('colesterol') || conditions.includes('Colesterol Alto') || conditions.includes('dislipidemia')) {
    score -= 15;
    factors.push({ factor: 'Colesterol', value: 'Histórico', impact: 'high', description: 'Colesterol alto relatado' });
    recommendations.push({ action: 'Aumentar fibras solúveis (aveia, frutas), reduzir gorduras saturadas', priority: 'high' });
  }

  // 5. Hipertensão relatada (até -10 pontos)
  if (conditions.includes('hipertensao') || conditions.includes('Hipertensão') || conditions.includes('pressao_alta')) {
    score -= 10;
    factors.push({ factor: 'Hipertensão', value: 'Histórico', impact: 'high', description: 'Hipertensão relatada' });
  }

  // 6. Frequência Cardíaca de Repouso (até -10 pontos)
  const heartRate = parseInt(assessment.heart_rate);
  if (heartRate) {
    if (heartRate > 100) {
      score -= 10;
      factors.push({ factor: 'FC Repouso', value: `${heartRate}bpm`, impact: 'high', description: 'Taquicardia' });
      recommendations.push({ action: 'Avaliação cardiológica e técnicas de relaxamento', priority: 'high' });
    } else if (heartRate > 85) {
      score -= 5;
      factors.push({ factor: 'FC Repouso', value: `${heartRate}bpm`, impact: 'moderate', description: 'Elevada' });
      recommendations.push({ action: 'Exercícios aeróbicos regulares para melhorar condicionamento', priority: 'medium' });
    } else {
      factors.push({ factor: 'FC Repouso', value: `${heartRate}bpm`, impact: 'low', description: 'Normal' });
    }
  }

  // 7. Idade como fator de risco (+5 pontos se < 40)
  const age = patient.age || calculateAge(patient.birth_date);
  if (age) {
    if (age >= 60) {
      score -= 5;
      factors.push({ factor: 'Idade', value: `${age} anos`, impact: 'moderate', description: 'Fator de risco pela idade' });
    } else if (age < 40) {
      score += 5; // Bônus
      factors.push({ factor: 'Idade', value: `${age} anos`, impact: 'low', description: 'Fator protetor' });
    }
  }

  // 8. Tabagismo (até -15 pontos)
  if (anamnesis.smoking === 'yes' || anamnesis.smoking === true) {
    score -= 15;
    factors.push({ factor: 'Tabagismo', value: 'Sim', impact: 'critical', description: 'Fumante ativo' });
    recommendations.push({ action: 'Programa de cessação do tabagismo é prioridade', priority: 'critical' });
  }

  return {
    category: 'cardiovascular',
    label: 'Cardiovascular',
    icon: '❤️',
    score: Math.max(0, Math.min(100, score)),
    level: getRiskLevel(score),
    factors,
    recommendations: recommendations.slice(0, 3)
  };
};

/**
 * Calcula Risco Metabólico
 * Fatores: diabetes, resistência à insulina, tireoide, síndrome metabólica
 */
export const calculateMetabolicRisk = (data = {}) => {
  const { anamnesis = {}, assessment = {}, patient = {} } = data;
  
  let score = 100;
  const factors = [];
  const recommendations = [];

  const conditions = anamnesis.medical_conditions || [];

  // 1. Diabetes (até -30 pontos)
  if (conditions.includes('diabetes') || conditions.includes('Diabetes')) {
    score -= 30;
    factors.push({ factor: 'Diabetes', value: 'Sim', impact: 'critical', description: 'Diabetes diagnosticada' });
    recommendations.push({ action: 'Plano de baixo índice glicêmico, monitorar carboidratos', priority: 'critical' });
  }

  // 2. Pré-diabetes / Resistência à insulina (até -15 pontos)
  if (conditions.includes('pre_diabetes') || conditions.includes('resistencia_insulina') || 
      anamnesis.fasting_glucose > 100) {
    score -= 15;
    factors.push({ factor: 'Pré-diabetes', value: 'Risco', impact: 'high', description: 'Resistência à insulina' });
    recommendations.push({ action: 'Reduzir carboidratos simples, aumentar fibras e proteínas', priority: 'high' });
  }

  // 3. Tireoide (até -10 pontos)
  if (conditions.includes('tireoide') || conditions.includes('hipotireoidismo') || 
      conditions.includes('Hipotireoidismo') || conditions.includes('hipertireoidismo')) {
    score -= 10;
    factors.push({ factor: 'Tireoide', value: 'Alterada', impact: 'moderate', description: 'Disfunção tireoidiana' });
    recommendations.push({ action: 'Incluir selênio, zinco e iodo adequados na dieta', priority: 'medium' });
  }

  // 4. IMC elevado impacta metabolismo (até -15 pontos)
  const weight = parseFloat(assessment.weight || anamnesis.current_weight);
  const height = parseFloat(assessment.height || anamnesis.height);
  
  if (weight && height) {
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    
    if (bmi >= 30) {
      score -= 15;
      factors.push({ factor: 'Obesidade', value: `IMC ${bmi.toFixed(1)}`, impact: 'high', description: 'Impacto metabólico' });
    } else if (bmi >= 25) {
      score -= 8;
      factors.push({ factor: 'Sobrepeso', value: `IMC ${bmi.toFixed(1)}`, impact: 'moderate', description: 'Atenção metabólica' });
    }
  }

  // 5. Circunferência abdominal - síndrome metabólica (até -15 pontos)
  const waist = parseFloat(assessment.waist_circumference);
  const isMale = patient.gender === 'male' || patient.sex === 'male';
  
  if (waist) {
    const highRisk = (isMale && waist > 102) || (!isMale && waist > 88);
    if (highRisk) {
      score -= 15;
      factors.push({ factor: 'Sínd. Metabólica', value: 'Risco', impact: 'high', description: 'Gordura visceral associada' });
      recommendations.push({ action: 'Protocolo anti-inflamatório e redução de açúcares', priority: 'high' });
    }
  }

  // 6. Estresse elevado afeta metabolismo (até -10 pontos)
  const stress = anamnesis.stress_level;
  if (stress === 'high' || stress === 'very_high' || stress === 'alto' || stress === 'muito_alto') {
    score -= 10;
    factors.push({ factor: 'Estresse', value: 'Alto', impact: 'moderate', description: 'Cortisol pode impactar metabolismo' });
    recommendations.push({ action: 'Alimentos ricos em magnésio e técnicas de relaxamento', priority: 'medium' });
  }

  // 7. Sono inadequado afeta metabolismo (até -10 pontos)
  const sleepHours = parseInt(anamnesis.sleep_hours) || 0;
  if (sleepHours > 0 && sleepHours < 6) {
    score -= 10;
    factors.push({ factor: 'Sono', value: `${sleepHours}h`, impact: 'moderate', description: 'Privação afeta hormônios metabólicos' });
    recommendations.push({ action: 'Melhorar higiene do sono para otimizar metabolismo', priority: 'medium' });
  }

  return {
    category: 'metabolic',
    label: 'Metabólico',
    icon: '⚡',
    score: Math.max(0, Math.min(100, score)),
    level: getRiskLevel(score),
    factors,
    recommendations: recommendations.slice(0, 3)
  };
};

/**
 * Calcula Risco Musculoesquelético
 * Fatores: dores, lesões, sedentarismo, massa muscular, postura
 */
export const calculateMusculoskeletalRisk = (data = {}) => {
  const { anamnesis = {}, assessment = {}, patient = {} } = data;
  
  let score = 100;
  const factors = [];
  const recommendations = [];

  const conditions = anamnesis.medical_conditions || [];

  // 1. Sedentarismo (até -25 pontos)
  const activityLevel = anamnesis.physical_activity_level;
  if (activityLevel === 'sedentary' || activityLevel === 'sedentario' || 
      anamnesis.exercises_regularly === 'no') {
    score -= 25;
    factors.push({ factor: 'Sedentarismo', value: 'Sim', impact: 'high', description: 'Ausência de atividade física' });
    recommendations.push({ action: 'Iniciar com caminhadas de 20-30 min, 3x por semana', priority: 'high' });
  } else if (activityLevel === 'light' || activityLevel === 'leve') {
    score -= 10;
    factors.push({ factor: 'Atividade', value: 'Leve', impact: 'moderate', description: 'Atividade física insuficiente' });
    recommendations.push({ action: 'Aumentar gradualmente intensidade e frequência', priority: 'medium' });
  } else if (activityLevel === 'moderate' || activityLevel === 'intense') {
    score += 5; // Bônus
    factors.push({ factor: 'Atividade', value: 'Regular', impact: 'low', description: 'Bom nível de atividade' });
  }

  // 2. Dores musculares/articulares (até -20 pontos)
  if (conditions.includes('dores_articulares') || conditions.includes('artrite') ||
      conditions.includes('Artrite') || conditions.includes('artrose')) {
    score -= 20;
    factors.push({ factor: 'Articulações', value: 'Comprometidas', impact: 'high', description: 'Problemas articulares' });
    recommendations.push({ action: 'Exercícios de baixo impacto, fortalecimento muscular', priority: 'high' });
  }

  if (conditions.includes('dores_musculares') || conditions.includes('fibromialgia') ||
      conditions.includes('Fibromialgia')) {
    score -= 15;
    factors.push({ factor: 'Dores Musculares', value: 'Frequentes', impact: 'moderate', description: 'Quadro doloroso muscular' });
    recommendations.push({ action: 'Anti-inflamatórios naturais (ômega-3, cúrcuma) e alongamentos', priority: 'medium' });
  }

  // 3. Lesões relatadas (até -15 pontos)
  if (anamnesis.injuries_history === 'yes' || anamnesis.injuries_history === true ||
      conditions.includes('lesao') || conditions.includes('lesão')) {
    score -= 15;
    factors.push({ factor: 'Histórico Lesões', value: 'Sim', impact: 'moderate', description: 'Lesões prévias' });
    recommendations.push({ action: 'Fortalecimento específico e cuidado com sobrecarga', priority: 'medium' });
  }

  // 4. Massa muscular baixa (até -15 pontos)
  const muscleMass = parseFloat(assessment.muscle_mass);
  const weight = parseFloat(assessment.weight || anamnesis.current_weight);
  
  if (muscleMass && weight) {
    const musclePercent = (muscleMass / weight) * 100;
    const isMale = patient.gender === 'male' || patient.sex === 'male';
    const lowMuscle = (isMale && musclePercent < 40) || (!isMale && musclePercent < 35);
    
    if (lowMuscle) {
      score -= 15;
      factors.push({ factor: 'Massa Muscular', value: `${musclePercent.toFixed(1)}%`, impact: 'moderate', description: 'Abaixo do ideal' });
      recommendations.push({ action: 'Treino de força 2-3x semana + proteína adequada', priority: 'high' });
    } else {
      factors.push({ factor: 'Massa Muscular', value: `${musclePercent.toFixed(1)}%`, impact: 'low', description: 'Adequada' });
    }
  }

  // 5. Problemas de coluna (até -15 pontos)
  if (conditions.includes('coluna') || conditions.includes('hernia') || 
      conditions.includes('lombalgia') || conditions.includes('Lombalgia')) {
    score -= 15;
    factors.push({ factor: 'Coluna', value: 'Comprometida', impact: 'high', description: 'Problemas na coluna' });
    recommendations.push({ action: 'Fortalecimento do core, cuidado com postura', priority: 'high' });
  }

  // 6. Idade avançada aumenta risco (até -10 pontos)
  const age = patient.age || calculateAge(patient.birth_date);
  if (age && age >= 60) {
    score -= 10;
    factors.push({ factor: 'Idade', value: `${age} anos`, impact: 'moderate', description: 'Atenção à sarcopenia' });
    recommendations.push({ action: 'Foco em preservação de massa muscular e equilíbrio', priority: 'medium' });
  }

  return {
    category: 'musculoskeletal',
    label: 'Musculoesquelético',
    icon: '🦴',
    score: Math.max(0, Math.min(100, score)),
    level: getRiskLevel(score),
    factors,
    recommendations: recommendations.slice(0, 3)
  };
};

/**
 * Calcula Risco Nutricional
 * Fatores: deficiências, má alimentação, hidratação, alergias
 */
export const calculateNutritionalRisk = (data = {}) => {
  const { anamnesis = {}, assessment = {}, patient = {} } = data;
  
  let score = 100;
  const factors = [];
  const recommendations = [];

  // 1. Hidratação inadequada (até -20 pontos)
  const waterIntake = parseInt(anamnesis.water_intake) || 0;
  const weight = parseFloat(assessment.weight || anamnesis.current_weight);
  const idealWater = weight ? weight * 35 : 2000; // 35ml por kg
  
  if (waterIntake > 0) {
    if (waterIntake < idealWater * 0.5) {
      score -= 20;
      factors.push({ factor: 'Hidratação', value: `${waterIntake}ml`, impact: 'high', description: 'Muito baixa' });
      recommendations.push({ action: `Aumentar para pelo menos ${Math.round(idealWater)}ml/dia`, priority: 'high' });
    } else if (waterIntake < idealWater * 0.75) {
      score -= 10;
      factors.push({ factor: 'Hidratação', value: `${waterIntake}ml`, impact: 'moderate', description: 'Insuficiente' });
      recommendations.push({ action: 'Manter garrafa de água sempre por perto', priority: 'medium' });
    } else {
      factors.push({ factor: 'Hidratação', value: `${waterIntake}ml`, impact: 'low', description: 'Adequada' });
    }
  }

  // 2. Alergias e Intolerâncias (até -15 pontos de risco, mas não necessariamente ruim)
  const allergies = anamnesis.allergies || [];
  const intolerances = anamnesis.food_intolerances || [];
  const totalRestrictions = allergies.length + intolerances.length;
  
  if (totalRestrictions >= 3) {
    score -= 15;
    factors.push({ factor: 'Restrições', value: `${totalRestrictions} itens`, impact: 'moderate', description: 'Múltiplas restrições alimentares' });
    recommendations.push({ action: 'Plano individualizado para suprir nutrientes restritos', priority: 'high' });
  } else if (totalRestrictions > 0) {
    score -= 5;
    factors.push({ factor: 'Restrições', value: `${totalRestrictions} item(ns)`, impact: 'low', description: 'Restrições controladas' });
  }

  // 3. Queda de cabelo / Unhas fracas = Possível deficiência (até -15 pontos)
  const conditions = anamnesis.medical_conditions || [];
  if (conditions.includes('queda_cabelo') || conditions.includes('hair_loss') ||
      conditions.includes('unhas_fracas')) {
    score -= 15;
    factors.push({ factor: 'Deficiência', value: 'Possível', impact: 'moderate', description: 'Sinais de carência nutricional' });
    recommendations.push({ action: 'Avaliar ferro, zinco, biotina e proteínas', priority: 'high' });
  }

  // 4. Problemas digestivos (até -15 pontos)
  if (conditions.includes('gastrite') || conditions.includes('Gastrite') ||
      conditions.includes('refluxo') || conditions.includes('sii') ||
      conditions.includes('intestino_irritavel')) {
    score -= 15;
    factors.push({ factor: 'Digestão', value: 'Comprometida', impact: 'moderate', description: 'Problemas gastrointestinais' });
    recommendations.push({ action: 'Dieta fracionada, evitar irritantes gástricos', priority: 'high' });
  }

  // 5. Alimentação irregular / Pular refeições (até -15 pontos)
  const mealsPerDay = parseInt(anamnesis.meals_per_day) || 0;
  if (mealsPerDay > 0 && mealsPerDay < 3) {
    score -= 15;
    factors.push({ factor: 'Refeições', value: `${mealsPerDay}/dia`, impact: 'moderate', description: 'Poucas refeições' });
    recommendations.push({ action: 'Estruturar pelo menos 4 refeições ao longo do dia', priority: 'medium' });
  }

  // 6. Consumo de álcool frequente (até -10 pontos)
  const alcohol = anamnesis.alcohol;
  if (alcohol === 'daily' || alcohol === 'frequent' || alcohol === 'diario') {
    score -= 10;
    factors.push({ factor: 'Álcool', value: 'Frequente', impact: 'moderate', description: 'Impacto na absorção de nutrientes' });
    recommendations.push({ action: 'Reduzir álcool, aumentar vitaminas do complexo B', priority: 'medium' });
  }

  // 7. Anemia relatada (até -15 pontos)
  if (conditions.includes('anemia') || conditions.includes('Anemia')) {
    score -= 15;
    factors.push({ factor: 'Anemia', value: 'Relatada', impact: 'high', description: 'Deficiência de ferro/B12' });
    recommendations.push({ action: 'Fontes de ferro heme + vitamina C para absorção', priority: 'high' });
  }

  // 8. Dieta restritiva extrema (até -15 pontos)
  if (anamnesis.diet_type === 'very_restrictive' || anamnesis.current_diet?.includes('muito_restrit')) {
    score -= 15;
    factors.push({ factor: 'Dieta', value: 'Muito Restritiva', impact: 'high', description: 'Risco de deficiências' });
    recommendations.push({ action: 'Flexibilizar dieta e suplementar se necessário', priority: 'high' });
  }

  return {
    category: 'nutritional',
    label: 'Nutricional',
    icon: '🥗',
    score: Math.max(0, Math.min(100, score)),
    level: getRiskLevel(score),
    factors,
    recommendations: recommendations.slice(0, 3)
  };
};

// ==================== SCORE CONSOLIDADO ====================

/**
 * Calcula o Risk Score completo do paciente
 * @param {Object} data - { anamnesis, assessment, patient, previousScores }
 * @returns {Object} Risk Score completo
 */
export const calculateFullRiskScore = (data = {}) => {
  const cardiovascular = calculateCardiovascularRisk(data);
  const metabolic = calculateMetabolicRisk(data);
  const musculoskeletal = calculateMusculoskeletalRisk(data);
  const nutritional = calculateNutritionalRisk(data);

  // Calcular score geral ponderado
  const overallScore = Math.round(
    (cardiovascular.score * RISK_WEIGHTS.cardiovascular) +
    (metabolic.score * RISK_WEIGHTS.metabolic) +
    (musculoskeletal.score * RISK_WEIGHTS.musculoskeletal) +
    (nutritional.score * RISK_WEIGHTS.nutritional)
  );

  // Gerar alertas prioritários (dos fatores críticos e altos)
  const allFactors = [
    ...cardiovascular.factors,
    ...metabolic.factors,
    ...musculoskeletal.factors,
    ...nutritional.factors
  ];
  
  const criticalAlerts = allFactors
    .filter(f => f.impact === 'critical' || f.impact === 'high')
    .map(f => ({
      category: f.factor,
      message: f.description,
      priority: f.impact === 'critical' ? 1 : 2
    }))
    .slice(0, 5);

  // Gerar top recomendações
  const allRecommendations = [
    ...cardiovascular.recommendations,
    ...metabolic.recommendations,
    ...musculoskeletal.recommendations,
    ...nutritional.recommendations
  ]
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    })
    .slice(0, 5);

  return {
    overall: overallScore,
    level: getRiskLevel(overallScore),
    categories: {
      cardiovascular,
      metabolic,
      musculoskeletal,
      nutritional
    },
    alerts: criticalAlerts,
    recommendations: allRecommendations,
    calculatedAt: new Date().toISOString(),
    weights: RISK_WEIGHTS
  };
};

// ==================== HELPERS ====================

/**
 * Determina o nível de risco baseado no score
 */
export const getRiskLevel = (score) => {
  if (score >= 80) return RISK_LEVELS.LOW;
  if (score >= 60) return RISK_LEVELS.MODERATE;
  if (score >= 40) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.CRITICAL;
};

/**
 * Calcula idade a partir da data de nascimento
 */
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

/**
 * Compara dois Risk Scores e retorna evolução
 */
export const compareRiskScores = (currentScore, previousScore) => {
  if (!previousScore) return null;

  const diff = currentScore.overall - previousScore.overall;
  const categoryDiffs = {};

  Object.keys(currentScore.categories).forEach(cat => {
    const current = currentScore.categories[cat].score;
    const previous = previousScore.categories?.[cat]?.score || current;
    categoryDiffs[cat] = {
      current,
      previous,
      diff: current - previous,
      improved: current > previous
    };
  });

  return {
    overall: {
      current: currentScore.overall,
      previous: previousScore.overall,
      diff,
      improved: diff > 0,
      percentChange: previousScore.overall > 0 
        ? Math.round((diff / previousScore.overall) * 100) 
        : 0
    },
    categories: categoryDiffs,
    comparedAt: new Date().toISOString()
  };
};

/**
 * Gera resumo textual do Risk Score para exibição
 */
export const generateRiskSummary = (riskScore, patientName = 'Paciente') => {
  const { overall, level, categories, alerts, recommendations } = riskScore;
  const firstName = patientName.split(' ')[0];

  let summary = '';

  // Resumo geral
  if (level.value === 'low') {
    summary = `${firstName}, seu perfil de risco está excelente! Score de ${overall}/100. Continue mantendo seus bons hábitos.`;
  } else if (level.value === 'moderate') {
    summary = `${firstName}, seu perfil de risco está moderado (${overall}/100). Alguns ajustes podem melhorar significativamente sua saúde.`;
  } else if (level.value === 'high') {
    summary = `${firstName}, seu perfil de risco está elevado (${overall}/100). Recomendamos atenção especial às áreas sinalizadas.`;
  } else {
    summary = `${firstName}, identificamos pontos críticos em seu perfil (${overall}/100). É importante priorizar as recomendações abaixo.`;
  }

  // Destacar categoria mais crítica
  const worstCategory = Object.values(categories)
    .sort((a, b) => a.score - b.score)[0];

  if (worstCategory.score < 60) {
    summary += ` Maior atenção para: ${worstCategory.label}.`;
  }

  return summary;
};

export default {
  calculateCardiovascularRisk,
  calculateMetabolicRisk,
  calculateMusculoskeletalRisk,
  calculateNutritionalRisk,
  calculateFullRiskScore,
  getRiskLevel,
  compareRiskScores,
  generateRiskSummary,
  RISK_LEVELS,
  RISK_WEIGHTS
};
