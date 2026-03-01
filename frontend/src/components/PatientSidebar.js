import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Calendar, ClipboardList, MessageSquare, ShoppingCart,
  ChefHat, Pill, Lightbulb, TrendingUp, LogOut, Calculator, Settings, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/contexts/BrandingContext';
import { getPatientMenuConfig, DEFAULT_PATIENT_MENU } from '@/lib/supabase';

// Mapeamento de ícones
const iconMap = {
  Home,
  Calendar,
  ClipboardList,
  MessageSquare,
  ShoppingCart,
  ChefHat,
  Pill,
  Lightbulb,
  TrendingUp,
  Calculator,
  Settings,
  Camera
};

const PatientSidebar = ({ patientId, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [menuItems, setMenuItems] = useState(DEFAULT_PATIENT_MENU);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMenuConfig = async () => {
      if (!patientId) {
        setMenuItems(DEFAULT_PATIENT_MENU);
        setLoading(false);
        return;
      }

      try {
        const { data } = await getPatientMenuConfig(patientId);
        if (data?.menu_items && Array.isArray(data.menu_items)) {
          setMenuItems(data.menu_items);
        } else {
          setMenuItems(DEFAULT_PATIENT_MENU);
        }
      } catch (error) {
        console.error('Erro ao carregar menu:', error);
        setMenuItems(DEFAULT_PATIENT_MENU);
      } finally {
        setLoading(false);
      }
    };

    loadMenuConfig();
  }, [patientId]);

  // Links fixos (sempre visíveis)
  const fixedLinks = [
    { to: '/patient/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/patient/anamnesis', icon: ClipboardList, label: 'Minha Anamnese', badge: 'importante' },
    { to: '/patient/meal-photo', icon: Camera, label: 'Análise do Prato', badge: 'novo' }
  ];

  // Filtrar e ordenar itens visíveis
  const visibleMenuItems = menuItems
    .filter(item => item.visible)
    .sort((a, b) => a.order - b.order);

  const getPrimaryColor = () => {
    return branding.primaryColor || '#0F766E';
  };

  const getIcon = (iconName) => {
    return iconMap[iconName] || Home;
  };

  return (
    <div data-testid="patient-sidebar" className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <Link to="/" className="flex items-center space-x-2">
          {branding.logo ? (
            <img src={branding.logo} alt={branding.brandName} className="w-10 h-10 rounded-lg object-contain" />
          ) : (
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(to br, ${getPrimaryColor()}, ${branding.accentColor || '#059669'})` }}
            >
              <span className="text-white font-bold text-xl">
                {branding.brandName?.substring(0, 2).toUpperCase() || 'FJ'}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{branding.brandName || 'FitJourney'}</h1>
            <p className="text-xs text-gray-500">Meu Projeto</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Links fixos */}
        {fixedLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center justify-between space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive ? 'text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={isActive ? { backgroundColor: getPrimaryColor() } : {}}
            >
              <div className="flex items-center space-x-3">
                <Icon size={20} />
                <span className="font-medium text-sm">{link.label}</span>
              </div>
              {link.badge && !isActive && (
                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Separador */}
        <div className="my-3">
          <p className="text-xs font-semibold text-gray-400 uppercase px-4 py-1">Meu Projeto</p>
        </div>

        {/* Menu dinâmico */}
        {loading ? (
          <div className="px-4 py-2 text-sm text-gray-500">Carregando menu...</div>
        ) : (
          visibleMenuItems.map((item) => {
            const Icon = getIcon(item.icon);
            const isActive = location.pathname === item.route;
            return (
              <Link
                key={item.id}
                to={item.route}
                data-testid={`menu-item-${item.id}`}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive ? 'text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={isActive ? { backgroundColor: getPrimaryColor() } : {}}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })
        )}

        {/* Calculadoras (link fixo no final) */}
        <div className="my-3">
          <div className="border-t border-gray-200 pt-3">
            <Link
              to="/patient/calculators"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                location.pathname === '/patient/calculators' ? 'text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={location.pathname === '/patient/calculators' ? { backgroundColor: getPrimaryColor() } : {}}
            >
              <Calculator size={20} />
              <span className="font-medium text-sm">Calculadoras</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Logout */}
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

export default PatientSidebar;
