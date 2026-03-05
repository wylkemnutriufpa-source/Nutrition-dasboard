import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, Calendar, Settings, Plus, Trash2, Save, X, 
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Calendar as CalendarIcon
} from 'lucide-react';
import { toast } from 'sonner';
import IAPlanGeneratorModal from '@/components/IAPlanGeneratorModal';

/**
 * Modal de Configuração de Plano Programado
 * Integra: IA Plan Generator + Critérios de Automação
 */
const PlanConfigurationModal = ({ 
  open, 
  onClose, 
  planNumber, // 1, 2 ou 3
  patientId,
  anamnesis,
  existingPlan, // Dados já salvos (se houver)
  onSave
}) => {
  const [currentTab, setCurrentTab] = useState('plan'); // 'plan' ou 'automation'
  
  // Estado do Plano
  const [planData, setPlanData] = useState(null);
  const [showIAGenerator, setShowIAGenerator] = useState(false);
  
  // Estado da Automação (Critérios)
  const [automation, setAutomation] = useState({
    name: `Plan ${planNumber}`,
    evaluationPeriod: 15, // dias
    activationDate: '',
    expirationDate: '',
    reminderDays: 3,
    requirements: [], // [{metric, operator, value}]
    onSuccess: {
      action: 'activate_plan',
      targetPlanId: ''
    },
    onFailure: {
      action: 'extend_cycle',
      extensionDays: 15
    }
  });

  // Carregar dados existentes quando modal abre
  useEffect(() => {
    console.log('🟡 PlanConfigurationModal useEffect:', { open, existingPlan, planNumber });
    if (open && existingPlan) {
      console.log('🟡 Carregando dados existentes:', existingPlan);
      setPlanData(existingPlan.plan || null);
      setAutomation(existingPlan.automation || automation);
    } else if (open && !existingPlan) {
      console.log('🟡 Reset - sem dados existentes');
      // Reset se não houver dados
      setPlanData(null);
      setAutomation({
        name: `Plan ${planNumber}`,
        evaluationPeriod: 15,
        activationDate: '',
        expirationDate: '',
        reminderDays: 3,
        requirements: [],
        onSuccess: { action: 'activate_plan', targetPlanId: '' },
        onFailure: { action: 'extend_cycle', extensionDays: 15 }
      });
    }
  }, [open, existingPlan, planNumber]);

  const addRequirement = () => {
    setAutomation({
      ...automation,
      requirements: [
        ...automation.requirements,
        { metric: 'peso', operator: '<=', value: '', unit: 'kg' }
      ]
    });
  };

  const removeRequirement = (index) => {
    setAutomation({
      ...automation,
      requirements: automation.requirements.filter((_, i) => i !== index)
    });
  };

  const updateRequirement = (index, field, value) => {
    const updated = [...automation.requirements];
    updated[index] = { ...updated[index], [field]: value };
    setAutomation({ ...automation, requirements: updated });
  };

  const handleSave = () => {
    if (!planData) {
      toast.error('Gere um plano alimentar primeiro!');
      return;
    }

    if (!automation.activationDate) {
      toast.error('Defina a data de ativação!');
      return;
    }

    const finalData = {
      planNumber,
      plan: planData,
      automation: automation
    };

    onSave?.(finalData);
    toast.success(`✅ Plan ${planNumber} configurado com sucesso!`);
    onClose();
  };

  const metrics = [
    { value: 'peso', label: 'Peso', unit: 'kg' },
    { value: 'imc', label: 'IMC', unit: '' },
    { value: 'circunferencia_cintura', label: 'Cintura', unit: 'cm' },
    { value: 'percentual_gordura', label: '% Gordura', unit: '%' },
    { value: 'massa_muscular', label: 'Massa Muscular', unit: 'kg' }
  ];

  const operators = [
    { value: '<=', label: '≤ Menor ou igual' },
    { value: '>=', label: '≥ Maior ou igual' },
    { value: '==', label: '= Igual a' },
    { value: '<', label: '< Menor que' },
    { value: '>', label: '> Maior que' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {console.log('🔴 PlanConfigurationModal render:', { open, planNumber, planData, currentTab })}
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {planNumber}
            </div>
            <div>
              <h3 className="text-xl font-bold">Plan {planNumber} - Configuração</h3>
              <p className="text-sm text-gray-500">Plano alimentar + Critérios de ativação</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <Sparkles size={16} />
              1. Plano Alimentar
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Settings size={16} />
              2. Critérios de Ativação
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PLANO ALIMENTAR */}
          <TabsContent value="plan" className="space-y-4 mt-4">
            <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-violet-900">🤖 Gerar Plano com IA</p>
                  <p className="text-xs text-violet-700">Baseado na anamnese e objetivo</p>
                </div>
                {planData && (
                  <Badge className="bg-emerald-500 text-white">
                    <CheckCircle2 size={12} className="mr-1" />
                    Plano Gerado
                  </Badge>
                )}
              </div>
              
              <Button
                onClick={() => setShowIAGenerator(true)}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white"
              >
                <Sparkles size={16} className="mr-2" />
                {planData ? 'Editar Plano Alimentar' : 'Gerar Plano Alimentar'}
              </Button>
            </div>

            {planData && (
              <div className="p-4 bg-white border rounded-lg">
                <p className="text-sm font-semibold mb-2">📋 Resumo do Plano</p>
                <div className="space-y-1 text-xs text-gray-700">
                  <p>• <strong>Objetivo:</strong> {planData.goal || 'Não definido'}</p>
                  <p>• <strong>Refeições:</strong> {planData.meals?.length || 0}</p>
                  <p>• <strong>Calorias:</strong> {planData.calories || 'A calcular'} kcal/dia</p>
                </div>
              </div>
            )}

            {!planData && (
              <div className="text-center py-8 text-gray-400">
                <Sparkles size={32} className="mx-auto mb-2" />
                <p className="text-sm">Nenhum plano gerado ainda</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: CRITÉRIOS DE AUTOMAÇÃO */}
          <TabsContent value="automation" className="space-y-4 mt-4">
            
            {/* Configuração Básica */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">📅 Data de Ativação *</Label>
                <Input
                  type="date"
                  value={automation.activationDate}
                  onChange={(e) => setAutomation({...automation, activationDate: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">📅 Data de Término</Label>
                <Input
                  type="date"
                  value={automation.expirationDate}
                  onChange={(e) => setAutomation({...automation, expirationDate: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">⏰ Lembrete (dias antes)</Label>
                <Input
                  type="number"
                  value={automation.reminderDays}
                  onChange={(e) => setAutomation({...automation, reminderDays: parseInt(e.target.value)})}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">🔄 Período de Avaliação (dias)</Label>
                <Input
                  type="number"
                  value={automation.evaluationPeriod}
                  onChange={(e) => setAutomation({...automation, evaluationPeriod: parseInt(e.target.value)})}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-gray-500 mt-1">Janela para avaliar critérios</p>
              </div>
            </div>

            {/* Requisitos (Exigências) */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Requisitos (Exigências)</p>
                  <p className="text-xs text-gray-500">Condições para ativar próximo plano</p>
                </div>
                <Button size="sm" variant="outline" onClick={addRequirement}>
                  <Plus size={12} className="mr-1" />
                  Adicionar
                </Button>
              </div>

              {automation.requirements.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  Nenhum requisito configurado. Adicione ao menos um.
                </p>
              )}

              <div className="space-y-2">
                {automation.requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={req.metric}
                      onChange={(e) => updateRequirement(index, 'metric', e.target.value)}
                      className="h-8 text-xs border rounded px-2 flex-1"
                    >
                      {metrics.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      value={req.operator}
                      onChange={(e) => updateRequirement(index, 'operator', e.target.value)}
                      className="h-8 text-xs border rounded px-2 w-32"
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      value={req.value}
                      onChange={(e) => updateRequirement(index, 'value', e.target.value)}
                      placeholder="Valor"
                      className="h-8 text-xs w-20"
                    />
                    <span className="text-xs text-gray-500 w-8">
                      {metrics.find(m => m.value === req.metric)?.unit}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRequirement(index)}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações Condicionais */}
            <div className="grid grid-cols-2 gap-4">
              {/* Se META atingida */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-900">Se META atingida</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Ação:</Label>
                  <select
                    value={automation.onSuccess.action}
                    onChange={(e) => setAutomation({
                      ...automation,
                      onSuccess: { ...automation.onSuccess, action: e.target.value }
                    })}
                    className="w-full h-8 text-xs border rounded px-2"
                  >
                    <option value="activate_plan">✅ Ativar próximo plano</option>
                    <option value="keep_current">🔄 Manter plano atual</option>
                  </select>
                  {automation.onSuccess.action === 'activate_plan' && (
                    <div>
                      <Label className="text-xs">UUID do plano:</Label>
                      <Input
                        value={automation.onSuccess.targetPlanId}
                        onChange={(e) => setAutomation({
                          ...automation,
                          onSuccess: { ...automation.onSuccess, targetPlanId: e.target.value }
                        })}
                        placeholder="Cole o ID do plano"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Se META NÃO atingida */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-red-600" />
                  <p className="text-sm font-semibold text-red-900">Se META NÃO atingida</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Ação:</Label>
                  <select
                    value={automation.onFailure.action}
                    onChange={(e) => setAutomation({
                      ...automation,
                      onFailure: { ...automation.onFailure, action: e.target.value }
                    })}
                    className="w-full h-8 text-xs border rounded px-2"
                  >
                    <option value="extend_cycle">⏳ Estender ciclo de avaliação</option>
                    <option value="keep_current">🔄 Manter plano atual</option>
                    <option value="activate_plan">🔄 Ativar outro plano</option>
                  </select>
                  {automation.onFailure.action === 'extend_cycle' && (
                    <div>
                      <Label className="text-xs">Estender por (dias):</Label>
                      <Input
                        type="number"
                        value={automation.onFailure.extensionDays}
                        onChange={(e) => setAutomation({
                          ...automation,
                          onFailure: { ...automation.onFailure, extensionDays: parseInt(e.target.value) }
                        })}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Botões de Ação */}
        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X size={16} className="mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
            disabled={!planData || !automation.activationDate}
          >
            <Save size={16} className="mr-2" />
            Salvar Plan {planNumber}
          </Button>
        </div>

        {/* Modal IA Plan Generator (dentro do modal principal) */}
        <IAPlanGeneratorModal
          open={showIAGenerator}
          onOpenChange={setShowIAGenerator}
          patientId={patientId}
          anamnesis={anamnesis}
          planContext={`Plan ${planNumber}`}
          onPlanGenerated={(generatedPlan) => {
            setPlanData(generatedPlan);
            setShowIAGenerator(false);
            toast.success('✅ Plano gerado com sucesso!');
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PlanConfigurationModal;
