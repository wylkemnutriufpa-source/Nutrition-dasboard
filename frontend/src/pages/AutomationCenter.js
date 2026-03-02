import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Zap, Plus, Settings, History, Trash2, Edit, Play, Pause, Clock,
  Users, Bell, AlertTriangle, Rocket, MessageSquare, ChevronRight,
  Bot, Sparkles, Activity, CheckCircle2, XCircle, Loader2,
  Shield, Target, TrendingUp, CalendarDays, ClipboardList, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import {
  getAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
  getAutomationLogs,
  countTodayExecutions
} from '@/lib/supabase';
import { AUTOMATION_TEMPLATES, runAutomationEngine } from '@/utils/automationEngine';
import { useProfessionalDashboard } from '@/hooks/useProfessionalDashboard';

// ==================== TABS ====================
const TABS = [
  { id: 'rules', label: 'Minhas Automações', icon: Zap },
  { id: 'templates', label: 'Templates', icon: Sparkles },
  { id: 'logs', label: 'Histórico', icon: History }
];

const TRIGGER_LABELS = {
  inactive_days: { label: 'Paciente Inativo', unit: 'dias', icon: Clock, color: 'text-amber-600' },
  low_checklist: { label: 'Checklist Baixo', unit: '%', icon: ClipboardList, color: 'text-purple-600' },
  plan_expiring: { label: 'Plano Vencendo', unit: 'dias', icon: CalendarDays, color: 'text-cyan-600' },
  new_patient: { label: 'Novo Paciente', unit: 'dias', icon: Rocket, color: 'text-emerald-600' },
  high_risk: { label: 'Risco Elevado', unit: 'score', icon: AlertTriangle, color: 'text-red-600' },
  no_feedback: { label: 'Sem Feedback', unit: 'dias', icon: MessageSquare, color: 'text-blue-600' }
};

const ACTION_LABELS = {
  notify_patient: { label: 'Notificar Paciente', icon: Bell },
  notify_professional: { label: 'Alertar Profissional', icon: AlertTriangle },
  create_reminder: { label: 'Criar Lembrete', icon: CalendarDays },
  assign_templates: { label: 'Atribuir Templates + Onboarding', icon: Rocket }
};

// ==================== TAB NAVIGATION ====================
const TabNav = ({ activeTab, onTabChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
    {TABS.map(tab => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return (
        <button key={tab.id} onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
            ${isActive ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
          <Icon className="h-4 w-4" />
          {tab.label}
        </button>
      );
    })}
  </div>
);

// ==================== RULE CARD ====================
const RuleCard = ({ rule, onToggle, onEdit, onDelete, isToggling }) => {
  const trigger = TRIGGER_LABELS[rule.trigger_type] || { label: rule.trigger_type, icon: Zap, color: 'text-gray-600' };
  const action = ACTION_LABELS[rule.action_type] || { label: rule.action_type, icon: Bell };
  const TriggerIcon = trigger.icon;
  const ActionIcon = action.icon;

  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${rule.is_active ? 'border-violet-200 bg-white shadow-lg shadow-violet-50' : 'border-gray-200 bg-gray-50 opacity-75'}`}>
      {rule.is_active && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rule.is_active ? 'from-violet-500 to-purple-600' : 'from-gray-300 to-gray-400'} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
              <Bot className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 truncate">{rule.name}</h3>
                <Badge className={rule.is_active ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-500 border-0'}>
                  {rule.is_active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              {rule.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{rule.description}</p>}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                <span className={`flex items-center gap-1 font-medium ${trigger.color}`}>
                  <TriggerIcon className="h-3.5 w-3.5" />
                  {trigger.label}: {rule.trigger_value} {trigger.unit}
                </span>
                <ChevronRight className="h-3 w-3 text-gray-300" />
                <span className="flex items-center gap-1 text-gray-600">
                  <ActionIcon className="h-3.5 w-3.5" />
                  {action.label}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-400">Cooldown: {rule.cooldown_hours}h</span>
                {rule.execution_count > 0 && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="text-violet-600 font-semibold">{rule.execution_count}x executada</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Switch
              checked={rule.is_active}
              onCheckedChange={() => onToggle(rule.id, !rule.is_active)}
              disabled={isToggling}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(rule)}>
              <Edit className="h-4 w-4 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(rule.id)}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== TEMPLATE CARD ====================
const TemplateCard = ({ template, onActivate, existing }) => {
  const isAlreadyActive = existing.some(r => r.trigger_type === template.trigger_type && r.action_type === template.action_type);
  
  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all group ${isAlreadyActive ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white hover:shadow-xl hover:border-violet-200'}`}>
      <div className={`h-1.5 bg-gradient-to-r ${template.gradient}`} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
            <span className="text-xl">{template.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 mb-1">{template.name}</h4>
            <p className="text-sm text-gray-500">{template.description}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              <span>Gatilho: {template.trigger_value} {TRIGGER_LABELS[template.trigger_type]?.unit || ''}</span>
              <span>•</span>
              <span>Cooldown: {template.cooldown_hours}h</span>
            </div>
          </div>
          {isAlreadyActive ? (
            <Badge className="bg-green-100 text-green-700 border-0 flex-shrink-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Ativa
            </Badge>
          ) : (
            <Button
              size="sm"
              onClick={() => onActivate(template)}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 shadow-md flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Ativar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== LOG ITEM ====================
const LogItem = ({ log }) => {
  const trigger = TRIGGER_LABELS[log.trigger_type] || {};
  const action = ACTION_LABELS[log.action_type] || {};
  const timeAgo = getTimeAgo(log.created_at);

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-all">
      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{log.rule_name || 'Automação'}</span>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <span className="text-sm text-gray-600">{log.patient_name || 'Paciente'}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{log.action_detail}</p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo}</span>
    </div>
  );
};

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

// ==================== PÁGINA PRINCIPAL ====================
const AutomationCenter = () => {
  const { user, profile } = useAuth();
  const professionalId = user?.id || profile?.id;
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [runningEngine, setRunningEngine] = useState(false);

  // Dashboard data for running engine
  const { patientsWithScore } = useProfessionalDashboard(professionalId);

  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'inactive_days',
    trigger_value: 3,
    action_type: 'notify_patient',
    action_message: '',
    cooldown_hours: 24,
    is_active: true
  });

  const loadData = useCallback(async () => {
    if (!professionalId) return;
    setLoading(true);
    try {
      const [rulesRes, logsRes, countRes] = await Promise.all([
        getAutomationRules(professionalId),
        getAutomationLogs(professionalId, 50),
        countTodayExecutions(professionalId)
      ]);
      setRules(rulesRes.data || []);
      setLogs(logsRes.data || []);
      setTodayCount(countRes.count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    if (professionalId) {
      loadData();
      trackProfessionalFeature('view_automations');
    }
  }, [professionalId, loadData]);

  // ========== HANDLERS ==========
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      if (editingRule) {
        const { error } = await updateAutomationRule(editingRule.id, form);
        if (error) throw error;
        toast.success('Automação atualizada!');
      } else {
        const { error } = await createAutomationRule({
          ...form,
          professional_id: professionalId
        });
        if (error) throw error;
        toast.success('Automação criada!');
        trackProfessionalFeature('create_automation');
      }
      setShowModal(false);
      setEditingRule(null);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar automação');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ruleId, isActive) => {
    setToggling(true);
    try {
      const { error } = await toggleAutomationRule(ruleId, isActive);
      if (error) throw error;
      setRules(rules.map(r => r.id === ruleId ? { ...r, is_active: isActive } : r));
      toast.success(isActive ? 'Automação ativada!' : 'Automação pausada');
    } catch (e) {
      toast.error('Erro ao alterar status');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Excluir esta automação?')) return;
    try {
      const { error } = await deleteAutomationRule(ruleId);
      if (error) throw error;
      setRules(rules.filter(r => r.id !== ruleId));
      toast.success('Automação removida');
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      trigger_value: rule.trigger_value,
      action_type: rule.action_type,
      action_message: rule.action_message || '',
      cooldown_hours: rule.cooldown_hours || 24,
      is_active: rule.is_active
    });
    setShowModal(true);
  };

  const handleActivateTemplate = async (template) => {
    setSaving(true);
    try {
      const { error } = await createAutomationRule({
        professional_id: professionalId,
        name: template.name,
        description: template.description,
        trigger_type: template.trigger_type,
        trigger_value: template.trigger_value,
        action_type: template.action_type,
        action_message: template.action_message || '',
        cooldown_hours: template.cooldown_hours,
        is_active: true
      });
      if (error) throw error;
      toast.success(`Automação "${template.name}" ativada!`);
      trackProfessionalFeature('activate_automation_template');
      loadData();
    } catch (e) {
      toast.error('Erro ao ativar template');
    } finally {
      setSaving(false);
    }
  };

  const handleRunEngine = async () => {
    if (!patientsWithScore?.length || !rules?.length) {
      toast.info('Sem pacientes ou regras para processar');
      return;
    }
    setRunningEngine(true);
    try {
      const { executed, actions } = await runAutomationEngine(rules, patientsWithScore, professionalId);
      if (executed > 0) {
        toast.success(`🤖 ${executed} automação(ões) executada(s)!`);
        loadData();
      } else {
        toast.info('Nenhuma automação disparou (condições não atendidas ou cooldown)');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao executar automações');
    } finally {
      setRunningEngine(false);
    }
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setForm({
      name: '',
      description: '',
      trigger_type: 'inactive_days',
      trigger_value: 3,
      action_type: 'notify_patient',
      action_message: '',
      cooldown_hours: 24,
      is_active: true
    });
    setShowModal(true);
  };

  // Stats
  const activeRules = rules.filter(r => r.is_active).length;
  const totalExecutions = rules.reduce((sum, r) => sum + (r.execution_count || 0), 0);

  if (loading) {
    return (
      <Layout title="Automações" userType="professional">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Central de Automações" userType="professional">
      <div className="max-w-7xl mx-auto space-y-6 pb-8">

        {/* ========== PREMIUM HEADER ========== */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-3">
                🤖 Automação Inteligente
              </span>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-xl">
                    <Bot className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Central de Automações</h1>
                    <p className="text-white/80 text-sm">Automatize tarefas e nunca perca um paciente</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRunEngine}
                    disabled={runningEngine}
                    className="bg-white/20 text-white hover:bg-white/30 border border-white/20 backdrop-blur-sm shadow-lg"
                  >
                    {runningEngine ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Executar Agora
                  </Button>
                  <Button onClick={openCreateModal} className="bg-white text-violet-700 hover:bg-white/90 shadow-lg font-semibold">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Automação
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Zap, value: rules.length, label: 'Regras' },
                  { icon: Play, value: activeRules, label: 'Ativas' },
                  { icon: Activity, value: todayCount, label: 'Execuções Hoje' },
                  { icon: TrendingUp, value: totalExecutions, label: 'Total Execuções' }
                ].map((stat, i) => {
                  const StatIcon = stat.icon;
                  return (
                    <div key={i} className="text-center bg-white/15 backdrop-blur-sm rounded-xl p-3">
                      <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-white/20 flex items-center justify-center">
                        <StatIcon className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-xl font-black">{stat.value}</p>
                      <p className="text-[10px] text-white/70">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========== TABS ========== */}
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ========== TAB: MINHAS AUTOMAÇÕES ========== */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {rules.length === 0 ? (
              <Card className="border-dashed border-2 border-violet-200">
                <CardContent className="py-12 text-center">
                  <Bot className="h-16 w-16 text-violet-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhuma automação configurada</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Configure automações para notificar pacientes inativos, alertar sobre riscos e muito mais.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={openCreateModal} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                      <Plus className="h-4 w-4 mr-2" /> Criar Automação
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('templates')}>
                      <Sparkles className="h-4 w-4 mr-2" /> Ver Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              rules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isToggling={toggling}
                />
              ))
            )}
          </div>
        )}

        {/* ========== TAB: TEMPLATES ========== */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Templates de Automação</h3>
                <p className="text-sm text-gray-500">Ative com um clique. Personalize depois.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AUTOMATION_TEMPLATES.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onActivate={handleActivateTemplate}
                  existing={rules}
                />
              ))}
            </div>
          </div>
        )}

        {/* ========== TAB: HISTÓRICO ========== */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Histórico de Execuções</h3>
                <p className="text-sm text-gray-500">{logs.length} execuções registradas</p>
              </div>
              {todayCount > 0 && (
                <Badge className="bg-violet-100 text-violet-700 border-0">
                  {todayCount} hoje
                </Badge>
              )}
            </div>
            {logs.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma execução registrada ainda</p>
                  <p className="text-sm text-gray-400 mt-1">Execute as automações para ver o histórico aqui</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {logs.map(log => <LogItem key={log.id} log={log} />)}
              </div>
            )}
          </div>
        )}

        {/* ========== MODAL CRIAR/EDITAR ========== */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-600" />
                {editingRule ? 'Editar Automação' : 'Nova Automação'}
              </DialogTitle>
              <DialogDescription>
                Configure o gatilho e a ação automática
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Notificar pacientes inativos"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="O que esta automação faz..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gatilho (Quando?)</Label>
                  <Select value={form.trigger_type} onValueChange={v => setForm({ ...form, trigger_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inactive_days">Paciente Inativo (dias)</SelectItem>
                      <SelectItem value="low_checklist">Checklist Baixo (%)</SelectItem>
                      <SelectItem value="plan_expiring">Plano Vencendo (dias)</SelectItem>
                      <SelectItem value="new_patient">Novo Paciente (dias)</SelectItem>
                      <SelectItem value="high_risk">Risco Elevado (score)</SelectItem>
                      <SelectItem value="no_feedback">Sem Feedback (dias)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor do Gatilho</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.trigger_value}
                    onChange={e => setForm({ ...form, trigger_value: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {TRIGGER_LABELS[form.trigger_type]?.unit || ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ação (O quê?)</Label>
                  <Select value={form.action_type} onValueChange={v => setForm({ ...form, action_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notify_patient">Notificar Paciente</SelectItem>
                      <SelectItem value="notify_professional">Alertar Profissional</SelectItem>
                      <SelectItem value="create_reminder">Criar Lembrete</SelectItem>
                      <SelectItem value="assign_templates">Atribuir Templates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cooldown (horas)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.cooldown_hours}
                    onChange={e => setForm({ ...form, cooldown_hours: parseInt(e.target.value) || 24 })}
                  />
                  <p className="text-xs text-gray-400 mt-1">Mínimo entre execuções</p>
                </div>
              </div>

              <div>
                <Label>Mensagem Personalizada (opcional)</Label>
                <Textarea
                  value={form.action_message}
                  onChange={e => setForm({ ...form, action_message: e.target.value })}
                  placeholder="Deixe vazio para usar mensagem padrão..."
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingRule ? 'Salvar' : 'Criar Automação'}
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
};

export default AutomationCenter;
