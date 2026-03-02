/**
 * SISTEMA DE NÍVEIS DA JORNADA PROFISSIONAL
 * 
 * Baseado em percentual real de funcionalidades ativadas.
 * Cada nível tem nome, cor, ícone, mensagem e threshold.
 */

import {
  Sprout, Compass, Flame, Target, Rocket, Crown
} from 'lucide-react';

export const PROFESSIONAL_LEVELS = [
  {
    id: 'iniciante',
    name: 'Iniciante',
    minPercent: 0,
    maxPercent: 10,
    badgeColor: 'from-gray-400 to-gray-500',
    badgeBg: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: Sprout,
    emoji: '🌱',
    message: 'Bem-vindo à FitJourney! Explore as funcionalidades para começar.',
    nextThreshold: 10
  },
  {
    id: 'explorador',
    name: 'Explorador',
    minPercent: 10,
    maxPercent: 30,
    badgeColor: 'from-blue-400 to-blue-600',
    badgeBg: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: Compass,
    emoji: '🧭',
    message: 'Ótimo início! Continue descobrindo o potencial da plataforma.',
    nextThreshold: 30
  },
  {
    id: 'ativo',
    name: 'Ativo',
    minPercent: 30,
    maxPercent: 50,
    badgeColor: 'from-emerald-400 to-emerald-600',
    badgeBg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    icon: Flame,
    emoji: '🔥',
    message: 'Você está no ritmo! Já domina as bases da plataforma.',
    nextThreshold: 50
  },
  {
    id: 'estrategico',
    name: 'Estratégico',
    minPercent: 50,
    maxPercent: 75,
    badgeColor: 'from-purple-400 to-purple-600',
    badgeBg: 'bg-purple-100',
    textColor: 'text-purple-700',
    icon: Target,
    emoji: '🎯',
    message: 'Impressionante! Você usa a plataforma de forma estratégica.',
    nextThreshold: 75
  },
  {
    id: 'avancado',
    name: 'Avançado',
    minPercent: 75,
    maxPercent: 90,
    badgeColor: 'from-orange-400 to-orange-600',
    badgeBg: 'bg-orange-100',
    textColor: 'text-orange-700',
    icon: Rocket,
    emoji: '🚀',
    message: 'Quase lá! Faltam poucos recursos para dominar tudo.',
    nextThreshold: 90
  },
  {
    id: 'elite',
    name: 'Profissional Elite',
    minPercent: 90,
    maxPercent: 100,
    badgeColor: 'from-amber-400 to-yellow-500',
    badgeBg: 'bg-amber-100',
    textColor: 'text-amber-700',
    icon: Crown,
    emoji: '👑',
    message: 'Parabéns! Você é um Profissional Elite da FitJourney!',
    nextThreshold: 100
  }
];

/**
 * Calcula o nível atual baseado no percentual de ativação
 * @param {number} activationPercentage - Percentual de features ativadas (0-100)
 * @returns {object} Nível atual
 */
export const getCurrentLevel = (activationPercentage) => {
  const pct = Math.min(100, Math.max(0, activationPercentage));
  for (let i = PROFESSIONAL_LEVELS.length - 1; i >= 0; i--) {
    if (pct >= PROFESSIONAL_LEVELS[i].minPercent) {
      return PROFESSIONAL_LEVELS[i];
    }
  }
  return PROFESSIONAL_LEVELS[0];
};

/**
 * Calcula o próximo nível
 * @param {number} activationPercentage
 * @returns {object|null} Próximo nível ou null se já é Elite
 */
export const getNextLevel = (activationPercentage) => {
  const current = getCurrentLevel(activationPercentage);
  const currentIdx = PROFESSIONAL_LEVELS.findIndex(l => l.id === current.id);
  if (currentIdx < PROFESSIONAL_LEVELS.length - 1) {
    return PROFESSIONAL_LEVELS[currentIdx + 1];
  }
  return null;
};

/**
 * Calcula quantas features faltam para o próximo nível
 * @param {number} activatedCount - Features ativadas
 * @param {number} totalFeatures - Total de features
 * @returns {number} Features faltando para próximo nível
 */
export const getFeaturesUntilNextLevel = (activatedCount, totalFeatures) => {
  const pct = totalFeatures > 0 ? (activatedCount / totalFeatures) * 100 : 0;
  const nextLevel = getNextLevel(pct);
  if (!nextLevel) return 0;
  const neededCount = Math.ceil((nextLevel.minPercent / 100) * totalFeatures);
  return Math.max(0, neededCount - activatedCount);
};

/**
 * Calcula medalhas por categoria
 * @param {object} usedByCategory - { categoryName: Set<featureKey> }
 * @param {object} featuresByCategory - { categoryName: Feature[] }
 * @returns {Array} Medalhas ganhas
 */
export const calculateCategoryMedals = (usedByCategory, featuresByCategory) => {
  const medals = [];
  for (const [category, features] of Object.entries(featuresByCategory)) {
    const totalInCategory = features.length;
    const usedInCategory = usedByCategory[category]?.size || 0;
    const percentage = totalInCategory > 0 ? (usedInCategory / totalInCategory) * 100 : 0;

    let medal = null;
    if (percentage >= 100) {
      medal = { type: 'gold', emoji: '🥇', label: 'Mestre' };
    } else if (percentage >= 75) {
      medal = { type: 'silver', emoji: '🥈', label: 'Avançado' };
    } else if (percentage >= 50) {
      medal = { type: 'bronze', emoji: '🥉', label: 'Ativo' };
    }

    if (medal) {
      medals.push({
        category,
        ...medal,
        usedCount: usedInCategory,
        totalCount: totalInCategory,
        percentage: Math.round(percentage)
      });
    }
  }
  return medals.sort((a, b) => b.percentage - a.percentage);
};
