/**
 * nutritionCalculator.js
 * FUNÇÃO CENTRALIZADA PARA CÁLCULO NUTRICIONAL
 * Corrige o bug de conversão de unidades
 * Prioriza TACO sobre USDA
 */

/**
 * Tabela de conversão de medidas caseiras para gramas
 * Usado quando o alimento base é em "unidade" mas o usuário quer converter
 */
export const UNIT_CONVERSIONS = {
  // Medidas de volume (ml → g, assumindo densidade ~1)
  'colher_sopa': 15,      // 1 colher de sopa = 15g/ml
  'colher_cha': 5,        // 1 colher de chá = 5g/ml
  'colher_sobremesa': 10, // 1 colher de sobremesa = 10g/ml
  'xicara': 240,          // 1 xícara = 240ml
  'copo': 200,            // 1 copo = 200ml
  'concha': 120,          // 1 concha = 120g
  
  // Para unidade → o próprio peso da porção do alimento
  'unidade': null, // será calculado dinamicamente
  'fatia': null,   // será calculado dinamicamente
  'g': 1,
  'ml': 1,
};

/**
 * Peso médio de alimentos por unidade (em gramas)
 * Usado quando o alimento é contado em unidades
 */
export const FOOD_UNIT_WEIGHTS = {
  // OVOS
  'ovo': 50,
  'ovo cozido': 50,
  'ovo frito': 60,
  'clara': 33,
  'gema': 17,
  
  // FRUTAS
  'banana': 100,
  'banana prata': 86,
  'banana nanica': 100,
  'maçã': 130,
  'laranja': 137,
  'pera': 133,
  'goiaba': 120,
  'manga': 200,
  'mamão': 150,
  'abacate': 200,
  'tomate': 80,
  'morango': 12,
  
  // PÃES
  'pão francês': 50,
  'pão integral': 30,
  'pão de forma': 25,
  'torrada': 10,
  
  // OUTROS
  'castanha-do-pará': 4,
  'castanha de caju': 2.5,
  'amendoim': 0.6,
  'noz': 5,
};

/**
 * Calcula os nutrientes de um alimento baseado na quantidade e unidade
 * 
 * REGRA DE CÁLCULO:
 * - Se unit === 'g' ou 'ml': quantidade já está em gramas/ml
 * - Se unit === 'unidade', 'fatia', etc: quantidade é MULTIPLICADOR da porção
 * 
 * @param {Object} foodData - Dados do alimento do banco (TACO/USDA)
 * @param {number} quantity - Quantidade informada pelo usuário
 * @param {string} unit - Unidade da quantidade (g, ml, unidade, fatia, etc)
 * @returns {Object} { grams_total, kcal, protein, carbs, fat, fiber, sodium, debug }
 */
export const calculateNutrition = (foodData, quantity, unit = 'g') => {
  // Validações
  if (!foodData) {
    return {
      grams_total: 0,
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
      error: 'Alimento não encontrado',
      debug: { error: 'foodData is null' }
    };
  }

  if (!quantity || quantity <= 0) {
    return {
      grams_total: 0,
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
      error: 'Quantidade inválida',
      debug: { quantity }
    };
  }

  // Dados base do alimento
  const baseKcal = foodData.calorias || 0;
  const baseProtein = foodData.proteina || 0;
  const baseCarbs = foodData.carboidrato || 0;
  const baseFat = foodData.gordura || 0;
  const baseFiber = foodData.fibra || 0;
  const baseSodium = foodData.sodio || 0;
  const basePortion = foodData.porcao || 100;
  const baseUnit = foodData.unidade || 'g';

  let grams_total = 0;
  let multiplier = 1;
  
  // ========================================
  // LÓGICA DE CONVERSÃO DE UNIDADES
  // ========================================
  
  const normalizedUnit = unit.toLowerCase().trim();
  const normalizedBaseUnit = baseUnit.toLowerCase().trim();
  
  // CASO 1: Usuário informou em gramas (g)
  if (normalizedUnit === 'g') {
    // Quantidade já está em gramas
    grams_total = quantity;
    // Multiplicador baseado na proporção com a porção base
    multiplier = quantity / basePortion;
  }
  // CASO 2: Usuário informou em ml
  else if (normalizedUnit === 'ml') {
    // Para líquidos, assumimos 1ml ≈ 1g (densidade ~1)
    grams_total = quantity;
    multiplier = quantity / basePortion;
  }
  // CASO 3: Usuário informou em unidade/fatia/porção
  else if (['unidade', 'unidades', 'fatia', 'fatias', 'porção', 'porcao'].includes(normalizedUnit)) {
    // A quantidade representa QUANTAS PORÇÕES do alimento
    // Ex: 30 ovos = 30 × (1 ovo que tem os nutrientes base)
    grams_total = quantity * basePortion;
    multiplier = quantity; // DIRETO! Sem dividir por porção
  }
  // CASO 4: Medidas caseiras
  else if (UNIT_CONVERSIONS[normalizedUnit]) {
    // Converter medida caseira para gramas
    const mlEquivalent = UNIT_CONVERSIONS[normalizedUnit] * quantity;
    grams_total = mlEquivalent;
    multiplier = mlEquivalent / basePortion;
  }
  // CASO 5: Unidade não reconhecida - assume que é multiplicador de porção
  else {
    grams_total = quantity * basePortion;
    multiplier = quantity;
  }

  // ========================================
  // CÁLCULO DOS NUTRIENTES
  // ========================================
  const result = {
    grams_total: Math.round(grams_total),
    kcal: Math.round(baseKcal * multiplier),
    protein: parseFloat((baseProtein * multiplier).toFixed(1)),
    carbs: parseFloat((baseCarbs * multiplier).toFixed(1)),
    fat: parseFloat((baseFat * multiplier).toFixed(1)),
    fiber: parseFloat((baseFiber * multiplier).toFixed(1)),
    sodium: Math.round(baseSodium * multiplier),
    // Debug info para validação
    debug: {
      food_id: foodData.id,
      food_name: foodData.name,
      input_quantity: quantity,
      input_unit: unit,
      base_portion: basePortion,
      base_unit: baseUnit,
      base_kcal_per_portion: baseKcal,
      multiplier: multiplier.toFixed(4),
      calculation: `${baseKcal} kcal × ${multiplier.toFixed(2)} = ${Math.round(baseKcal * multiplier)} kcal`
    }
  };

  return result;
};

/**
 * Calcula os totais nutricionais de uma lista de alimentos
 * @param {Array} foods - Lista de alimentos com {foodId, quantity, unit}
 * @param {Array} allFoods - Lista completa de alimentos disponíveis
 * @returns {Object} Totais nutricionais
 */
export const calculateMealTotals = (foods, allFoods) => {
  const totals = {
    grams_total: 0,
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    items: []
  };

  if (!foods || !Array.isArray(foods)) return totals;

  foods.forEach(food => {
    const foodData = allFoods.find(f => 
      f.id === food.foodId || 
      f.id === food.food_id ||
      f.id === parseInt(food.foodId) ||
      f.id === parseInt(food.food_id)
    );
    
    if (foodData) {
      const nutrition = calculateNutrition(foodData, food.quantity, food.unit || 'g');
      totals.grams_total += nutrition.grams_total;
      totals.kcal += nutrition.kcal;
      totals.protein += nutrition.protein;
      totals.carbs += nutrition.carbs;
      totals.fat += nutrition.fat;
      totals.fiber += nutrition.fiber;
      totals.sodium += nutrition.sodium;
      totals.items.push({
        name: foodData.name,
        ...nutrition
      });
    }
  });

  // Arredondar totais
  totals.protein = parseFloat(totals.protein.toFixed(1));
  totals.carbs = parseFloat(totals.carbs.toFixed(1));
  totals.fat = parseFloat(totals.fat.toFixed(1));
  totals.fiber = parseFloat(totals.fiber.toFixed(1));

  return totals;
};

/**
 * Calcula os totais de todas as refeições do dia
 * @param {Array} meals - Lista de refeições
 * @param {Array} allFoods - Lista completa de alimentos
 * @returns {Object} Totais do dia
 */
export const calculateDayTotals = (meals, allFoods) => {
  const totals = {
    grams_total: 0,
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    meals: []
  };

  if (!meals || !Array.isArray(meals)) return totals;

  meals.forEach(meal => {
    const mealTotals = calculateMealTotals(meal.foods || [], allFoods);
    totals.grams_total += mealTotals.grams_total;
    totals.kcal += mealTotals.kcal;
    totals.protein += mealTotals.protein;
    totals.carbs += mealTotals.carbs;
    totals.fat += mealTotals.fat;
    totals.fiber += mealTotals.fiber;
    totals.sodium += mealTotals.sodium;
    totals.meals.push({
      name: meal.name,
      ...mealTotals
    });
  });

  // Arredondar totais
  totals.protein = parseFloat(totals.protein.toFixed(1));
  totals.carbs = parseFloat(totals.carbs.toFixed(1));
  totals.fat = parseFloat(totals.fat.toFixed(1));
  totals.fiber = parseFloat(totals.fiber.toFixed(1));

  return totals;
};

/**
 * Retorna string explicativa do cálculo para exibir na UI
 * @param {Object} foodData - Dados do alimento
 * @returns {string} Texto explicativo
 */
export const getNutritionLabel = (foodData) => {
  if (!foodData) return '';
  
  const unit = foodData.unidade || 'g';
  const portion = foodData.porcao || 100;
  const kcal = foodData.calorias || 0;
  
  if (['unidade', 'fatia'].includes(unit.toLowerCase())) {
    return `${kcal} kcal por ${unit} (${portion}g)`;
  }
  
  return `${kcal} kcal por ${portion}${unit}`;
};

/**
 * Valida se a conversão de unidade é possível
 * @param {Object} foodData - Dados do alimento
 * @param {string} targetUnit - Unidade desejada
 * @returns {Object} { valid: boolean, message: string }
 */
export const validateUnitConversion = (foodData, targetUnit) => {
  if (!foodData) {
    return { valid: false, message: 'Alimento não encontrado' };
  }

  const normalizedUnit = targetUnit.toLowerCase().trim();
  const baseUnit = (foodData.unidade || 'g').toLowerCase().trim();

  // Sempre permite g e ml
  if (['g', 'ml'].includes(normalizedUnit)) {
    return { valid: true, message: '' };
  }

  // Permite unidade/fatia
  if (['unidade', 'fatia', 'porção', 'porcao'].includes(normalizedUnit)) {
    return { valid: true, message: '' };
  }

  // Medidas caseiras são sempre permitidas
  if (UNIT_CONVERSIONS[normalizedUnit]) {
    return { valid: true, message: '' };
  }

  return { valid: true, message: '' };
};

// Export default para facilitar imports
export default {
  calculateNutrition,
  calculateMealTotals,
  calculateDayTotals,
  getNutritionLabel,
  validateUnitConversion,
  UNIT_CONVERSIONS
};
