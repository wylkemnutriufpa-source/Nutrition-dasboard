/**
 * safeFetch.js
 * Wrapper único de requests HTTP para o FitJourney
 *
 * REGRAS:
 * 1. Sempre usa response.clone() antes de ler o body
 * 2. Nunca lê json + text no mesmo response sem clone
 * 3. Padroniza mensagens de erro: { status, endpoint, message, body, code }
 * 4. Único ponto de saída para fetch externo
 */

/**
 * Faz uma request HTTP segura e padronizada
 * @param {string} url - URL da request
 * @param {RequestInit} options - Opções do fetch (method, headers, body...)
 * @returns {Promise<{ data: any, error: SafeFetchError|null, ok: boolean }>}
 *
 * @typedef {Object} SafeFetchError
 * @property {number} status - HTTP status (0 se erro de rede)
 * @property {string} endpoint - URL chamada
 * @property {string} message - Mensagem legível
 * @property {string|null} body - Body bruto da resposta de erro
 * @property {string} code - Código de erro (HTTP status ou 'NETWORK_ERROR')
 */
export async function safeFetch(url, options = {}) {
  const endpoint = url;

  try {
    const response = await fetch(url, options);

    // SEMPRE clonar antes de qualquer leitura
    const cloned = response.clone();

    if (!response.ok) {
      // Ler body do CLONE (nunca do original após clone)
      let errorBody = null;
      try {
        errorBody = await cloned.text();
      } catch (_) {
        // Se não conseguir ler, segue sem body
      }

      // Tentar parsear JSON do body de erro
      let parsed = null;
      try {
        if (errorBody) parsed = JSON.parse(errorBody);
      } catch (_) {
        // Body não é JSON, tudo bem
      }

      return {
        data: null,
        error: {
          status: response.status,
          endpoint,
          message: parsed?.message || parsed?.error || parsed?.hint || `HTTP ${response.status}`,
          body: errorBody,
          code: parsed?.code || String(response.status),
          details: parsed?.details || null
        },
        ok: false
      };
    }

    // Sucesso - ler JSON do original (clone não foi usado)
    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      // Se response vazia (204 etc), retorna null
      data = null;
    }

    return { data, error: null, ok: true };

  } catch (err) {
    // Erro de rede / timeout / CORS
    return {
      data: null,
      error: {
        status: 0,
        endpoint,
        message: err?.message || 'Erro de rede ou conexão recusada',
        body: null,
        code: 'NETWORK_ERROR'
      },
      ok: false
    };
  }
}

/**
 * Atalho para POST JSON via safeFetch
 * @param {string} url
 * @param {object} body
 * @param {object} extraHeaders
 */
export async function safePost(url, body, extraHeaders = {}) {
  return safeFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  });
}

/**
 * Atalho para POST com auth bearer
 */
export async function safePostAuth(url, body, token) {
  return safePost(url, body, {
    'Authorization': `Bearer ${token}`
  });
}

export default safeFetch;
