/**
 * RiskScoreCard Component
 * Card visual com análise multimodal de risco do paciente
 * FASE 1 - Intelligence Layer
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, Zap, Bone, Apple, AlertTriangle, 
  TrendingUp, TrendingDown, Minus, Info,
  ChevronRight, Shield, Activity
} from 'lucide-react';
import { calculateFullRiskScore, generateRiskSummary } from '@/utils/riskScoreEngine';

// Mapear ícones para cada categoria
const CATEGORY_ICONS = {
  cardiovascular: Heart,
  metabolic: Zap,
  musculoskeletal: Bone,
  nutritional: Apple
};

// Cores por nível de risco
const LEVEL_COLORS = {
  low: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
    progress: 'bg-green-500',
    icon: 'text-green-600'
  },
  moderate: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
    progress: 'bg-yellow-500',
    icon: 'text-yellow-600'
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-800',
    progress: 'bg-orange-500',
    icon: 'text-orange-600'
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    progress: 'bg-red-500',
    icon: 'text-red-600'
  }
};

/**
 * Score Circle - Indicador circular do score geral
 */
const ScoreCircle = ({ score, level }) => {
  const colors = LEVEL_COLORS[level.value] || LEVEL_COLORS.moderate;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">{level.label}</span>
      </div>
    </div>
  );
};

/**
 * Category Bar - Barra de progresso para cada categoria
 */
const CategoryBar = ({ category, data, compact = false }) => {
  const Icon = CATEGORY_ICONS[category] || Activity;
  const colors = LEVEL_COLORS[data.level.value] || LEVEL_COLORS.moderate;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Icon size={14} className={colors.icon} />
        <div className="flex-1">
          <Progress 
            value={data.score} 
            className="h-2"
          />
        </div>
        <span className="text-xs font-medium text-gray-600 w-8 text-right">
          {data.score}
        </span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={18} className={colors.icon} />
          <span className="font-medium text-gray-900">{data.label}</span>
        </div>
        <Badge className={colors.badge} variant="secondary">
          {data.score}/100
        </Badge>
      </div>
      <Progress 
        value={data.score} 
        className="h-2 mb-2"
      />
      {data.factors.length > 0 && (
        <div className="text-xs text-gray-600">
          {data.factors.slice(0, 2).map((f, i) => (
            <span key={i} className="inline-block mr-2">
              • {f.factor}: {f.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Alert Item - Item de alerta priorizado
 */
const AlertItem = ({ alert }) => {
  const isUrgent = alert.priority === 1;
  
  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg ${
      isUrgent ? 'bg-red-50' : 'bg-orange-50'
    }`}>
      <AlertTriangle 
        size={16} 
        className={isUrgent ? 'text-red-500 flex-shrink-0 mt-0.5' : 'text-orange-500 flex-shrink-0 mt-0.5'} 
      />
      <div>
        <p className={`text-sm font-medium ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
          {alert.category}
        </p>
        <p className="text-xs text-gray-600">{alert.message}</p>
      </div>
    </div>
  );
};

/**
 * Recommendation Item - Item de recomendação
 */
const RecommendationItem = ({ recommendation, index }) => {
  const priorityColors = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="flex items-start gap-2">
      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
        priorityColors[recommendation.priority] || priorityColors.medium
      }`}>
        {index + 1}
      </span>
      <p className="text-sm text-gray-700">{recommendation.action}</p>
    </div>
  );
};

/**
 * RiskScoreCard - Componente principal
 */
const RiskScoreCard = ({ 
  anamnesis = {}, 
  assessment = {}, 
  patient = {},
  previousScore = null,
  variant = 'full', // 'full', 'compact', 'mini'
  onViewDetails = null
}) => {
  // Calcular Risk Score
  const riskScore = useMemo(() => {
    return calculateFullRiskScore({ anamnesis, assessment, patient });
  }, [anamnesis, assessment, patient]);

  const { overall, level, categories, alerts, recommendations } = riskScore;

  // Verificar se tem dados suficientes
  const hasData = anamnesis && (
    anamnesis.medical_conditions?.length > 0 ||
    anamnesis.current_weight ||
    assessment?.weight ||
    assessment?.blood_pressure_systolic
  );

  // Variante MINI - Apenas badge
  if (variant === 'mini') {
    if (!hasData) return null;
    
    const colors = LEVEL_COLORS[level.value];
    return (
      <Badge className={`${colors.badge} gap-1`}>
        <Shield size={12} />
        Risk: {overall}
      </Badge>
    );
  }

  // Variante COMPACT - Card pequeno
  if (variant === 'compact') {
    if (!hasData) return null;

    const colors = LEVEL_COLORS[level.value];
    return (
      <Card className={`${colors.bg} ${colors.border} border-2`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className={colors.icon} size={20} />
              <span className="font-semibold text-gray-900">Risk Score</span>
            </div>
            <Badge className={colors.badge}>{overall}/100</Badge>
          </div>
          
          <div className="space-y-2">
            {Object.entries(categories).map(([key, data]) => (
              <CategoryBar key={key} category={key} data={data} compact />
            ))}
          </div>

          {onViewDetails && (
            <button 
              onClick={onViewDetails}
              className={`mt-3 w-full py-2 text-sm font-medium rounded-lg ${colors.text} hover:bg-white/50 transition-colors flex items-center justify-center gap-1`}
            >
              Ver Detalhes <ChevronRight size={14} />
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Variante FULL - Card completo
  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="text-teal-600" size={22} />
          Análise de Risco Multimodal
        </CardTitle>
        {patient?.name && (
          <p className="text-sm text-gray-500 mt-1">
            {generateRiskSummary(riskScore, patient.name)}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="text-center py-8">
            <Info size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              Preencha a anamnese e avaliação física para visualizar a análise de risco.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score Geral */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ScoreCircle score={overall} level={level} />
              
              <div className="flex-1 w-full">
                <h4 className="font-medium text-gray-700 mb-3">Categorias de Risco</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(categories).map(([key, data]) => (
                    <CategoryBar key={key} category={key} data={data} />
                  ))}
                </div>
              </div>
            </div>

            {/* Alertas */}
            {alerts.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  Pontos de Atenção
                </h4>
                <div className="space-y-2">
                  {alerts.map((alert, i) => (
                    <AlertItem key={i} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Recomendações */}
            {recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" />
                  Recomendações Prioritárias
                </h4>
                <div className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <RecommendationItem key={i} recommendation={rec} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Evolução (se houver score anterior) */}
            {previousScore && (
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" />
                  Evolução
                </h4>
                <div className="flex items-center gap-4">
                  {overall > previousScore.overall ? (
                    <>
                      <TrendingUp className="text-green-500" size={24} />
                      <span className="text-green-600 font-medium">
                        +{overall - previousScore.overall} pontos desde a última avaliação
                      </span>
                    </>
                  ) : overall < previousScore.overall ? (
                    <>
                      <TrendingDown className="text-red-500" size={24} />
                      <span className="text-red-600 font-medium">
                        {overall - previousScore.overall} pontos desde a última avaliação
                      </span>
                    </>
                  ) : (
                    <>
                      <Minus className="text-gray-500" size={24} />
                      <span className="text-gray-600 font-medium">
                        Score estável desde a última avaliação
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-gray-400 text-right">
              Calculado em: {new Date(riskScore.calculatedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskScoreCard;
