/**
 * API Client Helper with Automatic JWT Authentication
 * 
 * Automaticamente adiciona o token de acesso do Supabase em todas as requisições.
 * Substitui o uso de X-User-Id por Authorization Bearer token.
 */

import { supabase } from './supabase';

/**
 * Obtém o token de acesso atual do Supabase
 * @returns {Promise<string|null>} Token de acesso ou null se não autenticado
 */
export async function getAccessToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('❌ Erro ao obter access token:', error);
    return null;
  }
}

/**
 * Helper para fazer requisições autenticadas à API
 * 
 * @param {string} endpoint - Endpoint da API (ex: '/api/analyze-meal')
 * @param {Object} options - Opções do fetch
 * @returns {Promise<Response>}
 */
export async function authenticatedFetch(endpoint, options = {}) {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': `Bearer ${token}`, // 🔒 JWT Authentication
  };
  
  const url = endpoint.startsWith('http') ? endpoint : `${process.env.REACT_APP_BACKEND_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Tratamento de erros de autenticação
  if (response.status === 401) {
    console.warn('🚫 Token expirado ou inválido - redirecionando para login');
    // Limpar sessão e redirecionar
    await supabase.auth.signOut();
    window.location.href = '/';
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }
  
  // Tratamento de erros de permissão
  if (response.status === 403) {
    const error = await response.json().catch(() => ({ detail: 'Acesso negado' }));
    throw new Error(error.detail || 'Você não tem permissão para acessar este recurso.');
  }
  
  return response;
}

/**
 * Helper para requisições POST autenticadas
 */
export async function authenticatedPost(endpoint, data = {}) {
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || 'Erro na requisição');
  }
  
  return response.json();
}

/**
 * Helper para requisições GET autenticadas
 */
export async function authenticatedGet(endpoint) {
  const response = await authenticatedFetch(endpoint, {
    method: 'GET',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || 'Erro na requisição');
  }
  
  return response.json();
}

/**
 * Helper para requisições PATCH autenticadas
 */
export async function authenticatedPatch(endpoint, data = {}) {
  const response = await authenticatedFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || 'Erro na requisição');
  }
  
  return response.json();
}

/**
 * Helper para requisições DELETE autenticadas
 */
export async function authenticatedDelete(endpoint) {
  const response = await authenticatedFetch(endpoint, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || 'Erro na requisição');
  }
  
  return response.json();
}
