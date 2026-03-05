/**
 * patientAdherenceEngine.js
 * Sistema inteligente de cálculo de aderência do paciente
 * Integra: Checklists, Feedbacks, Automações, Interações
 */

import { supabase } from '@/lib/supabase';

/**
 * Calcula o score de aderência do paciente (0-100)
 * @param {string} patientId - ID do paciente
 * @returns {Object} - Score e métricas detalhadas
 */
export async function calculatePatientAdherence(patientId) {
  try {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. CHECKLISTS COMPLETADOS (peso: 40%)
    const { data: checklistsData } = await supabase
      .from('checklist_assignments')
      .select('*, tasks:checklist_tasks(*)')
      .eq('patient_id', patientId)
      .gte('created_at', last30Days.toISOString());

    const totalTasks = checklistsData?.reduce((sum, cl) => sum + (cl.tasks?.length || 0), 0) || 0;
    const completedTasks = checklistsData?.reduce((sum, cl) => {
      return sum + (cl.tasks?.filter(t => t.completed).length || 0);
    }, 0) || 0;
    const checklistScore = totalTasks > 0 ? (completedTasks / totalTasks) * 40 : 0;

    // 2. FEEDBACKS NO PRAZO (peso: 30%)
    const { data: feedbacksData } = await supabase
      .from('patient_feedbacks')
      .select('*')
      .eq('patient_id', patientId)
      .gte('created_at', last30Days.toISOString());

    const expectedFeedbacksPerWeek = 2; // Configurável pelo profissional
    const weeksInPeriod = 4;
    const expectedTotal = expectedFeedbacksPerWeek * weeksInPeriod;
    const actualFeedbacks = feedbacksData?.length || 0;
    const feedbackScore = Math.min((actualFeedbacks / expectedTotal) * 30, 30);

    // 3. TEMPO DE RESPOSTA (peso: 20%)
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('patient_id', patientId)
      .gte('created_at', last7Days.toISOString())
      .order('created_at', { ascending: false });

    let responseScore = 20;
    if (messagesData && messagesData.length > 0) {
      const lastMessage = messagesData[0];
      const hoursSinceLastMessage = (now - new Date(lastMessage.created_at)) / (1000 * 60 * 60);
      
      if (hoursSinceLastMessage <= 24) responseScore = 20;
      else if (hoursSinceLastMessage <= 72) responseScore = 15;
      else if (hoursSinceLastMessage <= 168) responseScore = 10;
      else responseScore = 5;
    } else {
      responseScore = 5; // Sem mensagens recentes
    }

    // 4. ENGAJAMENTO GERAL (peso: 10%)
    const { data: interactionsData } = await supabase
      .from('patient_interactions')
      .select('*')
      .eq('patient_id', patientId)
      .gte('created_at', last7Days.toISOString());

    const interactionsCount = interactionsData?.length || 0;
    const engagementScore = Math.min((interactionsCount / 10) * 10, 10);

    // SCORE FINAL
    const totalScore = Math.round(checklistScore + feedbackScore + responseScore + engagementScore);

    // CLASSIFICAÇÃO
    let adherenceLevel = 'excellent';
    let adherenceLabel = 'Excelente';
    let adherenceIcon = '✅';
    let adherenceColor = 'emerald';

    if (totalScore < 50) {
      adherenceLevel = 'risk';
      adherenceLabel = 'Risco';
      adherenceIcon = '🔴';
      adherenceColor = 'red';
    } else if (totalScore < 70) {
      adherenceLevel = 'attention';
      adherenceLabel = 'Atenção';
      adherenceIcon = '⚠️';
      adherenceColor = 'amber';
    } else if (totalScore < 85) {
      adherenceLevel = 'good';
      adherenceLabel = 'Bom';
      adherenceIcon = '✓';
      adherenceColor = 'blue';
    }

    // Última interação
    const allDates = [
      ...(checklistsData?.map(c => c.updated_at) || []),
      ...(feedbacksData?.map(f => f.created_at) || []),
      ...(messagesData?.map(m => m.created_at) || [])
    ].sort().reverse();
    const lastInteraction = allDates[0] ? new Date(allDates[0]) : null;

    return {
      score: totalScore,
      level: adherenceLevel,
      label: adherenceLabel,
      icon: adherenceIcon,
      color: adherenceColor,
      metrics: {
        checklists: {
          total: totalTasks,
          completed: completedTasks,
          percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        feedbacks: {
          expected: expectedTotal,
          actual: actualFeedbacks,
          percentage: Math.round((actualFeedbacks / expectedTotal) * 100)
        },
        lastInteraction: lastInteraction,
        daysSinceLastInteraction: lastInteraction 
          ? Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24))
          : null
      },
      alerts: generateAlerts(totalScore, {
        checklistsPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        feedbacksPercentage: (actualFeedbacks / expectedTotal) * 100,
        daysSinceLastInteraction: lastInteraction 
          ? Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24))
          : 999
      })
    };
  } catch (error) {
    console.error('Erro ao calcular aderência:', error);
    return {
      score: 0,
      level: 'unknown',
      label: 'Sem dados',
      icon: '❓',
      color: 'gray',
      metrics: null,
      alerts: []
    };
  }
}

/**
 * Gera alertas baseados nas métricas
 */
function generateAlerts(score, metrics) {
  const alerts = [];

  if (metrics.checklistsPercentage < 50) {
    alerts.push({
      type: 'checklist',
      severity: 'high',
      message: 'Baixa conclusão de checklists',
      icon: '📋'
    });
  }

  if (metrics.feedbacksPercentage < 50) {
    alerts.push({
      type: 'feedback',
      severity: 'medium',
      message: 'Poucos feedbacks enviados',
      icon: '💬'
    });
  }

  if (metrics.daysSinceLastInteraction > 7) {
    alerts.push({
      type: 'inactive',
      severity: 'high',
      message: `${metrics.daysSinceLastInteraction} dias sem interagir`,
      icon: '⏰'
    });
  }

  if (score < 50) {
    alerts.push({
      type: 'risk',
      severity: 'critical',
      message: 'Paciente em risco de abandono',
      icon: '🚨'
    });
  }

  return alerts;
}

/**
 * Calcula aderência para múltiplos pacientes (em lote)
 */
export async function calculateBulkAdherence(patientIds) {
  const results = await Promise.all(
    patientIds.map(id => calculatePatientAdherence(id))
  );
  
  return patientIds.reduce((acc, id, index) => {
    acc[id] = results[index];
    return acc;
  }, {});
}

/**
 * Configurações padrão de aderência
 */
export const ADHERENCE_CONFIG = {
  checklistsWeight: 40,
  feedbacksWeight: 30,
  responseTimeWeight: 20,
  engagementWeight: 10,
  expectedFeedbacksPerWeek: 2,
  criticalInactiveDays: 7
};

export default calculatePatientAdherence;
