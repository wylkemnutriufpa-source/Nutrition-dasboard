/**
 * Sistema de Dicas Dinâmicas em Tempo Real
 * Gera dicas personalizadas conforme os dados são preenchidos
 * Usado tanto na Anamnese quanto na Avaliação Física
 */

// ==================== DICAS DA ANAMNESE ====================

/**
 * Gera dicas em tempo real baseadas nos dados da anamnese
 * @param {Object} anamnesisData - Dados parciais ou completos da anamnese
 * @param {Object} patient - Dados do paciente
 * @returns {Array} Array de dicas geradas
 */
export const generateAnamnesisTips = (anamnesisData, patient) => {
  const tips = [];
  const name = patient?.name?.split(' ')[0] || 'Paciente';
  
  if (!anamnesisData) return tips;

  // ===== CONDIÇÕES MÉDICAS =====
  const conditions = anamnesisData.medical_conditions || [];
  
  if (conditions.includes('diabetes') || conditions.includes('Diabetes')) {
    tips.push({
      category: 'health',
      icon: '🩺',
      title: 'Cuidados com Diabetes',
      content: `${name}, como você tem diabetes, vamos montar um plano com baixo índice glicêmico. Prefira carboidratos complexos (aveia, quinoa, batata doce), evite açúcares simples e faça refeições regulares para manter a glicemia estável.`,
      priority: 'high',
      source: 'anamnese'
    });
  }
  
  if (conditions.includes('hipertensao') || conditions.includes('Hipertensão') || conditions.includes('pressao_alta')) {
    tips.push({
      category: 'health',
      icon: '❤️',
      title: 'Controle da Pressão',
      content: `${name}, para controlar sua pressão arterial, vamos reduzir o sódio da dieta. Evite alimentos industrializados, embutidos e temperos prontos. Aumente o consumo de potássio (banana, abacate, folhas verdes) que ajuda a equilibrar a pressão.`,
      priority: 'high',
      source: 'anamnese'
    });
  }
  
  if (conditions.includes('colesterol') || conditions.includes('Colesterol Alto') || conditions.includes('dislipidemia')) {
    tips.push({
      category: 'health',
      icon: '🫀',
      title: 'Colesterol sob Controle',
      content: `${name}, para melhorar seu colesterol, vamos incluir mais fibras solúveis (aveia, maçã, leguminosas) e gorduras boas (azeite, castanhas, peixes). Reduza frituras e carnes gordurosas. Ômega-3 é seu aliado!`,
      priority: 'high',
      source: 'anamnese'
    });
  }
  
  if (conditions.includes('gastrite') || conditions.includes('Gastrite') || conditions.includes('refluxo')) {
    tips.push({
      category: 'health',
      icon: '🔥',
      title: 'Proteção Gástrica',
      content: `${name}, com sensibilidade gástrica, evite café em excesso, alimentos ácidos e muito condimentados. Prefira refeições menores e mais frequentes. Não deite logo após comer e mastige bem os alimentos.`,
      priority: 'medium',
      source: 'anamnese'
    });
  }

  if (conditions.includes('tireoide') || conditions.includes('hipotireoidismo') || conditions.includes('Hipotireoidismo')) {
    tips.push({
      category: 'health',
      icon: '🦋',
      title: 'Apoio à Tireoide',
      content: `${name}, para apoiar sua tireoide, inclua alimentos ricos em selênio (castanha-do-pará) e zinco. Evite consumir soja em excesso junto com a medicação. Iodo na medida certa também é importante.`,
      priority: 'medium',
      source: 'anamnese'
    });
  }

  // ===== ALERGIAS E INTOLERÂNCIAS =====
  const allergies = anamnesisData.allergies || [];
  const intolerances = anamnesisData.food_intolerances || [];
  
  if (allergies.includes('lactose') || intolerances.includes('lactose') || intolerances.includes('Lactose')) {
    tips.push({
      category: 'restriction',
      icon: '🥛',
      title: 'Alternativas sem Lactose',
      content: `${name}, como você tem intolerância à lactose, vamos usar leites vegetais (aveia, amêndoas, coco), queijos zero lactose e garantir seu cálcio através de folhas verde-escuras, sardinha e gergelim.`,
      priority: 'high',
      source: 'anamnese'
    });
  }
  
  if (allergies.includes('gluten') || intolerances.includes('gluten') || intolerances.includes('Glúten')) {
    tips.push({
      category: 'restriction',
      icon: '🌾',
      title: 'Vida sem Glúten',
      content: `${name}, para evitar o glúten, usaremos farinhas alternativas (arroz, mandioca, amêndoas). Atenção aos produtos industrializados que podem conter traços. Aveia só se for certificada sem glúten!`,
      priority: 'high',
      source: 'anamnese'
    });
  }

  // ===== ESTILO DE VIDA =====
  const sleepHours = parseInt(anamnesisData.sleep_hours) || 0;
  if (sleepHours > 0 && sleepHours < 6) {
    tips.push({
      category: 'lifestyle',
      icon: '😴',
      title: 'Sono e Metabolismo',
      content: `${name}, dormir menos de 6 horas afeta seus hormônios da fome (grelina e leptina), aumentando o apetite. Tente melhorar a qualidade do sono - evite telas à noite, faça um chá calmante e mantenha horários regulares.`,
      priority: 'medium',
      source: 'anamnese'
    });
  }
  
  const stressLevel = anamnesisData.stress_level;
  if (stressLevel === 'high' || stressLevel === 'very_high' || stressLevel === 'alto' || stressLevel === 'muito_alto') {
    tips.push({
      category: 'lifestyle',
      icon: '🧘',
      title: 'Combatendo o Estresse',
      content: `${name}, o estresse elevado aumenta o cortisol e pode sabotar seus resultados. Inclua alimentos ricos em magnésio (chocolate amargo 70%, banana, espinafre) e reserve momentos de relaxamento. Sua saúde mental importa!`,
      priority: 'medium',
      source: 'anamnese'
    });
  }
  
  const waterIntake = parseInt(anamnesisData.water_intake) || 0;
  if (waterIntake > 0 && waterIntake < 1500) {
    tips.push({
      category: 'lifestyle',
      icon: '💧',
      title: 'Hidratação é Chave',
      content: `${name}, você está bebendo pouca água! A meta é pelo menos 35ml por kg de peso. Água ajuda no metabolismo, na digestão e até na sensação de saciedade. Deixe uma garrafa sempre por perto!`,
      priority: 'high',
      source: 'anamnese'
    });
  }

  // ===== HÁBITOS =====
  if (anamnesisData.smoking === 'yes' || anamnesisData.smoking === true) {
    tips.push({
      category: 'lifestyle',
      icon: '🚭',
      title: 'Sobre o Tabagismo',
      content: `${name}, o cigarro afeta seu paladar e metabolismo da vitamina C. Se possível, considere reduzir. Enquanto isso, aumente alimentos ricos em antioxidantes (frutas vermelhas, vegetais coloridos) para minimizar danos.`,
      priority: 'medium',
      source: 'anamnese'
    });
  }
  
  const alcohol = anamnesisData.alcohol;
  if (alcohol === 'daily' || alcohol === 'frequent' || alcohol === 'diario') {
    tips.push({
      category: 'lifestyle',
      icon: '🍷',
      title: 'Álcool e Resultados',
      content: `${name}, o álcool tem calorias vazias e pode atrapalhar seu progresso. Tente reduzir para ocasiões especiais. Se beber, prefira vinho tinto com moderação e sempre hidrate-se bem depois.`,
      priority: 'medium',
      source: 'anamnese'
    });
  }

  // ===== OBJETIVO =====
  const goal = anamnesisData.main_goal || anamnesisData.sports_goal || patient?.goal;
  if (goal === 'weight_loss' || goal === 'emagrecimento' || goal === 'perder_peso') {
    tips.push({
      category: 'goal',
      icon: '🎯',
      title: 'Foco no Emagrecimento',
      content: `${name}, para perder peso de forma saudável, vamos criar um déficit calórico moderado. Priorize proteínas para manter a massa muscular, fibras para saciedade e não pule refeições! Consistência é mais importante que perfeição.`,
      priority: 'high',
      source: 'anamnese'
    });
  }
  
  if (goal === 'muscle_gain' || goal === 'ganho_muscular' || goal === 'hipertrofia') {
    tips.push({
      category: 'goal',
      icon: '💪',
      title: 'Construindo Músculos',
      content: `${name}, para ganhar massa muscular, você precisa de superávit calórico e proteína adequada (1.6-2.2g/kg). Distribua a proteína ao longo do dia, especialmente pós-treino. Carboidratos são combustível para seus treinos!`,
      priority: 'high',
      source: 'anamnese'
    });
  }

  // ===== ATIVIDADE FÍSICA =====
  const activityLevel = anamnesisData.physical_activity_level;
  if (activityLevel === 'sedentary' || activityLevel === 'sedentario' || anamnesisData.exercises_regularly === 'no') {
    tips.push({
      category: 'activity',
      icon: '🚶',
      title: 'Movimento é Vida',
      content: `${name}, mesmo pequenos movimentos fazem diferença! Comece com caminhadas de 15-20 minutos. Suba escadas, estacione mais longe. Cada passo conta para melhorar seu metabolismo e bem-estar!`,
      priority: 'medium',
      source: 'anamnese'
    });
  }

  return tips;
};

// ==================== DICAS DA AVALIAÇÃO FÍSICA ====================

/**
 * Gera dicas em tempo real baseadas na avaliação física
 * @param {Object} assessmentData - Dados parciais ou completos da avaliação
 * @param {Object} patient - Dados do paciente
 * @param {Object} previousAssessment - Avaliação anterior (para comparação)
 * @returns {Array} Array de dicas geradas
 */
export const generateAssessmentTips = (assessmentData, patient, previousAssessment = null) => {
  const tips = [];
  const name = patient?.name?.split(' ')[0] || 'Paciente';
  
  if (!assessmentData) return tips;

  // ===== IMC =====
  const weight = parseFloat(assessmentData.weight);
  const height = parseFloat(assessmentData.height);
  let bmi = parseFloat(assessmentData.bmi);
  
  // Calcular IMC se não fornecido
  if (!bmi && weight && height) {
    const heightM = height / 100;
    bmi = weight / (heightM * heightM);
  }
  
  if (bmi) {
    if (bmi < 18.5) {
      tips.push({
        category: 'body',
        icon: '⚖️',
        title: 'Atenção ao Peso',
        content: `${name}, seu IMC de ${bmi.toFixed(1)} indica peso abaixo do ideal. Vamos trabalhar para alcançar um peso saudável com alimentação nutritiva e calórica adequada. Sem pressa, com saúde!`,
        priority: 'high',
        source: 'assessment'
      });
    } else if (bmi >= 18.5 && bmi < 25) {
      tips.push({
        category: 'body',
        icon: '✅',
        title: 'IMC Ideal!',
        content: `Parabéns ${name}! Seu IMC de ${bmi.toFixed(1)} está na faixa ideal. Continue com seus bons hábitos e foque em manter esse equilíbrio!`,
        priority: 'low',
        source: 'assessment'
      });
    } else if (bmi >= 25 && bmi < 30) {
      tips.push({
        category: 'body',
        icon: '📊',
        title: 'Sobrepeso - Vamos Ajustar',
        content: `${name}, seu IMC de ${bmi.toFixed(1)} indica sobrepeso. Com ajustes graduais na alimentação e atividade física, vamos alcançar seu peso ideal. Pequenas mudanças, grandes resultados!`,
        priority: 'high',
        source: 'assessment'
      });
    } else if (bmi >= 30) {
      tips.push({
        category: 'body',
        icon: '🎯',
        title: 'Foco na Saúde',
        content: `${name}, seu IMC de ${bmi.toFixed(1)} merece atenção especial. Estou aqui para te ajudar nessa jornada! Vamos com calma, passo a passo, priorizando sua saúde e bem-estar.`,
        priority: 'high',
        source: 'assessment'
      });
    }
  }

  // ===== COMPARAÇÃO COM AVALIAÇÃO ANTERIOR =====
  if (previousAssessment && weight) {
    const prevWeight = parseFloat(previousAssessment.weight);
    if (prevWeight) {
      const weightDiff = weight - prevWeight;
      
      if (weightDiff < -2) {
        tips.push({
          category: 'progress',
          icon: '🎉',
          title: 'Excelente Progresso!',
          content: `${name}, você perdeu ${Math.abs(weightDiff).toFixed(1)}kg desde a última avaliação! Seu esforço está dando resultado. Continue assim, você está no caminho certo!`,
          priority: 'low',
          source: 'assessment'
        });
      } else if (weightDiff > 2) {
        tips.push({
          category: 'progress',
          icon: '💪',
          title: 'Vamos Retomar o Foco',
          content: `${name}, houve um ganho de ${weightDiff.toFixed(1)}kg. Tudo bem, faz parte do processo! Vamos identificar o que aconteceu e ajustar a estratégia. Juntos conseguimos!`,
          priority: 'medium',
          source: 'assessment'
        });
      } else {
        tips.push({
          category: 'progress',
          icon: '📈',
          title: 'Peso Estável',
          content: `${name}, seu peso se manteve estável. Dependendo do seu objetivo, isso pode ser ótimo! Se busca mudança, vamos intensificar um pouco a estratégia.`,
          priority: 'low',
          source: 'assessment'
        });
      }
    }
  }

  // ===== GORDURA CORPORAL =====
  const bodyFat = parseFloat(assessmentData.body_fat_percentage);
  if (bodyFat) {
    const isMale = patient?.gender === 'male' || patient?.sex === 'male';
    const highFat = (isMale && bodyFat > 25) || (!isMale && bodyFat > 32);
    
    if (highFat) {
      tips.push({
        category: 'body',
        icon: '🔥',
        title: 'Reduzindo Gordura',
        content: `${name}, sua gordura corporal está em ${bodyFat}%. Vamos focar em reduzi-la para melhorar sua saúde. Combine alimentação adequada com exercícios - cardio e musculação são aliados!`,
        priority: 'high',
        source: 'assessment'
      });
    }
  }

  // ===== CIRCUNFERÊNCIA ABDOMINAL =====
  const waist = parseFloat(assessmentData.waist_circumference);
  if (waist) {
    const isMale = patient?.gender === 'male' || patient?.sex === 'male';
    const highWaist = (isMale && waist > 102) || (!isMale && waist > 88);
    
    if (highWaist) {
      tips.push({
        category: 'body',
        icon: '⚠️',
        title: 'Atenção à Cintura',
        content: `${name}, sua circunferência abdominal de ${waist}cm indica acúmulo de gordura visceral, que aumenta riscos cardiovasculares. Vamos trabalhar para reduzir! Fibras e exercícios aeróbicos são essenciais.`,
        priority: 'high',
        source: 'assessment'
      });
    }
  }

  // ===== RELAÇÃO CINTURA/QUADRIL =====
  const whr = parseFloat(assessmentData.waist_hip_ratio);
  if (whr) {
    const isMale = patient?.gender === 'male' || patient?.sex === 'male';
    const highRisk = (isMale && whr > 0.9) || (!isMale && whr > 0.85);
    
    if (highRisk) {
      tips.push({
        category: 'body',
        icon: '📏',
        title: 'Relação Cintura/Quadril',
        content: `${name}, sua RCQ de ${whr.toFixed(2)} indica distribuição de gordura tipo "maçã". Vamos redistribuir isso! Reduza carboidratos refinados e aumente atividades que trabalhem o core.`,
        priority: 'medium',
        source: 'assessment'
      });
    }
  }

  // ===== MASSA MUSCULAR =====
  const muscleMass = parseFloat(assessmentData.muscle_mass);
  if (muscleMass && weight) {
    const musclePercent = (muscleMass / weight) * 100;
    const isMale = patient?.gender === 'male' || patient?.sex === 'male';
    const lowMuscle = (isMale && musclePercent < 40) || (!isMale && musclePercent < 35);
    
    if (lowMuscle) {
      tips.push({
        category: 'body',
        icon: '💪',
        title: 'Vamos Ganhar Músculos',
        content: `${name}, sua massa muscular pode melhorar! Músculos aceleram o metabolismo e protegem as articulações. Aumente a proteína e inclua treino de força pelo menos 2-3x por semana.`,
        priority: 'medium',
        source: 'assessment'
      });
    }
  }

  // ===== PRESSÃO ARTERIAL =====
  const systolic = parseInt(assessmentData.blood_pressure_systolic);
  const diastolic = parseInt(assessmentData.blood_pressure_diastolic);
  
  if (systolic && diastolic) {
    if (systolic >= 140 || diastolic >= 90) {
      tips.push({
        category: 'health',
        icon: '❤️',
        title: 'Pressão Elevada',
        content: `${name}, sua pressão ${systolic}/${diastolic} está acima do ideal. Reduzir o sódio, aumentar potássio, praticar atividade física regular e gerenciar o estresse são fundamentais. Acompanhe com seu médico!`,
        priority: 'high',
        source: 'assessment'
      });
    } else if (systolic <= 90 || diastolic <= 60) {
      tips.push({
        category: 'health',
        icon: '💓',
        title: 'Pressão Baixa',
        content: `${name}, sua pressão está um pouco baixa. Mantenha-se bem hidratado, evite ficar muito tempo em pé e levante-se devagar. Se sentir tonturas frequentes, converse com seu médico.`,
        priority: 'medium',
        source: 'assessment'
      });
    }
  }

  // ===== FREQUÊNCIA CARDÍACA =====
  const heartRate = parseInt(assessmentData.heart_rate);
  if (heartRate) {
    if (heartRate > 100) {
      tips.push({
        category: 'health',
        icon: '💗',
        title: 'Frequência Cardíaca',
        content: `${name}, sua FC de ${heartRate}bpm em repouso está elevada. Pode indicar estresse, ansiedade ou falta de condicionamento. Exercícios aeróbicos regulares ajudam a baixar a FC de repouso!`,
        priority: 'medium',
        source: 'assessment'
      });
    }
  }

  return tips;
};

// ==================== COMBINAR DICAS ====================

/**
 * Combina dicas da anamnese e avaliação física, removendo duplicatas
 * e priorizando as mais importantes
 */
export const combineTips = (anamnesisTips, assessmentTips) => {
  const allTips = [...(anamnesisTips || []), ...(assessmentTips || [])];
  
  // Ordenar por prioridade
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  allTips.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
  
  // Remover duplicatas por título similar
  const seen = new Set();
  return allTips.filter(tip => {
    const key = tip.title.toLowerCase().substring(0, 20);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Gera uma dica principal consolidada (a mais importante)
 * para exibir em destaque no dashboard do paciente
 */
export const generateMainTip = (tips, patient) => {
  if (!tips || tips.length === 0) return null;
  
  const name = patient?.name?.split(' ')[0] || 'Paciente';
  const highPriorityTips = tips.filter(t => t.priority === 'high');
  
  if (highPriorityTips.length === 0) return tips[0];
  
  // Combinar as dicas de alta prioridade em uma mensagem principal
  const mainContent = highPriorityTips
    .slice(0, 3)
    .map(t => `• ${t.content}`)
    .join('\n\n');
  
  return {
    category: 'personalized',
    icon: '⭐',
    title: `Dicas Personalizadas para ${name}`,
    content: mainContent,
    priority: 'high',
    is_pinned: true,
    source: 'combined'
  };
};

export default {
  generateAnamnesisTips,
  generateAssessmentTips,
  combineTips,
  generateMainTip
};
