import React, { useState, useRef, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, Upload, Loader2, Star, AlertCircle, CheckCircle2, 
  Utensils, Flame, Leaf, TrendingUp, RefreshCw, X, ChevronDown, ChevronUp,
  Apple, Beef, Wheat, Droplet
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  uploadMealPhoto,
  createMealAnalysis,
  updateMealAnalysis,
  listPatientMealAnalyses
} from '@/lib/supabase';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== COMPONENTES INTERNOS ====================

const MacroBar = ({ label, value, unit, max, color, icon: Icon }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-gray-600">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </span>
        <span className="font-semibold text-gray-900">{value}{unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const ScoreBadge = ({ score, label }) => {
  const getColor = (s) => {
    if (s >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (s >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };
  return (
    <div className={`flex flex-col items-center p-3 rounded-xl border-2 ${getColor(score)}`}>
      <span className="text-2xl font-bold">{score}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

const AnalysisSkeleton = () => (
  <Card className="border-gray-200">
    <CardContent className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1">
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

const FoodItem = ({ food }) => (
  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-2">
      <Utensils className="h-4 w-4 text-teal-500" />
      <span className="font-medium text-sm text-gray-900">{food.name}</span>
      {food.notes && <span className="text-xs text-gray-500">({food.notes})</span>}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">{food.portion}</span>
      <div className={`h-2 w-2 rounded-full ${food.confidence >= 0.8 ? 'bg-green-500' : food.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`} />
    </div>
  </div>
);

const HistoryCard = ({ analysis, expanded, onToggle }) => {
  const date = new Date(analysis.created_at);
  const timeStr = date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  
  return (
    <Card className="border-gray-200 hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold ${
              analysis.quality_score >= 80 ? 'bg-green-100 text-green-700' :
              analysis.quality_score >= 50 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {analysis.quality_score || '?'}
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">
                {(analysis.detected_foods || []).slice(0, 3).map(f => f.name).join(', ')}
                {(analysis.detected_foods || []).length > 3 && '...'}
              </p>
              <p className="text-xs text-gray-500">{timeStr} • {analysis.estimated_calories || '?'} kcal</p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <p className="text-sm text-gray-700">{analysis.ai_feedback}</p>
            {(analysis.suggestions || []).length > 0 && (
              <div className="space-y-1">
                {analysis.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-teal-500 mt-0.5">💡</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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
    const { data } = await listPatientMealAnalyses(profile.id, 10);
    setHistory(data || []);
    setHistoryLoading(false);
  }, [profile?.id]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Selecionar imagem
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato não suportado. Use JPEG, PNG ou WEBP.');
      return;
    }
    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB.');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  // Converter File para base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove prefix "data:image/jpeg;base64,"
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Analisar refeição
  const handleAnalyze = async () => {
    if (!selectedImage || !profile?.id) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // 1. Upload da foto (opcional, se storage disponível)
      const { path: imagePath } = await uploadMealPhoto(selectedImage, profile.id);

      // 2. Criar registro no banco (processing)
      const { data: analysisRecord, error: createError } = await createMealAnalysis({
        patientId: profile.id,
        professionalId: null,
        imagePath: imagePath
      });

      // 3. Converter para base64 e chamar API de IA
      const base64 = await fileToBase64(selectedImage);

      const response = await fetch(`${BACKEND_URL}/api/analyze-meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          patient_id: profile.id,
          mime_type: selectedImage.type
        })
      });

      const aiResult = await response.json();

      if (!aiResult.success) {
        throw new Error(aiResult.error || 'Erro na análise');
      }

      const analysisData = aiResult.data;
      setResult(analysisData);

      // 4. Atualizar registro no banco com resultado
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

      toast.success('Análise concluída!');
      loadHistory(); // Recarregar histórico

    } catch (err) {
      console.error('Erro na análise:', err);
      setError(err.message || 'Erro ao analisar refeição');
      toast.error('Erro na análise. Tente novamente.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Reset
  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Layout title="Análise do Prato" userType="patient">
      <div className="max-w-2xl mx-auto space-y-6 pb-8">

        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">📸 Análise do Prato</h1>
          <p className="text-sm text-gray-500">Tire uma foto da sua refeição e receba uma análise nutricional inteligente</p>
        </div>

        {/* UPLOAD AREA */}
        <Card className="border-2 border-dashed border-gray-300 hover:border-teal-400 transition-colors">
          <CardContent className="p-6">
            {!imagePreview ? (
              <div 
                className="text-center cursor-pointer py-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="font-semibold text-gray-700 mb-1">Enviar foto do prato</p>
                <p className="text-xs text-gray-500 mb-4">JPEG, PNG ou WEBP • Máx 10MB</p>
                <Button variant="outline" className="border-teal-500 text-teal-700 hover:bg-teal-50">
                  <Upload className="mr-2 h-4 w-4" />
                  Escolher Foto
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-64 object-cover rounded-xl shadow-md" 
                  />
                  <button 
                    onClick={handleReset}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {analyzing ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando...</>
                    ) : (
                      <><Star className="mr-2 h-4 w-4" /> Analisar Refeição</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleReset} disabled={analyzing}>
                    Trocar Foto
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

        {/* LOADING SKELETON */}
        {analyzing && <AnalysisSkeleton />}

        {/* ERRO */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 text-sm">Erro na análise</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RESULTADO DA ANÁLISE */}
        {result && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
              <ScoreBadge score={result.quality_score} label="Qualidade" />
              <ScoreBadge score={result.adherence_score} label="Adesão" />
            </div>

            {/* Macros */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Estimativa Nutricional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center mb-3">
                  <span className="text-3xl font-bold text-gray-900">{result.macros_estimate?.calories || 0}</span>
                  <span className="text-sm text-gray-500 ml-1">kcal</span>
                </div>
                <MacroBar label="Proteína" value={result.macros_estimate?.protein_g || 0} unit="g" max={80} color="bg-red-400" icon={Beef} />
                <MacroBar label="Carboidratos" value={result.macros_estimate?.carbs_g || 0} unit="g" max={120} color="bg-amber-400" icon={Wheat} />
                <MacroBar label="Gordura" value={result.macros_estimate?.fat_g || 0} unit="g" max={60} color="bg-blue-400" icon={Droplet} />
                <MacroBar label="Fibra" value={result.macros_estimate?.fiber_g || 0} unit="g" max={30} color="bg-green-400" icon={Leaf} />
              </CardContent>
            </Card>

            {/* Alimentos Detectados */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Apple className="h-4 w-4 text-green-500" />
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
              <div className="flex flex-wrap gap-2">
                {result.flags.high_sugar && <Badge variant="outline" className="border-red-300 text-red-700">⚠️ Alto açúcar</Badge>}
                {result.flags.ultra_processed && <Badge variant="outline" className="border-red-300 text-red-700">⚠️ Ultraprocessado</Badge>}
                {result.flags.low_veggies && <Badge variant="outline" className="border-yellow-300 text-yellow-700">🥬 Poucos vegetais</Badge>}
                {result.flags.high_fat && <Badge variant="outline" className="border-orange-300 text-orange-700">🧈 Alto em gordura</Badge>}
                {result.flags.low_protein && <Badge variant="outline" className="border-purple-300 text-purple-700">🥩 Pouca proteína</Badge>}
                {result.flags.good_balance && <Badge variant="outline" className="border-green-300 text-green-700">✅ Boa balanceamento</Badge>}
              </div>
            )}

            {/* Feedback */}
            <Card className="border-teal-200 bg-teal-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-teal-900 text-sm mb-1">Feedback</p>
                    <p className="text-sm text-teal-800">{result.feedback_ptbr}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sugestões */}
            {(result.suggestions_ptbr || []).length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <p className="font-medium text-amber-900 text-sm mb-2">💡 Sugestões</p>
                  <div className="space-y-2">
                    {result.suggestions_ptbr.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold text-xs mt-0.5">{i + 1}.</span>
                        <span className="text-sm text-amber-800">{s}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleReset} variant="outline" className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Analisar Outra Refeição
            </Button>
          </div>
        )}

        {/* HISTÓRICO */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Últimas Análises</h2>
            <Button variant="ghost" size="sm" onClick={loadHistory}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <Card className="border-gray-100">
              <CardContent className="p-6 text-center">
                <Camera className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nenhuma análise ainda</p>
                <p className="text-xs text-gray-400">Tire uma foto do seu prato para começar!</p>
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
