/**
 * MealPlanEditorCompact.js
 * Editor compacto de plano alimentar para uso em modais/wizards
 * Reutiliza lógica do MealPlanEditor mas em formato mais compacto
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Trash2, GripVertical, Search, Clock, Utensils, 
  ChefHat, Edit, Check, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { mockFoods, mockMeals, householdMeasures } from '@/data/mockData';
import { getCustomFoods } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Item de Alimento - Compacto
 */
const FoodItem = ({ food, allFoods, onUpdate, onRemove }) => {
  const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
  const displayName = food.customName || foodData?.name || food.name || 'Alimento';
  
  const nutrients = foodData ? {
    kcal: ((foodData.calorias * food.quantity) / foodData.porcao).toFixed(0),
    ptn: ((foodData.proteina * food.quantity) / foodData.porcao).toFixed(1),
    cho: ((foodData.carboidrato * food.quantity) / foodData.porcao).toFixed(1),
    fat: ((foodData.gordura * food.quantity) / foodData.porcao).toFixed(1)
  } : null;

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 group hover:bg-white hover:border-teal-200 transition-all">
      <GripVertical size={14} className="text-gray-300 cursor-grab" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
        {nutrients && (
          <div className="flex gap-2 text-[10px] text-gray-500">
            <span className="text-teal-600 font-semibold">{nutrients.kcal}kcal</span>
            <span>P:{nutrients.ptn}g</span>
            <span>C:{nutrients.cho}g</span>
            <span>G:{nutrients.fat}g</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={food.quantity}
          onChange={(e) => onUpdate(food.id, 'quantity', parseFloat(e.target.value) || 0)}
          className="w-16 h-7 text-xs"
        />
        <Select value={food.unit} onValueChange={(v) => onUpdate(food.id, 'unit', v)}>
          <SelectTrigger className="w-14 h-7 text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {householdMeasures.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(food.id)}
        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
};

/**
 * Seção de Refeição - Compacta
 */
const MealSection = ({ meal, allFoods, onUpdateMeal, onRemoveMeal, onAddFood, onUpdateFood, onRemoveFood }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState('g');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  
  const filteredFoods = allFoods.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'ALL' || f.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const handleAddFood = () => {
    if (selectedFoodId) {
      const selectedFood = allFoods.find(f => f.id === selectedFoodId);
      onAddFood(meal.id, {
        id: `f${Date.now()}`,
        foodId: selectedFoodId,
        food_id: selectedFoodId,
        name: selectedFood?.name || '',
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

  // Calcular totais da refeição
  const totals = meal.foods?.reduce((acc, food) => {
    const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
    if (foodData) {
      const mult = food.quantity / foodData.porcao;
      acc.kcal += foodData.calorias * mult;
      acc.ptn += foodData.proteina * mult;
      acc.cho += foodData.carboidrato * mult;
      acc.fat += foodData.gordura * mult;
    }
    return acc;
  }, { kcal: 0, ptn: 0, cho: 0, fat: 0 }) || { kcal: 0, ptn: 0, cho: 0, fat: 0 };

  return (
    <Card className="border-l-4 overflow-hidden" style={{ borderLeftColor: meal.color || '#0F766E' }}>
      <CardHeader 
        className="py-2 px-3 bg-gradient-to-r from-gray-50 to-white cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center" 
              style={{ backgroundColor: `${meal.color}20` }}
            >
              <Utensils size={14} style={{ color: meal.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-gray-800">{meal.name}</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Clock size={10} className="mr-0.5" />
                  {meal.time}
                </Badge>
              </div>
              <div className="flex gap-2 text-[10px] text-gray-500">
                <span className="text-teal-600 font-semibold">{totals.kcal.toFixed(0)}kcal</span>
                <span>• {meal.foods?.length || 0} itens</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onRemoveMeal(meal.id); }}
              className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
            >
              <Trash2 size={12} />
            </Button>
            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-3 space-y-2">
          {/* Lista de Alimentos */}
          {meal.foods?.length > 0 ? (
            <div className="space-y-1">
              {meal.foods.map((food) => (
                <FoodItem
                  key={food.id}
                  food={food}
                  allFoods={allFoods}
                  onUpdate={onUpdateFood}
                  onRemove={onRemoveFood}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <Utensils className="mx-auto h-6 w-6 text-gray-300 mb-1" />
              <p className="text-xs text-gray-400">Nenhum alimento adicionado</p>
            </div>
          )}
          
          {/* Observações da refeição */}
          <Textarea
            value={meal.observations || ''}
            onChange={(e) => onUpdateMeal(meal.id, 'observations', e.target.value)}
            placeholder="Observações (ex: substituir arroz por batata...)"
            className="text-xs h-16 resize-none"
          />
          
          {/* Modal Adicionar Alimento */}
          <Dialog open={isAddingFood} onOpenChange={setIsAddingFood}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed text-teal-700 hover:bg-teal-50"
              >
                <Plus size={14} className="mr-1" />
                Adicionar Alimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ChefHat className="text-teal-600" size={18} />
                  Adicionar Alimento
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-3">
                {/* Filtros de Fonte */}
                <div className="flex gap-1 flex-wrap">
                  {['ALL', 'TACO', 'USDA', 'CUSTOM'].map(src => (
                    <Button
                      key={src}
                      size="sm"
                      variant={sourceFilter === src ? 'default' : 'outline'}
                      onClick={() => setSourceFilter(src)}
                      className={`h-7 text-xs ${sourceFilter === src ? 'bg-teal-600' : ''}`}
                    >
                      {src === 'ALL' ? 'Todos' : src}
                    </Button>
                  ))}
                </div>
                
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-2 top-2 text-gray-400" size={16} />
                  <Input
                    placeholder="Buscar alimento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                
                {/* Lista de Alimentos */}
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {filteredFoods.slice(0, 50).map((food) => (
                    <div
                      key={food.id}
                      onClick={() => setSelectedFoodId(food.id)}
                      className={`p-2 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 transition-all ${
                        selectedFoodId === food.id ? 'bg-teal-50 border-l-2 border-l-teal-500' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800">{food.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {food.source} • {food.calorias}kcal/{food.porcao}{food.unidade}
                      </p>
                    </div>
                  ))}
                  {filteredFoods.length === 0 && (
                    <p className="text-center py-4 text-sm text-gray-400">Nenhum alimento encontrado</p>
                  )}
                </div>
                
                {/* Quantidade */}
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
                    <Label className="text-xs">Medida</Label>
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger className="h-9">
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
                
                <Button 
                  onClick={handleAddFood} 
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  disabled={!selectedFoodId}
                >
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
};

/**
 * Editor Compacto de Plano Alimentar
 */
const MealPlanEditorCompact = ({ 
  value = { meals: [] }, 
  onChange, 
  dailyTargets = { calorias: 2000, proteina: 100, carboidrato: 250, gordura: 70 },
  onTargetsChange 
}) => {
  const { user } = useAuth();
  const [allFoods, setAllFoods] = useState([...mockFoods]);
  const [meals, setMeals] = useState(value?.meals || []);

  // Carregar alimentos customizados
  useEffect(() => {
    const loadCustomFoods = async () => {
      if (user?.id) {
        const { data } = await getCustomFoods(user.id);
        if (data) {
          setAllFoods([...mockFoods, ...data]);
        }
      }
    };
    loadCustomFoods();
  }, [user?.id]);

  // Sincronizar com value externo
  useEffect(() => {
    if (value?.meals && JSON.stringify(value.meals) !== JSON.stringify(meals)) {
      setMeals(value.meals);
    }
  }, [value?.meals]);

  // Notificar mudanças
  const notifyChange = (newMeals) => {
    setMeals(newMeals);
    if (onChange) {
      onChange({ meals: newMeals });
    }
  };

  // Adicionar nova refeição
  const addMeal = () => {
    const nextMealTemplate = mockMeals[meals.length % mockMeals.length];
    const newMeal = {
      id: `meal-${Date.now()}`,
      name: nextMealTemplate.name,
      time: nextMealTemplate.time,
      color: nextMealTemplate.color,
      foods: [],
      observations: ''
    };
    notifyChange([...meals, newMeal]);
  };

  // Remover refeição
  const removeMeal = (mealId) => {
    notifyChange(meals.filter(m => m.id !== mealId));
  };

  // Atualizar refeição
  const updateMeal = (mealId, field, value) => {
    notifyChange(meals.map(m => m.id === mealId ? { ...m, [field]: value } : m));
  };

  // Adicionar alimento
  const addFood = (mealId, food) => {
    notifyChange(meals.map(m => 
      m.id === mealId ? { ...m, foods: [...(m.foods || []), food] } : m
    ));
  };

  // Atualizar alimento
  const updateFood = (foodId, field, value) => {
    notifyChange(meals.map(m => ({
      ...m,
      foods: m.foods?.map(f => f.id === foodId ? { ...f, [field]: value } : f) || []
    })));
  };

  // Remover alimento
  const removeFood = (foodId) => {
    notifyChange(meals.map(m => ({
      ...m,
      foods: m.foods?.filter(f => f.id !== foodId) || []
    })));
  };

  // Calcular totais do dia
  const dayTotals = meals.reduce((acc, meal) => {
    meal.foods?.forEach(food => {
      const foodData = allFoods.find(f => f.id === food.foodId || f.id === food.food_id);
      if (foodData) {
        const mult = food.quantity / foodData.porcao;
        acc.kcal += foodData.calorias * mult;
        acc.ptn += foodData.proteina * mult;
        acc.cho += foodData.carboidrato * mult;
        acc.fat += foodData.gordura * mult;
      }
    });
    return acc;
  }, { kcal: 0, ptn: 0, cho: 0, fat: 0 });

  return (
    <div className="space-y-4">
      {/* Resumo Nutricional Premium */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-teal-800 flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-600 rounded-lg flex items-center justify-center">
              <Utensils size={12} className="text-white" />
            </div>
            Resumo Nutricional
          </h4>
          <Badge className="bg-teal-600 text-white text-xs">
            {meals.length} refeições
          </Badge>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-lg p-2 text-center shadow-sm">
            <p className="text-lg font-bold text-teal-700">{dayTotals.kcal.toFixed(0)}</p>
            <p className="text-[10px] text-gray-500 uppercase">Kcal</p>
          </div>
          <div className="bg-white rounded-lg p-2 text-center shadow-sm">
            <p className="text-lg font-bold text-blue-600">{dayTotals.ptn.toFixed(1)}g</p>
            <p className="text-[10px] text-gray-500 uppercase">Proteína</p>
          </div>
          <div className="bg-white rounded-lg p-2 text-center shadow-sm">
            <p className="text-lg font-bold text-amber-600">{dayTotals.cho.toFixed(1)}g</p>
            <p className="text-[10px] text-gray-500 uppercase">Carbo</p>
          </div>
          <div className="bg-white rounded-lg p-2 text-center shadow-sm">
            <p className="text-lg font-bold text-rose-600">{dayTotals.fat.toFixed(1)}g</p>
            <p className="text-[10px] text-gray-500 uppercase">Gordura</p>
          </div>
        </div>
      </div>

      {/* Lista de Refeições */}
      <div className="space-y-3">
        {meals.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <ChefHat className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 mb-3">Nenhuma refeição configurada</p>
            <Button onClick={addMeal} className="bg-teal-600 hover:bg-teal-700">
              <Plus size={16} className="mr-2" />
              Adicionar Primeira Refeição
            </Button>
          </div>
        ) : (
          <>
            {meals.map((meal) => (
              <MealSection
                key={meal.id}
                meal={meal}
                allFoods={allFoods}
                onUpdateMeal={updateMeal}
                onRemoveMeal={removeMeal}
                onAddFood={addFood}
                onUpdateFood={updateFood}
                onRemoveFood={removeFood}
              />
            ))}
            
            <Button
              onClick={addMeal}
              variant="outline"
              className="w-full border-dashed border-2 hover:border-teal-400 hover:bg-teal-50"
            >
              <Plus size={16} className="mr-2" />
              Adicionar Refeição
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default MealPlanEditorCompact;
