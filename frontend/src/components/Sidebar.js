import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Users, Calendar, Calculator, FileText, Settings, LogOut, 
  Database, Palette, Shield, ClipboardList, MessageSquare, Stethoscope,
  UserCog, Activity, ShoppingCart, ChefHat, Pill, Lightbulb, TrendingUp,
  Sparkles, DollarSign, CalendarDays, Bell, Rocket, Book, Utensils, Camera, User,
  Bot, BarChart3, Globe, Droplets
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/contexts/BrandingContext';
import { getLogoShapeClass, getLogoSizeClass } from '@/utils/branding';
import { useState, useEffect } from 'react';
import { getPatientMenuConfig, DEFAULT_PATIENT_MENU } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Mapeamento de ícones para menu dinâmico
const iconMap = {
  Home, Calendar, ClipboardList, MessageSquare, ShoppingCart,
  ChefHat, Pill, Lightbulb, TrendingUp, Calculator, Settings,
  Users, Database, Palette, Shield, UserCog, Activity, Sparkles,
  DollarSign, CalendarDays, Bell, Rocket, Book, Utensils, Camera, User,
  Bot, BarChart3, Globe, Droplets
};

const Sidebar = ({ userType, onLogout, patientId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { profile } = useAuth();
  
  // 🔒 SOURCE OF TRUTH: profile.role do AuthContext
  // Se profile.role é 'admin', SEMPRE mostrar links admin, independente do userType prop
  const isRealAdmin = profile?.role === 'admin';
  
  // 🔍 DEBUG: Log detalhado para diagnóstico
  console.log('🔍 [Sidebar DEBUG] profile:', profile ? { id: profile.id, email: profile.email, role: profile.role } : 'NULL');
  console.log('🔍 [Sidebar DEBUG] isRealAdmin:', isRealAdmin, '| userType prop:', userType);
  
  // Estado para menu dinâmico do paciente
  const [patientMenuItems, setPatientMenuItems] = useState(DEFAULT_PATIENT_MENU);
  const [menuLoading, setMenuLoading] = useState(userType === 'patient');

  // Detectar se está em calculadoras ou health check
  const isInHealthCheck = location.pathname.includes('/health-check');
  const isInCalculators = location.pathname.includes('/calculator');

  // PROTEÇÃO: Garantir que userType seja válido
  const validUserType = ['admin', 'professional', 'patient', 'visitor'].includes(userType) 
    ? userType 
    : 'visitor';

  // Carregar menu do paciente
  useEffect(() => {
    const loadPatientMenu = async () => {
      if (validUserType !== 'patient' || !patientId) {
        setMenuLoading(false);
        return;
      }

      try {
        const { data } = await getPatientMenuConfig(patientId);
        if (data?.menu_items && Array.isArray(data.menu_items)) {
          setPatientMenuItems(data.menu_items);
        }
      } catch (error) {
        console.error('Erro ao carregar menu do paciente:', error);
      } finally {
        setMenuLoading(false);
      }
    };

    loadPatientMenu();
  }, [validUserType, patientId]);

  // ============================================
  // DEFINIÇÃO DE LINKS POR TIPO
  // ============================================
  
  // 🔴 Links ADMIN (só admin vê)
  const adminLinks = [
    { to: '/admin/dashboard', icon: Shield, label: 'Painel Admin' },
    { to: '/admin/features', icon: Activity, label: 'Controle de Features', adminOnly: true },
    { to: '/professional/projeto-editor', icon: Sparkles, label: 'Projeto Biquíni Branco' }
  ];
  
  // 🟡 Links PROFESSIONAL
  const professionalLinks = [
    { to: '/professional/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/professional/patients', icon: Users, label: 'Pacientes' },
    { to: '/professional/feedbacks', icon: MessageSquare, label: 'Feedbacks' },
    { to: '/professional/receitas', icon: ChefHat, label: 'Receitas' },
    { to: '/professional/templates', icon: Rocket, label: 'Templates Globais' },
    { to: '/professional/gallery', icon: Globe, label: 'Galeria Pública' },
    { to: '/professional/dicas', icon: Lightbulb, label: 'Dicas Inteligentes' },
    { to: '/professional/agenda', icon: CalendarDays, label: 'Agenda' },
    { to: '/professional/financeiro', icon: DollarSign, label: 'Financeiro' },
    { to: '/professional/food-database', icon: Database, label: 'Alimentos' },
    { to: '/professional/testimonials', icon: MessageSquare, label: 'Depoimentos', badge: 'MOD' },
    { to: '/professional/branding', icon: Palette, label: 'Personalização' },
    { to: '/professional/settings', icon: Settings, label: 'Configurações' },
    { to: '/professional/automations', icon: Bot, label: 'Automações', premium: true },
    { to: '/professional/reports', icon: BarChart3, label: 'Relatórios Inteligentes', premium: true },
    { to: '/professional/guide', icon: Book, label: 'Central de Recursos', premium: true }
  ];

  // Links do Paciente agora são todos dinâmicos (vindos da configuração)
  const getPatientLinks = () => {
    return patientMenuItems
      .filter(item => item.visible)
      .sort((a, b) => a.order - b.order)
      .map(item => ({
        to: item.route,
        icon: iconMap[item.icon] || Home,
        label: item.name,
        isFixed: item.fixed
      }));
  };

  // Links do Visitante
  const visitorLinks = [
    { to: '/visitor/calculators', icon: Calculator, label: 'Ferramentas' }
  ];

  // Montar menu baseado no tipo de usuário
  // 🔒 REGRA: Se profile.role é 'admin', SEMPRE incluir links admin no topo
  const getLinks = () => {
    console.log(`📋 [Sidebar] userType prop: ${validUserType} | isRealAdmin: ${isRealAdmin}`);
    
    // ADMIN REAL (profile.role === 'admin'): SEMPRE vê links admin + professional
    // Não importa se veio como 'professional' via contexto
    if (isRealAdmin) {
      console.log(`✅ [Sidebar] ADMIN REAL — mostrando admin + professional links`);
      return [
        ...adminLinks,
        { type: 'separator', label: 'Área Profissional' },
        ...professionalLinks
      ];
    }
    
    switch (validUserType) {
      case 'professional':
        // 🔒 Professional REAL: APENAS links professional (sem admin)
        console.log(`✅ [Sidebar] Professional - ${professionalLinks.length} links (SEM admin)`);
        return professionalLinks;
      case 'patient':
        return getPatientLinks();
      default:
        return visitorLinks;
    }
  };

  // Definir links a serem renderizados
  const linksToRender = getLinks();

  const getUserTypeLabel = () => {
    // 🔒 Admin real SEMPRE mostra "Administrador"
    if (isRealAdmin) return 'Administrador';
    switch(validUserType) {
      case 'professional': return 'Profissional';
      case 'patient': return 'Paciente';
      default: return 'Visitante';
    }
  };

  const getPrimaryColor = () => {
    if (isRealAdmin) return '#7C3AED';
    return branding.primary_color || branding.primaryColor || '#0F766E';
  };

  return (
    <div data-testid="sidebar" className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <Link to="/" className="flex items-center space-x-3">
          {branding.logo_url ? (
            <img 
              src={branding.logo_url} 
              alt={branding.brand_name || branding.brandName || 'FitJourney'} 
              className={`${getLogoSizeClass(branding.logo_size_sidebar, 'sidebar')} ${getLogoShapeClass(branding.logo_shape)} object-cover shadow-md`}
            />
          ) : (
            <div 
              className={`${getLogoSizeClass(branding.logo_size_sidebar, 'sidebar')} ${getLogoShapeClass(branding.logo_shape)} flex items-center justify-center shadow-md`}
              style={{ background: `linear-gradient(to br, ${getPrimaryColor()}, ${branding.accent_color || branding.accentColor || '#059669'})` }}
            >
              <span className="text-white font-bold text-2xl">
                {userType === 'admin' ? 'AD' : (branding.brand_initials || (branding.brand_name || branding.brandName || 'FJ')?.substring(0, 2).toUpperCase())}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{branding.brand_name || branding.brandName || 'FitJourney'}</h1>
            <p className="text-xs text-gray-500">
              {validUserType === 'patient' ? 'Meu Projeto' : getUserTypeLabel()}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Navegação condicional para visitante */}
        {validUserType === 'visitor' && (isInHealthCheck || isInCalculators) && (
          <>
            {isInHealthCheck && (
              <button
                onClick={() => navigate('/visitor/calculators')}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
              >
                <Calculator size={20} />
                <span className="font-medium text-sm">Ver Calculadoras</span>
              </button>
            )}
            {isInCalculators && (
              <button
                onClick={() => navigate('/visitor/health-check')}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-purple-600 hover:bg-purple-50 transition-all"
              >
                <Activity size={20} />
                <span className="font-medium text-sm">Check Nutricional</span>
              </button>
            )}
            <div className="border-t border-gray-200 my-2"></div>
          </>
        )}
        
        {/* Links principais */}
        {linksToRender.map((link, idx) => {
          // Separador entre seções
          if (link.type === 'separator') {
            return (
              <div key={`sep-${idx}`} className="pt-2 pb-1 px-2">
                <div className="border-t border-purple-200"></div>
                <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider px-2 pt-2">{link.label}</p>
              </div>
            );
          }

          const Icon = link.icon;
          const isActive = location.pathname === link.to || 
            (link.to === '/professional/patients' && location.pathname.startsWith('/professional/patient'));
          return (
            <Link
              key={link.to}
              to={link.to}
              data-testid={`sidebar-link-${link.label.toLowerCase().replace(/ /g, '-')}`}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive ? 'text-white shadow-md' : link.adminOnly ? 'text-purple-700 hover:bg-purple-50 bg-gradient-to-r from-purple-50/80 to-violet-50/60 border border-purple-100' : link.premium ? 'text-purple-700 hover:bg-purple-50 bg-gradient-to-r from-purple-50/80 to-pink-50/60 border border-purple-100' : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={isActive ? { backgroundColor: link.adminOnly ? '#7C3AED' : link.premium ? '#7C3AED' : getPrimaryColor() } : {}}
            >
              <Icon size={20} />
              <span className="font-medium text-sm flex-1">{link.label}</span>
              {link.adminOnly && !isActive && (
                <span className="text-[9px] font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white px-1.5 py-0.5 rounded-full">ADM</span>
              )}
              {link.premium && !isActive && (
                <span className="text-[9px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full">PRO</span>
              )}
              {link.badge && !isActive && (
                <span className="text-[9px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full">{link.badge}</span>
              )}
            </Link>
          );
        })}

        {/* Mensagem de carregamento para paciente */}
        {validUserType === 'patient' && menuLoading && (
          <div className="px-4 py-2 text-sm text-gray-500">Carregando menu...</div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <Button
          data-testid="logout-button"
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut size={20} className="mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
