/**
 * MealPlanTimeline.js
 * Componente de timeline Multi-Planos - Programar Planos Futuros
 * Layout premium inspirado na Central de Recursos
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar, Clock, CheckCircle2, PlayCircle, Archive, Loader2,
  Plus, Zap, Crown, AlertCircle, TrendingUp, ChevronRight,
  FileText, Sparkles, Edit, ArrowRight, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessFeature, supabase } from '@/lib/supabase';
import {
  getPatientAllMealPlans,
  createScheduledMealPlan,
  activateScheduledPlan,
  archiveMealPlan
} from '@/lib/supabase';
import MealPlanEditorCompact from '@/components/MealPlanEditorCompact';

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700', icon: Clock, gradient: 'from-gray-400 to-gray-500' },
  scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-700', icon: Calendar, gradient: 'from-blue-400 to-indigo-500' },
  active: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700', icon: PlayCircle, gradient: 'from-emerald-400 to-teal-500' },
  completed: { label: 'Concluído', color: 'bg-purple-100 text-purple-700', icon: CheckCircle2, gradient: 'from-purple-400 to-violet-500' },
  archived: { label: 'Arquivado', color: 'bg-amber-100 text-amber-700', icon: Archive, gradient: 'from-amber-400 to-orange-500' }
};

const MealPlanTimeline = ({ patientId, professionalId, userRole, onPlanCreated }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canUseMultiPlan, setCanUseMultiPlan] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState(null);
  
  // Wizard states
  const [step, setStep] = useState(1); // 1: escolher fonte, 2: editar plano, 3: configurar data
  const [prePlans, setPrePlans] = useState([]);
  const [loadingPrePlans, setLoadingPrePlans] = useState(false);
  const [selectedPrePlanId, setSelectedPrePlanId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    available_at: '',
    reminder_days: '',
    plan_data: { meals: [] },
    daily_targets: { calorias: 2000, proteina: 100, carboidrato: 250, gordura: 70 }
  });

  useEffect(() => {
    loadPlans();
    checkAccess();
  }, [patientId]);

  useEffect(() => {
    if (showModal && step === 1) {
      loadPrePlans();
    }
  }, [showModal, step]);

  const checkAccess = async () => {
    const { allowed } = await canAccessFeature('multi_plan_engine', profile);
    setCanUseMultiPlan(allowed);
  };

  /**
   * Carregar pré-planos disponíveis:
   * 1. Templates do profissional (professional_templates tipo meal_plan)
   * 2. Drafts do paciente (meal_plans status draft)
   * 3. Planos anteriores do paciente (completed/active)
   */
  const loadPrePlans = async () => {
    setLoadingPrePlans(true);
    try {
      const templates = [];
      
      // 1. Templates do profissional (professional_templates)
      if (professionalId) {
        const { data: profTemplates } = await supabase
          .from('professional_templates')
          .select('*')
          .eq('professional_id', professionalId)
          .eq('type', 'meal_plan')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (profTemplates && profTemplates.length > 0) {
          templates.push(...profTemplates.map(t => ({
            id: t.id,
            name: t.title,
            description: t.description || '',
            plan_data: t.content?.plan_data || { meals: [] },
            daily_targets: t.content?.daily_targets || {},
            source: 'template',
            source_label: 'Template',
            created_at: t.created_at
          })));
        }
      }

      // 2. Drafts do paciente (meal_plans status draft)
      const { data: patientDrafts } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('plan_status', 'draft')
        .order('created_at', { ascending: false });
      
      if (patientDrafts && patientDrafts.length > 0) {
        templates.push(...patientDrafts.map(d => ({
          id: d.id,
          name: d.name,
          description: d.description || '',
          plan_data: d.plan_data || { meals: [] },
          daily_targets: d.daily_targets || {},
          source: 'draft',
          source_label: 'Rascunho',
          created_at: d.created_at
        })));
      }

      // 3. Planos anteriores do paciente (completed/active)
      const { data: previousPlans } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('patient_id', patientId)
        .in('plan_status', ['completed', 'active'])
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (previousPlans && previousPlans.length > 0) {
        templates.push(...previousPlans.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          plan_data: p.plan_data || { meals: [] },
          daily_targets: p.daily_targets || {},
          source: 'previous',
          source_label: 'Plano Anterior',
          created_at: p.created_at
        })));
      }

      setPrePlans(templates);
    } catch (err) {
      console.error('Erro ao carregar pré-planos:', err);
      toast.error('Erro ao carregar pré-planos');
    } finally {
      setLoadingPrePlans(false);
    }
  };

  const handleSelectPrePlan = (prePlan) => {
    setFormData({
      ...formData,
      name: `${prePlan.name} (Programado)`,
      description: prePlan.description || '',
      plan_data: prePlan.plan_data || { meals: [] },
      daily_targets: prePlan.daily_targets || { calorias: 2000, proteina: 100, carboidrato: 250, gordura: 70 }
    });
    setSelectedPrePlanId(prePlan.id);
    setStep(2);
  };

  const handleCreateFromScratch = () => {
    setFormData({
      name: 'Novo Plano Programado',
      description: '',
      available_at: '',
      reminder_days: '',
      plan_data: { meals: [] },
      daily_targets: { calorias: 2000, proteina: 100, carboidrato: 250, gordura: 70 }
    });
    setSelectedPrePlanId(null);
    setStep(2);
  };

  const handleOpenFullEditor = () => {
    // Salvar dados no sessionStorage e abrir editor completo
    sessionStorage.setItem('scheduledPlanData', JSON.stringify({
      ...formData,
      patientId,
      isScheduled: true
    }));
    setShowModal(false);
    navigate(`/professional/meal-plan-editor?patient=${patientId}&fromScheduled=true`);
  };

  const handleBackToStep = (targetStep) => {
    setStep(targetStep);
  };

  const handleContinueToSchedule = () => {
    if (!formData.name) {
      toast.error('Preencha o nome do plano');
      return;
    }
    setStep(3);
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await getPatientAllMealPlans(patientId);
      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScheduled = async () => {
    if (!formData.name || !formData.available_at) {
      toast.error('Preencha nome e data de ativação');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await createScheduledMealPlan({
        patient_id: patientId,
        professional_id: professionalId,
        name: formData.name,
        description: formData.description,
        available_at: new Date(formData.available_at).toISOString(),
        plan_data: formData.plan_data,
        daily_targets: formData.daily_targets,
        criteria_json: formData.reminder_days ? { reminder_days: parseInt(formData.reminder_days) } : {}
      });

      if (error) throw error;
      
      toast.success('Plano agendado com sucesso!');
      
      // Perguntar se quer programar outro
      const programarOutro = window.confirm('Plano agendado! Deseja programar outro plano?');
      
      if (programarOutro) {
        resetWizard();
      } else {
        setShowModal(false);
        resetWizard();
      }
      
      loadPlans();
      if (onPlanCreated) onPlanCreated();
    } catch (err) {
      console.error('Erro ao agendar plano:', err);
      toast.error('Erro ao agendar plano');
    } finally {
      setCreating(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setFormData({
      name: '',
      description: '',
      available_at: '',
      reminder_days: '',
      plan_data: { meals: [] },
      daily_targets: { calorias: 2000, proteina: 100, carboidrato: 250, gordura: 70 }
    });
    setSelectedPrePlanId(null);
  };

  const handleActivate = async (planId) => {
    if (!window.confirm('Deseja ativar este plano agora? O plano atual será concluído.')) return;

    setActivating(planId);
    try {
      const { error } = await activateScheduledPlan(planId, professionalId);
      if (error) throw error;
      
      toast.success('Plano ativado!');
      loadPlans();
    } catch (err) {
      toast.error('Erro ao ativar plano');
    } finally {
      setActivating(null);
    }
  };

  const handleArchive = async (planId) => {
    if (!window.confirm('Deseja arquivar este plano?')) return;

    try {
      const { error } = await archiveMealPlan(planId, professionalId);
      if (error) throw error;
      toast.success('Plano arquivado');
      loadPlans();
    } catch (err) {
      toast.error('Erro ao arquivar plano');
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isDatePassed = (date) => {
    if (!date) return false;
    return new Date(date) <= new Date();
  };

  if (loading) {
    return (
      <Card className="border-2 border-violet-200">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-violet-200 bg-gradient-to-br from-white to-violet-50/30 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        {/* Header Premium */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Programação de Planos
                {canUseMultiPlan && (
                  <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-[10px]">
                    <Crown className="h-2.5 w-2.5 mr-0.5" />PRO
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-gray-500">Agende múltiplos planos alimentares</p>
            </div>
          </div>

          {userRole === 'professional' && canUseMultiPlan && (
            <Dialog open={showModal} onOpenChange={(open) => {
              setShowModal(open);
              if (!open) resetWizard();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Programar Próximo Plano
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    Programar Novo Plano - Etapa {step}/3
                  </DialogTitle>
                </DialogHeader>

                {/* ========== STEP 1: Escolher Fonte ========== */}
                {step === 1 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Como deseja criar o plano agendado?</p>
                    
                    {/* Opção: Criar do Zero */}
                    <button
                      onClick={handleCreateFromScratch}
                      className="w-full text-left p-4 border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl hover:border-emerald-400 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                          <Plus className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">Criar Novo Plano do Zero</p>
                          <p className="text-xs text-gray-600">Começar com plano em branco e configurar manualmente</p>
                        </div>
                        <ChevronRight className="text-emerald-500" />
                      </div>
                    </button>

                    {/* Opção: Usar Editor Completo */}
                    <button
                      onClick={handleOpenFullEditor}
                      className="w-full text-left p-4 border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                          <Edit className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">Usar Editor Completo</p>
                          <p className="text-xs text-gray-600">Abrir o editor de plano alimentar com todas as funcionalidades</p>
                        </div>
                        <ChevronRight className="text-blue-500" />
                      </div>
                    </button>

                    {/* Divisor */}
                    <div className="flex items-center gap-2 py-2">
                      <div className="h-px bg-gray-200 flex-1" />
                      <span className="text-xs text-gray-500 font-semibold uppercase">ou usar IA Plan existente</span>
                      <div className="h-px bg-gray-200 flex-1" />
                    </div>

                    {/* Lista de Pré-Planos */}
                    {loadingPrePlans ? (
                      <div className="text-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-violet-500 mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">Carregando pré-planos...</p>
                      </div>
                    ) : prePlans.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {prePlans.map((prePlan) => (
                          <button
                            key={prePlan.id}
                            onClick={() => handleSelectPrePlan(prePlan)}
                            className="w-full text-left p-3 border-2 border-gray-200 rounded-xl hover:border-violet-400 hover:bg-violet-50 transition-all group"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                prePlan.source === 'template' ? 'bg-amber-100' :
                                prePlan.source === 'draft' ? 'bg-gray-100' : 'bg-purple-100'
                              }`}>
                                {prePlan.source === 'template' ? <FileText className="h-5 w-5 text-amber-600" /> :
                                 prePlan.source === 'draft' ? <Edit className="h-5 w-5 text-gray-600" /> :
                                 <Copy className="h-5 w-5 text-purple-600" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-900 text-sm truncate">{prePlan.name}</p>
                                  <Badge variant="outline" className="text-[10px] px-1.5">{prePlan.source_label}</Badge>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{prePlan.description || 'Sem descrição'}</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {prePlan.plan_data?.meals?.length || 0} refeições • {formatDate(prePlan.created_at)}
                                </p>
                              </div>
                              <ChevronRight className="text-gray-300 group-hover:text-violet-500 transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Nenhum IA Plan disponível</p>
                        <p className="text-xs text-gray-400 mt-1">Crie templates ou salve rascunhos para reutilizar</p>
                      </div>
                    )}

                    <Button variant="outline" className="w-full" onClick={() => setShowModal(false)}>
                      Cancelar
                    </Button>
                  </div>
                )}

                {/* ========== STEP 2: Editor de Plano ========== */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do Plano *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Plano de Verão 2025"
                      />
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Objetivo e observações do plano..."
                        rows={2}
                      />
                    </div>

                    {/* Editor de Refeições e Alimentos */}
                    <div>
                      <Label className="text-base font-bold mb-2 block flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        Configurar Refeições e Alimentos
                      </Label>
                      <MealPlanEditorCompact
                        value={formData.plan_data}
                        onChange={(newPlanData) => setFormData({ ...formData, plan_data: newPlanData })}
                        dailyTargets={formData.daily_targets}
                        onTargetsChange={(newTargets) => setFormData({ ...formData, daily_targets: newTargets })}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleBackToStep(1)}>
                        Voltar
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90"
                        onClick={handleContinueToSchedule}
                      >
                        Continuar - Definir Data
                      </Button>
                    </div>
                  </div>
                )}

                {/* ========== STEP 3: Configurar Data e Lembrete ========== */}
                {step === 3 && (
                  <div className="space-y-4">
                    {/* Resumo do Plano */}
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-violet-900">{formData.name}</p>
                          <p className="text-sm text-violet-700">{formData.description || 'Sem descrição'}</p>
                          <p className="text-xs text-violet-600 mt-1">
                            {formData.plan_data?.meals?.length || 0} refeições configuradas
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Data de Ativação *</Label>
                      <Input
                        type="date"
                        value={formData.available_at}
                        onChange={(e) => setFormData({ ...formData, available_at: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        O plano será ativado automaticamente nesta data
                      </p>
                    </div>

                    <div>
                      <Label>Lembrete (opcional)</Label>
                      <Input
                        type="number"
                        value={formData.reminder_days}
                        onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
                        placeholder="Ex: 3"
                        min="1"
                        max="30"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Receber lembrete X dias antes da ativação
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleBackToStep(2)}>
                        Voltar
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90"
                        onClick={handleCreateScheduled}
                        disabled={creating}
                      >
                        {creating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Agendando...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Agendar Plano
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          {userRole === 'professional' && !canUseMultiPlan && (
            <div className="text-right">
              <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Recurso PRO
              </Badge>
              <p className="text-xs text-gray-400 mt-1">Faça upgrade para agendar múltiplos planos</p>
            </div>
          )}
        </div>

        {/* Timeline de Planos */}
        <div className="space-y-3">
          {plans.length === 0 ? (
            <div className="text-center py-10 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200">
              <Calendar className="h-16 w-16 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-semibold text-gray-700 mb-1">Nenhum plano agendado ainda</p>
              <p className="text-sm text-gray-500 mb-4">
                {canUseMultiPlan 
                  ? 'Clique em "Programar Próximo Plano" para agendar planos futuros'
                  : 'Faça upgrade para PRO e agende múltiplos planos com antecedência'
                }
              </p>
              {canUseMultiPlan && (
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Dica: Programe planos para ativar automaticamente em datas futuras. Perfeito para ciclos de cutting/bulking!
                </p>
              )}
            </div>
          ) : (
            plans.map((plan, idx) => {
              const cfg = STATUS_CONFIG[plan.plan_status] || STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              const isScheduledAndReady = plan.plan_status === 'scheduled' && isDatePassed(plan.available_at);

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border-2 p-4 transition-all ${
                    plan.plan_status === 'active'
                      ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-violet-200 hover:shadow-md'
                  }`}
                >
                  {/* Linha conectora */}
                  {idx < plans.length - 1 && (
                    <div className="absolute left-8 top-full w-0.5 h-3 bg-gray-300" />
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 bg-gradient-to-br ${cfg.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-bold text-gray-900">{plan.name}</h4>
                          <Badge className={`${cfg.color} border-0 text-[10px] px-1.5 py-0`}>
                            {cfg.label}
                          </Badge>
                          {isScheduledAndReady && (
                            <Badge className="bg-red-100 text-red-700 border-0 text-[10px] animate-pulse">
                              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                              Pronto para ativar
                            </Badge>
                          )}
                        </div>

                        {plan.description && (
                          <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          {plan.available_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Disponível: {formatDate(plan.available_at)}
                            </span>
                          )}
                          {plan.activated_at && (
                            <span className="flex items-center gap-1">
                              <PlayCircle className="h-3 w-3" />
                              Ativado: {formatDate(plan.activated_at)}
                            </span>
                          )}
                          {plan.completed_at && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Concluído: {formatDate(plan.completed_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {userRole === 'professional' && (
                      <div className="flex gap-2 flex-shrink-0">
                        {plan.plan_status === 'scheduled' && (
                          <Button
                            size="sm"
                            onClick={() => handleActivate(plan.id)}
                            disabled={activating === plan.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {activating === plan.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <PlayCircle className="h-3 w-3 mr-1" />
                                Ativar
                              </>
                            )}
                          </Button>
                        )}
                        {plan.plan_status !== 'active' && plan.plan_status !== 'archived' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchive(plan.id)}
                            className="text-amber-700 border-amber-200 hover:bg-amber-50"
                          >
                            <Archive className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MealPlanTimeline;
