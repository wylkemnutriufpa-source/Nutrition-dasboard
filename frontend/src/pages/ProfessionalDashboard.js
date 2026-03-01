import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, UserX, AlertTriangle, ShieldAlert, TrendingUp,
  RefreshCw, Activity
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
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import MealAnalysisSection from '@/components/dashboard/MealAnalysisSection';
import BodyAnalysisSection from '@/components/dashboard/BodyAnalysisSection';

/** Wrapper de animação com delay escalonado */
const AnimatedSection = ({ children, delay = 0, className = '' }) => (
  <div
    className={`opacity-0 animate-fade-in-up ${className}`}
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
  >
    {children}
  </div>
);

const ProfessionalDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const {
    loading,
    error,
    metrics,
    attentionAlerts,
    riskRanking,
    chartData,
    recommendations,
    sosCount,
    patientsWithScore,
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

  // Saudação dinâmica
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // ========== LOADING: Skeleton Premium ==========
  if (loading) {
    return (
      <Layout title="Dashboard" userType="professional">
        <DashboardSkeleton />
      </Layout>
    );
  }

  // ========== ERRO ==========
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
        <AnimatedSection delay={0}>
          <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            {/* Elementos decorativos */}
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
                  <div className="mt-3 inline-flex items-center gap-2 bg-red-500/25 border border-red-300/40 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400" />
                    </span>
                    {sosCount} SOS pendente{sosCount > 1 ? 's' : ''} — Ação imediata
                  </div>
                )}
              </div>
              <Button
                onClick={() => {
                  refresh();
                  toast.success('Atualizando dados...');
                }}
                variant="outline"
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm shadow-lg transition-all hover:scale-105"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </AnimatedSection>

        {/* ========== 2) CARDS EXECUTIVOS (com stagger) ========== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <AnimatedSection delay={80}>
            <MetricCard
              title="Pacientes Ativos"
              value={metrics.activePatients}
              subtitle="Últimos 7 dias"
              icon={Users}
              iconColor="text-green-600"
              iconBg="bg-green-100"
            />
          </AnimatedSection>
          
          <AnimatedSection delay={140}>
            <MetricCard
              title="Inativos"
              value={metrics.inactivePatients}
              subtitle="7+ dias sem login"
              icon={UserX}
              iconColor="text-red-600"
              iconBg="bg-red-100"
            />
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <MetricCard
              title="SOS Abertas"
              value={metrics.sosOpen}
              subtitle="Emergências pendentes"
              icon={ShieldAlert}
              iconColor={metrics.sosOpen > 0 ? "text-red-600" : "text-gray-400"}
              iconBg={metrics.sosOpen > 0 ? "bg-red-100" : "bg-gray-100"}
              urgent={metrics.sosOpen > 0}
            />
          </AnimatedSection>
          
          <AnimatedSection delay={260}>
            <MetricCard
              title="Em Risco"
              value={metrics.patientsAtRisk}
              subtitle="Score ≥ 70"
              icon={AlertTriangle}
              iconColor={metrics.patientsAtRisk > 0 ? "text-orange-600" : "text-gray-400"}
              iconBg={metrics.patientsAtRisk > 0 ? "bg-orange-100" : "bg-gray-100"}
            />
          </AnimatedSection>
          
          <AnimatedSection delay={320}>
            <MetricCard
              title="Engajamento"
              value={`${metrics.avgEngagement}%`}
              subtitle="Média dos pacientes"
              icon={TrendingUp}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
            />
          </AnimatedSection>
        </div>

        {/* ========== 3) ATENÇÃO HOJE ========== */}
        <AnimatedSection delay={400}>
          <AttentionAlert 
            alerts={attentionAlerts} 
            onAction={handleAlertAction}
          />
        </AnimatedSection>

        {/* ========== 4) RANKING DE RISCO + ANÁLISES DE PRATOS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedSection delay={500}>
            <RiskRankingList 
              patients={riskRanking}
              onViewAll={() => navigate('/professional/patients')}
            />
          </AnimatedSection>
          <AnimatedSection delay={550}>
            <MealAnalysisSection professionalId={profile?.id} />
          </AnimatedSection>
        </div>

        {/* ========== 5) GRÁFICO + RECOMENDAÇÕES ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedSection delay={600}>
            <SimpleEngagementChart 
              data={chartData}
              title="Adesão ao Checklist (7 dias)"
            />
          </AnimatedSection>
          <AnimatedSection delay={700}>
            <RecommendationsSection 
              recommendations={recommendations}
            />
          </AnimatedSection>
        </div>

        {/* ========== 6) AÇÕES RÁPIDAS ========== */}
        <AnimatedSection delay={800}>
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                Ações Rápidas
              </h3>
              <QuickActionsGrid onAction={handleQuickAction} />
            </CardContent>
          </Card>
        </AnimatedSection>

      </div>
    </Layout>
  );
};

export default ProfessionalDashboard;
