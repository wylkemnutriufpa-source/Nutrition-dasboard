import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Lock, User, Mail, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { updatePassword } from '@/lib/supabase';

const SettingsPage = () => {
  const userEmail = localStorage.getItem('fitjourney_user_email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Track page view
  useState(() => { trackProfessionalFeature('view_settings'); });

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    
    try {
      const { success, error } = await updatePassword(newPassword);
      
      if (error) {
        toast.error(error.message || 'Erro ao alterar senha');
        return;
      }
      
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Erro inesperado ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Configurações" userType="professional">
      <div data-testid="settings-page" className="max-w-3xl mx-auto space-y-6 pb-8">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-gray-600 via-slate-600 to-zinc-700 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-3">Configuracoes</span>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight">Configuracoes</h1>
                  <p className="text-white/80 text-sm">Gerencie sua conta, seguranca e preferencias</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: User, label: 'Conta', sub: 'Perfil configurado', gradient: 'from-blue-500 to-indigo-500' },
                  { icon: Lock, label: 'Seguranca', sub: 'Senha protegida', gradient: 'from-emerald-500 to-teal-500' },
                  { icon: Settings, label: 'Preferencias', sub: 'Personalizado', gradient: 'from-purple-500 to-fuchsia-500' }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={`bg-gradient-to-br ${item.gradient} rounded-xl p-3 text-center`}>
                      <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-white/20 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="text-[10px] text-white/70">{item.sub}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="text-teal-700" size={24} />
              <div>
                <CardTitle>Informações da Conta</CardTitle>
                <CardDescription>Dados do seu perfil profissional</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Mail className="text-gray-400" size={18} />
                <span className="text-gray-900 font-medium">{userEmail}</span>
              </div>
            </div>
            <Separator />
            <div>
              <Label>Nome Completo</Label>
              <p className="text-gray-900 font-medium mt-2">Dr. Wylkem Raiol</p>
            </div>
            <div>
              <Label>CRN</Label>
              <p className="text-gray-900 font-medium mt-2">CRN-6 12345/P</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Lock className="text-teal-700" size={24} />
              <div>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Mantenha sua conta segura alterando sua senha regularmente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-teal-700 hover:bg-teal-800" 
                size="lg"
                disabled={loading}
              >
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica de Segurança:</strong> Use uma senha forte com letras, números e caracteres especiais.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
            <CardDescription>Personalize sua experiência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Notificações por Email</p>
                <p className="text-sm text-gray-600">Receba atualizações sobre seus pacientes</p>
              </div>
              <Button variant="outline" size="sm">Ativar</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Tema Escuro</p>
                <p className="text-sm text-gray-600">Modo escuro para melhor visualização</p>
              </div>
              <Button variant="outline" size="sm">Ativar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsPage;
