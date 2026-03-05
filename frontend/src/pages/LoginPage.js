import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, Stethoscope, Eye, ArrowLeft, Loader2, Shield, 
  Sparkles, Heart, Activity, TrendingUp, Star, Zap,
  ChevronRight, Lock, Mail
} from 'lucide-react';
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
        setPendingLogin(true);
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

    localStorage.setItem('fitjourney_user_type', profile.role);
    localStorage.setItem('fitjourney_user_email', profile.email);
    localStorage.setItem('fitjourney_user_id', profile.id);

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

  // ==================== FLOATING ELEMENTS ====================
  const FloatingElements = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-teal-400/30 to-emerald-400/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl" />
      
      {/* Floating icons */}
      <div className="absolute top-32 right-20 text-teal-500/20 animate-bounce" style={{ animationDuration: '3s' }}>
        <Heart className="w-12 h-12" />
      </div>
      <div className="absolute bottom-40 left-20 text-emerald-500/20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>
        <Activity className="w-10 h-10" />
      </div>
      <div className="absolute top-1/3 right-1/4 text-purple-500/20 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>
        <TrendingUp className="w-8 h-8" />
      </div>
      <div className="absolute bottom-1/3 left-1/4 text-pink-500/20 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.3s' }}>
        <Star className="w-9 h-9" />
      </div>
    </div>
  );

  // ==================== LOGIN CARD CONFIG ====================
  const loginCards = [
    {
      type: 'admin',
      icon: Shield,
      title: 'Administrador',
      description: 'Gerenciamento completo do sistema',
      gradient: 'from-purple-600 to-indigo-700',
      bgGradient: 'from-purple-500/10 to-indigo-500/10',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderHover: 'hover:border-purple-400',
      shadowHover: 'hover:shadow-purple-200/50',
      buttonGradient: 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
    },
    {
      type: 'professional',
      icon: Stethoscope,
      title: 'Profissional',
      description: 'Nutricionistas e profissionais de saúde',
      gradient: 'from-teal-600 to-emerald-600',
      bgGradient: 'from-teal-500/10 to-emerald-500/10',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      borderHover: 'hover:border-teal-400',
      shadowHover: 'hover:shadow-teal-200/50',
      buttonGradient: 'from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700',
      featured: true
    },
    {
      type: 'patient',
      icon: User,
      title: 'Paciente',
      description: 'Acompanhe seu plano alimentar',
      gradient: 'from-green-500 to-lime-500',
      bgGradient: 'from-green-500/10 to-lime-500/10',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderHover: 'hover:border-green-400',
      shadowHover: 'hover:shadow-green-200/50',
      buttonGradient: 'from-green-500 to-lime-500 hover:from-green-600 hover:to-lime-600'
    },
    {
      type: 'visitor',
      icon: Eye,
      title: 'Visitante',
      description: 'Check nutricional + calculadoras grátis',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderHover: 'hover:border-blue-400',
      shadowHover: 'hover:shadow-blue-200/50',
      buttonGradient: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
      isVisitor: true
    }
  ];

  // ==================== TELA DE SELEÇÃO ====================
  if (!loginType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 relative">
        <FloatingElements />
        
        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
          
          {/* Logo & Header */}
          <div className="text-center mb-10 md:mb-14">
            {/* Animated Logo */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-3xl blur-xl opacity-40 animate-pulse" />
              <div 
                className="relative w-24 h-24 md:w-28 md:h-28 rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-500/30 transform hover:scale-105 transition-transform duration-300"
                style={{ background: `linear-gradient(to br, ${branding.primary_color || '#0d9488'}, ${branding.secondary_color || '#10b981'})` }}
              >
                {branding.logo_url ? (
                  <img src={branding.logo_url} alt={branding.brand_name || 'FitJourney'} className="w-16 h-16 md:w-20 md:h-20 object-contain" />
                ) : (
                  <span className="text-white font-black text-4xl md:text-5xl tracking-tight">
                    {branding.brand_initials || 'FJ'}
                  </span>
                )}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-gray-900 via-teal-800 to-emerald-800 bg-clip-text text-transparent mb-3">
              {branding.brand_name || 'FitJourney'}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-medium max-w-md mx-auto">
              {branding.login_title || 'Sua jornada para uma vida mais saudável começa aqui'}
            </p>
            
            {/* Stats */}
            <div className="flex items-center justify-center gap-6 mt-6">
              {[
                { label: 'Profissionais', value: '500+' },
                { label: 'Pacientes', value: '10k+' },
                { label: 'Sucesso', value: '98%' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-bold text-teal-600">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl w-full">
            {loginCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.type}
                  data-testid={`${card.type}-login-card`}
                  onClick={() => card.isVisitor ? handleVisitorLogin() : setLoginType(card.type)}
                  className={`group relative cursor-pointer transition-all duration-500 ${card.featured ? 'lg:-mt-4 lg:mb-4' : ''}`}
                >
                  {/* Featured badge */}
                  {card.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                      <div className="px-4 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-white text-xs font-bold shadow-lg flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        MAIS POPULAR
                      </div>
                    </div>
                  )}
                  
                  {/* Card */}
                  <Card className={`relative overflow-hidden border-2 border-gray-100 ${card.borderHover} transition-all duration-500 hover:shadow-2xl ${card.shadowHover} hover:-translate-y-2 bg-white/80 backdrop-blur-sm h-full`}>
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    <CardHeader className="relative text-center pb-2 pt-6">
                      {/* Icon */}
                      <div className="relative mx-auto mb-4">
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                        <div className={`relative w-16 h-16 rounded-2xl ${card.iconBg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                          <Icon className={`${card.iconColor} transition-transform duration-300`} size={32} />
                        </div>
                      </div>
                      
                      <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                        {card.title}
                      </CardTitle>
                      <CardDescription className="text-gray-500 mt-1 text-sm">
                        {card.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="relative pt-0 pb-6">
                      <Button 
                        data-testid={`${card.type}-login-button`}
                        className={`w-full bg-gradient-to-r ${card.buttonGradient} text-white shadow-lg hover:shadow-xl transition-all duration-300 py-5 text-sm font-semibold group-hover:scale-[1.02]`}
                      >
                        {card.isVisitor ? 'Acessar Ferramentas' : `Entrar como ${card.title}`}
                        <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Lock className="w-4 h-4" />
              <span>Conexão segura e criptografada</span>
            </div>
            <p className="mt-2 text-gray-500 text-sm font-medium">
              {branding.login_footer || 'Sistema de Nutrição Premium'} • {branding.brand_name || 'FitJourney'} © 2025
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== FORMULÁRIO DE LOGIN ====================
  const getLoginConfig = () => {
    const card = loginCards.find(c => c.type === loginType);
    return card || loginCards[0];
  };

  const config = getLoginConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 relative">
      <FloatingElements />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => {
              setLoginType(null);
              setEmail('');
              setPassword('');
            }}
            className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-white/50 backdrop-blur-sm"
          >
            <ArrowLeft className="mr-2" size={18} />
            Voltar para seleção
          </Button>

          {/* Login Card */}
          <Card className="relative overflow-hidden border-0 shadow-2xl bg-white/90 backdrop-blur-xl">
            {/* Top gradient bar */}
            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${config.gradient}`} />
            
            {/* Background decoration */}
            <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${config.bgGradient} rounded-full -translate-y-20 translate-x-20 blur-2xl`} />
            
            <CardHeader className="relative text-center pt-10 pb-4">
              {/* Icon */}
              <div className="relative mx-auto mb-4">
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-2xl blur-lg opacity-30`} />
                <div className={`relative w-20 h-20 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-xl`}>
                  <Icon className={config.iconColor} size={40} />
                </div>
              </div>
              
              <CardTitle className="text-2xl font-bold text-gray-900">
                Login {config.title}
              </CardTitle>
              <CardDescription className="text-gray-500 mt-1">
                {config.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative px-8 pb-8">
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="py-5 px-4 bg-gray-50/50 border-gray-200 focus:border-teal-400 focus:ring-teal-200 rounded-xl transition-all"
                  />
                </div>
                
                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="py-5 px-4 bg-gray-50/50 border-gray-200 focus:border-teal-400 focus:ring-teal-200 rounded-xl transition-all"
                  />
                </div>
                
                {/* Submit Button */}
                <Button
                  type="submit"
                  className={`w-full bg-gradient-to-r ${config.buttonGradient} text-white shadow-xl hover:shadow-2xl transition-all duration-300 py-6 text-base font-semibold rounded-xl mt-2`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      Entrar na plataforma
                    </>
                  )}
                </Button>
              </form>

              {/* Info Box */}
              <div className={`mt-6 p-4 rounded-xl bg-gradient-to-br ${config.bgGradient} border border-gray-100`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${config.iconBg} flex-shrink-0`}>
                    <Icon className={`${config.iconColor} w-4 h-4`} />
                  </div>
                  <div>
                    {loginType === 'admin' && (
                      <p className="text-sm text-gray-600">
                        <strong className="text-gray-800">Administrador:</strong> Gerencia profissionais, configurações do sistema e tem acesso completo à plataforma.
                      </p>
                    )}
                    {loginType === 'professional' && (
                      <p className="text-sm text-gray-600">
                        <strong className="text-gray-800">Profissional:</strong> Cadastrado pelo administrador. Gerencie seus pacientes, planos alimentares e acompanhe resultados.
                      </p>
                    )}
                    {loginType === 'patient' && (
                      <p className="text-sm text-gray-600">
                        <strong className="text-gray-800">Paciente:</strong> Cadastrado pelo seu nutricionista. Acesse seu plano alimentar personalizado e acompanhe sua evolução.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Security Badge */}
              <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-xs">
                <Lock className="w-3 h-3" />
                <span>Seus dados estão protegidos com criptografia SSL</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
