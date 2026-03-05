/**
 * IAPlanGeneratorModal.js
 * Modal compacto para gerar IA Plan direto no Programador
 * - Identifica contexto: Plano Principal vs Plan 1/2/3
 * - Tela menor para uso dentro do programador
 * - Integra com DraftMealPlanViewer simplificado
 */
import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Wand2, Loader2, RefreshCw, ChevronRight, Clock,
  Target, Utensils, CheckCircle2, AlertCircle, Heart, Brain,
  Dumbbell, Apple, Salad, Plus, Trash2, Edit, Save, X, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getAnamnesis, saveDraftMealPlan, getDraftMealPlan } from '@/lib/supabase';
import { generateSmartMealPlan } from '@/utils/smartAnamnesis';
import { calculateMealTotals } from '@/utils/nutritionCalculator';
import { mockFoods } from '@/data/mockData';

// Tipos de plano
const PLAN_TYPES = [
  { id: 'emagrecimento', label: 'Emagrecimento', icon: '🔥', color: 'from-orange-500 to-red-500' },
  { id: 'hipertrofia', label: 'Hipertrofia', icon: '💪', color: 'from-blue-500 to-indigo-600' },
  { id: 'manutencao', label: 'Manutenção', icon: '⚖️', color: 'from-emerald-500 to-teal-600' },
  { id: 'saude', label: 'Saúde Geral', icon: '🌱', color: 'from-green-500 to-lime-600' },
  { id: 'diabetes', label: 'Diabético', icon: '💉', color: 'from-purple-500 to-violet-600' },
  { id: 'gestante', label: 'Gestante', icon: '🤰', color: 'from-pink-500 to-rose-500' }
];

// Preview de refeição compacto
const MealPreview = ({ meal, allFoods, onEdit, onRemove }) => {
  const totals = calculateMealTotals(meal.foods || [], allFoods);
  
  return (
    <div className="p-3 border rounded-xl bg-white hover:border-teal-300 transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${meal.color || '#0F766E'}20` }}
          >
            <Utensils size={14} style={{ color: meal.color || '#0F766E' }} />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{meal.name}</p>
            <p className="text-[10px] text-gray-500">{meal.time} • {meal.foods?.length || 0} alimentos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-teal-100 text-teal-700 text-[10px]">{totals.kcal} kcal</Badge>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onEdit?.(meal)}>
              <Edit size={12} />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => onRemove?.(meal.id)}>
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Principal
const IAPlanGeneratorModal = ({
  open,
  onOpenChange,
  patientId,
  professionalId,
  planContext = 'main', // 'main' | 'scheduled-1' | 'scheduled-2' | etc.
  planIndex = 0,
  onPlanGenerated
}) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState('config'); // 'config' | 'preview' | 'edit'
  const [anamnesis, setAnamnesis] = useState(null);
  const [patient, setPatient] = useState(null);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [allFoods] = useState([...mockFoods]);
  
  // Configurações
  const [selectedType, setSelectedType] = useState('emagrecimento');
  const [variation, setVariation] = useState(1);
  const [calorieTarget, setCalorieTarget] = useState('');
  
  // Contexto visual
  const contextLabel = planContext === 'main' 
    ? 'Plano Principal' 
    : `IA Plan ${planIndex + 1}`;
  
  const contextColor = planContext === 'main'
    ? 'from-emerald-500 to-teal-600'
    : 'from-violet-500 to-purple-600';

  // Carregar dados do paciente
  const loadPatientData = useCallback(async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      // Carregar paciente
      const { data: patientData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (patientData) setPatient(patientData);
      
      // Carregar anamnese
      const { data: anamData } = await getAnamnesis(patientId);
      if (anamData) setAnamnesis(anamData);
      
      // Carregar draft existente se houver
      const { data: draft } = await getDraftMealPlan(patientId);
      if (draft) setGeneratedPlan(draft);
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (open && patientId) {
      loadPatientData();
    }
  }, [open, patientId, loadPatientData]);

  // Gerar plano com IA
  const handleGenerate = async () => {
    if (!anamnesis) {
      toast.error('Paciente precisa ter anamnese preenchida');
      return;
    }
    
    setGenerating(true);
    try {
      // Gerar plano usando IA
      const smartPlan = generateSmartMealPlan(anamnesis, patient, variation);
      
      // Aplicar meta calórica personalizada se definida
      if (calorieTarget && !isNaN(parseInt(calorieTarget))) {
        smartPlan.targetCalories = parseInt(calorieTarget);
      }
      
      // Salvar no banco
      const { data: savedDraft, error } = await saveDraftMealPlan(patientId, professionalId, smartPlan);
      
      if (error) {
        console.error('Erro ao salvar IA Plan:', error);
        // Ainda assim mostra o plano
        setGeneratedPlan(smartPlan);
      } else {
        setGeneratedPlan(savedDraft || smartPlan);
      }
      
      setStep('preview');
      toast.success(`🤖 IA Plan gerado para ${contextLabel}!`);
      
      // Notificar parent imediatamente após gerar
      if (onPlanGenerated && smartPlan) {
        onPlanGenerated({
          name: `IA Plan - ${PLAN_TYPES.find(t => t.id === selectedType)?.label || selectedType}`,
          goal: selectedType,
          meals: smartPlan.meals || [],
          calories: smartPlan.targetCalories || calorieTarget,
          reasoning: smartPlan.reasoning || '',
          recommendedFoods: smartPlan.recommendedFoods || [],
          foodsToAvoid: smartPlan.foodsToAvoid || [],
          variation: variation,
          generatedAt: new Date().toISOString()
        });
      }
      
    } catch (err) {
      console.error('Erro ao gerar plano:', err);
      toast.error('Erro ao gerar IA Plan');
    } finally {
      setGenerating(false);
    }
  };

  // Usar plano gerado
  const handleUsePlan = () => {
    if (!generatedPlan) return;
    
    onPlanGenerated?.({
      name: `IA Plan - ${selectedType}`,
      plan_data: {
        meals: generatedPlan.meals || []
      },
      description: generatedPlan.reasoning?.substring(0, 200) || '',
      targetCalories: generatedPlan.targetCalories,
      planType: selectedType
    });
    
    onOpenChange(false);
    toast.success(`IA Plan aplicado ao ${contextLabel}!`);
  };

  // Regenerar variação
  const handleRegenerate = () => {
    setVariation(v => (v % 3) + 1);
    handleGenerate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        {/* Header com contexto */}
        <DialogHeader className={`p-4 bg-gradient-to-r ${contextColor}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              {planContext === 'main' ? (
                <Target size={20} className="text-white" />
              ) : (
                <span className="text-lg font-bold text-white">{planIndex + 1}</span>
              )}
            </div>
            <div className="text-white">
              <DialogTitle className="text-white text-lg flex items-center gap-2">
                <Wand2 size={18} />
                IA Plan Generator
              </DialogTitle>
              <DialogDescription className="text-white/80 text-sm">
                Gerando para: <strong>{contextLabel}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4">
            
            {/* Loading inicial */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-3" />
                <p className="text-gray-500">Carregando dados do paciente...</p>
              </div>
            )}

            {/* Step: Configuração */}
            {!loading && step === 'config' && (
              <div className="space-y-4">
                
                {/* Alerta se não tem anamnese */}
                {!anamnesis && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800">Anamnese não encontrada</p>
                      <p className="text-sm text-amber-700">
                        Para gerar um plano personalizado, o paciente precisa ter a anamnese preenchida.
                      </p>
                    </div>
                  </div>
                )}

                {/* Info do paciente */}
                {patient && (
                  <Card className="border-2 border-teal-200">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <span className="text-teal-700 font-bold">{patient.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{patient.name}</p>
                          <p className="text-xs text-gray-500">
                            {anamnesis ? '✅ Anamnese completa' : '⚠️ Sem anamnese'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tipo de plano */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Objetivo do Plano</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PLAN_TYPES.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          selectedType === type.id
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-teal-300'
                        }`}
                      >
                        <span className="text-xl">{type.icon}</span>
                        <p className="text-xs font-medium text-gray-700 mt-1">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meta calórica */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Meta Calórica (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Ex: 1800"
                      value={calorieTarget}
                      onChange={(e) => setCalorieTarget(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-gray-500 self-center">kcal/dia</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Deixe em branco para calcular automaticamente
                  </p>
                </div>

                {/* Variação */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Variação do Cardápio</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(v => (
                      <Button
                        key={v}
                        variant={variation === v ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVariation(v)}
                        className={variation === v ? 'bg-teal-600' : ''}
                      >
                        Versão {v}
                      </Button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Step: Preview do plano gerado */}
            {!loading && step === 'preview' && generatedPlan && (
              <div className="space-y-4">
                
                {/* Resumo */}
                <div className="grid grid-cols-4 gap-2">
                  <Card className="border-0 bg-teal-50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-teal-700">{generatedPlan.targetCalories || '--'}</p>
                      <p className="text-[10px] text-gray-500">kcal/dia</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-blue-50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-blue-700">{generatedPlan.meals?.length || 0}</p>
                      <p className="text-[10px] text-gray-500">Refeições</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-purple-50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-purple-700">{generatedPlan.proteinTarget || '--'}g</p>
                      <p className="text-[10px] text-gray-500">Proteína</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-amber-50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-amber-700">V{variation}</p>
                      <p className="text-[10px] text-gray-500">Variação</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Refeições */}
                <div>
                  <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Utensils size={14} className="text-teal-600" />
                    Refeições Geradas
                  </Label>
                  <div className="space-y-2">
                    {generatedPlan.meals?.map((meal, idx) => (
                      <MealPreview 
                        key={meal.id || idx} 
                        meal={meal} 
                        allFoods={allFoods}
                        onEdit={() => setStep('edit')}
                        onRemove={(mealId) => {
                          setGeneratedPlan({
                            ...generatedPlan,
                            meals: generatedPlan.meals.filter(m => m.id !== mealId)
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Raciocínio da IA */}
                {generatedPlan.reasoning && (
                  <div className="p-3 bg-gray-50 rounded-xl border">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Brain size={12} /> Raciocínio da IA
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-3">{generatedPlan.reasoning}</p>
                  </div>
                )}

              </div>
            )}

          </div>
        </ScrollArea>

        {/* Footer com ações */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          {step === 'config' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating || !anamnesis}
                className="bg-gradient-to-r from-violet-600 to-purple-600"
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} className="mr-2" />
                    Gerar IA Plan
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('config')}>
                  Voltar
                </Button>
                <Button variant="outline" onClick={handleRegenerate} disabled={generating}>
                  <RefreshCw size={14} className={`mr-1 ${generating ? 'animate-spin' : ''}`} />
                  Nova Versão
                </Button>
              </div>
              <Button
                onClick={handleUsePlan}
                className="bg-gradient-to-r from-emerald-600 to-teal-600"
              >
                <CheckCircle2 size={16} className="mr-2" />
                Usar este Plano
                <ArrowRight size={14} className="ml-2" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IAPlanGeneratorModal;
