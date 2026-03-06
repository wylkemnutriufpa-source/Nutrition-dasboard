import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo } from 'react';

/**
 * Barra fixa de Admin que aparece quando admin está visualizando outras áreas
 * Permite retornar ao painel admin facilmente
 */
const AdminBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  // Memorizar valores calculados para evitar loop infinito
  const isAdmin = useMemo(() => profile?.role === 'admin', [profile?.role]);
  const isInAdminArea = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname]);
  const isInLoginPage = useMemo(() => location.pathname === '/', [location.pathname]);
  const currentContext = useMemo(() => localStorage.getItem('fitjourney_context') || 'admin', []);
  const shouldShow = useMemo(() => 
    isAdmin && !isInAdminArea && !isInLoginPage, 
    [isAdmin, isInAdminArea, isInLoginPage]
  );

  if (!shouldShow) {
    return null;
  }

  // Detectar em qual área está
  let currentArea = 'Sistema';
  if (location.pathname.startsWith('/professional')) {
    currentArea = 'Área Profissional';
  } else if (location.pathname.startsWith('/patient')) {
    currentArea = 'Área de Paciente';
  }

  const handleBackToAdmin = () => {
    localStorage.setItem('fitjourney_context', 'admin');
    localStorage.setItem('fitjourney_user_type', 'admin');
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-purple-700 to-purple-800 text-white shadow-lg"
      style={{ zIndex: 9999 }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5" />
          <div>
            <p className="text-sm font-semibold">Modo Administrador</p>
            <p className="text-xs opacity-90 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Visualizando: {currentArea}
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleBackToAdmin}
          variant="secondary"
          size="sm"
          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Painel Admin
        </Button>
      </div>
    </div>
  );
};

export default AdminBar;
