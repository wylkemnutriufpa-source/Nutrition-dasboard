import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, Users, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Activity, Loader2, ChevronLeft, ChevronRight, Target, Award,
  Flame, Shield, UserCheck, UserX, MessageSquare, Zap, ArrowUp, ArrowDown,
  Minus, Calendar, Bot, FileText, Download, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessionalDashboard } from '@/hooks/useProfessionalDashboard';
import { trackProfessionalFeature } from '@/utils/featureTracking';

// ==================== HELPERS ====================
const getWeekRange = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    start: new Date(start.setHours(0, 0, 0, 0)),
    end: new Date(end.setHours(23, 59, 59, 999)),
    label: `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
  };
};

const getTrendIcon = (current, previous) => {
  if (current > previous) return { icon: ArrowUp, color: 'text-green-600', bg: 'bg-green-100' };
  if (current < previous) return { icon: ArrowDown, color: 'text-red-600', bg: 'bg-red-100' };
  return { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-100' };
};

// ==================== STAT CARD ====================
const StatCard = ({ title, value, subtitle, icon: Icon, gradient, trend }) => (
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
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          {trend > 0 ? (
            <Badge className="bg-green-100 text-green-700 border-0 text-xs"><ArrowUp className="h-3 w-3 mr-0.5" />{trend}%</Badge>
          ) : trend < 0 ? (
            <Badge className="bg-red-100 text-red-700 border-0 text-xs"><ArrowDown className="h-3 w-3 mr-0.5" />{Math.abs(trend)}%</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Estável</Badge>
          )}
          <span className="text-xs text-gray-400">vs semana anterior</span>
        </div>
      )}
    </div>
  </div>
);

// ==================== PATIENT ROW ====================
const PatientRow = ({ patient, index }) => {
  const score = patient.engagementScore || 0;
  const risk = patient.dashboardRisk?.score || 0;
  const classification = patient.classification || 'unknown';

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-green-600 bg-green-100';
    if (s >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskColor = (r) => {
    if (r >= 70) return 'text-red-600 bg-red-100';
    if (r >= 40) return 'text-amber-600 bg-amber-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-all">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0">
        {index + 1}
      </div>
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

// ==================== RECOMMENDATION CARD ====================
const RecommendationCard = ({ rec, index }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white">
    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
      <Zap className="h-4 w-4 text-violet-600" />
    </div>
    <div>
      <p className="font-semibold text-gray-900 text-sm">{rec.title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{rec.description}</p>
    </div>
  </div>
);

// ==================== PÁGINA PRINCIPAL ====================
const WeeklyReport = () => {
  const { user, profile } = useAuth();
  const professionalId = user?.id || profile?.id;
  const [weekOffset, setWeekOffset] = useState(0);

  const {
    loading,
    metrics,
    patientsWithScore,
    riskRanking,
    recommendations,
    sosCount,
    attentionAlerts,
    refresh
  } = useProfessionalDashboard(professionalId);

  React.useEffect(() => {
    trackProfessionalFeature('view_weekly_report');
  }, []);

  const currentWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return getWeekRange(d);
  }, [weekOffset]);

  // ========== COMPUTED DATA ==========
  const reportData = useMemo(() => {
    if (!patientsWithScore?.length) return null;

    const patients = patientsWithScore;
    const totalPatients = patients.length;
    const avgEngagement = metrics.avgEngagement || 0;

    // Classification breakdown
    const highEngagement = patients.filter(p => (p.engagementScore || 0) >= 80).length;
    const mediumEngagement = patients.filter(p => (p.engagementScore || 0) >= 50 && (p.engagementScore || 0) < 80).length;
    const lowEngagement = patients.filter(p => (p.engagementScore || 0) < 50).length;

    // Risk breakdown
    const highRisk = patients.filter(p => (p.dashboardRisk?.score || 0) >= 70).length;
    const mediumRisk = patients.filter(p => (p.dashboardRisk?.score || 0) >= 40 && (p.dashboardRisk?.score || 0) < 70).length;
    const lowRisk = patients.filter(p => (p.dashboardRisk?.score || 0) < 40).length;

    // Top performing patients (highest engagement)
    const topPerformers = [...patients]
      .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
      .slice(0, 5);

    // Patients needing attention (lowest engagement)
    const needAttention = [...patients]
      .sort((a, b) => (a.engagementScore || 0) - (b.engagementScore || 0))
      .slice(0, 5);

    // Weekly recommendations
    const weeklyRecs = [];
    if (lowEngagement > totalPatients * 0.3) {
      weeklyRecs.push({
        title: 'Engajamento geral baixo',
        description: `${lowEngagement} pacientes com engajamento abaixo de 50%. Considere enviar mensagens motivacionais.`
      });
    }
    if (highRisk > 0) {
      weeklyRecs.push({
        title: `${highRisk} paciente(s) em risco elevado`,
        description: 'Revise os planos alimentares e agende follow-ups prioritários.'
      });
    }
    if (metrics.inactivePatients > 2) {
      weeklyRecs.push({
        title: `${metrics.inactivePatients} pacientes inativos`,
        description: 'Considere ativar automações para notificar pacientes que não fazem login.'
      });
    }
    if (sosCount > 0) {
      weeklyRecs.push({
        title: `${sosCount} SOS pendente(s)`,
        description: 'Responda às emergências o mais rápido possível.'
      });
    }
    if (weeklyRecs.length === 0) {
      weeklyRecs.push({
        title: 'Tudo sob controle!',
        description: 'Seus pacientes estão com bom engajamento. Continue o excelente trabalho!'
      });
    }

    return {
      totalPatients,
      avgEngagement,
      highEngagement,
      mediumEngagement,
      lowEngagement,
      highRisk,
      mediumRisk,
      lowRisk,
      topPerformers,
      needAttention,
      weeklyRecs
    };
  }, [patientsWithScore, metrics, sosCount]);

  if (loading) {
    return (
      <Layout title="Relatório Semanal" userType="professional">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatório Semanal" userType="professional">
      <div className="max-w-7xl mx-auto space-y-6 pb-8">

        {/* ========== PREMIUM HEADER ========== */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-3">
                📊 Relatório Inteligente
              </span>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-xl">
                    <BarChart3 className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Relatório Semanal</h1>
                    <p className="text-white/80 text-sm">Visão completa da semana</p>
                  </div>
                </div>
                <Button
                  onClick={() => { refresh(); }}
                  className="bg-white/20 text-white hover:bg-white/30 border border-white/20 backdrop-blur-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
                </Button>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center justify-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setWeekOffset(weekOffset - 1)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-white/80" />
                  <span className="font-semibold text-white">{currentWeek.label}</span>
                  {weekOffset === 0 && <Badge className="bg-white/20 text-white border-0 text-[10px]">Atual</Badge>}
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setWeekOffset(Math.min(0, weekOffset + 1))} disabled={weekOffset >= 0}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {reportData ? (
          <>
            {/* ========== STATS CARDS ========== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Pacientes"
                value={reportData.totalPatients}
                icon={Users}
                gradient="from-teal-500 to-emerald-600"
                subtitle={`${metrics.activePatients} ativos`}
              />
              <StatCard
                title="Engajamento Médio"
                value={`${reportData.avgEngagement}%`}
                icon={TrendingUp}
                gradient="from-blue-500 to-indigo-600"
                subtitle={`${reportData.highEngagement} acima de 80%`}
              />
              <StatCard
                title="Em Risco"
                value={reportData.highRisk}
                icon={AlertTriangle}
                gradient="from-red-500 to-rose-600"
                subtitle={`${reportData.mediumRisk} moderado`}
              />
              <StatCard
                title="SOS Pendentes"
                value={sosCount}
                icon={Shield}
                gradient="from-amber-500 to-orange-600"
                subtitle={`${attentionAlerts?.length || 0} alertas`}
              />
            </div>

            {/* ========== ENGAGEMENT BREAKDOWN ========== */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  Distribuição de Engajamento
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-green-50 border border-green-100">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
                      <Flame className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-2xl font-black text-green-600">{reportData.highEngagement}</p>
                    <p className="text-xs text-green-700 font-medium">Alto (80%+)</p>
                    <div className="h-2 bg-green-200 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${reportData.totalPatients > 0 ? (reportData.highEngagement / reportData.totalPatients * 100) : 0}%` }} />
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-amber-100 flex items-center justify-center">
                      <Target className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="text-2xl font-black text-amber-600">{reportData.mediumEngagement}</p>
                    <p className="text-xs text-amber-700 font-medium">Médio (50-79%)</p>
                    <div className="h-2 bg-amber-200 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${reportData.totalPatients > 0 ? (reportData.mediumEngagement / reportData.totalPatients * 100) : 0}%` }} />
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-red-50 border border-red-100">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="text-2xl font-black text-red-600">{reportData.lowEngagement}</p>
                    <p className="text-xs text-red-700 font-medium">Baixo (&lt;50%)</p>
                    <div className="h-2 bg-red-200 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${reportData.totalPatients > 0 ? (reportData.lowEngagement / reportData.totalPatients * 100) : 0}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ========== TOP PERFORMERS + NEED ATTENTION ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    Top 5 - Melhor Engajamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reportData.topPerformers.map((p, i) => (
                    <PatientRow key={p.id} patient={p} index={i} />
                  ))}
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
                  {reportData.needAttention.map((p, i) => (
                    <PatientRow key={p.id} patient={p} index={i} />
                  ))}
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
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white min-w-[40px] transition-all"
                      style={{ width: `${(reportData.lowRisk / reportData.totalPatients) * 100}%` }}
                    >
                      {reportData.lowRisk} Baixo
                    </div>
                  )}
                  {reportData.mediumRisk > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-white min-w-[40px] transition-all"
                      style={{ width: `${(reportData.mediumRisk / reportData.totalPatients) * 100}%` }}
                    >
                      {reportData.mediumRisk} Médio
                    </div>
                  )}
                  {reportData.highRisk > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white min-w-[40px] transition-all"
                      style={{ width: `${(reportData.highRisk / reportData.totalPatients) * 100}%` }}
                    >
                      {reportData.highRisk} Alto
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ========== RECOMENDAÇÕES DA SEMANA ========== */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-violet-600" />
                  Recomendações da Semana
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportData.weeklyRecs.map((rec, i) => (
                  <RecommendationCard key={i} rec={rec} index={i} />
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sem dados suficientes</h3>
              <p className="text-gray-500">Adicione pacientes para gerar relatórios semanais.</p>
            </CardContent>
          </Card>
        )}

      </div>
    </Layout>
  );
};

export default WeeklyReport;
