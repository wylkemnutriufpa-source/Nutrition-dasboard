import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Stethoscope, Plus, Loader2, Mail, User, Phone, Trash2, Edit, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ProfessionalRankingBoard from '@/components/dashboard/ProfessionalRankingBoard';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalProfessionals: 0,
    totalPatients: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '123456' // Senha padrão
  });

  useEffect(() => {
    // Verificar se é admin
    const userType = localStorage.getItem('fitjourney_user_type');
    if (userType !== 'admin') {
      toast.error('Acesso negado');
      navigate('/');
      return;
    }
    
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar todos os profissionais
      const { data: professionalsData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'professional')
        .order('created_at', { ascending: false });

      if (profError) {
        console.error('Error loading professionals:', profError);
      } else {
        setProfessionals(professionalsData || []);
      }

      // Contar pacientes
      const { count: patientsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient');

      setStats({
        totalProfessionals: professionalsData?.length || 0,
        totalPatients: patientsCount || 0
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '123456'
    });
  };

  const handleCreateProfessional = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'professional'
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(authError.message || 'Erro ao criar usuário');
        }
        return;
      }

      // 2. Se o trigger não criou o profile, criar manualmente
      if (authData.user) {
        // Verificar se o profile foi criado pelo trigger
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', formData.email)
          .single();

        if (!existingProfile) {
          // Criar profile manualmente
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              auth_user_id: authData.user.id,
              email: formData.email,
              name: formData.name,
              phone: formData.phone || null,
              role: 'professional',
              status: 'active'
            });

          if (profileError) {
            console.error('Profile error:', profileError);
            // Não é crítico, o trigger pode ter criado
          }
        } else {
          // Atualizar o profile existente
          await supabase
            .from('profiles')
            .update({
              auth_user_id: authData.user.id,
              phone: formData.phone || null
            })
            .eq('email', formData.email);
        }
      }

      toast.success(`Profissional ${formData.name} criado com sucesso!`);
      toast.info(`Senha inicial: ${formData.password}`, { duration: 5000 });
      
      setIsDialogOpen(false);
      resetForm();
      await loadData();

    } catch (error) {
      console.error('Error creating professional:', error);
      toast.error('Erro ao criar profissional');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfessional = async (profId, profName) => {
    if (!window.confirm(`Tem certeza que deseja remover ${profName}?`)) {
      return;
    }

    try {
      // Apenas inativar o profissional
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', profId);

      if (error) throw error;

      toast.success('Profissional removido');
      await loadData();
    } catch (error) {
      console.error('Error deleting professional:', error);
      toast.error('Erro ao remover profissional');
    }
  };

  if (loading) {
    return (
      <Layout title="Painel Administrativo" userType="admin">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Painel Administrativo" userType="admin">
      <div data-testid="admin-dashboard" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-600 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold">Painel do Administrador</h2>
          <p className="text-purple-100 mt-1">Gerencie profissionais e configurações do sistema</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Profissionais</CardTitle>
              <div className="bg-teal-700 p-3 rounded-lg">
                <Stethoscope className="text-white" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalProfessionals}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Pacientes</CardTitle>
              <div className="bg-green-600 p-3 rounded-lg">
                <Users className="text-white" size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalPatients}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Profissionais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profissionais Cadastrados</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-700 hover:bg-purple-800" onClick={resetForm}>
                  <Plus size={18} className="mr-2" />
                  Novo Profissional
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Cadastrar Profissional</DialogTitle>
                  <DialogDescription>
                    Crie uma conta para um novo nutricionista ou profissional de saúde
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prof_name">Nome Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-400" size={16} />
                      <Input
                        id="prof_name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Dr. João Silva"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="prof_email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                      <Input
                        id="prof_email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="profissional@email.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="prof_phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                      <Input
                        id="prof_phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="prof_password">Senha Inicial</Label>
                    <Input
                      id="prof_password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Senha inicial"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      O profissional poderá alterar a senha depois
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateProfessional}
                      className="flex-1 bg-purple-700 hover:bg-purple-800"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2" size={18} />
                          Criar Profissional
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {professionals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Stethoscope className="mx-auto mb-4 text-gray-400" size={48} />
                <p>Nenhum profissional cadastrado</p>
                <Button 
                  className="mt-4 bg-purple-700 hover:bg-purple-800"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus size={18} className="mr-2" />
                  Cadastrar primeiro profissional
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {professionals.map((prof) => {
                  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(prof.name)}&background=0F766E&color=fff`;
                  return (
                    <div 
                      key={prof.id} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <img src={avatar} alt={prof.name} className="w-12 h-12 rounded-full" />
                        <div>
                          <p className="font-semibold text-gray-900">{prof.name}</p>
                          <p className="text-sm text-gray-600">{prof.email}</p>
                          {prof.phone && (
                            <p className="text-xs text-gray-500">{prof.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          prof.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {prof.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteProfessional(prof.id, prof.name)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== RANKING DE PROFISSIONAIS ========== */}
        <ProfessionalRankingBoard />
      </div>
    </Layout>
  );
};

export default AdminDashboard;
