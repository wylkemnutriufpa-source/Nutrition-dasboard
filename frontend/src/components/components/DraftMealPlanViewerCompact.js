import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, Plus, Trash2, Edit, Save, X, Clock, Lightbulb, 
  AlertCircle, CheckCircle2, RefreshCw, ArrowRight, Download, Loader2, Heart,
  ChevronDown, ChevronUp, Utensils, Calendar, History, Eye, FileText, Copy, Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getAllSpecialPlans, generateSpecialMeals, detectConditionsFromAnamnesis, addSubstitutionsToFoods } from '@/utils/smartAnamnesis';
import MealPlanTimeline from '@/components/MealPlanTimeline';
import { Panel, Group, Separator } from 'react-resizable-panels';
import EnergyCalculatorModal from '@/components/EnergyCalculatorModal';
import PlanConfigurationModal from '@/components/PlanConfigurationModal';

/**
 * DraftMealPlanViewerCompact - Versão PREMIUM COMPACTA
 * Layout otimizado: 2 colunas, botões menores, accordions
 */
const DraftMealPlanViewerCompact = ({ 
  draftPlan, 
  onUpdate, 
  onRegenerate, 
  onUseAsOfficial,
  onSaveAsDraft,
  loading,
  patientId,
  anamnesis,
  physicalAssessment,
  patient,
  professionalId,
  allMealPlans = [],
  currentMealPlan,
  onNavigateToPlan,
  onPlanCreated,
  onEditPlan,
  onViewPlan,
  onExportPDF,
  onCreatePlan
}) => {
  const [editing, setEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentVariation, setCurrentVariation] = useState(draftPlan?.variation || 1);
  const [planCategory, setPlanCategory] = useState('general');
  const [selectedSpecialPlan, setSelectedSpecialPlan] = useState(null);
  const [specialVariation, setSpecialVariation] = useState(0);
  const [showRecommended, setShowRecommended] = useState(false);
  const [showAvoid, setShowAvoid] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showEnergyCalculator, setShowEnergyCalculator] = useState(false);
  const [showPlanConfig, setShowPlanConfig] = useState(false);
  const [selectedPlanSlot, setSelectedPlanSlot] = useState(null); // 1, 2 ou 3
  
  // Estado dos 3 planos programados
  const [savedPlans, setSavedPlans] = useState({
    1: null,
    2: null,
    3: null
  });

  const specialPlans = getAllSpecialPlans();
  const { detectedConditions, recommendations } = detectConditionsFromAnamnesis(anamnesis, null);

  // Carregar planos salvos do localStorage
  useEffect(() => {
    if (patientId) {
      const storageKey = `scheduled_plans_${patientId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setSavedPlans(JSON.parse(stored));
        } catch (err) {
          console.error('Erro ao carregar planos:', err);
        }
      }
    }
  }, [patientId]);

  // Salvar planos no localStorage quando mudarem
  useEffect(() => {
    if (patientId) {
      const storageKey = `scheduled_plans_${patientId}`;
      localStorage.setItem(storageKey, JSON.stringify(savedPlans));
    }
  }, [savedPlans, patientId]);

  useEffect(() => {
    if (draftPlan) {
      setEditedPlan(JSON.parse(JSON.stringify(draftPlan)));
      setCurrentVariation(draftPlan.variation || 1);
    }
  }, [draftPlan]);

  if (!draftPlan) {
    return (
      <div className="text-center py-8">
        <Sparkles className="mx-auto text-gray-300 mb-3" size={32} />
        <p className="text-sm text-gray-500 mb-3">Nenhum IA Plan gerado ainda</p>
        {onRegenerate && (
          <Button onClick={() => onRegenerate(1)} size="sm" variant="outline">
            <RefreshCw className="mr-2" size={14} />
            Gerar Agora
          </Button>
        )}
      </div>
    );
  }

  const variationLabels = [
    { id: 1, label: 'Clássico BR', icon: '🍽️' },
    { id: 2, label: 'Rápido', icon: '⚡' },
    { id: 3, label: 'Proteico', icon: '💪' },
    { id: 4, label: 'Low Carb', icon: '🥑' },
    { id: 5, label: 'Mediterrâneo', icon: '🫒' },
    { id: 6, label: 'Fitness', icon: '🏋️' }
  ];

  const handleRegenerateVariation = (variation) => {
    setCurrentVariation(variation);
    setPlanCategory('general');
    setSelectedSpecialPlan(null);
    if (onRegenerate) onRegenerate(variation);
  };

  const handleSelectSpecialPlan = (plan) => {
    setSelectedSpecialPlan(plan);
    setPlanCategory('special');
    setSpecialVariation(0);
    
    const specialMeals = generateSpecialMeals(plan.id, 0);
    if (specialMeals && editedPlan) {
      const updatedPlan = {
        ...editedPlan,
        meals: specialMeals,
        specialPlan: plan.id,
        planType: 'special',
        reasoning: `## ${plan.icon} ${plan.name}\n\n${plan.description}`
      };
      setEditedPlan(updatedPlan);
      if (onUpdate) onUpdate(updatedPlan);
      toast.success(`${plan.icon} ${plan.name} aplicado!`);
    }
  };

  const handleSave = () => {
    setSaving(true);
    onUpdate(editedPlan);
    setEditing(false);
    setSaving(false);
    toast.success('Atualizado!');
  };

  const handleUseAsOfficial = () => {
    if (onUseAsOfficial) {
      onUseAsOfficial(draftPlan);
    }
  };

  const handleSaveAsTemplate = async () => {
    try {
      // Aqui você pode adicionar a lógica para salvar como template
      // Por enquanto, só mostra um toast
      toast.success('💾 Plano salvo como modelo!');
    } catch (error) {
      toast.error('Erro ao salvar como modelo');
    }
  };

  const addMeal = () => {
    const newMeal = {
      id: Date.now(),
      name: 'Nova Refeição',
      time: '10:00',
      foods: []
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

  const plan = editing ? editedPlan : draftPlan;

  return (
    <div className="space-y-4">
      
      {/* ========== HEADER COMPACTO ========== */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5">
            {planCategory === 'special' && selectedSpecialPlan 
              ? `${selectedSpecialPlan.icon} ${selectedSpecialPlan.name}`
              : `${variationLabels.find(v => v.id === currentVariation)?.icon} ${variationLabels.find(v => v.id === currentVariation)?.label}`
            }
          </Badge>
          {plan.reasoning && (
            <button 
              onClick={() => setShowReasoning(!showReasoning)}
              className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1"
            >
              <Lightbulb size={12} />
              {showReasoning ? 'Ocultar' : 'Ver'} Análise
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X size={14} />
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Save size={14} className="mr-1" />
                Salvar
              </Button>
            </>
          ) : (
            <>
              {onSaveAsDraft && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onSaveAsDraft}
                  className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Download size={12} className="mr-1" />
                  Rascunho
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Edit size={12} className="mr-1" />
                Editar
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSaveAsTemplate}
                className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Copy size={12} className="mr-1" />
                Salvar como Modelo
              </Button>
              {onUseAsOfficial && (
                <Button 
                  size="sm"
                  onClick={handleUseAsOfficial}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs"
                >
                  <ArrowRight size={12} className="mr-1" />
                  Usar como Oficial
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========== ANÁLISE (ACCORDION) ========== */}
      {showReasoning && plan.reasoning && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
          <p className="text-xs text-violet-800 whitespace-pre-line leading-relaxed">{plan.reasoning}</p>
        </div>
      )}

      {/* ========== ESTILOS DE CARDÁPIO (COMPACTO) ========== */}
      {onRegenerate && !editing && (
        <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
          <CardContent className="p-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8 mb-3">
                <TabsTrigger value="general" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  🍽️ Estilos
                </TabsTrigger>
                <TabsTrigger value="special" className="text-xs data-[state=active]:bg-pink-600 data-[state=active]:text-white">
                  💊 Especiais
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-0">
                <div className="grid grid-cols-3 gap-2">
                  {variationLabels.map((variation) => (
                    <button
                      key={variation.id}
                      onClick={() => handleRegenerateVariation(variation.id)}
                      disabled={loading}
                      className={`p-2 rounded-lg border text-xs transition-all ${
                        planCategory === 'general' && currentVariation === variation.id
                          ? 'border-indigo-500 bg-indigo-100 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <div className="text-lg mb-0.5">{variation.icon}</div>
                      <div className="font-medium text-[10px] leading-tight">{variation.label}</div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="special" className="mt-0">
                {detectedConditions.length > 0 && (
                  <div className="mb-3 p-2 bg-amber-50 border border-amber-300 rounded-lg">
                    <p className="text-[10px] text-amber-800 font-medium mb-2">🔍 Detectado na anamnese:</p>
                    <div className="flex flex-wrap gap-1">
                      {recommendations.map((rec, idx) => {
                        const plan = specialPlans.find(p => p.id === rec.planId);
                        if (!plan) return null;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectSpecialPlan(plan)}
                            className="text-[10px] px-2 py-1 bg-white border border-amber-400 rounded hover:bg-amber-100"
                          >
                            {plan.icon} {plan.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {specialPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handleSelectSpecialPlan(plan)}
                      disabled={loading}
                      className={`p-2 rounded-lg border text-xs transition-all ${
                        selectedSpecialPlan?.id === plan.id
                          ? 'border-pink-500 bg-pink-100 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-pink-300'
                      }`}
                    >
                      <div className="text-lg mb-0.5">{plan.icon}</div>
                      <div className="font-medium text-[10px] leading-tight">{plan.name}</div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ========== LAYOUT RESIZABLE: REFEIÇÕES | DASHBOARD (LADO A LADO) ========== */}
      <Group direction="horizontal" style={{ minHeight: '600px' }}>
        
        {/* PAINEL: REFEIÇÕES (Arrastável) */}
        <Panel defaultSize={40} minSize={25} maxSize={60} className="bg-white">
          <div className="p-4 space-y-3 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Utensils size={16} className="text-violet-600" />
              Refeições Sugeridas
            </h4>
            {editing && (
              <Button onClick={addMeal} size="sm" variant="outline" className="h-7 text-xs">
                <Plus size={12} className="mr-1" />
                Adicionar
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            {plan.meals?.map((meal) => (
              <div key={meal.id} className="p-3 border rounded-xl bg-white hover:border-violet-200 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {editing ? (
                      <>
                        <Input
                          value={meal.name}
                          onChange={(e) => updateMeal(meal.id, 'name', e.target.value)}
                          className="h-7 text-sm max-w-[180px]"
                        />
                        <Input
                          type="time"
                          value={meal.time}
                          onChange={(e) => updateMeal(meal.id, 'time', e.target.value)}
                          className="h-7 text-sm w-24"
                        />
                      </>
                    ) : (
                      <>
                        <h5 className="font-semibold text-sm text-gray-900">{meal.name}</h5>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={12} />
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
                      className="h-6 w-6 p-0 text-red-500"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {meal.foods?.map((food, foodIndex) => {
                    const foodName = typeof food === 'string' ? food : food?.name || '';
                    const foodsWithSubs = addSubstitutionsToFoods([foodName]);
                    const foodData = foodsWithSubs[0];
                    
                    return (
                      <div key={foodIndex} className="group">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-gray-700 leading-relaxed">{foodData.name}</span>
                            {foodData.substitutions && foodData.substitutions.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <span className="text-[10px] text-violet-600 font-medium">🔄</span>
                                {foodData.substitutions.map((sub, subIdx) => (
                                  <span key={subIdx}>
                                    <button
                                      className="text-[10px] text-violet-600 hover:text-violet-800 hover:underline"
                                      onClick={() => {
                                        if (editing) {
                                          // Substituir o alimento
                                          const updatedFoods = [...meal.foods];
                                          updatedFoods[foodIndex] = sub;
                                          updateMeal(meal.id, 'foods', updatedFoods);
                                          toast.success(`Substituído por ${sub}!`);
                                        } else {
                                          toast.info(`Sugestão: ${sub}`);
                                        }
                                      }}
                                    >
                                      {sub}
                                    </button>
                                    {subIdx < foodData.substitutions.length - 1 && (
                                      <span className="text-[10px] text-gray-400 mx-1">|</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>
          </div>
        </Panel>

        {/* DIVISOR ARRASTÁVEL VERTICAL (entre painéis lado a lado) */}
        <Separator className="w-2 bg-gradient-to-b from-violet-200 via-purple-300 to-violet-200 hover:w-3 hover:bg-gradient-to-b hover:from-violet-400 hover:via-purple-500 hover:to-violet-400 transition-all cursor-col-resize flex items-center justify-center">
          <div className="w-1 h-8 rounded-full bg-white/80 shadow" />
        </Separator>

        {/* PAINEL: DASHBOARD (Arrastável) */}
        <Panel defaultSize={60} minSize={40} maxSize={75} className="bg-gray-50/50">
          <div className="p-4 space-y-3 h-full overflow-y-auto">
            
            {/* Botões de Ação no Topo da Dashboard */}
            <div className="flex gap-2 mb-3">
              {plan.reasoning && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="text-xs border-violet-300 text-violet-700 hover:bg-violet-50"
                >
                  <Lightbulb size={12} className="mr-1" />
                  {showReasoning ? 'Ocultar' : 'Ver'} Análise
                </Button>
              )}
              <Button 
                size="sm"
                variant="outline"
                className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => setShowEnergyCalculator(true)}
              >
                <Calculator size={12} className="mr-1" />
                Cálculo Energético
              </Button>
            </div>

            {/* Análise (se visível) */}
            {showReasoning && plan.reasoning && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 mb-3">
                <p className="text-xs text-violet-800 whitespace-pre-line leading-relaxed">{plan.reasoning}</p>
              </div>
            )}
          
          {/* ========== PLANO OFICIAL ========== */}
          {currentMealPlan ? (
            <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-full -translate-y-12 translate-x-12" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                      <Utensils size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{currentMealPlan.name}</h4>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(currentMealPlan.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs px-2 py-0.5">
                    <CheckCircle2 size={10} className="mr-1" /> Ativo
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-gray-200"
                    onClick={() => onExportPDF?.()}
                  >
                    <Download size={12} className="mr-1" /> PDF
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => onViewPlan?.()}
                  >
                    <Eye size={12} className="mr-1" /> Visualizar
                  </Button>
                  <Button 
                    size="sm"
                    className="flex-1 text-xs h-7 bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:opacity-90"
                    onClick={() => onEditPlan?.()}
                  >
                    <Edit size={12} className="mr-1" /> Editar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center bg-white">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <Utensils size={20} className="text-gray-400" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Nenhum plano ativo</h4>
              <p className="text-xs text-gray-500 mb-3">Crie um plano personalizado</p>
              <Button 
                size="sm"
                className="text-xs h-7 bg-gradient-to-r from-teal-600 to-emerald-600 text-white"
                onClick={() => onCreatePlan?.()}
              >
                <Plus size={12} className="mr-1" /> Criar Plano
              </Button>
            </div>
          )}
          
          {/* ========== SUGESTÕES PERSONALIZADAS: UTILIZAR ========== */}
          {plan.recommendedFoods && plan.recommendedFoods.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
              <button
                onClick={() => setShowRecommended(!showRecommended)}
                className="w-full flex items-center justify-between p-3 hover:bg-emerald-100/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-emerald-900">Sugestões personalizadas</p>
                    <p className="text-[10px] text-emerald-700">Utilizar</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">
                    {plan.recommendedFoods.length}
                  </Badge>
                </div>
                {showRecommended ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />}
              </button>
              {showRecommended && (
                <div className="p-3 pt-0">
                  <div className="flex flex-wrap gap-1">
                    {plan.recommendedFoods.map((food, index) => (
                      <Badge key={index} className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5">
                        {food}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== SUGESTÕES PERSONALIZADAS: EVITAR ========== */}
          {plan.foodsToAvoid && plan.foodsToAvoid.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
              <button
                onClick={() => setShowAvoid(!showAvoid)}
                className="w-full flex items-center justify-between p-3 hover:bg-red-100/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <AlertCircle size={14} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-red-900">Sugestões personalizadas</p>
                    <p className="text-[10px] text-red-700">Evitar</p>
                  </div>
                  <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">
                    {plan.foodsToAvoid.length}
                  </Badge>
                </div>
                {showAvoid ? <ChevronUp size={14} className="text-red-600" /> : <ChevronDown size={14} className="text-red-600" />}
              </button>
              {showAvoid && (
                <div className="p-3 pt-0 space-y-1.5">
                  {plan.foodsToAvoid.map((item, index) => (
                    <div key={index} className="flex items-start gap-1.5">
                      <X size={12} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-red-900">
                        <span className="font-medium">{item.food}</span>
                        {item.reason && (
                          <span className="text-red-700 block text-[10px] mt-0.5">{item.reason}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== MULTI-PLANOS TIMELINE ========== */}
          {professionalId && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 overflow-hidden">
              <div className="p-3 bg-indigo-100/50 border-b border-indigo-200">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-900">Programação</span>
                </div>
              </div>
              <div className="p-3">
                <MealPlanTimeline 
                  patientId={patientId}
                  professionalId={professionalId}
                  userRole="professional"
                  onPlanCreated={onPlanCreated}
                  compact={true}
                />
              </div>
            </div>
          )}

          {/* ========== PLANOS PROGRAMADOS (PLAN 1, 2, 3) ========== */}
          {professionalId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700">Planos Futuros</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (confirm('🗑️ Limpar TODOS os planos salvos?')) {
                        setSavedPlans({ 1: null, 2: null, 3: null });
                        localStorage.removeItem(`scheduled_plans_${patientId}`);
                        toast.success('✅ Todos os planos limpos!');
                      }
                    }}
                    className="text-[10px] text-red-600 hover:text-red-800 underline"
                  >
                    Limpar tudo
                  </button>
                  <Badge className="bg-violet-100 text-violet-700 text-[10px] px-2 py-0">
                    PRO
                  </Badge>
                </div>
              </div>
              
              {[1, 2, 3].map((planNumber) => {
                const planData = savedPlans[planNumber];
                const isEmpty = !planData;
                
                return (
                  <div key={planNumber} className={`rounded-xl border-2 ${isEmpty ? 'border-dashed border-gray-300' : 'border-solid border-violet-300 bg-violet-50/50'} p-3 transition-all`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                          {planNumber}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">Plan {planNumber}</p>
                          {isEmpty ? (
                            <p className="text-[10px] text-gray-500">Clique para configurar</p>
                          ) : (
                            <p className="text-[10px] text-violet-700">✅ Configurado</p>
                          )}
                        </div>
                      </div>
                      
                      {isEmpty ? (
                        <Plus size={16} className="text-gray-400" />
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0">
                          <CheckCircle2 size={10} className="mr-1" /> Ativo
                        </Badge>
                      )}
                    </div>

                    {/* Resumo do Plano (se preenchido) */}
                    {!isEmpty && planData && (
                      <div className="mt-2 p-2 bg-white rounded-lg border border-violet-200">
                        <div className="space-y-1 text-[10px]">
                          <p className="text-gray-700">
                            <strong>Objetivo:</strong> {planData.plan?.goal || 'N/A'}
                          </p>
                          <p className="text-gray-700">
                            <strong>Refeições:</strong> {planData.plan?.meals?.length || 0}
                          </p>
                          <p className="text-gray-700">
                            <strong>Ativação:</strong> {planData.automation?.activationDate ? new Date(planData.automation.activationDate).toLocaleDateString('pt-BR') : 'Não definida'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-[10px]"
                        onClick={() => {
                          console.log('🔵 Clicou no botão Plan', planNumber);
                          console.log('🔵 showPlanConfig antes:', showPlanConfig);
                          setSelectedPlanSlot(planNumber);
                          setShowPlanConfig(true);
                          console.log('🔵 State atualizado:', { planNumber, showPlanConfig: true });
                        }}
                      >
                        {isEmpty ? <Plus size={10} className="mr-1" /> : <Edit size={10} className="mr-1" />}
                        {isEmpty ? 'Criar' : 'Editar'}
                      </Button>
                      {!isEmpty && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Deseja excluir o Plan ${planNumber}?`)) {
                              setSavedPlans({...savedPlans, [planNumber]: null});
                              toast.success(`Plan ${planNumber} excluído!`);
                            }
                          }}
                        >
                          <Trash2 size={10} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========== HISTÓRICO DE PLANOS ========== */}
          {allMealPlans && allMealPlans.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
              <div className="p-3 bg-gray-100 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <History size={14} className="text-gray-600" />
                  <span className="text-sm font-semibold text-gray-900">Histórico</span>
                  <Badge className="bg-gray-200 text-gray-700 text-[10px] px-1.5 py-0">
                    {allMealPlans.filter(p => p.id !== currentMealPlan?.id).length}
                  </Badge>
                </div>
              </div>
              <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                {allMealPlans.filter(p => p.id !== currentMealPlan?.id).map(plan => (
                  <button 
                    key={plan.id}
                    className="w-full flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-teal-200 hover:bg-teal-50 transition-all group text-left"
                    onClick={() => onNavigateToPlan?.(plan.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 text-xs truncate">{plan.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-gray-300 group-hover:text-teal-500 flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          </div>
        </Panel>
      </Group>

      {loading && (
        <div className="flex items-center justify-center py-4 text-violet-600">
          <Loader2 className="animate-spin mr-2" size={16} />
          <span className="text-sm">Gerando...</span>
        </div>
      )}

      {/* Modal Cálculo Energético */}
      <EnergyCalculatorModal
        open={showEnergyCalculator}
        onClose={() => setShowEnergyCalculator(false)}
        patient={patient}
        anamnesis={anamnesis}
        physicalAssessment={physicalAssessment}
        onApplyCalories={async (results) => {
          // Formatar como daily_targets
          const dailyTargets = {
            kcal: results.tdee,
            protein_g: results.macros?.protein?.grams || 0,
            carbs_g: results.macros?.carbs?.grams || 0,
            fat_g: results.macros?.fat?.grams || 0,
            fiber_g: 25, // Recomendação padrão
            water_ml: Math.round((parseFloat(results.weight) || 70) * 35),
            bmr: results.bmr,
            created_from: 'calculator',
            formula: results.formula || 'mifflin',
            updated_at: new Date().toISOString()
          };

          // Identificar meal_plan atual
          let mealPlanId = currentMealPlan?.id;

          try {
            if (mealPlanId) {
              // Atualizar plano existente
              const { error } = await supabase
                .from('meal_plans')
                .update({ daily_targets: dailyTargets, updated_at: new Date().toISOString() })
                .eq('id', mealPlanId);
              if (error) throw error;
              toast.success(`✅ Metas aplicadas ao plano! ${results.tdee} kcal/dia`);
            } else if (patientId) {
              // Buscar plano ativo ou criar draft
              const { data: activePlan } = await supabase
                .from('meal_plans')
                .select('id')
                .eq('patient_id', patientId)
                .eq('is_active', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (activePlan) {
                mealPlanId = activePlan.id;
                const { error } = await supabase
                  .from('meal_plans')
                  .update({ daily_targets: dailyTargets, updated_at: new Date().toISOString() })
                  .eq('id', mealPlanId);
                if (error) throw error;
                toast.success(`✅ Metas aplicadas ao plano ativo! ${results.tdee} kcal/dia`);
              } else {
                // Criar meal_plan inicial como draft
                const { data: newPlan, error } = await supabase
                  .from('meal_plans')
                  .insert({
                    id: crypto.randomUUID(),
                    patient_id: patientId,
                    professional_id: professionalId,
                    name: 'Plano Atual',
                    plan_status: 'draft',
                    is_active: true,
                    daily_targets: dailyTargets,
                    plan_data: { meals: [] }
                  })
                  .select()
                  .single();
                if (error) throw error;
                toast.success(`✅ Plano criado com metas! ${results.tdee} kcal/dia`);
              }
            }
          } catch (err) {
            console.error('Erro ao aplicar metas:', err);
            toast.error('Erro ao salvar metas no plano. Verifique o console.');
          }
        }}
      />

      {/* Modal Configuração de Plan 1, 2, 3 */}
      {showPlanConfig && selectedPlanSlot && (
        <>
          {console.log('🟢 Renderizando PlanConfigurationModal:', { showPlanConfig, selectedPlanSlot, patientId })}
          <PlanConfigurationModal
          open={showPlanConfig}
          onClose={() => {
            setShowPlanConfig(false);
            setSelectedPlanSlot(null);
          }}
          planNumber={selectedPlanSlot}
          patientId={patientId}
          anamnesis={anamnesis}
          existingPlan={savedPlans[selectedPlanSlot]}
          onSave={(planConfig) => {
            console.log('Plan configurado:', planConfig);
            
            // Salvar no estado
            setSavedPlans({
              ...savedPlans,
              [planConfig.planNumber]: planConfig
            });
            
            toast.success(`✅ Plan ${planConfig.planNumber} salvo com sucesso!`);
            setShowPlanConfig(false);
            setSelectedPlanSlot(null);
          }}
        />
        </>
      )}
    </div>
  );
};

export default DraftMealPlanViewerCompact;
