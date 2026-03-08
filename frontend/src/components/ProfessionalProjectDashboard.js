/**
 * ProfessionalProjectDashboard
 * Dashboard premium do projeto do paciente — visão do profissional.
 *
 * Seções:
 *  1. Header do projeto (editável inline)
 *  2. KPIs rápidos (aderência, dias, protocolos, financeiro)
 *  3. Protocolos ativos + tasks interativas
 *  4. Checklist completo (todas as tasks, não só protocolo)
 *  5. Automações ativas/histórico para este paciente
 *  6. Timeline de atividade recente
 *  7. Plano financeiro (editável)
 *  8. Ações rápidas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Target, Zap, Activity, TrendingUp, Scale, DollarSign, Calendar,
  CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp, ListChecks,
  Clock, Bell, Edit2, Save, X, Plus, RefreshCw, Sparkles,
  AlertTriangle, MessageSquare, PlayCircle, Pause, BarChart3,
  ArrowRight, Trophy, Flame, Heart, Send, FileText, Camera, Users,
  ChevronRight, List, Trash2, CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import PatientTimeline from '@/components/PatientTimeline';
import {
  getChecklistAdherence, getChecklistTasks, toggleChecklistTask,
  upsertPatientJourney, getPatientJourney, upsertPatientPlan, getPatientPlan,
  getAutomationRules, getWeightHistory,
  createChecklistTask, deleteChecklistTask
} from '@/lib/supabase';
import { authenticatedGet, authenticatedPost } from '@/lib/apiClient';
import { listRuns, listRules } from '@/utils/automationEngineApi';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (d, opts = {}) =>
  d ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', opts) : '--';

const diffDays = (a, b = new Date()) => {
  if (!a) return null;
  return Math.ceil((new Date(a + 'T12:00:00') - b) / 86400000);
};

const progressPct = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00'), e = new Date(end + 'T00:00:00'), n = new Date();
  if (n >= e) return 100;
  if (n <= s) return 0;
  return Math.round(((n - s) / (e - s)) * 100);
};

const KPI = ({ icon: Icon, label, value, sub, gradient, loading }) => (
  <div className={`rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white shadow-sm`}>
    <div className="flex items-center gap-2 mb-2 opacity-90">
      <Icon size={15} />
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
    </div>
    {loading
      ? <Loader2 size={20} className="animate-spin opacity-70 mt-1" />
      : <div className="text-2xl font-bold leading-tight">{value}</div>
    }
    {sub && <div className="text-xs opacity-75 mt-1">{sub}</div>}
  </div>
);

// ─── seção: header do projeto ─────────────────────────────────────────────────

const ProjectHeader = ({ patient, journey, onSave, saving }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    plan_name: journey?.plan_name || '',
    plan_start_date: journey?.plan_start_date || '',
    plan_end_date: journey?.plan_end_date || '',
    initial_weight: journey?.initial_weight || '',
    target_weight: journey?.target_weight || '',
    notes: journey?.notes || '',
  });

  useEffect(() => {
    setForm({
      plan_name: journey?.plan_name || '',
      plan_start_date: journey?.plan_start_date || '',
      plan_end_date: journey?.plan_end_date || '',
      initial_weight: journey?.initial_weight || '',
      target_weight: journey?.target_weight || '',
      notes: journey?.notes || '',
    });
  }, [journey]);

  const pct = progressPct(form.plan_start_date, form.plan_end_date);
  const daysLeft = diffDays(form.plan_end_date);
  const hasProject = form.plan_name || form.plan_start_date;

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
      {/* bg decorativo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* título + botão editar */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <Target size={22} />
            </div>
            <div>
              {editing ? (
                <Input
                  value={form.plan_name}
                  onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))}
                  className="text-white bg-white/20 border-white/30 placeholder:text-white/50 font-bold text-lg h-9 w-64"
                  placeholder="Nome do projeto..."
                />
              ) : (
                <h2 className="text-xl font-bold leading-tight">
                  {form.plan_name || `Projeto de ${patient?.full_name?.split(' ')[0] || 'Paciente'}`}
                </h2>
              )}
              <p className="text-white/70 text-xs mt-0.5">{patient?.full_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="ghost"
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2"
                  onClick={() => setEditing(false)}>
                  <X size={14} />
                </Button>
                <Button size="sm"
                  className="bg-white text-purple-700 hover:bg-white/90 font-bold h-8 px-3 text-xs"
                  disabled={saving}
                  onClick={handleSave}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <><Save size={12} className="mr-1" />Salvar</>}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2"
                onClick={() => setEditing(true)}>
                <Edit2 size={14} />
                <span className="ml-1 text-xs">Editar</span>
              </Button>
            )}
          </div>
        </div>

        {/* datas e barra de progresso */}
        {editing ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Label className="text-white/70 text-xs">Início</Label>
              <Input type="date" value={form.plan_start_date}
                onChange={e => setForm(f => ({ ...f, plan_start_date: e.target.value }))}
                className="text-white bg-white/20 border-white/30 h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Término</Label>
              <Input type="date" value={form.plan_end_date}
                onChange={e => setForm(f => ({ ...f, plan_end_date: e.target.value }))}
                className="text-white bg-white/20 border-white/30 h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Peso inicial (kg)</Label>
              <Input type="number" value={form.initial_weight}
                onChange={e => setForm(f => ({ ...f, initial_weight: e.target.value }))}
                className="text-white bg-white/20 border-white/30 h-8 text-sm mt-1" placeholder="ex: 75" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Peso meta (kg)</Label>
              <Input type="number" value={form.target_weight}
                onChange={e => setForm(f => ({ ...f, target_weight: e.target.value }))}
                className="text-white bg-white/20 border-white/30 h-8 text-sm mt-1" placeholder="ex: 65" />
            </div>
            <div className="col-span-2">
              <Label className="text-white/70 text-xs">Observações</Label>
              <Textarea value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="text-white bg-white/20 border-white/30 text-sm mt-1 resize-none"
                rows={2} placeholder="Notas sobre o projeto..." />
            </div>
          </div>
        ) : hasProject ? (
          <div className="space-y-3">
            {/* barra de progresso */}
            {form.plan_start_date && form.plan_end_date && (
              <div>
                <div className="flex justify-between text-xs text-white/70 mb-1.5">
                  <span>{fmt(form.plan_start_date)}</span>
                  <span className="font-bold text-white">{pct}% completo</span>
                  <span>{fmt(form.plan_end_date)}</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }} />
                </div>
                {daysLeft !== null && (
                  <p className="text-xs text-white/60 mt-1">
                    {daysLeft > 0 ? `${daysLeft} dias restantes` : daysLeft === 0 ? 'Termina hoje!' : `Encerrado há ${Math.abs(daysLeft)} dias`}
                  </p>
                )}
              </div>
            )}
            {/* pesos */}
            {(form.initial_weight || form.target_weight || patient?.current_weight) && (
              <div className="flex gap-6 text-sm">
                {form.initial_weight && (
                  <div><span className="text-white/60 text-xs">Inicial</span><div className="font-bold">{form.initial_weight} kg</div></div>
                )}
                {patient?.current_weight && (
                  <div><span className="text-white/60 text-xs">Atual</span><div className="font-bold">{patient.current_weight} kg</div></div>
                )}
                {form.target_weight && (
                  <div><span className="text-white/60 text-xs">Meta</span><div className="font-bold">{form.target_weight} kg</div></div>
                )}
                {form.initial_weight && form.target_weight && patient?.current_weight && (
                  <div>
                    <span className="text-white/60 text-xs">Variação</span>
                    <div className="font-bold">
                      {(parseFloat(patient.current_weight) - parseFloat(form.initial_weight)).toFixed(1)} kg
                    </div>
                  </div>
                )}
              </div>
            )}
            {form.notes && (
              <p className="text-xs text-white/70 bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                {form.notes}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 bg-white/10 rounded-xl border border-white/20">
            <p className="text-white/70 text-sm mb-3">Nenhum projeto configurado ainda.</p>
            <Button size="sm" variant="ghost"
              className="text-white border-white/30 border hover:bg-white/10 text-xs"
              onClick={() => setEditing(true)}>
              <Plus size={12} className="mr-1" />Configurar projeto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── seção: protocolos + tasks ────────────────────────────────────────────────

const ProtocolsSection = ({ patientId }) => {
  const [activeProtocols, setActiveProtocols] = useState([]);
  const [availableProtocols, setAvailableProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [tasksData, setTasksData] = useState({});
  const [toggling, setToggling] = useState(null);
  const [activating, setActivating] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  // ── Catálogo editável
  const [showNewProtocolForm, setShowNewProtocolForm] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState(null);
  const [protocolForm, setProtocolForm] = useState({ name: '', category: '', description: '', instructions: '', default_duration_days: 30 });
  const [savingProtocol, setSavingProtocol] = useState(false);
  // ── Tasks do catálogo (gerenciar protocol_tasks)
  const [expandedCatalogTasks, setExpandedCatalogTasks] = useState({}); // { [protocol_id]: bool }
  const [catalogTasksByProtocol, setCatalogTasksByProtocol] = useState({}); // { [protocol_id]: [] }
  const [loadingCatalogTasks, setLoadingCatalogTasks] = useState({}); // { [protocol_id]: bool }
  const [newTaskForm, setNewTaskForm] = useState({}); // { [protocol_id]: { title, description } }
  const [savingTask, setSavingTask] = useState(null); // protocol_id

  const openNewProtocolForm = () => {
    setProtocolForm({ name: '', category: '', description: '', instructions: '', default_duration_days: 30 });
    setEditingProtocol(null);
    setShowNewProtocolForm(true);
  };
  const openEditProtocol = (p) => {
    setProtocolForm({ name: p.name || '', category: p.category || '', description: p.description || '', instructions: p.instructions || '', default_duration_days: p.default_duration_days || 30 });
    setEditingProtocol(p);
    setShowNewProtocolForm(true);
  };
  const handleSaveProtocol = async () => {
    if (!protocolForm.name.trim()) { toast.error('Nome obrigatório'); return; }
    setSavingProtocol(true);
    try {
      const method = editingProtocol ? 'PUT' : 'POST';
      const url = editingProtocol
        ? `/api/professional/protocols/${editingProtocol.id}`
        : '/api/professional/protocols';
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(`${backendUrl}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(protocolForm),
      });
      if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.detail || 'Erro ao salvar'); }
      toast.success(editingProtocol ? 'Protocolo atualizado!' : 'Protocolo criado!');
      setShowNewProtocolForm(false); setEditingProtocol(null);
      load(true);
    } catch (err) { toast.error(err.message || 'Erro ao salvar'); }
    finally { setSavingProtocol(false); }
  };
  const handleDeleteProtocol = async (protocolId) => {
    if (!window.confirm('Remover do catálogo? Ativações existentes não são afetadas.')) return;
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(`${backendUrl}/api/professional/protocols/${protocolId}`, {
        method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('Erro ao excluir');
      toast.success('Protocolo removido do catálogo'); load(true);
    } catch (err) { toast.error('Erro ao remover protocolo'); }
  };

  const toggleCatalogTasks = async (protocolId) => {
    const isOpen = expandedCatalogTasks[protocolId];
    setExpandedCatalogTasks(prev => ({ ...prev, [protocolId]: !isOpen }));
    // Carregar tasks se abrindo e ainda não carregadas
    if (!isOpen && !catalogTasksByProtocol[protocolId]) {
      setLoadingCatalogTasks(prev => ({ ...prev, [protocolId]: true }));
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const resp = await fetch(
          `${backendUrl}/api/professional/protocols/${protocolId}/catalog-tasks`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const data = await resp.json();
        setCatalogTasksByProtocol(prev => ({ ...prev, [protocolId]: data.tasks || [] }));
      } catch (err) {
        toast.error('Erro ao carregar tasks do protocolo');
      } finally {
        setLoadingCatalogTasks(prev => ({ ...prev, [protocolId]: false }));
      }
    }
  };

  const handleAddCatalogTask = async (protocolId) => {
    const form = newTaskForm[protocolId] || {};
    if (!form.title?.trim()) { toast.error('Título obrigatório'); return; }
    setSavingTask(protocolId);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(
        `${backendUrl}/api/professional/protocols/${protocolId}/catalog-tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ title: form.title.trim(), description: form.description || '', frequency: 'daily' }),
        }
      );
      if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.detail || 'Erro ao adicionar'); }
      const result = await resp.json();
      // Atualizar lista local
      setCatalogTasksByProtocol(prev => ({
        ...prev,
        [protocolId]: [...(prev[protocolId] || []), result.task],
      }));
      setNewTaskForm(prev => ({ ...prev, [protocolId]: { title: '', description: '' } }));
      toast.success('Task adicionada ao protocolo!');
      load(true); // atualiza task_count no catálogo
    } catch (err) { toast.error(err.message || 'Erro ao adicionar task'); }
    finally { setSavingTask(null); }
  };

  const handleDeleteCatalogTask = async (protocolId, taskId, taskTitle) => {
    if (!window.confirm(`Remover "${taskTitle}" do protocolo? Não afeta tasks já injetadas em pacientes.`)) return;
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(
        `${backendUrl}/api/professional/protocols/${protocolId}/catalog-tasks/${taskId}`,
        { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!resp.ok) throw new Error('Erro ao remover');
      setCatalogTasksByProtocol(prev => ({
        ...prev,
        [protocolId]: (prev[protocolId] || []).filter(t => t.id !== taskId),
      }));
      toast.success('Task removida do protocolo');
      load(true);
    } catch (err) { toast.error('Erro ao remover task'); }
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [listData, activeData] = await Promise.all([
        authenticatedGet('/api/professional/protocols/list'),
        authenticatedGet(`/api/professional/patients/${patientId}/active-protocols`),
      ]);
      setAvailableProtocols(listData.protocols || []);
      setActiveProtocols(activeData.patient_protocols || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const loadTasks = async (ppId) => {
    setTasksData(p => ({ ...p, [ppId]: { ...p[ppId], loading: true } }));
    try {
      const d = await authenticatedGet(`/api/professional/protocols/${ppId}/tasks`);
      setTasksData(p => ({ ...p, [ppId]: { tasks: d.tasks || [], total: d.total, completed: d.completed, loading: false } }));
    } catch {
      setTasksData(p => ({ ...p, [ppId]: { tasks: [], total: 0, completed: 0, loading: false } }));
    }
  };

  const toggleExpand = async (ppId) => {
    const isOpen = expanded[ppId];
    setExpanded(p => ({ ...p, [ppId]: !isOpen }));
    if (!isOpen && !tasksData[ppId]?.tasks) await loadTasks(ppId);
  };

  const handleToggleTask = async (taskId, current, ppId) => {
    setToggling(taskId);
    setTasksData(p => {
      const d = p[ppId] || {};
      const tasks = (d.tasks || []).map(t => t.id === taskId ? { ...t, completed: !current } : t);
      return { ...p, [ppId]: { ...d, tasks, completed: tasks.filter(t => t.completed).length } };
    });
    try {
      const { error } = await toggleChecklistTask(taskId, !current);
      if (error) throw error;
    } catch {
      setTasksData(p => {
        const d = p[ppId] || {};
        const tasks = (d.tasks || []).map(t => t.id === taskId ? { ...t, completed: current } : t);
        return { ...p, [ppId]: { ...d, tasks, completed: tasks.filter(t => t.completed).length } };
      });
      toast.error('Erro ao atualizar tarefa');
    } finally {
      setToggling(null);
    }
  };

  const handleActivate = async (protocolId, startDate = null) => {
    setActivating(protocolId);
    try {
      const r = await authenticatedPost('/api/professional/protocols/activate', {
        patient_id: patientId, protocol_id: protocolId,
        ...(startDate ? { start_date: startDate } : {}),
      });
      const isScheduled = r?.status === 'scheduled';
      toast.success(isScheduled
        ? `📅 Protocolo programado para ${fmt(startDate)}!`
        : `✅ Protocolo ativado! ${r?.tasks_injected ?? 0} tarefa(s) adicionada(s).`);
      setScheduling(null); setScheduleDate('');
      await load(true);
    } catch (e) {
      toast.error(e?.message || 'Erro ao ativar protocolo');
    } finally { setActivating(null); }
  };

  const handleDeactivate = async (ppId) => {
    setDeactivating(ppId);
    try {
      await authenticatedPost(`/api/professional/protocols/deactivate/${ppId}`, {});
      toast.success('Protocolo desativado.');
      await load(true);
    } catch {
      toast.error('Erro ao desativar');
    } finally { setDeactivating(null); }
  };

  const handleSync = async (ppId, name) => {
    try {
      const r = await authenticatedPost(`/api/professional/protocols/${ppId}/sync-tasks`, {});
      toast.success(r?.message || 'Sincronizado!');
      if (expanded[ppId]) await loadTasks(ppId);
      await load(true);
    } catch { toast.error('Erro ao sincronizar'); }
  };

  const activeIds = new Set(activeProtocols.filter(p => p.status === 'active').map(p => p.protocol_id));
  const today = new Date().toISOString().split('T')[0];

  if (loading) return (
    <div className="flex items-center gap-2 py-6 text-gray-400 justify-center">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">Carregando protocolos...</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Ativos */}
      {activeProtocols.filter(p => p.status === 'active').length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full" />Ativos
          </p>
          {activeProtocols.filter(p => p.status === 'active').map(pp => {
            const pd = tasksData[pp.id];
            const total = pd?.total ?? pp.injected_tasks ?? 0;
            const done = pd?.completed ?? 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isOpen = expanded[pp.id];
            return (
              <div key={pp.id} className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
                <div className="flex items-center justify-between p-3 gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">🟢</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-green-900 text-sm truncate">{pp.protocol_name}</p>
                      <p className="text-xs text-green-700">
                        {pp.protocol_category}{pp.start_date && ` • desde ${fmt(pp.start_date)}`}
                        {total > 0 && ` • ${done}/${total} tarefas`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline"
                      className={`text-xs h-7 px-2 ${isOpen ? 'bg-green-100 border-green-400 text-green-800' : 'border-green-300 text-green-700 hover:bg-green-100'}`}
                      onClick={() => toggleExpand(pp.id)}>
                      <ListChecks size={12} className="mr-1" />
                      {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </Button>
                    <Button size="sm" variant="outline" title="Sincronizar tasks"
                      className="text-xs h-7 px-2 border-green-300 text-green-700 hover:bg-green-100"
                      onClick={() => handleSync(pp.id, pp.protocol_name)}>
                      <RefreshCw size={11} />
                    </Button>
                    <Button size="sm" variant="outline"
                      className="text-xs h-7 px-2 border-red-200 text-red-600 hover:bg-red-50"
                      disabled={deactivating === pp.id}
                      onClick={() => handleDeactivate(pp.id)}>
                      {deactivating === pp.id ? <Loader2 size={11} className="animate-spin" /> : <Pause size={11} />}
                    </Button>
                  </div>
                </div>

                {/* tasks expandidas */}
                {isOpen && (
                  <div className="border-t border-green-200 bg-white">
                    {total > 0 && (
                      <div className="px-4 pt-3 pb-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-500">Progresso</span>
                          <span className="text-xs font-bold text-green-700">{done}/{total} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="p-3 space-y-1">
                      {pd?.loading ? (
                        <div className="flex items-center gap-2 py-3 text-gray-400 justify-center">
                          <Loader2 size={14} className="animate-spin" /><span className="text-xs">Carregando...</span>
                        </div>
                      ) : !pd?.tasks?.length ? (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-400 mb-2">Sem tarefas no checklist.</p>
                          <Button size="sm" variant="outline"
                            className="text-xs border-green-300 text-green-700"
                            onClick={() => handleSync(pp.id, pp.protocol_name)}>
                            <RefreshCw size={11} className="mr-1" />Sincronizar agora
                          </Button>
                        </div>
                      ) : (
                        pd.tasks.map(t => (
                          <div key={t.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer group transition-colors ${t.completed ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                            onClick={() => handleToggleTask(t.id, t.completed, pp.id)}>
                            <div className="flex-shrink-0">
                              {toggling === t.id
                                ? <Loader2 size={18} className="text-green-500 animate-spin" />
                                : t.completed
                                  ? <CheckCircle2 size={18} className="text-green-500" />
                                  : <Circle size={18} className="text-gray-300 group-hover:text-green-400 transition-colors" />}
                            </div>
                            <span className={`text-sm flex-1 ${t.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                              {t.display_title || t.title}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Programados */}
      {activeProtocols.filter(p => p.status === 'scheduled').length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />Programados
          </p>
          {activeProtocols.filter(p => p.status === 'scheduled').map(pp => (
            <div key={pp.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-2">
                <span>📅</span>
                <div>
                  <p className="font-semibold text-blue-900 text-sm">{pp.protocol_name}</p>
                  <p className="text-xs text-blue-600">
                    {pp.start_date && `Início em ${fmt(pp.start_date)}`}
                    {pp.end_date && ` → ${fmt(pp.end_date)}`}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline"
                className="text-xs border-red-200 text-red-500 hover:bg-red-50 h-7 px-2"
                disabled={deactivating === pp.id}
                onClick={() => handleDeactivate(pp.id)}>
                {deactivating === pp.id ? <Loader2 size={11} className="animate-spin" /> : 'Cancelar'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Catálogo */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Disponíveis ({availableProtocols.length})
          </p>
          <Button size="sm" variant="outline"
            className="h-6 px-2 text-[11px] border-purple-300 text-purple-700 hover:bg-purple-50"
            onClick={openNewProtocolForm}>
            <Plus size={11} className="mr-1" /> Novo
          </Button>
        </div>

        {/* Form inline criar/editar */}
        {showNewProtocolForm && (
          <div className="mb-3 border border-purple-200 rounded-xl p-3 bg-purple-50 space-y-2">
            <p className="text-xs font-semibold text-purple-800">
              {editingProtocol ? `Editar: ${editingProtocol.name}` : 'Novo protocolo no catálogo'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input value={protocolForm.name} onChange={e => setProtocolForm({ ...protocolForm, name: e.target.value })}
                  placeholder="Nome *" className="h-7 text-xs" />
              </div>
              <Input value={protocolForm.category} onChange={e => setProtocolForm({ ...protocolForm, category: e.target.value })}
                placeholder="Categoria" className="h-7 text-xs" />
              <Input type="number" value={protocolForm.default_duration_days}
                onChange={e => setProtocolForm({ ...protocolForm, default_duration_days: parseInt(e.target.value) || 30 })}
                placeholder="Dias" className="h-7 text-xs" />
              <div className="col-span-2">
                <Textarea value={protocolForm.description} onChange={e => setProtocolForm({ ...protocolForm, description: e.target.value })}
                  placeholder="Descrição (opcional)" className="h-14 text-xs resize-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" className="h-6 text-xs"
                onClick={() => { setShowNewProtocolForm(false); setEditingProtocol(null); }}>Cancelar</Button>
              <Button size="sm" disabled={savingProtocol}
                className="h-6 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleSaveProtocol}>
                {savingProtocol ? <Loader2 size={10} className="animate-spin" /> : (editingProtocol ? 'Salvar' : 'Criar')}
              </Button>
            </div>
          </div>
        )}

        {availableProtocols.length === 0 ? (
          <p className="text-xs text-gray-400 py-2 text-center">Nenhum protocolo cadastrado. Clique em "Novo" para criar.</p>
        ) : (
          <div className="space-y-2">
            {availableProtocols.map(p => {
              const isActive = activeIds.has(p.id);
              const isActivating = activating === p.id;
              const isSchedulingThis = scheduling === p.id;
              return (
                <div key={p.id} className={`rounded-xl border transition-colors ${isActive ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                        {isActive && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">ATIVO</span>}
                      </div>
                      <p className="text-xs text-gray-500">
                        {p.category}{p.default_duration_days && ` • ${p.default_duration_days} dias`}
                        {p.task_count != null && ` • ${p.task_count} tarefa(s)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                        title="Editar protocolo" onClick={() => openEditProtocol(p)}>
                        <Edit2 size={12} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                        title="Remover do catálogo" onClick={() => handleDeleteProtocol(p.id)}>
                        <X size={12} />
                      </Button>
                      {!isActive && (
                        <Button size="sm" disabled={isActivating}
                          onClick={() => { setScheduling(isSchedulingThis ? null : p.id); setScheduleDate(''); }}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 px-3">
                          {isActivating ? <Loader2 size={11} className="animate-spin mr-1" /> : <PlayCircle size={11} className="mr-1" />}
                          {isActivating ? 'Ativando...' : 'Ativar'}
                        </Button>
                      )}
                    </div>
                  </div>
                  {isSchedulingThis && !isActive && (
                    <div className="px-3 pb-3">
                      <div className="bg-white rounded-lg border border-purple-200 p-3 space-y-2">
                        <p className="text-xs font-semibold text-purple-800">Quando iniciar?</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Input type="date" className="text-xs h-7 w-36" value={scheduleDate} min={today}
                            onChange={e => setScheduleDate(e.target.value)} />
                          <Button size="sm" disabled={isActivating}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 px-3"
                            onClick={() => handleActivate(p.id, null)}>
                            Ativar agora
                          </Button>
                          <Button size="sm" variant="outline" disabled={!scheduleDate || isActivating}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs h-7 px-3"
                            onClick={() => handleActivate(p.id, scheduleDate)}>
                            📅 Programar
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="text-gray-400 hover:text-gray-600 text-xs h-7 px-2"
                            onClick={() => { setScheduling(null); setScheduleDate(''); }}>
                            <X size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Tasks do protocolo (expansível) ── */}
                  <div className="border-t border-gray-100">
                    <button
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                      onClick={() => toggleCatalogTasks(p.id)}
                    >
                      <span className="flex items-center gap-1.5">
                        <List size={11} />
                        Tasks do protocolo
                        {catalogTasksByProtocol[p.id]?.length > 0 && (
                          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                            {catalogTasksByProtocol[p.id].length}
                          </span>
                        )}
                        {p.task_count != null && !catalogTasksByProtocol[p.id] && (
                          <span className="text-gray-400 text-[10px]">({p.task_count} cadastrada{p.task_count !== 1 ? 's' : ''})</span>
                        )}
                      </span>
                      {expandedCatalogTasks[p.id] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </button>

                    {expandedCatalogTasks[p.id] && (
                      <div className="px-3 pb-3 space-y-2">
                        {loadingCatalogTasks[p.id] ? (
                          <p className="text-xs text-gray-400 py-1">Carregando...</p>
                        ) : (
                          <>
                            {/* Lista de tasks existentes */}
                            {(catalogTasksByProtocol[p.id] || []).length === 0 ? (
                              <p className="text-xs text-gray-400 italic py-1">
                                Nenhuma task cadastrada. Adicione abaixo para que apareçam no checklist do paciente ao ativar.
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {(catalogTasksByProtocol[p.id] || []).map(t => (
                                  <div key={t.id} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded group">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <CheckSquare size={11} className="text-purple-400 flex-shrink-0" />
                                      <span className="text-xs text-gray-700 truncate">{t.title}</span>
                                      {t.frequency && t.frequency !== 'daily' && (
                                        <span className="text-[10px] text-gray-400 flex-shrink-0">{t.frequency}</span>
                                      )}
                                    </div>
                                    <Button
                                      size="sm" variant="ghost"
                                      className="h-5 w-5 p-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                      onClick={() => handleDeleteCatalogTask(p.id, t.id, t.title)}
                                    >
                                      <Trash2 size={10} />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Form para adicionar nova task */}
                            <div className="flex gap-1.5 pt-1">
                              <Input
                                placeholder="Ex: Beber 2L de água hoje..."
                                value={(newTaskForm[p.id] || {}).title || ''}
                                onChange={e => setNewTaskForm(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), title: e.target.value } }))}
                                onKeyDown={e => e.key === 'Enter' && handleAddCatalogTask(p.id)}
                                className="h-7 text-xs flex-1"
                              />
                              <Button
                                size="sm"
                                disabled={savingTask === p.id}
                                className="h-7 px-2 bg-purple-600 hover:bg-purple-700 text-white text-xs flex-shrink-0"
                                onClick={() => handleAddCatalogTask(p.id)}
                              >
                                {savingTask === p.id ? '...' : <Plus size={12} />}
                              </Button>
                            </div>
                            <p className="text-[10px] text-gray-400">
                              💡 Tasks serão injetadas no checklist do paciente quando o protocolo for ativado
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── seção: checklist completo ────────────────────────────────────────────────

const ChecklistSection = ({ patientId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getChecklistTasks(patientId);
    setTasks(data || []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id, current) => {
    setToggling(id);
    setTasks(p => p.map(t => t.id === id ? { ...t, completed: !current } : t));
    const { error } = await toggleChecklistTask(id, !current);
    if (error) {
      setTasks(p => p.map(t => t.id === id ? { ...t, completed: current } : t));
      toast.error('Erro');
    }
    setToggling(null);
  };

  const handleAdd = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    const { data, error } = await createChecklistTask(patientId, newTask.trim());
    if (!error && data) { setTasks(p => [...p, data]); setNewTask(''); setShowAdd(false); }
    else toast.error('Erro ao criar tarefa');
    setAdding(false);
  };

  const handleDelete = async (id) => {
    setTasks(p => p.filter(t => t.id !== id));
    const { error } = await deleteChecklistTask(id);
    if (error) { toast.error('Erro ao remover'); load(); }
  };

  const isProtocol = (t) => t.source === 'protocol' || /^\[🎯/.test(t.title);
  const displayTitle = (t) => t.title.replace(/^\[🎯[^\]]*\]\s*/, '').trim();

  const done = tasks.filter(t => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">{done}/{tasks.length}</span>
          <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-400">{pct}%</span>
        </div>
        <Button size="sm" variant="ghost" className="text-purple-600 hover:bg-purple-50 text-xs h-7"
          onClick={() => setShowAdd(p => !p)}>
          <Plus size={13} className="mr-1" />Adicionar
        </Button>
      </div>

      {showAdd && (
        <div className="flex gap-2 mb-3">
          <Input value={newTask} onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="text-sm h-8" placeholder="Nova tarefa..." autoFocus />
          <Button size="sm" disabled={adding} className="h-8 bg-purple-600 hover:bg-purple-700 text-white px-3"
            onClick={handleAdd}>
            {adding ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-gray-400" /></div>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-center text-gray-400 py-4">Nenhuma tarefa ainda.</p>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {tasks.map(t => (
            <div key={t.id}
              className={`flex items-center gap-2 p-2.5 rounded-lg group transition-colors ${t.completed ? 'bg-emerald-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <div className="cursor-pointer flex-shrink-0"
                onClick={() => handleToggle(t.id, t.completed)}>
                {toggling === t.id
                  ? <Loader2 size={17} className="text-emerald-500 animate-spin" />
                  : t.completed
                    ? <CheckCircle2 size={17} className="text-emerald-500" />
                    : <Circle size={17} className="text-gray-300 hover:text-emerald-400" />}
              </div>
              <span className={`text-sm flex-1 truncate ${t.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {displayTitle(t)}
              </span>
              {isProtocol(t) && (
                <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full flex-shrink-0">protocolo</span>
              )}
              {!isProtocol(t) && (
                <button className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                  onClick={() => handleDelete(t.id)}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── seção: automações ────────────────────────────────────────────────────────

const AutomationsSection = ({ patientId, professionalId }) => {
  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [rulesData, runsData] = await Promise.allSettled([
          getAutomationRules(professionalId),
          listRuns(professionalId, { limit: 10 }),
        ]);
        setRules(rulesData.status === 'fulfilled' ? (rulesData.value?.data || []) : []);
        const rawRuns = runsData.status === 'fulfilled' ? (runsData.value?.runs || runsData.value || []) : [];
        setRuns(Array.isArray(rawRuns)
          ? rawRuns.filter(r => r.patient_id === patientId || !patientId).slice(0, 5)
          : []);
      } catch (e) {
        console.error('AutomationsSection load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [professionalId, patientId]);

  const activeRules = rules.filter(r => r.is_active || r.enabled);

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-3">
      {/* regras ativas */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Regras ativas ({activeRules.length})
        </p>
        {activeRules.length === 0 ? (
          <p className="text-xs text-gray-400">Nenhuma automação ativa.</p>
        ) : (
          <div className="space-y-1.5">
            {activeRules.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center gap-2 p-2.5 bg-violet-50 rounded-lg border border-violet-100">
                <Zap size={14} className="text-violet-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{r.name || r.trigger_type}</p>
                  <p className="text-[10px] text-gray-400">{r.trigger_type} → {Array.isArray(r.actions) ? r.actions.length : 0} ação(ões)</p>
                </div>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* histórico recente */}
      {runs.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            Histórico recente
          </p>
          <div className="space-y-1">
            {runs.map((r, i) => (
              <div key={r.id || i} className="flex items-center gap-2 p-2 text-xs text-gray-600 bg-gray-50 rounded-lg">
                <Activity size={12} className="flex-shrink-0 text-gray-400" />
                <span className="flex-1 truncate">{r.action_type || r.event_type || 'Automação executada'}</span>
                <span className="text-gray-400 flex-shrink-0">
                  {r.executed_at || r.created_at
                    ? new Date(r.executed_at || r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── seção: plano financeiro ──────────────────────────────────────────────────

const FinanceSection = ({ patientId }) => {
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState({ plan_name: '', plan_price: '', start_date: '', end_date: '', status: 'active', payment_status: 'paid', notes: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await getPatientPlan(patientId);
      if (data) {
        setPlan(data);
        setForm({ plan_name: data.plan_name || '', plan_price: data.plan_price ? String(data.plan_price) : '', start_date: data.start_date || '', end_date: data.end_date || '', status: data.status || 'active', payment_status: data.payment_status || 'paid', notes: data.notes || '' });
      }
      setLoading(false);
    };
    load();
  }, [patientId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await upsertPatientPlan(patientId, { ...form, plan_price: form.plan_price ? parseFloat(form.plan_price) : null });
    if (!error) { toast.success('Plano financeiro salvo!'); setEditing(false); }
    else toast.error('Erro ao salvar');
    setSaving(false);
  };

  const paymentColors = { paid: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', overdue: 'bg-red-100 text-red-700' };
  const paymentLabels = { paid: '✅ Pago', pending: '⏳ Pendente', overdue: '🔴 Atrasado' };

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-400" /></div>;

  return (
    <div>
      {!editing ? (
        <div className="space-y-3">
          {plan || form.plan_price ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Plano</p>
                <p className="font-semibold text-gray-800 text-sm truncate">{form.plan_name || '--'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Valor</p>
                <p className="font-bold text-emerald-700 text-lg">{form.plan_price ? `R$ ${parseFloat(form.plan_price).toFixed(2)}` : '--'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Pagamento</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${paymentColors[form.payment_status] || paymentColors.pending}`}>
                  {paymentLabels[form.payment_status] || form.payment_status}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Vigência</p>
                <p className="text-xs text-gray-600">{form.start_date ? fmt(form.start_date) : '--'} → {form.end_date ? fmt(form.end_date) : '--'}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">Nenhum plano financeiro cadastrado.</p>
          )}
          <Button size="sm" variant="outline" className="w-full text-xs h-8 border-gray-200"
            onClick={() => setEditing(true)}>
            <Edit2 size={12} className="mr-1" />{plan ? 'Editar plano' : 'Cadastrar plano financeiro'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Nome do plano</Label>
              <Input value={form.plan_name} onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))}
                className="h-8 text-sm mt-1" placeholder="Ex: Trimestral Premium" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Valor (R$)</Label>
              <Input type="number" value={form.plan_price} onChange={e => setForm(f => ({ ...f, plan_price: e.target.value }))}
                className="h-8 text-sm mt-1" placeholder="450.00" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Status pagamento</Label>
              <Select value={form.payment_status} onValueChange={v => setForm(f => ({ ...f, payment_status: v }))}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">✅ Pago</SelectItem>
                  <SelectItem value="pending">⏳ Pendente</SelectItem>
                  <SelectItem value="overdue">🔴 Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Início</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Término</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs" onClick={() => setEditing(false)}>
              <X size={12} className="mr-1" />Cancelar
            </Button>
            <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── componente principal ─────────────────────────────────────────────────────

const ProfessionalProjectDashboard = ({ patientId, professionalId, patient }) => {
  const [journey, setJourney] = useState(null);
  const [adherence, setAdherence] = useState(null);
  const [activeProtocolsCount, setActiveProtocolsCount] = useState(null);
  const [savingJourney, setSavingJourney] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(true);

  // carregar journey + KPIs
  useEffect(() => {
    const load = async () => {
      try {
        const [j, adh, ap] = await Promise.allSettled([
          getPatientJourney(patientId),
          getChecklistAdherence(patientId, 7),
          authenticatedGet(`/api/professional/patients/${patientId}/active-protocols`),
        ]);
        if (j.status === 'fulfilled') setJourney(j.value?.data);
        if (adh.status === 'fulfilled') setAdherence(adh.value);
        if (ap.status === 'fulfilled') {
          const protocols = ap.value?.patient_protocols || [];
          setActiveProtocolsCount(protocols.filter(p => p.status === 'active').length);
        }
      } finally {
        setKpiLoading(false);
      }
    };
    load();
  }, [patientId]);

  const handleSaveJourney = async (form) => {
    setSavingJourney(true);
    const { error } = await upsertPatientJourney(patientId, form);
    if (!error) { setJourney(form); toast.success('Projeto salvo!'); }
    else toast.error('Erro ao salvar projeto');
    setSavingJourney(false);
  };

  const pct = progressPct(journey?.plan_start_date, journey?.plan_end_date);
  const daysLeft = diffDays(journey?.plan_end_date);
  const adherencePct = adherence?.adherence ?? 0;

  const kpis = [
    {
      icon: Activity, label: 'Aderência (7d)',
      value: kpiLoading ? '--' : `${adherencePct}%`,
      sub: kpiLoading ? null : `${adherence?.completed ?? 0}/${adherence?.total ?? 0} tarefas`,
      gradient: adherencePct >= 70 ? 'from-emerald-500 to-teal-600' : adherencePct >= 40 ? 'from-amber-500 to-orange-600' : 'from-red-500 to-rose-600',
    },
    {
      icon: Clock, label: 'Dias restantes',
      value: kpiLoading ? '--' : daysLeft !== null ? (daysLeft > 0 ? daysLeft : daysLeft === 0 ? 'Hoje' : 'Enc.') : '--',
      sub: journey?.plan_end_date ? `Fim: ${fmt(journey.plan_end_date)}` : 'Sem data',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Zap, label: 'Protocolos ativos',
      value: kpiLoading ? '--' : activeProtocolsCount ?? 0,
      sub: 'em execução',
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      icon: TrendingUp, label: 'Progresso geral',
      value: kpiLoading ? '--' : `${pct}%`,
      sub: journey?.plan_name ? journey.plan_name.slice(0, 20) : 'do programa',
      gradient: pct >= 70 ? 'from-emerald-500 to-green-600' : 'from-slate-500 to-gray-600',
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── HEADER DO PROJETO ─────────────────────── */}
      <ProjectHeader
        patient={patient}
        journey={journey}
        onSave={handleSaveJourney}
        saving={savingJourney}
      />

      {/* ── KPIs ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <KPI key={i} {...k} loading={kpiLoading} />
        ))}
      </div>

      {/* ── GRID PRINCIPAL ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* coluna esquerda: 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* Protocolos */}
          <Card className="border-purple-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 pb-3 pt-4 px-5">
              <CardTitle className="flex items-center gap-2 text-purple-900 text-base">
                <Zap size={16} className="text-purple-600" />
                Protocolos do Programa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ProtocolsSection patientId={patientId} />
            </CardContent>
          </Card>

          {/* Checklist completo */}
          <Card className="border-emerald-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 pb-3 pt-4 px-5">
              <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
                <ListChecks size={16} className="text-emerald-600" />
                Todas as Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ChecklistSection patientId={patientId} />
            </CardContent>
          </Card>

          {/* Automações */}
          <Card className="border-violet-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 pb-3 pt-4 px-5">
              <CardTitle className="flex items-center gap-2 text-violet-900 text-base">
                <Activity size={16} className="text-violet-600" />
                Automações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <AutomationsSection patientId={patientId} professionalId={professionalId} />
            </CardContent>
          </Card>

        </div>

        {/* coluna direita: 1/3 */}
        <div className="space-y-5">

          {/* Timeline */}
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-gray-800 text-base">
                <Clock size={15} className="text-gray-400" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <PatientTimeline patientId={patientId} limit={12} />
            </CardContent>
          </Card>

          {/* Plano Financeiro */}
          <Card className="border-emerald-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100 pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
                <DollarSign size={16} className="text-emerald-600" />
                Plano Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <FinanceSection patientId={patientId} />
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-gray-800 text-base">
                <Sparkles size={15} className="text-amber-500" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2">
                {[
                  { label: 'Enviar recado', icon: MessageSquare, color: 'text-blue-600 hover:bg-blue-50', tab: 'recados' },
                  { label: 'Ver plano alimentar', icon: FileText, color: 'text-orange-600 hover:bg-orange-50', tab: 'plano' },
                  { label: 'Ver anamnese', icon: Bell, color: 'text-pink-600 hover:bg-pink-50', tab: 'anamnese' },
                  { label: 'Fotos de progresso', icon: Camera, color: 'text-teal-600 hover:bg-teal-50', tab: 'resumo' },
                ].map((a) => (
                  <button key={a.tab}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors bg-gray-50 ${a.color}`}
                    onClick={() => {
                      // navegar para a tab correspondente no PatientProfile
                      const tab = document.querySelector(`[data-tab="${a.tab}"]`);
                      if (tab) tab.click();
                    }}>
                    <a.icon size={15} className="flex-shrink-0" />
                    {a.label}
                    <ArrowRight size={12} className="ml-auto" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default ProfessionalProjectDashboard;
