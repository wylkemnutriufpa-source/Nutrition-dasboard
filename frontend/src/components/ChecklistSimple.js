import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Loader2, Plus, X, Edit2, Check, Sparkles, Flame, Trophy } from 'lucide-react';
import { getChecklistTasks, toggleChecklistTask, createChecklistTask, deleteChecklistTask, updateChecklistTask, createBulkChecklistTasks } from '@/lib/supabase';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { authenticatedPost } from '@/lib/apiClient';

// 10 Sugestões de hábitos saudáveis padrão
const DEFAULT_HEALTH_HABITS = [
  { title: '💧 Beber 2L de água', icon: '💧', category: 'hidratação' },
  { title: '😴 Dormir 7-8 horas', icon: '😴', category: 'sono' },
  { title: '🏃 Exercício físico (30 min)', icon: '🏃', category: 'exercício' },
  { title: '🥗 Comer 3 porções de vegetais', icon: '🥗', category: 'nutrição' },
  { title: '🍎 Comer 2 frutas', icon: '🍎', category: 'nutrição' },
  { title: '🚫 Evitar açúcar refinado', icon: '🚫', category: 'nutrição' },
  { title: '⏰ Respeitar horário das refeições', icon: '⏰', category: 'rotina' },
  { title: '🧘 10 min de relaxamento/meditação', icon: '🧘', category: 'mental' },
  { title: '📝 Registrar peso/medidas', icon: '📝', category: 'monitoramento' },
  { title: '🚶 Caminhar 10 mil passos', icon: '🚶', category: 'exercício' }
];

const ChecklistSimple = ({ patientId, isPatientView = true }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [patientId]);

  const loadTasks = async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      // Auto-sync: se paciente, garantir que protocol_tasks estejam no checklist
      if (isPatientView) {
        try {
          await authenticatedPost('/api/patient/checklist/sync-protocols', {});
        } catch (syncErr) {
          // Silencioso: não impede o carregamento do checklist
          console.debug('Auto-sync protocols (silent):', syncErr?.message || syncErr);
        }
      }

      const { data, error } = await getChecklistTasks(patientId);
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error('Erro ao carregar checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (taskId, currentCompleted) => {
    try {
      const { error } = await toggleChecklistTask(taskId, !currentCompleted);
      if (error) throw error;
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, completed: !currentCompleted } : t
      ));
      
      if (!currentCompleted) {
        toast.success('🎉 Ótimo trabalho!');
      }
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    setAdding(true);
    try {
      const { data, error } = await createChecklistTask(patientId, newTaskTitle.trim());
      if (error) throw error;
      
      setTasks([...tasks, data]);
      setNewTaskTitle('');
      toast.success('Hábito adicionado!');
      trackProfessionalFeature('create_checklist_template');
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa');
    } finally {
      setAdding(false);
    }
  };

  const handleAddSuggestion = async (suggestion) => {
    // Verificar se já existe
    if (tasks.some(t => t.title === suggestion.title)) {
      toast.info('Este hábito já está na lista');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await createChecklistTask(patientId, suggestion.title);
      if (error) throw error;
      
      setTasks([...tasks, data]);
      toast.success(`${suggestion.icon} Hábito adicionado!`);
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa');
    } finally {
      setAdding(false);
    }
  };

  const handleAddAllSuggestions = async () => {
    const newHabits = DEFAULT_HEALTH_HABITS.filter(
      h => !tasks.some(t => t.title === h.title)
    );

    if (newHabits.length === 0) {
      toast.info('Todos os hábitos sugeridos já estão na lista');
      return;
    }

    setAdding(true);
    try {
      for (const habit of newHabits) {
        const { data, error } = await createChecklistTask(patientId, habit.title);
        if (error) throw error;
        setTasks(prev => [...prev, data]);
      }
      toast.success(`🎯 ${newHabits.length} hábitos adicionados!`);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Erro ao criar tarefas:', error);
      toast.error('Erro ao criar tarefas');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      const { error } = await deleteChecklistTask(taskId);
      if (error) throw error;
      
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Removido');
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
    }
  };

  const handleEdit = (task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const handleSaveEdit = async (taskId) => {
    if (!editTitle.trim()) return;
    
    try {
      const { error } = await updateChecklistTask(taskId, { title: editTitle.trim() });
      if (error) throw error;
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, title: editTitle.trim() } : t
      ));
      setEditingId(null);
      toast.success('Atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar');
    }
  };

  // Calcular progresso
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Mensagem de motivação baseada no progresso
  const getMotivationMessage = () => {
    if (progressPercent === 100) return { text: '🏆 Dia perfeito! Parabéns!', color: 'text-green-600' };
    if (progressPercent >= 75) return { text: '🔥 Excelente! Quase lá!', color: 'text-orange-500' };
    if (progressPercent >= 50) return { text: '💪 Bom progresso! Continue!', color: 'text-blue-600' };
    if (progressPercent >= 25) return { text: '🌱 Bom começo! Você consegue!', color: 'text-teal-600' };
    return { text: '✨ Comece seu dia saudável!', color: 'text-gray-500' };
  };

  const motivation = getMotivationMessage();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Hábitos do Dia
          </CardTitle>
          {progressPercent === 100 && (
            <div className="flex items-center gap-1 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
              <Trophy className="h-3 w-3" /> Completo!
            </div>
          )}
        </div>
        
        {/* Barra de Progresso */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className={motivation.color.replace('text-', 'text-white/80 ')}>{motivation.text}</span>
            <span className="font-bold">{completedCount}/{totalCount}</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-center text-white/90 text-2xl font-bold">{progressPercent}%</p>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Lista de Tarefas */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Nenhum hábito configurado</p>
              <Button 
                variant="outline" 
                onClick={() => setShowSuggestions(true)}
                className="text-teal-600 border-teal-600 hover:bg-teal-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Hábitos Saudáveis
              </Button>
            </div>
          ) : (
            tasks.map((task) => {
              // Detectar se é task de protocolo pelo campo source ou pelo título marcado
              const isProtocolTask = task.source === 'protocol' || /^\[🎯/.test(task.title);

              // Extrair título limpo (remover marcador se existir)
              const displayTitle = isProtocolTask
                ? task.title.replace(/^\[🎯[^\]]*\]\s*/, '')
                : task.title;

              // Extrair nome do protocolo do marcador no título
              const protocolBadge = isProtocolTask
                ? (task.title.match(/^\[🎯 ([^\]]+)\]/) || [])[1] || 'Protocolo'
                : null;

              return (
                <div
                  key={task.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all group
                    ${task.completed 
                      ? 'bg-green-50 border-green-200' 
                      : isProtocolTask
                        ? 'bg-purple-50 border-purple-200 hover:border-purple-400'
                        : 'bg-white border-gray-200 hover:border-teal-300'
                    }
                  `}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggle(task.id, task.completed)}
                    className="flex-shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className={`h-6 w-6 ${isProtocolTask ? 'text-purple-300 hover:text-purple-500' : 'text-gray-300 hover:text-teal-500'}`} />
                    )}
                  </button>

                  {/* Título */}
                  {editingId === task.id && !isProtocolTask ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 h-8"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(task.id)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(task.id)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <span className={`block ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {displayTitle}
                      </span>
                      {isProtocolTask && protocolBadge && (
                        <span className="inline-block mt-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                          🎯 {protocolBadge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Ações - tarefas de protocolo não têm edição/deleção manual */}
                  {!editingId && !isProtocolTask && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(task)}
                        className="p-1 text-gray-400 hover:text-teal-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {/* Protocolo task: tooltip de read-only */}
                  {!editingId && isProtocolTask && (
                    <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" title="Gerenciado pelo protocolo">
                      🔒
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Form para adicionar */}
        {tasks.length > 0 && (
          <form onSubmit={handleAdd} className="mt-4 flex gap-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Adicionar novo hábito..."
              className="flex-1"
              disabled={adding}
            />
            <Button type="submit" disabled={adding || !newTaskTitle.trim()} className="bg-teal-600 hover:bg-teal-700">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>
        )}

        {/* Botão de sugestões */}
        {tasks.length > 0 && tasks.length < 10 && (
          <Button 
            variant="ghost" 
            className="w-full mt-2 text-teal-600"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {showSuggestions ? 'Ocultar sugestões' : 'Ver sugestões de hábitos'}
          </Button>
        )}

        {/* Painel de Sugestões */}
        {showSuggestions && (
          <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-teal-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Hábitos Saudáveis Sugeridos
              </h4>
              <Button 
                size="sm" 
                onClick={handleAddAllSuggestions}
                disabled={adding}
                className="bg-teal-600 hover:bg-teal-700 text-xs"
              >
                Adicionar Todos
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {DEFAULT_HEALTH_HABITS.map((habit, idx) => {
                const isAdded = tasks.some(t => t.title === habit.title);
                return (
                  <button
                    key={idx}
                    onClick={() => !isAdded && handleAddSuggestion(habit)}
                    disabled={isAdded || adding}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-all
                      ${isAdded 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white hover:bg-teal-100 text-gray-700 border border-gray-200 hover:border-teal-400'
                      }
                    `}
                  >
                    <span className="text-lg">{habit.icon}</span>
                    <span className="flex-1">{habit.title}</span>
                    {isAdded ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Plus className="h-4 w-4 text-teal-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChecklistSimple;
