import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Stethoscope, Eye, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import { signIn, signOut } from '@/lib/supabase';

const LoginPage = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { profile, loading: authLoading, logout } = useAuth();
  const [loginType, setLoginType] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(false);

  // Redirecionar usuário já autenticado
  useEffect(() => {
    if (!authLoading && profile) {
      const userType = localStorage.getItem('fitjourney_user_type');
      if (profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (profile.role === 'professional') {
        navigate('/professional/dashboard', { replace: true });
      } else if (profile.role === 'patient') {
        navigate('/patient/dashboard', { replace: true });
      }
    }
  }, [profile, authLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        console.error('Login error:', error);
        if (error.message.includes('Invalid login')) {
          toast.error('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Email não confirmado. Verifique sua caixa de entrada.');
        } else {
          toast.error(error.message || 'Erro ao fazer login');
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        toast.success('Login realizado com sucesso!');
        // Aguardar AuthContext processar e carregar o profile
        setPendingLogin(true);
        // O useEffect abaixo irá navegar quando o profile for carregado
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
      console.error(error);
      setLoading(false);
    }
  };

  // Navegar quando o profile for carregado após login
  useEffect(() => {
    if (!pendingLogin || !profile) return;

    // Verificar se o tipo de login corresponde ao role do usuário
    if (loginType === 'professional' && profile.role !== 'professional' && profile.role !== 'admin') {
      toast.error('Esta conta não é de profissional');
      signOut();
      setPendingLogin(false);
      setLoading(false);
      return;
    }

    if (loginType === 'patient' && profile.role !== 'patient') {
      toast.error('Esta conta não é de paciente');
      signOut();
      setPendingLogin(false);
      setLoading(false);
      return;
    }

    if (loginType === 'admin' && profile.role !== 'admin') {
      toast.error('Esta conta não tem permissão de administrador');
      signOut();
      setPendingLogin(false);
      setLoading(false);
      return;
    }

    // Armazenar no localStorage
    localStorage.setItem('fitjourney_user_type', profile.role);
    localStorage.setItem('fitjourney_user_email', profile.email);
    localStorage.setItem('fitjourney_user_id', profile.id);

    // Redirecionar baseado no role
    if (profile.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (profile.role === 'professional') {
      navigate('/professional/dashboard', { replace: true });
    } else if (profile.role === 'patient') {
      localStorage.setItem('fitjourney_patient_id', profile.id);
      localStorage.setItem('fitjourney_patient_name', profile.name);
      navigate('/patient/dashboard', { replace: true });
    }

    setPendingLogin(false);
    setLoading(false);
  }, [profile, pendingLogin, loginType, navigate]);

  const handleVisitorLogin = () => {
    localStorage.setItem('fitjourney_user_type', 'visitor');
    navigate('/visitor/calculators');
  };

  // Tela inicial de seleção de tipo
  if (!loginType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-600 mb-4 shadow-lg">
              <span className="text-white font-bold text-3xl">FJ</span>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">FitJourney</h1>
            <p className="text-lg text-gray-600">Sua jornada para uma vida mais saudável</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Admin */}
            <Card 
              data-testid="admin-login-card" 
              className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-700 cursor-pointer" 
              onClick={() => setLoginType('admin')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <Shield className="text-purple-700" size={32} />
                </div>
                <CardTitle className="text-xl">Administrador</CardTitle>
                <CardDescription>Gerenciamento do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-purple-700 hover:bg-purple-800" size="lg">
                  Entrar como Admin
                </Button>
              </CardContent>
            </Card>

            {/* Profissional */}
            <Card 
              data-testid="professional-login-card" 
              className="hover:shadow-xl transition-all duration-300 border-2 hover:border-teal-700 cursor-pointer" 
              onClick={() => setLoginType('professional')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                  <Stethoscope className="text-teal-700" size={32} />
                </div>
                <CardTitle className="text-xl" style={{ fontSize: 'var(--font-size-subheading, 1.5rem)' }}>Profissional</CardTitle>
                <CardDescription style={{ fontSize: 'var(--font-size-body, 1rem)' }}>Nutricionistas e profissionais de saúde</CardDescription>
              </CardHeader>
              <CardContent>
                <Button data-testid="professional-login-button" className="w-full bg-teal-700 hover:bg-teal-800" size="lg" style={{ fontSize: 'var(--button-size, 1rem)' }}>
                  Entrar como Profissional
                </Button>
              </CardContent>
            </Card>

            {/* Paciente */}
            <Card 
              data-testid="patient-login-card" 
              className="hover:shadow-xl transition-all duration-300 border-2 hover:border-green-600 cursor-pointer" 
              onClick={() => setLoginType('patient')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <User className="text-green-700" size={32} />
                </div>
                <CardTitle className="text-xl" style={{ fontSize: 'var(--font-size-subheading, 1.5rem)' }}>Paciente</CardTitle>
                <CardDescription style={{ fontSize: 'var(--font-size-body, 1rem)' }}>Acompanhe seu plano alimentar</CardDescription>
              </CardHeader>
              <CardContent>
                <Button data-testid="patient-login-button" className="w-full bg-green-600 hover:bg-green-700" size="lg" style={{ fontSize: 'var(--button-size, 1rem)' }}>
                  Entrar como Paciente
                </Button>
              </CardContent>
            </Card>

            {/* Visitante */}
            <Card 
              data-testid="visitor-login-card" 
              className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-600 cursor-pointer" 
              onClick={handleVisitorLogin}
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Eye className="text-blue-700" size={32} />
                </div>
                <CardTitle className="text-xl" style={{ fontSize: 'var(--font-size-subheading, 1.5rem)' }}>Visitante</CardTitle>
                <CardDescription style={{ fontSize: 'var(--font-size-body, 1rem)' }}>Check nutricional + calculadoras</CardDescription>
              </CardHeader>
              <CardContent>
                <Button data-testid="visitor-login-button" className="w-full bg-blue-600 hover:bg-blue-700" size="lg" style={{ fontSize: 'var(--button-size, 1rem)' }}>
                  Acessar Ferramentas
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center text-sm text-gray-600">
            <p>Sistema de Nutrição • FitJourney</p>
          </div>
        </div>
      </div>
    );
  }

  // Formulário de login
  const getLoginConfig = () => {
    switch (loginType) {
      case 'admin':
        return {
          icon: <Shield className="text-purple-700" size={32} />,
          title: 'Login Administrador',
          description: 'Acesso ao painel administrativo',
          color: 'bg-purple-700 hover:bg-purple-800',
          bgColor: 'bg-purple-100'
        };
      case 'professional':
        return {
          icon: <Stethoscope className="text-teal-700" size={32} />,
          title: 'Login Profissional',
          description: 'Acesso para nutricionistas',
          color: 'bg-teal-700 hover:bg-teal-800',
          bgColor: 'bg-teal-100'
        };
      case 'patient':
        return {
          icon: <User className="text-green-700" size={32} />,
          title: 'Login Paciente',
          description: 'Acesse seu plano alimentar',
          color: 'bg-green-600 hover:bg-green-700',
          bgColor: 'bg-green-100'
        };
      default:
        return {};
    }
  };

  const config = getLoginConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Button
          variant="ghost"
          onClick={() => {
            setLoginType(null);
            setEmail('');
            setPassword('');
          }}
          className="mb-4"
        >
          <ArrowLeft className="mr-2" size={18} />
          Voltar
        </Button>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className={`mx-auto w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center mb-4`}>
              {config.icon}
            </div>
            <CardTitle className="text-2xl">{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                className={`w-full ${config.color}`}
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {loginType === 'admin' && (
                <p className="text-xs text-gray-600">
                  <strong>Administrador:</strong> Gerencia profissionais e configurações do sistema.
                </p>
              )}
              {loginType === 'professional' && (
                <p className="text-xs text-gray-600">
                  <strong>Profissional:</strong> Cadastrado pelo administrador. Gerencia seus pacientes e planos alimentares.
                </p>
              )}
              {loginType === 'patient' && (
                <p className="text-xs text-gray-600">
                  <strong>Paciente:</strong> Cadastrado pelo seu nutricionista. Acesse para ver seu plano alimentar.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
