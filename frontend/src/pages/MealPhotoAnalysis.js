import React, { useState, useRef, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, Upload, Loader2, Star, AlertCircle, CheckCircle2, 
  Utensils, Flame, Leaf, TrendingUp, RefreshCw, X, ChevronDown, ChevronUp,
  Apple, Beef, Wheat, Droplet, Sparkles, Target, Award, Zap, Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  uploadMealPhoto,
  createMealAnalysis,
  updateMealAnalysis,
  listPatientMealAnalyses
} from '@/lib/supabase';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { safeFetch } from '@/lib/safeFetch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== BADGES/CONQUISTAS ====================

const MEAL_BADGES = [
  { id: 'first_meal', icon: Star, label: 'Primeira Refeição', color: 'from-yellow-400 to-amber-500', condition: (h) => h.length >= 1 },
  { id: 'healthy_eater', icon: Leaf, label: 'Alimentação Saudável', color: 'from-green-400 to-emerald-500', condition: (h) => h.some(m => m.quality_score >= 80) },
  { id: 'consistent', icon: Flame, label: 'Consistente', color: 'from-orange-400 to-red-500', condition: (h) => h.length >= 5 },
  { id: 'balanced', icon: Target, label: 'Equilibrado', color: 'from-blue-400 to-indigo-500', condition: (h) => h.filter(m => m.quality_score >= 70).length >= 3 },
  { id: 'dedication', icon: Heart, label: 'Dedicação', color: 'from-pink-400 to-rose-500', condition: (h) => h.length >= 10 },
];

const AchievementBadge = ({ badge, unlocked }) => {
  const Icon = badge.icon;
  return (
    <div className={`relative ${!unlocked && 'opacity-40 grayscale'}`}>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-lg ${unlocked ? 'hover:scale-110' : ''} transition-transform`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-gray-500 whitespace-nowrap">
        {badge.label}
      </span>
      {unlocked && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </div>
  );
};

// ==================== COMPONENTES ====================

const MacroBar = ({ label, value, unit, max, gradient, icon: Icon }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-gray-600 font-medium">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </span>
        <span className="font-bold text-gray-900">{value}{unit}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  );
};

const ScoreCard = ({ score, label, gradient }) => {
  const getScoreEmoji = (s) => {
    if (s >= 80) return '🌟';
    if (s >= 60) return '👍';
    if (s >= 40) return '😐';
    return '⚠️';
  };
  
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-lg`}>
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
      <div className="relative z-10">
        <span className="text-xs font-medium opacity-90">{label}</span>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-3xl font-bold">{score}</span>
          <span className="text-xl">{getScoreEmoji(score)}</span>
        </div>
      </div>
    </div>
  );
};

const FoodItem = ({ food }) => {
  const getConfidenceColor = (c) => {
    if (c >= 0.8) return 'bg-green-500';
    if (c >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
          <Utensils className="h-4 w-4 text-teal-600" />
        </div>
        <div>
          <span className="font-medium text-sm text-gray-900">{food.name}</span>
          {food.notes && <span className="text-xs text-gray-500 ml-1">({food.notes})</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">{food.portion}</span>
        <div className={`h-2.5 w-2.5 rounded-full ${getConfidenceColor(food.confidence)}`} />
      </div>
    </div>
  );
};

const FlagBadge = ({ flag, active }) => {
  const flags = {
    high_sugar: { label: 'Alto açúcar', color: 'bg-red-100 text-red-700 border-red-200', icon: '🍬' },
    ultra_processed: { label: 'Ultraprocessado', color: 'bg-red-100 text-red-700 border-red-200', icon: '🏭' },
    low_veggies: { label: 'Poucos vegetais', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🥬' },
    high_fat: { label: 'Alto em gordura', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🧈' },
    low_protein: { label: 'Pouca proteína', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🥩' },
    good_balance: { label: 'Bem equilibrado', color: 'bg-green-100 text-green-700 border-green-200', icon: '✅' },
  };
  
  const info = flags[flag];
  if (!info || !active) return null;
  
  return (
    <Badge variant="outline" className={`${info.color} border`}>
      {info.icon} {info.label}
    </Badge>
  );
};

const HistoryCard = ({ analysis, expanded, onToggle }) => {
  const date = new Date(analysis.created_at);
  const timeStr = date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  
  const getScoreGradient = (score) => {
    if (score >= 70) return 'from-green-500 to-emerald-600';
    if (score >= 40) return 'from-yellow-500 to-amber-600';
    return 'from-red-500 to-orange-600';
  };
  
  return (
    <Card className={`border-0 shadow-md hover:shadow-lg transition-all overflow-hidden ${expanded ? 'ring-2 ring-teal-400' : ''}`}>
      <div className="flex items-center p-3 cursor-pointer" onClick={onToggle}>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getScoreGradient(analysis.quality_score)} flex items-center justify-center text-white font-bold shadow-lg`}>
          {analysis.quality_score || '?'}
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">
            {(analysis.detected_foods || []).slice(0, 3).map(f => f.name).join(', ')}
            {(analysis.detected_foods || []).length > 3 && '...'}
          </p>
          <p className="text-xs text-gray-500">
            {timeStr} • {analysis.estimated_calories || '?'} kcal
          </p>
        </div>
        <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2 animate-fade-in">
          <p className="text-sm text-gray-700">{analysis.ai_feedback}</p>
          {(analysis.suggestions || []).length > 0 && (
            <div className="space-y-1">
              {analysis.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600 bg-amber-50 p-2 rounded-lg">
                  <span className="text-amber-500">💡</span>
                  <span>{s}</span>
                </div>
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
    <div className="grid grid-cols-2 gap-3">
      <div className="h-24 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      <div className="h-24 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
    </div>
    <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-14 rounded-xl bg-gray-200 animate-pulse" />
      ))}
    </div>
  </div>
);

// ==================== PÁGINA PRINCIPAL ====================

const MealPhotoAnalysis = () => {
  const { profile } = useAuth();
  const fileInputRef = useRef(null);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState(null);

  // Carregar histórico
  const loadHistory = useCallback(async () => {
    if (!profile?.id) return;
    setHistoryLoading(true);
    const { data } = await listPatientMealAnalyses(profile.id, 15);
    setHistory(data || []);
    setHistoryLoading(false);
  }, [profile?.id]);

  React.useEffect(() => {
    loadHistory();
    trackProfessionalFeature('use_meal_photo_analysis');
  }, [loadHistory]);

  // Badges desbloqueados
  const unlockedBadges = MEAL_BADGES.filter(badge => badge.condition(history));

  // Handlers
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Use JPEG, PNG ou WEBP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Máximo 10MB');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !profile?.id) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const { path: imagePath } = await uploadMealPhoto(selectedImage, profile.id);

      const { data: analysisRecord } = await createMealAnalysis({
        patientId: profile.id,
        professionalId: null,
        imagePath: imagePath
      });

      const base64 = await fileToBase64(selectedImage);

      // 🔒 JWT Authentication: Use authenticatedPost from apiClient
      const { authenticatedPost } = await import('@/lib/apiClient');
      const aiResult = await authenticatedPost('/api/analyze-meal', {
        image_base64: base64,
        patient_id: profile.id,
        mime_type: selectedImage.type
      });

      if (!aiResult.success) {
        throw new Error(aiResult.error || 'Erro na análise');
      }

      const analysisData = aiResult.data;
      setResult(analysisData);

      if (analysisRecord?.id) {
        await updateMealAnalysis(analysisRecord.id, {
          status: 'done',
          detected_foods: analysisData.foods || [],
          portions: analysisData.foods?.map(f => ({ name: f.name, portion: f.portion })) || [],
          estimated_calories: analysisData.macros_estimate?.calories || null,
          protein_g: analysisData.macros_estimate?.protein_g || null,
          carbs_g: analysisData.macros_estimate?.carbs_g || null,
          fat_g: analysisData.macros_estimate?.fat_g || null,
          fiber_g: analysisData.macros_estimate?.fiber_g || null,
          quality_score: analysisData.quality_score || null,
          adherence_score: analysisData.adherence_score || null,
          flags: analysisData.flags || {},
          ai_feedback: analysisData.feedback_ptbr || '',
          suggestions: analysisData.suggestions_ptbr || []
        });
      }

      toast.success('Análise concluída! 🍽️');
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
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Layout title="Análise do Prato" userType="patient">
      <div className="max-w-2xl mx-auto space-y-6 pb-8 px-4">

        {/* HEADER PREMIUM */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-emerald-600 to-green-700 p-6 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Camera className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Análise do Prato</h1>
                <p className="text-teal-100 text-sm">IA analisa sua refeição em segundos</p>
              </div>
            </div>
            
            {history.length > 0 && (
              <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 w-fit">
                <Utensils className="h-4 w-4" />
                <span className="text-sm">{history.length} refeições analisadas</span>
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
                Conquistas Nutricionais
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex justify-center gap-4 flex-wrap pb-4">
                {MEAL_BADGES.map(badge => (
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
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {!imagePreview ? (
              <div 
                className="p-8 text-center cursor-pointer bg-gradient-to-b from-gray-50 to-white hover:from-teal-50 hover:to-white transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Camera className="h-10 w-10 text-teal-600" />
                </div>
                <p className="font-semibold text-gray-800 text-lg mb-1">Enviar foto do prato</p>
                <p className="text-sm text-gray-500 mb-4">JPEG, PNG ou WEBP • Máx 10MB</p>
                <Button variant="outline" className="border-teal-500 text-teal-700 hover:bg-teal-50">
                  <Upload className="mr-2 h-4 w-4" />
                  Escolher Foto
                </Button>
              </div>
            ) : (
              <div className="space-y-0">
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-56 sm:h-64 object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <button 
                    onClick={handleReset}
                    className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-sm font-medium mb-2">Foto pronta para análise</p>
                  </div>
                </div>
                <div className="p-4 flex gap-3">
                  <Button 
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex-1 h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-200"
                  >
                    {analyzing ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analisando...</>
                    ) : (
                      <><Sparkles className="mr-2 h-5 w-5" /> Analisar Refeição</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleReset} disabled={analyzing} className="h-12">
                    Trocar
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageSelect}
              capture="environment"
            />
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
            
            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
              <ScoreCard 
                score={result.quality_score} 
                label="Qualidade" 
                gradient="from-teal-500 to-emerald-600"
              />
              <ScoreCard 
                score={result.adherence_score} 
                label="Adesão" 
                gradient="from-blue-500 to-indigo-600"
              />
            </div>

            {/* Calorias */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white text-center">
                <Flame className="h-8 w-8 mx-auto mb-1" />
                <span className="text-4xl font-bold">{result.macros_estimate?.calories || 0}</span>
                <span className="text-lg ml-1">kcal</span>
              </div>
              <CardContent className="p-4 space-y-3">
                <MacroBar label="Proteína" value={result.macros_estimate?.protein_g || 0} unit="g" max={80} gradient="from-red-400 to-rose-500" icon={Beef} />
                <MacroBar label="Carboidratos" value={result.macros_estimate?.carbs_g || 0} unit="g" max={120} gradient="from-amber-400 to-yellow-500" icon={Wheat} />
                <MacroBar label="Gordura" value={result.macros_estimate?.fat_g || 0} unit="g" max={60} gradient="from-blue-400 to-cyan-500" icon={Droplet} />
                <MacroBar label="Fibra" value={result.macros_estimate?.fiber_g || 0} unit="g" max={30} gradient="from-green-400 to-emerald-500" icon={Leaf} />
              </CardContent>
            </Card>

            {/* Alimentos */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Apple className="h-5 w-5 text-green-600" />
                  Alimentos Detectados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(result.foods || []).map((food, i) => (
                  <FoodItem key={i} food={food} />
                ))}
              </CardContent>
            </Card>

            {/* Flags */}
            {result.flags && Object.entries(result.flags).some(([, v]) => v) && (
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.entries(result.flags).map(([flag, active]) => (
                  <FlagBadge key={flag} flag={flag} active={active} />
                ))}
              </div>
            )}

            {/* Feedback */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-teal-900 mb-1">Feedback</p>
                    <p className="text-sm text-teal-800">{result.feedback_ptbr}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sugestões */}
            {(result.suggestions_ptbr || []).length > 0 && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
                <CardContent className="p-4">
                  <p className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Sugestões para Melhorar
                  </p>
                  <div className="space-y-2">
                    {result.suggestions_ptbr.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 bg-white/60 rounded-xl p-3">
                        <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-amber-900">{s}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleReset} variant="outline" className="w-full h-12">
              <Camera className="mr-2 h-5 w-5" />
              Analisar Outra Refeição
            </Button>
          </div>
        )}

        {/* HISTÓRICO */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Utensils className="h-5 w-5 text-teal-600" />
              Últimas Análises
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
                  <Camera className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-700">Nenhuma análise ainda</p>
                <p className="text-sm text-gray-500 mt-1">Tire uma foto do seu prato!</p>
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

export default MealPhotoAnalysis;
