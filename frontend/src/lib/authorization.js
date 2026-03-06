/**
 * ============================================
 * CAMADA CENTRAL DE AUTORIZAÇÃO
 * ============================================
 * 
 * FONTE ÚNICA DE VERDADE para controle de acesso.
 * Toda validação de área e feature deve passar por aqui.
 *
 * HIERARQUIA:
 *   ADMIN > PROFESSIONAL > PATIENT
 *
 * REGRAS:
 *   - ADMIN: superusuário, vê tudo, nunca bloqueado
 *   - PROFESSIONAL: só área professional, features controladas pelo ADM
 *   - PATIENT: só área patient, features controladas pelo ADM + professional
 */

import { loadFeatureFlags } from '@/lib/supabase';

// ==================== ÁREAS ====================

const AREA_HIERARCHY = {
  admin: ['admin', 'professional', 'patient'],
  professional: ['professional'],
  patient: ['patient'],
  visitor: ['visitor']
};

/**
 * Verifica se um role pode acessar determinada área.
 * 
 * @param {string} role - Role do usuário: 'admin' | 'professional' | 'patient' | 'visitor'
 * @param {string} area - Área desejada: 'admin' | 'professional' | 'patient' | 'visitor'
 * @returns {boolean}
 */
export const canAccessArea = (role, area) => {
  if (!role || !area) return false;
  
  // Admin SEMPRE acessa tudo
  if (role === 'admin') return true;
  
  const allowedAreas = AREA_HIERARCHY[role] || [];
  return allowedAreas.includes(area);
};

// ==================== FEATURES ====================

/**
 * Estados possíveis de uma feature por perfil:
 * - 'active': liberada para uso
 * - 'disabled': bloqueada
 * - 'coming_soon': visível mas não usável
 */
export const FEATURE_STATES = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  COMING_SOON: 'coming_soon'
};

/**
 * Verifica se um usuário pode usar uma feature específica.
 * Consulta a tabela platform_features via cache.
 *
 * @param {string} slug - Slug da feature
 * @param {object} profile - Profile do usuário (com role, plan_type)
 * @returns {Promise<{allowed: boolean, readOnly: boolean, comingSoon: boolean, state: string, reason: string}>}
 */
export const canUseFeature = async (slug, profile) => {
  const BLOCKED = { allowed: false, readOnly: false, comingSoon: false, state: 'disabled' };
  const COMING = { allowed: false, readOnly: false, comingSoon: true, state: 'coming_soon' };
  const ALLOWED = { allowed: true, readOnly: false, comingSoon: false, state: 'active' };

  if (!slug || !profile) {
    return { ...BLOCKED, reason: 'Dados insuficientes' };
  }

  // 🔒 ADMIN: nunca bloqueado
  if (profile.role === 'admin') {
    return { ...ALLOWED, reason: 'Superusuário' };
  }

  try {
    const features = await loadFeatureFlags();
    const feature = features.find(f => f.slug === slug);

    // Feature não cadastrada = permitir (modo defensivo)
    if (!feature) {
      return { ...ALLOWED, reason: 'Não cadastrada' };
    }

    // 1. Verificar estado global
    if (!feature.is_active) {
      return { ...BLOCKED, reason: 'Funcionalidade desativada pelo administrador' };
    }

    // 2. Verificar estado por perfil (nova lógica 3 estados)
    const isProf = profile.role === 'professional';
    const isPatient = profile.role === 'patient';

    if (isProf) {
      const profState = feature.professional_state || 'active';
      if (profState === 'disabled') {
        return { ...BLOCKED, reason: 'Indisponível para profissionais' };
      }
      if (profState === 'coming_soon') {
        return { ...COMING, reason: 'Em breve para profissionais' };
      }
      // Fallback: boolean legado
      if (feature.enabled_for_professional === false && !feature.professional_state) {
        return { ...BLOCKED, reason: 'Indisponível para profissionais' };
      }
    }

    if (isPatient) {
      const patState = feature.patient_state || 'active';
      if (patState === 'disabled') {
        return { ...BLOCKED, reason: 'Indisponível para pacientes' };
      }
      if (patState === 'coming_soon') {
        return { ...COMING, reason: 'Em breve para pacientes' };
      }
      // Fallback: boolean legado
      if (feature.enabled_for_patient === false && !feature.patient_state) {
        return { ...BLOCKED, reason: 'Indisponível para pacientes' };
      }
    }

    // 3. Verificar coming_soon global (legado)
    if (feature.coming_soon) {
      return { ...COMING, reason: 'Em breve — funcionalidade em desenvolvimento' };
    }

    // 4. Verificar plano (apenas profissional)
    if (isProf && feature.is_pro) {
      const planType = profile.plan_type || 'basic';
      if (planType === 'basic') {
        return { allowed: false, readOnly: true, comingSoon: false, state: 'pro_required', reason: 'Recurso PRO — faça upgrade' };
      }
      if (planType === 'trial') {
        const trialExpired = profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date();
        if (trialExpired) {
          return { allowed: false, readOnly: true, comingSoon: false, state: 'trial_expired', reason: 'Trial expirado' };
        }
      }
    }

    return { ...ALLOWED };
  } catch (err) {
    console.error('Erro em canUseFeature:', err);
    return { ...ALLOWED, reason: 'Erro na verificação' };
  }
};

/**
 * Versão SÍNCRONA (usa cache local).
 * Para componentes que não podem ser async.
 */
export const canUseFeatureSync = (slug, profile, cachedFeatures) => {
  const BLOCKED = { allowed: false, readOnly: false, comingSoon: false, state: 'disabled' };
  const COMING = { allowed: false, readOnly: false, comingSoon: true, state: 'coming_soon' };
  const ALLOWED = { allowed: true, readOnly: false, comingSoon: false, state: 'active' };

  if (!slug || !profile) return { ...BLOCKED, reason: 'Dados insuficientes' };
  if (profile.role === 'admin') return { ...ALLOWED, reason: 'Superusuário' };

  const features = cachedFeatures;
  if (!features) return { ...ALLOWED, reason: 'Cache vazio' };

  const feature = features.find(f => f.slug === slug);
  if (!feature) return { ...ALLOWED, reason: 'Não cadastrada' };
  if (!feature.is_active) return { ...BLOCKED, reason: 'Desativada' };

  const isProf = profile.role === 'professional';
  const isPatient = profile.role === 'patient';

  if (isProf) {
    const profState = feature.professional_state || 'active';
    if (profState === 'disabled') return { ...BLOCKED, reason: 'Indisponível' };
    if (profState === 'coming_soon') return { ...COMING, reason: 'Em breve' };
    if (feature.enabled_for_professional === false && !feature.professional_state) return { ...BLOCKED, reason: 'Indisponível' };
  }

  if (isPatient) {
    const patState = feature.patient_state || 'active';
    if (patState === 'disabled') return { ...BLOCKED, reason: 'Indisponível' };
    if (patState === 'coming_soon') return { ...COMING, reason: 'Em breve' };
    if (feature.enabled_for_patient === false && !feature.patient_state) return { ...BLOCKED, reason: 'Indisponível' };
  }

  if (feature.coming_soon) return { ...COMING, reason: 'Em breve' };

  if (isProf && feature.is_pro) {
    const plan = profile.plan_type || 'basic';
    if (plan === 'basic') return { allowed: false, readOnly: true, comingSoon: false, state: 'pro_required', reason: 'Recurso PRO' };
    if (plan === 'trial') {
      const expired = profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date();
      if (expired) return { allowed: false, readOnly: true, comingSoon: false, state: 'trial_expired', reason: 'Trial expirado' };
    }
  }

  return { ...ALLOWED };
};

/**
 * Retorna a rota padrão baseada no role
 */
export const getDefaultRoute = (role) => {
  switch (role) {
    case 'admin': return '/admin/dashboard';
    case 'professional': return '/professional/dashboard';
    case 'patient': return '/patient/dashboard';
    default: return '/';
  }
};

/**
 * Verifica se o path atual pertence a determinada área
 */
export const getAreaFromPath = (pathname) => {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/professional')) return 'professional';
  if (pathname.startsWith('/patient')) return 'patient';
  if (pathname.startsWith('/visitor')) return 'visitor';
  return null;
};
