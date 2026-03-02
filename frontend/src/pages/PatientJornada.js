import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, Calendar, Scale, Camera, 
  Plus, Target, Clock, Award, ChevronDown, ChevronUp,
  CheckCircle2, Circle, Flame, Droplet, Apple, Trophy,
  Upload, X, ImageIcon, LineChart
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getPatientJourney, getWeightHistory, addWeightRecord, 
  getProgressPhotos, getChecklistTasks, toggleChecklistTask
} from '@/lib/supabase';

const PatientJornada = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const patientId = user?.id || profile?.id || localStorage.getItem('fitjourney_patient_id');

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      const [journeyResult, weightResult, photosResult, tasksResult] = await Promise.all([
        getPatientJourney(patientId),
        getWeightHistory(patientId),
        getProgressPhotos(patientId),
        getChecklistTasks(patientId)
      ]);

      setJourney(journeyResult.data);
      setWeightHistory(weightResult.data || []);
      setPhotos(photosResult.data || []);
      setWeeklyTasks(tasksResult.data || []);
    } catch (error) {
      console.error('Erro ao carregar jornada:', error);
      toast.error('Erro ao carregar dados da jornada');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async () => {
    if (!newWeight || isNaN(parseFloat(newWeight))) {
      toast.error('Digite um peso válido');
      return;
    }

    setSavingWeight(true);
    try {
      const { error } = await addWeightRecord(patientId, parseFloat(newWeight));
      
      if (error) {
        toast.error('Erro ao salvar peso');
        return;
      }

      toast.success('Peso registrado com sucesso! 🎉');
      setNewWeight('');
      setShowAddWeight(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSavingWeight(false);
    }
  };

  const handleToggleTask = async (taskId, completed) => {
    try {
      await toggleChecklistTask(taskId, !completed);
      setWeeklyTasks(tasks => 
        tasks.map(t => t.id === taskId ? { ...t, completed: !completed } : t)
      );
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    }
  };

  // Calcular estatísticas
  const calculateStats = () => {
    const initialWeight = journey?.initial_weight || (weightHistory.length > 0 ? weightHistory[0]?.weight : 0);
    const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1]?.weight : initialWeight;
    const targetWeight = journey?.target_weight || currentWeight;
    
    const totalToLose = initialWeight - targetWeight;
    const totalLost = initialWeight - currentWeight;
    const remainingToGoal = currentWeight - targetWeight;
    const progressPercent = totalToLose > 0 
      ? Math.min(100, Math.max(0, (totalLost / totalToLose) * 100))
      : 0;

    return {
      initialWeight: initialWeight || 0,
      currentWeight: currentWeight || 0,
      targetWeight: targetWeight || 0,
      totalLost: totalLost || 0,
      remainingToGoal: remainingToGoal || 0,
      progressPercent: progressPercent || 0
    };
  };

  // Calcular dias restantes
  const calculateDaysInfo = () => {
    if (!journey?.plan_start_date || !journey?.plan_end_date) return null;
    
    const startDate = new Date(journey.plan_start_date);
    const endDate = new Date(journey.plan_end_date);
    const today = new Date();
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    const progressDays = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;
    
    return { totalDays, daysElapsed, daysRemaining, progressDays, startDate, endDate };
  };

  // Calcular progresso semanal do checklist
  const calculateWeeklyProgress = () => {
    if (!weeklyTasks.length) return { completed: 0, total: 0, percent: 0 };
    const completed = weeklyTasks.filter(t => t.completed).length;
    return {
      completed,
      total: weeklyTasks.length,
      percent: (completed / weeklyTasks.length) * 100
    };
  };

  const stats = calculateStats();
  const daysInfo = calculateDaysInfo();
  const weeklyProgress = calculateWeeklyProgress();

  if (loading) {
    return (
      <Layout title="Minha Jornada" userType="patient">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando sua jornada...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Minha Jornada" userType="patient">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header do Projeto */}
        <Card className="bg-gradient-to-br from-teal-600 via-teal-700 to-blue-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <Trophy className="w-full h-full" />
          </div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-6 w-6 text-yellow-300" />
                  <span className="text-sm font-medium text-teal-100">
                    {journey?.plan_name || 'Minha Transformação'}
                  </span>
                </div>
                <h1 className="text-3xl font-bold mb-1">
                  {profile?.name?.split(' ')[0] || 'Sua'} Jornada de Transformação
                </h1>
                <p className="text-teal-100">
                  Acompanhe seu progresso e conquiste seus objetivos!
                </p>
              </div>
              
              {daysInfo && (
                <div className="flex gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-teal-200" />
                    <p className="text-2xl font-bold">{daysInfo.daysRemaining}</p>
                    <p className="text-xs text-teal-200">dias restantes</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
                    <Flame className="h-5 w-5 mx-auto mb-1 text-orange-300" />
                    <p className="text-2xl font-bold">{daysInfo.daysElapsed}</p>
                    <p className="text-xs text-teal-200">dias de foco</p>
                  </div>
                </div>
              )}
            </div>
            
            {daysInfo && (
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-teal-200">Progresso do programa</span>
                  <span className="font-medium">{Math.round(daysInfo.progressDays)}%</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${daysInfo.progressDays}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1 text-teal-200">
                  <span>{new Date(daysInfo.startDate).toLocaleDateString('pt-BR')}</span>
                  <span>{new Date(daysInfo.endDate).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-4 text-center">
              <Scale className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-xs text-blue-600 font-medium">Peso Inicial</p>
              <p className="text-2xl font-bold text-blue-700">{stats.initialWeight || '--'} kg</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <CardContent className="pt-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-teal-600" />
              <p className="text-xs text-teal-600 font-medium">Peso Atual</p>
              <p className="text-2xl font-bold text-teal-700">{stats.currentWeight || '--'} kg</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-xs text-purple-600 font-medium">Meta</p>
              <p className="text-2xl font-bold text-purple-700">{stats.targetWeight || '--'} kg</p>
            </CardContent>
          </Card>
          
          <Card className={`bg-gradient-to-br ${stats.totalLost >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <CardContent className="pt-4 text-center">
              {stats.totalLost >= 0 ? (
                <TrendingDown className="h-8 w-8 mx-auto mb-2 text-green-600" />
              ) : (
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              )}
              <p className={`text-xs font-medium ${stats.totalLost >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {stats.totalLost >= 0 ? 'Perdido' : 'Ganho'}
              </p>
              <p className={`text-2xl font-bold ${stats.totalLost >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                {Math.abs(stats.totalLost).toFixed(1)} kg
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Progresso Principal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-teal-600" />
              Progresso para a Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {stats.currentWeight} kg → {stats.targetWeight} kg
                  </span>
                  <span className="text-lg font-bold text-teal-600">
                    {Math.round(stats.progressPercent)}%
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-green-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${stats.progressPercent}%` }}
                  />
                </div>
              </div>
              
              {stats.remainingToGoal > 0 && (
                <p className="text-center text-gray-600">
                  Faltam <span className="font-bold text-teal-600">{stats.remainingToGoal.toFixed(1)} kg</span> para sua meta! 💪
                </p>
              )}
              {stats.remainingToGoal <= 0 && stats.targetWeight > 0 && (
                <p className="text-center text-green-600 font-bold">
                  🎉 Parabéns! Você atingiu sua meta!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100">
            <TabsTrigger value="overview">📊 Evolução</TabsTrigger>
            <TabsTrigger value="photos">📷 Fotos</TabsTrigger>
            <TabsTrigger value="checklist">✅ Tarefas</TabsTrigger>
          </TabsList>

          {/* Tab Evolução */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-teal-600" />
                    Histórico de Peso
                  </span>
                  <Button 
                    onClick={() => setShowAddWeight(!showAddWeight)}
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar Peso
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showAddWeight && (
                  <div className="flex gap-2 mb-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                    <Input
                      type="number"
                      step="0.1"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="Seu peso hoje (kg)"
                      className="flex-1"
                    />
                    <Button onClick={handleAddWeight} disabled={savingWeight} className="bg-teal-600 hover:bg-teal-700">
                      {savingWeight ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddWeight(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {weightHistory.length > 0 ? (
                  <div className="space-y-3">
                    {/* Gráfico simplificado */}
                    <div className="h-32 flex items-end gap-1 bg-gray-50 rounded-lg p-4">
                      {weightHistory.slice(-14).map((record, index) => {
                        const maxWeight = Math.max(...weightHistory.map(r => r.weight));
                        const minWeight = Math.min(...weightHistory.map(r => r.weight));
                        const range = maxWeight - minWeight || 1;
                        const height = ((record.weight - minWeight) / range) * 100;
                        
                        return (
                          <div 
                            key={record.id || index} 
                            className="flex-1 bg-gradient-to-t from-teal-500 to-teal-400 rounded-t hover:from-teal-600 hover:to-teal-500 transition-all cursor-pointer group relative"
                            style={{ height: `${Math.max(20, height)}%` }}
                            title={`${record.weight} kg - ${new Date(record.recorded_at).toLocaleDateString('pt-BR')}`}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {record.weight} kg
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Lista de registros */}
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {[...weightHistory].reverse().slice(0, 10).map((record, index) => (
                        <div key={record.id || index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">
                            {new Date(record.recorded_at).toLocaleDateString('pt-BR', { 
                              weekday: 'short', 
                              day: '2-digit', 
                              month: 'short' 
                            })}
                          </span>
                          <span className="font-bold text-gray-800">{record.weight} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Scale className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-2">Nenhum registro de peso ainda</p>
                    <p className="text-sm text-gray-400">Comece registrando seu peso de hoje!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Fotos */}
          <TabsContent value="photos" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-purple-600" />
                  Fotos de Progresso
                </CardTitle>
                <CardDescription>
                  Visualize sua transformação através das fotos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden shadow-md">
                        <img 
                          src={photo.photo_url} 
                          alt={`Progresso ${photo.photo_type}`}
                          className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                            <p className="text-sm font-medium capitalize">{photo.photo_type || 'Progresso'}</p>
                            <p className="text-xs opacity-80">
                              {new Date(photo.taken_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        {photo.photo_type === 'before' && (
                          <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Antes
                          </span>
                        )}
                        {photo.photo_type === 'after' && (
                          <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                            Depois
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium mb-2">Nenhuma foto ainda</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Seu nutricionista pode adicionar fotos durante as consultas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Checklist */}
          <TabsContent value="checklist" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Tarefas da Semana
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    {weeklyProgress.completed}/{weeklyProgress.total} completas
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Barra de progresso semanal */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progresso semanal</span>
                    <span className="font-bold text-green-600">{Math.round(weeklyProgress.percent)}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${weeklyProgress.percent}%` }}
                    />
                  </div>
                </div>

                {weeklyTasks.length > 0 ? (
                  <div className="space-y-2">
                    {weeklyTasks.map((task) => (
                      <div 
                        key={task.id}
                        onClick={() => handleToggleTask(task.id, task.completed)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          task.completed 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                        }`}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={`flex-1 ${task.completed ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                          {task.description || task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Nenhuma tarefa configurada ainda</p>
                    <p className="text-sm text-gray-400">
                      Seu nutricionista pode adicionar tarefas para você
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Motivação */}
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl mb-2">🔥</p>
            <p className="text-lg font-medium text-orange-800">
              {stats.progressPercent >= 75 
                ? "Incrível! Você está quase lá! Continue assim!" 
                : stats.progressPercent >= 50 
                  ? "Metade do caminho! Você está arrasando!" 
                  : stats.progressPercent >= 25 
                    ? "Ótimo começo! Cada dia conta!" 
                    : "O primeiro passo é o mais importante. Você consegue!"}
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PatientJornada;
