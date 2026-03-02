/**
 * BANNER PREMIUM - JORNADA PROFISSIONAL
 * 
 * Exibe no topo do Dashboard:
 * - Nível atual com badge estilizado
 * - Barra de progresso animada
 * - Contagem de features ativadas
 * - Features até próximo nível
 * - 3 sugestões inteligentes com CTA
 * - Medalhas por categoria
 * - Meta mensal
 * - Botão "Explorar Central de Recursos"
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight, ChevronDown, ChevronUp, ArrowRight,
  Trophy, Star, Sparkles, Target, BookOpen, Zap
} from 'lucide-react';
import { useProfessionalJourney } from '@/hooks/useProfessionalJourney';
import { CATEGORY_EMOJIS, CATEGORY_GRADIENTS, PLATFORM_FEATURES, FEATURE_CATEGORIES } from '@/constants/platformFeatureInventory';

const ProfessionalJourneyBanner = ({ professionalId }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const {
    loading,
    activatedFeaturesCount,
    activationPercentage,
    totalFeatures,
    currentLevel,
    nextLevel,
    suggestedFeatures,
    featuresUntilNextLevel,
    medals,
    monthlyGoal,
    activatedFeatures
  } = useProfessionalJourney(professionalId);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden animate-pulse">
        <CardContent className="p-6">
          <div className="h-24 bg-gray-100 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!currentLevel) return null;

  const LevelIcon = currentLevel.icon;
  const topSuggestions = suggestedFeatures.slice(0, 3);

  return (
    <Card className="border-0 shadow-xl overflow-hidden relative">
      {/* Gradient top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${currentLevel.badgeColor}`} />

      <CardContent className="p-0">
        {/* Main Banner */}
        <div className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Level Badge */}
            <div className="flex items-center gap-4 flex-1">
              <div className={`
                relative w-16 h-16 rounded-2xl bg-gradient-to-br ${currentLevel.badgeColor}
                flex items-center justify-center text-white shadow-xl flex-shrink-0
              `}>
                <LevelIcon className="h-8 w-8" />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-gray-900 text-lg">Jornada Profissional</h3>
                  <Badge className={`bg-gradient-to-r ${currentLevel.badgeColor} text-white border-0 text-[10px] font-bold shadow-sm`}>
                    {currentLevel.emoji} {currentLevel.name}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">
                      Você ativou <strong className="text-gray-900">{activatedFeaturesCount}</strong> de <strong className="text-gray-900">{totalFeatures}</strong> funcionalidades ({activationPercentage}%)
                    </span>
                    {nextLevel && (
                      <span className={`font-semibold ${currentLevel.textColor}`}>
                        {featuresUntilNextLevel} para {nextLevel.emoji} {nextLevel.name}
                      </span>
                    )}
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full bg-gradient-to-r ${currentLevel.badgeColor} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${Math.max(2, activationPercentage)}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-1.5 italic">{currentLevel.message}</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => setExpanded(!expanded)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {expanded ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
                {expanded ? 'Menos' : 'Detalhes'}
              </Button>
              <Button
                onClick={() => navigate('/professional/guide')}
                size="sm"
                className={`bg-gradient-to-r ${currentLevel.badgeColor} text-white hover:opacity-90 text-xs shadow-md`}
              >
                <BookOpen className="mr-1 h-3.5 w-3.5" />
                Central de Recursos
              </Button>
            </div>
          </div>

          {/* Medals Row (always visible if any) */}
          {medals.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {medals.map(medal => (
                <Badge
                  key={medal.category}
                  className={`
                    text-[10px] border-0 font-semibold px-2.5 py-1
                    ${medal.type === 'gold' ? 'bg-amber-100 text-amber-800' :
                      medal.type === 'silver' ? 'bg-gray-100 text-gray-700' :
                      'bg-orange-100 text-orange-700'
                    }
                  `}
                >
                  {medal.emoji} {medal.label} em {medal.category}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="border-t border-gray-100 bg-gray-50/50 p-5 md:p-6 space-y-5">
            {/* Monthly Goal */}
            {monthlyGoal && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="font-bold text-gray-900 text-sm">Meta do Mês</span>
                  {monthlyGoal.month_reference && (
                    <Badge className="bg-purple-100 text-purple-700 text-[9px] border-0">
                      {monthlyGoal.month_reference}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Ativar <strong>{monthlyGoal.target_features_to_activate}</strong> novas funcionalidades
                </p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, monthlyGoal.target_features_to_activate > 0
                        ? ((monthlyGoal.activated_count || 0) / monthlyGoal.target_features_to_activate) * 100
                        : 0
                      )}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {monthlyGoal.activated_count || 0} de {monthlyGoal.target_features_to_activate} ativadas este mês
                </p>
              </div>
            )}

            {/* Smart Suggestions */}
            {topSuggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-gray-900 text-sm">Sugestões Inteligentes</span>
                  <Badge className="bg-amber-100 text-amber-700 text-[9px] border-0">IA</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {topSuggestions.map(feature => {
                    const gradient = CATEGORY_GRADIENTS[feature.category] || 'from-gray-400 to-gray-500';
                    const emoji = CATEGORY_EMOJIS[feature.category] || '⚡';
                    return (
                      <button
                        key={feature.key}
                        onClick={() => feature.route && navigate(feature.route)}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all text-left group"
                      >
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                          <span className="text-sm">{emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-xs truncate">{feature.label}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-2">{feature.description}</p>
                          <span className={`
                            inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full
                            ${feature.impactLevel === 'strategic' ? 'bg-purple-100 text-purple-700' :
                              feature.impactLevel === 'high' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }
                          `}>
                            {feature.impactLevel === 'strategic' ? '⭐ Estratégico' :
                             feature.impactLevel === 'high' ? '🔥 Alto Impacto' :
                             '📌 Médio Impacto'}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-purple-500 flex-shrink-0 mt-1 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Progress */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-teal-500" />
                <span className="font-bold text-gray-900 text-sm">Progresso por Categoria</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(CATEGORY_EMOJIS).map(([category, emoji]) => {
                  const gradient = CATEGORY_GRADIENTS[category] || 'from-gray-400 to-gray-500';
                  const catFeatures = PLATFORM_FEATURES.filter(f => f.category === category);
                  const totalCount = catFeatures.length;
                  const medalData = medals.find(m => m.category === category);
                  // Calcular contagem real de features ativadas nesta categoria
                  const usedCount = medalData 
                    ? medalData.usedCount 
                    : catFeatures.filter(f => activatedFeatures.has(f.key)).length;
                  const pct = totalCount > 0 ? Math.round((usedCount / totalCount) * 100) : 0;

                  return (
                    <div key={category} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                      <div className={`w-8 h-8 mx-auto rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm mb-1`}>
                        <span className="text-sm">{emoji}</span>
                      </div>
                      <p className="font-semibold text-gray-900 text-[11px] truncate">{category}</p>
                      <p className="text-[10px] text-gray-500">{usedCount}/{totalCount}</p>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1 mx-1">
                        <div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      {medalData && (
                        <span className="text-xs">{medalData.emoji}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessionalJourneyBanner;
