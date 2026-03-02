/**
 * HOOK: useProfessionalJourney
 * 
 * Retorna progresso completo da jornada profissional:
 * - Contagem de features ativadas
 * - Percentual de ativação
 * - Nível atual e próximo
 * - Features faltando
 * - Sugestões inteligentes
 * - Medalhas por categoria
 * - Meta mensal
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PLATFORM_FEATURES, TOTAL_FEATURES, FEATURE_MAP, getFeaturesByCategory } from '@/constants/platformFeatureInventory';
import { getCurrentLevel, getNextLevel, getFeaturesUntilNextLevel, calculateCategoryMedals } from '@/utils/professionalLevels';
import { getProfessionalFeatureUsage, getOrCreateMonthlyGoal } from '@/utils/featureTracking';
import { toast } from 'sonner';

const LEVEL_STORAGE_KEY = 'fitjourney_pro_level';

export const useProfessionalJourney = (professionalId) => {
  const [loading, setLoading] = useState(true);
  const [activatedFeatures, setActivatedFeatures] = useState(new Set());
  const [monthlyGoal, setMonthlyGoal] = useState(null);
  const hasCheckedLevelUp = useRef(false);

  const loadData = useCallback(async () => {
    if (!professionalId) {
      setLoading(false);
      return;
    }

    try {
      // Buscar features usadas
      const usageData = await getProfessionalFeatureUsage(professionalId);
      const usedKeys = new Set(
        usageData
          .map(r => r.feature_key)
          .filter(key => FEATURE_MAP[key]) // Só contar features do inventário
      );
      setActivatedFeatures(usedKeys);

      // Buscar meta mensal
      const goal = await getOrCreateMonthlyGoal(professionalId);
      setMonthlyGoal(goal);
    } catch {
      // Silencioso
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos derivados
  const activatedFeaturesCount = activatedFeatures.size;
  const activationPercentage = TOTAL_FEATURES > 0 
    ? Math.round((activatedFeaturesCount / TOTAL_FEATURES) * 100) 
    : 0;

  const currentLevel = getCurrentLevel(activationPercentage);
  const nextLevel = getNextLevel(activationPercentage);
  const featuresUntilNextLevel = getFeaturesUntilNextLevel(activatedFeaturesCount, TOTAL_FEATURES);

  // Features faltando
  const missingFeatures = PLATFORM_FEATURES.filter(f => !activatedFeatures.has(f.key));

  // Sugestão inteligente: priorizar strategic > high > IA > pouco usado
  const suggestedFeatures = [...missingFeatures].sort((a, b) => {
    const impactOrder = { strategic: 0, high: 1, medium: 2, basic: 3 };
    const aScore = impactOrder[a.impactLevel] ?? 3;
    const bScore = impactOrder[b.impactLevel] ?? 3;
    if (aScore !== bScore) return aScore - bScore;
    // Desempate: IA primeiro
    if (a.category === 'Inteligência Artificial' && b.category !== 'Inteligência Artificial') return -1;
    if (b.category === 'Inteligência Artificial' && a.category !== 'Inteligência Artificial') return 1;
    return 0;
  });

  // Medalhas por categoria
  const featuresByCategory = getFeaturesByCategory();
  const usedByCategory = {};
  for (const key of activatedFeatures) {
    const feature = FEATURE_MAP[key];
    if (feature) {
      if (!usedByCategory[feature.category]) {
        usedByCategory[feature.category] = new Set();
      }
      usedByCategory[feature.category].add(key);
    }
  }
  const medals = calculateCategoryMedals(usedByCategory, featuresByCategory);

  // Level-up toast (uma vez por sessão)
  useEffect(() => {
    if (loading || hasCheckedLevelUp.current || !currentLevel) return;
    hasCheckedLevelUp.current = true;

    try {
      const savedLevel = localStorage.getItem(LEVEL_STORAGE_KEY);
      if (savedLevel && savedLevel !== currentLevel.id) {
        // Verificar se subiu (não desceu)
        const savedIdx = ['iniciante','explorador','ativo','estrategico','avancado','elite'].indexOf(savedLevel);
        const currentIdx = ['iniciante','explorador','ativo','estrategico','avancado','elite'].indexOf(currentLevel.id);
        if (currentIdx > savedIdx) {
          toast.success(
            `🎉 Parabéns! Você subiu para o nível ${currentLevel.emoji} ${currentLevel.name}!`,
            { duration: 6000 }
          );
        }
      }
      localStorage.setItem(LEVEL_STORAGE_KEY, currentLevel.id);
    } catch {
      // localStorage pode falhar
    }
  }, [loading, currentLevel]);

  return {
    loading,
    activatedFeaturesCount,
    activationPercentage,
    totalFeatures: TOTAL_FEATURES,
    currentLevel,
    nextLevel,
    missingFeatures,
    suggestedFeatures,
    featuresUntilNextLevel,
    medals,
    monthlyGoal,
    activatedFeatures,
    refresh: loadData
  };
};
