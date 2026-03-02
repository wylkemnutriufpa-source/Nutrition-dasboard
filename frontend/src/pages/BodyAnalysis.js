import React, { useState, useRef, useCallback, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Camera, Upload, Loader2, AlertCircle, CheckCircle2, 
  User, TrendingUp, TrendingDown, Minus, RefreshCw, X, 
  ChevronDown, ChevronUp, Activity, Target, Sparkles,
  Award, Flame, Star, Crown, Medal, Zap, Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  uploadBodyPhoto,
  createBodyAnalysis,
  updateBodyAnalysis,
  listPatientBodyAnalyses,
  getLastBodyAnalysis
} from '@/lib/supabase';
import { trackProfessionalFeature } from '@/utils/featureTracking';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== BADGES/CONQUISTAS ====================

const ACHIEVEMENT_BADGES = [
  { id: 'first_analysis', icon: Star, label: 'Primeira Análise', color: 'from-yellow-400 to-amber-500', condition: (history) => history.length >= 1 },
  { id: 'consistent_3', icon: Flame, label: '3 Análises', color: 'from-orange-400 to-red-500', condition: (history) => history.length >= 3 },
  { id: 'consistent_5', icon: Crown, label: '5 Análises', color: 'from-purple-400 to-pink-500', condition: (history) => history.length >= 5 },
  { id: 'improvement', icon: TrendingUp, label: 'Em Evolução', color: 'from-green-400 to-emerald-500', condition: (history) => {
    if (history.length < 2) return false;
    return history[0]?.overall_score > history[1]?.overall_score;
  }},
  { id: 'high_score', icon: Medal, label: 'Score 70+', color: 'from-blue-400 to-indigo-500', condition: (history) => history.some(h => h.overall_score >= 70) },
  { id: 'dedication', icon: Heart, label: 'Dedicação', color: 'from-pink-400 to-rose-500', condition: (history) => history.length >= 10 },
];

const AchievementBadge = ({ badge, unlocked }) => {
  const Icon = badge.icon;
  return (
    <div className={`relative group ${!unlocked && 'opacity-40 grayscale'}`}>
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-lg transform transition-all ${unlocked ? 'hover:scale-110 hover:shadow-xl' : ''}`}>
        <Icon className="h-7 w-7 text-white" />
      </div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[10px] font-medium text-gray-600">{badge.label}</span>
      </div>
      {unlocked && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
};

// ==================== GRÁFICO DE EVOLUÇÃO ====================

const EvolutionChart = ({ history }) => {
  if (!history || history.length < 2) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6 text-center">
          <Activity className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Faça mais análises para ver sua evolução</p>
          <p className="text-xs text-gray-400">Mínimo 2 análises necessárias</p>
        </CardContent>
      </Card>
    );
  }

  // Últimas 6 análises (ordem cronológica)
  const data = [...history].reverse().slice(-6);
  const maxScore = 100;
  const maxFat = 40;

  return (
    <Card className="border-gray-200 overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-600" />
          Evolução ao Longo do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Score Geral */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Score Geral</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
              </div>
            </div>
            <div className="flex items-end gap-1 h-20">
              {data.map((item, i) => {
                const height = (item.overall_score / maxScore) * 100;
                const isLast = i === data.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full rounded-t-lg transition-all ${isLast ? 'bg-gradient-to-t from-purple-600 to-indigo-500' : 'bg-gradient-to-t from-purple-300 to-indigo-300'}`}
                      style={{ height: `${height}%`, minHeight: '8px' }}
                    />
                    <span className="text-[9px] text-gray-400 mt-1">
                      {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* % Gordura */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">% Gordura Estimada</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
              </div>
            </div>
            <div className="flex items-end gap-1 h-16">
              {data.map((item, i) => {
                const height = ((item.body_fat_estimate || 20) / maxFat) * 100;
                const isLast = i === data.length - 1;
                return (
                  <div key={i} className="flex-1">
                    <div 
                      className={`w-full rounded-t-lg ${isLast ? 'bg-gradient-to-t from-amber-600 to-orange-500' : 'bg-gradient-to-t from-amber-300 to-orange-300'}`}
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Definição Muscular */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Definição Muscular</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
              </div>
            </div>
            <div className="flex items-end gap-1 h-12">
              {data.map((item, i) => {
                const height = ((item.muscle_definition || 5) / 10) * 100;
                const isLast = i === data.length - 1;
                return (
                  <div key={i} className="flex-1">
                    <div 
                      className={`w-full rounded-t-lg ${isLast ? 'bg-gradient-to-t from-teal-600 to-emerald-500' : 'bg-gradient-to-t from-teal-300 to-emerald-300'}`}
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== COMPONENTES DE UI ====================

const PhotoUploadBox = ({ position, label, file, preview, onSelect, onRemove, disabled }) => {
  const inputRef = useRef(null);
  
  const positionEmojis = { front: '🧍', side: '🧍‍♂️', back: '🔙' };

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
        <span>{positionEmojis[position]}</span> {label}
      </p>
      <div 
        className={`relative w-24 h-32 sm:w-28 sm:h-36 rounded-2xl border-2 border-dashed transition-all overflow-hidden shadow-sm
          ${preview ? 'border-teal-400 bg-teal-50 shadow-teal-100' : 'border-gray-300 hover:border-teal-400 hover:shadow-md bg-gray-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && !preview && inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-lg transition-all hover:scale-110"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 hover:text-teal-500 transition-colors">
            <Camera className="h-8 w-8 mb-2" />
            <span className="text-[10px] font-medium">Adicionar</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onSelect(e.target.files?.[0])}
        capture="environment"
      />
    </div>
  );
};

const ScoreCard = ({ value, label, icon: Icon, gradient, subtext }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-lg`}>
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-5 w-5 opacity-80" />
        <span className="text-xs font-medium opacity-90">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {subtext && <p className="text-xs opacity-75 mt-1">{subtext}</p>}
    </div>
  </div>
);

const RegionAnalysisCard = ({ region, data }) => {
  const regionLabels = {
    shoulders: { label: 'Ombros', emoji: '💪' },
    chest: { label: 'Peitoral', emoji: '🫁' },
    abdomen: { label: 'Abdômen', emoji: '🎯' },
    arms: { label: 'Braços', emoji: '💪' },
    legs: { label: 'Pernas', emoji: '🦵' },
    back: { label: 'Costas', emoji: '🔙' }
  };
  
  const info = regionLabels[region] || { label: region, emoji: '📊' };
  const score = data?.score || 5;
  
  const getColor = (s) => {
    if (s >= 7) return 'from-green-500 to-emerald-500';
    if (s >= 5) return 'from-yellow-500 to-amber-500';
    return 'from-red-500 to-orange-500';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <span>{info.emoji}</span> {info.label}
        </span>
        <Badge className={`bg-gradient-to-r ${getColor(score)} text-white border-0`}>
          {score}/10
        </Badge>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${getColor(score)} transition-all duration-700`} 
          style={{ width: `${score * 10}%` }} 
        />
      </div>
      {data?.notes && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{data.notes}</p>
      )}
    </div>
  );
};

const ComparisonCard = ({ comparison }) => {
  if (!comparison) return null;

  const getProgressColor = () => {
    if (comparison.overall_progress === 'positive') return 'from-green-500 to-emerald-600';
    if (comparison.overall_progress === 'stable') return 'from-yellow-500 to-amber-600';
    return 'from-red-500 to-orange-600';
  };

  const getProgressIcon = () => {
    if (comparison.overall_progress === 'positive') return TrendingUp;
    if (comparison.overall_progress === 'stable') return Minus;
    return TrendingDown;
  };

  const ProgressIcon = getProgressIcon();

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className={`bg-gradient-to-r ${getProgressColor()} p-4 text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <ProgressIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm opacity-90">Comparação com Anterior</p>
            <p className="text-2xl font-bold">Progresso: {comparison.progress_score}/100</p>
          </div>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Gordura</p>
            <p className={`text-lg font-bold ${comparison.body_fat_change <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {comparison.body_fat_change > 0 ? '+' : ''}{comparison.body_fat_change}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Definição</p>
            <p className={`text-lg font-bold ${comparison.muscle_definition_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {comparison.muscle_definition_change > 0 ? '+' : ''}{comparison.muscle_definition_change}
            </p>
          </div>
        </div>
        
        {comparison.highlights?.length > 0 && (
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Destaques
            </p>
            {comparison.highlights.map((h, i) => (
              <p key={i} className="text-sm text-green-700 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {h}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const HistoryCard = ({ analysis, expanded, onToggle }) => {
  const date = new Date(analysis.created_at);
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
  const typeLabels = { baseline: '📍 Baseline', progress: '📈 Progresso', feedback: '💬 Feedback' };
  
  const getScoreGradient = (score) => {
    if (score >= 70) return 'from-green-500 to-emerald-600';
    if (score >= 40) return 'from-yellow-500 to-amber-600';
    return 'from-red-500 to-orange-600';
  };
  
  return (
    <Card className={`border-0 shadow-md hover:shadow-lg transition-all overflow-hidden ${expanded ? 'ring-2 ring-teal-400' : ''}`}>
      <div className="flex items-center p-4 cursor-pointer" onClick={onToggle}>
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getScoreGradient(analysis.overall_score)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
          {analysis.overall_score || '?'}
        </div>
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{typeLabels[analysis.analysis_type] || 'Análise'}</p>
            {analysis.comparison_result?.overall_progress === 'positive' && (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
          </div>
          <p className="text-sm text-gray-500">
            {dateStr} • BF: {analysis.body_fat_estimate}% • Def: {analysis.muscle_definition}/10
          </p>
        </div>
        <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3 animate-fade-in">
          <p className="text-sm text-gray-700">{analysis.ai_feedback}</p>
          
          {analysis.comparison_result?.highlights?.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl">
              <p className="text-xs font-semibold text-green-800 mb-1">✨ Destaques:</p>
              {analysis.comparison_result.highlights.map((h, i) => (
                <p key={i} className="text-sm text-green-700">• {h}</p>
              ))}
            </div>
          )}
          
          {analysis.recommendations?.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-xl">
              <p className="text-xs font-semibold text-amber-800 mb-1">💡 Recomendações:</p>
              {analysis.recommendations.slice(0, 2).map((r, i) => (
                <p key={i} className="text-sm text-amber-700">• {r}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const AnalysisSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      ))}
    </div>
    <div className="h-48 rounded-2xl bg-gray-200 animate-pulse" />
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />
      ))}
    </div>
  </div>
);

// ==================== PÁGINA PRINCIPAL ====================

const BodyAnalysis = () => {
  const { profile } = useAuth();
  
  const [photos, setPhotos] = useState({ front: null, side: null, back: null });
  const [previews, setPreviews] = useState({ front: null, side: null, back: null });
  const [notes, setNotes] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [previousAnalysis, setPreviousAnalysis] = useState(null);

  // Carregar histórico
  const loadHistory = useCallback(async () => {
    if (!profile?.id) return;
    setHistoryLoading(true);
    
    const [historyResult, lastResult] = await Promise.all([
      listPatientBodyAnalyses(profile.id, 20),
      getLastBodyAnalysis(profile.id)
    ]);
    
    setHistory(historyResult.data || []);
    setPreviousAnalysis(lastResult.data || null);
    setHistoryLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Calcular badges desbloqueados
  const unlockedBadges = ACHIEVEMENT_BADGES.filter(badge => badge.condition(history));

  // Handlers de foto
  const handlePhotoSelect = (position, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Use JPEG, PNG ou WEBP');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Máximo 15MB por foto');
      return;
    }
    setPhotos(prev => ({ ...prev, [position]: file }));
    setPreviews(prev => ({ ...prev, [position]: URL.createObjectURL(file) }));
    setResult(null);
    setError(null);
  };

  const handlePhotoRemove = (position) => {
    setPhotos(prev => ({ ...prev, [position]: null }));
    setPreviews(prev => ({ ...prev, [position]: null }));
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });
  };

  // Analisar
  const handleAnalyze = async () => {
    const hasPhotos = photos.front || photos.side || photos.back;
    if (!hasPhotos || !profile?.id) {
      toast.error('Adicione pelo menos uma foto');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Upload fotos
      const paths = {};
      for (const pos of ['front', 'side', 'back']) {
        if (photos[pos]) {
          const { path } = await uploadBodyPhoto(photos[pos], profile.id, pos);
          paths[pos] = path;
        }
      }

      // Criar registro
      const { data: analysisRecord } = await createBodyAnalysis({
        patientId: profile.id,
        photoFront: paths.front,
        photoSide: paths.side,
        photoBack: paths.back,
        analysisType: previousAnalysis ? 'progress' : 'baseline',
        notes: notes || null
      });

      // Converter para base64
      const images = {};
      for (const pos of ['front', 'side', 'back']) {
        if (photos[pos]) {
          images[pos] = await fileToBase64(photos[pos]);
        }
      }

      // Chamar API
      const response = await fetch(`${BACKEND_URL}/api/analyze-body`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          patient_id: profile.id,
          previous_analysis: previousAnalysis ? {
            body_fat_estimate: previousAnalysis.body_fat_estimate,
            muscle_definition: previousAnalysis.muscle_definition,
            overall_score: previousAnalysis.overall_score,
            created_at: previousAnalysis.created_at
          } : null,
          analysis_type: previousAnalysis ? 'progress' : 'baseline'
        })
      });

      if (!response.ok) {
        throw new Error(`Erro do servidor: ${response.status}`);
      }

      const aiResult = await response.json();

      if (!aiResult.success) {
        throw new Error(aiResult.error || 'Erro na análise');
      }

      const analysisData = aiResult.data;
      setResult(analysisData);

      // Atualizar banco
      if (analysisRecord?.id) {
        await updateBodyAnalysis(analysisRecord.id, {
          status: 'done',
          body_fat_estimate: analysisData.body_fat_estimate,
          muscle_definition: analysisData.muscle_definition,
          body_type: analysisData.body_type,
          fat_distribution: analysisData.fat_distribution || {},
          region_analysis: analysisData.region_analysis || {},
          posture_score: analysisData.posture_score,
          posture_notes: analysisData.posture_notes,
          overall_score: analysisData.overall_score,
          ai_feedback: analysisData.ai_feedback,
          recommendations: analysisData.recommendations || [],
          previous_analysis_id: previousAnalysis?.id || null,
          comparison_result: analysisData.comparison || null
        });
      }

      toast.success('Análise concluída! 💪');
      loadHistory();

    } catch (err) {
      console.error('Erro na análise:', err);
      setError(err.message || 'Erro ao analisar');
      toast.error('Erro na análise');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setPhotos({ front: null, side: null, back: null });
    setPreviews({ front: null, side: null, back: null });
    setNotes('');
    setResult(null);
    setError(null);
  };

  const hasAnyPhoto = photos.front || photos.side || photos.back;

  return (
    <Layout title="Análise Corporal" userType="patient">
      <div className="max-w-2xl mx-auto space-y-6 pb-8 px-4">

        {/* HEADER PREMIUM */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 p-6 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Análise Corporal</h1>
                <p className="text-purple-200 text-sm">Acompanhe sua evolução física</p>
              </div>
            </div>
            
            {previousAnalysis && (
              <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 w-fit">
                <Activity className="h-4 w-4" />
                <span className="text-sm">
                  Última: {new Date(previousAnalysis.created_at).toLocaleDateString('pt-BR')} • Score: {previousAnalysis.overall_score}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CONQUISTAS */}
        {history.length > 0 && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-yellow-50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                Suas Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex justify-center gap-4 flex-wrap pb-4">
                {ACHIEVEMENT_BADGES.slice(0, 5).map(badge => (
                  <AchievementBadge 
                    key={badge.id} 
                    badge={badge} 
                    unlocked={unlockedBadges.some(u => u.id === badge.id)} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* UPLOAD */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="h-5 w-5 text-teal-600" />
              Fotos para Análise
            </CardTitle>
            <p className="text-xs text-gray-500">Envie 1 a 3 fotos para uma análise completa</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-3 sm:gap-4">
              <PhotoUploadBox
                position="front"
                label="Frente"
                file={photos.front}
                preview={previews.front}
                onSelect={(f) => handlePhotoSelect('front', f)}
                onRemove={() => handlePhotoRemove('front')}
                disabled={analyzing}
              />
              <PhotoUploadBox
                position="side"
                label="Lado"
                file={photos.side}
                preview={previews.side}
                onSelect={(f) => handlePhotoSelect('side', f)}
                onRemove={() => handlePhotoRemove('side')}
                disabled={analyzing}
              />
              <PhotoUploadBox
                position="back"
                label="Costas"
                file={photos.back}
                preview={previews.back}
                onSelect={(f) => handlePhotoSelect('back', f)}
                onRemove={() => handlePhotoRemove('back')}
                disabled={analyzing}
              />
            </div>

            <Textarea
              placeholder="Observações (opcional): Como está se sentindo?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm resize-none"
              rows={2}
              disabled={analyzing}
            />

            <div className="flex gap-3">
              <Button
                onClick={handleAnalyze}
                disabled={!hasAnyPhoto || analyzing}
                className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200"
              >
                {analyzing ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analisando...</>
                ) : (
                  <><Sparkles className="mr-2 h-5 w-5" /> Analisar Composição</>
                )}
              </Button>
              {hasAnyPhoto && !analyzing && (
                <Button variant="outline" onClick={handleReset} className="h-12">
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* LOADING */}
        {analyzing && <AnalysisSkeleton />}

        {/* ERRO */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-semibold text-red-800">Erro na análise</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RESULTADO */}
        {result && (
          <div className="space-y-4 animate-fade-in-up">
            
            {/* Scores principais */}
            <div className="grid grid-cols-3 gap-3">
              <ScoreCard 
                value={result.overall_score} 
                label="Score Geral" 
                icon={Target}
                gradient="from-purple-500 to-indigo-600"
              />
              <ScoreCard 
                value={`${result.body_fat_estimate}%`} 
                label="Gordura Est." 
                icon={Activity}
                gradient="from-amber-500 to-orange-600"
              />
              <ScoreCard 
                value={`${result.muscle_definition}/10`} 
                label="Definição" 
                icon={Zap}
                gradient="from-teal-500 to-emerald-600"
              />
            </div>

            {/* Biotipo e Postura */}
            <div className="flex gap-2 flex-wrap justify-center">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-4 py-1.5">
                {result.body_type}
              </Badge>
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 px-4 py-1.5">
                Postura: {result.posture_score}/10
              </Badge>
            </div>

            {/* Comparação */}
            {result.comparison && <ComparisonCard comparison={result.comparison} />}

            {/* Análise por região */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  Análise por Região
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {Object.entries(result.region_analysis || {}).map(([region, data]) => (
                  <RegionAnalysisCard key={region} region={region} data={data} />
                ))}
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-teal-900 mb-1">Feedback da IA</p>
                    <p className="text-sm text-teal-800">{result.ai_feedback}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recomendações */}
            {(result.recommendations || []).length > 0 && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
                <CardContent className="p-4">
                  <p className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Recomendações Personalizadas
                  </p>
                  <div className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 bg-white/60 rounded-xl p-3">
                        <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-amber-900">{r}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleReset} variant="outline" className="w-full h-12">
              <Camera className="mr-2 h-5 w-5" />
              Nova Análise
            </Button>
          </div>
        )}

        {/* GRÁFICO DE EVOLUÇÃO */}
        <EvolutionChart history={history} />

        {/* HISTÓRICO */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Histórico de Análises
            </h2>
            <Button variant="ghost" size="sm" onClick={loadHistory} className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-700">Nenhuma análise ainda</p>
                <p className="text-sm text-gray-500 mt-1">Envie suas primeiras fotos para começar!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((analysis) => (
                <HistoryCard
                  key={analysis.id}
                  analysis={analysis}
                  expanded={expandedHistory === analysis.id}
                  onToggle={() => setExpandedHistory(expandedHistory === analysis.id ? null : analysis.id)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default BodyAnalysis;
