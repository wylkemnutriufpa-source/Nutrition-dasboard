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
  DollarSign, Download, ChefHat, Eye, Bell, Shield, Activity, TrendingUp, Scale,
  Heart, Target, Sparkles, ArrowRight, Clock, Star, Zap, PlayCircle, Brain
} from 'lucide-react';
import RiskScoreCard from '@/components/RiskScoreCard';
import MealPlanTimeline from '@/components/MealPlanTimeline';
import RecipeGenerator from '@/components/RecipeGenerator';
import PatientTimeline from '@/components/PatientTimeline';
import EmptyState from '@/components/EmptyState';
import { SaveStatusIndicator, useSaveStatus } from '@/components/SaveStatusIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getPatientById, updatePatient, getPatientMealPlan, getAnamnesis, updateAnamnesis, createAnamnesis,
  getMealPlans, getPatientMessages, createPatientMessage, deletePatientMessage, updatePatientMessage,
  getChecklistAdherence, upsertPatientJourney, getPatientJourney, getPatientPlan, upsertPatientPlan,
  getCurrentUser, getDraftMealPlan, saveDraftMealPlan, updateDraftMealPlan, createAutomaticTips,
  createPersonalizedTip, createFeedbackReminder, createPlanExpirationReminder, syncTemplatesForPatient,
  getLatestPhysicalAssessment
} from '@/lib/supabase';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import ChecklistSimple from '@/components/ChecklistSimple';
import MenuConfigEditor from '@/components/MenuConfigEditor';
import DraftMealPlanViewerCompact from '@/components/DraftMealPlanViewerCompact';
import AnamneseFormComplete from '@/components/AnamneseFormComplete';
import { generateAnamnesePDF, generateMealPlanPDF } from '@/utils/pdfGenerator';
import generateSmartMealPlan from '@/utils/smartAnamnesis';
import PhysicalAssessmentEditor from '@/components/PhysicalAssessmentEditor';
import MealPlanViewerModal from '@/components/MealPlanViewerModal';

// Componente de Aba Resumo — Visual Premium
const ResumoTab = ({ patient, mealPlan, anamnesis, adherence, onNavigate, assessment, patientId }) => {
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

  const statCards = [
    {
      icon: Scale, label: 'Peso Atual', value: patient?.current_weight ? `${patient.current_weight} kg` : '--',
      sub: imc ? `IMC: ${imc}` : null, gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50'
    },
    {
      icon: Target, label: 'Meta', value: patient?.goal_weight ? `${patient.goal_weight} kg` : '--',
      sub: getGoalLabel(patient?.goal), gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50'
    },
    {
      icon: FileText, label: 'Anamnese',
      value: anamnesis?.status === 'complete' ? 'Completa' : anamnesis?.status === 'draft' ? 'Rascunho' : 'Pendente',
      sub: null, gradient: anamnesis?.status === 'complete' ? 'from-green-500 to-emerald-600' : 'from-amber-500 to-orange-600',
      bg: anamnesis?.status === 'complete' ? 'bg-green-50' : 'bg-amber-50'
    },
    {
      icon: Activity, label: 'Aderência (7d)', value: `${adherence?.adherence || 0}%`,
      sub: `${adherence?.completed || 0}/${adherence?.total || 0} tarefas`,
      gradient: (adherence?.adherence || 0) >= 70 ? 'from-teal-500 to-cyan-600' : 'from-red-500 to-rose-600',
      bg: (adherence?.adherence || 0) >= 70 ? 'bg-teal-50' : 'bg-red-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cards de métricas premium */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`relative overflow-hidden rounded-2xl border border-white/50 ${s.bg} p-4 shadow-sm hover:shadow-md transition-all`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{s.value}</p>
              {s.sub && <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Risk Score Card */}
      <RiskScoreCard 
        anamnesis={anamnesis}
        assessment={assessment}
        patient={patient}
        variant="compact"
        onViewDetails={() => onNavigate('avaliacao')}
      />

      {/* Info + Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-violet-600" /> Informações Pessoais
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Idade', value: age ? `${age} anos` : '--' },
              { label: 'Sexo', value: patient?.gender === 'male' ? 'Masculino' : patient?.gender === 'female' ? 'Feminino' : '--' },
              { label: 'Altura', value: patient?.height ? `${patient.height} cm` : '--' },
              { label: 'Telefone', value: patient?.phone || '--' }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" /> Ações Rápidas
          </h3>
          <div className="space-y-2">
            {[
              { icon: FileText, label: 'Abrir Anamnese', tab: 'anamnese', gradient: 'from-blue-500 to-indigo-500' },
              { icon: Utensils, label: 'Plano Alimentar', tab: 'plano', gradient: 'from-emerald-500 to-teal-500' },
              { icon: ClipboardList, label: 'Ver Checklist', tab: 'checklist', gradient: 'from-purple-500 to-violet-500' }
            ].map((action, i) => {
              const AIcon = action.icon;
              return (
                <button
                  key={i}
                  onClick={() => onNavigate(action.tab)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all group"
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white shadow-sm`}>
                    <AIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 flex-1 text-left">{action.label}</span>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-violet-500 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Observações */}
      {patient?.notes && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-600" /> Observações
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap text-sm">{patient.notes}</p>
        </div>
      )}

      {/* Timeline de Atividade Recente */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" data-testid="resumo-timeline-card">
        <PatientTimeline patientId={patientId} limit={10} />
      </div>
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
      trackProfessionalFeature('create_anamnesis');
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
      trackProfessionalFeature('send_patient_message');
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
        <EmptyState type="feedback" title="Nenhum recado enviado" description="Envie recados ao paciente usando o botão acima. Recados fixados ficam sempre visíveis." />
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
  const journeySave = useSaveStatus();
  const planSave = useSaveStatus();
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
    planSave.markSaving();
    const { error } = await upsertPatientPlan(patientId, {
      ...planForm,
      plan_price: planForm.plan_price ? parseFloat(planForm.plan_price) : null,
      professional_id: professionalId
    });
    if (error) { toast.error('Erro ao salvar plano'); planSave.markError(); }
    else { toast.success('Plano financeiro salvo!'); planSave.markSaved(); loadPatientPlan(); }
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
    journeySave.markSaving();
    try {
      const { error } = await upsertPatientJourney(patientId, {
        ...journeyForm,
        initial_weight: journeyForm.initial_weight ? parseFloat(journeyForm.initial_weight) : null,
        target_weight: journeyForm.target_weight ? parseFloat(journeyForm.target_weight) : null
      });

      if (error) {
        toast.error('Erro ao salvar jornada');
        journeySave.markError();
        return;
      }

      toast.success('Jornada do paciente atualizada!');
      journeySave.markSaved();
      loadJourney();
    } catch (error) {
      toast.error('Erro ao salvar');
      journeySave.markError();
    } finally {
      setSaving(false);
    }
  };

  // 🎯 PROTOCOLOS - Controle do Profissional
  const [availableProtocols] = useState([
    { id: 'agua', name: 'Protocolo de Água', category: 'hidratacao', duration: 14 },
    { id: 'chas', name: 'Protocolo de Chás', category: 'termogenicos', duration: 30 },
    { id: 'jejum', name: 'Protocolo de Jejum', category: 'alimentacao', duration: 21 }
  ]);
  const [activatingProtocol, setActivatingProtocol] = useState(false);

  const handleActivateProtocol = async (protocolId) => {
    setActivatingProtocol(true);
    try {
      // TODO: Chamar API real quando tabelas estiverem criadas
      // const { authenticatedPost } = await import('@/lib/apiClient');
      // await authenticatedPost('/api/professional/protocols/activate', {
      //   patient_id: patientId,
      //   protocol_id: protocolId
      // });
      
      toast.success('Protocolo ativado! (Mock - aguardando criação das tabelas SQL)');
      console.log('🎯 Protocolo ativado:', protocolId, 'para paciente:', patientId);
    } catch (error) {
      console.error('Erro ao ativar protocolo:', error);
      toast.error('Erro ao ativar protocolo');
    } finally {
      setActivatingProtocol(false);
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

              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleSaveJourney} 
                  disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  <Save size={16} className="mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Configuração da Jornada'}
                </Button>
                <SaveStatusIndicator status={journeySave.status} />
              </div>
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


      {/* 🎯 SEÇÃO: PROTOCOLOS ATIVOS - CONTROLE DO PROFISSIONAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Protocolos do Programa
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Ative protocolos para guiar a jornada do paciente no Projeto Biquíni Branco
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availableProtocols.map((protocol) => (
              <div 
                key={protocol.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">{protocol.name}</p>
                  <p className="text-sm text-gray-600">
                    {protocol.category} • {protocol.duration} dias
                  </p>
                </div>
                <Button 
                  onClick={() => handleActivateProtocol(protocol.id)}
                  disabled={activatingProtocol}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {activatingProtocol ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Ativar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> Os protocolos ativados aparecerão automaticamente no dashboard do paciente em <strong>"Meu Projeto"</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

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
          <div className="flex items-center gap-3">
            <Button onClick={handleSavePlan} disabled={savingPlan} className="flex-1 bg-teal-600 hover:bg-teal-700">
              <Save size={16} className="mr-2" />
              {savingPlan ? 'Salvando...' : 'Salvar Plano Financeiro'}
            </Button>
            <SaveStatusIndicator status={planSave.status} />
          </div>
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
  const [assessment, setAssessment] = useState(null);
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
      const [patientResult, planResult, allPlansResult, anamnesisResult, adherenceResult, draftResult, assessmentResult] = await Promise.allSettled([
        getPatientById(id),
        getPatientMealPlan(id, profile.id),
        getMealPlans(profile.id, 'professional'),
        getAnamnesis(id),
        getChecklistAdherence(id, 7),
        getDraftMealPlan(id),
        getLatestPhysicalAssessment(id)
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

      if (assessmentResult.status === 'fulfilled') {
        setAssessment(assessmentResult.value.data);
      }

      // Sincronizar templates globais para o paciente
      try {
        const syncResult = await syncTemplatesForPatient(id);
        if (!syncResult.error) {
          console.log('✅ Templates sincronizados para o paciente');
        }
      } catch (syncError) {
        console.warn('⚠️ sync_templates_for_patient:', syncError?.message || 'erro desconhecido');
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
    trackProfessionalFeature('view_patient_profile');
  }, [loadPatientData]);

  // Gerar IA Plan inteligente
  const handleGenerateDraftPlan = async (variation = 1) => {
    if (!anamnesis || !patient) {
      toast.error('É necessário ter anamnese completa');
      return;
    }

    setLoading(true);
    try {
      // Gerar IA Plan usando IA com variação
      const smartPlan = generateSmartMealPlan(anamnesis, patient, variation);
      console.log('IA Plan gerado (variação ' + variation + '):', smartPlan);
      
      // Salvar no banco
      const { data: savedDraft, error: saveError } = await saveDraftMealPlan(id, profile.id, smartPlan);
      
      if (saveError) {
        console.error('Erro ao salvar IA Plan:', saveError);
        toast.error('Erro ao salvar IA Plan no banco: ' + (saveError.message || 'Verifique se a tabela draft_meal_plans existe'));
        // Ainda assim mostrar o plano gerado
        setDraftPlan(smartPlan);
        return;
      }
      
      console.log('IA Plan salvo com sucesso:', savedDraft);
      
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
      toast.success('🤖 IA Plan gerado com sucesso!');
      trackProfessionalFeature('create_draft_plan');
    } catch (error) {
      console.error('Error generating IA Plan:', error);
      toast.error('Erro ao gerar IA Plan');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar IA Plan editado
  const handleUpdateDraftPlan = async (updatedPlan) => {
    setLoading(true);
    try {
      await updateDraftMealPlan(id, updatedPlan);
      setDraftPlan(updatedPlan);
      toast.success('IA Plan atualizado!');
    } catch (error) {
      console.error('Error updating IA Plan:', error);
      toast.error('Erro ao atualizar IA Plan');
    } finally {
      setLoading(false);
    }
  };

  // Salvar IA Plan como rascunho no banco
  const handleSaveAsDraft = async (planToSave) => {
    if (!planToSave) {
      toast.error('Nenhum IA Plan para salvar');
      return;
    }
    
    try {
      const { error } = await saveDraftMealPlan(id, profile.id, planToSave);
      if (error) {
        throw error;
      }
      toast.success('IA Plan salvo!');
    } catch (error) {
      console.error('Error saving IA Plan:', error);
      toast.error('Erro ao salvar IA Plan');
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
      trackProfessionalFeature('create_feedback_reminder');
      setShowReminderModal(false);
      setReminderForm({ type: 'feedback', date: '', notes: '' });
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Erro ao criar lembrete');
    }
  };

  // Usar IA Plan como plano oficial
  const handleUseAsOfficialPlan = async (draftPlan) => {
    if (!draftPlan || !patient) {
      toast.error('IA Plan inválido');
      return;
    }

    try {
      // Armazena o draft no sessionStorage para uso no editor
      sessionStorage.setItem('draftPlanToLoad', JSON.stringify(draftPlan));
      
      // Redireciona para o editor com o draft como parâmetro
      navigate(`/professional/meal-plan-editor?patient=${id}&fromDraft=true`);
      
      toast.success('Abrindo editor com IA Plan...');
    } catch (error) {
      console.error('Error using IA Plan as official plan:', error);
      toast.error('Erro ao copiar IA Plan');
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
      <div data-testid="patient-profile" className="space-y-6 max-w-7xl mx-auto pb-8">
        {/* ========== PREMIUM HEADER ========== */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <div className="flex items-center gap-5">
                <img 
                  src={avatar} 
                  alt={patient.name} 
                  className="w-20 h-20 rounded-2xl border-4 border-white/30 shadow-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight truncate">{patient.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-white/70 text-sm">
                    <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {patient.email}</span>
                    {patient.phone && <span className="hidden md:flex items-center gap-1">• {patient.phone}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {mealPlan && <Badge className="bg-white/20 text-white border-0 text-[10px]"><Utensils className="h-3 w-3 mr-1" /> Plano Ativo</Badge>}
                    {anamnesis?.status === 'complete' && <Badge className="bg-white/20 text-white border-0 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Anamnese OK</Badge>}
                    {(adherence?.adherence || 0) >= 70 && <Badge className="bg-white/20 text-white border-0 text-[10px]"><Star className="h-3 w-3 mr-1" /> Boa Aderência</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    className="bg-white/20 text-white hover:bg-white/30 border border-white/20 backdrop-blur-sm shadow-lg"
                    onClick={() => setShowReminderModal(true)}
                  >
                    <Bell size={16} className="mr-2" /> Lembrete
                  </Button>
                  <Button 
                    className="bg-white text-teal-700 hover:bg-white/90 shadow-lg font-semibold"
                    onClick={() => navigate(`/professional/meal-plan-editor?patient=${id}`)}
                  >
                    <Utensils size={16} className="mr-2" /> Plano Alimentar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== PREMIUM TABS ========== */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { value: 'resumo', label: 'Resumo', icon: Activity },
              { value: 'anamnese', label: 'Anamnese', icon: FileText },
              { value: 'avaliacao', label: 'Av. Física', icon: Heart },
              { value: 'plano', label: 'Plano', icon: Utensils },
              { value: 'checklist', label: 'Checklist', icon: ClipboardList },
              { value: 'receitas', label: 'Receitas', icon: ChefHat },
              { value: 'recados', label: 'Recados', icon: MessageSquare },
              { value: 'projeto', label: 'Projeto', icon: Target }
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0
                    ${isActive 
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-200' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
          <TabsContent value="resumo">
            <ResumoTab 
              patient={patient} 
              mealPlan={mealPlan} 
              anamnesis={anamnesis} 
              adherence={adherence}
              assessment={assessment}
              onNavigate={handleNavigateTab}
              patientId={id}
            />
          </TabsContent>

          <TabsContent value="anamnese">
            <AnamneseFormComplete
              anamnesis={anamnesis} 
              patientId={id} 
              professionalId={patient?.professional_id || profile?.id}
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

          <TabsContent value="plano">
            <div className="space-y-6">
              
              {/* ========== IA PLAN INTEGRADO ========== */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50 to-white p-6 shadow-lg">
                <div className="absolute top-0 right-0 w-40 h-40 bg-violet-100/50 rounded-full -translate-y-20 translate-x-20" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">🤖 IA Plan</h3>
                      <p className="text-sm text-gray-500">Gerado automaticamente pela anamnese • Visual apenas para você</p>
                    </div>
                  </div>
                  
                  <DraftMealPlanViewerCompact
                    draftPlan={draftPlan}
                    anamnesis={anamnesis}
                    physicalAssessment={assessment}
                    patient={patient}
                    onUpdate={handleUpdateDraftPlan}
                    onRegenerate={handleGenerateDraftPlan}
                    onUseAsOfficial={handleUseAsOfficialPlan}
                    onSaveAsDraft={handleSaveAsDraft}
                    loading={loading}
                    patientId={id}
                    professionalId={profile?.id}
                    allMealPlans={allMealPlans}
                    currentMealPlan={mealPlan}
                    onNavigateToPlan={(planId) => navigate(`/professional/meal-plan-editor?patient=${id}&plan=${planId}`)}
                    onPlanCreated={() => loadPatientData(true)}
                    onEditPlan={() => navigate(`/professional/meal-plan-editor?patient=${id}&plan=${mealPlan?.id}`)}
                    onViewPlan={() => setShowMealPlanViewer(true)}
                    onExportPDF={() => {
                      try {
                        generateMealPlanPDF(patient, mealPlan, { name: profile?.name, email: profile?.email });
                        toast.success('PDF gerado!');
                      } catch (error) {
                        toast.error('Erro ao gerar PDF');
                      }
                    }}
                    onCreatePlan={() => navigate(`/professional/meal-plan-editor?patient=${id}`)}
                  />
                </div>
              </div>
              
              {/* Plano Oficial agora está integrado na coluna lateral do IA Plan */}
              {/* Timeline e Histórico também estão na coluna lateral */}
            </div>
          </TabsContent>

          <TabsContent value="checklist">
            <ChecklistTab patientId={id} />
          </TabsContent>

          <TabsContent value="receitas">
            <RecipeGenerator 
              patientProfile={{
                id: patient?.id,
                goal: anamnesis?.objetivo_nutricional,
                daily_targets: mealPlan?.daily_targets,
                dietary_restrictions: anamnesis?.restricoes_alimentares || []
              }}
              onRecipeGenerated={(recipe) => {
                console.log('Receita gerada:', recipe);
              }}
            />
          </TabsContent>

          <TabsContent value="recados">
            <RecadosTab patientId={id} professionalId={profile?.id} />
          </TabsContent>

          <TabsContent value="projeto">
            <ProjetoTab patientId={id} professionalId={profile?.id} patient={patient} />
          </TabsContent>
          </div>
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
