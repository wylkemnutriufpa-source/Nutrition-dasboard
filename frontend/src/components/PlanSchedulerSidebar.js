/**
 * PlanSchedulerSidebar.js - VERSÃO CORRIGIDA
 * Sidebar Dashboard + Drawer para Multi-Planos
 * - Bug de salvamento corrigido
 * - Renomeado para "IA Plan"
 * - Botão salvar refeição individual
 * - Modal de IA Plan Generator integrado (tela menor)
 * - Identifica contexto: Plano Principal vs Plan 1/2/3
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Plus, Calendar, PlayCircle, Clock, CheckCircle2, Archive, Edit, Trash2,
  FileText, Sparkles, ChevronRight, Loader2, Zap, Crown, AlertCircle,
  Copy, Eye, Bell, Settings, TrendingUp, Target, LayoutDashboard, Save,
  Utensils, ChevronDown, ChevronUp, Search, ChefHat, Wand2, ExternalLink, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  supabase, 
  getPatientAllMealPlans,
  canAccessFeature 
} from '@/lib/supabase';
import { mockFoods, mockMeals, householdMeasures } from '@/data/mockData';
import { calculateNutrition, calculateMealTotals } from '@/utils/nutritionCalculator';
import IAPlanGeneratorModal from '@/components/IAPlanGeneratorModal';
import PatientSmartDashboard from '@/components/PatientSmartDashboard';

// ============ CONSTANTES ============
const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700', icon: Clock, gradient: 'from-gray-400 to-gray-500' },
  scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-700', icon: Calendar, gradient: 'from-blue-500 to-indigo-600' },
  active: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700', icon: PlayCircle, gradient: 'from-emerald-500 to-teal-600' },
  completed: { label: 'Concluído', color: 'bg-purple-100 text-purple-700', icon: CheckCircle2, gradient: 'from-purple-500 to-violet-600' },
  archived: { label: 'Arquivado', color: 'bg-amber-100 text-amber-700', icon: Archive, gradient: 'from-amber-500 to-orange-600' }
};

// Constantes para critérios de avaliação
const REQUIREMENT_TYPES = [
  { value: 'weight_feedback_count', label: 'Feedbacks de Peso', unit: 'feedbacks' },
  { value: 'photo_feedback_count', label: 'Feedbacks com Foto', unit: 'fotos' },
  { value: 'weight_loss_kg', label: 'Perda de Peso', unit: 'kg' },
  { value: 'weight_gain_kg', label: 'Ganho de Peso', unit: 'kg' },
  { value: 'checklist_completion', label: 'Conclusão Checklist', unit: '%' }
];

const OPERATORS = [
  { value: '>=', label: '>= (maior ou igual)' },
  { value: '>', label: '> (maior que)' },
  { value: '<=', label: '<= (menor ou igual)' },
  { value: '<', label: '< (menor que)' },
  { value: '==', label: '== (igual a)' }
];

const FAIL_ACTIONS = [
  { value: 'maintain_plan', label: 'Manter plano atual' },
  { value: 'extend_cycle', label: 'Estender ciclo de avaliação' },
  { value: 'switch_to_alternate', label: 'Trocar para plano alternativo' }
];

// ============ FUNÇÃO DE SALVAR PLANO PROGRAMADO (DIRETO) ============
const saveScheduledPlan = async (planData) => {
  try {
    console.log('Salvando plano programado:', planData);
    
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        patient_id: planData.patient_id,
        professional_id: planData.professional_id,
        name: planData.name,
        description: planData.description || '',
        plan_data: planData.plan_data || { meals: [] },
        daily_targets: planData.daily_targets || {},
        plan_status: 'scheduled',
        available_at: planData.available_at,
        criteria_json: planData.criteria_json || {},
        is_multi_plan: true,
        is_active: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erro Supabase:', error);
      throw error;
    }
    
    console.log('Plano salvo com sucesso:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Erro ao salvar plano:', err);
    return { data: null, error: err };
  }
};

// ============ FUNÇÃO DE ATUALIZAR PLANO ============
const updatePlan = async (planId, updates) => {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

// ============ COMPONENTE: EDITOR DE REFEIÇÃO INDIVIDUAL ============
const MealEditor = ({ meal, allFoods, onSave, onSaveAsTemplate, onUpdate, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('unidade');
  const [saving, setSaving] = useState(false);
  const [localFoods, setLocalFoods] = useState(meal.foods || []);

  const mealTotals = calculateMealTotals(localFoods, allFoods);
  
  const filteredFoods = allFoods.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 30);

  const handleAddFood = () => {
    if (!selectedFood) return;
    
    const newFood = {
      id: `f${Date.now()}`,
      foodId: selectedFood.id,
      food_id: selectedFood.id,
      name: selectedFood.name,
      quantity,
      unit
    };
    
    const newFoods = [...localFoods, newFood];
    setLocalFoods(newFoods);
    onUpdate(meal.id, 'foods', newFoods);
    
    setIsAddingFood(false);
    setSearchTerm('');
    setSelectedFood(null);
    setQuantity(1);
  };

  const handleRemoveFood = (foodId) => {
    const newFoods = localFoods.filter(f => f.id !== foodId);
    setLocalFoods(newFoods);
    onUpdate(meal.id, 'foods', newFoods);
  };

  const handleUpdateFood = (foodId, field, value) => {
    const newFoods = localFoods.map(f => 
      f.id === foodId ? { ...f, [field]: value } : f
    );
    setLocalFoods(newFoods);
    onUpdate(meal.id, 'foods', newFoods);
  };

  const handleSaveMeal = async () => {
    setSaving(true);
    try {
      await onSave(meal.id, { ...meal, foods: localFoods });
      toast.success(`Refeição "${meal.name}" salva!`);
    } catch (err) {
      toast.error('Erro ao salvar refeição');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${meal.color || '#0F766E'}20` }}
          >
            <Utensils size={18} style={{ color: meal.color || '#0F766E' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Input
                value={meal.name}
                onChange={(e) => { e.stopPropagation(); onUpdate(meal.id, 'name', e.target.value); }}
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-gray-900 h-7 w-40 border-0 p-0 focus:ring-0"
              />
              <Badge variant="outline" className="text-[10px]">
                <Clock size={10} className="mr-1" />
                {meal.time}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              <span className="text-teal-600 font-bold">{mealTotals.kcal} kcal</span>
              {' • '}{localFoods.length} itens
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Botões de Ação */}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); handleSaveMeal(); }}
            disabled={saving}
            className="h-8 px-2 text-teal-600 hover:bg-teal-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span className="ml-1 text-xs">Salvar</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onSaveAsTemplate(meal); }}
            className="h-8 px-2 text-violet-600 hover:bg-violet-50"
          >
            <Copy size={14} />
            <span className="ml-1 text-xs">Modelo</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onRemove(meal.id); }}
            className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </Button>
          {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </div>

      {/* Conteúdo */}
      {isExpanded && (
        <div className="p-3 space-y-2 bg-gray-50/50">
          {/* Lista de Alimentos */}
          {localFoods.length > 0 ? (
            <div className="space-y-1">
              {localFoods.map((food) => {
                const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
                const nutrition = calculateNutrition(foodData, food.quantity, food.unit);
                
                return (
                  <div key={food.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{foodData?.name || food.name}</p>
                      <p className="text-[10px] text-teal-600 font-semibold">{nutrition.kcal} kcal</p>
                    </div>
                    <Input
                      type="number"
                      value={food.quantity}
                      onChange={(e) => handleUpdateFood(food.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-16 h-8 text-center text-sm"
                      min="0"
                    />
                    <Select value={food.unit || 'g'} onValueChange={(v) => handleUpdateFood(food.id, 'unit', v)}>
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {householdMeasures.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFood(food.id)}
                      className="h-8 w-8 p-0 text-red-400 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 bg-white rounded-lg border border-dashed">
              <p className="text-xs text-gray-400">Nenhum alimento</p>
            </div>
          )}

          {/* Observações */}
          <Textarea
            value={meal.observations || ''}
            onChange={(e) => onUpdate(meal.id, 'observations', e.target.value)}
            placeholder="Observações..."
            className="text-xs h-12 resize-none"
          />

          {/* Modal Adicionar Alimento */}
          <Dialog open={isAddingFood} onOpenChange={setIsAddingFood}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed text-teal-600">
                <Plus size={14} className="mr-1" /> Adicionar Alimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ChefHat className="text-teal-600" /> Adicionar Alimento
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2 text-gray-400" size={16} />
                  <Input
                    placeholder="Buscar alimento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  {filteredFoods.map(food => (
                    <div
                      key={food.id}
                      onClick={() => {
                        setSelectedFood(food);
                        setUnit(food.unidade === 'unidade' ? 'unidade' : 'g');
                        setQuantity(food.unidade === 'unidade' ? 1 : 100);
                      }}
                      className={`p-2 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                        selectedFood?.id === food.id ? 'bg-teal-50 border-l-2 border-l-teal-500' : ''
                      }`}
                    >
                      <p className="text-sm font-medium">{food.name}</p>
                      <p className="text-[10px] text-gray-500">{food.calorias} kcal/{food.porcao}{food.unidade}</p>
                    </div>
                  ))}
                </div>

                {selectedFood && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Unidade</Label>
                      <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {householdMeasures.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                <Button onClick={handleAddFood} className="w-full bg-teal-600" disabled={!selectedFood}>
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

// ============ COMPONENTE: ITEM DE PLANO ============
const PlanItem = ({ plan, index, isActive, onEdit, onActivate, onRemove }) => {
  const cfg = STATUS_CONFIG[plan.plan_status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  
  return (
    <div className={`
      relative p-3 rounded-xl border-2 transition-all cursor-pointer group
      ${isActive 
        ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md' 
        : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-sm'
      }
    `}>
      <div className={`
        absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm
        ${isActive ? 'bg-emerald-500 text-white' : 'bg-violet-500 text-white'}
      `}>
        {index + 1}
      </div>
      
      <div className="flex items-start gap-3 ml-2">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon size={14} className="text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 text-sm truncate">{plan.name}</h4>
            <Badge className={`${cfg.color} text-[9px] px-1.5 py-0`}>{cfg.label}</Badge>
          </div>
          
          {plan.available_at && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              <Calendar size={10} className="inline mr-1" />
              {new Date(plan.available_at).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>
      
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onEdit(plan); }}>
          <Edit size={12} />
        </Button>
        {plan.plan_status === 'scheduled' && (
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-600" onClick={(e) => { e.stopPropagation(); onActivate(plan); }}>
            <PlayCircle size={12} />
          </Button>
        )}
        {plan.plan_status !== 'active' && (
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={(e) => { e.stopPropagation(); onRemove(plan); }}>
            <Trash2 size={12} />
          </Button>
        )}
      </div>
    </div>
  );
};

// ============ COMPONENTE PRINCIPAL ============
const PlanSchedulerSidebar = ({ 
  patientId, 
  professionalId, 
  currentPlan,
  onPlanChange,
  onEditPlan 
}) => {
  const navigate = useNavigate();
  const [allPlans, setAllPlans] = useState([]);
  const [intelligentPlans, setIntelligentPlans] = useState([]); // Renomeado de prePlans
  const [loading, setLoading] = useState(true);
  const [allFoods] = useState([...mockFoods]);
  
  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create');
  const [drawerStep, setDrawerStep] = useState('source');
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingIndex, setEditingIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // IA Plan Generator Modal (tela menor)
  const [iaModalOpen, setIaModalOpen] = useState(false);
  const [iaModalContext, setIaModalContext] = useState('main'); // 'main' | 'scheduled-X'
  const [iaModalIndex, setIaModalIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    available_at: '',
    deactivate_at: '',
    plan_data: { meals: [] },
    keep_old_active: false,
    reminder_days: '',
    // Critérios de avaliação
    criteria: {
      evaluation_window_days: 15,
      requirements: [],
      on_success: { action: 'activate_plan', plan_id: '' },
      on_fail: { action: 'extend_cycle', days: 15 }
    }
  });

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const { data: plans } = await getPatientAllMealPlans(patientId);
      setAllPlans(plans || []);
      
      // Carregar Planos Inteligentes (templates + drafts)
      const templates = [];
      
      if (professionalId) {
        const { data: profTemplates } = await supabase
          .from('professional_templates')
          .select('*')
          .eq('professional_id', professionalId)
          .eq('type', 'meal_plan')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (profTemplates) {
          templates.push(...profTemplates.map(t => ({
            id: t.id,
            name: t.title,
            plan_data: t.content?.plan_data || { meals: [] },
            source: 'template',
            source_label: 'Template'
          })));
        }
      }
      
      const { data: drafts } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('plan_status', 'draft')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (drafts) {
        templates.push(...drafts.map(d => ({
          id: d.id,
          name: d.name,
          plan_data: d.plan_data || { meals: [] },
          source: 'draft',
          source_label: 'Rascunho'
        })));
      }
      
      setIntelligentPlans(templates);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, professionalId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Separar planos
  const activePlan = allPlans.find(p => p.plan_status === 'active');
  const scheduledPlans = allPlans.filter(p => p.plan_status === 'scheduled').sort((a, b) => 
    new Date(a.available_at) - new Date(b.available_at)
  );

  // Handlers
  const handleOpenDrawer = (mode = 'create', plan = null, index = 0) => {
    setDrawerMode(mode);
    setDrawerStep('source');
    setEditingPlan(plan);
    setEditingIndex(mode === 'create' ? scheduledPlans.length : index);
    
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || '',
        available_at: plan.available_at ? plan.available_at.split('T')[0] : '',
        deactivate_at: plan.criteria_json?.deactivate_at || '',
        plan_data: plan.plan_data || { meals: [] },
        keep_old_active: plan.criteria_json?.keep_old_active || false,
        reminder_days: plan.criteria_json?.reminder_days || ''
      });
      setDrawerStep('editor'); // Pula para editor quando editando
    } else {
      const defaultMeals = [
        { id: `m${Date.now()}-1`, name: 'Café da Manhã', time: '07:00', color: '#F97316', foods: [], observations: '' },
        { id: `m${Date.now()}-2`, name: 'Almoço', time: '12:00', color: '#22C55E', foods: [], observations: '' },
        { id: `m${Date.now()}-3`, name: 'Jantar', time: '19:00', color: '#6366F1', foods: [], observations: '' }
      ];
      setFormData({
        name: `IA Plan ${scheduledPlans.length + 1}`,
        description: '',
        available_at: '',
        deactivate_at: '',
        plan_data: { meals: defaultMeals },
        keep_old_active: false,
        reminder_days: '',
        criteria: {
          evaluation_window_days: 15,
          requirements: [],
          on_success: { action: 'activate_plan', plan_id: '' },
          on_fail: { action: 'extend_cycle', days: 15 }
        }
      });
    }
    
    setDrawerOpen(true);
  };

  const handleSelectIntelligentPlan = (plan) => {
    setFormData({
      ...formData,
      name: `${plan.name} (Programado)`,
      plan_data: plan.plan_data || { meals: [] }
    });
    setDrawerStep('editor');
  };

  const handleCreateFromScratch = () => {
    const defaultMeals = [
      { id: `m${Date.now()}-1`, name: 'Café da Manhã', time: '07:00', color: '#F97316', foods: [], observations: '' },
      { id: `m${Date.now()}-2`, name: 'Almoço', time: '12:00', color: '#22C55E', foods: [], observations: '' },
      { id: `m${Date.now()}-3`, name: 'Jantar', time: '19:00', color: '#6366F1', foods: [], observations: '' }
    ];
    setFormData({
      ...formData,
      plan_data: { meals: defaultMeals }
    });
    setDrawerStep('editor');
  };

  const handleGoToGenerator = () => {
    // Abrir modal de IA Plan Generator em tela menor
    // Identifica o contexto: está criando plano programado (scheduled) ou principal (main)
    const context = drawerMode === 'create' ? `scheduled-${editingIndex}` : `scheduled-${editingIndex}`;
    setIaModalContext(context);
    setIaModalIndex(editingIndex);
    setIaModalOpen(true);
    // Não fecha o drawer para manter contexto
  };

  // Callback quando IA Plan é gerado no modal
  const handleIAPlanGenerated = (planData) => {
    // SUBSTITUIR o plano atual completamente (não adicionar em cima)
    setFormData({
      ...formData,
      name: planData.name || formData.name,
      description: planData.description || formData.description,
      plan_data: {
        meals: planData.plan_data?.meals || [] // SUBSTITUIR meals ao invés de concatenar
      }
    });
    setDrawerStep('editor'); // Vai para o editor com os dados preenchidos
    toast.success('IA Plan aplicado! Plano anterior foi substituído.');
  };

  const updateMeal = (mealId, field, value) => {
    const newMeals = formData.plan_data.meals.map(m => 
      m.id === mealId ? { ...m, [field]: value } : m
    );
    setFormData({ ...formData, plan_data: { meals: newMeals } });
  };

  const addMeal = () => {
    const newMeal = {
      id: `m${Date.now()}`,
      name: `Refeição ${formData.plan_data.meals.length + 1}`,
      time: '12:00',
      color: '#0F766E',
      foods: [],
      observations: ''
    };
    setFormData({
      ...formData,
      plan_data: { meals: [...formData.plan_data.meals, newMeal] }
    });
  };

  const removeMeal = (mealId) => {
    if (formData.plan_data.meals.length <= 1) {
      toast.error('Mínimo 1 refeição');
      return;
    }
    setFormData({
      ...formData,
      plan_data: { meals: formData.plan_data.meals.filter(m => m.id !== mealId) }
    });
  };

  const saveMealIndividually = async (mealId, mealData) => {
    // Salva a refeição no estado local
    updateMeal(mealId, 'foods', mealData.foods);
    updateMeal(mealId, 'observations', mealData.observations);
  };

  const saveMealAsTemplate = async (meal) => {
    try {
      const { error } = await supabase.from('professional_templates').insert({
        professional_id: professionalId,
        title: `Modelo: ${meal.name}`,
        type: 'meal',
        content: { meal },
        is_active: true
      });
      
      if (error) throw error;
      toast.success(`Refeição salva como modelo!`);
    } catch (err) {
      toast.error('Erro ao salvar modelo');
    }
  };

  const handleContinueToSchedule = () => {
    if (!formData.name.trim()) {
      toast.error('Preencha o nome do plano');
      return;
    }
    if (!formData.plan_data?.meals?.length) {
      toast.error('Adicione pelo menos uma refeição');
      return;
    }
    setDrawerStep('schedule');
  };

  const handleSavePlan = async () => {
    if (!formData.name.trim()) {
      toast.error('Preencha o nome do plano');
      return;
    }
    if (!formData.available_at) {
      toast.error('Selecione a data de ativação');
      return;
    }

    setSaving(true);
    try {
      let result;
      
      if (drawerMode === 'edit' && editingPlan) {
        const { data, error } = await updatePlan(editingPlan.id, {
          name: formData.name,
          description: formData.description,
          available_at: new Date(formData.available_at).toISOString(),
          plan_data: formData.plan_data,
          criteria_json: {
            deactivate_at: formData.deactivate_at || null,
            keep_old_active: formData.keep_old_active,
            reminder_days: formData.reminder_days ? parseInt(formData.reminder_days) : null,
            // Critérios de avaliação
            evaluation_window_days: formData.criteria.evaluation_window_days,
            requirements: formData.criteria.requirements,
            on_success: formData.criteria.on_success,
            on_fail: formData.criteria.on_fail
          }
        });
        
        if (error) throw error;
        result = data;
        toast.success(`✅ Plano ${editingIndex + 1} atualizado!`);
      } else {
        const { data, error } = await saveScheduledPlan({
          patient_id: patientId,
          professional_id: professionalId,
          name: formData.name,
          description: formData.description,
          available_at: new Date(formData.available_at).toISOString(),
          plan_data: formData.plan_data,
          daily_targets: {},
          criteria_json: {
            deactivate_at: formData.deactivate_at || null,
            keep_old_active: formData.keep_old_active,
            reminder_days: formData.reminder_days ? parseInt(formData.reminder_days) : null,
            // Critérios de avaliação
            evaluation_window_days: formData.criteria.evaluation_window_days,
            requirements: formData.criteria.requirements,
            on_success: formData.criteria.on_success,
            on_fail: formData.criteria.on_fail
          }
        });
        
        if (error) {
          console.error('Erro detalhado:', error);
          throw error;
        }
        
        result = data;
        toast.success(`🎉 Plano ${scheduledPlans.length + 1} programado com sucesso!`);
      }
      
      // Atualizar UI
      await loadData();
      setDrawerOpen(false);
      if (onPlanChange) onPlanChange();
      
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error(`Erro: ${err.message || 'Tente novamente'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleActivatePlan = async (plan) => {
    if (!window.confirm(`Ativar "${plan.name}" agora?`)) return;
    
    try {
      if (activePlan) {
        await updatePlan(activePlan.id, { plan_status: 'completed', completed_at: new Date().toISOString() });
      }
      
      await updatePlan(plan.id, { 
        plan_status: 'active', 
        activated_at: new Date().toISOString(),
        is_active: true 
      });
      
      toast.success('Plano ativado!');
      loadData();
    } catch (err) {
      toast.error('Erro ao ativar');
    }
  };

  const handleRemovePlan = async (plan) => {
    if (!window.confirm(`Remover "${plan.name}"?`)) return;
    
    try {
      await updatePlan(plan.id, { plan_status: 'archived' });
      toast.success('Plano removido');
      loadData();
    } catch (err) {
      toast.error('Erro ao remover');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <>
      {/* ========== SIDEBAR ========== */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Central de Planos</h3>
            <p className="text-xs text-gray-500">Gerencie IA Plans</p>
          </div>
        </div>

        {/* Plano Atual */}
        {activePlan && (
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Plano Atual</h4>
            <div 
              className="p-3 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onEditPlan?.(activePlan)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow">
                  <PlayCircle size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-emerald-900">{activePlan.name}</h4>
                  <p className="text-xs text-emerald-700">{activePlan.plan_data?.meals?.length || 0} refeições</p>
                </div>
                <ChevronRight size={18} className="text-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {/* Planos Programados */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase">Planos Programados</h4>
            <Badge className="bg-violet-100 text-violet-700 text-[9px]">{scheduledPlans.length}</Badge>
          </div>
          
          <div className="space-y-2">
            {scheduledPlans.map((plan, idx) => (
              <PlanItem
                key={plan.id}
                plan={plan}
                index={idx}
                isActive={false}
                onEdit={(p) => handleOpenDrawer('edit', p, idx)}
                onActivate={handleActivatePlan}
                onRemove={handleRemovePlan}
              />
            ))}
            
            {scheduledPlans.length === 0 && (
              <div className="p-3 rounded-lg border border-dashed border-gray-200 text-center">
                <p className="text-xs text-gray-400">Nenhum plano agendado</p>
              </div>
            )}
          </div>
          
          <Button
            onClick={() => handleOpenDrawer('create')}
            className="w-full mt-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 shadow"
          >
            <Plus size={16} className="mr-2" />
            Programar IA Plan
          </Button>
        </div>

        {/* IA Plans */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase">🤖 IA Plans</h4>
            <Badge className="bg-amber-100 text-amber-700 text-[9px]">{intelligentPlans.length}</Badge>
          </div>
          
          {intelligentPlans.length > 0 ? (
            <div className="space-y-1">
              {intelligentPlans.slice(0, 3).map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => { handleOpenDrawer('create'); setTimeout(() => handleSelectIntelligentPlan(plan), 100); }}
                  className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="text-sm font-medium text-gray-700 truncate">{plan.name}</span>
                    <ChevronRight size={14} className="text-gray-300 ml-auto" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-dashed border-gray-200 text-center">
              <p className="text-xs text-gray-400">Nenhum IA Plan</p>
            </div>
          )}
        </div>
      </div>

      {/* ========== DRAWER GRANDE ========== */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:w-[70%] sm:max-w-2xl p-0 flex flex-col">
          
          {/* Header */}
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-violet-600 to-purple-600">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-white">{editingIndex + 1}</span>
              </div>
              <div className="text-white">
                <SheetTitle className="text-white text-lg">
                  {drawerMode === 'edit' ? 'Editar' : 'Novo'} IA Plan {editingIndex + 1}
                </SheetTitle>
                <SheetDescription className="text-violet-100 text-sm">
                  {drawerStep === 'source' && 'Escolha como criar'}
                  {drawerStep === 'editor' && 'Configure as refeições'}
                  {drawerStep === 'schedule' && 'Defina quando ativar'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            
            {/* Dashboard do Paciente (sempre visível no drawer) */}
            <div className="mb-4">
              <PatientSmartDashboard patientId={patientId} compact={true} />
            </div>
            
            {/* STEP 1: FONTE */}
            {drawerStep === 'source' && (
              <div className="space-y-3">
                <button
                  onClick={handleCreateFromScratch}
                  className="w-full text-left p-4 border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl hover:border-emerald-400 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow">
                      <Plus size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">Criar do Zero</p>
                      <p className="text-sm text-gray-600">Plano em branco</p>
                    </div>
                    <ChevronRight className="text-emerald-500" />
                  </div>
                </button>

                <button
                  onClick={handleGoToGenerator}
                  className="w-full text-left p-4 border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl hover:border-violet-400 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
                      <Brain size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">🤖 Gerar com IA</p>
                      <p className="text-sm text-gray-600">IA Plan Generator (Modal)</p>
                      <Badge className="bg-violet-100 text-violet-700 text-[9px] mt-1">
                        Plan {editingIndex + 1}
                      </Badge>
                    </div>
                    <Wand2 className="text-violet-500" />
                  </div>
                </button>

                {intelligentPlans.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 py-2">
                      <div className="h-px bg-gray-200 flex-1" />
                      <span className="text-xs text-gray-500 uppercase font-semibold">ou usar existente</span>
                      <div className="h-px bg-gray-200 flex-1" />
                    </div>

                    {intelligentPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => handleSelectIntelligentPlan(plan)}
                        className="w-full text-left p-3 border-2 border-gray-200 rounded-xl hover:border-violet-400 hover:bg-violet-50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Sparkles size={18} className="text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{plan.name}</p>
                            <p className="text-xs text-gray-500">{plan.source_label} • {plan.plan_data?.meals?.length || 0} refeições</p>
                          </div>
                          <ChevronRight className="text-gray-300" />
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* STEP 2: EDITOR */}
            {drawerStep === 'editor' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Nome do Plano *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Descrição</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Objetivo..."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold flex items-center gap-2 mb-3">
                    <Utensils size={16} className="text-teal-600" />
                    Refeições
                  </Label>
                  
                  <div className="space-y-3">
                    {formData.plan_data.meals.map((meal) => (
                      <MealEditor
                        key={meal.id}
                        meal={meal}
                        allFoods={allFoods}
                        onSave={saveMealIndividually}
                        onSaveAsTemplate={saveMealAsTemplate}
                        onUpdate={updateMeal}
                        onRemove={removeMeal}
                      />
                    ))}
                    
                    <Button onClick={addMeal} variant="outline" className="w-full border-dashed">
                      <Plus size={14} className="mr-2" /> Adicionar Refeição
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setDrawerStep('source')}>
                    ← Voltar
                  </Button>
                  <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={handleContinueToSchedule}>
                    Continuar →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: AGENDAMENTO */}
            {drawerStep === 'schedule' && (
              <div className="space-y-4">
                <div className="p-4 bg-violet-50 rounded-xl border border-violet-200">
                  <p className="font-bold text-violet-900">{formData.name}</p>
                  <p className="text-sm text-violet-700">{formData.plan_data?.meals?.length || 0} refeições</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm flex items-center gap-1">
                      <PlayCircle size={14} className="text-emerald-500" /> Data Ativar *
                    </Label>
                    <Input
                      type="date"
                      value={formData.available_at}
                      onChange={(e) => setFormData({ ...formData, available_at: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm flex items-center gap-1">
                      <Archive size={14} className="text-amber-500" /> Data Término
                    </Label>
                    <Input
                      type="date"
                      value={formData.deactivate_at}
                      onChange={(e) => setFormData({ ...formData, deactivate_at: e.target.value })}
                      min={formData.available_at}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm flex items-center gap-1">
                    <Bell size={14} className="text-blue-500" /> Lembrete (dias antes)
                  </Label>
                  <Input
                    type="number"
                    value={formData.reminder_days}
                    onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
                    placeholder="Ex: 3"
                    className="mt-1"
                  />
                </div>

                {/* CONFIGURAÇÃO AVANÇADA - CRITÉRIOS DE AVALIAÇÃO */}
                <div className="border-2 border-emerald-200 rounded-2xl p-4 bg-emerald-50/50 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                    <span className="font-bold text-emerald-900">Configuração Avançada</span>
                  </div>

                  {/* Período de Avaliação */}
                  <div>
                    <Label className="text-emerald-800 text-sm">Período de Avaliação (dias)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.criteria.evaluation_window_days}
                      onChange={(e) => setFormData({
                        ...formData,
                        criteria: { ...formData.criteria, evaluation_window_days: parseInt(e.target.value) || 15 }
                      })}
                      className="border-emerald-200 mt-1"
                    />
                    <p className="text-xs text-emerald-600 mt-1">Janela de tempo para avaliar os critérios</p>
                  </div>

                  {/* Requisitos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-emerald-800 text-sm">Requisitos (Exigências)</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setFormData({
                          ...formData,
                          criteria: {
                            ...formData.criteria,
                            requirements: [...formData.criteria.requirements, { type: 'weight_feedback_count', operator: '>=', value: 2 }]
                          }
                        })}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                    
                    {formData.criteria.requirements.length === 0 && (
                      <p className="text-sm text-gray-400 italic">Nenhum requisito configurado. Adicione ao menos um.</p>
                    )}

                    <div className="space-y-2">
                      {formData.criteria.requirements.map((req, i) => (
                        <div key={i} className="flex gap-2 items-center bg-white rounded-xl p-3 border border-emerald-100">
                          <Select 
                            value={req.type} 
                            onValueChange={(v) => {
                              const updated = [...formData.criteria.requirements];
                              updated[i] = { ...updated[i], type: v };
                              setFormData({ ...formData, criteria: { ...formData.criteria, requirements: updated } });
                            }}
                          >
                            <SelectTrigger className="flex-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {REQUIREMENT_TYPES.map(rt => (
                                <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={req.operator} 
                            onValueChange={(v) => {
                              const updated = [...formData.criteria.requirements];
                              updated[i] = { ...updated[i], operator: v };
                              setFormData({ ...formData, criteria: { ...formData.criteria, requirements: updated } });
                            }}
                          >
                            <SelectTrigger className="w-24 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {OPERATORS.map(op => (
                                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            className="w-16 text-xs"
                            value={req.value}
                            onChange={(e) => {
                              const updated = [...formData.criteria.requirements];
                              updated[i] = { ...updated[i], value: Number(e.target.value) || 0 };
                              setFormData({ ...formData, criteria: { ...formData.criteria, requirements: updated } });
                            }}
                          />
                          <span className="text-[10px] text-gray-400 w-12">
                            {REQUIREMENT_TYPES.find(r => r.value === req.type)?.unit || ''}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => {
                              const updated = formData.criteria.requirements.filter((_, idx) => idx !== i);
                              setFormData({ ...formData, criteria: { ...formData.criteria, requirements: updated } });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ações de Sucesso/Falha */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-emerald-800 text-xs">Se META atingida</Label>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2 text-green-700 text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Sucesso
                        </div>
                        <Input
                          placeholder="UUID do plano a ativar"
                          value={formData.criteria.on_success?.plan_id || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            criteria: {
                              ...formData.criteria,
                              on_success: { action: 'activate_plan', plan_id: e.target.value }
                            }
                          })}
                          className="text-xs border-green-200"
                        />
                        <p className="text-[10px] text-green-600">Cole o ID do plano alimentar</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-emerald-800 text-xs">Se META NÃO atingida</Label>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 text-xs font-medium">
                          <AlertCircle className="h-4 w-4" /> Falha
                        </div>
                        <Select 
                          value={formData.criteria.on_fail?.action || 'extend_cycle'} 
                          onValueChange={(v) => setFormData({
                            ...formData,
                            criteria: {
                              ...formData.criteria,
                              on_fail: { ...formData.criteria.on_fail, action: v }
                            }
                          })}
                        >
                          <SelectTrigger className="text-xs border-amber-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FAIL_ACTIONS.map(fa => (
                              <SelectItem key={fa.value} value={fa.value}>{fa.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.criteria.on_fail?.action === 'extend_cycle' && (
                          <Input
                            type="number"
                            min="1"
                            placeholder="Dias para estender"
                            value={formData.criteria.on_fail?.days || 15}
                            onChange={(e) => setFormData({
                              ...formData,
                              criteria: {
                                ...formData.criteria,
                                on_fail: { ...formData.criteria.on_fail, days: parseInt(e.target.value) || 15 }
                              }
                            })}
                            className="text-xs border-amber-200"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Manter plano atual ativo</p>
                    <p className="text-xs text-gray-500">O plano atual continua após ativação</p>
                  </div>
                  <Switch
                    checked={formData.keep_old_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, keep_old_active: checked })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setDrawerStep('editor')}>
                    ← Voltar
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600"
                    onClick={handleSavePlan}
                    disabled={saving}
                  >
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : <><Zap className="h-4 w-4 mr-2" /> Programar</>}
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      {/* Modal de IA Plan Generator (Tela Menor) */}
      <IAPlanGeneratorModal
        open={iaModalOpen}
        onOpenChange={setIaModalOpen}
        patientId={patientId}
        professionalId={professionalId}
        planContext={iaModalContext}
        planIndex={iaModalIndex}
        onPlanGenerated={handleIAPlanGenerated}
      />
    </>
  );
};

export default PlanSchedulerSidebar;
