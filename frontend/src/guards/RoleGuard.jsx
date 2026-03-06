/**
 * RoleGuard - Proteção baseada em roles do Supabase
 * 
 * 🔒 SEGURANÇA CRÍTICA - HIERARQUIA DE AUTORIZAÇÃO:
 * 1. profile.role (de public.profiles via Supabase) ✅ ÚNICA FONTE DE AUTORIZAÇÃO
 * 2. localStorage.fitjourney_context ❌ APENAS VISUAL (não afeta guards)
 * 3. JWT role payload ❌ NÃO USADO (interno do Supabase Auth)
 * 
 * Este guard usa APENAS profile.role para validação de acesso.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessArea, getDefaultRoute } from '@/lib/authorization';
import { Loader2 } from 'lucide-react';

/**
 * RoleGuard - Protege rotas baseado no role do usuário
 * Usa camada central de autorização (authorization.js)
 * 
 * Regras:
 * - admin: TODAS as rotas (superusuário)
 * - professional: /professional/* apenas
 * - patient: /patient/* apenas
 */
export const RoleGuard = ({ children, allowedRoles = [] }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    // Visitante: permitir acesso a rotas de visitante sem profile
    if (allowedRoles.includes('visitor')) {
      const isVisitor = localStorage.getItem('fitjourney_user_type') === 'visitor';
      if (isVisitor) {
        return children;
      }
    }
    // Não autenticado - redireciona para login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 🔒 AUTORIZAÇÃO: profile.role é a ÚNICA fonte de verdade
  // Não usa localStorage, não usa JWT role
  const userRole = profile.role;

  // Admin tem acesso a TUDO via canAccessArea (superuser)
  if (userRole === 'admin') {
    return children;
  }

  // Verificar se o role é permitido pela lista de roles E pela camada central
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Detectar a área da rota atual
    const area = location.pathname.split('/')[1]; // 'admin', 'professional', 'patient'
    
    // Verificar na camada central
    if (!canAccessArea(userRole, area)) {
      console.warn(`🚫 [RoleGuard] Acesso negado: role "${userRole}" tentou acessar área "${area}"`);
      return <Navigate to={getDefaultRoute(userRole)} replace />;
    }
  }

  // Role permitido - renderizar children
  return children;
};

/**
 * Helper: Bloquear paciente de acessar rotas admin/professional
 */
export const BlockPatientGuard = ({ children }) => {
  return (
    <RoleGuard allowedRoles={['professional', 'admin']}>
      {children}
    </RoleGuard>
  );
};

/**
 * Helper: Apenas admin
 */
export const AdminOnlyGuard = ({ children }) => {
  return (
    <RoleGuard allowedRoles={['admin']}>
      {children}
    </RoleGuard>
  );
};

/**
 * Helper: Apenas paciente
 */
export const PatientOnlyGuard = ({ children }) => {
  return (
    <RoleGuard allowedRoles={['patient']}>
      {children}
    </RoleGuard>
  );
};
