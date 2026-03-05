import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Droplet, Footprints, Dumbbell, AlertTriangle, Loader2, Utensils, Camera, Eye, Lightbulb, Sparkles, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getPatientStats, uploadProfilePhoto, getPatientPersonalizedTips } from '@/lib/supabase';
import { toast } from 'sonner';
import ChecklistSimple from '@/components/ChecklistSimple';
import FirstAccessModal, { AnamneseBanner } from '@/components/FirstAccessModal';
import MealPlanViewerModal from '@/components/MealPlanViewerModal';
import EmergencyButton from '@/components/EmergencyButton';

const PatientDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [anamnesis, setAnamnesis] = useState(null);
  const [personalizedTips, setPersonalizedTips] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [hasCheckedFirstAccess, setHasCheckedFirstAccess] = useState(false);

  useEffect(() => {
    if (user) {
      loadPatientData();
    }
  }, [user]);

  // Verificar modal de primeiro acesso APENAS para anamnese incompleta
  useEffect(() => {
    if (user && !loading && !hasCheckedFirstAccess) {
      checkFirstAccess();
      setHasCheckedFirstAccess(true);
    }
  }, [user, loading, hasCheckedFirstAccess]);

  const checkFirstAccess = () => {
    // Só mostra modal se anamnese NÃO está completa e nunca viu o modal
    // Se anamnese está completa, não mostra modal (só banner se necessário)
    if (anamnesis?.status !== 'complete') {
      const hasSeenFirstModal = localStorage.getItem(`first_access_modal_${user.id}`);
      if (!hasSeenFirstModal) {
        setShowFirstAccessModal(true);
        localStorage.setItem(`first_access_modal_${user.id}`, 'true');
      }
    }
    // Se anamnese está completa, nunca mostra modal - só o banner é exibido
  };

  const handleStartAnamnesis = () => {
    navigate('/patient/anamnesis');
  };

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const stats = await getPatientStats(user.id);
      setPatientData(stats.profile);
      setActivePlan(stats.activePlan);
      setAnamnesis(stats.anamnesis);
      
      // Carregar dicas personalizadas
      const { data: tips } = await getPatientPersonalizedTips(user.id);
      setPersonalizedTips(tips || []);
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.id) return;
    setUploadingPhoto(true);
    try {
      const { error } = await uploadProfilePhoto(user.id, file);
      if (error) {
        toast.error('Erro ao atualizar foto');
      } else {
        toast.success('Foto de perfil atualizada!');
        loadPatientData();
      }
    } catch (err) {
      toast.error('Erro ao atualizar foto');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const calculateProgress = () => {
    if (!patientData?.current_weight || !patientData?.goal_weight) return 0;
    const startWeight = patientData.current_weight + 5; // Assumindo que começou 5kg acima
    const current = patientData.current_weight;
    const goal = patientData.goal_weight;
    const totalToLose = startWeight - goal;
    const lost = startWeight - current;
    return Math.min(100, Math.max(0, (lost / totalToLose) * 100));
  };

  const getGoalLabel = (goal) => {
    const goals = {
      'weight_loss': 'Emagrecimento',
      'muscle_gain': 'Ganho de Massa Muscular',
      'maintenance': 'Manutenção',
      'health': 'Saúde/Reeducação Alimentar',
      'sports': 'Performance Esportiva',
      'other': 'Outro'
    };
    return goals[goal] || goal || 'Não definido';
  };

  // Dicas padrão (fallback quando não tem personalizadas)
  const defaultTips = [
    { title: 'Lembre-se de beber água ao longo do dia', type: 'general' },
    { title: 'Evite pular refeições', type: 'general' },
    { title: 'Inclua vegetais em todas as refeições principais', type: 'general' }
  ];

  // Combinar dicas personalizadas com as padrão
  const allTips = personalizedTips.length > 0 ? personalizedTips : defaultTips;

  if (loading) {
    return (
      <Layout title="Dashboard" userType="patient">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      </Layout>
    );
  }

  const patientName = patientData?.name || profile?.name || 'Paciente';
  const progress = calculateProgress();

  return (
    <Layout title={`Olá, ${patientName.split(' ')[0]}!`} userType="patient">
      {/* Modal de Primeiro Acesso */}
      <FirstAccessModal
        show={showFirstAccessModal}
        onClose={() => setShowFirstAccessModal(false)}
        onStartAnamnesis={handleStartAnamnesis}
        anamnesisStatus={anamnesis?.status}
      />

      <div data-testid="patient-dashboard" className="space-y-6">
        {/* Banner de Anamnese Incompleta */}
        <AnamneseBanner
          anamnesisStatus={anamnesis?.status}
          onStartAnamnesis={handleStartAnamnesis}
        />
        
        {/* Foto de Perfil */}
        <Card className="border-0 bg-gradient-to-r from-teal-50 to-emerald-50 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-teal-600 flex items-center justify-center ring-2 ring-teal-300">
                  {patientData?.photo_url ? (
                    <img
                      src={patientData.photo_url}
                      alt={patientName}
                      className="w-full h-full object-cover"
                      data-testid="patient-profile-photo"
                    />
                  ) : (
                    <span className="text-white font-bold text-2xl">
                      {patientName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <label
                  htmlFor="profile-photo-upload"
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-700 transition-colors shadow-md"
                  title="Alterar foto de perfil"
                >
                  {uploadingPhoto ? (
                    <Loader2 size={12} className="text-white animate-spin" />
                  ) : (
                    <Camera size={12} className="text-white" />
                  )}
                  <input
                    id="profile-photo-upload"
                    data-testid="profile-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{patientName}</h3>
                <p className="text-sm text-gray-500">
                  {uploadingPhoto ? 'Atualizando foto...' : 'Clique na câmera para alterar sua foto'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Peso Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {patientData?.current_weight ? `${patientData.current_weight} kg` : '--'}
              </p>
              {patientData?.current_weight && patientData?.goal_weight && (
                <p className="text-sm text-green-600 mt-1">
                  Meta: {patientData.goal_weight} kg
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Objetivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-gray-900">{getGoalLabel(patientData?.goal)}</p>
              {patientData?.current_weight && patientData?.goal_weight && (
                <p className="text-sm text-gray-600 mt-1">
                  Faltam {Math.abs(patientData.current_weight - patientData.goal_weight).toFixed(1)} kg
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-teal-700">{progress.toFixed(0)}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-teal-700 h-2 rounded-full transition-all" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plano Alimentar Ativo */}
        {activePlan && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Utensils className="mr-2 text-green-600" size={20} />
                  Plano Alimentar Ativo
                </div>
                <Button 
                  size="sm"
                  className="bg-teal-700 hover:bg-teal-800"
                  onClick={() => setShowPlanModal(true)}
                >
                  <Eye size={16} className="mr-2" /> Ver Plano Completo
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{activePlan.name}</h3>
                  <p className="text-sm text-gray-600">
                    Atualizado em: {new Date(activePlan.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {activePlan.daily_targets && (
                  <div className="flex gap-4 text-sm">
                    <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full">
                      {activePlan.daily_targets.calorias?.toFixed(0) || 0} kcal
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      P: {activePlan.daily_targets.proteina?.toFixed(0) || 0}g
                    </span>
                  </div>
                )}
              </div>
              
              {/* Resumo das refeições */}
              {activePlan.plan_data?.meals && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {activePlan.plan_data.meals.slice(0, 3).map((meal) => (
                    <div 
                      key={meal.id} 
                      className="p-3 bg-gray-50 rounded-lg border-l-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      style={{ borderLeftColor: meal.color || '#0F766E' }}
                      onClick={() => setShowPlanModal(true)}
                    >
                      <p className="font-medium text-gray-900 text-sm">{meal.name}</p>
                      <p className="text-xs text-gray-600">{meal.time}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {meal.foods?.length || 0} alimentos
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Botão para ver mais */}
              {activePlan.plan_data?.meals && activePlan.plan_data.meals.length > 3 && (
                <div className="mt-3 text-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-teal-700 hover:text-teal-800"
                    onClick={() => setShowPlanModal(true)}
                  >
                    Ver todas as {activePlan.plan_data.meals.length} refeições →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Checklist Diário */}
          <ChecklistSimple patientId={user?.id} isPatientView={true} />

          {/* Dicas Personalizadas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Dicas do Nutricionista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {/* Dicas de Avaliação Física (destaque) */}
                {personalizedTips.filter(t => t.source === 'assessment' || t.type === 'assessment').slice(0, 3).map((tip, index) => (
                  <div key={`assessment-${index}`} className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-purple-600 uppercase">Baseado na sua avaliação</span>
                        <p className="text-sm text-gray-700 mt-1">{tip.tip || tip.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Dicas de Anamnese */}
                {personalizedTips.filter(t => t.source === 'anamnesis' || t.type === 'anamnesis').slice(0, 3).map((tip, index) => (
                  <div key={`anamnesis-${index}`} className="p-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-teal-500 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-teal-600 uppercase">Personalizada para você</span>
                        <p className="text-sm text-gray-700 mt-1">{tip.tip || tip.title}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Dicas Gerais (quando não tem personalizadas) */}
                {personalizedTips.length === 0 && defaultTips.map((tip, index) => (
                  <div key={index} className="p-3 bg-gray-50 border-l-4 border-gray-300 rounded">
                    <p className="text-sm text-gray-600">{tip.title}</p>
                  </div>
                ))}

                {/* Mensagem se não tem dicas */}
                {personalizedTips.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Complete sua anamnese e avaliação física para receber dicas personalizadas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas da Anamnese */}
        {anamnesis && anamnesis.conditions && anamnesis.conditions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 text-amber-600" size={20} />
                Alertas Importantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {anamnesis.conditions.map((alert, index) => (
                  <div key={index} className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                    <p className="font-semibold text-amber-900">{alert.condition}</p>
                    <p className="text-sm text-amber-700 mt-1">{alert.alert}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensagem quando não há plano */}
        {!activePlan && (
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="py-8 text-center">
              <Utensils className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum plano alimentar ativo
              </h3>
              <p className="text-gray-600">
                Seu nutricionista ainda não criou um plano alimentar para você.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Visualização do Plano */}
      <MealPlanViewerModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        mealPlan={activePlan}
        patient={{ name: patientName }}
        readOnly={true}
      />

      {/* Botão de Emergência (SOS) */}
      <EmergencyButton 
        patientId={user?.id}
        professionalId={profile?.professional_id}
      />
    </Layout>
  );
};

export default PatientDashboard;
