/**
 * HOOK: useProfessionalJourney
 * 
 * Retorna progresso completo com PONTUAÇÃO DINÂMICA:
 * - Pontos calculados de features + automações + IA
 * - Nível atual e próximo (baseado em pontos)
 * - Breakdown de pontuação
 * - Features faltando
 * - Medalhas por categoria
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PLATFORM_FEATURES, TOTAL_FEATURES, FEATURE_MAP, DYNAMIC_COUNTS, getFeaturesByCategory, loadPlatformFeatures, updateFeatureMap } from '@/constants/platformFeatureInventory';
import { getCurrentLevel, getNextLevel, getPointsUntilNextLevel, getLevelProgress, calculateScore, calculateCategoryMedals, SCORING_RULES } from '@/utils/professionalLevels';
import { getProfessionalFeatureUsage, getOrCreateMonthlyGoal } from '@/utils/featureTracking';
import { getAutomationRules } from '@/lib/supabase';
import { toast } from 'sonner';

const LEVEL_STORAGE_KEY = 'fitjourney_pro_level';

export const useProfessionalJourney = (professionalId) => {
  const [loading, setLoading] = useState(true);
  const [activatedFeatures, setActivatedFeatures] = useState(new Set());
  const [aiFeatures, setAiFeatures] = useState(new Set());
  const [automationRules, setAutomationRules] = useState([]);
  const [monthlyGoal, setMonthlyGoal] = useState(null);
  const [scoreData, setScoreData] = useState({ totalPoints: 0, breakdown: [] });
  const hasCheckedLevelUp = useRef(false);
  const isMounted = useRef(true);

  const loadData = useCallback(async () => {
    if (!professionalId) {
      setLoading(false);
      return;
    }

    try {
      // Carregar features do banco (fonte única) + dados em paralelo
      const [featuresResult, usageData, automationsRes, goal] = await Promise.all([
        loadPlatformFeatures(),
        getProfessionalFeatureUsage(professionalId),
        getAutomationRules(professionalId),
        getOrCreateMonthlyGoal(professionalId)
      ]);

      // Anti-leak: se desmontou, abortar
      if (!isMounted.current) return;

      // Atualizar FEATURE_MAP com dados do banco se vieram de lá
      if (featuresResult.source === 'database' || featuresResult.source === 'cache') {
        updateFeatureMap(featuresResult.features);
      }

      // Features usadas
      const usedKeys = new Set(
        usageData.map(r => r.feature_key).filter(key => FEATURE_MAP[key])
      );
      setActivatedFeatures(usedKeys);

      // Features de IA usadas
      const aiKeys = new Set(
        usageData.map(r => r.feature_key).filter(key => FEATURE_MAP[key]?.is_ai)
      );
      setAiFeatures(aiKeys);

      // Automações
      const rules = automationsRes?.data || [];
      setAutomationRules(rules);

      // Contar acessos a relatórios esta semana
      const reportUsage = usageData.find(r => r.feature_key === 'view_weekly_report');
      const reportCount = reportUsage?.usage_count || 0;

      // Calcular pontuação
      const score = calculateScore({
        featuresUsed: usedKeys,
        aiFeatures: aiKeys,
        automationRules: rules,
        reportAccessCount: reportCount
      });
      setScoreData(score);

      setMonthlyGoal(goal);
    } catch {
      // Silencioso
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => { isMounted.current = false; };
  }, [loadData]);

  // Cálculos derivados baseados em PONTOS
  const totalPoints = scoreData.totalPoints;
  const activatedFeaturesCount = activatedFeatures.size;
  const activationPercentage = TOTAL_FEATURES > 0
    ? Math.round((activatedFeaturesCount / TOTAL_FEATURES) * 100)
    : 0;

  const currentLevel = getCurrentLevel(totalPoints);
  const nextLevel = getNextLevel(totalPoints);
  const pointsUntilNextLevel = getPointsUntilNextLevel(totalPoints);
  const levelProgress = getLevelProgress(totalPoints);

  // Features faltando
  const missingFeatures = PLATFORM_FEATURES.filter(f => !activatedFeatures.has(f.key));

  // Sugestão inteligente: priorizar IA > strategic > high
  const suggestedFeatures = [...missingFeatures].sort((a, b) => {
    // IA primeiro (vale mais pontos)
    if (a.is_ai && !b.is_ai) return -1;
    if (!a.is_ai && b.is_ai) return 1;
    const impactOrder = { strategic: 0, high: 1, medium: 2, basic: 3 };
    return (impactOrder[a.impactLevel] ?? 3) - (impactOrder[b.impactLevel] ?? 3);
  });

  // Medalhas por categoria
  const featuresByCategory = getFeaturesByCategory();
  const usedByCategory = {};
  for (const key of activatedFeatures) {
    const feature = FEATURE_MAP[key];
    if (feature) {
      if (!usedByCategory[feature.category]) usedByCategory[feature.category] = new Set();
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
        const levels = ['explorador', 'engajado', 'estrategico', 'profissional', 'elite'];
        const savedIdx = levels.indexOf(savedLevel);
        const currentIdx = levels.indexOf(currentLevel.id);
        if (currentIdx > savedIdx) {
          toast.success(`🎉 Parabéns! Você subiu para ${currentLevel.emoji} ${currentLevel.name}!`, { duration: 6000 });
        }
      }
      localStorage.setItem(LEVEL_STORAGE_KEY, currentLevel.id);
    } catch { /* localStorage pode falhar */ }
  }, [loading, currentLevel]);

  return {
    loading,
    // Pontuação
    totalPoints,
    scoreBreakdown: scoreData.breakdown,
    scoringRules: SCORING_RULES,
    // Features
    activatedFeaturesCount,
    activationPercentage,
    totalFeatures: TOTAL_FEATURES,
    dynamicCounts: DYNAMIC_COUNTS,
    aiFeatures,
    // Nível
    currentLevel,
    nextLevel,
    pointsUntilNextLevel,
    levelProgress,
    // Listas
    missingFeatures,
    suggestedFeatures,
    medals,
    monthlyGoal,
    activatedFeatures,
    automationRules,
    // Ação
    refresh: loadData,
    // Backward compat
    featuresUntilNextLevel: pointsUntilNextLevel
  };
};
