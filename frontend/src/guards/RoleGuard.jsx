import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * RoleGuard - Protege rotas baseado no role do usuário
 * 
 * Regras:
 * - patient: SOMENTE /patient/*
 * - professional: /professional/* + /patient/*
 * - admin: TODAS as rotas
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
    // Não autenticado - redireciona para login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = profile.role;

  // Verificar se o role é permitido
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    console.warn(`🚫 Acesso negado: role "${userRole}" tentou acessar rota protegida`);
    
    // Redirecionar para dashboard apropriado
    if (userRole === 'patient') {
      return <Navigate to="/patient/home" replace />;
    }
    if (userRole === 'professional') {
      return <Navigate to="/professional/dashboard" replace />;
    }
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    
    return <Navigate to="/login" replace />;
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
