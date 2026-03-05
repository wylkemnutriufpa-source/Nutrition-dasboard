/**
 * Validação de email robusta
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email é obrigatório' };
  }

  const trimmed = email.trim();
  
  // Verificações básicas
  if (trimmed.length === 0) {
    return { valid: false, error: 'Email não pode estar vazio' };
  }
  
  if (trimmed.includes(' ')) {
    return { valid: false, error: 'Email não pode conter espaços' };
  }
  
  // Deve ter exatamente 1 @
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) {
    return { valid: false, error: 'Email deve conter exatamente um @' };
  }
  
  // Não pode começar ou terminar com @ ou .
  if (trimmed.startsWith('@') || trimmed.startsWith('.') ||
      trimmed.endsWith('@') || trimmed.endsWith('.')) {
    return { valid: false, error: 'Email não pode começar/terminar com @ ou .' };
  }
  
  // Separar local e domínio
  const [local, domain] = trimmed.split('@');
  
  if (!local || !domain) {
    return { valid: false, error: 'Email inválido' };
  }
  
  // Domínio deve ter pelo menos um ponto
  if (!domain.includes('.')) {
    return { valid: false, error: 'Domínio deve conter pelo menos um ponto' };
  }
  
  // Domínio não pode ter .. consecutivos
  if (domain.includes('..')) {
    return { valid: false, error: 'Domínio não pode ter pontos consecutivos' };
  }
  
  // Parte após último ponto deve ter pelo menos 2 caracteres (TLD)
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  if (tld.length < 2) {
    return { valid: false, error: 'TLD deve ter pelo menos 2 caracteres' };
  }
  
  // Regex simples para verificar caracteres válidos
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Email contém caracteres inválidos' };
  }
  
  return { valid: true, email: trimmed };
};
