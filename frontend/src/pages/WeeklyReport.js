import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3, Users, TrendingUp, AlertTriangle, CheckCircle2,
  Activity, Loader2, ChevronLeft, ChevronRight, Target, Award,
  Flame, Shield, Zap, ArrowUp, ArrowDown,
  Calendar, RefreshCw, Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessionalDashboard } from '@/hooks/useProfessionalDashboard';
import { trackProfessionalFeature } from '@/utils/featureTracking';

// ==================== PERÍODOS ====================
const PERIODS = [
  { id: 'daily', label: 'Diário', days: 1 },
  { id: 'weekly', label: 'Semanal', days: 7 },
  { id: 'biweekly', label: 'Quinzenal', days: 14 },
  { id: 'monthly', label: 'Mensal', days: 30 },
  { id: 'annual', label: 'Anual', days: 365 }
];

// ==================== HELPERS ====================
const getPeriodRange = (periodId, offset) => {
  const period = PERIODS.find(p => p.id === periodId) || PERIODS[1];
  const end = new Date();
  end.setDate(end.getDate() + offset * period.days);
  const start = new Date(end);
  start.setDate(start.getDate() - period.days + 1);

  const formatDate = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const formatFull = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  let label;
  if (periodId === 'daily') {
    label = end.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  } else if (periodId === 'annual') {
    label = `${start.getFullYear()}`;
  } else {
    label = `${formatDate(start)} - ${formatFull(end)}`;
  }

  return { start, end, label, isCurrentPeriod: offset === 0 };
};

// ==================== STAT CARD ====================
const StatCard = ({ title, value, subtitle, icon: Icon, gradient }) => (
  <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all">
    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
    <div className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  </div>
);

// ==================== PATIENT ROW ====================
const PatientRow = ({ patient, index }) => {
  const score = patient.engagementScore || 0;
  const risk = patient.dashboardRisk?.score || 0;
  const getScoreColor = (s) => s >= 80 ? 'text-green-600 bg-green-100' : s >= 50 ? 'text-amber-600 bg-amber-100' : 'text-red-600 bg-red-100';
  const getRiskColor = (r) => r >= 70 ? 'text-red-600 bg-red-100' : r >= 40 ? 'text-amber-600 bg-amber-100' : 'text-green-600 bg-green-100';

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-all">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0">{index + 1}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{patient.full_name || patient.name || 'Paciente'}</p>
        <p className="text-xs text-gray-400">{patient.email || ''}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase">Engajamento</p>
          <Badge className={`${getScoreColor(score)} border-0 font-bold text-xs`}>{score}%</Badge>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase">Risco</p>
          <Badge className={`${getRiskColor(risk)} border-0 font-bold text-xs`}>{risk}</Badge>
        </div>
      </div>
    </div>
  );
};

// ==================== PÁGINA PRINCIPAL ====================
const WeeklyReport = () => {
  const { user, profile } = useAuth();
  const professionalId = user?.id || profile?.id;
  const [periodId, setPeriodId] = useState('weekly');
  const [offset, setOffset] = useState(0);

  const { loading, metrics, patientsWithScore, sosCount, attentionAlerts, refresh } = useProfessionalDashboard(professionalId);

  React.useEffect(() => { trackProfessionalFeature('view_weekly_report'); }, []);

  const periodRange = useMemo(() => getPeriodRange(periodId, offset), [periodId, offset]);
  const periodConfig = PERIODS.find(p => p.id === periodId) || PERIODS[1];

  // ========== COMPUTED DATA ==========
  const reportData = useMemo(() => {
    if (!patientsWithScore?.length) return null;
    const patients = patientsWithScore;
    const totalPatients = patients.length;
    const avgEngagement = metrics.avgEngagement || 0;

    const highEngagement = patients.filter(p => (p.engagementScore || 0) >= 80).length;
    const mediumEngagement = patients.filter(p => (p.engagementScore || 0) >= 50 && (p.engagementScore || 0) < 80).length;
    const lowEngagement = patients.filter(p => (p.engagementScore || 0) < 50).length;

    const highRisk = patients.filter(p => (p.dashboardRisk?.score || 0) >= 70).length;
    const mediumRisk = patients.filter(p => (p.dashboardRisk?.score || 0) >= 40 && (p.dashboardRisk?.score || 0) < 70).length;
    const lowRisk = patients.filter(p => (p.dashboardRisk?.score || 0) < 40).length;

    const topPerformers = [...patients].sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0)).slice(0, 5);
    const needAttention = [...patients].sort((a, b) => (a.engagementScore || 0) - (b.engagementScore || 0)).slice(0, 5);

    const weeklyRecs = [];
    if (lowEngagement > totalPatients * 0.3) weeklyRecs.push({ title: 'Engajamento geral baixo', description: `${lowEngagement} pacientes com engajamento abaixo de 50%. Considere enviar mensagens motivacionais.` });
    if (highRisk > 0) weeklyRecs.push({ title: `${highRisk} paciente(s) em risco elevado`, description: 'Revise os planos alimentares e agende follow-ups prioritários.' });
    if (metrics.inactivePatients > 2) weeklyRecs.push({ title: `${metrics.inactivePatients} pacientes inativos`, description: 'Considere ativar automações para notificar pacientes que não fazem login.' });
    if (sosCount > 0) weeklyRecs.push({ title: `${sosCount} SOS pendente(s)`, description: 'Responda às emergências o mais rápido possível.' });
    if (weeklyRecs.length === 0) weeklyRecs.push({ title: 'Tudo sob controle!', description: 'Seus pacientes estão com bom engajamento. Continue o excelente trabalho!' });

    return { totalPatients, avgEngagement, highEngagement, mediumEngagement, lowEngagement, highRisk, mediumRisk, lowRisk, topPerformers, needAttention, weeklyRecs };
  }, [patientsWithScore, metrics, sosCount]);

  if (loading) {
    return (
      <Layout title="Relatórios Inteligentes" userType="professional">
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatórios Inteligentes" userType="professional">
      <div className="max-w-7xl mx-auto space-y-6 pb-8">

        {/* ========== PREMIUM HEADER ========== */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-3">
                📊 Relatórios Inteligentes
              </span>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-xl">
                    <BarChart3 className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Relatórios Inteligentes</h1>
                    <p className="text-white/80 text-sm">Análise dinâmica por período</p>
                  </div>
                </div>
                <Button onClick={refresh} className="bg-white/20 text-white hover:bg-white/30 border border-white/20 backdrop-blur-sm">
                  <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
                </Button>
              </div>

              {/* Period Selector + Navigation */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white/70" />
                  <Select value={periodId} onValueChange={(v) => { setPeriodId(v); setOffset(0); }}>
                    <SelectTrigger className="w-[140px] bg-white/20 border-white/20 text-white font-semibold h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 flex items-center justify-center gap-4">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setOffset(offset - 1)}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-white/80" />
                    <span className="font-semibold text-white text-sm">{periodRange.label}</span>
                    {periodRange.isCurrentPeriod && <Badge className="bg-white/20 text-white border-0 text-[10px]">Atual</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setOffset(Math.min(0, offset + 1))} disabled={offset >= 0}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {reportData ? (
          <>
            {/* ========== STATS CARDS ========== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Total Pacientes" value={reportData.totalPatients} icon={Users} gradient="from-teal-500 to-emerald-600" subtitle={`${metrics.activePatients} ativos`} />
              <StatCard title="Engajamento Médio" value={`${reportData.avgEngagement}%`} icon={TrendingUp} gradient="from-blue-500 to-indigo-600" subtitle={`${reportData.highEngagement} acima de 80%`} />
              <StatCard title="Em Risco" value={reportData.highRisk} icon={AlertTriangle} gradient="from-red-500 to-rose-600" subtitle={`${reportData.mediumRisk} moderado`} />
              <StatCard title="SOS Pendentes" value={sosCount} icon={Shield} gradient="from-amber-500 to-orange-600" subtitle={`${attentionAlerts?.length || 0} alertas`} />
            </div>

            {/* ========== ENGAGEMENT BREAKDOWN ========== */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  Distribuição de Engajamento — {periodConfig.label}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Alto (80%+)', value: reportData.highEngagement, color: 'green', icon: Flame },
                    { label: 'Médio (50-79%)', value: reportData.mediumEngagement, color: 'amber', icon: Target },
                    { label: 'Baixo (<50%)', value: reportData.lowEngagement, color: 'red', icon: AlertTriangle }
                  ].map((item, i) => {
                    const ItemIcon = item.icon;
                    const pct = reportData.totalPatients > 0 ? (item.value / reportData.totalPatients * 100) : 0;
                    return (
                      <div key={i} className={`text-center p-4 rounded-xl bg-${item.color}-50 border border-${item.color}-100`}>
                        <div className={`w-12 h-12 mx-auto mb-2 rounded-full bg-${item.color}-100 flex items-center justify-center`}>
                          <ItemIcon className={`h-6 w-6 text-${item.color}-600`} />
                        </div>
                        <p className={`text-2xl font-black text-${item.color}-600`}>{item.value}</p>
                        <p className={`text-xs text-${item.color}-700 font-medium`}>{item.label}</p>
                        <div className={`h-2 bg-${item.color}-200 rounded-full mt-2 overflow-hidden`}>
                          <div className={`h-full bg-${item.color}-500 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* ========== TOP PERFORMERS + NEED ATTENTION ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    Top 5 — Melhor Engajamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reportData.topPerformers.map((p, i) => <PatientRow key={p.id} patient={p} index={i} />)}
                </CardContent>
              </Card>
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Precisam de Atenção
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reportData.needAttention.map((p, i) => <PatientRow key={p.id} patient={p} index={i} />)}
                </CardContent>
              </Card>
            </div>

            {/* ========== RISK DISTRIBUTION ========== */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  Distribuição de Risco Clínico
                </h3>
                <div className="flex items-center gap-2 h-8 rounded-full overflow-hidden bg-gray-100">
                  {reportData.lowRisk > 0 && (
                    <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white min-w-[40px] transition-all"
                      style={{ width: `${(reportData.lowRisk / reportData.totalPatients) * 100}%` }}>
                      {reportData.lowRisk} Baixo
                    </div>
                  )}
                  {reportData.mediumRisk > 0 && (
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-white min-w-[40px] transition-all"
                      style={{ width: `${(reportData.mediumRisk / reportData.totalPatients) * 100}%` }}>
                      {reportData.mediumRisk} Médio
                    </div>
                  )}
                  {reportData.highRisk > 0 && (
                    <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white min-w-[40px] transition-all"
                      style={{ width: `${(reportData.highRisk / reportData.totalPatients) * 100}%` }}>
                      {reportData.highRisk} Alto
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ========== RECOMENDAÇÕES ========== */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-violet-600" />
                  Recomendações — {periodConfig.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportData.weeklyRecs.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{rec.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sem dados suficientes</h3>
              <p className="text-gray-500">Adicione pacientes para gerar relatórios.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default WeeklyReport;
