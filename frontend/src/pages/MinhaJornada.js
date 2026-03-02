import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Flame, Trophy, Target, Calendar, MessageSquare, Lightbulb,
  CheckCircle2, Circle, Sparkles, TrendingUp, Clock, Star,
  Send, ChevronRight, Zap, Heart, Award, Brain, AlertCircle, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import EmergencyButton from '@/components/EmergencyButton';
import { 
  getChecklistTasks, toggleChecklistTask, createChecklistTask,
  getPatientPersonalizedTips, getPatientAppointments, 
  getPatientFeedbacks, sendFeedbackReply, getPatientStats
} from '@/lib/supabase';
import {
  computeAdherenceScore,
  generateSmartAlerts,
  pickNextBestAction,
  pickDailyTip,
  hasSufficientData,
  getInsufficientDataMessage
} from '@/utils/patientIntelligence';

// Sugestões de hábitos saudáveis
const DEFAULT_HABITS = [
  { title: '💧 Beber 2L de água', icon: '💧' },
  { title: '😴 Dormir 7-8 horas', icon: '😴' },
  { title: '🏃 Exercício físico (30 min)', icon: '🏃' },
  { title: '🥗 Comer 3 porções de vegetais', icon: '🥗' },
  { title: '🍎 Comer 2 frutas', icon: '🍎' },
  { title: '🚫 Evitar açúcar refinado', icon: '🚫' },
  { title: '⏰ Respeitar horário das refeições', icon: '⏰' },
  { title: '🧘 10 min de relaxamento', icon: '🧘' },
  { title: '📝 Registrar peso/medidas', icon: '📝' },
  { title: '🚶 Caminhar 10 mil passos', icon: '🚶' }
];

const MinhaJornada = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [tips, setTips] = useState([]);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [patientStats, setPatientStats] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Estados para Painel Inteligente
  const [intelligenceData, setIntelligenceData] = useState({
    score: null,
    alerts: [],
    nextAction: null,
    dailyTip: null
  });

  useEffect(() => {
    if (user?.id) loadAllData();
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [tasksRes, tipsRes, appointmentsRes, feedbacksRes, statsRes] = await Promise.all([
        getChecklistTasks(user.id),
        getPatientPersonalizedTips(user.id),
        getPatientAppointments(user.id),
        getPatientFeedbacks(user.id),
        getPatientStats(user.id)
      ]);

      const loadedTasks = tasksRes.data || [];
      const loadedTips = tipsRes.data || [];
      const loadedFeedbacks = feedbacksRes.data || [];
      const loadedStats = statsRes;

      setTasks(loadedTasks);
      setTips(loadedTips);
      setPatientStats(loadedStats);
      
      // Próximo compromisso
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = (appointmentsRes.data || [])
        .filter(a => new Date(a.date + 'T00:00:00') >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setNextAppointment(upcoming[0] || null);
      
      // Feedbacks não respondidos
      setFeedbacks(loadedFeedbacks.slice(0, 3));

      // Calcular dados do Painel Inteligente
      computeIntelligence({
        tasks: loadedTasks,
        tips: loadedTips,
        feedbacks: loadedFeedbacks,
        agenda: appointmentsRes.data || [],
        plan: loadedStats?.activePlan,
        anamnesis: loadedStats?.anamnesis,
        patientData: loadedStats?.profile
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Computar dados do Painel Inteligente
  const computeIntelligence = (context) => {
    try {
      // Verificar se há dados suficientes
      if (!hasSufficientData(context)) {
        const insufficientMsg = getInsufficientDataMessage(context);
        setIntelligenceData({
          score: null,
          alerts: [],
          nextAction: insufficientMsg,
          dailyTip: null,
          insufficient: true
        });
        return;
      }

      // Calcular score
      const scoreData = computeAdherenceScore({
        tasks: context.tasks,
        feedbacks: context.feedbacks,
        agenda: context.agenda,
        plan: context.plan
      });

      // Gerar alertas
      const alerts = generateSmartAlerts({
        score: scoreData.score,
        tasks: context.tasks,
        plan: context.plan,
        tips: context.tips,
        feedbacks: context.feedbacks,
        agenda: context.agenda
      });

      // Próximo passo
      const nextAction = pickNextBestAction({
        tasks: context.tasks,
        feedbacks: context.feedbacks,
        agenda: context.agenda,
        plan: context.plan,
        anamnesis: context.anamnesis
      });

      // Dica do dia
      const dailyTip = pickDailyTip({
        tips: context.tips,
        patientData: context.patientData
      });

      setIntelligenceData({
        score: scoreData,
        alerts,
        nextAction,
        dailyTip,
        insufficient: false
      });
    } catch (error) {
      console.error('Erro ao computar inteligência:', error);
    }
  };

  const handleToggleTask = async (taskId, completed) => {
    try {
      await toggleChecklistTask(taskId, !completed);
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: !completed } : t);
      setTasks(updatedTasks);
      
      // Recalcular inteligência
      computeIntelligence({
        tasks: updatedTasks,
        tips,
        feedbacks,
        agenda: [],
        plan: patientStats?.activePlan,
        anamnesis: patientStats?.anamnesis,
        patientData: patientStats?.profile
      });
      
      if (!completed) {
        toast.success('🎉 Ótimo trabalho!');
      }
    } catch (error) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleAddDefaultHabits = async () => {
    const existingTitles = tasks.map(t => t.title);
    const newHabits = DEFAULT_HABITS.filter(h => !existingTitles.includes(h.title));
    
    for (const habit of newHabits) {
      try {
        const { data } = await createChecklistTask(user.id, habit.title);
        if (data) setTasks(prev => [...prev, data]);
      } catch (e) {}
    }
    toast.success(`${newHabits.length} hábitos adicionados!`);
  };

  const handleOpenFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setReplyText('');
    setShowFeedbackModal(true);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedFeedback) return;
    
    setSendingReply(true);
    try {
      await sendFeedbackReply(selectedFeedback.id, replyText);
      toast.success('Resposta enviada!');
      setShowFeedbackModal(false);
      loadAllData();
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    } finally {
      setSendingReply(false);
    }
  };

  // Cálculos de progresso
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Mensagem motivacional
  const getMotivation = () => {
    if (progressPercent === 100) return { text: '🏆 Dia perfeito! Você é incrível!', color: 'text-green-600', bg: 'bg-green-50' };
    if (progressPercent >= 75) return { text: '🔥 Quase lá! Continue assim!', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (progressPercent >= 50) return { text: '💪 Bom progresso! Você consegue!', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (progressPercent >= 25) return { text: '🌱 Bom começo! Cada passo conta!', color: 'text-teal-600', bg: 'bg-teal-50' };
    return { text: '✨ Comece sua jornada de hoje!', color: 'text-purple-600', bg: 'bg-purple-50' };
  };

  const motivation = getMotivation();

  // Meta do paciente
  const patientGoal = patientStats?.profile?.goal_weight 
    ? `Meta: ${patientStats.profile.goal_weight}kg` 
    : 'Configure sua meta';

  if (loading) {
    return (
      <Layout title="Minha Jornada" userType="patient">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Minha Jornada" userType="patient">
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        
        {/* ========== BLOCO SUPERIOR - PROGRESSO DO DIA ========== */}
        <Card className={`${motivation.bg} border-0 shadow-lg overflow-hidden`}>
          <CardContent className="pt-6 pb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Olá, {profile?.name?.split(' ')[0] || 'Paciente'}! 👋
                </h2>
                <p className={`text-lg font-medium mt-1 ${motivation.color}`}>
                  {motivation.text}
                </p>
              </div>
              {progressPercent === 100 && (
                <div className="bg-yellow-400 p-4 rounded-full animate-pulse">
                  <Trophy className="h-8 w-8 text-yellow-900" />
                </div>
              )}
            </div>

            {/* Progresso Circular */}
            <div className="flex items-center gap-8">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke={progressPercent === 100 ? '#10B981' : progressPercent >= 50 ? '#F59E0B' : '#6366F1'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(progressPercent / 100) * 352} 352`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{progressPercent}%</span>
                  <span className="text-xs text-gray-500">Concluído</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white/80 rounded-xl">
                    <Flame className="h-6 w-6 text-orange-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
                    <p className="text-xs text-gray-500">Tarefas feitas</p>
                  </div>
                  <div className="text-center p-3 bg-white/80 rounded-xl">
                    <Target className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
                    <p className="text-xs text-gray-500">Total do dia</p>
                  </div>
                  <div className="text-center p-3 bg-white/80 rounded-xl">
                    <Award className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900">{patientGoal}</p>
                    <p className="text-xs text-gray-500">Sua meta</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== PAINEL INTELIGENTE ========== */}
        {!loading && (
          <div className="space-y-6">
            {/* Score de Aderência + Alertas */}
            <Card className="border-2 border-indigo-200 shadow-lg bg-gradient-to-br from-white to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Brain className="h-6 w-6 text-indigo-600" />
                  Painel Inteligente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {intelligenceData.insufficient ? (
                  /* Estado: Dados Insuficientes */
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">{intelligenceData.nextAction.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {intelligenceData.nextAction.title}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {intelligenceData.nextAction.message}
                    </p>
                    {intelligenceData.nextAction.actionText && (
                      <Button 
                        onClick={() => intelligenceData.nextAction.actionLink && navigate(intelligenceData.nextAction.actionLink)}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {intelligenceData.nextAction.actionText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Score de Aderência */}
                    {intelligenceData.score && (
                      <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Score de Aderência</h3>
                            <p className={`text-sm font-medium ${intelligenceData.score.levelColor}`}>
                              {intelligenceData.score.levelLabel}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold text-indigo-600">
                              {intelligenceData.score.score}
                            </div>
                            <div className="text-xs text-gray-500">de 100</div>
                          </div>
                        </div>
                        <Progress value={intelligenceData.score.score} className="h-3" />
                      </div>
                    )}

                    {/* Alertas Inteligentes */}
                    {intelligenceData.alerts.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Alertas e Insights
                        </h3>
                        <div className="grid gap-3">
                          {intelligenceData.alerts.map((alert) => (
                            <div
                              key={alert.id}
                              className={`p-4 rounded-lg border-2 ${alert.color} transition-all hover:shadow-md`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-2xl flex-shrink-0">{alert.icon}</span>
                                <div className="flex-1">
                                  <h4 className={`font-semibold ${alert.textColor} mb-1`}>
                                    {alert.title}
                                  </h4>
                                  <p className="text-sm text-gray-700">
                                    {alert.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Próximo Melhor Passo */}
                    {intelligenceData.nextAction && !intelligenceData.nextAction.insufficient && (
                      <div className={`${intelligenceData.nextAction.color} text-white rounded-xl p-6 shadow-lg`}>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="text-4xl">{intelligenceData.nextAction.icon}</div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-1">
                              {intelligenceData.nextAction.title}
                            </h3>
                            <p className="text-white/90 text-sm">
                              {intelligenceData.nextAction.description}
                            </p>
                          </div>
                          {intelligenceData.nextAction.urgent && (
                            <Badge className="bg-yellow-400 text-yellow-900 border-0">
                              Urgente
                            </Badge>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            if (intelligenceData.nextAction.actionLink.startsWith('#')) {
                              document.querySelector(intelligenceData.nextAction.actionLink)?.scrollIntoView({ behavior: 'smooth' });
                            } else {
                              navigate(intelligenceData.nextAction.actionLink);
                            }
                          }}
                          className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold"
                        >
                          {intelligenceData.nextAction.actionText}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Dica do Dia */}
                    {intelligenceData.dailyTip && (
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border-2 border-amber-200">
                        <div className="flex items-start gap-4">
                          <div className="bg-amber-400 p-3 rounded-full flex-shrink-0">
                            <Lightbulb className="h-6 w-6 text-amber-900" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">
                                💡 Dica do Dia
                              </h3>
                              {intelligenceData.dailyTip.isNew && (
                                <Badge className="bg-green-500 text-white text-xs border-0">
                                  Nova
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-semibold text-amber-900 mb-2">
                              {intelligenceData.dailyTip.title}
                            </h4>
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {intelligenceData.dailyTip.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== CHECKLIST DIÁRIO (DESTAQUE PRINCIPAL) ========== */}
        <Card id="checklist" className="border-3 border-teal-300 shadow-2xl ring-2 ring-teal-100">
          <CardHeader className="bg-gradient-to-r from-teal-600 via-teal-700 to-teal-600 text-white rounded-t-lg pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                <CheckCircle2 className="h-7 w-7 animate-pulse" />
                ✨ Checklist do Dia
              </CardTitle>
              <Badge className="bg-yellow-400 text-yellow-900 border-0 text-lg px-4 py-1 font-bold">
                {completedTasks}/{totalTasks}
              </Badge>
            </div>
            <Progress 
              value={progressPercent} 
              className="h-3 mt-4 bg-white/20 rounded-full" 
            />
            <p className="text-white/90 mt-2 text-sm font-medium">
              {progressPercent === 100 ? '🏆 Dia perfeito! Parabéns!' : 
               progressPercent >= 50 ? '💪 Continue assim! Você está indo bem!' :
               '🌟 Cada passo conta na sua jornada!'}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Nenhum hábito configurado ainda</p>
                <Button onClick={handleAddDefaultHabits} className="bg-teal-600 hover:bg-teal-700">
                  <Zap className="mr-2 h-4 w-4" />
                  Adicionar Hábitos Saudáveis
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className={`
                      flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all transform hover:scale-[1.02] shadow-sm
                      ${task.completed 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 shadow-green-100' 
                        : 'bg-white border-gray-300 hover:border-teal-400 hover:bg-teal-50 hover:shadow-lg'
                      }
                    `}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0 drop-shadow-sm" />
                    ) : (
                      <Circle className="h-8 w-8 text-gray-400 flex-shrink-0 hover:text-teal-500" />
                    )}
                    <span className={`flex-1 text-lg ${task.completed ? 'line-through text-gray-500' : 'text-gray-800 font-semibold'}`}>
                      {task.title}
                    </span>
                    {task.completed && (
                      <Badge className="bg-green-500 text-white border-0 text-sm px-3 py-1">✓ Feito</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tasks.length > 0 && tasks.length < 10 && (
              <Button 
                variant="outline" 
                className="w-full mt-4 border-dashed"
                onClick={handleAddDefaultHabits}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Adicionar mais hábitos sugeridos
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* ========== FEEDBACKS DO PROFISSIONAL ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Feedbacks do Nutricionista
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbacks.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">Nenhum feedback recente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map((feedback) => (
                    <div 
                      key={feedback.id}
                      className="p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => handleOpenFeedback(feedback)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 line-clamp-2">
                            {feedback.message || feedback.content}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            {new Date(feedback.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-blue-400" />
                      </div>
                      {!feedback.patient_response && (
                        <Badge className="mt-2 bg-blue-200 text-blue-700 border-0 text-xs">
                          Aguardando resposta
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== PRÓXIMO COMPROMISSO ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-purple-600" />
                Próximo Compromisso
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-purple-900">{nextAppointment.title}</p>
                      <p className="text-sm text-purple-700">
                        {new Date(nextAppointment.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long'
                        })}
                      </p>
                      {nextAppointment.time && (
                        <p className="text-sm text-purple-600 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {nextAppointment.time}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">Nenhum compromisso agendado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ========== DICA DO DIA ========== */}
        {tips.length > 0 && (
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Dica do Dia
                  </h3>
                  <p className="text-amber-800 mt-2">
                    {tips[0]?.tip || tips[0]?.title || 'Mantenha-se hidratado ao longo do dia!'}
                  </p>
                  {tips[0]?.source === 'assessment' && (
                    <Badge className="mt-2 bg-purple-100 text-purple-700 border-0">
                      Baseada na sua avaliação física
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== META ATUAL ========== */}
        {patientStats?.profile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-green-600" />
                Minha Meta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-600">Peso atual</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patientStats.profile.current_weight || '--'} kg
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div className="text-right">
                  <p className="text-sm text-gray-600">Meta</p>
                  <p className="text-2xl font-bold text-green-600">
                    {patientStats.profile.goal_weight || '--'} kg
                  </p>
                </div>
              </div>
              {patientStats.profile.current_weight && patientStats.profile.goal_weight && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progresso</span>
                    <span>
                      {Math.abs(patientStats.profile.current_weight - patientStats.profile.goal_weight).toFixed(1)} kg restantes
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, Math.max(0, 
                      100 - ((patientStats.profile.current_weight - patientStats.profile.goal_weight) / 
                      (patientStats.profile.initial_weight || patientStats.profile.current_weight - patientStats.profile.goal_weight)) * 100
                    ))} 
                    className="h-3"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ========== MODAL DE FEEDBACK ========== */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Feedback do Nutricionista
            </DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">
                  {new Date(selectedFeedback.created_at).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-gray-800">{selectedFeedback.message || selectedFeedback.content}</p>
              </div>
              
              {selectedFeedback.patient_response ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Sua resposta:</p>
                  <p className="text-gray-800">{selectedFeedback.patient_response}</p>
                </div>
              ) : (
                <>
                  <Textarea
                    placeholder="Escreva sua resposta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleSendReply} 
                    disabled={sendingReply || !replyText.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sendingReply ? 'Enviando...' : 'Enviar Resposta'}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Botão SOS Emergência */}
      <EmergencyButton 
        patientId={profile?.id}
        professionalId={profile?.professional_id}
      />
    </Layout>
  );
};

export default MinhaJornada;
