import React, { useState, useRef, useCallback, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Camera, Upload, Loader2, AlertCircle, CheckCircle2, 
  User, TrendingUp, TrendingDown, Minus, RefreshCw, X, 
  ChevronDown, ChevronUp, Ruler, Activity, Target, Sparkles
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== COMPONENTES INTERNOS ====================

const PhotoUploadBox = ({ position, label, file, preview, onSelect, onRemove, disabled }) => {
  const inputRef = useRef(null);
  
  const positionIcons = {
    front: '👤',
    side: '👤',
    back: '👤'
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-medium text-gray-600 mb-2">{positionIcons[position]} {label}</p>
      <div 
        className={`relative w-28 h-36 rounded-xl border-2 border-dashed transition-all overflow-hidden
          ${preview ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:border-teal-400 bg-gray-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && !preview && inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Camera className="h-6 w-6 mb-1" />
            <span className="text-[10px]">Adicionar</span>
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

const ScoreCircle = ({ value, label, size = 'md', color = 'teal' }) => {
  const sizeClasses = {
    sm: 'w-14 h-14 text-lg',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-24 h-24 text-3xl'
  };
  const colorClasses = {
    teal: 'bg-teal-100 text-teal-700 border-teal-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    red: 'bg-red-100 text-red-700 border-red-300'
  };
  
  const getScoreColor = (v) => {
    if (v >= 70) return 'green';
    if (v >= 40) return 'yellow';
    return 'red';
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`${sizeClasses[size]} ${colorClasses[color || getScoreColor(value)]} rounded-full flex items-center justify-center font-bold border-2`}>
        {value}
      </div>
      <span className="text-xs text-gray-600 mt-1 text-center">{label}</span>
    </div>
  );
};

const RegionBar = ({ region, score, notes }) => {
  const regionLabels = {
    shoulders: 'Ombros',
    chest: 'Peitoral',
    abdomen: 'Abdômen',
    arms: 'Braços',
    legs: 'Pernas',
    back: 'Costas'
  };
  
  const getColor = (s) => {
    if (s >= 7) return 'bg-green-500';
    if (s >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{regionLabels[region] || region}</span>
        <span className="font-semibold text-gray-900">{score}/10</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${getColor(score)}`} style={{ width: `${score * 10}%` }} />
      </div>
      {notes && <p className="text-xs text-gray-500">{notes}</p>}
    </div>
  );
};

const ComparisonBadge = ({ change, label, unit = '' }) => {
  if (change === 0 || change === null || change === undefined) {
    return (
      <div className="flex items-center gap-1 text-gray-500 text-sm">
        <Minus className="h-4 w-4" />
        <span>{label}: estável</span>
      </div>
    );
  }
  
  const isPositive = change > 0;
  const isGood = label.includes('Definição') ? isPositive : !isPositive;
  
  return (
    <div className={`flex items-center gap-1 text-sm ${isGood ? 'text-green-600' : 'text-red-600'}`}>
      {isGood ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      <span>{label}: {isPositive ? '+' : ''}{change}{unit}</span>
    </div>
  );
};

const HistoryCard = ({ analysis, expanded, onToggle }) => {
  const date = new Date(analysis.created_at);
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const typeLabels = { baseline: '📍 Baseline', progress: '📈 Progresso', feedback: '💬 Feedback' };
  
  return (
    <Card className="border-gray-200 hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold
              ${analysis.overall_score >= 70 ? 'bg-green-100 text-green-700' :
                analysis.overall_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'}`}>
              {analysis.overall_score || '?'}
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">
                {typeLabels[analysis.analysis_type] || 'Análise'}
              </p>
              <p className="text-xs text-gray-500">
                {dateStr} • BF: {analysis.body_fat_estimate}% • Def: {analysis.muscle_definition}/10
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <p className="text-sm text-gray-700">{analysis.ai_feedback}</p>
            {analysis.comparison_result?.highlights?.length > 0 && (
              <div className="bg-green-50 p-2 rounded-lg">
                <p className="text-xs font-medium text-green-800 mb-1">✨ Destaques:</p>
                {analysis.comparison_result.highlights.map((h, i) => (
                  <p key={i} className="text-xs text-green-700">• {h}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AnalysisSkeleton = () => (
  <Card className="border-gray-200">
    <CardContent className="p-6 space-y-4">
      <div className="flex justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
    </CardContent>
  </Card>
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

  // Carregar histórico e última análise
  const loadHistory = useCallback(async () => {
    if (!profile?.id) return;
    setHistoryLoading(true);
    
    const [historyResult, lastResult] = await Promise.all([
      listPatientBodyAnalyses(profile.id, 10),
      getLastBodyAnalysis(profile.id)
    ]);
    
    setHistory(historyResult.data || []);
    setPreviousAnalysis(lastResult.data || null);
    setHistoryLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Selecionar foto
  const handlePhotoSelect = (position, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato não suportado. Use JPEG, PNG ou WEBP.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 15MB.');
      return;
    }

    setPhotos(prev => ({ ...prev, [position]: file }));
    setPreviews(prev => ({ ...prev, [position]: URL.createObjectURL(file) }));
    setResult(null);
    setError(null);
  };

  // Remover foto
  const handlePhotoRemove = (position) => {
    setPhotos(prev => ({ ...prev, [position]: null }));
    setPreviews(prev => ({ ...prev, [position]: null }));
  };

  // Converter para base64
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
      // 1. Upload das fotos
      const paths = {};
      for (const pos of ['front', 'side', 'back']) {
        if (photos[pos]) {
          const { path } = await uploadBodyPhoto(photos[pos], profile.id, pos);
          paths[pos] = path;
        }
      }

      // 2. Criar registro no banco
      const { data: analysisRecord } = await createBodyAnalysis({
        patientId: profile.id,
        photoFront: paths.front,
        photoSide: paths.side,
        photoBack: paths.back,
        analysisType: previousAnalysis ? 'progress' : 'baseline',
        notes: notes || null
      });

      // 3. Converter fotos para base64
      const images = {};
      for (const pos of ['front', 'side', 'back']) {
        if (photos[pos]) {
          images[pos] = await fileToBase64(photos[pos]);
        }
      }

      // 4. Chamar API de IA
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

      // 5. Atualizar registro no banco
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

      toast.success('Análise concluída!');
      loadHistory();

    } catch (err) {
      console.error('Erro na análise:', err);
      setError(err.message || 'Erro ao analisar');
      toast.error('Erro na análise. Tente novamente.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Reset
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
      <div className="max-w-2xl mx-auto space-y-6 pb-8">

        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">💪 Análise Corporal</h1>
          <p className="text-sm text-gray-500">
            Envie fotos para acompanhar sua evolução física
          </p>
          {previousAnalysis && (
            <Badge variant="outline" className="mt-2 border-teal-300 text-teal-700">
              Última análise: {new Date(previousAnalysis.created_at).toLocaleDateString('pt-BR')}
            </Badge>
          )}
        </div>

        {/* UPLOAD AREA */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="h-4 w-4 text-teal-600" />
              Fotos para Análise
            </CardTitle>
            <p className="text-xs text-gray-500">Envie pelo menos 1 foto. Ideal: frente, lado e costas</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-4">
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
              placeholder="Observações (opcional): Como está se sentindo? Alguma mudança recente na rotina?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm"
              rows={2}
              disabled={analyzing}
            />

            <div className="flex gap-3">
              <Button
                onClick={handleAnalyze}
                disabled={!hasAnyPhoto || analyzing}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {analyzing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Analisar Composição</>
                )}
              </Button>
              {hasAnyPhoto && !analyzing && (
                <Button variant="outline" onClick={handleReset}>
                  Limpar
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
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 text-sm">Erro na análise</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RESULTADO */}
        {result && (
          <div className="space-y-4 animate-fade-in-up">
            
            {/* Scores principais */}
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex justify-center gap-6 mb-4">
                  <ScoreCircle value={result.overall_score} label="Score Geral" size="lg" />
                  <div className="flex flex-col justify-center gap-2">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-gray-900">{result.body_fat_estimate}%</span>
                      <p className="text-xs text-gray-500">Gordura Est.</p>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl font-bold text-gray-900">{result.muscle_definition}/10</span>
                      <p className="text-xs text-gray-500">Definição</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center gap-2 flex-wrap">
                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                    {result.body_type}
                  </Badge>
                  <Badge variant="outline" className="border-blue-300 text-blue-700">
                    Postura: {result.posture_score}/10
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Comparação (se houver) */}
            {result.comparison && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                    <TrendingUp className="h-4 w-4" />
                    Comparação com Análise Anterior
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-4">
                    <ComparisonBadge 
                      change={result.comparison.body_fat_change} 
                      label="Gordura" 
                      unit="%" 
                    />
                    <ComparisonBadge 
                      change={result.comparison.muscle_definition_change} 
                      label="Definição" 
                    />
                  </div>
                  
                  {result.comparison.highlights?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-green-800 mb-1">✨ Destaques:</p>
                      {result.comparison.highlights.map((h, i) => (
                        <p key={i} className="text-sm text-green-700">• {h}</p>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      className={
                        result.comparison.overall_progress === 'positive' 
                          ? 'bg-green-600' 
                          : result.comparison.overall_progress === 'stable'
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                      }
                    >
                      Progresso: {result.comparison.progress_score}/100
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Análise por região */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-600" />
                  Análise por Região
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(result.region_analysis || {}).map(([region, data]) => (
                  <RegionBar 
                    key={region} 
                    region={region} 
                    score={data.score} 
                    notes={data.notes} 
                  />
                ))}
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card className="border-teal-200 bg-teal-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-teal-900 text-sm mb-1">Feedback</p>
                    <p className="text-sm text-teal-800">{result.ai_feedback}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recomendações */}
            {(result.recommendations || []).length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <p className="font-medium text-amber-900 text-sm mb-2">
                    <Target className="inline h-4 w-4 mr-1" />
                    Recomendações
                  </p>
                  <div className="space-y-1">
                    {result.recommendations.map((r, i) => (
                      <p key={i} className="text-sm text-amber-800">
                        <span className="font-bold">{i + 1}.</span> {r}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleReset} variant="outline" className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Nova Análise
            </Button>
          </div>
        )}

        {/* HISTÓRICO */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Histórico de Análises</h2>
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
                <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nenhuma análise ainda</p>
                <p className="text-xs text-gray-400">Envie suas primeiras fotos para começar!</p>
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
