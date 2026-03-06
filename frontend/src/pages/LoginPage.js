import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, Stethoscope, Eye, ArrowLeft, Loader2, Shield, 
  Sparkles, Heart, Activity, TrendingUp, Star, Zap,
  ChevronRight, Lock, Mail, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import { signIn, signOut } from '@/lib/supabase';
import { DEFAULT_BRANDING, getLogoShapeClass, getLogoSizeClass, getLoginCardWidthClass } from '@/utils/branding';

const LoginPage = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { profile, loading: authLoading } = useAuth();
  const [loginType, setLoginType] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const b = { ...DEFAULT_BRANDING, ...branding };

  // Redirect apenas uma vez quando autenticado (evita loop)
  useEffect(() => {
    // Aguardar auth terminar de carregar
    if (authLoading) return;
    
    // Se tem profile, redirecionar baseado no role
    if (profile) {
      const targetPath = 
        profile.role === 'admin' ? '/admin/dashboard' :
        profile.role === 'professional' ? '/professional/dashboard' :
        profile.role === 'patient' ? '/patient/dashboard' : null;
      
      if (targetPath) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [profile?.role, authLoading]); // Apenas role muda, não profile inteiro

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login')) toast.error('Email ou senha incorretos');
        else if (error.message.includes('Email not confirmed')) toast.error('Email nao confirmado.');
        else toast.error(error.message || 'Erro ao fazer login');
        setLoading(false);
        return;
      }
      if (data?.user) { toast.success('Login realizado!'); setPendingLogin(true); }
    } catch (error) { toast.error('Erro ao fazer login'); setLoading(false); }
  };

  // 🔒 REGRA: Admin é SEMPRE admin. Não existe "admin em modo professional".
  useEffect(() => {
    if (!pendingLogin || !profile) return;
    
    // ============================================
    // ADMIN: Sempre vai para /admin/dashboard
    // Não importa por qual card entrou (admin ou professional)
    // ============================================
    if (profile.role === 'admin') {
      console.log('🔐 Admin detectado → /admin/dashboard');
      localStorage.setItem('fitjourney_user_type', 'admin');
      localStorage.setItem('fitjourney_user_email', profile.email);
      localStorage.setItem('fitjourney_user_id', profile.id);
      localStorage.setItem('fitjourney_context', 'admin');
      navigate('/admin/dashboard', { replace: true });
      setPendingLogin(false);
      setLoading(false);
      return;
    }
    
    // PROFESSIONAL: valida role
    if (loginType === 'professional' && profile.role !== 'professional') {
      toast.error('Esta conta não é de profissional'); 
      signOut(); 
      setPendingLogin(false); 
      setLoading(false); 
      return;
    }
    
    // PATIENT: valida role
    if (loginType === 'patient' && profile.role !== 'patient') {
      toast.error('Esta conta não é de paciente'); 
      signOut(); 
      setPendingLogin(false); 
      setLoading(false); 
      return;
    }
    
    // Salvar dados no localStorage
    localStorage.setItem('fitjourney_user_type', profile.role);
    localStorage.setItem('fitjourney_user_email', profile.email);
    localStorage.setItem('fitjourney_user_id', profile.id);
    
    // Se for paciente, salvar dados adicionais
    if (profile.role === 'patient') {
      localStorage.setItem('fitjourney_patient_id', profile.id);
      localStorage.setItem('fitjourney_patient_name', profile.name);
    }
    
    // Redirecionar para dashboard correto
    if (profile.role === 'professional') {
      navigate('/professional/dashboard', { replace: true });
    } else if (profile.role === 'patient') {
      navigate('/patient/dashboard', { replace: true });
    }
    
    setPendingLogin(false); 
    setLoading(false);
  }, [profile, pendingLogin, loginType, navigate, signOut]);

  const handleVisitorLogin = () => { localStorage.setItem('fitjourney_user_type', 'visitor'); navigate('/visitor/calculators'); };

  const FloatingEffects = () => {
    if (b.login_effect === 'none') return null;
    if (b.login_effect === 'particles') return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute rounded-full animate-bounce" style={{
            width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`,
            top: `${Math.random() * 85}%`, left: `${Math.random() * 92}%`,
            backgroundColor: `${b.primary_color}25`,
            animationDuration: `${2.5 + Math.random() * 3}s`, animationDelay: `${Math.random() * 2}s`
          }} />
        ))}
      </div>
    );
    if (b.login_effect === 'gradient_wave') return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: `linear-gradient(0deg, ${b.primary_color}12, transparent)` }} />
        <div className="absolute top-0 left-0 right-0 h-32" style={{ background: `linear-gradient(180deg, ${b.secondary_color}08, transparent)` }} />
      </div>
    );
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: `${b.primary_color}25` }} />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: `${b.secondary_color}18`, animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl" style={{ backgroundColor: `${b.accent_color}08` }} />
        <div className="absolute top-32 right-20 animate-bounce" style={{ color: `${b.primary_color}20`, animationDuration: '3s' }}><Heart className="w-12 h-12" /></div>
        <div className="absolute bottom-40 left-20 animate-bounce" style={{ color: `${b.secondary_color}20`, animationDuration: '4s', animationDelay: '0.5s' }}><Activity className="w-10 h-10" /></div>
        <div className="absolute top-1/3 right-1/4 animate-bounce" style={{ color: `${b.accent_color}20`, animationDuration: '3.5s', animationDelay: '1s' }}><TrendingUp className="w-8 h-8" /></div>
      </div>
    );
  };

  const loginCards = [
    { type: 'admin', icon: Shield, title: 'Administrador', description: 'Gerenciamento completo do sistema',
      gradient: 'from-purple-600 to-indigo-700', bgGradient: 'from-purple-500/10 to-indigo-500/10',
      iconBg: 'bg-purple-100', iconColor: 'text-purple-600', borderHover: 'hover:border-purple-400',
      shadowHover: 'hover:shadow-purple-200/50', buttonGradient: 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' },
    { type: 'professional', icon: Stethoscope, title: 'Profissional', description: 'Nutricionistas e profissionais de saude',
      gradient: 'from-teal-600 to-emerald-600', bgGradient: 'from-teal-500/10 to-emerald-500/10',
      iconBg: 'bg-teal-100', iconColor: 'text-teal-600', borderHover: 'hover:border-teal-400',
      shadowHover: 'hover:shadow-teal-200/50', buttonGradient: 'from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700', featured: true },
    { type: 'patient', icon: User, title: 'Paciente', description: 'Acompanhe seu plano alimentar',
      gradient: 'from-green-500 to-lime-500', bgGradient: 'from-green-500/10 to-lime-500/10',
      iconBg: 'bg-green-100', iconColor: 'text-green-600', borderHover: 'hover:border-green-400',
      shadowHover: 'hover:shadow-green-200/50', buttonGradient: 'from-green-500 to-lime-500 hover:from-green-600 hover:to-lime-600' },
    { type: 'visitor', icon: Eye, title: 'Visitante', description: 'Check nutricional + calculadoras gratis',
      gradient: 'from-blue-500 to-cyan-500', bgGradient: 'from-blue-500/10 to-cyan-500/10',
      iconBg: 'bg-blue-100', iconColor: 'text-blue-600', borderHover: 'hover:border-blue-400',
      shadowHover: 'hover:shadow-blue-200/50', buttonGradient: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600', isVisitor: true }
  ];

  const bgStyle = { background: `linear-gradient(135deg, ${b.login_bg_gradient_from || '#f8fafc'}, ${b.login_bg_gradient_to || '#f0fdfa'})` };
  const cardStyle = b.login_card_style === 'glass' ? 'bg-white/70 backdrop-blur-xl' : b.login_card_style === 'gradient' ? 'bg-gradient-to-br from-white to-gray-50' : 'bg-white';
  const stats = b.login_stats || DEFAULT_BRANDING.login_stats;
  const faqItems = b.footer_faq_items || DEFAULT_BRANDING.footer_faq_items;
  const footerLinks = b.footer_links || DEFAULT_BRANDING.footer_links;

  const FooterSection = () => (
    <div data-testid="login-footer" className="w-full max-w-5xl mt-6 space-y-4">
      {b.footer_show_faq && faqItems.length > 0 && (
        <div className="text-center">
          <button data-testid="faq-toggle" onClick={() => setShowFaq(!showFaq)}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-gray-200 hover:border-gray-300">
            <HelpCircle size={16} /> Perguntas Frequentes
            {showFaq ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showFaq && (
            <div className="mt-4 max-w-2xl mx-auto space-y-2">
              {faqItems.map((faq, i) => (
                <div key={i} className={`${cardStyle} rounded-xl border border-gray-100 overflow-hidden`}>
                  <button onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                    className="w-full px-5 py-3 text-left flex items-center justify-between hover:bg-gray-50/50">
                    <span className="text-sm font-medium text-gray-800">{faq.question}</span>
                    {openFaqIndex === i ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </button>
                  {openFaqIndex === i && <div className="px-5 pb-3 text-sm text-gray-600 border-t border-gray-100 pt-2">{faq.answer}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {b.footer_show_about && b.footer_about && (
        <div className="text-center max-w-md mx-auto"><p className="text-sm text-gray-500 leading-relaxed">{b.footer_about}</p></div>
      )}
      {b.footer_show_links && footerLinks.length > 0 && (
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {footerLinks.map((link, i) => (
            <a key={i} href={link.url || '#'} className="text-sm text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2">{link.label}</a>
          ))}
        </div>
      )}
      <div className="text-center space-y-2 pb-4">
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm"><Lock className="w-4 h-4" /><span>Conexao segura e criptografada</span></div>
        <p className="text-gray-500 text-sm font-medium">{b.footer_copyright || DEFAULT_BRANDING.footer_copyright}</p>
      </div>
    </div>
  );

  if (!loginType) {
    return (
      <div data-testid="login-page" className="min-h-screen relative" style={bgStyle}>
        <FloatingEffects />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-3 md:p-6">
          <div className="text-center mb-6 md:mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 animate-pulse" style={{ backgroundColor: `${b.primary_color}40` }} />
              <div className={`relative ${getLogoSizeClass(b.logo_size_login, 'login')} ${getLogoShapeClass(b.logo_shape)} flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300`}
                style={{ background: `linear-gradient(135deg, ${b.primary_color}, ${b.secondary_color})`, boxShadow: `0 20px 60px ${b.primary_color}30`, maxWidth: '90px', maxHeight: '90px' }}>
                {b.logo_url ? (
                  <img 
                    src={b.logo_url} 
                    alt={b.brand_name} 
                    className={`object-contain p-3`}
                    style={{ width: '90%', height: '90%' }}
                  />
                ) : (
                  <span className="text-white font-black text-3xl md:text-4xl tracking-tight">{b.brand_initials || 'FJ'}</span>
                )}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
            <h1 data-testid="brand-name-display" className="text-3xl md:text-4xl font-black bg-clip-text text-transparent mb-2"
              style={{ backgroundImage: `linear-gradient(to right, #111827, ${b.primary_color}, ${b.secondary_color})`, fontFamily: b.font_family }}>
              {b.brand_name || 'FitJourney'}
            </h1>
            <p className="text-sm md:text-base text-gray-600 font-medium max-w-md mx-auto" style={{ fontFamily: b.font_family }}>
              {b.login_title || DEFAULT_BRANDING.login_title}
            </p>
            {b.login_show_stats && (
              <div className="flex items-center justify-center gap-5 mt-4">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-lg font-bold" style={{ color: b.primary_color }}>{stat.value}</p>
                    <p className="text-[10px] text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-5xl w-full">
            {loginCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.type} data-testid={`${card.type}-login-card`}
                  onClick={() => card.isVisitor ? handleVisitorLogin() : setLoginType(card.type)}
                  className={`group relative cursor-pointer transition-all duration-500 ${card.featured ? 'lg:-mt-2 lg:mb-2' : ''}`}>
                  {card.featured && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
                      <div className="px-3 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-white text-[10px] font-bold shadow-lg flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" /> MAIS POPULAR
                      </div>
                    </div>
                  )}
                  <Card className={`relative overflow-hidden border-2 border-gray-100 ${card.borderHover} transition-all duration-500 hover:shadow-2xl ${card.shadowHover} hover:-translate-y-2 ${cardStyle} h-full`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <CardHeader className="relative text-center pb-1 pt-4">
                      <div className="relative mx-auto mb-3">
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                        <div className={`relative w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                          <Icon className={`${card.iconColor}`} size={24} />
                        </div>
                      </div>
                      <CardTitle className="text-base font-bold text-gray-900">{card.title}</CardTitle>
                      <CardDescription className="text-gray-500 mt-0.5 text-xs leading-tight">{card.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="relative pt-0 pb-4 px-3">
                      <Button data-testid={`${card.type}-login-button`}
                        className={`w-full bg-gradient-to-r ${card.buttonGradient} text-white shadow-lg hover:shadow-xl py-4 text-xs font-semibold group-hover:scale-[1.02] transition-all`}>
                        {card.isVisitor ? 'Acessar Ferramentas' : `Entrar como ${card.title}`}
                        <ChevronRight className="ml-1.5 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
          <FooterSection />
        </div>
      </div>
    );
  }

  const config = loginCards.find(c => c.type === loginType) || loginCards[0];
  const Icon = config.icon;

  return (
    <div className="min-h-screen relative" style={bgStyle}>
      <FloatingEffects />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className={`${getLoginCardWidthClass(b.login_card_width)} w-full`}>
          <Button variant="ghost" onClick={() => { setLoginType(null); setEmail(''); setPassword(''); }}
            className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-white/50 backdrop-blur-sm">
            <ArrowLeft className="mr-2" size={18} /> Voltar para selecao
          </Button>
          <Card className={`relative overflow-hidden border-0 shadow-2xl ${cardStyle}`}>
            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${config.gradient}`} />
            <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${config.bgGradient} rounded-full -translate-y-20 translate-x-20 blur-2xl`} />
            <CardHeader className="relative text-center pt-10 pb-4">
              <div className="relative mx-auto mb-4">
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-2xl blur-lg opacity-30`} />
                <div className={`relative w-20 h-20 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-xl`}>
                  <Icon className={config.iconColor} size={40} />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Login {config.title}</CardTitle>
              <CardDescription className="text-gray-500 mt-1">{config.description}</CardDescription>
            </CardHeader>
            <CardContent className="relative px-8 pb-8">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> Email</Label>
                  <Input id="email" data-testid="email-input" type="email" placeholder="seu@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                    className="py-5 px-4 bg-gray-50/50 border-gray-200 focus:border-teal-400 focus:ring-teal-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium flex items-center gap-2"><Lock className="w-4 h-4 text-gray-400" /> Senha</Label>
                  <Input id="password" data-testid="password-input" type="password" placeholder="........" value={password}
                    onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                    className="py-5 px-4 bg-gray-50/50 border-gray-200 focus:border-teal-400 focus:ring-teal-200 rounded-xl" />
                </div>
                <Button data-testid="submit-login" type="submit"
                  className={`w-full bg-gradient-to-r ${config.buttonGradient} text-white shadow-xl hover:shadow-2xl py-6 text-base font-semibold rounded-xl mt-2 transition-all`}
                  disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Entrando...</> : <><Zap className="mr-2 h-5 w-5" /> Entrar na plataforma</>}
                </Button>
              </form>
              <div className={`mt-6 p-4 rounded-xl bg-gradient-to-br ${config.bgGradient} border border-gray-100`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${config.iconBg} flex-shrink-0`}><Icon className={`${config.iconColor} w-4 h-4`} /></div>
                  <div>
                    {loginType === 'admin' && <p className="text-sm text-gray-600"><strong className="text-gray-800">Administrador:</strong> Gerencia profissionais e configuracoes do sistema.</p>}
                    {loginType === 'professional' && <p className="text-sm text-gray-600"><strong className="text-gray-800">Profissional:</strong> Gerencie pacientes, planos alimentares e resultados.</p>}
                    {loginType === 'patient' && <p className="text-sm text-gray-600"><strong className="text-gray-800">Paciente:</strong> Acesse seu plano alimentar e acompanhe sua evolucao.</p>}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-xs">
                <Lock className="w-3 h-3" /><span>Dados protegidos com criptografia SSL</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
