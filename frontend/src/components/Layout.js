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

  // ============================================
  // SOURCE OF TRUTH: profile.role + contexto + path
  // ============================================
  // REGRAS:
  // 1. Em rotas /admin/* → SEMPRE admin (independente de contexto)
  // 2. Admin com contexto='professional' em rotas /professional/* → professional
  // 3. Admin com contexto='admin' → admin
  // 4. Outros roles → usar profile.role direto
  //
  // ⚠️  IMPORTANTE – ESCOPO DO fitjourney_context:
  //   fitjourney_context (localStorage) controla APENAS o layout visual
  //   (qual sidebar e menu são exibidos). Ele NÃO:
  //     - altera o role real do usuário
  //     - influencia o RoleGuard ou qualquer guard de rota
  //     - concede ou remove permissões
  //   A fonte real de autorização é SEMPRE profile.role (de public.profiles
  //   via Supabase, carregado no AuthContext).
  const effectiveUserType = (() => {
    // Visitor explícito
    if (propUserType === 'visitor') {
      return 'visitor';
    }
    
    // Se tem profile logado
    if (profile?.role) {
      // ADMIN: lógica especial com contexto
      if (profile.role === 'admin') {
        // REGRA 1: Em /admin/* → SEMPRE admin (painel admin nunca some)
        if (location.pathname.startsWith('/admin')) {
          console.log('🔐 [Layout] Admin em /admin/* → forçando admin');
          return 'admin';
        }
        
        // REGRA 2: Contexto professional fora de /admin/*
        const savedContext = localStorage.getItem('fitjourney_context');
        if (savedContext === 'professional') {
          console.log('🔄 [Layout] Admin em contexto Professional');
          return 'professional';
        }
        
        // Default: admin
        return 'admin';
      }
      
      // Outros roles: usar direto
      return profile.role;
    }
    
    // Fallback: visitor
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