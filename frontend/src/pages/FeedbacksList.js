import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, User, Calendar, ArrowRight, Loader2, AlertCircle, 
  CheckCircle, Clock, Filter, Bell, AlertTriangle 
} from 'lucide-react';
import { 
  supabase, 
  getCurrentUser, 
  getProfessionalEmergencies, 
  updateFeedbackStatus,
  countOpenEmergencies,
  getUserProfile
} from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { trackProfessionalFeature } from '@/utils/featureTracking';

const FeedbacksList = () => {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [openEmergencyCount, setOpenEmergencyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [professionalId, setProfessionalId] = useState(null);

  const loadFeedbacks = useCallback(async () => {
    if (!professionalId) return;
    
    try {
      // Buscar feedbacks normais (patient_messages)
      const { data: messagesData, error: messagesError } = await supabase
        .from('patient_messages')
        .select(`
          *,
          patient:profiles!patient_id(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;
      setFeedbacks(messagesData || []);
    } catch (error) {
      console.error('Erro ao carregar feedbacks:', error);
      toast.error('Erro ao carregar feedbacks');
    }
  }, [professionalId]);

  const loadEmergencies = useCallback(async () => {
    if (!professionalId) return;
    
    try {
      // Buscar emergências
      const { data: emergencyData, error: emergencyError } = await getProfessionalEmergencies(professionalId, null);
      if (emergencyError) throw emergencyError;
      setEmergencies(emergencyData || []);

      // Contar emergências abertas
      const { data: count } = await countOpenEmergencies(professionalId);
      setOpenEmergencyCount(count || 0);
    } catch (error) {
      console.error('Erro ao carregar emergências:', error);
    }
  }, [professionalId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!user) {
          toast.error('Usuário não autenticado');
          return;
        }

        const profile = await getUserProfile(user.id);
        if (profile) {
          setProfessionalId(profile.id);
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (professionalId) {
      loadFeedbacks();
      loadEmergencies();
      trackProfessionalFeature('view_feedbacks');
    }
  }, [professionalId, loadFeedbacks, loadEmergencies]);

  const handleResolveEmergency = async (emergencyId) => {
    try {
      const { error } = await updateFeedbackStatus(emergencyId, 'resolved');
      if (error) throw error;
      
      toast.success('Emergência marcada como resolvida');
      trackProfessionalFeature('respond_sos');
      loadEmergencies();
    } catch (error) {
      console.error('Erro ao resolver emergência:', error);
      toast.error('Erro ao resolver emergência');
    }
  };

  const getMoodEmoji = (mood) => {
    const moods = {
      great: '😊', good: '🙂', ok: '😐', bad: '😟', terrible: '😞'
    };
    return moods[mood] || '😐';
  };

  const getMoodLabel = (mood) => {
    const labels = {
      great: 'Ótimo', good: 'Bom', ok: 'Ok', bad: 'Ruim', terrible: 'Péssimo'
    };
    return labels[mood] || 'Sem humor';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      compulsao: '🍔 Compulsão/Fome',
      ansiedade: '😰 Ansiedade/Estresse',
      dor: '🤢 Dor/Mal-estar',
      dificuldade: '😕 Dificuldade no Plano',
      outro: '❓ Outro'
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <Layout title="Feedbacks dos Pacientes" showBack userType="professional">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-teal-700" size={48} />
        </div>
      </Layout>
    );
  }

  const openEmergencies = emergencies.filter(e => e.status === 'open');
  const resolvedEmergencies = emergencies.filter(e => e.status === 'resolved');

  return (
    <Layout title="Feedbacks dos Pacientes" showBack userType="professional">
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 via-rose-900 to-pink-900 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/10">
                  <MessageCircle className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight">Central de Feedbacks</h1>
                  <p className="text-rose-300 text-sm">Acompanhe feedbacks e emergencias dos seus pacientes</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-lg">
                <div className="text-center bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-black">{feedbacks.length}</p>
                  <p className="text-xs text-white/60">Feedbacks</p>
                </div>
                <div className="text-center bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-black">{openEmergencyCount}</p>
                  <p className="text-xs text-white/60">SOS Abertos</p>
                </div>
                <div className="text-center bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-black">{emergencies.filter(e => e.status === 'resolved').length}</p>
                  <p className="text-xs text-white/60">Resolvidos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerta de Emergências Abertas */}
        {openEmergencyCount > 0 && (
          <Card className="border-red-500 border-2 bg-red-50 animate-pulse">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <AlertCircle className="text-white" size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-700 text-lg">
                      🆘 {openEmergencyCount} Emergência(s) Aberta(s)!
                    </h3>
                    <p className="text-red-600 text-sm">
                      Pacientes precisam de atenção urgente
                    </p>
                  </div>
                </div>
                <Button 
                  variant="destructive"
                  onClick={() => setActiveTab('emergencies')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Bell className="mr-2" size={18} />
                  Ver Emergências
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="text-teal-700" size={24} />
                  <CardTitle>Central de Feedbacks</CardTitle>
                </div>
                <TabsList>
                  <TabsTrigger value="all" className="gap-2">
                    <Filter size={14} />
                    Todos ({feedbacks.length + emergencies.length})
                  </TabsTrigger>
                  <TabsTrigger value="emergencies" className="gap-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    Emergências
                    {openEmergencyCount > 0 && (
                      <Badge variant="destructive" className="ml-1 animate-pulse">
                        {openEmergencyCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="feedbacks" className="gap-2">
                    <MessageCircle size={14} />
                    Feedbacks ({feedbacks.length})
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
          </Card>

          {/* Tab: Emergências */}
          <TabsContent value="emergencies" className="space-y-4 mt-4">
            {emergencies.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <AlertCircle size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Nenhuma emergência recebida</p>
                    <p className="text-sm mt-2">
                      Alertas SOS dos pacientes aparecerão aqui
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Emergências Abertas */}
                {openEmergencies.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-red-700 flex items-center gap-2">
                      <AlertCircle size={20} />
                      Emergências Abertas ({openEmergencies.length})
                    </h3>
                    {openEmergencies.map((emergency) => (
                      <Card
                        key={emergency.id}
                        className="border-red-400 border-2 bg-red-50 hover:shadow-lg transition-shadow"
                        data-testid={`emergency-card-${emergency.id}`}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                                  <AlertCircle className="text-white" size={20} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-red-700">
                                      {emergency.patient?.name || 'Paciente'}
                                    </p>
                                    <Badge variant="destructive" className="animate-pulse">
                                      🆘 URGENTE
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-red-600">
                                    <Calendar size={14} />
                                    {format(new Date(emergency.created_at), "dd 'de' MMMM 'às' HH:mm", {
                                      locale: ptBR
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div className="mb-2">
                                <span className="inline-block px-2 py-1 text-xs font-medium bg-red-200 text-red-800 rounded">
                                  {getCategoryLabel(emergency.category)}
                                </span>
                              </div>

                              <p className="text-gray-800 bg-white p-3 rounded border border-red-200">
                                {emergency.message}
                              </p>
                            </div>

                            <Button 
                              onClick={() => handleResolveEmergency(emergency.id)}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`resolve-emergency-${emergency.id}`}
                            >
                              <CheckCircle className="mr-2" size={18} />
                              Resolver
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Emergências Resolvidas */}
                {resolvedEmergencies.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <h3 className="font-semibold text-gray-500 flex items-center gap-2">
                      <CheckCircle size={20} />
                      Emergências Resolvidas ({resolvedEmergencies.length})
                    </h3>
                    {resolvedEmergencies.map((emergency) => (
                      <Card
                        key={emergency.id}
                        className="bg-gray-50 opacity-70"
                      >
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                                  <CheckCircle className="text-white" size={20} />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-700">
                                    {emergency.patient?.name || 'Paciente'}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar size={14} />
                                    {format(new Date(emergency.created_at), "dd 'de' MMMM 'às' HH:mm", {
                                      locale: ptBR
                                    })}
                                  </div>
                                </div>
                              </div>
                              <p className="text-gray-600 line-clamp-2">{emergency.message}</p>
                            </div>
                            <Badge variant="secondary">
                              <CheckCircle className="mr-1" size={14} />
                              Resolvida
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Tab: Feedbacks Normais */}
          <TabsContent value="feedbacks" className="space-y-4 mt-4">
            {feedbacks.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <MessageCircle size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Nenhum feedback recebido ainda</p>
                    <p className="text-sm mt-2">
                      Os feedbacks dos seus pacientes aparecerão aqui
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {feedbacks.map((feedback) => (
                  <Card key={feedback.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                              <User className="text-teal-700" size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {feedback.patient?.name || 'Paciente'}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Calendar size={14} />
                                {format(new Date(feedback.created_at), "dd 'de' MMMM 'às' HH:mm", {
                                  locale: ptBR
                                })}
                              </div>
                            </div>
                          </div>

                          {feedback.mood && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{getMoodEmoji(feedback.mood)}</span>
                              <span className="text-sm font-medium text-gray-700">
                                Humor: {getMoodLabel(feedback.mood)}
                              </span>
                            </div>
                          )}

                          {feedback.message && (
                            <p className="text-gray-700 mb-2 line-clamp-2">{feedback.message}</p>
                          )}

                          {feedback.type && (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-teal-100 text-teal-700 rounded">
                              {feedback.type}
                            </span>
                          )}
                        </div>

                        <Button variant="ghost" size="sm" disabled>
                          <ArrowRight size={20} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Todos */}
          <TabsContent value="all" className="space-y-4 mt-4">
            {/* Emergências primeiro */}
            {openEmergencies.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Emergências Abertas
                </h3>
                {openEmergencies.slice(0, 3).map((emergency) => (
                  <Card
                    key={emergency.id}
                    className="border-red-400 border-2 bg-red-50"
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                              <AlertCircle className="text-white" size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-red-700">
                                  {emergency.patient?.name || 'Paciente'}
                                </p>
                                <Badge variant="destructive">🆘 URGENTE</Badge>
                              </div>
                              <p className="text-sm text-red-600">
                                {format(new Date(emergency.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <p className="text-gray-800 line-clamp-2">{emergency.message}</p>
                        </div>
                        <Button 
                          onClick={() => handleResolveEmergency(emergency.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-2" size={16} />
                          Resolver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {openEmergencies.length > 3 && (
                  <Button 
                    variant="outline" 
                    className="w-full border-red-300 text-red-600"
                    onClick={() => setActiveTab('emergencies')}
                  >
                    Ver todas as {openEmergencies.length} emergências
                  </Button>
                )}
              </div>
            )}

            {/* Feedbacks normais */}
            {feedbacks.length > 0 && (
              <div className="space-y-4 mt-6">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <MessageCircle size={20} />
                  Feedbacks Recentes
                </h3>
                {feedbacks.slice(0, 5).map((feedback) => (
                  <Card key={feedback.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <User className="text-teal-700" size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{feedback.patient?.name || 'Paciente'}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(feedback.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {feedback.message && (
                            <p className="text-gray-700 mt-1 line-clamp-2">{feedback.message}</p>
                          )}
                        </div>
                        {feedback.mood && (
                          <span className="text-2xl">{getMoodEmoji(feedback.mood)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {feedbacks.length === 0 && emergencies.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <MessageCircle size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Nenhum feedback ou emergência</p>
                    <p className="text-sm mt-2">
                      As mensagens dos seus pacientes aparecerão aqui
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default FeedbacksList;
