import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, UserX, AlertTriangle, ShieldAlert, TrendingUp,
  Plus, RefreshCw, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessionalDashboard } from '@/hooks/useProfessionalDashboard';
import MetricCard from '@/components/dashboard/MetricCard';
import AttentionAlert from '@/components/dashboard/AttentionAlert';
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid';
import SimpleEngagementChart from '@/components/dashboard/SimpleEngagementChart';
import RiskRankingList from '@/components/dashboard/RiskRankingList';
import RecommendationsSection from '@/components/dashboard/RecommendationsSection';
import { formatPercentage } from '@/utils/professionalIntelligence';

const ProfessionalDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const {
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
    refresh
  } = useProfessionalDashboard(profile?.id);

  // Handlers de ações rápidas
  const handleQuickAction = (action) => {
    switch (action) {
      case 'createPlan':
        navigate('/professional/patients');
        toast.info('Selecione um paciente para criar o plano');
        break;
      case 'sendFeedback':
        navigate('/professional/feedbacks');
        break;
      case 'createChecklist':
        navigate('/professional/patients');
        toast.info('Selecione um paciente para configurar checklist');
        break;
      case 'duplicatePlan':
        navigate('/professional/patients');
        toast.info('Selecione um paciente com plano para duplicar');
        break;
      case 'viewReports':
        toast.info('Relatórios em breve!');
        break;
      default:
        break;
    }
  };

  // Handler de alertas
  const handleAlertAction = (action, patientId) => {
    switch (action) {
      case 'sendReminder':
        toast.success('Lembrete enviado!');
        break;
      case 'sendFeedback':
        navigate(`/professional/patient/${patientId}?tab=feedbacks`);
        break;
      default:
        break;
    }
  };

  // Hora do dia para saudação
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (loading) {
    return (
      <Layout title="Dashboard" userType="professional">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Carregando Central de Comando...</p>
            <p className="text-gray-400 text-sm mt-1">Analisando dados dos pacientes</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard" userType="professional">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <p className="text-red-700">Erro ao carregar dashboard: {error}</p>
            <Button onClick={refresh} className="mt-4">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Central de Comando" userType="professional">
      <div className="max-w-7xl mx-auto space-y-6 pb-8">
        
        {/* ========== 1) HEADER PREMIUM ========== */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between relative z-10 gap-4">
            <div>
              <p className="text-teal-200 text-sm font-medium mb-1">
                {getGreeting()},
              </p>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {profile?.name?.split(' ')[0] || 'Profissional'} 👋
              </h1>
              <p className="text-teal-100 text-sm md:text-base">
                {patientsWithScore.length > 0 
                  ? `Você tem ${patientsWithScore.length} paciente${patientsWithScore.length > 1 ? 's' : ''} sob acompanhamento`
                  : 'Sua central de comando está pronta'}
              </p>
              {sosCount > 0 && (
                <div className="mt-2 inline-flex items-center gap-2 bg-red-500/20 border border-red-300/30 text-red-100 px-3 py-1.5 rounded-lg text-sm font-medium animate-pulse">
                  <span className="text-lg">🚨</span>
                  {sosCount} SOS pendente{sosCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                refresh();
                toast.success('Atualizando dados...');
              }}
              variant="outline"
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm shadow-lg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* ========== 2) CARDS EXECUTIVOS ========== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <MetricCard
            title="Pacientes Ativos"
            value={metrics.activePatients}
            subtitle="Últimos 7 dias"
            icon={Users}
            iconColor="text-green-600"
            iconBg="bg-green-100"
          />
          
          <MetricCard
            title="Inativos"
            value={metrics.inactivePatients}
            subtitle="7+ dias sem login"
            icon={UserX}
            iconColor="text-red-600"
            iconBg="bg-red-100"
          />
          
          <MetricCard
            title="SOS Abertas"
            value={metrics.sosOpen}
            subtitle="Emergências pendentes"
            icon={ShieldAlert}
            iconColor={metrics.sosOpen > 0 ? "text-red-600" : "text-gray-400"}
            iconBg={metrics.sosOpen > 0 ? "bg-red-100" : "bg-gray-100"}
          />
          
          <MetricCard
            title="Em Risco"
            value={metrics.patientsAtRisk}
            subtitle="Score ≥ 70"
            icon={AlertTriangle}
            iconColor={metrics.patientsAtRisk > 0 ? "text-orange-600" : "text-gray-400"}
            iconBg={metrics.patientsAtRisk > 0 ? "bg-orange-100" : "bg-gray-100"}
          />
          
          <MetricCard
            title="Engajamento"
            value={`${metrics.avgEngagement}%`}
            subtitle="Média dos pacientes"
            icon={TrendingUp}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
        </div>

        {/* ========== 3) ATENÇÃO HOJE ========== */}
        <AttentionAlert 
          alerts={attentionAlerts} 
          onAction={handleAlertAction}
        />

        {/* ========== 4) RANKING DE RISCO ========== */}
        <RiskRankingList 
          patients={riskRanking}
          onViewAll={() => navigate('/professional/patients')}
        />

        {/* ========== 5) GRÁFICO + RECOMENDAÇÕES (lado a lado) ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimpleEngagementChart 
            data={chartData}
            title="Adesão ao Checklist (7 dias)"
          />
          <RecommendationsSection 
            recommendations={recommendations}
          />
        </div>

        {/* ========== 6) AÇÕES RÁPIDAS ========== */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-600" />
              Ações Rápidas
            </h3>
            <QuickActionsGrid onAction={handleQuickAction} />
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
};

export default ProfessionalDashboard;
