import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, Ruler, Scale, Heart, Camera, Plus, Save, Trash2, 
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  Calendar, FileText, Loader2, AlertCircle, Sparkles, Download
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getPhysicalAssessments,
  createPhysicalAssessment,
  updatePhysicalAssessment,
  deletePhysicalAssessment,
  compareAssessments,
  createPersonalizedTip,
  createAutomaticTips,
  getAnamnesis
} from '@/lib/supabase';
import ImageUploader from '@/components/ImageUploader';
import LiveTipsPreview from '@/components/LiveTipsPreview';
import RiskScoreCard from '@/components/RiskScoreCard';
import { generateAssessmentTips as generateDynamicAssessmentTips } from '@/utils/dynamicTips';

// Função para gerar dica personalizada baseada na avaliação física
const generateAssessmentTip = (assessment, patient, previousAssessment) => {
  const name = patient?.name?.split(' ')[0] || 'Paciente';
  let title = `📊 Análise da sua Avaliação Física`;
  let content = '';
  
  // Analisar IMC
  if (assessment.bmi) {
    const bmi = parseFloat(assessment.bmi);
    if (bmi < 18.5) {
      content += `${name}, seu IMC está em ${bmi} (abaixo do peso). Vamos trabalhar juntos para alcançar um peso saudável com uma alimentação nutritiva e equilibrada! `;
    } else if (bmi >= 18.5 && bmi < 25) {
      content += `Parabéns ${name}! Seu IMC de ${bmi} está na faixa ideal. Continue mantendo seus bons hábitos! `;
    } else if (bmi >= 25 && bmi < 30) {
      content += `${name}, seu IMC de ${bmi} indica sobrepeso. Com ajustes na alimentação e atividade física, vamos alcançar seu peso ideal! `;
    } else {
      content += `${name}, seu IMC de ${bmi} merece atenção especial. Estou aqui para te ajudar nessa jornada de transformação! `;
    }
  }
  
  // Comparar com avaliação anterior
  if (previousAssessment && assessment.weight && previousAssessment.weight) {
    const weightDiff = assessment.weight - previousAssessment.weight;
    if (weightDiff < -1) {
      content += `🎉 Você perdeu ${Math.abs(weightDiff).toFixed(1)}kg desde a última avaliação! Excelente progresso! `;
    } else if (weightDiff > 1) {
      content += `Houve um ganho de ${weightDiff.toFixed(1)}kg. Vamos ajustar sua estratégia para retomar o caminho! `;
    } else {
      content += `Seu peso se manteve estável. `;
    }
  }
  
  // Analisar % de gordura
  if (assessment.body_fat_percentage) {
    const bf = parseFloat(assessment.body_fat_percentage);
    if (bf > 25 && patient?.sex === 'male') {
      content += `Sua gordura corporal está em ${bf}%. Vamos focar em reduzi-la para melhorar sua saúde! `;
    } else if (bf > 32 && patient?.sex === 'female') {
      content += `Sua gordura corporal está em ${bf}%. Com o plano certo, vamos alcançar uma composição corporal mais saudável! `;
    }
  }
  
  // Analisar relação cintura/quadril
  if (assessment.waist_hip_ratio) {
    const whr = parseFloat(assessment.waist_hip_ratio);
    if ((patient?.sex === 'male' && whr > 0.9) || (patient?.sex === 'female' && whr > 0.85)) {
      content += `⚠️ Sua relação cintura/quadril (${whr}) indica acúmulo de gordura abdominal. Isso aumenta riscos cardiovasculares - vamos trabalhar nisso! `;
    }
  }
  
  // Mensagem motivacional final
  content += `\n\n💪 Lembre-se: cada pequena mudança conta. Estou aqui para te apoiar em cada passo dessa jornada!`;
  
  return { title, content };
};

const PhysicalAssessmentEditor = ({ patientId, professionalId, patient, onTipCreated, onRefreshPatient }) => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [anamnesis, setAnamnesisData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    circumferences: false,
    composition: false,
    skinfolds: false,
    vitals: false,
    photos: false,
    custom: false
  });
  
  const [formData, setFormData] = useState({
    assessment_date: new Date().toISOString().split('T')[0],
    // Dados básicos
    weight: '',
    height: '',
    // Circunferências
    waist: '',
    hip: '',
    arm_right: '',
    arm_left: '',
    thigh_right: '',
    thigh_left: '',
    calf_right: '',
    calf_left: '',
    chest: '',
    abdomen: '',
    neck: '',
    // Composição corporal
    body_fat_percentage: '',
    lean_mass: '',
    fat_mass: '',
    body_water: '',
    visceral_fat: '',
    bone_mass: '',
    muscle_mass: '',
    // Dobras cutâneas
    skinfold_triceps: '',
    skinfold_biceps: '',
    skinfold_subscapular: '',
    skinfold_suprailiac: '',
    skinfold_abdominal: '',
    skinfold_thigh: '',
    skinfold_chest: '',
    skinfold_axillary: '',
    // Dados vitais
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    basal_metabolic_rate: '',
    // Fotos
    photo_front: '',
    photo_side: '',
    photo_back: '',
    // Campos personalizados
    custom_fields: {},
    // Observações
    notes: ''
  });

  useEffect(() => {
    loadAssessments();
  }, [patientId]);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const { data, error } = await getPhysicalAssessments(patientId);
      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      toast.error('Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados da anamnese e do paciente para pré-preencher
  const loadFromAnamnesis = async () => {
    try {
      console.log('🔍 Buscando dados para importar...');
      console.log('📋 Patient recebido:', patient);
      
      // Se não tiver dados do paciente atualizados, tentar atualizar primeiro
      if (onRefreshPatient && (!patient?.current_weight && !patient?.height)) {
        console.log('🔄 Paciente sem dados, tentando refresh...');
        await onRefreshPatient();
        toast.info('Atualizando dados do paciente...');
        // Aguardar um pouco para o state atualizar
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Buscar anamnese diretamente do banco
      const { data: anamnesis, error } = await getAnamnesis(patientId);
      console.log('📋 Anamnese encontrada:', anamnesis);
      if (error) {
        console.warn('Erro ao buscar anamnese:', error);
      }

      // Mapear campos para a avaliação física
      const updates = {};
      
      // 1. Dados do paciente (prioridade)
      if (patient?.current_weight) {
        updates.weight = patient.current_weight;
        console.log('✅ Peso do paciente:', patient.current_weight);
      }
      if (patient?.height) {
        updates.height = patient.height;
        console.log('✅ Altura do paciente:', patient.height);
      }
      if (patient?.goal_weight) {
        updates.goal_weight = patient.goal_weight;
      }
      
      // 2. Dados da anamnese (complementar ou se paciente não tem)
      if (anamnesis) {
        console.log('📋 Campos da anamnese:', Object.keys(anamnesis));
        
        // Peso - usar da anamnese se não tiver do paciente
        if (!updates.weight && (anamnesis.current_weight || anamnesis.weight)) {
          updates.weight = anamnesis.current_weight || anamnesis.weight;
          console.log('✅ Peso da anamnese:', updates.weight);
        }
        // Altura  
        if (!updates.height && anamnesis.height) {
          updates.height = anamnesis.height;
          console.log('✅ Altura da anamnese:', updates.height);
        }
        // Circunferências
        if (anamnesis.waist_circumference) updates.waist = anamnesis.waist_circumference;
        if (anamnesis.hip_circumference) updates.hip = anamnesis.hip_circumference;
        if (anamnesis.neck_circumference) updates.neck = anamnesis.neck_circumference;
        
        // Pressão arterial
        if (anamnesis.blood_pressure) {
          const bp = anamnesis.blood_pressure.toString().split('/');
          if (bp.length === 2) {
            updates.blood_pressure_systolic = parseInt(bp[0]);
            updates.blood_pressure_diastolic = parseInt(bp[1]);
          }
        }
        if (anamnesis.heart_rate) updates.heart_rate = anamnesis.heart_rate;
        
        // Goal weight da anamnese
        if (!updates.goal_weight && anamnesis.goal_weight) {
          updates.goal_weight = anamnesis.goal_weight;
        }
      }
      
      // 3. Calcular IMC se tiver peso e altura
      if (updates.weight && updates.height) {
        const heightM = parseFloat(updates.height) / 100;
        updates.bmi = (parseFloat(updates.weight) / (heightM * heightM)).toFixed(1);
        console.log('✅ IMC calculado:', updates.bmi);
      }

      console.log('📊 Updates a aplicar:', updates);

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
        const fields = Object.keys(updates);
        toast.success(`✅ ${fields.length} campos importados: ${fields.join(', ')}`);
      } else {
        console.warn('⚠️ Nenhum dado encontrado');
        toast.warning('Nenhum dado encontrado. Preencha peso/altura na Anamnese primeiro.');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: { ...prev.custom_fields, [key]: value }
    }));
  };

  const addCustomField = () => {
    const key = prompt('Nome do campo personalizado:');
    if (key && key.trim()) {
      handleCustomFieldChange(key.trim(), '');
    }
  };

  const removeCustomField = (key) => {
    setFormData(prev => {
      const newCustom = { ...prev.custom_fields };
      delete newCustom[key];
      return { ...prev, custom_fields: newCustom };
    });
  };

  const resetForm = () => {
    setFormData({
      assessment_date: new Date().toISOString().split('T')[0],
      weight: '', height: '',
      waist: '', hip: '', arm_right: '', arm_left: '',
      thigh_right: '', thigh_left: '', calf_right: '', calf_left: '',
      chest: '', abdomen: '', neck: '',
      body_fat_percentage: '', lean_mass: '', fat_mass: '',
      body_water: '', visceral_fat: '', bone_mass: '', muscle_mass: '',
      skinfold_triceps: '', skinfold_biceps: '', skinfold_subscapular: '',
      skinfold_suprailiac: '', skinfold_abdominal: '', skinfold_thigh: '',
      skinfold_chest: '', skinfold_axillary: '',
      blood_pressure_systolic: '', blood_pressure_diastolic: '',
      heart_rate: '', basal_metabolic_rate: '',
      photo_front: '', photo_side: '', photo_back: '',
      custom_fields: {}, notes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEditing = (assessment) => {
    setEditingId(assessment.id);
    setFormData({
      assessment_date: assessment.assessment_date || new Date().toISOString().split('T')[0],
      weight: assessment.weight || '',
      height: assessment.height || '',
      waist: assessment.waist || '',
      hip: assessment.hip || '',
      arm_right: assessment.arm_right || '',
      arm_left: assessment.arm_left || '',
      thigh_right: assessment.thigh_right || '',
      thigh_left: assessment.thigh_left || '',
      calf_right: assessment.calf_right || '',
      calf_left: assessment.calf_left || '',
      chest: assessment.chest || '',
      abdomen: assessment.abdomen || '',
      neck: assessment.neck || '',
      body_fat_percentage: assessment.body_fat_percentage || '',
      lean_mass: assessment.lean_mass || '',
      fat_mass: assessment.fat_mass || '',
      body_water: assessment.body_water || '',
      visceral_fat: assessment.visceral_fat || '',
      bone_mass: assessment.bone_mass || '',
      muscle_mass: assessment.muscle_mass || '',
      skinfold_triceps: assessment.skinfold_triceps || '',
      skinfold_biceps: assessment.skinfold_biceps || '',
      skinfold_subscapular: assessment.skinfold_subscapular || '',
      skinfold_suprailiac: assessment.skinfold_suprailiac || '',
      skinfold_abdominal: assessment.skinfold_abdominal || '',
      skinfold_thigh: assessment.skinfold_thigh || '',
      skinfold_chest: assessment.skinfold_chest || '',
      skinfold_axillary: assessment.skinfold_axillary || '',
      blood_pressure_systolic: assessment.blood_pressure_systolic || '',
      blood_pressure_diastolic: assessment.blood_pressure_diastolic || '',
      heart_rate: assessment.heart_rate || '',
      basal_metabolic_rate: assessment.basal_metabolic_rate || '',
      photo_front: assessment.photo_front || '',
      photo_side: assessment.photo_side || '',
      photo_back: assessment.photo_back || '',
      custom_fields: assessment.custom_fields || {},
      notes: assessment.notes || ''
    });
    setShowForm(true);
    setExpandedSections({ basic: true, circumferences: true, composition: true, skinfolds: true, vitals: true, photos: true, custom: true });
  };

  const handleSave = async (generateTip = false) => {
    setSaving(true);
    try {
      // Preparar dados (remover campos vazios)
      const dataToSave = { patient_id: patientId, professional_id: professionalId };
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null) {
          dataToSave[key] = formData[key];
        }
      });

      let savedAssessment;
      if (editingId) {
        const { data, error } = await updatePhysicalAssessment(editingId, dataToSave);
        if (error) throw error;
        savedAssessment = data;
        toast.success('Avaliação atualizada!');
      } else {
        const { data, error } = await createPhysicalAssessment(dataToSave);
        if (error) throw error;
        savedAssessment = data;
        toast.success('Avaliação criada!');
      }

      // Gerar dica personalizada se solicitado
      if (generateTip && savedAssessment) {
        const previousAssessment = assessments.length > 0 ? assessments[0] : null;
        
        // Usar o novo sistema de dicas dinâmicas
        const tips = generateDynamicAssessmentTips(savedAssessment, patient, previousAssessment);
        
        if (tips.length > 0) {
          const tipsToSend = tips.map(tip => ({
            title: tip.title,
            content: tip.content,
            category: tip.category
          }));
          
          const { error: tipError } = await createAutomaticTips(patientId, professionalId, tipsToSend);
          if (tipError) {
            console.warn('Erro ao criar dicas:', tipError);
          } else {
            toast.success(`${tips.length} dica(s) personalizada(s) enviada(s)! ✨`);
            if (onTipCreated) onTipCreated();
          }
        } else {
          // Fallback para a dica antiga se não houver dicas dinâmicas
          const tip = generateAssessmentTip(savedAssessment, patient, previousAssessment);
          const { error: tipError } = await createPersonalizedTip(patientId, professionalId, tip);
          if (tipError) {
            console.warn('Erro ao criar dica:', tipError);
          } else {
            toast.success('Dica personalizada criada! ✨');
            if (onTipCreated) onTipCreated();
          }
        }
      }

      await loadAssessments();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar avaliação');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta avaliação?')) return;
    
    try {
      const { error } = await deletePhysicalAssessment(id);
      if (error) throw error;
      toast.success('Avaliação excluída');
      await loadAssessments();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir');
    }
  };

  const renderInputField = (label, field, unit = '', type = 'number') => (
    <div>
      <Label className="text-xs text-gray-600">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type={type}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="h-9"
          step={type === 'number' ? '0.01' : undefined}
        />
        {unit && <span className="text-xs text-gray-500 w-8">{unit}</span>}
      </div>
    </div>
  );

  const renderSectionHeader = (title, icon, section, color = 'teal') => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className={`w-full flex items-center justify-between p-3 bg-${color}-50 rounded-lg hover:bg-${color}-100 transition-colors`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-gray-700">{title}</span>
      </div>
      {expandedSections[section] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  );

  const getDiffBadge = (current, previous, field, inverse = false) => {
    if (!current || !previous || !current[field] || !previous[field]) return null;
    
    const diff = current[field] - previous[field];
    if (Math.abs(diff) < 0.1) return null;
    
    const isPositive = inverse ? diff < 0 : diff > 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const Icon = diff > 0 ? TrendingUp : TrendingDown;
    
    return (
      <span className={`flex items-center gap-1 text-xs ${color}`}>
        <Icon size={12} />
        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" />
          <p className="text-gray-500 mt-2">Carregando avaliações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Avaliação Física</h3>
          <p className="text-sm text-gray-500">{assessments.length} avaliação(ões) registrada(s)</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" /> Nova Avaliação
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              {editingId ? 'Editar Avaliação' : 'Nova Avaliação Física'}
            </CardTitle>
            <CardDescription>
              Preencha os campos disponíveis. Campos vazios serão ignorados.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Data e Botão Carregar Dados */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <Label>Data da Avaliação</Label>
                <Input
                  type="date"
                  value={formData.assessment_date}
                  onChange={(e) => handleInputChange('assessment_date', e.target.value)}
                  className="w-48"
                />
              </div>
              {!editingId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={loadFromAnamnesis}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Carregar dados da Anamnese
                </Button>
              )}
            </div>

            {/* Dados Básicos */}
            {renderSectionHeader('Dados Básicos', <Scale size={18} className="text-teal-600" />, 'basic')}
            {expandedSections.basic && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {renderInputField('Peso', 'weight', 'kg')}
                {renderInputField('Altura', 'height', 'cm')}
                <div>
                  <Label className="text-xs text-gray-600">IMC (calculado)</Label>
                  <div className="h-9 flex items-center px-3 bg-gray-100 rounded-md text-gray-700 font-medium">
                    {formData.weight && formData.height 
                      ? (formData.weight / Math.pow(formData.height / 100, 2)).toFixed(1)
                      : '-'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Circunferências */}
            {renderSectionHeader('Circunferências', <Ruler size={18} className="text-blue-600" />, 'circumferences', 'blue')}
            {expandedSections.circumferences && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {renderInputField('Cintura', 'waist', 'cm')}
                {renderInputField('Quadril', 'hip', 'cm')}
                {renderInputField('Pescoço', 'neck', 'cm')}
                {renderInputField('Tórax', 'chest', 'cm')}
                {renderInputField('Abdômen', 'abdomen', 'cm')}
                {renderInputField('Braço D', 'arm_right', 'cm')}
                {renderInputField('Braço E', 'arm_left', 'cm')}
                {renderInputField('Coxa D', 'thigh_right', 'cm')}
                {renderInputField('Coxa E', 'thigh_left', 'cm')}
                {renderInputField('Panturrilha D', 'calf_right', 'cm')}
                {renderInputField('Panturrilha E', 'calf_left', 'cm')}
                <div>
                  <Label className="text-xs text-gray-600">Rel. Cintura/Quadril</Label>
                  <div className="h-9 flex items-center px-3 bg-gray-100 rounded-md text-gray-700 font-medium">
                    {formData.waist && formData.hip 
                      ? (formData.waist / formData.hip).toFixed(3)
                      : '-'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Composição Corporal */}
            {renderSectionHeader('Composição Corporal', <Activity size={18} className="text-purple-600" />, 'composition', 'purple')}
            {expandedSections.composition && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {renderInputField('% Gordura', 'body_fat_percentage', '%')}
                {renderInputField('Massa Magra', 'lean_mass', 'kg')}
                {renderInputField('Massa Gorda', 'fat_mass', 'kg')}
                {renderInputField('% Água', 'body_water', '%')}
                {renderInputField('Gord. Visceral', 'visceral_fat', '')}
                {renderInputField('Massa Óssea', 'bone_mass', 'kg')}
                {renderInputField('Massa Muscular', 'muscle_mass', 'kg')}
              </div>
            )}

            {/* Dobras Cutâneas */}
            {renderSectionHeader('Dobras Cutâneas', <FileText size={18} className="text-orange-600" />, 'skinfolds', 'orange')}
            {expandedSections.skinfolds && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {renderInputField('Tríceps', 'skinfold_triceps', 'mm')}
                {renderInputField('Bíceps', 'skinfold_biceps', 'mm')}
                {renderInputField('Subescapular', 'skinfold_subscapular', 'mm')}
                {renderInputField('Suprailíaca', 'skinfold_suprailiac', 'mm')}
                {renderInputField('Abdominal', 'skinfold_abdominal', 'mm')}
                {renderInputField('Coxa', 'skinfold_thigh', 'mm')}
                {renderInputField('Peitoral', 'skinfold_chest', 'mm')}
                {renderInputField('Axilar Média', 'skinfold_axillary', 'mm')}
              </div>
            )}

            {/* Dados Vitais */}
            {renderSectionHeader('Dados Vitais', <Heart size={18} className="text-red-600" />, 'vitals', 'red')}
            {expandedSections.vitals && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {renderInputField('PA Sistólica', 'blood_pressure_systolic', 'mmHg')}
                {renderInputField('PA Diastólica', 'blood_pressure_diastolic', 'mmHg')}
                {renderInputField('Freq. Cardíaca', 'heart_rate', 'bpm')}
                {renderInputField('TMB', 'basal_metabolic_rate', 'kcal')}
              </div>
            )}

            {/* Fotos */}
            {renderSectionHeader('Fotos', <Camera size={18} className="text-pink-600" />, 'photos', 'pink')}
            {expandedSections.photos && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <ImageUploader
                  label="Foto Frontal"
                  value={formData.photo_front}
                  onChange={(url) => handleInputChange('photo_front', url)}
                  folder="assessments/front"
                />
                <ImageUploader
                  label="Foto Lateral"
                  value={formData.photo_side}
                  onChange={(url) => handleInputChange('photo_side', url)}
                  folder="assessments/side"
                />
                <ImageUploader
                  label="Foto Costas"
                  value={formData.photo_back}
                  onChange={(url) => handleInputChange('photo_back', url)}
                  folder="assessments/back"
                />
              </div>
            )}

            {/* Campos Personalizados */}
            {renderSectionHeader('Campos Personalizados', <Plus size={18} className="text-gray-600" />, 'custom', 'gray')}
            {expandedSections.custom && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                {Object.entries(formData.custom_fields).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Label className="text-xs text-gray-600 w-32">{key}</Label>
                    <Input
                      value={value}
                      onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeCustomField(key)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addCustomField}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Campo
                </Button>
              </div>
            )}

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Anotações sobre a avaliação..."
                rows={3}
              />
            </div>

            {/* Preview de Dicas em Tempo Real */}
            <LiveTipsPreview
              formData={formData}
              patient={patient}
              previousAssessment={assessments.length > 0 ? assessments[0] : null}
              type="assessment"
              patientId={patientId}
              professionalId={professionalId}
              showSendButton={false}
            />

            {/* Ações */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button 
                onClick={() => handleSave(false)} 
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
              <Button 
                onClick={() => handleSave(true)} 
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Salvar + Gerar Dica
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Avaliações */}
      {assessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assessments.map((assessment, index) => {
                const previousAssessment = assessments[index + 1];
                return (
                  <div 
                    key={assessment.id} 
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {new Date(assessment.assessment_date).toLocaleDateString('pt-BR')}
                          </span>
                          {index === 0 && <Badge className="bg-teal-500">Mais recente</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                          {assessment.weight && (
                            <span className="flex items-center gap-1">
                              <Scale className="w-4 h-4" /> {assessment.weight} kg
                              {getDiffBadge(assessment, previousAssessment, 'weight', true)}
                            </span>
                          )}
                          {assessment.bmi && (
                            <span>IMC: {assessment.bmi}</span>
                          )}
                          {assessment.body_fat_percentage && (
                            <span className="flex items-center gap-1">
                              Gordura: {assessment.body_fat_percentage}%
                              {getDiffBadge(assessment, previousAssessment, 'body_fat_percentage', true)}
                            </span>
                          )}
                          {assessment.muscle_mass && (
                            <span className="flex items-center gap-1">
                              Massa muscular: {assessment.muscle_mass} kg
                              {getDiffBadge(assessment, previousAssessment, 'muscle_mass')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEditing(assessment)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(assessment.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sem avaliações */}
      {assessments.length === 0 && !showForm && (
        <Card className="p-8 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Nenhuma avaliação registrada</h3>
          <p className="text-gray-500 mt-2">Clique em "Nova Avaliação" para registrar a primeira avaliação física.</p>
        </Card>
      )}
    </div>
  );
};

export default PhysicalAssessmentEditor;
