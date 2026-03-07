import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, Search, Loader2, User, Users, Phone, Mail, Calendar, Ruler, Scale, Target,
  MoreVertical, Eye, Edit, Archive, ClipboardList, Utensils, ArrowUpDown,
  Filter, Undo2, Activity, CheckCircle2, AlertCircle, MessageSquare, Camera, Weight, X, Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequestGuard } from '@/hooks/useRequestGuard';
import { 
  getProfessionalPatients, 
  createPatientByProfessional, 
  updatePatient,
  archivePatient,
  restorePatient,
  getAllProfessionals,
  getPatientFeedbacks,
  getChecklistAdherence
} from '@/lib/supabase';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { authenticatedPost } from '@/lib/apiClient';
import { upsertPatientSubscription } from '@/lib/supabase';

const PatientsList = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { isProcessing: isCreatingPatient, executeGuarded } = useRequestGuard();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusPatient, setStatusPatient] = useState(null); // Paciente selecionado para ver status
  const [statusData, setStatusData] = useState(null); // Dados do status
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [orderBy, setOrderBy] = useState('recent');
  const [filterProfessional, setFilterProfessional] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterGoal, setFilterGoal] = useState('all');
  const [adherenceData, setAdherenceData] = useState({}); // Score de aderência por paciente
  const [loadingAdherence, setLoadingAdherence] = useState(false);
  
  // Form state separado para não causar re-render do dialog
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formGender, setFormGender] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formCurrentWeight, setFormCurrentWeight] = useState('');
  const [formGoalWeight, setFormGoalWeight] = useState('');
  const [formGoal, setFormGoal] = useState('');
  const [formNotes, setFormNotes] = useState('');
  
  // Novos campos de assinatura
  const [formPackageType, setFormPackageType] = useState('mensal');
  const [formTier, setFormTier] = useState('basic');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formAmountPaid, setFormAmountPaid] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('pix');
  const [formProfessionalId, setFormProfessionalId] = useState('');  // Admin: profissional responsável

  const loadData = useCallback(async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      if (isAdmin) {
        const { data: profsData } = await getAllProfessionals();
        setProfessionals(profsData || []);
      }
      
      const filters = {
        orderBy: orderBy === 'name' ? 'name' : undefined,
        professionalId: isAdmin && filterProfessional !== 'all' ? filterProfessional : undefined
      };
      
      const { data, error } = await getProfessionalPatients(profile.id, isAdmin, filters);
      
      if (error) {
        console.error('❌ Erro ao buscar pacientes:', error);
        toast.error('Erro ao carregar pacientes');
        setPatients([]);
        setLoading(false);
        return;
      }
      
      const mappedPatients = (data || []).map(item => ({
        id: item.patient.id,
        name: item.patient.name,
        email: item.patient.email,
        phone: item.patient.phone || '',
        birth_date: item.patient.birth_date,
        gender: item.patient.gender,
        height: item.patient.height,
        current_weight: item.patient.current_weight,
        goal_weight: item.patient.goal_weight,
        goal: item.patient.goal,
        notes: item.patient.notes,
        status: item.patient.status,
        plan_type: item.patient.plan_type || 'basic',
        professional_id: item.professional_id,
        created_at: item.created_at,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.patient.name)}&background=0F766E&color=fff`
      }));
      
      if (orderBy === 'name') {
        mappedPatients.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      setPatients(mappedPatients);
      
      // Carregar scores de prioridade em background
      if (mappedPatients.length > 0) {
        loadAdherenceData(mappedPatients.map(p => p.id));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  }, [user, profile, isAdmin, orderBy, filterProfessional]);

  // Carregar dados de score de prioridade via API backend
  const loadAdherenceData = async (patientIds) => {
    setLoadingAdherence(true);
    try {
      const scores = await authenticatedPost('/api/scoring/patients/scores', { patient_ids: patientIds });
      // Mapear para o formato esperado pelo template
      const mapped = {};
      for (const [pid, data] of Object.entries(scores)) {
        mapped[pid] = {
          score: data.score,
          level: data.level,
          label: data.label,
          icon: data.status === 'green' ? '✅' : data.status === 'yellow' ? '⚠️' : '🔴',
          color: data.status === 'green' ? 'emerald' : data.status === 'yellow' ? 'amber' : 'red',
          metrics: data.factors,
          alerts: data.alerts || [],
        };
      }
      setAdherenceData(mapped);
    } catch (error) {
      console.error('Erro ao carregar scores:', error);
    } finally {
      setLoadingAdherence(false);
    }
  };

  useEffect(() => {
    loadData();
    trackProfessionalFeature('view_patients_list');
  }, [loadData]);

  // ===== FUNÇÃO PARA CARREGAR STATUS DO PACIENTE =====
  const openPatientStatus = async (patient) => {
    setStatusPatient(patient);
    setStatusData(null);
    setLoadingStatus(true);
    try {
      const [feedbacksRes, checklistRes] = await Promise.allSettled([
        getPatientFeedbacks(patient.id),
        getChecklistAdherence(patient.id, 7)
      ]);

      const feedbacks = feedbacksRes.status === 'fulfilled' ? (feedbacksRes.value.data || []) : [];
      const checklist = checklistRes.status === 'fulfilled' ? checklistRes.value : { adherence: 0, completed: 0, total: 0 };
      
      // Analisar feedbacks recentes (últimos 7 dias)
      const now = new Date();
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const recentFeedbacks = feedbacks.filter(f => new Date(f.created_at) >= sevenDaysAgo);
      
      const hasWeightFeedback = recentFeedbacks.some(f => f.type === 'weight' || f.feedback_type === 'weight');
      const hasPhotoFeedback = recentFeedbacks.some(f => f.type === 'photo' || f.feedback_type === 'photo');
      const hasTextFeedback = recentFeedbacks.some(f => f.type === 'text' || f.feedback_type === 'text' || f.type === 'general');
      
      const feedbackCount = recentFeedbacks.length;
      const checklistComplete = checklist.total > 0 && checklist.adherence >= 80;
      const allDone = feedbackCount >= 1 && checklistComplete;
      
      setStatusData({
        feedbacks: recentFeedbacks,
        feedbackCount,
        hasWeightFeedback,
        hasPhotoFeedback,
        hasTextFeedback,
        checklist,
        checklistComplete,
        allDone,
        totalFeedbacks: feedbacks.length
      });
    } catch (err) {
      console.error('Erro ao carregar status:', err);
      setStatusData({ feedbackCount: 0, checklist: { adherence: 0, completed: 0, total: 0 }, allDone: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPhone('');
    setFormBirthDate('');
    setFormGender('');
    setFormHeight('');
    setFormCurrentWeight('');
    setFormGoalWeight('');
    setFormGoal('');
    setFormNotes('');
    
    // Reset campos de assinatura
    setFormPackageType('mensal');
    setFormTier('basic');
    setFormStartDate('');
    setFormEndDate('');
    setFormAmountPaid('');
    setFormPaymentMethod('pix');
    setFormProfessionalId('');
  };

  // Validação de email inline
  const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email é obrigatório' };
    }
    const trimmed = String(email).trim();
    if (!trimmed) return { valid: false, error: 'Email não pode estar vazio' };
    if (trimmed.includes(' ')) return { valid: false, error: 'Email não pode conter espaços' };
    if ((trimmed.match(/@/g) || []).length !== 1) return { valid: false, error: 'Email deve conter exatamente um @' };
    const [local, domain] = trimmed.split('@');
    if (!local || !domain) return { valid: false, error: 'Email inválido' };
    if (!domain.includes('.')) return { valid: false, error: 'Domínio deve conter pelo menos um ponto (ex: @exemplo.com)' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { valid: false, error: 'Email inválido' };
    return { valid: true, email: trimmed };
  };

  const handleCreatePatient = async () => {
    if (!formName || !formEmail || !formPassword) {
      toast.error('Nome, email e senha são obrigatórios');
      return;
    }

    // 🛡️ ANTI-DOUBLE-SUBMIT: Previne múltiplos cliques
    const result = await executeGuarded(async () => {
      // VALIDAÇÃO DE EMAIL ROBUSTA
      const emailValidation = validateEmail(formEmail);
      if (!emailValidation.valid) {
        toast.error(`❌ ${emailValidation.error}`, { duration: 5000 });
        return;
      }

      if (formPassword.length < 6) {
        toast.error('Senha deve ter pelo menos 6 caracteres');
        return;
      }

      setSaving(true);
    try {
      // 🎯 NOVA LÓGICA: Admin pode ter seus próprios pacientes
      // Se admin não selecionar outro professional, usa seu próprio ID
      const effectiveProfessionalId = isAdmin && formProfessionalId 
        ? formProfessionalId      // Admin delegou para outro professional
        : profile.id;             // Admin como professional OU professional normal
      
      // REMOVER validação obrigatória para admin
      // if (isAdmin && !formProfessionalId) {
      //   toast.error('Admin deve selecionar um profissional responsável');
      //   setSaving(false);
      //   return;
      // }
      
      console.log('📋 Criando paciente - isAdmin:', isAdmin, '| formProfessionalId:', formProfessionalId, '| usando:', effectiveProfessionalId);
      
      const patientData = {
        name: formName,
        email: formEmail,
        password: formPassword,
        phone: formPhone || null,
        birth_date: formBirthDate || null,
        gender: formGender || null,
        height: formHeight ? parseFloat(formHeight) : null,
        current_weight: formCurrentWeight ? parseFloat(formCurrentWeight) : null,
        goal_weight: formGoalWeight ? parseFloat(formGoalWeight) : null,
        goal: formGoal || null,
        notes: formNotes || null,
        // Dados de assinatura
        packageType: formPackageType,
        tier: formTier,
        startDate: formStartDate || new Date().toISOString().split('T')[0],
        endDate: formEndDate || null,
        amountPaid: formAmountPaid ? parseFloat(formAmountPaid) : null
      };

      const { data, error } = await createPatientByProfessional(effectiveProfessionalId, patientData);
      
      if (error || !data) {
        console.error('❌ Erro ao criar paciente:', error);
        console.error('📋 Detalhes completos do erro:', JSON.stringify(error, null, 2));
        
        // Extrai a mensagem de erro mais específica possível
        const errorMessage = error?.message || error?.detail || error?.details || 'Erro desconhecido ao criar paciente';
        toast.error(`Erro ao criar paciente: ${errorMessage}`, { duration: 5000 });
        
        setSaving(false);
        return;
      }
      
      // Criar assinatura se paciente foi criado com sucesso (redundância removida, já criado em createPatientByProfessional)
      
      toast.success(`Paciente criado! Email: ${formEmail} | Senha: ${formPassword}`);
      trackProfessionalFeature('create_patient');
      setIsCreateDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error('Erro inesperado ao criar paciente');
    } finally {
      setSaving(false);
    }
    });

    // Se foi prevenido (clique duplo), não fazer nada
    if (result?.prevented) {
      console.warn('⚠️ Criação de paciente prevenida - request já em andamento');
    }
  };

  const handleEditPatient = async () => {
    if (!selectedPatient) return;

    setSaving(true);
    try {
      const updates = {
        name: formName,
        phone: formPhone || null,
        birth_date: formBirthDate || null,
        gender: formGender || null,
        height: formHeight ? parseFloat(formHeight) : null,
        current_weight: formCurrentWeight ? parseFloat(formCurrentWeight) : null,
        goal_weight: formGoalWeight ? parseFloat(formGoalWeight) : null,
        goal: formGoal || null,
        notes: formNotes || null
      };

      const { error } = await updatePatient(selectedPatient.id, updates);
      if (error) throw error;

      toast.success('Paciente atualizado!');
      setIsEditDialogOpen(false);
      setSelectedPatient(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error('Erro ao atualizar paciente');
    } finally {
      setSaving(false);
    }
  };

  const handleArchivePatient = async () => {
    if (!selectedPatient) return;

    try {
      const { error } = await archivePatient(selectedPatient.id);
      if (error) throw error;

      const archivedPatient = selectedPatient;
      toast.success(
        <div className="flex items-center justify-between w-full">
          <span>Paciente arquivado</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-2 text-teal-700"
            onClick={() => handleUndoArchive(archivedPatient.id)}
          >
            <Undo2 size={14} className="mr-1" /> Desfazer
          </Button>
        </div>,
        { duration: 5000 }
      );
      
      setIsArchiveDialogOpen(false);
      setSelectedPatient(null);
      await loadData();
    } catch (error) {
      console.error('Error archiving patient:', error);
      toast.error('Erro ao arquivar paciente');
    }
  };

  const handleUndoArchive = async (patientId) => {
    try {
      const { error } = await restorePatient(patientId);
      if (error) throw error;
      
      toast.success('Paciente restaurado!');
      await loadData();
    } catch (error) {
      console.error('Error restoring patient:', error);
      toast.error('Erro ao restaurar paciente');
    }
  };

  const openEditDialog = (patient) => {
    setSelectedPatient(patient);
    setFormName(patient.name || '');
    setFormEmail(patient.email || '');
    setFormPhone(patient.phone || '');
    setFormBirthDate(patient.birth_date || '');
    setFormGender(patient.gender || '');
    setFormHeight(patient.height || '');
    setFormCurrentWeight(patient.current_weight || '');
    setFormGoalWeight(patient.goal_weight || '');
    setFormGoal(patient.goal || '');
    setFormNotes(patient.notes || '');
    setIsEditDialogOpen(true);
  };

  const openArchiveDialog = (patient) => {
    setSelectedPatient(patient);
    setIsArchiveDialogOpen(true);
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getGoalLabel = (goal) => {
    const goals = {
      'weight_loss': 'Emagrecimento',
      'muscle_gain': 'Ganho de Massa',
      'maintenance': 'Manutenção',
      'health': 'Saúde',
      'sports': 'Performance',
      'other': 'Outro'
    };
    return goals[goal] || goal || '';
  };

  const filteredPatients = patients.filter(p => {
    // Busca por nome/email
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    // Filtro por status
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && p.status !== 'active') return false;
      if (filterStatus === 'inactive' && p.status === 'active') return false;
    }
    
    // Filtro por tier/plano
    if (filterTier !== 'all') {
      if ((p.plan_type || 'basic') !== filterTier) return false;
    }
    
    // Filtro por objetivo
    if (filterGoal !== 'all') {
      const goal = (p.goal || '').toLowerCase();
      if (filterGoal === 'emagrecimento' && !goal.includes('emagre') && !goal.includes('perder')) return false;
      if (filterGoal === 'massa' && !goal.includes('massa') && !goal.includes('ganho') && !goal.includes('hipertrofia')) return false;
      if (filterGoal === 'saude' && !goal.includes('saude') && !goal.includes('saúde') && !goal.includes('equilíbrio')) return false;
    }
    
    return true;
  });

  return (
    <Layout title="Pacientes" userType={profile?.role || 'professional'}>
      <div data-testid="patients-list" className="max-w-7xl mx-auto space-y-6 pb-8">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-500 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-3">Gestao de Pacientes</span>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight">Meus Pacientes</h1>
                  <p className="text-white/80 text-sm">Gerencie e acompanhe todos os seus pacientes</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Users, value: patients.filter(p => p.status === 'active').length, label: 'Ativos' },
                  { icon: Archive, value: patients.filter(p => p.status !== 'active').length, label: 'Inativos' },
                  { icon: Target, value: patients.length, label: 'Total' },
                  { icon: ClipboardList, value: `${patients.length > 0 ? Math.round((patients.filter(p => p.status === 'active').length / patients.length) * 100) : 0}%`, label: 'Taxa Ativa' }
                ].map((stat, i) => {
                  const StatIcon = stat.icon;
                  return (
                    <div key={i} className="text-center bg-white/15 backdrop-blur-sm rounded-xl p-3">
                      <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-white/20 flex items-center justify-center">
                        <StatIcon className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-xl font-black">{stat.value}</p>
                      <p className="text-[10px] text-white/70">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Header com busca e filtros */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && professionals.length > 0 && (
              <Select value={filterProfessional} onValueChange={setFilterProfessional}>
                <SelectTrigger className="w-[180px]">
                  <Filter size={16} className="mr-2" />
                  <SelectValue placeholder="Profissional" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5}>
                  <SelectItem value="all">Todos Profissionais</SelectItem>
                  {professionals.map(prof => (
                    <SelectItem key={prof.id} value={prof.id}>{prof.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Filtro por Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Filtro por Tier */}
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                <SelectItem value="all">Todos Tiers</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">PRO</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Filtro por Objetivo */}
            <Select value={filterGoal} onValueChange={setFilterGoal}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Objetivo" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                <SelectItem value="all">Todos Objetivos</SelectItem>
                <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                <SelectItem value="massa">Ganho de Massa</SelectItem>
                <SelectItem value="saude">Saúde/Equilíbrio</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={orderBy} onValueChange={setOrderBy}>
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="name">Alfabético</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Limpar filtros */}
            {(filterStatus !== 'all' || filterTier !== 'all' || filterGoal !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterStatus('all'); setFilterTier('all'); setFilterGoal('all'); }}
                className="text-xs text-gray-500 hover:text-red-500"
              >
                <Undo2 size={14} className="mr-1" /> Limpar
              </Button>
            )}
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-teal-700 hover:bg-teal-800" size="lg">
                <Plus size={20} className="mr-2" />
                Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Paciente</DialogTitle>
                <DialogDescription>Cadastre um novo paciente</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* 🎯 Seletor de Profissional Responsável (apenas para Admin que quer delegar) */}
                {isAdmin && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3 border-2 border-blue-200">
                    <h4 className="font-semibold text-blue-900 flex items-center">
                      <Users className="mr-2" size={18} />
                      Atribuir a outro profissional? (opcional)
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">
                      💡 <strong>Deixe sem selecionar</strong> ou escolha você mesmo para o paciente ser seu
                    </p>
                    <Select value={formProfessionalId} onValueChange={setFormProfessionalId}>
                      <SelectTrigger>
                        <SelectValue placeholder="🏠 Seus Pacientes (você como professional)" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5}>
                        {professionals.map(prof => (
                          <SelectItem key={prof.id} value={prof.id}>
                            👤 {prof.name || prof.email} ({prof.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Se não selecionar nenhum, o paciente será vinculado a você
                    </p>
                  </div>
                )}

                {/* Dados Pessoais */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <User className="mr-2" size={18} />
                    Dados Pessoais
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Nome do paciente"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                        <Input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                        <Input
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Senha * (mínimo 6 caracteres)</Label>
                      <Input
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="••••••"
                      />
                      <p className="text-xs text-gray-500 mt-1">Senha para o paciente acessar o sistema</p>
                    </div>
                    <div>
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={formBirthDate}
                        onChange={(e) => setFormBirthDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Sexo</Label>
                      <Select value={formGender} onValueChange={setFormGender}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent position="popper" sideOffset={5}>
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Feminino</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Dados Físicos */}
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <Ruler className="mr-2" size={18} />
                    Dados Físicos
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Altura (cm)</Label>
                      <Input
                        type="number"
                        value={formHeight}
                        onChange={(e) => setFormHeight(e.target.value)}
                        placeholder="170"
                      />
                    </div>
                    <div>
                      <Label>Peso Atual (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formCurrentWeight}
                        onChange={(e) => setFormCurrentWeight(e.target.value)}
                        placeholder="70.5"
                      />
                    </div>
                    <div>
                      <Label>Peso Meta (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formGoalWeight}
                        onChange={(e) => setFormGoalWeight(e.target.value)}
                        placeholder="65.0"
                      />
                    </div>
                  </div>
                </div>

                {/* Objetivo */}
                <div className="bg-teal-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <Target className="mr-2" size={18} />
                    Objetivo
                  </h4>
                  <Select value={formGoal} onValueChange={setFormGoal}>
                    <SelectTrigger><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger>
                    <SelectContent position="popper" sideOffset={5}>
                      <SelectItem value="weight_loss">Emagrecimento</SelectItem>
                      <SelectItem value="muscle_gain">Ganho de Massa Muscular</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                      <SelectItem value="health">Saúde/Reeducação Alimentar</SelectItem>
                      <SelectItem value="sports">Performance Esportiva</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Observações gerais..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* ========== SEÇÃO ASSINATURA ========== */}
                <div className="bg-violet-50 p-4 rounded-lg space-y-3 border border-violet-200">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <span className="mr-2 text-violet-600">💳</span> Assinatura & Pacote
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">⭐ Tier</Label>
                      <select
                        value={formTier}
                        onChange={(e) => setFormTier(e.target.value)}
                        className="w-full h-9 text-sm border rounded-lg px-3"
                      >
                        <option value="basic">🔹 Basic</option>
                        <option value="pro">⭐ PRO</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">📦 Pacote</Label>
                      <select
                        value={formPackageType}
                        onChange={(e) => setFormPackageType(e.target.value)}
                        className="w-full h-9 text-sm border rounded-lg px-3"
                      >
                        <option value="mensal">Mensal (30 dias)</option>
                        <option value="trimestral">Trimestral (90 dias)</option>
                        <option value="semestral">Semestral (180 dias)</option>
                        <option value="anual">Anual (365 dias)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">📅 Data Início</Label>
                      <Input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">📅 Data Fim</Label>
                      <Input
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">💰 Valor Pago</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formAmountPaid}
                        onChange={(e) => setFormAmountPaid(e.target.value)}
                        placeholder="150.00"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">💳 Pagamento</Label>
                      <select
                        value={formPaymentMethod}
                        onChange={(e) => setFormPaymentMethod(e.target.value)}
                        className="w-full h-9 text-sm border rounded-lg px-3"
                      >
                        <option value="pix">📱 PIX</option>
                        <option value="cartao">💳 Cartão</option>
                        <option value="boleto">📄 Boleto</option>
                        <option value="dinheiro">💵 Dinheiro</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1" disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePatient} className="flex-1 bg-teal-700 hover:bg-teal-800" disabled={saving || isCreatingPatient}>
                  {(saving || isCreatingPatient) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Plus className="mr-2" size={18} />Criar Paciente</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de pacientes */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Tente outra busca' : 'Comece cadastrando seu primeiro paciente'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-teal-700 hover:bg-teal-800">
                  <Plus size={18} className="mr-2" />
                  Cadastrar Paciente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPatients.map((patient) => {
              const age = calculateAge(patient.birth_date);
              const adherence = adherenceData[patient.id] || { score: 0, level: 'unknown', label: 'Carregando...', icon: '⏳', color: 'gray', metrics: null, alerts: [] };
              
              // DADOS REAIS da assinatura
              const subscription = patient.subscription;
              const patientStatus = subscription ? subscription.status : (patient.status === 'active' ? 'ativo' : 'inativo');
              const patientPackage = subscription ? subscription.package_type.charAt(0).toUpperCase() + subscription.package_type.slice(1) : 'Sem pacote';
              const currentPlan = subscription ? subscription.current_plan_name : 'Sem plano';
              const patientTier = subscription ? subscription.tier : 'basic';
              
              return (
                <Card key={patient.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-4 flex-1 cursor-pointer"
                        onClick={() => navigate(`/professional/patient/${patient.id}`)}
                      >
                        <img src={patient.avatar} alt={patient.name} className="w-16 h-16 rounded-full" />
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
                            <p className="text-sm text-gray-600">{patient.email}</p>
                            {patient.phone && <p className="text-sm text-gray-500">{patient.phone}</p>}
                          </div>
                          {/* Score compacto em telas menores */}
                          <div className={`xl:hidden flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            adherence.color === 'emerald' ? 'bg-emerald-500 text-white' :
                            adherence.color === 'amber' ? 'bg-amber-500 text-white' :
                            adherence.color === 'red' ? 'bg-red-500 text-white' :
                            'bg-gray-400 text-white'
                          }`} title={`${adherence.label} - Score: ${adherence.score}`}>
                            {adherence.score}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* SCORE DE PRIORIDADE */}
                        <div className="hidden xl:flex flex-col items-end gap-1 mr-4 min-w-[140px]" data-testid={`patient-score-${patient.id}`}>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                            adherence.color === 'emerald' ? 'bg-emerald-50 border border-emerald-200' :
                            adherence.color === 'amber' ? 'bg-amber-50 border border-amber-200' :
                            adherence.color === 'red' ? 'bg-red-50 border border-red-200' :
                            'bg-gray-50 border border-gray-200'
                          }`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                              adherence.color === 'emerald' ? 'bg-emerald-500 text-white' :
                              adherence.color === 'amber' ? 'bg-amber-500 text-white' :
                              adherence.color === 'red' ? 'bg-red-500 text-white' :
                              'bg-gray-400 text-white'
                            }`}>
                              {adherence.score}
                            </div>
                            <div className="text-left">
                              <p className={`text-xs font-bold ${
                                adherence.color === 'emerald' ? 'text-emerald-900' :
                                adherence.color === 'amber' ? 'text-amber-900' :
                                adherence.color === 'red' ? 'text-red-900' :
                                'text-gray-900'
                              }`}>{adherence.label}</p>
                              <p className="text-[10px] text-gray-500">Score de prioridade</p>
                            </div>
                          </div>
                          
                          {/* Alertas */}
                          {adherence.alerts && adherence.alerts.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {adherence.alerts.slice(0, 2).map((alert, idx) => (
                                <span key={idx} className={`text-[9px] px-2 py-0.5 rounded-full ${
                                  alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                  alert.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {alert.icon} {alert.message}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* NOVAS COLUNAS PREMIUM */}
                        <div className="hidden lg:flex flex-col gap-2 mr-4">
                          {/* Status */}
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              patientStatus === 'ativo' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : patientStatus === 'vencendo' 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {patientStatus === 'ativo' && '✅ Ativo'}
                              {patientStatus === 'inativo' && '⏸️ Inativo'}
                              {patientStatus === 'vencendo' && '⏰ Vencendo'}
                            </span>
                            
                            {/* Tier */}
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              patientTier === 'Pro' 
                                ? 'bg-violet-100 text-violet-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {patientTier === 'Pro' ? '⭐ PRO' : '🔹 Basic'}
                            </span>
                          </div>
                          
                          {/* Pacote e Plano */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-600">
                              📦 <strong>{patientPackage}</strong>
                            </span>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-600">
                              🍽️ <strong>{currentPlan}</strong>
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1 hidden md:block">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            patient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`} style={{display: 'none'}}>
                            {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                          {age && <p className="text-sm text-gray-600">{age} anos</p>}
                          {patient.goal && (
                            <p className="text-xs text-gray-500">{getGoalLabel(patient.goal)}</p>
                          )}
                          {patient.current_weight && patient.goal_weight && (
                            <p className="text-xs text-gray-500">
                              {patient.current_weight}kg → {patient.goal_weight}kg
                            </p>
                          )}
                        </div>
                        
                        {/* BOTÃO STATUS DO PACIENTE */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openPatientStatus(patient); }}
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5"
                        >
                          <Activity size={14} />
                          <span className="hidden xl:inline text-xs">Status</span>
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical size={20} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/professional/patient/${patient.id}`)}>
                              <Eye size={16} className="mr-2" /> Ver Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(patient)}>
                              <Edit size={16} className="mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/professional/patient/${patient.id}?tab=checklist`)}>
                              <ClipboardList size={16} className="mr-2" /> Checklist
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/professional/meal-plan-editor?patient=${patient.id}`)}>
                              <Utensils size={16} className="mr-2" /> Plano Alimentar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openArchiveDialog(patient)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Archive size={16} className="mr-2" /> Arquivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ===== MODAL STATUS DO PACIENTE ===== */}
        <Dialog open={!!statusPatient} onOpenChange={() => setStatusPatient(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Activity size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{statusPatient?.name}</p>
                  <p className="text-xs text-gray-500 font-normal">Status dos últimos 7 dias</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            {loadingStatus ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="ml-2 text-sm text-gray-500">Carregando status...</span>
              </div>
            ) : statusData ? (
              <div className="space-y-4">
                {/* Indicador principal */}
                <div className={`p-4 rounded-xl border-2 ${
                  statusData.allDone 
                    ? 'bg-emerald-50 border-emerald-300' 
                    : 'bg-amber-50 border-amber-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      statusData.allDone ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}>
                      {statusData.allDone 
                        ? <CheckCircle2 className="h-6 w-6 text-white" />
                        : <AlertCircle className="h-6 w-6 text-white" />
                      }
                    </div>
                    <div>
                      <p className={`font-bold ${statusData.allDone ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {statusData.allDone ? '✅ Tudo em dia!' : '⚠️ Pendências detectadas'}
                      </p>
                      <p className={`text-sm ${statusData.allDone ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {statusData.allDone 
                          ? 'Paciente completou feedbacks e checklist. Hora de ajustar o plano!'
                          : 'Paciente tem itens pendentes'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feedbacks */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <MessageSquare size={14} className="text-blue-600" /> Feedbacks (últimos 7 dias)
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`p-3 rounded-lg border text-center ${statusData.hasWeightFeedback ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <Scale size={18} className={`mx-auto mb-1 ${statusData.hasWeightFeedback ? 'text-green-600' : 'text-gray-400'}`} />
                      <p className="text-[10px] font-medium">{statusData.hasWeightFeedback ? '✅ Peso' : '❌ Peso'}</p>
                    </div>
                    <div className={`p-3 rounded-lg border text-center ${statusData.hasPhotoFeedback ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <Camera size={18} className={`mx-auto mb-1 ${statusData.hasPhotoFeedback ? 'text-green-600' : 'text-gray-400'}`} />
                      <p className="text-[10px] font-medium">{statusData.hasPhotoFeedback ? '✅ Foto' : '❌ Foto'}</p>
                    </div>
                    <div className={`p-3 rounded-lg border text-center ${statusData.hasTextFeedback ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <MessageSquare size={18} className={`mx-auto mb-1 ${statusData.hasTextFeedback ? 'text-green-600' : 'text-gray-400'}`} />
                      <p className="text-[10px] font-medium">{statusData.hasTextFeedback ? '✅ Texto' : '❌ Texto'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {statusData.feedbackCount} feedback(s) recente(s) • {statusData.totalFeedbacks} total
                  </p>
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <ClipboardList size={14} className="text-purple-600" /> Checklist Diário
                  </h4>
                  <div className={`p-3 rounded-lg border ${statusData.checklistComplete ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {statusData.checklistComplete ? '✅ Checklist em dia' : '⚠️ Checklist incompleto'}
                      </span>
                      <span className="text-xs font-bold">
                        {statusData.checklist.completed}/{statusData.checklist.total} tarefas
                      </span>
                    </div>
                    <div className="relative h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`absolute left-0 top-0 h-full rounded-full transition-all ${statusData.checklist.adherence >= 80 ? 'bg-emerald-500' : statusData.checklist.adherence >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${statusData.checklist.adherence}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Aderência: {statusData.checklist.adherence}%</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2 border-t">
                  {statusData.allDone && (
                    <Button
                      onClick={() => {
                        setStatusPatient(null);
                        navigate(`/professional/meal-plan-editor?patient=${statusPatient?.id}`);
                      }}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90"
                    >
                      <Utensils size={14} className="mr-2" /> Ajustar Plano
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusPatient(null);
                      navigate(`/professional/patient/${statusPatient?.id}`);
                    }}
                    className="flex-1"
                  >
                    <Eye size={14} className="mr-2" /> Ver Perfil
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Dialog de edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Paciente</DialogTitle>
              <DialogDescription>Atualize os dados do paciente</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <User className="mr-2" size={18} />
                  Dados Pessoais
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Completo</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Nome do paciente"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={formEmail} disabled className="bg-gray-100" />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={formBirthDate}
                      onChange={(e) => setFormBirthDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Sexo</Label>
                    <Select value={formGender} onValueChange={setFormGender}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent position="popper" sideOffset={5}>
                        <SelectItem value="male">Masculino</SelectItem>
                        <SelectItem value="female">Feminino</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <Ruler className="mr-2" size={18} />
                  Dados Físicos
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Altura (cm)</Label>
                    <Input
                      type="number"
                      value={formHeight}
                      onChange={(e) => setFormHeight(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Peso Atual (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formCurrentWeight}
                      onChange={(e) => setFormCurrentWeight(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Peso Meta (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formGoalWeight}
                      onChange={(e) => setFormGoalWeight(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <Target className="mr-2" size={18} />
                  Objetivo
                </h4>
                <Select value={formGoal} onValueChange={setFormGoal}>
                  <SelectTrigger><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    <SelectItem value="weight_loss">Emagrecimento</SelectItem>
                    <SelectItem value="muscle_gain">Ganho de Massa Muscular</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="health">Saúde/Reeducação Alimentar</SelectItem>
                    <SelectItem value="sports">Performance Esportiva</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1" disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleEditPatient} className="flex-1 bg-teal-700 hover:bg-teal-800" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar Alterações'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação de arquivar */}
        <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar Paciente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja arquivar <strong>{selectedPatient?.name}</strong>?
                <br /><br />
                O paciente será marcado como inativo e não aparecerá mais na lista principal. 
                Você poderá restaurá-lo depois se necessário.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchivePatient} className="bg-red-600 hover:bg-red-700">
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default PatientsList;
