import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, FileText, Utensils, AlertTriangle, Edit, Loader2, User, Save, Plus,
  ClipboardList, MessageSquare, CheckCircle2, Circle, Trash2, Send, Pin, Settings2,
  DollarSign, Download, ChefHat, Eye, Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getPatientById, updatePatient, getPatientMealPlan, getAnamnesis, updateAnamnesis, createAnamnesis,
  getMealPlans, getPatientMessages, createPatientMessage, deletePatientMessage, updatePatientMessage,
  getChecklistAdherence, upsertPatientJourney, getPatientJourney, getPatientPlan, upsertPatientPlan,
  getCurrentUser, getDraftMealPlan, saveDraftMealPlan, updateDraftMealPlan, createAutomaticTips,
  createPersonalizedTip, createFeedbackReminder, createPlanExpirationReminder, syncTemplatesForPatient
} from '@/lib/supabase';
import { toast } from 'sonner';
import ChecklistSimple from '@/components/ChecklistSimple';
import MenuConfigEditor from '@/components/MenuConfigEditor';
import DraftMealPlanViewer from '@/components/DraftMealPlanViewer';
import AnamneseFormComplete from '@/components/AnamneseFormComplete';
import { generateAnamnesePDF, generateMealPlanPDF } from '@/utils/pdfGenerator';
import generateSmartMealPlan from '@/utils/smartAnamnesis';
import PhysicalAssessmentEditor from '@/components/PhysicalAssessmentEditor';
import MealPlanViewerModal from '@/components/MealPlanViewerModal';

// Componente de Aba Resumo
const ResumoTab = ({ patient, mealPlan, anamnesis, adherence, onNavigate }) => {
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const calculateIMC = () => {
    if (!patient?.height || !patient?.current_weight) return null;
    const heightInMeters = patient.height / 100;
    return (patient.current_weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getGoalLabel = (goal) => {
    const goals = {
      'weight_loss': 'Emagrecimento', 'muscle_gain': 'Ganho de Massa',
      'maintenance': 'Manutenção', 'health': 'Saúde', 'sports': 'Performance', 'other': 'Outro'
    };
    return goals[goal] || goal || 'Não definido';
  };

  const age = calculateAge(patient?.birth_date);
  const imc = calculateIMC();

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Peso Atual</p>
            <p className="text-2xl font-bold">{patient?.current_weight ? `${patient.current_weight} kg` : '--'}</p>
            {imc && <p className="text-xs text-gray-500">IMC: {imc}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Meta</p>
            <p className="text-2xl font-bold">{patient?.goal_weight ? `${patient.goal_weight} kg` : '--'}</p>
            <p className="text-xs text-gray-500">{getGoalLabel(patient?.goal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Anamnese</p>
            <Badge variant={anamnesis?.status === 'complete' ? 'default' : 'secondary'}>
              {anamnesis?.status === 'complete' ? 'Completa' : anamnesis?.status === 'draft' ? 'Rascunho' : 'Incompleta'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Aderência (7 dias)</p>
            <p className="text-2xl font-bold text-teal-700">{adherence?.adherence || 0}%</p>
            <p className="text-xs text-gray-500">{adherence?.completed || 0}/{adherence?.total || 0} tarefas</p>
          </CardContent>
        </Card>
      </div>

      {/* Info detalhada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Informações Pessoais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Idade</span><span>{age ? `${age} anos` : '--'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Sexo</span><span>{patient?.gender === 'male' ? 'Masculino' : patient?.gender === 'female' ? 'Feminino' : '--'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Altura</span><span>{patient?.height ? `${patient.height} cm` : '--'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Telefone</span><span>{patient?.phone || '--'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ações Rápidas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('anamnese')}>
              <FileText className="mr-2" size={18} /> Abrir Anamnese
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('plano')}>
              <Utensils className="mr-2" size={18} /> Abrir Plano Alimentar
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('checklist')}>
              <ClipboardList className="mr-2" size={18} /> Ver Checklist
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Observações */}
      {patient?.notes && (
        <Card>
          <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{patient.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Componente de Aba Anamnese
const AnamneseTab = ({ anamnesis, patientId, professionalId, onUpdate, patient, professionalInfo, onComplete }) => {
  const [data, setData] = useState(anamnesis || {});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setData(anamnesis || {});
  }, [anamnesis]);

  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async (markComplete = false) => {
    setSaving(true);
    try {
      const updates = {
        ...data,
        patient_id: patientId,
        professional_id: professionalId,
        status: markComplete ? 'complete' : 'draft',
        last_edited_by: 'professional'
      };
      
      let result;
      if (anamnesis && anamnesis.id) {
        // UPDATE existente
        result = await updateAnamnesis(anamnesis.id, updates);
      } else {
        // CREATE nova anamnesis
        result = await createAnamnesis(updates);
      }
      
      if (result.error) throw result.error;
      
      toast.success(markComplete ? 'Anamnese concluída!' : 'Rascunho salvo!');
      setHasChanges(false);
      onUpdate();
      
      // Se marcar como completa, gerar pré-plano automaticamente
      if (markComplete && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error saving anamnesis:', error);
      toast.error('Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  // Auto-save a cada 30 segundos se houver mudanças
  useEffect(() => {
    if (!hasChanges) return;
    const timer = setTimeout(() => {
      handleSave(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [data, hasChanges]);

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={data.status === 'complete' ? 'default' : 'secondary'}>
            {data.status === 'complete' ? 'Completa' : data.status === 'draft' ? 'Rascunho' : 'Incompleta'}
          </Badge>
          {hasChanges && <span className="text-xs text-amber-600">Alterações não salvas</span>}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              try {
                generateAnamnesePDF(patient, anamnesis, professionalInfo);
                toast.success('PDF gerado com sucesso!');
              } catch (error) {
                console.error('Erro ao gerar PDF:', error);
                toast.error('Erro ao gerar PDF');
              }
            }}
          >
            <Download size={16} className="mr-2" /> Exportar PDF
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Rascunho'}
          </Button>
          <Button className="bg-teal-700 hover:bg-teal-800" onClick={() => handleSave(true)} disabled={saving}>
            Concluir Anamnese
          </Button>
        </div>
      </div>

      {/* Histórico Médico */}
      <Card>
        <CardHeader><CardTitle>Histórico Médico</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Condições Médicas</Label>
            <Textarea
              value={data.medical_conditions ? JSON.stringify(data.medical_conditions) : ''}
              onChange={(e) => {
                try {
                  handleChange('medical_conditions', JSON.parse(e.target.value));
                } catch {
                  // Se não for JSON válido, salvar como texto
                }
              }}
              placeholder='Ex: [{"condition": "Diabetes Tipo 2", "since": "2020", "controlled": true}]'
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">JSON array de condições ou texto livre</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Alergias Alimentares</Label>
              <Input
                value={data.allergies?.join(', ') || ''}
                onChange={(e) => handleChange('allergies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Amendoim, Frutos do mar, Glúten"
              />
            </div>
            <div>
              <Label>Intolerâncias</Label>
              <Input
                value={data.food_intolerances?.join(', ') || ''}
                onChange={(e) => handleChange('food_intolerances', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Lactose, Frutose"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hábitos de Vida */}
      <Card>
        <CardHeader><CardTitle>Hábitos de Vida</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Tabagismo</Label>
              <Select value={data.smoking || ''} onValueChange={(v) => handleChange('smoking', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Nunca fumou</SelectItem>
                  <SelectItem value="former">Ex-fumante</SelectItem>
                  <SelectItem value="current">Fumante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Álcool</Label>
              <Select value={data.alcohol || ''} onValueChange={(v) => handleChange('alcohol', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Não bebe</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Horas de Sono</Label>
              <Input
                type="number"
                value={data.sleep_hours || ''}
                onChange={(e) => handleChange('sleep_hours', parseFloat(e.target.value) || null)}
                placeholder="7"
              />
            </div>
            <div>
              <Label>Nível de Estresse</Label>
              <Select value={data.stress_level || ''} onValueChange={(v) => handleChange('stress_level', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixo</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="very_high">Muito Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nível de Atividade Física</Label>
              <Select value={data.physical_activity_level || ''} onValueChange={(v) => handleChange('physical_activity_level', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentário</SelectItem>
                  <SelectItem value="light">Leve</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="very_active">Muito Ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Água por Dia (litros)</Label>
              <Input
                type="number"
                step="0.1"
                value={data.water_intake || ''}
                onChange={(e) => handleChange('water_intake', parseFloat(e.target.value) || null)}
                placeholder="2.0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico Alimentar */}
      <Card>
        <CardHeader><CardTitle>Histórico Alimentar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Refeições por Dia</Label>
              <Input
                type="number"
                value={data.meals_per_day || ''}
                onChange={(e) => handleChange('meals_per_day', parseInt(e.target.value) || null)}
                placeholder="5"
              />
            </div>
            <div>
              <Label>Restrições Alimentares</Label>
              <Input
                value={data.dietary_restrictions || ''}
                onChange={(e) => handleChange('dietary_restrictions', e.target.value)}
                placeholder="Vegetariano, Sem glúten..."
              />
            </div>
          </div>
          <div>
            <Label>Preferências Alimentares</Label>
            <Textarea
              value={data.food_preferences || ''}
              onChange={(e) => handleChange('food_preferences', e.target.value)}
              placeholder="Alimentos que gosta, favoritos..."
              rows={2}
            />
          </div>
          <div>
            <Label>Aversões Alimentares</Label>
            <Textarea
              value={data.food_aversions || ''}
              onChange={(e) => handleChange('food_aversions', e.target.value)}
              placeholder="Alimentos que não gosta ou evita..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader><CardTitle>Observações do Profissional</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={data.professional_notes || ''}
            onChange={(e) => handleChange('professional_notes', e.target.value)}
            placeholder="Observações, anotações, pontos de atenção..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Componente de Aba Checklist (SIMPLIFICADO)
const ChecklistTab = ({ patientId }) => {
  return (
    <div className="space-y-6">
      <ChecklistSimple patientId={patientId} isPatientView={false} />
    </div>
  );
};

// Componente de Aba Recados
const RecadosTab = ({ patientId, professionalId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMessage, setIsAddingMessage] = useState(false);
  const [newMessage, setNewMessage] = useState({ title: '', content: '', type: 'tip', priority: 'normal' });

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getPatientMessages(patientId, false);
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.title.trim() || !newMessage.content.trim()) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }

    try {
      const { error } = await createPatientMessage({
        patient_id: patientId,
        professional_id: professionalId,
        ...newMessage
      });
      if (error) throw error;
      
      toast.success('Recado enviado!');
      setIsAddingMessage(false);
      setNewMessage({ title: '', content: '', type: 'tip', priority: 'normal' });
      loadMessages();
    } catch (error) {
      toast.error('Erro ao enviar recado');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Excluir este recado?')) return;
    
    try {
      const { error } = await deletePatientMessage(messageId);
      if (error) throw error;
      toast.success('Recado excluído');
      loadMessages();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleTogglePin = async (message) => {
    try {
      const { error } = await updatePatientMessage(message.id, { is_pinned: !message.is_pinned });
      if (error) throw error;
      loadMessages();
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'tip': 'bg-blue-100 text-blue-700',
      'reminder': 'bg-amber-100 text-amber-700',
      'alert': 'bg-red-100 text-red-700',
      'motivation': 'bg-green-100 text-green-700',
      'feedback': 'bg-purple-100 text-purple-700'
    };
    return colors[type] || colors.tip;
  };

  const getTypeLabel = (type) => {
    const labels = { 'tip': 'Dica', 'reminder': 'Lembrete', 'alert': 'Alerta', 'motivation': 'Motivação', 'feedback': 'Feedback' };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-teal-700" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recados e Dicas</h3>
        <Dialog open={isAddingMessage} onOpenChange={setIsAddingMessage}>
          <DialogTrigger asChild>
            <Button className="bg-teal-700 hover:bg-teal-800">
              <Send size={18} className="mr-2" /> Novo Recado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Recado</DialogTitle>
              <DialogDescription>Envie uma mensagem, dica ou lembrete para o paciente</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={newMessage.title}
                  onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                  placeholder="Ex: Lembrete importante"
                />
              </div>
              <div>
                <Label>Conteúdo *</Label>
                <Textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  placeholder="Digite sua mensagem..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={newMessage.type} onValueChange={(v) => setNewMessage({ ...newMessage, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tip">Dica</SelectItem>
                      <SelectItem value="reminder">Lembrete</SelectItem>
                      <SelectItem value="alert">Alerta</SelectItem>
                      <SelectItem value="motivation">Motivação</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={newMessage.priority} onValueChange={(v) => setNewMessage({ ...newMessage, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSendMessage} className="w-full bg-teal-700 hover:bg-teal-800">
                Enviar Recado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Nenhum recado enviado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className={msg.is_pinned ? 'border-amber-300 bg-amber-50' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {msg.is_pinned && <Pin size={14} className="text-amber-600" />}
                      <h4 className="font-semibold text-gray-900">{msg.title}</h4>
                      <Badge className={getTypeColor(msg.type)}>{getTypeLabel(msg.type)}</Badge>
                      {msg.is_read && <Badge variant="outline" className="text-xs">Lido</Badge>}
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(msg.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleTogglePin(msg)}>
                      <Pin size={16} className={msg.is_pinned ? 'text-amber-600' : 'text-gray-400'} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteMessage(msg.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente de Aba Projeto (Menu e Jornada)
const ProjetoTab = ({ patientId, professionalId, patient }) => {
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [journeyForm, setJourneyForm] = useState({
    plan_name: '',
    plan_start_date: '',
    plan_end_date: '',
    initial_weight: '',
    target_weight: '',
    notes: ''
  });

  // Plano Financeiro
  const [patientPlan, setPatientPlan] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    plan_name: '',
    plan_price: '',
    start_date: '',
    end_date: '',
    status: 'active',
    payment_status: 'paid',
    notes: ''
  });

  useEffect(() => {
    loadJourney();
    loadPatientPlan();
  }, [patientId]);

  const loadPatientPlan = async () => {
    const { data } = await getPatientPlan(patientId);
    if (data) {
      setPatientPlan(data);
      setPlanForm({
        plan_name: data.plan_name || '',
        plan_price: data.plan_price ? String(data.plan_price) : '',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        status: data.status || 'active',
        payment_status: data.payment_status || 'paid',
        notes: data.notes || ''
      });
    }
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    const { error } = await upsertPatientPlan(patientId, {
      ...planForm,
      plan_price: planForm.plan_price ? parseFloat(planForm.plan_price) : null,
      professional_id: professionalId
    });
    if (error) { toast.error('Erro ao salvar plano'); }
    else { toast.success('Plano financeiro salvo!'); loadPatientPlan(); }
    setSavingPlan(false);
  };

  const loadJourney = async () => {
    try {
      const { data } = await getPatientJourney(patientId);
      if (data) {
        setJourney(data);
        setJourneyForm({
          plan_name: data.plan_name || '',
          plan_start_date: data.plan_start_date || '',
          plan_end_date: data.plan_end_date || '',
          initial_weight: data.initial_weight || '',
          target_weight: data.target_weight || '',
          notes: data.notes || ''
        });
      } else {
        // Pré-preencher com dados do paciente
        setJourneyForm(prev => ({
          ...prev,
          initial_weight: patient?.current_weight || '',
          target_weight: patient?.goal_weight || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar jornada:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJourney = async () => {
    setSaving(true);
    try {
      const { error } = await upsertPatientJourney(patientId, {
        ...journeyForm,
        initial_weight: journeyForm.initial_weight ? parseFloat(journeyForm.initial_weight) : null,
        target_weight: journeyForm.target_weight ? parseFloat(journeyForm.target_weight) : null
      });

      if (error) {
        toast.error('Erro ao salvar jornada');
        return;
      }

      toast.success('Jornada do paciente atualizada!');
      loadJourney();
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuração do Menu */}
      <MenuConfigEditor 
        patientId={patientId} 
        professionalId={professionalId}
      />

      {/* Configuração da Jornada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} />
            Configurar Jornada do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome do Projeto/Plano</Label>
                  <Input
                    value={journeyForm.plan_name}
                    onChange={(e) => setJourneyForm({ ...journeyForm, plan_name: e.target.value })}
                    placeholder="Ex: Projeto Biquíni Branco - 90 dias"
                  />
                </div>
                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={journeyForm.plan_start_date}
                    onChange={(e) => setJourneyForm({ ...journeyForm, plan_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data de Término</Label>
                  <Input
                    type="date"
                    value={journeyForm.plan_end_date}
                    onChange={(e) => setJourneyForm({ ...journeyForm, plan_end_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Peso Inicial (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={journeyForm.initial_weight}
                    onChange={(e) => setJourneyForm({ ...journeyForm, initial_weight: e.target.value })}
                    placeholder="Ex: 75.5"
                  />
                </div>
                <div>
                  <Label>Peso Meta (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={journeyForm.target_weight}
                    onChange={(e) => setJourneyForm({ ...journeyForm, target_weight: e.target.value })}
                    placeholder="Ex: 65.0"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={journeyForm.notes}
                    onChange={(e) => setJourneyForm({ ...journeyForm, notes: e.target.value })}
                    placeholder="Anotações sobre o projeto do paciente..."
                    rows={3}
                  />
                </div>
              </div>

              <Button 
                onClick={handleSaveJourney} 
                disabled={saving}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <Save size={16} className="mr-2" />
                {saving ? 'Salvando...' : 'Salvar Configuração da Jornada'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plano Financeiro do Paciente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign size={20} />
            Plano Financeiro do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome do Plano</Label>
              <Input
                value={planForm.plan_name}
                onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                placeholder="Ex: Projeto Biquíni Branco - Trimestral"
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={planForm.plan_price}
                onChange={(e) => setPlanForm({ ...planForm, plan_price: e.target.value })}
                placeholder="Ex: 200,00"
              />
            </div>
            <div>
              <Label>Status do Pagamento</Label>
              <Select value={planForm.payment_status} onValueChange={v => setPlanForm({ ...planForm, payment_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="overdue">Em Atraso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de Início</Label>
              <Input type="date" value={planForm.start_date} onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Data de Término</Label>
              <Input type="date" value={planForm.end_date} onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })} />
            </div>
            <div>
              <Label>Status do Plano</Label>
              <Select value={planForm.status} onValueChange={v => setPlanForm({ ...planForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observações Financeiras</Label>
              <Textarea
                value={planForm.notes}
                onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                placeholder="Ex: Parcelado em 3x, desconto de indicação..."
                rows={2}
              />
            </div>
          </div>
          <Button onClick={handleSavePlan} disabled={savingPlan} className="w-full bg-teal-600 hover:bg-teal-700">
            <Save size={16} className="mr-2" />
            {savingPlan ? 'Salvando...' : 'Salvar Plano Financeiro'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente Principal
const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  
  const [patient, setPatient] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [allMealPlans, setAllMealPlans] = useState([]);
  const [anamnesis, setAnamnesis] = useState(null);
  const [adherence, setAdherence] = useState(null);
  const [draftPlan, setDraftPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'resumo');
  const [showMealPlanViewer, setShowMealPlanViewer] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    type: 'feedback',
    date: '',
    notes: ''
  });

  const loadPatientData = useCallback(async (forceRefresh = false) => {
    if (!id || !profile) return;
    
    // Só usar cache se forceRefresh não for passado
    if (!forceRefresh && patient && patient.id === id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Carregar dados em paralelo para melhor performance
      const [patientResult, planResult, allPlansResult, anamnesisResult, adherenceResult, draftResult] = await Promise.allSettled([
        getPatientById(id),
        getPatientMealPlan(id, profile.id),
        getMealPlans(profile.id, 'professional'),
        getAnamnesis(id),
        getChecklistAdherence(id, 7),
        getDraftMealPlan(id)
      ]);
      
      if (patientResult.status === 'fulfilled' && patientResult.value.data) {
        setPatient(patientResult.value.data);
      } else if (patientResult.status === 'rejected' || patientResult.value.error) {
        throw patientResult.value?.error || new Error('Erro ao carregar paciente');
      }
      
      if (planResult.status === 'fulfilled') {
        setMealPlan(planResult.value.data);
      }
      
      if (allPlansResult.status === 'fulfilled') {
        setAllMealPlans((allPlansResult.value.data || []).filter(p => p.patient_id === id));
      }
      
      if (anamnesisResult.status === 'fulfilled') {
        setAnamnesis(anamnesisResult.value.data);
      }
      
      if (adherenceResult.status === 'fulfilled') {
        setAdherence(adherenceResult.value);
      }
      
      if (draftResult.status === 'fulfilled') {
        setDraftPlan(draftResult.value.data?.draft_data || null);
      }

      // Sincronizar templates globais para o paciente
      try {
        await syncTemplatesForPatient(id);
        console.log('✅ Templates sincronizados para o paciente');
      } catch (syncError) {
        console.warn('⚠️ Erro ao sincronizar templates:', syncError);
        // Não bloquear o carregamento se a sincronização falhar
      }

    } catch (error) {
      console.error('Error loading patient:', error);
      toast.error('Erro ao carregar paciente');
    } finally {
      setLoading(false);
    }
  }, [id, profile, patient]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  // Gerar pré-plano inteligente
  const handleGenerateDraftPlan = async (variation = 1) => {
    if (!anamnesis || !patient) {
      toast.error('É necessário ter anamnese completa');
      return;
    }

    setLoading(true);
    try {
      // Gerar pré-plano usando IA com variação
      const smartPlan = generateSmartMealPlan(anamnesis, patient, variation);
      console.log('Pré-plano gerado (variação ' + variation + '):', smartPlan);
      
      // Salvar no banco
      const { data: savedDraft, error: saveError } = await saveDraftMealPlan(id, profile.id, smartPlan);
      
      if (saveError) {
        console.error('Erro ao salvar pré-plano:', saveError);
        toast.error('Erro ao salvar pré-plano no banco: ' + (saveError.message || 'Verifique se a tabela draft_meal_plans existe'));
        // Ainda assim mostrar o plano gerado
        setDraftPlan(smartPlan);
        return;
      }
      
      console.log('Pré-plano salvo com sucesso:', savedDraft);
      
      // Criar dica personalizada especial (destaque no painel do paciente)
      if (smartPlan.personalizedTip) {
        const { error: personalizedError } = await createPersonalizedTip(id, profile.id, smartPlan.personalizedTip);
        if (personalizedError) {
          console.warn('Aviso: Dica personalizada não foi criada:', personalizedError);
        } else {
          console.log('Dica personalizada criada com sucesso! ✨');
        }
      }
      
      // Criar dicas automáticas gerais
      if (smartPlan.tips && smartPlan.tips.length > 0) {
        const { error: tipsError } = await createAutomaticTips(id, profile.id, smartPlan.tips);
        if (tipsError) {
          console.warn('Aviso: Dicas automáticas não foram criadas:', tipsError);
        }
      }
      
      setDraftPlan(smartPlan);
      toast.success('Pré-plano gerado com dica personalizada! ✨');
    } catch (error) {
      console.error('Error generating draft plan:', error);
      toast.error('Erro ao gerar pré-plano');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar pré-plano editado
  const handleUpdateDraftPlan = async (updatedPlan) => {
    setLoading(true);
    try {
      await updateDraftMealPlan(id, updatedPlan);
      setDraftPlan(updatedPlan);
      toast.success('Pré-plano atualizado!');
    } catch (error) {
      console.error('Error updating draft plan:', error);
      toast.error('Erro ao atualizar pré-plano');
    } finally {
      setLoading(false);
    }
  };

  // Salvar pré-plano como rascunho no banco
  const handleSaveAsDraft = async (planToSave) => {
    if (!planToSave) {
      toast.error('Nenhum pré-plano para salvar');
      return;
    }
    
    try {
      const { error } = await saveDraftMealPlan(id, profile.id, planToSave);
      if (error) {
        throw error;
      }
      toast.success('Rascunho salvo no banco!');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Erro ao salvar rascunho');
      throw error;
    }
  };

  // Criar lembrete para o paciente
  const handleCreateReminder = async () => {
    if (!reminderForm.date) {
      toast.error('Selecione uma data');
      return;
    }
    
    try {
      let result;
      if (reminderForm.type === 'feedback') {
        result = await createFeedbackReminder(id, profile.id, reminderForm.date, reminderForm.notes);
      } else if (reminderForm.type === 'vencimento') {
        result = await createPlanExpirationReminder(id, profile.id, reminderForm.date, mealPlan?.name || '');
      }
      
      if (result?.error) {
        throw result.error;
      }
      
      toast.success('Lembrete criado com sucesso! O paciente será notificado.');
      setShowReminderModal(false);
      setReminderForm({ type: 'feedback', date: '', notes: '' });
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Erro ao criar lembrete');
    }
  };

  // Usar pré-plano como plano oficial
  const handleUseAsOfficialPlan = async (draftPlan) => {
    if (!draftPlan || !patient) {
      toast.error('Pré-plano inválido');
      return;
    }

    try {
      // Armazena o draft no sessionStorage para uso no editor
      sessionStorage.setItem('draftPlanToLoad', JSON.stringify(draftPlan));
      
      // Redireciona para o editor com o draft como parâmetro
      navigate(`/professional/meal-plan-editor?patient=${id}&fromDraft=true`);
      
      toast.success('Abrindo editor com pré-plano...');
    } catch (error) {
      console.error('Error using draft as official plan:', error);
      toast.error('Erro ao copiar pré-plano');
    }
  };

  const handleNavigateTab = (tab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <Layout title="Carregando..." showBack userType={profile?.role || 'professional'}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout title="Paciente não encontrado" showBack userType={profile?.role || 'professional'}>
        <Card>
          <CardContent className="py-12 text-center">
            <User className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Paciente não encontrado</p>
            <Button className="mt-4" onClick={() => navigate('/professional/patients')}>
              Voltar para lista
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const avatar = patient.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=0F766E&color=fff&size=200`;

  return (
    <Layout title={patient.name} showBack userType={profile?.role || 'professional'}>
      <div data-testid="patient-profile" className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-6">
              <img src={avatar} alt={patient.name} className="w-20 h-20 rounded-full" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
                <p className="text-gray-600">{patient.email}</p>
                <p className="text-gray-500 text-sm">{patient.phone || 'Sem telefone'}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => setShowReminderModal(true)}
                >
                  <Bell size={18} className="mr-2" /> Agendar Lembrete
                </Button>
                <Button variant="outline" onClick={() => navigate(`/professional/meal-plan-editor?patient=${id}`)}>
                  <Utensils size={18} className="mr-2" /> Plano Alimentar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex overflow-x-auto w-full bg-gray-100 gap-1 p-1 scrollbar-hide">
            <TabsTrigger value="resumo" className="flex-shrink-0 min-w-[100px]">Resumo</TabsTrigger>
            <TabsTrigger value="anamnese" className="flex-shrink-0 min-w-[100px]">Anamnese</TabsTrigger>
            <TabsTrigger value="avaliacao" className="flex-shrink-0 min-w-[100px]">Av. Física</TabsTrigger>
            <TabsTrigger value="pre-plano" className="flex-shrink-0 min-w-[100px]">Pré-Plano</TabsTrigger>
            <TabsTrigger value="plano" className="flex-shrink-0 min-w-[100px]">Plano</TabsTrigger>
            <TabsTrigger value="checklist" className="flex-shrink-0 min-w-[100px]">Checklist</TabsTrigger>
            <TabsTrigger value="receitas" className="flex-shrink-0 min-w-[100px]">Receitas</TabsTrigger>
            <TabsTrigger value="recados" className="flex-shrink-0 min-w-[100px]">Recados</TabsTrigger>
            <TabsTrigger value="projeto" className="flex-shrink-0 min-w-[100px]">Projeto</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">
            <ResumoTab 
              patient={patient} 
              mealPlan={mealPlan} 
              anamnesis={anamnesis} 
              adherence={adherence}
              onNavigate={handleNavigateTab}
            />
          </TabsContent>

          <TabsContent value="anamnese">
            <AnamneseFormComplete
              anamnesis={anamnesis} 
              patientId={id} 
              professionalId={profile?.id}
              patient={patient}
              professionalInfo={{ name: profile?.name, email: profile?.email }}
              isPatientView={false}
              onUpdate={() => loadPatientData(true)}
              onComplete={handleGenerateDraftPlan}
            />
          </TabsContent>

          <TabsContent value="avaliacao">
            <PhysicalAssessmentEditor
              patientId={id}
              professionalId={profile?.id}
              patient={patient}
              onTipCreated={() => toast.success('Dica enviada para o paciente!')}
              onRefreshPatient={() => loadPatientData(true)}
            />
          </TabsContent>

          <TabsContent value="pre-plano">
            <DraftMealPlanViewer
              draftPlan={draftPlan}
              anamnesis={anamnesis}
              onUpdate={handleUpdateDraftPlan}
              onRegenerate={handleGenerateDraftPlan}
              onUseAsOfficial={handleUseAsOfficialPlan}
              onSaveAsDraft={handleSaveAsDraft}
              loading={loading}
              patientId={id}
            />
          </TabsContent>

          <TabsContent value="plano">
            <Card>
              <CardHeader><CardTitle>Plano Alimentar</CardTitle></CardHeader>
              <CardContent>
                {mealPlan ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-green-900">{mealPlan.name}</h4>
                          <p className="text-sm text-green-700">
                            Atualizado: {new Date(mealPlan.updated_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          try {
                            generateMealPlanPDF(patient, mealPlan, { name: profile?.name, email: profile?.email });
                            toast.success('PDF gerado com sucesso!');
                          } catch (error) {
                            console.error('Erro ao gerar PDF:', error);
                            toast.error('Erro ao gerar PDF');
                          }
                        }}
                      >
                        <Download className="mr-2" size={18} /> Exportar PDF
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => setShowMealPlanViewer(true)}
                      >
                        <Eye className="mr-2" size={18} /> Visualizar
                      </Button>
                      <Button 
                        className="flex-1 bg-teal-700 hover:bg-teal-800"
                        onClick={() => navigate(`/professional/meal-plan-editor?patient=${id}&plan=${mealPlan.id}`)}
                      >
                        <Edit className="mr-2" size={18} /> Editar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Utensils className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600 mb-4">Nenhum plano alimentar</p>
                    <Button 
                      className="bg-teal-700 hover:bg-teal-800"
                      onClick={() => navigate(`/professional/meal-plan-editor?patient=${id}`)}
                    >
                      <Plus size={18} className="mr-2" /> Criar Plano
                    </Button>
                  </div>
                )}

                {/* Histórico de planos */}
                {allMealPlans.length > 1 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Histórico</h4>
                    <div className="space-y-2">
                      {allMealPlans.filter(p => p.id !== mealPlan?.id).map(plan => (
                        <div 
                          key={plan.id}
                          className="p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100"
                          onClick={() => navigate(`/professional/meal-plan-editor?patient=${id}&plan=${plan.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{plan.name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist">
            <ChecklistTab patientId={id} />
          </TabsContent>

          <TabsContent value="receitas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="text-teal-700" />
                  Receitas do Paciente
                </CardTitle>
                <CardDescription>
                  Configure quais receitas este paciente pode visualizar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Gerencie as receitas e controle a visibilidade para {patient?.full_name || 'este paciente'}
                  </p>
                  <Button 
                    onClick={() => navigate('/professional/receitas')}
                    className="bg-teal-700 hover:bg-teal-800"
                  >
                    <ChefHat className="mr-2" size={18} />
                    Gerenciar Receitas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recados">
            <RecadosTab patientId={id} professionalId={profile?.id} />
          </TabsContent>

          <TabsContent value="projeto">
            <ProjetoTab patientId={id} professionalId={profile?.id} patient={patient} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Visualização do Plano Alimentar */}
      <MealPlanViewerModal
        isOpen={showMealPlanViewer}
        onClose={() => setShowMealPlanViewer(false)}
        mealPlan={mealPlan}
        patient={patient}
        professionalInfo={{ name: profile?.name, email: profile?.email }}
        onEdit={() => {
          setShowMealPlanViewer(false);
          navigate(`/professional/meal-plan-editor?patient=${id}&plan=${mealPlan?.id}`);
        }}
      />

      {/* Modal de Criar Lembrete */}
      <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="text-orange-600" size={20} />
              Agendar Lembrete
            </DialogTitle>
            <DialogDescription>
              Crie um lembrete para você e notifique o paciente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Tipo de Lembrete</Label>
              <Select value={reminderForm.type} onValueChange={(v) => setReminderForm({ ...reminderForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feedback">📝 Solicitar Feedback</SelectItem>
                  <SelectItem value="vencimento">⚠️ Vencimento de Plano</SelectItem>
                  <SelectItem value="retorno">🔄 Consulta de Retorno</SelectItem>
                  <SelectItem value="lembrete">🔔 Lembrete Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data do Lembrete</Label>
              <Input
                type="date"
                value={reminderForm.date}
                onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                value={reminderForm.notes}
                onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })}
                placeholder="Detalhes adicionais sobre o lembrete..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowReminderModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreateReminder} className="flex-1 bg-orange-600 hover:bg-orange-700">
                <Bell size={16} className="mr-2" />
                Criar Lembrete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default PatientProfile;
