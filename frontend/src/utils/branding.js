// Sistema de White-Label / Branding
// Hierarquia: GLOBAL (ADM) > PROFESSIONAL > Paciente herda do profissional
// AGORA PERSISTIDO NO SUPABASE (não mais em localStorage)

import { 
  getCurrentProfessionalBranding, 
  getPatientProfessionalBranding,
  upsertProfessionalBranding 
} from '@/lib/supabase';

export const DEFAULT_BRANDING = {
  logo_url: null,
  logo_shape: 'rounded', // rounded, square, circle, rectangular
  logo_size_sidebar: 'medium', // small(48px), medium(64px), large(80px)
  logo_size_login: 'large', // small(80px), medium(120px), large(160px), xlarge(200px)
  primary_color: '#059669',
  secondary_color: '#10b981',
  accent_color: '#34d399',
  // Nome da marca e textos da tela de login
  brand_name: 'FitJourney',
  brand_initials: 'FJ',
  login_title: 'Sua jornada para uma vida mais saudavel comeca aqui',
  login_footer: 'Sistema de Nutricao Premium',
  // Login - Aparencia
  login_bg_color: '#f8fafc',
  login_bg_gradient_from: '#f8fafc',
  login_bg_gradient_to: '#f0fdfa',
  login_card_style: 'glass',
  login_effect: 'floating',
  login_show_stats: true,
  login_stats: [
    { label: 'Profissionais', value: '500+' },
    { label: 'Pacientes', value: '10k+' },
    { label: 'Sucesso', value: '98%' }
  ],
  // Footer editavel
  footer_copyright: '2025 FitJourney. Todos os direitos reservados.',
  footer_about: 'Plataforma completa de nutricao para profissionais e pacientes.',
  footer_faq_items: [
    { question: 'Como funciona?', answer: 'Cadastre-se como profissional ou paciente e acesse todas as ferramentas.' },
    { question: 'E gratuito?', answer: 'Oferecemos planos gratuitos e premium para profissionais.' },
    { question: 'Como faco contato?', answer: 'Envie um email para suporte@fitjourney.com' }
  ],
  footer_links: [
    { label: 'Termos de Uso', url: '#' },
    { label: 'Politica de Privacidade', url: '#' },
    { label: 'Contato', url: '#' }
  ],
  footer_show_about: true,
  footer_show_faq: true,
  footer_show_links: true,
  // Tipografia
  font_family: 'Inter, system-ui, -apple-system, sans-serif',
  font_size_base: '16px',
  font_size_heading: '2rem',
  font_size_subheading: '1.5rem',
  font_size_body: '1rem',
  font_size_small: '0.875rem',
  font_weight_normal: '400',
  font_weight_medium: '500',
  font_weight_bold: '700',
  badge_size: '0.75rem',
  button_size: '1rem'
};

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Busca o branding ativo do usuário logado
 * - Se profissional: retorna seu branding
 * - Se paciente: retorna branding do seu profissional
 * - Default: branding padrão
 */
export const getActiveBranding = async () => {
  try {
    const userType = localStorage.getItem('fitjourney_user_type');
    console.log('🔍 [BRANDING DEBUG] User Type:', userType);
    
    // Profissional OU Admin (admin também pode ter branding personalizado)
    if (userType === 'professional' || userType === 'admin') {
      const { data, error } = await getCurrentProfessionalBranding();
      console.log('🔍 [BRANDING DEBUG] Professional/Admin Branding:', { data, error });
      
      if (error) {
        console.error('❌ [BRANDING DEBUG] Erro ao buscar branding:', error);
        return DEFAULT_BRANDING;
      }
      
      if (!data) {
        console.warn('⚠️ [BRANDING DEBUG] Nenhum branding encontrado, usando DEFAULT');
        return DEFAULT_BRANDING;
      }
      
      console.log('✅ [BRANDING DEBUG] Branding carregado com sucesso:', data);
      return data;
    }
    
    if (userType === 'patient') {
      const { data, error } = await getPatientProfessionalBranding();
      console.log('🔍 [BRANDING DEBUG] Patient Professional Branding:', { data, error });
      
      if (error) {
        console.error('❌ [BRANDING DEBUG] Erro ao buscar branding do profissional:', error);
        return DEFAULT_BRANDING;
      }
      
      if (!data) {
        console.warn('⚠️ [BRANDING DEBUG] Nenhum branding encontrado para paciente, usando DEFAULT');
        return DEFAULT_BRANDING;
      }
      
      return data;
    }
    
    // Visitante (não autenticado)
    console.log('⚠️ [BRANDING DEBUG] Visitante - usando DEFAULT');
    return DEFAULT_BRANDING;
  } catch (error) {
    console.error('❌ [BRANDING DEBUG] Erro ao buscar branding:', error);
    return DEFAULT_BRANDING;
  }
};

/**
 * Salva o branding do profissional no Supabase
 * @param {string} professionalId - UUID do profissional
 * @param {Object} branding - {logo_url, primary_color, secondary_color, accent_color}
 */
export const saveProfessionalBranding = async (professionalId, branding) => {
  try {
    console.log('💾 [BRANDING DEBUG] Salvando branding:', { professionalId, branding });
    
    const { data, error } = await upsertProfessionalBranding(professionalId, branding);
    
    if (error) {
      console.error('❌ [BRANDING DEBUG] Erro ao salvar branding:', error);
      return { success: false, error };
    }
    
    console.log('✅ [BRANDING DEBUG] Branding salvo com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ [BRANDING DEBUG] Exceção ao salvar branding:', error);
    return { success: false, error };
  }
};

/**
 * DEPRECATED - Mantido para compatibilidade
 * @deprecated Use getActiveBranding() async
 */
export const getGlobalBranding = () => {
  console.warn('getGlobalBranding() deprecated - use getActiveBranding() async');
  return DEFAULT_BRANDING;
};

/**
 * DEPRECATED - Mantido para compatibilidade
 * @deprecated Use saveProfessionalBranding() async
 */
export const saveGlobalBranding = (branding) => {
  console.warn('saveGlobalBranding() deprecated - use saveProfessionalBranding() async');
  return true;
};

/**
 * DEPRECATED - Mantido para compatibilidade
 * @deprecated Use getActiveBranding() async
 */
export const getProfessionalBranding = (email) => {
  console.warn('getProfessionalBranding() deprecated - use getActiveBranding() async');
  return null;
};

/**
 * Aplica o branding ao DOM (CSS variables)
 */
export const applyBrandingToDOM = (branding) => {
  const root = document.documentElement;
  
  // Cores
  if (branding?.primary_color) {
    root.style.setProperty('--color-primary', branding.primary_color);
  }
  
  if (branding?.secondary_color) {
    root.style.setProperty('--color-secondary', branding.secondary_color);
  }
  
  if (branding?.accent_color) {
    root.style.setProperty('--color-accent', branding.accent_color);
  }

  // Tipografia
  if (branding?.font_family) {
    root.style.setProperty('--font-family', branding.font_family);
  }

  if (branding?.font_size_base) {
    root.style.setProperty('--font-size-base', branding.font_size_base);
  }

  if (branding?.font_size_heading) {
    root.style.setProperty('--font-size-heading', branding.font_size_heading);
  }

  if (branding?.font_size_subheading) {
    root.style.setProperty('--font-size-subheading', branding.font_size_subheading);
  }

  if (branding?.font_size_body) {
    root.style.setProperty('--font-size-body', branding.font_size_body);
  }

  if (branding?.font_size_small) {
    root.style.setProperty('--font-size-small', branding.font_size_small);
  }

  if (branding?.font_weight_normal) {
    root.style.setProperty('--font-weight-normal', branding.font_weight_normal);
  }

  if (branding?.font_weight_medium) {
    root.style.setProperty('--font-weight-medium', branding.font_weight_medium);
  }

  if (branding?.font_weight_bold) {
    root.style.setProperty('--font-weight-bold', branding.font_weight_bold);
  }

  // Componentes específicos
  if (branding?.badge_size) {
    root.style.setProperty('--badge-size', branding.badge_size);
  }

  if (branding?.button_size) {
    root.style.setProperty('--button-size', branding.button_size);
  }
};

/**
 * Reseta para branding padrão
 */
export const resetToDefault = () => {
  return DEFAULT_BRANDING;
};

/**
 * Converte imagem para base64
 */
export const imageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Retorna classes CSS para formato de logo
 */
export const getLogoShapeClass = (shape) => {
  const shapes = {
    rounded: 'rounded-xl',
    square: 'rounded-none',
    circle: 'rounded-full',
    rectangular: 'rounded-md'
  };
  return shapes[shape] || shapes.rounded;
};

/**
 * Retorna classes CSS para tamanho da logo
 */
export const getLogoSizeClass = (size, context = 'sidebar') => {
  if (context === 'sidebar') {
    const sizes = {
      small: 'w-12 h-12',
      medium: 'w-16 h-16',
      large: 'w-20 h-20'
    };
    return sizes[size] || sizes.medium;
  }
  
  if (context === 'login') {
    const sizes = {
      small: 'w-20 h-20',
      medium: 'w-32 h-32',
      large: 'w-40 h-40',
      xlarge: 'w-52 h-52'
    };
    return sizes[size] || sizes.large;
  }
  
  return 'w-16 h-16';
};
