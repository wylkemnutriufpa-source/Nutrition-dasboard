/**
 * MealPlanEditor.js - DASHBOARD INTELIGENTE
 * Layout estilo Central de Recursos Premium
 * - Header com gradiente
 * - Cards de Ações Rápidas coloridos
 * - Métricas do plano
 * - Sidebar Central de Planos
 * - Dashboard Inteligente do Paciente
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, GripVertical, Trash2, Copy, Search, Save, Loader2, User, 
  Clock, FileText, Calendar, Target, Scale, Activity, TrendingUp, Zap,
  ChevronDown, ChevronUp, Utensils, Settings, Eye, AlertCircle,
  CheckCircle2, PlayCircle, Archive, ChefHat, Sparkles, BarChart3,
  RefreshCw, MessageSquare, ClipboardList, LineChart, BookMarked
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { mockMeals, householdMeasures, mockFoods, resolveDraftFoods } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getProfessionalPatients, 
  getPatientById, 
  getMealPlan, 
  getPatientMealPlan,
  createMealPlan, 
  updateMealPlan,
  getCustomFoods,
  getDraftMealPlan,
  getAnamnesis,
  getPatientAllMealPlans,
  supabase
} from '@/lib/supabase';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { calculateNutrition, calculateMealTotals, calculateDayTotals, getNutritionLabel } from '@/utils/nutritionCalculator';
import PlanSchedulerSidebar from '@/components/PlanSchedulerSidebar';
import { MealTemplatesPanel, SaveTemplateDialog } from '@/components/MealTemplatesPanel';
import { createMealTemplate } from '@/lib/supabase';
import PatientSmartDashboard from '@/components/PatientSmartDashboard';
import EnergyCalculatorModal from '@/components/EnergyCalculatorModal';

// ============ COMPONENTE: ITEM DE ALIMENTO ============
const FoodItemRow = ({ food, allFoods, onUpdate, onRemove }) => {
  const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
  const displayName = food.customName || foodData?.name || food.name || 'Alimento';
  const nutrition = calculateNutrition(foodData, food.quantity, food.unit || 'g');

  return (
    <div className="group bg-white rounded-lg border border-gray-100 hover:border-teal-200 transition-all p-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{displayName}</p>
          <p className="text-[10px] text-gray-400">{getNutritionLabel(foodData)}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={food.quantity}
            onChange={(e) => onUpdate(food.id, 'quantity', parseFloat(e.target.value) || 0)}
            className="w-20 h-8 text-center font-medium"
            min="0"
          />
          <Select value={food.unit || 'g'} onValueChange={(v) => onUpdate(food.id, 'unit', v)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {householdMeasures.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-3 text-xs min-w-[150px]">
          <div className="text-center">
            <p className="font-bold text-teal-700">{nutrition.kcal}</p>
            <p className="text-[9px] text-gray-400">kcal</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-blue-600">{nutrition.protein}g</p>
            <p className="text-[9px] text-gray-400">PTN</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-amber-600">{nutrition.carbs}g</p>
            <p className="text-[9px] text-gray-400">CHO</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-rose-600">{nutrition.fat}g</p>
            <p className="text-[9px] text-gray-400">LIP</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(food.id)}
          className="h-8 w-8 p-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
};

// ============ COMPONENTE: SEÇÃO DE REFEIÇÃO ============
const MealSection = ({ meal, allFoods, onAddFood, onRemoveFood, onUpdateFood, onDuplicateMeal, onUpdateMeal, onRemoveMeal, onSaveMealAsTemplate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('unidade');

  const mealTotals = calculateMealTotals(meal.foods || [], allFoods);
  const filteredFoods = allFoods.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 30);
  const selectedFood = allFoods.find(f => f.id === selectedFoodId);
  const previewNutrition = selectedFood ? calculateNutrition(selectedFood, quantity, unit) : null;

  const handleAddFood = () => {
    if (selectedFoodId) {
      onAddFood(meal.id, {
        id: `f${Date.now()}`,
        foodId: selectedFoodId,
        food_id: selectedFoodId,
        name: selectedFood?.name || '',
        quantity,
        unit
      });
      setIsAddingFood(false);
      setSearchTerm('');
      setSelectedFoodId(null);
    }
  };

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: meal.color || '#0F766E' }}>
      <div 
        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${meal.color || '#0F766E'}15` }}>
            <Utensils size={18} style={{ color: meal.color || '#0F766E' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-gray-900">{meal.name}</h4>
              <Badge variant="outline" className="text-[10px]"><Clock size={10} className="mr-1" />{meal.time}</Badge>
            </div>
            <p className="text-xs text-gray-500">
              <span className="text-teal-600 font-bold">{mealTotals.kcal} kcal</span> • {meal.foods?.length || 0} itens
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSaveMealAsTemplate?.(meal); }} className="h-8 px-2 text-amber-600 hover:bg-amber-50" title="Salvar como Modelo">
            <BookMarked size={14} />
            <span className="ml-1 text-xs hidden sm:inline">Modelo</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDuplicateMeal(meal.id); }} className="h-8 w-8 p-0 text-gray-400">
            <Copy size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onRemoveMeal(meal.id); }} className="h-8 w-8 p-0 text-gray-400 hover:text-red-500">
            <Trash2 size={14} />
          </Button>
          {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </div>

      {isExpanded && (
        <CardContent className="p-4 space-y-3 bg-gray-50/30">
          {meal.foods?.length > 0 ? (
            <div className="space-y-2">
              {meal.foods.map((food) => (
                <FoodItemRow key={food.id} food={food} allFoods={allFoods} onUpdate={onUpdateFood} onRemove={onRemoveFood} />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-white rounded-lg border-2 border-dashed">
              <Utensils className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Nenhum alimento</p>
            </div>
          )}

          <Textarea
            value={meal.observations || ''}
            onChange={(e) => onUpdateMeal(meal.id, 'observations', e.target.value)}
            placeholder="Observações: substituições, dicas..."
            className="text-sm h-16 resize-none"
          />

          <Dialog open={isAddingFood} onOpenChange={setIsAddingFood}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed border-2 text-teal-600">
                <Plus size={16} className="mr-2" /> Adicionar Alimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ChefHat className="text-teal-600" /> Adicionar Alimento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                  <Input placeholder="Buscar alimento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {filteredFoods.map((food) => (
                    <div key={food.id} onClick={() => { setSelectedFoodId(food.id); setUnit(food.unidade === 'unidade' ? 'unidade' : 'g'); setQuantity(food.unidade === 'unidade' ? 1 : 100); }}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${selectedFoodId === food.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''}`}>
                      <p className="font-medium">{food.name}</p>
                      <p className="text-xs text-gray-500">{food.calorias} kcal / {food.porcao}{food.unidade}</p>
                    </div>
                  ))}
                </div>
                {selectedFood && (
                  <div className="bg-teal-50 rounded-lg p-4 space-y-3 border border-teal-200">
                    <p className="font-semibold text-teal-800">{selectedFood.name}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Quantidade</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} className="h-10" /></div>
                      <div><Label className="text-xs">Unidade</Label>
                        <Select value={unit} onValueChange={setUnit}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>{householdMeasures.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    {previewNutrition && (
                      <div className="bg-white rounded-lg p-3 grid grid-cols-4 gap-2 text-center">
                        <div><p className="text-lg font-bold text-teal-700">{previewNutrition.kcal}</p><p className="text-[10px]">kcal</p></div>
                        <div><p className="text-lg font-bold text-blue-600">{previewNutrition.protein}g</p><p className="text-[10px]">PTN</p></div>
                        <div><p className="text-lg font-bold text-amber-600">{previewNutrition.carbs}g</p><p className="text-[10px]">CHO</p></div>
                        <div><p className="text-lg font-bold text-rose-600">{previewNutrition.fat}g</p><p className="text-[10px]">LIP</p></div>
                      </div>
                    )}
                  </div>
                )}
                <Button onClick={handleAddFood} className="w-full bg-teal-600" disabled={!selectedFoodId}>Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
};

// ============ COMPONENTE PRINCIPAL ============
const MealPlanEditor = ({ userType = 'professional' }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const patientIdParam = searchParams.get('patient');
  const planIdParam = searchParams.get('plan');
  const fromDraftParam = searchParams.get('fromDraft') === 'true';
  const isPatientView = userType === 'patient';

  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planName, setPlanName] = useState('Plano Alimentar');
  const [planNotes, setPlanNotes] = useState('');
  const [allFoods, setAllFoods] = useState([...mockFoods]);
  const [isSelectingPatient, setIsSelectingPatient] = useState(false);
  const [patientAnamnesis, setPatientAnamnesis] = useState(null);
  const [scheduledPlans, setScheduledPlans] = useState([]);
  const [meals, setMeals] = useState([
    { ...mockMeals[0], foods: [] },
    { ...mockMeals[2], foods: [] },
    { ...mockMeals[4], foods: [] }
  ]);
  
  // Estado para salvar template
  const [saveTemplateDialog, setSaveTemplateDialog] = useState(false);
  const [mealToSaveAsTemplate, setMealToSaveAsTemplate] = useState(null);
  // Estado para calculadora energetica
  const [showEnergyCalculator, setShowEnergyCalculator] = useState(false);

  // Carregar dados
  const loadInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (!isPatientView) {
        const { data: patientsData } = await getProfessionalPatients(user.id);
        setPatients((patientsData || []).map(item => ({ id: item.patient.id, name: item.patient.name, email: item.patient.email, ...item.patient })));
      }
      const { data: customFoods } = await getCustomFoods(user.id);
      if (customFoods) setAllFoods([...mockFoods, ...customFoods]);

      if (patientIdParam) {
        const { data: patientData } = await getPatientById(patientIdParam);
        if (patientData) {
          setSelectedPatient(patientData);
          const { data: anamnesisData } = await getAnamnesis(patientIdParam);
          setPatientAnamnesis(anamnesisData);
          const { data: allPlans } = await getPatientAllMealPlans(patientIdParam);
          setScheduledPlans(allPlans?.filter(p => p.plan_status === 'scheduled') || []);
        }
        if (planIdParam && !fromDraftParam) {
          const { data: planData } = await getMealPlan(planIdParam);
          if (planData) {
            setCurrentPlan(planData);
            setPlanName(planData.name);
            setPlanNotes(planData.description || '');
            if (planData.plan_data?.meals) setMeals(planData.plan_data.meals);
          }
        }
      }
      if (fromDraftParam) {
        const draftData = sessionStorage.getItem('draftPlanToLoad');
        if (draftData) {
          try {
            const draft = JSON.parse(draftData);
            if (draft.meals?.length > 0) {
              setMeals(draft.meals.map((meal, index) => ({
                id: meal.id || `meal-${Date.now()}-${index}`,
                name: meal.name || `Refeição ${index + 1}`,
                time: meal.time || '08:00',
                color: meal.color || '#0F766E',
                foods: resolveDraftFoods(meal.foods || [], allFoods)
              })));
              setPlanName(draft.planName || 'Plano Inteligente');
              toast.success('Plano carregado!');
            }
            sessionStorage.removeItem('draftPlanToLoad');
          } catch (err) { console.error('Error:', err); }
        }
      }
      if (isPatientView) {
        const { data: patientPlanData } = await getPatientMealPlan(user.id);
        if (patientPlanData) {
          setCurrentPlan(patientPlanData);
          setPlanName(patientPlanData.name);
          if (patientPlanData.plan_data?.meals) setMeals(patientPlanData.plan_data.meals);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user, isPatientView, patientIdParam, planIdParam, fromDraftParam]);

  useEffect(() => { loadInitialData(); }, [user?.id, patientIdParam, planIdParam]);

  // Handlers
  const handleSelectPatient = async (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient);
    setIsSelectingPatient(false);
    
    // Carregar plano ATIVO do paciente selecionado
    try {
      const { data: existingPlan } = await getPatientMealPlan(patientId, user?.id);
      if (existingPlan) {
        setCurrentPlan(existingPlan);
        setPlanName(existingPlan.name || 'Plano Alimentar');
        setPlanNotes(existingPlan.description || '');
        if (existingPlan.plan_data?.meals?.length > 0) {
          setMeals(existingPlan.plan_data.meals);
          toast.success(`Plano "${existingPlan.name}" carregado!`);
        } else {
          setMeals([{ ...mockMeals[0], foods: [] }, { ...mockMeals[2], foods: [] }, { ...mockMeals[4], foods: [] }]);
        }
      } else {
        // Sem plano ativo - iniciar novo
        setCurrentPlan(null);
        setPlanName('Plano Alimentar');
        setPlanNotes('');
        setMeals([{ ...mockMeals[0], foods: [] }, { ...mockMeals[2], foods: [] }, { ...mockMeals[4], foods: [] }]);
      }
      
      // Carregar planos agendados e anamnese
      const [allPlansRes, anamnesisRes] = await Promise.allSettled([
        getPatientAllMealPlans(patientId),
        getAnamnesis(patientId)
      ]);
      if (allPlansRes.status === 'fulfilled') {
        setScheduledPlans(allPlansRes.value.data?.filter(p => p.plan_status === 'scheduled') || []);
      }
      if (anamnesisRes.status === 'fulfilled') {
        setPatientAnamnesis(anamnesisRes.value.data);
      }
    } catch (err) {
      console.error('Erro ao carregar plano do paciente:', err);
      setCurrentPlan(null);
      setPlanName('Plano Alimentar');
      setPlanNotes('');
      setMeals([{ ...mockMeals[0], foods: [] }, { ...mockMeals[2], foods: [] }, { ...mockMeals[4], foods: [] }]);
    }
  };

  const addFoodToMeal = (mealId, food) => setMeals(meals.map(m => m.id === mealId ? { ...m, foods: [...m.foods, food] } : m));
  const removeFoodFromMeal = (foodId) => setMeals(meals.map(m => ({ ...m, foods: m.foods.filter(f => f.id !== foodId) })));
  const updateFood = (foodId, field, value) => setMeals(meals.map(m => ({ ...m, foods: m.foods.map(f => f.id === foodId ? { ...f, [field]: value } : f) })));
  const duplicateMeal = (mealId) => {
    const meal = meals.find(m => m.id === mealId);
    if (meal) {
      setMeals([...meals, { ...meal, id: `m${Date.now()}`, name: `${meal.name} (Cópia)`, foods: meal.foods.map(f => ({ ...f, id: `f${Date.now()}_${f.id}` })) }]);
      toast.success('Refeição duplicada!');
    }
  };
  const addNewMeal = () => setMeals([...meals, { id: `m${Date.now()}`, name: `Refeição ${meals.length + 1}`, time: '12:00', color: mockMeals[meals.length % mockMeals.length]?.color || '#0F766E', foods: [] }]);
  const removeMeal = (mealId) => {
    if (meals.length <= 1) { toast.error('Mínimo 1 refeição'); return; }
    setMeals(meals.filter(m => m.id !== mealId));
  };
  const updateMeal = (mealId, field, value) => setMeals(meals.map(m => m.id === mealId ? { ...m, [field]: value } : m));
  const dayTotals = calculateDayTotals(meals, allFoods);

  const handleSavePlan = async () => {
    if (!selectedPatient) { toast.error('Selecione um paciente'); return; }
    setSaving(true);
    try {
      const cleanedMeals = meals.map(meal => ({
        id: meal.id, name: meal.name, time: meal.time, color: meal.color || '#0F766E', observations: meal.observations || '',
        foods: meal.foods.map(food => {
          const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
          const nutrition = calculateNutrition(foodData, food.quantity, food.unit);
          return { id: food.id, foodId: food.foodId || food.food_id, name: foodData?.name || food.name || '', quantity: food.quantity, unit: food.unit || 'g', calories: nutrition.kcal, protein: nutrition.protein, carbs: nutrition.carbs, fat: nutrition.fat };
        })
      }));
      if (currentPlan) {
        const { data, error } = await updateMealPlan(currentPlan.id, { name: planName, description: planNotes, plan_data: { meals: cleanedMeals }, daily_targets: currentPlan.daily_targets || dayTotals });
        if (error) throw error;
        toast.success('Plano atualizado!');
        trackProfessionalFeature('edit_meal_plan');
        setCurrentPlan(data);
      } else {
        const { data, error } = await createMealPlan({ patient_id: selectedPatient.id, professional_id: user.id, name: planName, description: planNotes, plan_data: { meals: cleanedMeals }, daily_targets: currentPlan?.daily_targets || dayTotals, is_active: true });
        if (error) throw error;
        setCurrentPlan(data);
        toast.success('Plano criado!');
        trackProfessionalFeature('create_meal_plan');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleInactivatePlan = async () => {
    if (!currentPlan || !window.confirm('Inativar este plano?')) return;
    try {
      await updateMealPlan(currentPlan.id, { is_active: false, plan_status: 'archived' });
      toast.success('Plano inativado');
      navigate(-1);
    } catch (err) { toast.error('Erro ao inativar'); }
  };

  // Métricas do plano
  const totalFoods = meals.reduce((acc, m) => acc + (m.foods?.length || 0), 0);
  const completionPercent = Math.min(Math.round((totalFoods / (meals.length * 4)) * 100), 100);

  if (loading) {
    return (
      <Layout title="Editor de Plano" showBack userType="professional">
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-teal-700" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="" showBack={false} userType="professional">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 space-y-4">
        
        {/* ========== HEADER PREMIUM - ESTILO DASHBOARD ========== */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 rounded-2xl p-5 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <User className="h-7 w-7 text-white" />
              </div>
              <div className="text-white">
                <p className="text-teal-100 text-sm">Editor de Plano</p>
                <h1 className="text-2xl font-bold">{selectedPatient?.name || 'Selecione um Paciente'} 👋</h1>
                {selectedPatient && <p className="text-teal-100 text-sm">Plano alimentar personalizado</p>}
              </div>
            </div>
            
            <div className="flex gap-2">
              {!isPatientView && !patientIdParam && (
                <Dialog open={isSelectingPatient} onOpenChange={setIsSelectingPatient}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      <User size={16} className="mr-2" /> {selectedPatient ? 'Trocar' : 'Selecionar'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Selecionar Paciente</DialogTitle></DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {patients.map((patient) => (
                        <div key={patient.id} onClick={() => handleSelectPatient(patient.id)}
                          className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${selectedPatient?.id === patient.id ? 'border-teal-500 bg-teal-50' : ''}`}>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-gray-500">{patient.email}</p>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <RefreshCw size={16} className="mr-2" /> Atualizar
              </Button>
            </div>
          </div>
        </div>

        {/* ========== BARRA DE PROGRESSO DO PLANO ========== */}
        <Card className="border-t-4 border-t-orange-400">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">Progresso do Plano</h3>
                    <Badge className="bg-orange-500 text-white text-xs">Em Edição</Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    Você configurou <strong>{totalFoods}</strong> alimentos em <strong>{meals.length}</strong> refeições ({completionPercent}%)
                  </p>
                </div>
              </div>
              
              <div className="flex-1 max-w-md">
                <Progress value={completionPercent} className="h-3" />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  Meta: 4 alimentos por refeição
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Eye size={14} className="mr-1" /> Detalhes</Button>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">Central de Recursos</Button>
              </div>
            </div>
            
            {/* Badges de Features Ativas */}
            <div className="flex gap-2 mt-4">
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">🥗 Ativo em Nutrição</Badge>
              <Badge variant="outline" className="text-violet-600 border-violet-200 bg-violet-50">🤖 Ativo em Inteligência Artificial</Badge>
            </div>
          </CardContent>
        </Card>

        {/* ========== AÇÕES RÁPIDAS - CARDS COLORIDOS ========== */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" /> Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <button onClick={handleSavePlan} disabled={saving || !selectedPatient}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50">
              {saving ? <Loader2 size={28} className="animate-spin mb-2" /> : <Save size={28} className="mb-2" />}
              <span className="text-sm font-semibold">{currentPlan ? 'Salvar Plano' : 'Criar Plano'}</span>
            </button>
            
            <button onClick={() => navigate(`/professional/patients/${selectedPatient?.id}`)} disabled={!selectedPatient}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50">
              <MessageSquare size={28} className="mb-2" />
              <span className="text-sm font-semibold">Enviar Feedback</span>
            </button>
            
            <button onClick={addNewMeal}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              <ClipboardList size={28} className="mb-2" />
              <span className="text-sm font-semibold">Nova Refeição</span>
            </button>
            
            <button onClick={() => currentPlan && duplicateMeal(meals[0]?.id)} disabled={!currentPlan}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50">
              <Copy size={28} className="mb-2" />
              <span className="text-sm font-semibold">Duplicar Plano</span>
            </button>
            
            <button onClick={() => setShowEnergyCalculator(true)} disabled={!selectedPatient}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50">
              <BarChart3 size={28} className="mb-2" />
              <span className="text-sm font-semibold">Calculo Energetico</span>
            </button>
            
            <button onClick={() => navigate('/professional/reports')}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              <LineChart size={28} className="mb-2" />
              <span className="text-sm font-semibold">Ver Relatorios</span>
            </button>
          </div>
        </div>

        {/* ========== MÉTRICAS DO PLANO ========== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Refeições</p>
                <p className="text-2xl font-bold text-gray-900">{meals.length}</p>
                <p className="text-[10px] text-gray-400">Configuradas</p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Utensils size={20} className="text-emerald-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Calorias</p>
                <p className="text-2xl font-bold text-teal-700">{dayTotals.kcal}</p>
                <p className="text-[10px] text-gray-400">kcal/dia</p>
              </div>
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Zap size={20} className="text-teal-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Proteína</p>
                <p className="text-2xl font-bold text-blue-600">{dayTotals.protein}g</p>
                <p className="text-[10px] text-gray-400">Total PTN</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target size={20} className="text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Programados</p>
                <p className="text-2xl font-bold text-violet-600">{scheduledPlans.length}</p>
                <p className="text-[10px] text-gray-400">Planos futuros</p>
              </div>
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <Calendar size={20} className="text-violet-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Completude</p>
                <p className="text-2xl font-bold text-orange-600">{completionPercent}%</p>
                <p className="text-[10px] text-gray-400">Progresso</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 size={20} className="text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== PAINEL METAS vs PLANO (TEMPO REAL) ========== */}
        {(() => {
          const targets = currentPlan?.daily_targets;
          const hasTargets = targets && (targets.kcal || targets.protein_g || targets.carbs_g || targets.fat_g);
          if (!hasTargets) return (
            <Card className="border-2 border-dashed border-gray-200">
              <CardContent className="p-4 text-center">
                <Target className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">Nenhuma meta definida</p>
                <p className="text-xs text-gray-400 mt-1">Use o Calculo Energetico para definir metas de kcal e macros</p>
                {selectedPatient && (
                  <Button size="sm" variant="outline" className="mt-3 text-teal-600 border-teal-300" onClick={() => setShowEnergyCalculator(true)}>
                    <BarChart3 size={14} className="mr-1" /> Definir Metas
                  </Button>
                )}
              </CardContent>
            </Card>
          );

          const macroItems = [
            { key: 'kcal', tKey: 'kcal', label: 'Calorias', actual: dayTotals.kcal, target: targets.kcal || 0, unit: 'kcal', color: 'emerald', bgColor: 'bg-emerald-500' },
            { key: 'protein', tKey: 'protein_g', label: 'Proteina', actual: dayTotals.protein, target: targets.protein_g || 0, unit: 'g', color: 'blue', bgColor: 'bg-blue-500' },
            { key: 'carbs', tKey: 'carbs_g', label: 'Carboidratos', actual: dayTotals.carbs, target: targets.carbs_g || 0, unit: 'g', color: 'amber', bgColor: 'bg-amber-500' },
            { key: 'fat', tKey: 'fat_g', label: 'Gordura', actual: dayTotals.fat, target: targets.fat_g || 0, unit: 'g', color: 'rose', bgColor: 'bg-rose-500' },
            ...(targets.fiber_g ? [{ key: 'fiber', tKey: 'fiber_g', label: 'Fibras', actual: dayTotals.fiber, target: targets.fiber_g || 0, unit: 'g', color: 'green', bgColor: 'bg-green-500' }] : [])
          ];

          return (
            <Card data-testid="targets-vs-plan" className="border-2 border-emerald-200 shadow-md overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Target size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Metas vs Plano Atual</h3>
                      <p className="text-[10px] text-gray-500">Atualizacao em tempo real conforme edita o plano</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {targets.created_from === 'calculator' && (
                      <Badge className="bg-teal-100 text-teal-700 border-0 text-[10px]">Via Calculadora</Badge>
                    )}
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs animate-pulse">Tempo real</Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {macroItems.map(item => {
                    const pct = item.target > 0 ? Math.round((item.actual / item.target) * 100) : 0;
                    const over = pct > 110;
                    const under = pct < 80;
                    const statusColor = over ? 'text-red-600' : under ? 'text-amber-600' : `text-${item.color}-600`;
                    const barColor = over ? 'bg-red-500' : under ? 'bg-amber-400' : item.bgColor;
                    return (
                      <div key={item.key} className="flex items-center gap-3">
                        <div className="w-20 text-right">
                          <p className="text-[10px] text-gray-500">{item.label}</p>
                        </div>
                        <div className="flex-1">
                          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${barColor}`} 
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                        <div className="w-36 text-right">
                          <span className={`text-xs font-bold ${over ? 'text-red-600' : under ? 'text-amber-600' : 'text-gray-900'}`}>
                            {item.actual}{item.unit}
                          </span>
                          <span className="text-[10px] text-gray-400"> / {item.target}{item.unit}</span>
                          <span className={`ml-1 text-[10px] font-bold ${over ? 'text-red-600' : under ? 'text-amber-600' : 'text-emerald-600'}`}>
                            ({pct}%){over ? ' !' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Water if defined */}
                {targets.water_ml && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Agua recomendada:</span>
                    <span className="font-bold text-cyan-600">{targets.water_ml} ml/dia ({(targets.water_ml / 1000).toFixed(1)}L)</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* ========== LAYOUT PRINCIPAL: EDITOR + SIDEBAR ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* COLUNA ESQUERDA: EDITOR DE REFEIÇÕES */}
          <div className="lg:col-span-8 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 uppercase">Nome do Plano</Label>
                    <Input value={planName} onChange={(e) => setPlanName(e.target.value)} className="mt-1 font-medium" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {meals.map((meal) => (
                <MealSection
                  key={meal.id}
                  meal={meal}
                  allFoods={allFoods}
                  onAddFood={addFoodToMeal}
                  onRemoveFood={removeFoodFromMeal}
                  onUpdateFood={updateFood}
                  onDuplicateMeal={duplicateMeal}
                  onUpdateMeal={updateMeal}
                  onRemoveMeal={removeMeal}
                  onSaveMealAsTemplate={(meal) => { setMealToSaveAsTemplate(meal); setSaveTemplateDialog(true); }}
                />
              ))}
              
              <Button onClick={addNewMeal} variant="outline" className="w-full border-dashed border-2 py-6 hover:border-teal-400">
                <Plus size={18} className="mr-2" /> Adicionar Nova Refeição
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <Label className="flex items-center gap-2 mb-2"><FileText size={14} /> Anotações</Label>
                <Textarea value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} placeholder="Observações gerais..." rows={3} />
              </CardContent>
            </Card>
          </div>

          {/* COLUNA DIREITA: CENTRAL DE PLANOS */}
          <div className="lg:col-span-4 space-y-4">
            {/* Dashboard Inteligente do Paciente */}
            {selectedPatient && (
              <PatientSmartDashboard 
                patientId={selectedPatient?.id} 
                compact={true}
              />
            )}
            
            {selectedPatient && (
              <Card className="border-2 border-violet-200 bg-white sticky top-4">
                <CardContent className="p-4">
                  <PlanSchedulerSidebar
                    patientId={selectedPatient?.id}
                    professionalId={user?.id}
                    currentPlan={currentPlan}
                    onPlanChange={loadInitialData}
                    onEditPlan={(plan) => {
                      setCurrentPlan(plan);
                      setPlanName(plan.name);
                      setPlanNotes(plan.description || '');
                      if (plan.plan_data?.meals) setMeals(plan.plan_data.meals);
                      toast.info(`Plano "${plan.name}" carregado`);
                    }}
                  />
                </CardContent>
              </Card>
            )}
            
            {!selectedPatient && (
              <Card className="border-2 border-dashed border-gray-200">
                <CardContent className="p-8 text-center">
                  <User className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">Selecione um paciente para ver a Central de Planos</p>
                </CardContent>
              </Card>
            )}
            
            {/* PAINEL DE MODELOS */}
            {user && (
              <div className="mt-4">
                <MealTemplatesPanel 
                  professionalId={user.id}
                  allFoods={allFoods}
                  onApplyTemplate={(mealData) => {
                    // Verificar se é um plano completo ou apenas uma refeição
                    if (mealData.meals && Array.isArray(mealData.meals)) {
                      // É um plano completo - SUBSTITUIR tudo
                      setMeals(mealData.meals.map(m => ({ 
                        ...m, 
                        id: `m${Date.now()}-${m.id}`,
                        foods: m.foods?.map(f => ({ ...f, id: `f${Date.now()}-${f.id}` })) || []
                      })));
                      toast.success('Plano completo aplicado! Plano anterior foi substituído.');
                    } else {
                      // É apenas uma refeição - adicionar
                      const newMeal = {
                        id: `m${Date.now()}`,
                        name: mealData.name || 'Nova Refeição',
                        time: mealData.time || '12:00',
                        color: mealData.color || '#0F766E',
                        foods: mealData.foods?.map(f => ({ ...f, id: `f${Date.now()}-${f.id}` })) || [],
                        observations: mealData.observations || ''
                      };
                      setMeals([...meals, newMeal]);
                      toast.success('Modelo aplicado como nova refeição!');
                    }
                  }}
                  compact={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* DIALOG SALVAR TEMPLATE */}
      <SaveTemplateDialog
        meal={mealToSaveAsTemplate}
        allFoods={allFoods}
        professionalId={user?.id}
        open={saveTemplateDialog}
        onOpenChange={setSaveTemplateDialog}
        onSaved={() => { setMealToSaveAsTemplate(null); }}
      />

      {/* MODAL CALCULO ENERGETICO */}
      <EnergyCalculatorModal
        open={showEnergyCalculator}
        onClose={() => setShowEnergyCalculator(false)}
        patient={selectedPatient}
        anamnesis={patientAnamnesis}
        physicalAssessment={null}
        onApplyCalories={async (results) => {
          const dailyTargets = {
            kcal: results.tdee,
            protein_g: results.macros?.protein?.grams || 0,
            carbs_g: results.macros?.carbs?.grams || 0,
            fat_g: results.macros?.fat?.grams || 0,
            fiber_g: 25,
            water_ml: Math.round((parseFloat(results.weight) || 70) * 35),
            bmr: results.bmr,
            created_from: 'calculator',
            formula: results.formula || 'mifflin',
            updated_at: new Date().toISOString()
          };

          try {
            if (currentPlan?.id) {
              const { data, error } = await updateMealPlan(currentPlan.id, { daily_targets: dailyTargets });
              if (error) throw error;
              setCurrentPlan(prev => ({ ...prev, daily_targets: dailyTargets }));
              toast.success(`Metas aplicadas! ${results.tdee} kcal/dia`);
            } else if (selectedPatient) {
              const { data: activePlan } = await supabase
                .from('meal_plans')
                .select('id')
                .eq('patient_id', selectedPatient.id)
                .eq('is_active', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (activePlan) {
                const { error } = await supabase
                  .from('meal_plans')
                  .update({ daily_targets: dailyTargets, updated_at: new Date().toISOString() })
                  .eq('id', activePlan.id);
                if (error) throw error;
                setCurrentPlan(prev => prev ? { ...prev, daily_targets: dailyTargets } : { id: activePlan.id, daily_targets: dailyTargets });
                toast.success(`Metas aplicadas ao plano ativo! ${results.tdee} kcal/dia`);
              } else {
                const { data: newPlan, error } = await supabase
                  .from('meal_plans')
                  .insert({
                    patient_id: selectedPatient.id,
                    professional_id: user.id,
                    name: 'Plano Atual',
                    plan_status: 'draft',
                    is_active: true,
                    daily_targets: dailyTargets,
                    plan_data: { meals: [] }
                  })
                  .select()
                  .single();
                if (error) throw error;
                setCurrentPlan(newPlan);
                toast.success(`Plano criado com metas! ${results.tdee} kcal/dia`);
              }
            }
          } catch (err) {
            console.error('Erro ao aplicar metas:', err);
            toast.error('Erro ao salvar metas no plano');
          }
        }}
      />
    </Layout>
  );
};

export default MealPlanEditor;
