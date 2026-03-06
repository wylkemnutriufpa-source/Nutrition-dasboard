import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const Layout = ({ children, title, showBack = false, userType: propUserType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();

  // IMPORTANTE: Source of truth CENTRALIZADA
  // Admin SEMPRE é admin em áreas /admin/*
  // Em outras áreas, admin pode ter contexto 'professional'
  const effectiveUserType = (() => {
    // Se foi explicitamente passado como 'visitor', usar visitor
    if (propUserType === 'visitor') {
      return 'visitor';
    }
    
    // Se tem profile logado
    if (profile?.role) {
      // 🔒 REGRA 1: Admin em rotas /admin/* → SEMPRE admin
      if (profile.role === 'admin' && location.pathname.startsWith('/admin')) {
        console.log(`🔐 [Layout] Admin em área ADMIN — forçando tipo admin`);
        return 'admin';
      }

      // 🔒 REGRA 2: Se propUserType é 'admin' e profile é admin → respeitar
      if (profile.role === 'admin' && propUserType === 'admin') {
        console.log(`🔐 [Layout] Admin explícito via prop`);
        return 'admin';
      }
      
      // REGRA 3: Admin em contexto professional (fora de /admin/*)
      const savedContext = localStorage.getItem('fitjourney_context');
      if (profile.role === 'admin' && savedContext === 'professional') {
        console.log(`🔄 [Layout] Admin em contexto Professional`);
        return 'professional';
      }
      
      // Caso contrário, usar role real
      console.log(`🔍 [Layout] Profile role: ${profile.role} para user: ${profile.email}`);
      return profile.role;
    }
    
    // Fallback: visitor para usuários não autenticados
    return 'visitor';
  })();

  const handleLogout = async () => {
    // Fazer signOut do Supabase
    await supabase.auth.signOut();
    
    // Limpar localStorage
    localStorage.removeItem('fitjourney_user_type');
    localStorage.removeItem('fitjourney_user_email');
    localStorage.removeItem('fitjourney_user_id');
    localStorage.removeItem('fitjourney_patient_id');
    localStorage.removeItem('fitjourney_patient_name');
    
    // Navegar para home
    navigate('/', { replace: true });
  };

  // Verificar se é admin fora da área admin (para adicionar padding-top)
  const isAdmin = profile?.role === 'admin';
  const isInAdminArea = location.pathname.startsWith('/admin');
  const shouldCompensateAdminBar = isAdmin && !isInAdminArea;

  // Obter patientId para o menu dinâmico
  const patientId = effectiveUserType === 'patient' ? (user?.id || profile?.id || localStorage.getItem('fitjourney_patient_id')) : null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType={effectiveUserType} onLogout={handleLogout} patientId={patientId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Compensar espaço da AdminBar quando necessário */}
        {shouldCompensateAdminBar && <div className="h-16" />}
        
        <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {showBack && (
                <Button
                  data-testid="back-button"
                  onClick={() => navigate(-1)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft size={20} />
                </Button>
              )}
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            </div>
            
            {/* Busca Global + Sino de notificações para profissionais e admin */}
            <div className="flex items-center gap-3">
              {(effectiveUserType === 'professional' || effectiveUserType === 'admin') && (
                <>
                  <GlobalSearch userType={effectiveUserType} />
                  <NotificationBell />
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;