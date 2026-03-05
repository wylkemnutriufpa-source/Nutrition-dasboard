/**
 * PatientSmartDashboard.js
 * Dashboard inteligente do paciente para uso no Editor de Planos e Programador
 * Mostra métricas, status e informações relevantes
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User, Target, Scale, Activity, TrendingUp, TrendingDown, Calendar,
  CheckCircle2, AlertTriangle, Clock, Utensils, Flame, Droplets,
  Heart, FileText, Clipboard, ChevronRight, Sparkles, Brain,
  Trophy, Star, Zap, BarChart3
} from 'lucide-react';
import { supabase, getAnamnesis, getPatientFeedbacks } from '@/lib/supabase';
import { calculateFullRiskScore } from '@/utils/riskScoreEngine';

// Card de métrica compacto
const MetricCard = ({ icon: Icon, label, value, unit, trend, color = 'teal' }) => {
  const colorClasses = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200'
  };
  
  return (
    <div className={`p-3 rounded-xl border ${colorClasses[color]} transition-all hover:shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="opacity-70" />
          <span className="text-xs font-medium opacity-80">{label}</span>
        </div>
        {trend && (
          <span className={`text-[10px] ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend > 0 ? <TrendingUp size={12} className="inline" /> : <TrendingDown size={12} className="inline" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-lg font-bold mt-1">
        {value} <span className="text-xs font-normal opacity-60">{unit}</span>
      </p>
    </div>
  );
};

// Status Badge
const StatusBadge = ({ status, label }) => {
  const statusConfig = {
    success: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
    warning: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
    info: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
    danger: { bg: 'bg-rose-100', text: 'text-rose-700', icon: AlertTriangle }
  };
  
  const config = statusConfig[status] || statusConfig.info;
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.bg} ${config.text} text-[10px] flex items-center gap-1`}>
      <Icon size={10} /> {label}
    </Badge>
  );
};

const PatientSmartDashboard = ({ patientId, compact = false }) => {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [anamnesis, setAnamnesis] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [riskScore, setRiskScore] = useState(null);
  const [stats, setStats] = useState({
    currentWeight: null,
    targetWeight: null,
    weightProgress: 0,
    bmi: null,
    phase: 'Não definida',
    lastFeedback: null,
    checklistCompletion: 0,
    daysActive: 0
  });

  const loadData = useCallback(async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      // Carregar paciente
      const { data: patientData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (patientData) setPatient(patientData);
      
      // Carregar anamnese
      const { data: anamData } = await getAnamnesis(patientId);
      if (anamData) setAnamnesis(anamData);
      
      // Carregar feedbacks recentes
      const { data: fbData } = await getPatientFeedbacks(patientId, 10);
      if (fbData) setFeedbacks(fbData);
      
      // Calcular estatísticas
      const currentWeight = anamData?.current_weight || patientData?.weight || null;
      const targetWeight = anamData?.target_weight || null;
      const height = anamData?.height || patientData?.height || 170;
      
      let weightProgress = 0;
      if (currentWeight && targetWeight) {
        const initialWeight = anamData?.initial_weight || currentWeight;
        const totalChange = Math.abs(targetWeight - initialWeight);
        const currentChange = Math.abs(currentWeight - initialWeight);
        weightProgress = totalChange > 0 ? Math.min(100, (currentChange / totalChange) * 100) : 0;
      }
      
      const bmi = currentWeight && height ? (currentWeight / Math.pow(height / 100, 2)).toFixed(1) : null;
      
      // Determinar fase
      let phase = 'Manutenção';
      if (targetWeight && currentWeight) {
        if (targetWeight < currentWeight) phase = 'Emagrecimento';
        else if (targetWeight > currentWeight) phase = 'Hipertrofia';
      }
      
      // Calcular dias ativos
      const createdAt = patientData?.created_at ? new Date(patientData.created_at) : new Date();
      const daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calcular checklist completion (mock por enquanto)
      const checklistCompletion = fbData?.length > 0 ? Math.min(100, fbData.length * 10) : 0;
      
      // Último feedback
      const lastFeedback = fbData?.[0] || null;
      
      setStats({
        currentWeight,
        targetWeight,
        weightProgress,
        bmi,
        phase,
        lastFeedback,
        checklistCompletion,
        daysActive
      });
      
      // Calcular risk score
      if (patientData) {
        const risk = calculateFullRiskScore({
          ...patientData,
          anamnesis: anamData,
          feedbacks: fbData
        });
        setRiskScore(risk);
      }
      
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <Card className="border-2 border-dashed border-gray-200">
        <CardContent className="p-4 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full mb-2" />
            <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!patient) {
    return (
      <Card className="border-2 border-dashed border-gray-200">
        <CardContent className="p-4 text-center">
          <User className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Selecione um paciente</p>
        </CardContent>
      </Card>
    );
  }

  // Versão compacta (para uso na sidebar)
  if (compact) {
    return (
      <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white">
        <CardContent className="p-3">
          {/* Header do paciente */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
              {patient.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{patient.name}</p>
              <div className="flex items-center gap-2">
                <Badge className="bg-teal-100 text-teal-700 text-[9px]">{stats.phase}</Badge>
                {riskScore && (
                  <Badge className={`text-[9px] ${
                    riskScore.level === 'low' ? 'bg-emerald-100 text-emerald-700' :
                    riskScore.level === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    Risco: {riskScore.score}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-lg border">
              <Scale size={14} className="mx-auto text-teal-600 mb-1" />
              <p className="text-sm font-bold text-gray-900">{stats.currentWeight || '--'}</p>
              <p className="text-[9px] text-gray-500">kg atual</p>
            </div>
            <div className="p-2 bg-white rounded-lg border">
              <Target size={14} className="mx-auto text-violet-600 mb-1" />
              <p className="text-sm font-bold text-gray-900">{stats.targetWeight || '--'}</p>
              <p className="text-[9px] text-gray-500">kg meta</p>
            </div>
            <div className="p-2 bg-white rounded-lg border">
              <Activity size={14} className="mx-auto text-blue-600 mb-1" />
              <p className="text-sm font-bold text-gray-900">{stats.bmi || '--'}</p>
              <p className="text-[9px] text-gray-500">IMC</p>
            </div>
          </div>
          
          {/* Progresso */}
          {stats.targetWeight && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-gray-500">Progresso</span>
                <span className="text-[10px] font-semibold text-teal-600">{Math.round(stats.weightProgress)}%</span>
              </div>
              <Progress value={stats.weightProgress} className="h-1.5" />
            </div>
          )}
          
          {/* Status badges */}
          <div className="flex flex-wrap gap-1 mt-3">
            {anamnesis && <StatusBadge status="success" label="Anamnese" />}
            {stats.lastFeedback && <StatusBadge status="success" label="Feedback recente" />}
            {stats.daysActive > 0 && <StatusBadge status="info" label={`${stats.daysActive}d ativo`} />}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Versão completa
  return (
    <Card className="border-2 border-teal-200">
      <CardHeader className="pb-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <span className="text-xl font-bold">{patient.name?.charAt(0)}</span>
            </div>
            <div>
              <CardTitle className="text-white">{patient.name}</CardTitle>
              <p className="text-sm text-white/80">{patient.email}</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-0">
            <Sparkles size={12} className="mr-1" /> Dashboard IA
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Métricas principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={Scale} label="Peso Atual" value={stats.currentWeight || '--'} unit="kg" color="teal" />
          <MetricCard icon={Target} label="Meta" value={stats.targetWeight || '--'} unit="kg" color="purple" />
          <MetricCard icon={Activity} label="IMC" value={stats.bmi || '--'} unit="" color="blue" />
          <MetricCard icon={Calendar} label="Dias Ativos" value={stats.daysActive} unit="dias" color="amber" />
        </div>
        
        {/* Progresso de peso */}
        {stats.targetWeight && (
          <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <span className="font-semibold text-gray-900">Progresso para Meta</span>
              </div>
              <Badge className="bg-teal-100 text-teal-700">{Math.round(stats.weightProgress)}%</Badge>
            </div>
            <Progress value={stats.weightProgress} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              {stats.currentWeight && stats.targetWeight && (
                <>Faltam <strong>{Math.abs(stats.currentWeight - stats.targetWeight).toFixed(1)}kg</strong> para atingir a meta</>
              )}
            </p>
          </div>
        )}
        
        {/* Informações da fase */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-violet-50 rounded-xl border border-violet-200">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className="text-violet-600" />
              <span className="text-sm font-semibold text-violet-800">Fase Atual</span>
            </div>
            <p className="text-lg font-bold text-violet-700">{stats.phase}</p>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Engajamento</span>
            </div>
            <p className="text-lg font-bold text-blue-700">{stats.checklistCompletion}%</p>
          </div>
        </div>
        
        {/* Risk Score */}
        {riskScore && (
          <div className={`p-3 rounded-xl border ${
            riskScore.level === 'low' ? 'bg-emerald-50 border-emerald-200' :
            riskScore.level === 'medium' ? 'bg-amber-50 border-amber-200' :
            'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart size={16} className={
                  riskScore.level === 'low' ? 'text-emerald-600' :
                  riskScore.level === 'medium' ? 'text-amber-600' :
                  'text-rose-600'
                } />
                <span className="font-semibold">Score de Risco Clínico</span>
              </div>
              <Badge className={
                riskScore.level === 'low' ? 'bg-emerald-100 text-emerald-700' :
                riskScore.level === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              }>
                {riskScore.score}/100
              </Badge>
            </div>
            {riskScore.factors?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {riskScore.factors.slice(0, 3).map((factor, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px]">{factor}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Status checks */}
        <div className="flex flex-wrap gap-2">
          {anamnesis ? (
            <StatusBadge status="success" label="Anamnese Completa" />
          ) : (
            <StatusBadge status="warning" label="Sem Anamnese" />
          )}
          {feedbacks.length > 0 ? (
            <StatusBadge status="success" label={`${feedbacks.length} Feedbacks`} />
          ) : (
            <StatusBadge status="warning" label="Sem Feedbacks" />
          )}
          {stats.checklistCompletion > 50 ? (
            <StatusBadge status="success" label="Boa Aderência" />
          ) : (
            <StatusBadge status="info" label="Aderência Baixa" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientSmartDashboard;
