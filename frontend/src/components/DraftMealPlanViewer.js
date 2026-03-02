import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, Plus, Trash2, Edit, Save, X, Clock, Lightbulb, 
  AlertCircle, CheckCircle2, RefreshCw, ArrowRight, Download, Loader2, Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllSpecialPlans, generateSpecialMeals, detectConditionsFromAnamnesis } from '@/utils/smartAnamnesis';

/**
 * DraftMealPlanViewer - Exibe e edita o pré-plano gerado pela anamnese
 * Visível APENAS para profissionais
 */
const DraftMealPlanViewer = ({ 
  draftPlan, 
  onUpdate, 
  onRegenerate, 
  onUseAsOfficial,
  onSaveAsDraft,
  loading,
  patientId,
  anamnesis // Recebe anamnese para detecção automática
}) => {
  const [editing, setEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentVariation, setCurrentVariation] = useState(draftPlan?.variation || 1);
  const [planCategory, setPlanCategory] = useState('general'); // 'general' ou 'special'
  const [selectedSpecialPlan, setSelectedSpecialPlan] = useState(null);
  const [specialVariation, setSpecialVariation] = useState(0);

  // Carregar planos especiais
  const specialPlans = getAllSpecialPlans();

  // Detectar condições automaticamente da anamnese
  const { detectedConditions, recommendations } = detectConditionsFromAnamnesis(anamnesis, null);

  useEffect(() => {
    if (draftPlan) {
      setEditedPlan(JSON.parse(JSON.stringify(draftPlan))); // Deep copy
      setCurrentVariation(draftPlan.variation || 1);
    }
  }, [draftPlan]);

  if (!draftPlan) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-4">Nenhum pré-plano gerado ainda</p>
          <p className="text-sm text-gray-500 mb-4">
            O pré-plano será gerado automaticamente quando a anamnese for concluída
          </p>
          {onRegenerate && (
            <Button onClick={() => onRegenerate(1)} variant="outline">
              <RefreshCw className="mr-2" size={16} />
              Gerar Pré-Plano Agora
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleRegenerateVariation = (variation) => {
    setCurrentVariation(variation);
    setPlanCategory('general');
    setSelectedSpecialPlan(null);
    if (onRegenerate) {
      onRegenerate(variation);
    }
  };

  const handleSelectSpecialPlan = (plan) => {
    setSelectedSpecialPlan(plan);
    setPlanCategory('special');
    setSpecialVariation(0);
    
    // Gerar refeições do plano especial
    const specialMeals = generateSpecialMeals(plan.id, 0);
    
    if (specialMeals && editedPlan) {
      const updatedPlan = {
        ...editedPlan,
        meals: specialMeals,
        specialPlan: plan.id,
        planType: 'special',
        reasoning: `## ${plan.icon} Plano Especial: ${plan.name}\n\n${plan.description}\n\n### Diretrizes:\n${plan.guidelines.map(g => `- ${g}`).join('\n')}\n\n### Alimentos a Evitar:\n${plan.avoid.join(', ')}\n\n### Alimentos Preferidos:\n${plan.prefer.join(', ')}`
      };
      setEditedPlan(updatedPlan);
      if (onUpdate) onUpdate(updatedPlan);
      toast.success(`${plan.icon} Plano ${plan.name} aplicado!`);
    }
  };

  const handleRegenerateSpecialVariation = () => {
    if (!selectedSpecialPlan) return;
    
    const newVariation = (specialVariation + 1) % 3;
    setSpecialVariation(newVariation);
    
    const specialMeals = generateSpecialMeals(selectedSpecialPlan.id, newVariation);
    if (specialMeals && editedPlan) {
      const updatedPlan = { ...editedPlan, meals: specialMeals };
      setEditedPlan(updatedPlan);
      if (onUpdate) onUpdate(updatedPlan);
      toast.success(`Variação ${newVariation + 1} gerada!`);
    }
  };

  // Estilos gerais (existentes)
  const variationLabels = [
    { id: 1, label: 'Clássico Brasileiro', icon: '🍽️', description: 'Plano tradicional e equilibrado' },
    { id: 2, label: 'Prático e Rápido', icon: '⚡', description: 'Refeições rápidas e simples' },
    { id: 3, label: 'Proteico', icon: '💪', description: 'Foco em proteínas e ganho muscular' },
    { id: 4, label: 'Low Carb', icon: '🥑', description: 'Baixo carboidrato' },
    { id: 5, label: 'Mediterrâneo', icon: '🫒', description: 'Estilo mediterrâneo com azeite' },
    { id: 6, label: 'Fitness', icon: '🏋️', description: 'Ideal para treino intenso' }
  ];

  const handleSave = () => {
    setSaving(true);
    onUpdate(editedPlan);
    setEditing(false);
    setSaving(false);
    toast.success('Pré-plano atualizado!');
  };

  const handleSaveAsDraft = async () => {
    if (onSaveAsDraft) {
      setSaving(true);
      try {
        await onSaveAsDraft(draftPlan);
        toast.success('Rascunho salvo com sucesso!');
      } catch (error) {
        toast.error('Erro ao salvar rascunho');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setEditedPlan(JSON.parse(JSON.stringify(draftPlan)));
    setEditing(false);
  };

  const handleUseAsOfficial = () => {
    if (onUseAsOfficial) {
      onUseAsOfficial(draftPlan);
    }
  };

  const addMeal = () => {
    const newMeal = {
      id: Date.now(),
      name: 'Nova Refeição',
      time: '10:00',
      foods: [],
      editable: true
    };
    setEditedPlan({
      ...editedPlan,
      meals: [...editedPlan.meals, newMeal]
    });
  };

  const removeMeal = (mealId) => {
    setEditedPlan({
      ...editedPlan,
      meals: editedPlan.meals.filter(m => m.id !== mealId)
    });
  };

  const updateMeal = (mealId, field, value) => {
    setEditedPlan({
      ...editedPlan,
      meals: editedPlan.meals.map(m =>
        m.id === mealId ? { ...m, [field]: value } : m
      )
    });
  };

  const addFoodToMeal = (mealId) => {
    setEditedPlan({
      ...editedPlan,
      meals: editedPlan.meals.map(m =>
        m.id === mealId ? { ...m, foods: [...m.foods, ''] } : m
      )
    });
  };

  const updateFoodInMeal = (mealId, foodIndex, value) => {
    setEditedPlan({
      ...editedPlan,
      meals: editedPlan.meals.map(m =>
        m.id === mealId
          ? { ...m, foods: m.foods.map((f, i) => (i === foodIndex ? value : f)) }
          : m
      )
    });
  };

  const removeFoodFromMeal = (mealId, foodIndex) => {
    setEditedPlan({
      ...editedPlan,
      meals: editedPlan.meals.map(m =>
        m.id === mealId
          ? { ...m, foods: m.foods.filter((_, i) => i !== foodIndex) }
          : m
      )
    });
  };

  const plan = editing ? editedPlan : draftPlan;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-purple-600" size={24} />
                Pré-Plano Inteligente
              </CardTitle>
              <CardDescription>
                Gerado automaticamente pela anamnese • Visível apenas para você
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} disabled={loading}>
                    <X className="mr-2" size={16} />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} className="bg-teal-700 hover:bg-teal-800" disabled={loading}>
                    <Save className="mr-2" size={16} />
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  {onSaveAsDraft && (
                    <Button 
                      variant="outline" 
                      onClick={handleSaveAsDraft} 
                      disabled={loading || saving}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 animate-spin" size={16} />
                      ) : (
                        <Download className="mr-2" size={16} />
                      )}
                      Salvar Rascunho
                    </Button>
                  )}
                  <Button onClick={() => setEditing(true)} disabled={loading || saving} variant="outline">
                    <Edit className="mr-2" size={16} />
                    Editar
                  </Button>
                  {onUseAsOfficial && (
                    <Button 
                      onClick={handleUseAsOfficial} 
                      disabled={loading || saving}
                      className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg"
                    >
                      <ArrowRight className="mr-2" size={16} />
                      Usar como Plano Oficial
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alternativas de Cardápio */}
      {onRegenerate && !editing && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="pt-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="general" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  🍽️ Estilos Gerais
                </TabsTrigger>
                <TabsTrigger value="special" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
                  <Heart className="mr-1 h-4 w-4" /> Planos Especiais
                </TabsTrigger>
              </TabsList>

              {/* Tab: Estilos Gerais */}
              <TabsContent value="general">
                <div className="flex items-center gap-2 mb-4">
                  <RefreshCw className="text-indigo-600" size={20} />
                  <h3 className="font-semibold text-gray-800">Escolha um Estilo de Cardápio</h3>
                  {planCategory === 'general' && (
                    <Badge className="bg-indigo-100 text-indigo-700 ml-2">
                      Atual: {variationLabels.find(v => v.id === currentVariation)?.label || 'Clássico'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Clique em uma alternativa para gerar um novo cardápio com esse estilo
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {variationLabels.map((variation) => (
                    <button
                      key={variation.id}
                      onClick={() => handleRegenerateVariation(variation.id)}
                      disabled={loading || saving}
                      className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                        planCategory === 'general' && currentVariation === variation.id
                          ? 'border-indigo-500 bg-indigo-100 shadow-md'
                          : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{variation.icon}</span>
                        <span className={`font-semibold ${planCategory === 'general' && currentVariation === variation.id ? 'text-indigo-700' : 'text-gray-800'}`}>
                          {variation.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{variation.description}</p>
                      {planCategory === 'general' && currentVariation === variation.id && (
                        <Badge className="mt-2 bg-indigo-500 text-white text-xs">Selecionado</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </TabsContent>

              {/* Tab: Planos Especiais (Baseados em Condição) */}
              <TabsContent value="special">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="text-pink-600" size={20} />
                  <h3 className="font-semibold text-gray-800">Planos Especiais por Condição</h3>
                  {selectedSpecialPlan && (
                    <Badge className="bg-pink-100 text-pink-700 ml-2">
                      Atual: {selectedSpecialPlan.name}
                    </Badge>
                  )}
                </div>

                {/* ALERTA DE CONDIÇÕES DETECTADAS AUTOMATICAMENTE */}
                {detectedConditions.length > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="text-amber-600" size={20} />
                      <h4 className="font-semibold text-amber-800">🔍 Condições Detectadas na Anamnese</h4>
                    </div>
                    <p className="text-sm text-amber-700 mb-3">
                      Com base nas informações da anamnese, identificamos as seguintes condições:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.map((rec, idx) => {
                        const plan = specialPlans.find(p => p.id === rec.planId);
                        if (!plan) return null;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectSpecialPlan(plan)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white border-2 border-amber-400 rounded-lg hover:bg-amber-100 transition-all"
                          >
                            <span className="text-xl">{plan.icon}</span>
                            <div className="text-left">
                              <span className="font-semibold text-amber-900">{plan.name}</span>
                              <span className="text-xs text-amber-600 block">⚡ Recomendado</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-4">
                  Cardápios específicos para condições médicas com alimentos adequados
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {specialPlans.map((plan) => {
                    const isRecommended = detectedConditions.includes(plan.id);
                    return (
                      <button
                        key={plan.id}
                        onClick={() => handleSelectSpecialPlan(plan)}
                        disabled={loading || saving}
                        className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02] relative ${
                          selectedSpecialPlan?.id === plan.id
                            ? 'border-pink-500 bg-pink-100 shadow-md'
                            : isRecommended
                              ? 'border-amber-400 bg-amber-50 hover:border-amber-500'
                              : 'border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isRecommended && !selectedSpecialPlan && (
                          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                            ⚡ Sugerido
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{plan.icon}</span>
                          <span className={`font-semibold text-sm ${selectedSpecialPlan?.id === plan.id ? 'text-pink-700' : isRecommended ? 'text-amber-800' : 'text-gray-800'}`}>
                            {plan.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{plan.description}</p>
                        {selectedSpecialPlan?.id === plan.id && (
                          <Badge className="mt-2 bg-pink-500 text-white text-xs">Selecionado</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Botão de regenerar variação do plano especial */}
                {selectedSpecialPlan && (
                  <div className="mt-4 pt-4 border-t border-pink-200">
                    <Button 
                      variant="outline" 
                      onClick={handleRegenerateSpecialVariation}
                      disabled={loading}
                      className="border-pink-300 text-pink-700 hover:bg-pink-50"
                    >
                      <RefreshCw className="mr-2" size={16} />
                      Gerar Nova Variação ({specialVariation + 1}/3)
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Cada plano especial tem 3 variações de cardápio
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {loading && (
              <div className="flex items-center justify-center mt-4 text-indigo-600">
                <Loader2 className="animate-spin mr-2" size={20} />
                Gerando nova alternativa...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Raciocínio */}
      {plan.reasoning && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-purple-600 flex-shrink-0" size={20} />
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900 mb-2">Análise Automática</h4>
                <p className="text-sm text-purple-800 whitespace-pre-line">{plan.reasoning}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refeições */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Refeições Sugeridas</CardTitle>
            {editing && (
              <Button onClick={addMeal} variant="outline" size="sm">
                <Plus className="mr-2" size={16} />
                Adicionar Refeição
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan.meals?.map((meal, index) => (
            <div key={meal.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  {editing ? (
                    <>
                      <Input
                        value={meal.name}
                        onChange={(e) => updateMeal(meal.id, 'name', e.target.value)}
                        className="max-w-xs"
                      />
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-500" />
                        <Input
                          type="time"
                          value={meal.time}
                          onChange={(e) => updateMeal(meal.id, 'time', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-gray-900">{meal.name}</h4>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock size={14} />
                        {meal.time}
                      </div>
                    </>
                  )}
                </div>
                {editing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMeal(meal.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {meal.foods?.map((food, foodIndex) => {
                  // Handle both string and object format for foods
                  const foodName = typeof food === 'string' ? food : food?.name || '';
                  const foodQuantity = typeof food === 'object' && food?.quantity ? `${food.quantity} ${food.unit || ''}`.trim() : '';
                  
                  return (
                    <div key={foodIndex} className="flex items-center gap-2">
                      {editing ? (
                        <>
                          <Input
                            value={foodName}
                            onChange={(e) => updateFoodInMeal(meal.id, foodIndex, e.target.value)}
                            placeholder="Nome do alimento"
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFoodFromMeal(meal.id, foodIndex)}
                            className="text-red-600"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-green-600" />
                          <span className="text-sm text-gray-700">
                            {foodName}
                            {foodQuantity && <span className="text-gray-500 ml-1">({foodQuantity})</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addFoodToMeal(meal.id)}
                    className="mt-2"
                  >
                    <Plus size={14} className="mr-2" />
                    Adicionar Alimento
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Alimentos Recomendados */}
      {plan.recommendedFoods && plan.recommendedFoods.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2">
              <CheckCircle2 size={20} />
              Alimentos Recomendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {plan.recommendedFoods.map((food, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                  {food}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alimentos a Evitar */}
      {plan.foodsToAvoid && plan.foodsToAvoid.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle size={20} />
              Alimentos a Evitar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.foodsToAvoid.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <X size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-red-900">{item.food}</span>
                    {item.reason && (
                      <span className="text-sm text-red-700 ml-2">- {item.reason}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DraftMealPlanViewer;
