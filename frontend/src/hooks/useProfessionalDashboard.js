import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getProfessionalDashboardData, 
  countOpenEmergencies, 
  getRecentEmergencies,
  getBatchPatientRiskData,
  listProfessionalRecentMealAnalyses
} from '@/lib/supabase';
import {
  calculatePatientEngagementScore,
  classifyEngagement,
  calculateDashboardRiskScore,
  detectAttentionNeeded,
  generateRecommendations,
  calculateActiveInactive,
  calculateAverageEngagement,
  countActivePlans,
  calculateMonthlyRevenue,
  generateChecklistChartData,
  generateRiskTrendData
} from '@/utils/professionalIntelligence';

/**
 * Hook centralizado para dados do Dashboard Profissional Inteligente
 * Retorna TODOS os dados necessários para a Central de Comando
 */
export const useProfessionalDashboard = (professionalId) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawPatients, setRawPatients] = useState([]);
  const [patientsWithScore, setPatientsWithScore] = useState([]);
  const [sosCount, setSosCount] = useState(0);
  const [recentEmergencies, setRecentEmergencies] = useState([]);
  const [metrics, setMetrics] = useState({
    activePatients: 0,
    inactivePatients: 0,
    avgEngagement: 0,
    revenue: 0,
    activePlans: 0,
    sosOpen: 0,
    patientsAtRisk: 0
  });
  const [attentionAlerts, setAttentionAlerts] = useState([]);
  const [chartData, setChartData] = useState({ labels: [], values: [] });
  const [riskTrendData, setRiskTrendData] = useState({ labels: [], values: [] });
  const [recommendations, setRecommendations] = useState([]);

  /**
   * Carrega TODOS os dados do dashboard em uma única chamada
   */
  const loadDashboardData = useCallback(async () => {
    if (!professionalId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // === FASE 1: Dados paralelos (pacientes + emergências) ===
      const [patientsResult, sosResult, emergenciesResult] = await Promise.all([
        getProfessionalDashboardData(professionalId),
        countOpenEmergencies(professionalId),
        getRecentEmergencies(professionalId)
      ]);

      if (patientsResult.error) throw patientsResult.error;

      const patients = patientsResult.data || [];
      const openSos = sosResult.data || 0;
      const emergencies = emergenciesResult.data || [];

      setRawPatients(patients);
      setSosCount(openSos);
      setRecentEmergencies(emergencies);

      // === FASE 2: Enriquecer com engagement score ===
      const enrichedPatients = patients.map((patient) => {
        const score = calculatePatientEngagementScore(patient, patient.stats);
        const classification = classifyEngagement(score);
        return { ...patient, engagementScore: score, classification };
      });

      // === FASE 3: Buscar dados de risco clínico (batch) ===
      const patientIds = patients.map(p => p.id);
      let riskDataMap = {};
      
      if (patientIds.length > 0) {
        const { data: riskData } = await getBatchPatientRiskData(patientIds);
        riskDataMap = riskData || {};
      }

      // === FASE 4: Calcular risk scores do dashboard ===
      const patientsComplete = enrichedPatients.map((patient) => {
        const riskData = riskDataMap[patient.id] || null;
        const dashboardRisk = calculateDashboardRiskScore(patient, riskData);
        return { ...patient, dashboardRisk };
      });

      setPatientsWithScore(patientsComplete);

      // === FASE 5: Métricas agregadas ===
      const { active, inactive } = calculateActiveInactive(patientsComplete);
      const avgEngagement = calculateAverageEngagement(patientsComplete);
      const activePlans = countActivePlans(patientsComplete);
      const revenue = calculateMonthlyRevenue(patientsComplete);
      const patientsAtRisk = patientsComplete.filter(p => p.dashboardRisk?.score >= 70).length;

      setMetrics({
        activePatients: active,
        inactivePatients: inactive,
        avgEngagement,
        revenue,
        activePlans,
        sosOpen: openSos,
        patientsAtRisk
      });

      // === FASE 6: Alertas com emergências ===
      const alerts = detectAttentionNeeded(patientsComplete, emergencies);
      setAttentionAlerts(alerts);

      // === FASE 7: Gráficos ===
      const chart = generateChecklistChartData(patientsComplete);
      setChartData(chart);
      const riskTrend = generateRiskTrendData(patientsComplete);
      setRiskTrendData(riskTrend);

      // === FASE 8: Recomendações inteligentes ===
      const recs = generateRecommendations({
        patients: patientsComplete,
        alerts,
        sosCount: openSos,
        metrics: { activePatients: active, inactivePatients: inactive, avgEngagement }
      });
      setRecommendations(recs);

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  /**
   * Recarregar dados (manual refresh)
   */
  const refresh = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Carregar dados na montagem (APENAS quando professionalId mudar)
  useEffect(() => {
    if (professionalId) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId]);

  // Ranking de risco (memoizado)
  const riskRanking = useMemo(() => {
    return [...patientsWithScore]
      .sort((a, b) => (b.dashboardRisk?.score || 0) - (a.dashboardRisk?.score || 0))
      .slice(0, 10);
  }, [patientsWithScore]);

  return {
    loading,
    error,
    metrics,
    attentionAlerts,
    patientsWithScore,
    riskRanking,
    chartData,
    riskTrendData,
    recommendations,
    sosCount,
    recentEmergencies,
    refresh,
    rawPatients
  };
};

export default useProfessionalDashboard;
