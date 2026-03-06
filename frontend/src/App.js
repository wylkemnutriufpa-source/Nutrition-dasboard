import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { BrandingProvider, useBranding } from '@/contexts/BrandingContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoleGuard, BlockPatientGuard, AdminOnlyGuard, PatientOnlyGuard } from '@/guards/RoleGuard';
import AdminBar from '@/components/AdminBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { initErrorLogger } from '@/utils/errorLogger';

// Componente para atualizar título dinamicamente
const DynamicTitle = () => {
  const { branding } = useBranding();
  
  useEffect(() => {
    const brandName = branding?.brand_name || 'FitJourney';
    const slogan = branding?.login_title || 'Sua jornada para uma vida mais saudável';
    document.title = `${brandName} - ${slogan}`;
  }, [branding]);
  
  return null;
};

// ==================== LAZY LOADING ====================
// Todas as páginas carregadas sob demanda para evitar travamento
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const AdminDashboard = React.lazy(() => import('@/pages/AdminDashboard'));
const AdminProjetoEditor = React.lazy(() => import('@/pages/AdminProjetoEditor'));
const ProfessionalDashboard = React.lazy(() => import('@/pages/ProfessionalDashboard'));
const PlatformGuide = React.lazy(() => import('@/pages/PlatformGuide'));
const AutomationCenter = React.lazy(() => import('@/pages/AutomationCenter'));
const WeeklyReport = React.lazy(() => import('@/pages/WeeklyReport'));
const PatientsList = React.lazy(() => import('@/pages/PatientsList'));
const PatientProfile = React.lazy(() => import('@/pages/PatientProfile'));
const MealPlanEditor = React.lazy(() => import('@/pages/MealPlanEditor'));
const PatientDashboard = React.lazy(() => import('@/pages/PatientDashboard'));
const PatientAnamnesisPage = React.lazy(() => import('@/pages/PatientAnamnesisPage'));
const PatientTarefas = React.lazy(() => import('@/pages/PatientTarefas'));
const PatientFeedbacks = React.lazy(() => import('@/pages/PatientFeedbacks'));
const PatientReceitas = React.lazy(() => import('@/pages/PatientReceitas'));
const PatientListaCompras = React.lazy(() => import('@/pages/PatientListaCompras'));
const PatientSuplementos = React.lazy(() => import('@/pages/PatientSuplementos'));
const PatientDicas = React.lazy(() => import('@/pages/PatientDicas'));
const PatientJornada = React.lazy(() => import('@/pages/PatientJornada'));
const MinhaJornada = React.lazy(() => import('@/pages/MinhaJornada'));
const Biblioteca = React.lazy(() => import('@/pages/Biblioteca'));
const PatientAgenda = React.lazy(() => import('@/pages/PatientAgenda'));
const PatientAvaliacaoFisica = React.lazy(() => import('@/pages/PatientAvaliacaoFisica'));
const MealPhotoAnalysis = React.lazy(() => import('@/pages/MealPhotoAnalysis'));
const BodyAnalysis = React.lazy(() => import('@/pages/BodyAnalysis'));
const CalculatorsList = React.lazy(() => import('@/pages/CalculatorsList'));
const WeightCalculator = React.lazy(() => import('@/pages/WeightCalculator'));
const WaterCalculator = React.lazy(() => import('@/pages/WaterCalculator'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));
const FoodDatabase = React.lazy(() => import('@/pages/FoodDatabase'));
const MealTemplateGalleryPage = React.lazy(() => import('@/pages/MealTemplateGalleryPage'));
const GlobalTipsPage = React.lazy(() => import('@/pages/GlobalTipsPage'));
const BrandingSettings = React.lazy(() => import('@/pages/BrandingSettings'));
const HealthCheckQuiz = React.lazy(() => import('@/pages/HealthCheckQuiz'));
const ProjetoBiquiniBranco = React.lazy(() => import('@/pages/ProjetoBiquiniBranco'));
const AgendaPage = React.lazy(() => import('@/pages/AgendaPage'));
const FinanceiroPage = React.lazy(() => import('@/pages/FinanceiroPage'));
const FeedbacksList = React.lazy(() => import('@/pages/FeedbacksList'));
const RecipesManager = React.lazy(() => import('@/pages/RecipesManager'));
const TestimonialsModeration = React.lazy(() => import('@/pages/TestimonialsModeration'));
const TemplatesGlobais = React.lazy(() => import('@/pages/TemplatesGlobais'));
const AdminFeatureControl = React.lazy(() => import('@/pages/AdminFeatureControl'));

// Fallback de carregamento
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600 mx-auto mb-3" />
      <p className="text-sm text-gray-500">Carregando...</p>
    </div>
  </div>
);

// ProtectedRoute agora usa RoleGuard (com source of truth em profile.role via AuthContext)
const ProtectedRoute = ({ children, allowedTypes }) => {
  return (
    <RoleGuard allowedRoles={allowedTypes}>
      {children}
    </RoleGuard>
  );
};

function App() {
  useEffect(() => {
    // Inicializar error logger (apenas uma vez)
    initErrorLogger();
  }, []);

  return (
    <ErrorBoundary>
      <div className="App">
        <AuthProvider>
          <BrandingProvider>
            <DynamicTitle />
            <BrowserRouter>
              {/* AdminBar: aparece automaticamente quando admin está em outras áreas */}
              <AdminBar />
              
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LoginPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedTypes={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/professionals" element={
                <ProtectedRoute allowedTypes={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/features" element={
                <ProtectedRoute allowedTypes={['admin']}>
                  <AdminFeatureControl />
                </ProtectedRoute>
              } />
              
              {/* Professional Routes - Admin também pode acessar */}
              <Route path="/professional/dashboard" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <ProfessionalDashboard />
                </ProtectedRoute>
              } />
              <Route path="/professional/patients" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <PatientsList />
                </ProtectedRoute>
              } />
              <Route path="/professional/patient/:id" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <PatientProfile />
                </ProtectedRoute>
              } />
              <Route path="/professional/meal-plan-editor" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <MealPlanEditor />
                </ProtectedRoute>
              } />
              <Route path="/professional/settings" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/professional/food-database" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <FoodDatabase />
                </ProtectedRoute>
              } />
              <Route path="/professional/gallery" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <MealTemplateGalleryPage />
                </ProtectedRoute>
              } />
              <Route path="/professional/dicas" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <GlobalTipsPage />
                </ProtectedRoute>
              } />
              <Route path="/professional/branding" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <BrandingSettings />
                </ProtectedRoute>
              } />
              <Route path="/professional/projeto-editor" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <AdminProjetoEditor />
                </ProtectedRoute>
              } />
              <Route path="/professional/testimonials" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <TestimonialsModeration />
                </ProtectedRoute>
              } />
              <Route path="/professional/agenda" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <AgendaPage />
                </ProtectedRoute>
              } />
              <Route path="/professional/financeiro" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <FinanceiroPage />
                </ProtectedRoute>
              } />
              <Route path="/professional/feedbacks" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <FeedbacksList />
                </ProtectedRoute>
              } />
              <Route path="/professional/receitas" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <RecipesManager />
                </ProtectedRoute>
              } />
              <Route path="/professional/templates" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <TemplatesGlobais />
                </ProtectedRoute>
              } />
              <Route path="/professional/guide" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <PlatformGuide />
                </ProtectedRoute>
              } />
              <Route path="/professional/automations" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <AutomationCenter />
                </ProtectedRoute>
              } />
              <Route path="/professional/reports" element={
                <ProtectedRoute allowedTypes={['professional', 'admin']}>
                  <WeeklyReport />
                </ProtectedRoute>
              } />
              
              {/* Patient Routes */}
              <Route path="/patient/dashboard" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientDashboard />
                </ProtectedRoute>
              } />
              <Route path="/patient/anamnesis" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientAnamnesisPage />
                </ProtectedRoute>
              } />
              <Route path="/patient/meal-plan" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <MealPlanEditor userType="patient" />
                </ProtectedRoute>
              } />
              <Route path="/patient/tarefas" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientTarefas />
                </ProtectedRoute>
              } />
              <Route path="/patient/feedbacks" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientFeedbacks />
                </ProtectedRoute>
              } />
              <Route path="/patient/receitas" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientReceitas />
                </ProtectedRoute>
              } />
              <Route path="/patient/lista-compras" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientListaCompras />
                </ProtectedRoute>
              } />
              <Route path="/patient/suplementos" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientSuplementos />
                </ProtectedRoute>
              } />
              <Route path="/patient/dicas" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientDicas />
                </ProtectedRoute>
              } />
              <Route path="/patient/avaliacao-fisica" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientAvaliacaoFisica />
                </ProtectedRoute>
              } />
              <Route path="/patient/meal-photo" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <MealPhotoAnalysis />
                </ProtectedRoute>
              } />
              <Route path="/patient/body-analysis" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <BodyAnalysis />
                </ProtectedRoute>
              } />
              <Route path="/patient/jornada" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientJornada />
                </ProtectedRoute>
              } />
              <Route path="/patient/minha-jornada" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <MinhaJornada />
                </ProtectedRoute>
              } />
              <Route path="/patient/biblioteca" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <Biblioteca />
                </ProtectedRoute>
              } />
              <Route path="/patient/agenda" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientAgenda />
                </ProtectedRoute>
              } />
              <Route path="/patient/checklist" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientTarefas />
                </ProtectedRoute>
              } />
              <Route path="/patient/messages" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientDashboard />
                </ProtectedRoute>
              } />
              <Route path="/patient/calculators" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <CalculatorsList userType="patient" />
                </ProtectedRoute>
              } />
              <Route path="/patient/calculadoras" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <CalculatorsList userType="patient" />
                </ProtectedRoute>
              } />
              <Route path="/patient/calculator/weight" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <WeightCalculator userType="patient" />
                </ProtectedRoute>
              } />
              <Route path="/patient/calculator/water" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <WaterCalculator userType="patient" />
                </ProtectedRoute>
              } />
              <Route path="/patient/feedback" element={
                <ProtectedRoute allowedTypes={['patient']}>
                  <PatientDashboard />
                </ProtectedRoute>
              } />
              
              {/* Visitor Routes */}
              <Route path="/visitor/health-check" element={
                <ProtectedRoute allowedTypes={['visitor']}>
                  <HealthCheckQuiz />
                </ProtectedRoute>
              } />
              <Route path="/visitor/projeto" element={
                <ProtectedRoute allowedTypes={['visitor']}>
                  <ProjetoBiquiniBranco />
                </ProtectedRoute>
              } />
              <Route path="/visitor/calculators" element={
                <ProtectedRoute allowedTypes={['visitor']}>
                  <CalculatorsList userType="visitor" />
                </ProtectedRoute>
              } />
              <Route path="/visitor/calculator/weight" element={
                <ProtectedRoute allowedTypes={['visitor']}>
                  <WeightCalculator userType="visitor" />
                </ProtectedRoute>
              } />
              <Route path="/visitor/calculator/water" element={
                <ProtectedRoute allowedTypes={['visitor']}>
                  <WaterCalculator userType="visitor" />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
              </Suspense>
          </BrowserRouter>
        </BrandingProvider>
      </AuthProvider>
      {/* Toaster fora do Router para evitar unmount durante navegação */}
      <Toaster position="top-right" duration={3000} />
    </div>
    </ErrorBoundary>
  );
}

export default App;
