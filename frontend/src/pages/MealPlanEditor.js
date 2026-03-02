import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GripVertical, Trash2, Copy, Search, Save, Loader2, User, Check, Edit, Clock, FileText, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { mockMeals, householdMeasures, mockFoods, resolveDraftFoods, findFoodByName } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getProfessionalPatients, 
  getPatientById, 
  getMealPlan, 
  getPatientMealPlan,
  createMealPlan, 
  updateMealPlan,
  getCustomFoods,
  getDraftMealPlan
} from '@/lib/supabase';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';

const SortableFood = ({ food, onRemove, onUpdate, allFoods }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: food.id });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(food.customName || '');
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
  const isNotFound = food.notFound || (!foodData && food.name);
  
  // Nome exibido: customName > foodData.name > food.name
  const displayName = food.customName || foodData?.name || food.name || 'Alimento não encontrado';
  
  const calculateNutrients = () => {
    if (!foodData) return { calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 };
    const multiplier = food.quantity / foodData.porcao;
    return {
      calorias: (foodData.calorias * multiplier).toFixed(0),
      proteina: (foodData.proteina * multiplier).toFixed(1),
      carboidrato: (foodData.carboidrato * multiplier).toFixed(1),
      gordura: (foodData.gordura * multiplier).toFixed(1),
    };
  };

  const nutrients = calculateNutrients();
  
  const handleSaveName = () => {
    onUpdate(food.id, 'customName', editedName);
    setIsEditingName(false);
  };
  
  const handleCancelEditName = () => {
    setEditedName(food.customName || foodData?.name || '');
    setIsEditingName(false);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
        isNotFound 
          ? 'bg-amber-50 border-amber-300' 
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
          <GripVertical size={20} />
        </div>
        
        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-4">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-sm"
                  placeholder="Nome do alimento"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                  onBlur={handleSaveName}
                  autoFocus
                />
                <Button onClick={handleSaveName} size="sm" variant="ghost" className="text-green-600">
                  <Save size={14} />
                </Button>
                <Button onClick={handleCancelEditName} size="sm" variant="ghost" className="text-red-600">
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                {isNotFound ? (
                  <>
                    <p className="font-medium text-amber-800">{displayName}</p>
                    <p className="text-xs text-amber-600">⚠️ Não encontrado</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">{displayName}</p>
                    <Button
                      onClick={() => {
                        setEditedName(displayName);
                        setIsEditingName(true);
                      }}
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
                    >
                      <Edit size={12} />
                    </Button>
                  </>
                )}
                {foodData?.source && <p className="text-xs text-gray-500">{foodData.source}</p>}
              </div>
            )}
          </div>
          
          <div className="col-span-3 flex gap-2">
            <Input
              type="number"
              value={food.quantity}
              onChange={(e) => onUpdate(food.id, 'quantity', parseFloat(e.target.value) || 0)}
              className="w-20 text-sm"
            />
            <Select value={food.unit} onValueChange={(v) => onUpdate(food.id, 'unit', v)}>
              <SelectTrigger className="w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {householdMeasures.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="col-span-4 flex gap-3 text-xs">
            {isNotFound ? (
              <span className="text-amber-600">Valores não calculados</span>
            ) : (
              <>
                <span className="font-semibold text-teal-700">{nutrients.calorias} kcal</span>
                <span className="text-gray-600">P: {nutrients.proteina}g</span>
                <span className="text-gray-600">C: {nutrients.carboidrato}g</span>
                <span className="text-gray-600">G: {nutrients.gordura}g</span>
              </>
            )}
          </div>
          
          <div className="col-span-1 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(food.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MealSection = ({ meal, onAddFood, onRemoveFood, onUpdateFood, onDuplicateMeal, onUpdateMealName, onUpdateMealTime, onUpdateMeal, onRemoveMeal, allFoods, userType = 'professional' }) => {
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState('g');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(meal.name);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = meal.foods.findIndex((f) => f.id === active.id);
      const newIndex = meal.foods.findIndex((f) => f.id === over.id);
      const newFoods = arrayMove(meal.foods, oldIndex, newIndex);
      meal.foods = newFoods;
    }
  };

  const calculateMealTotals = () => {
    return meal.foods.reduce((totals, food) => {
      const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
      if (!foodData) return totals;
      const multiplier = food.quantity / foodData.porcao;
      return {
        calorias: totals.calorias + (foodData.calorias * multiplier),
        proteina: totals.proteina + (foodData.proteina * multiplier),
        carboidrato: totals.carboidrato + (foodData.carboidrato * multiplier),
        gordura: totals.gordura + (foodData.gordura * multiplier),
      };
    }, { calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 });
  };

  const totals = calculateMealTotals();
  
  const filteredFoods = allFoods.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'ALL' || f.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const handleAddFood = () => {
    if (selectedFoodId) {
      onAddFood(meal.id, {
        id: `f${Date.now()}`,
        foodId: selectedFoodId,
        food_id: selectedFoodId,
        quantity,
        unit,
        measure: ''
      });
      setIsAddingFood(false);
      setSearchTerm('');
      setSelectedFoodId(null);
      setQuantity(100);
      setUnit('g');
    }
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      onUpdateMealName(meal.id, editedName);
      setIsEditingName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditedName(meal.name);
    setIsEditingName(false);
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: meal.color || '#0F766E' }}>
      <CardHeader className="bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="max-w-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                  onBlur={handleSaveName}
                  autoFocus
                />
                <Button onClick={handleSaveName} size="sm" variant="outline">
                  <Save size={14} />
                </Button>
                <Button onClick={handleCancelEditName} size="sm" variant="ghost">
                  <Trash2 size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{meal.name}</CardTitle>
                <Button 
                  onClick={() => setIsEditingName(true)} 
                  size="sm" 
                  variant="ghost"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit size={14} />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="time"
                value={meal.time}
                onChange={(e) => onUpdateMealTime(meal.id, e.target.value)}
                className="w-32 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {onRemoveMeal && userType !== 'patient' && (
              <Button
                onClick={() => onRemoveMeal(meal.id)}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </Button>
            )}
            {userType !== 'patient' && (
              <Button
                data-testid={`duplicate-meal-${meal.id}`}
                onClick={() => onDuplicateMeal(meal.id)}
                variant="outline"
                size="sm"
                className="text-teal-700 border-teal-700 hover:bg-teal-50"
              >
                <Copy size={16} className="mr-2" />
                Duplicar
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-sm bg-white p-3 rounded-lg border border-gray-200">
          <span className="font-semibold text-teal-700">{totals.calorias.toFixed(0)} kcal</span>
          <span className="text-gray-700">Proteína: {totals.proteina.toFixed(1)}g</span>
          <span className="text-gray-700">Carboidrato: {totals.carboidrato.toFixed(1)}g</span>
          <span className="text-gray-700">Gordura: {totals.gordura.toFixed(1)}g</span>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={meal.foods.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {meal.foods.map((food) => (
                <SortableFood
                  key={food.id}
                  food={food}
                  allFoods={allFoods}
                  onRemove={onRemoveFood}
                  onUpdate={onUpdateFood}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Campo de Observações */}
        <div className="mt-4">
          <Label className="text-sm text-gray-600 flex items-center gap-2">
            <FileText size={14} />
            Observações desta refeição (opcional)
          </Label>
          <Textarea
            value={meal.observations || ''}
            onChange={(e) => onUpdateMeal(meal.id, 'observations', e.target.value)}
            placeholder="Ex: substituir arroz por batata doce caso paciente prefira, evitar alimentos com glúten..."
            className="mt-2 text-sm"
            rows={2}
          />
        </div>

        <Dialog open={isAddingFood} onOpenChange={setIsAddingFood}>
          <DialogTrigger asChild>
            <Button
              data-testid={`add-food-${meal.id}`}
              className="w-full mt-4 border-dashed bg-teal-50 text-teal-700 hover:bg-teal-100"
              variant="outline"
            >
              <Plus size={16} className="mr-2" />
              Adicionar Alimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Alimento</DialogTitle>
              <DialogDescription>Busque e adicione um alimento ao plano alimentar</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Filtrar por Fonte</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant={sourceFilter === 'ALL' ? 'default' : 'outline'}
                    onClick={() => setSourceFilter('ALL')}
                    className={sourceFilter === 'ALL' ? 'bg-teal-700' : ''}
                  >
                    Todos
                  </Button>
                  <Button
                    size="sm"
                    variant={sourceFilter === 'TACO' ? 'default' : 'outline'}
                    onClick={() => setSourceFilter('TACO')}
                    className={sourceFilter === 'TACO' ? 'bg-teal-700' : ''}
                  >
                    TACO
                  </Button>
                  <Button
                    size="sm"
                    variant={sourceFilter === 'CUSTOM' ? 'default' : 'outline'}
                    onClick={() => setSourceFilter('CUSTOM')}
                    className={sourceFilter === 'CUSTOM' ? 'bg-teal-700' : ''}
                  >
                    Meus Alimentos
                  </Button>
                  <Button
                    size="sm"
                    variant={sourceFilter === 'USDA' ? 'default' : 'outline'}
                    onClick={() => setSourceFilter('USDA')}
                    className={sourceFilter === 'USDA' ? 'bg-teal-700' : ''}
                  >
                    USDA
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Buscar Alimento</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <Input
                    placeholder="Digite o nome do alimento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {filteredFoods.map((food) => (
                  <div
                    key={food.id}
                    onClick={() => setSelectedFoodId(food.id)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedFoodId === food.id ? 'bg-teal-50 border-l-4 border-l-teal-700' : ''
                    }`}
                  >
                    <p className="font-medium text-gray-900">{food.name}</p>
                    <p className="text-xs text-gray-500">
                      {food.source} • {food.calorias} kcal por {food.porcao}{food.unidade}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Medida</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {householdMeasures.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAddFood} className="w-full bg-teal-700 hover:bg-teal-800" disabled={!selectedFoodId}>
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const MealPlanEditor = ({ userType = 'professional' }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const patientIdParam = searchParams.get('patient');
  const planIdParam = searchParams.get('plan');
  const fromDraftParam = searchParams.get('fromDraft') === 'true';
  const isPatientView = userType === 'patient';
  
  // Esconder seletor se já tem paciente definido (vindo do pré-plano ou URL)
  const hidePatientSelector = !!patientIdParam || fromDraftParam;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [draftAvailable, setDraftAvailable] = useState(null);
  const [planName, setPlanName] = useState('Plano Alimentar');
  const [allFoods, setAllFoods] = useState([...mockFoods]);
  const [isSelectingPatient, setIsSelectingPatient] = useState(false);

  const [meals, setMeals] = useState([
    { ...mockMeals[0], foods: [] },
    { ...mockMeals[2], foods: [] },
    { ...mockMeals[4], foods: [] }
  ]);

  // Mover loadInitialData para useCallback para evitar loops
  const loadInitialData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Se for visualização do paciente, carregar seu plano
      if (isPatientView) {
        console.log('🔵 MODO PACIENTE - Carregando plano do usuário:', user.id);
        
        try {
          const { data: patientPlanData, error } = await getPatientMealPlan(user.id);
          
          if (error) {
            console.error('❌ Erro ao buscar plano do paciente:', error);
            toast.error('Erro ao carregar plano: ' + (error.message || 'Erro desconhecido'));
            setLoading(false);
            return;
          }
          
          console.log('📥 PLANO DO PACIENTE:', patientPlanData);
          
          if (patientPlanData) {
            setCurrentPlan(patientPlanData);
            setPlanName(patientPlanData.name);
            if (patientPlanData.plan_data && patientPlanData.plan_data.meals) {
              console.log('📥 MEALS DO PACIENTE:', patientPlanData.plan_data.meals);
              setMeals(patientPlanData.plan_data.meals);
            }
          } else {
            console.log('⚠️ Nenhum plano encontrado para o paciente');
            toast.info('Nenhum plano alimentar disponível ainda');
          }
        } catch (err) {
          console.error('❌ Exceção ao carregar plano:', err);
          toast.error('Erro ao carregar plano: ' + err.message);
        }
        
        setLoading(false);
        return;
      }
      
      // Carregar pacientes do profissional
      const { data: patientsData } = await getProfessionalPatients(user.id);
      const mappedPatients = (patientsData || []).map(item => ({
        id: item.patient.id,
        name: item.patient.name,
        email: item.patient.email
      }));
      setPatients(mappedPatients);

      // Carregar alimentos customizados
      const { data: customFoods } = await getCustomFoods(user.id);
      if (customFoods) {
        setAllFoods([...mockFoods, ...customFoods]);
      }

      // Verificar se está vindo do draft
      const fromDraft = searchParams.get('fromDraft') === 'true';
      const draftData = sessionStorage.getItem('draftPlanToLoad');
      
      if (fromDraft && draftData) {
        try {
          const draft = JSON.parse(draftData);
          console.log('Loading draft plan:', draft);
          
          // Carregar alimentos customizados primeiro
          const { data: customFoods } = await getCustomFoods(user?.id);
          const allFoodsForResolve = [...mockFoods, ...(customFoods || [])];
          
          // Converter meals do draft para formato do editor
          if (draft.meals && draft.meals.length > 0) {
            let unresolvedCount = 0;
            
            const convertedMeals = draft.meals.map((meal, index) => {
              // Resolver alimentos do pré-plano para IDs reais
              const resolvedFoods = resolveDraftFoods(meal.foods || [], allFoodsForResolve);
              
              // Contar não resolvidos
              unresolvedCount += resolvedFoods.filter(f => f.notFound).length;
              
              return {
                id: meal.id || `meal-${Date.now()}-${index}`,
                name: meal.name || `Refeição ${index + 1}`,
                time: meal.time || '08:00',
                color: meal.color || '#0F766E',
                foods: resolvedFoods
              };
            });
            
            setMeals(convertedMeals);
            setPlanName(draft.planName || 'Plano Alimentar (do Pré-Plano)');
            
            if (unresolvedCount > 0) {
              toast.warning(`Pré-plano carregado! ${unresolvedCount} alimento(s) não encontrado(s) - você pode substituí-los manualmente.`);
            } else {
              toast.success('Pré-plano carregado com sucesso! Todos os alimentos foram identificados.');
            }
          }
          
          // Limpar sessionStorage
          sessionStorage.removeItem('draftPlanToLoad');
        } catch (err) {
          console.error('Error parsing draft:', err);
          toast.error('Erro ao carregar pré-plano');
        }
      }

      // Se tiver paciente na URL, carregar dados
      if (patientIdParam) {
        const { data: patientData } = await getPatientById(patientIdParam);
        if (patientData) {
          setSelectedPatient(patientData);
          
          // Verificar se existe draft disponível para este paciente
          const { data: draftData } = await getDraftMealPlan(patientIdParam);
          if (draftData && draftData.draft_data) {
            setDraftAvailable(draftData.draft_data);
          }
        }

        // Se tiver plano na URL, carregar plano (somente se NÃO estiver vindo do draft)
        if (planIdParam && !fromDraft) {
          const { data: planData } = await getMealPlan(planIdParam);
          if (planData) {
            console.log('📥 PLANO CARREGADO DO BANCO:', planData);
            console.log('📥 MEALS DO BANCO:', planData.plan_data?.meals);
            
            // Log detalhado da primeira meal
            if (planData.plan_data?.meals?.[0]) {
              const firstMeal = planData.plan_data.meals[0];
              console.log('📥 PRIMEIRA MEAL:', {
                name: firstMeal.name,
                observations: firstMeal.observations,
                foods: firstMeal.foods?.map(f => ({
                  name: f.name,
                  customName: f.customName
                }))
              });
            }
            
            setCurrentPlan(planData);
            setPlanName(planData.name);
            if (planData.plan_data && planData.plan_data.meals) {
              setMeals(planData.plan_data.meals);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user, isPatientView, patientIdParam, planIdParam, searchParams]); // useCallback dependencies

  // useEffect para carregar dados (CORRIGIDO)
  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, patientIdParam, planIdParam]); // Apenas IDs, não funções

  // Função para carregar draft como plano
  const handleUseDraft = async () => {
    if (!draftAvailable || !draftAvailable.meals) {
      toast.error('Nenhum rascunho disponível');
      return;
    }

    try {
      // Converter meals do draft para formato do editor
      let unresolvedCount = 0;
      
      const convertedMeals = draftAvailable.meals.map((meal, index) => {
        const resolvedFoods = resolveDraftFoods(meal.foods || [], allFoods);
        unresolvedCount += resolvedFoods.filter(f => f.notFound).length;
        
        return {
          id: meal.id || `meal-${Date.now()}-${index}`,
          name: meal.name || `Refeição ${index + 1}`,
          time: meal.time || '08:00',
          color: meal.color || '#0F766E',
          foods: resolvedFoods
        };
      });
      
      setMeals(convertedMeals);
      setPlanName('Plano Alimentar (do Pré-Plano)');
      
      if (unresolvedCount > 0) {
        toast.warning(`Rascunho carregado! ${unresolvedCount} alimento(s) não encontrado(s) - substitua manualmente.`);
      } else {
        toast.success('Rascunho carregado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao usar rascunho:', error);
      toast.error('Erro ao carregar rascunho');
    }
  };

  const handleSelectPatient = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient);
    setIsSelectingPatient(false);
    // Resetar plano ao trocar paciente
    setCurrentPlan(null);
    setPlanName('Plano Alimentar');
    setMeals([
      { ...mockMeals[0], foods: [] },
      { ...mockMeals[2], foods: [] },
      { ...mockMeals[4], foods: [] }
    ]);
  };

  const addFoodToMeal = (mealId, food) => {
    setMeals(meals.map(m => 
      m.id === mealId ? { ...m, foods: [...m.foods, food] } : m
    ));
  };

  const removeFoodFromMeal = (foodId) => {
    setMeals(meals.map(m => ({
      ...m,
      foods: m.foods.filter(f => f.id !== foodId)
    })));
  };

  const updateFood = (foodId, field, value) => {
    setMeals(meals.map(m => ({
      ...m,
      foods: m.foods.map(f => 
        f.id === foodId ? { ...f, [field]: value } : f
      )
    })));
  };

  const duplicateMeal = (mealId) => {
    const mealToDuplicate = meals.find(m => m.id === mealId);
    if (mealToDuplicate) {
      const newMeal = {
        ...mealToDuplicate,
        id: `m${Date.now()}`,
        name: `${mealToDuplicate.name} (Cópia)`,
        foods: mealToDuplicate.foods.map(f => ({ ...f, id: `f${Date.now()}_${f.id}` }))
      };
      setMeals([...meals, newMeal]);
    }
  };

  // ✅ NOVA FUNCIONALIDADE: Adicionar refeição vazia
  const addNewMeal = () => {
    const newMeal = {
      id: `m${Date.now()}`,
      name: `Refeição ${meals.length + 1}`,
      time: '12:00',
      color: '#0F766E',
      foods: []
    };
    setMeals([...meals, newMeal]);
    toast.success('Nova refeição adicionada!');
  };

  // ✅ NOVA FUNCIONALIDADE: Remover refeição
  const removeMeal = (mealId) => {
    if (meals.length <= 1) {
      toast.error('É necessário ter pelo menos 1 refeição');
      return;
    }
    setMeals(meals.filter(m => m.id !== mealId));
    toast.success('Refeição removida!');
  };

  // ✅ NOVA FUNCIONALIDADE: Editar nome da refeição
  const updateMealName = (mealId, newName) => {
    setMeals(meals.map(m => 
      m.id === mealId ? { ...m, name: newName } : m
    ));
  };

  // ✅ NOVA FUNCIONALIDADE: Editar horário da refeição
  const updateMealTime = (mealId, newTime) => {
    setMeals(meals.map(m => 
      m.id === mealId ? { ...m, time: newTime } : m
    ));
  };

  // ✅ NOVA FUNCIONALIDADE: Atualizar qualquer propriedade da refeição
  const updateMeal = (mealId, field, value) => {
    setMeals(meals.map(m => 
      m.id === mealId ? { ...m, [field]: value } : m
    ));
  };

  const calculateDayTotals = () => {
    return meals.reduce((totals, meal) => {
      meal.foods.forEach(food => {
        const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
        if (foodData) {
          const multiplier = food.quantity / foodData.porcao;
          totals.calorias += foodData.calorias * multiplier;
          totals.proteina += foodData.proteina * multiplier;
          totals.carboidrato += foodData.carboidrato * multiplier;
          totals.gordura += foodData.gordura * multiplier;
        }
      });
      return totals;
    }, { calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 });
  };

  const handleSavePlan = async () => {
    console.log('🚀 BOTÃO SALVAR CLICADO!');
    
    if (!selectedPatient) {
      toast.error('Selecione um paciente primeiro');
      return;
    }

    setSaving(true);
    try {
      // Limpar dados dos alimentos antes de salvar - INCLUINDO DADOS NUTRICIONAIS
      const cleanedMeals = meals.map(meal => ({
        id: meal.id,
        name: meal.name,
        time: meal.time,
        color: meal.color || '#0F766E',
        observations: meal.observations || '',
        foods: meal.foods.map(food => {
          // Encontrar dados nutricionais do alimento
          const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
          const quantity = parseFloat(food.quantity) || 100;
          const multiplier = foodData ? quantity / foodData.porcao : 1;
          
          return {
            id: food.id,
            foodId: food.foodId || food.food_id || null,
            food_id: food.foodId || food.food_id || null,
            name: food.name || foodData?.name || '',
            customName: food.customName || '',
            quantity: quantity,
            unit: food.unit || 'g',
            measure: food.measure || '',
            observations: food.observations || '',
            // ✅ INCLUIR DADOS NUTRICIONAIS PARA EXIBIÇÃO NO MODAL
            calories: foodData ? parseFloat((foodData.calorias * multiplier).toFixed(0)) : 0,
            kcal: foodData ? parseFloat((foodData.calorias * multiplier).toFixed(0)) : 0,
            protein: foodData ? parseFloat((foodData.proteina * multiplier).toFixed(1)) : 0,
            carbs: foodData ? parseFloat((foodData.carboidrato * multiplier).toFixed(1)) : 0,
            fat: foodData ? parseFloat((foodData.gordura * multiplier).toFixed(1)) : 0
          };
        })
      }));

      console.log('🔍 MEALS ORIGINAIS:', meals);
      console.log('🔍 CLEANED MEALS:', cleanedMeals);

      // Calcular totais com valores numéricos válidos
      const totals = calculateDayTotals();
      const dailyTargets = {
        calorias: parseFloat(totals.calorias) || 0,
        proteina: parseFloat(totals.proteina) || 0,
        carboidrato: parseFloat(totals.carboidrato) || 0,
        gordura: parseFloat(totals.gordura) || 0
      };

      console.log('Salvando plano:', { 
        cleanedMeals, 
        dailyTargets,
        patient_id: selectedPatient.id,
        professional_id: user.id,
        currentPlan: currentPlan?.id
      });

      if (currentPlan) {
        // Atualizar plano existente
        const { data, error } = await updateMealPlan(currentPlan.id, {
          name: planName,
          plan_data: { meals: cleanedMeals },
          daily_targets: dailyTargets
        });
        
        if (error) {
          console.error('❌ ERRO AO ATUALIZAR PLANO');
          console.error('Mensagem:', error?.message || 'Erro desconhecido');
          console.error('Código:', error?.code || 'Sem código');
          
          const errorMsg = error?.message || 'Erro ao atualizar plano';
          toast.error(`❌ ${errorMsg}`);
          
          if (error?.code === '42501' || error?.code === 42501) {
            toast.error('🔒 Erro de permissão.');
          }
          
          return;
        }
        
        toast.success('Plano atualizado com sucesso!');
        trackProfessionalFeature('edit_meal_plan');
        setCurrentPlan(data);
      } else {
        // Criar novo plano
        const planData = {
          patient_id: selectedPatient.id,
          professional_id: user.id,
          name: planName,
          plan_data: { meals: cleanedMeals },
          daily_targets: dailyTargets,
          is_active: true
        };
        
        const { data, error } = await createMealPlan(planData);
        
        if (error) {
          // NÃO logar error object completo
          console.error('❌ ERRO AO CRIAR PLANO');
          console.error('Mensagem:', error?.message || 'Erro desconhecido');
          console.error('Código:', error?.code || 'Sem código');
          console.error('Tipo:', error?.type || 'Desconhecido');
          
          const errorMsg = error?.message || 'Erro ao criar plano';
          toast.error(`❌ ${errorMsg}`);
          
          // Verificar código de erro RLS
          if (error?.code === '42501' || error?.code === 42501) {
            toast.error('🔒 Erro de permissão RLS.');
          }
          
          return;
        }
        
        setCurrentPlan(data);
        toast.success('Plano criado com sucesso!');
        trackProfessionalFeature('create_meal_plan');
      }
    } catch (error) {
      console.error('Erro inesperado ao salvar plano:', error);
      toast.error('Erro inesperado: ' + (error?.message || 'Contate o suporte'));
    } finally {
      setSaving(false);
    }
  };

  const dayTotals = calculateDayTotals();

  if (loading) {
    return (
      <Layout title="Editor de Plano Alimentar" showBack userType="professional">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editor de Plano Alimentar" showBack userType="professional">
      <div data-testid="meal-plan-editor" className="space-y-6">
        {/* Info do Paciente */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <User className="text-teal-700" size={24} />
                {selectedPatient ? (
                  <div>
                    <p className="font-semibold text-gray-900">{selectedPatient.name}</p>
                    <p className="text-sm text-gray-600">{selectedPatient.email}</p>
                  </div>
                ) : (
                  <p className="text-gray-600">Nenhum paciente selecionado</p>
                )}
              </div>
              
              {/* Só mostra botão de trocar paciente se NÃO veio do pré-plano e não é paciente */}
              {!isPatientView && !hidePatientSelector && (
                <Dialog open={isSelectingPatient} onOpenChange={setIsSelectingPatient}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      {selectedPatient ? 'Trocar Paciente' : 'Selecionar Paciente'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Selecionar Paciente</DialogTitle>
                      <DialogDescription>Escolha o paciente para este plano alimentar</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {patients.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>Nenhum paciente cadastrado</p>
                          <Button 
                            className="mt-4"
                            onClick={() => navigate('/professional/patients')}
                          >
                            Cadastrar Paciente
                          </Button>
                        </div>
                      ) : (
                        patients.map((patient) => (
                          <div
                            key={patient.id}
                            onClick={() => handleSelectPatient(patient.id)}
                            className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                              selectedPatient?.id === patient.id ? 'border-teal-700 bg-teal-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{patient.name}</p>
                                <p className="text-sm text-gray-600">{patient.email}</p>
                              </div>
                              {selectedPatient?.id === patient.id && (
                                <Check className="text-teal-700" size={20} />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Nome do Plano */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center space-x-4">
              <Label htmlFor="planName" className="whitespace-nowrap">Nome do Plano:</Label>
              <Input
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="max-w-md"
                placeholder="Ex: Plano de Emagrecimento"
              />
            </div>
          </CardContent>
        </Card>

        {/* Editor de Refeições */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 space-y-6">
            {meals.map((meal) => (
              <MealSection
                key={meal.id}
                meal={meal}
                allFoods={allFoods}
                onAddFood={addFoodToMeal}
                onRemoveFood={removeFoodFromMeal}
                onUpdateFood={updateFood}
                onDuplicateMeal={duplicateMeal}
                onUpdateMealName={updateMealName}
                onUpdateMealTime={updateMealTime}
                onUpdateMeal={updateMeal}
                onRemoveMeal={removeMeal}
                userType={userType}
              />
            ))}
            
            {/* Botão Adicionar Refeição */}
            <Card className="border-dashed border-2 border-gray-300 hover:border-teal-500 transition-colors">
              <CardContent className="py-8">
                <Button 
                  onClick={addNewMeal}
                  variant="outline" 
                  className="w-full border-dashed"
                >
                  <Plus className="mr-2" size={20} />
                  Adicionar Nova Refeição
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-4">
            <Card className="sticky top-6">
              <CardHeader className="bg-gradient-to-br from-teal-700 to-teal-600 text-white">
                <CardTitle>Resumo Nutricional</CardTitle>
                <p className="text-sm text-teal-100">Total do dia</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                    <p className="text-sm text-gray-600">Calorias Totais</p>
                    <p className="text-3xl font-bold text-teal-700">{dayTotals.calorias.toFixed(0)}</p>
                    <p className="text-xs text-gray-500">kcal</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Proteína</span>
                      <span className="text-lg font-bold text-gray-900">{dayTotals.proteina.toFixed(1)}g</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Carboidrato</span>
                      <span className="text-lg font-bold text-gray-900">{dayTotals.carboidrato.toFixed(1)}g</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Gordura</span>
                      <span className="text-lg font-bold text-gray-900">{dayTotals.gordura.toFixed(1)}g</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    {!isPatientView ? (
                      <>
                        {/* Botão Usar Rascunho */}
                        {draftAvailable && (
                          <Button 
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white" 
                            size="lg"
                            onClick={handleUseDraft}
                          >
                            <FileText className="mr-2" size={18} />
                            Usar Rascunho (Pré-Plano)
                          </Button>
                        )}
                        
                        <Button 
                          className="w-full bg-teal-700 hover:bg-teal-800" 
                          size="lg"
                          onClick={handleSavePlan}
                          disabled={saving || !selectedPatient}
                        >
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2" size={18} />
                              {currentPlan ? 'Atualizar Plano' : 'Salvar Plano'}
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-3 bg-teal-50 rounded-lg">
                        <p className="text-sm text-teal-800 font-medium">🍽️ Seu plano alimentar personalizado</p>
                        <p className="text-xs text-teal-700 mt-1">Elaborado especialmente para você pelo seu nutricionista</p>
                      </div>
                    )}
                    {!isPatientView && !selectedPatient && (
                      <p className="text-xs text-center text-gray-500">
                        Selecione um paciente para salvar
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MealPlanEditor;
