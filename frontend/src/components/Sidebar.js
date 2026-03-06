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

  // Links do Professional (SEM features exclusivas de admin)
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
    // REMOVIDO: Projeto Biquíni Branco (agora é exclusivo admin)
    { to: '/professional/testimonials', icon: MessageSquare, label: 'Depoimentos', badge: 'MOD' },
    { to: '/professional/branding', icon: Palette, label: 'Personalização' },
    { to: '/professional/settings', icon: Settings, label: 'Configurações' },
    { to: '/professional/automations', icon: Bot, label: 'Automações', premium: true },
    { to: '/professional/reports', icon: BarChart3, label: 'Relatórios Inteligentes', premium: true },
    { to: '/professional/guide', icon: Book, label: 'Central de Recursos', premium: true }
  ];

  // Links exclusivos do Admin
  const adminExtraLinks = [
    { to: '/admin/dashboard', icon: Shield, label: 'Painel Admin' },
    { to: '/professional/projeto-editor', icon: Sparkles, label: 'Projeto Biquíni Branco' }  // 🔒 Só admin
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
  const getLinks = () => {
    console.log(`📋 [Sidebar] Montando links para: ${validUserType}`);
    
    switch (validUserType) {
      case 'admin':
        // 🔒 Admin vê: links exclusivos admin + links professional
        console.log(`✅ [Sidebar] Admin - ${adminExtraLinks.length} admin + ${professionalLinks.length} professional`);
        return [...adminExtraLinks, ...professionalLinks];
      case 'professional':
        // 🔒 Professional vê: APENAS links professional (sem admin)
        console.log(`✅ [Sidebar] Professional - ${professionalLinks.length} links (SEM admin)`);
        return professionalLinks;
      case 'patient':
        // Retorna todos os links configurados pelo profissional
        return getPatientLinks();
      default:
        return visitorLinks;
    }
  };

  const links = getLinks();
  // Não precisa mais de patientDynamicLinks separado
  const patientDynamicLinks = [];

  const getUserTypeLabel = () => {
    switch(validUserType) {
      case 'admin': return 'Administrador';
      case 'professional': return 'Profissional';
      case 'patient': return 'Paciente';
      default: return 'Visitante';
    }
  };

  const getPrimaryColor = () => {
    if (validUserType === 'admin') return '#7C3AED';
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
        {/* Separador para admin */}
        {validUserType === 'admin' && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase px-4 pt-2 pb-1">Admin</p>
            {adminExtraLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  data-testid={`sidebar-link-${link.label.toLowerCase().replace(/ /g, '-')}`}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    isActive ? 'text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={isActive ? { backgroundColor: '#7C3AED' } : {}}
                >
                  <Icon size={20} />
                  <span className="font-medium text-sm">{link.label}</span>
                </Link>
              );
            })}
            <p className="text-xs font-semibold text-gray-400 uppercase px-4 pt-4 pb-1">Nutrição</p>
          </>
        )}
        
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
        {(validUserType === 'admin' ? professionalLinks : links).map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to || 
            (link.to === '/professional/patients' && location.pathname.startsWith('/professional/patient'));
          return (
            <Link
              key={link.to}
              to={link.to}
              data-testid={`sidebar-link-${link.label.toLowerCase().replace(/ /g, '-')}`}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive ? 'text-white shadow-md' : link.premium ? 'text-purple-700 hover:bg-purple-50 bg-gradient-to-r from-purple-50/80 to-pink-50/60 border border-purple-100' : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={isActive ? { backgroundColor: link.premium ? '#7C3AED' : getPrimaryColor() } : {}}
            >
              <Icon size={20} />
              <span className="font-medium text-sm flex-1">{link.label}</span>
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
