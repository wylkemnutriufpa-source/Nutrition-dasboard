/**
 * Helper para ler Response de forma segura (com clone)
 * Resolve o problema de "body stream already read"
 */
export async function safeReadResponse(response) {
  if (!response) {
    return { raw: null, json: null, status: null };
  }
  
  try {
    // SEMPRE usar clone() para não consumir o body original
    const cloned = response.clone();
    const raw = await cloned.text();
    
    let json = null;
    try {
      json = JSON.parse(raw);
    } catch (parseError) {
      // Body não é JSON, tudo bem
    }
    
    return {
      raw,
      json,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    };
  } catch (error) {
    console.error('❌ Erro ao ler response:', error);
    return {
      raw: null,
      json: null,
      status: response.status,
      error: error.message
    };
  }
}

/**
 * Extrai informações seguras de um erro do Supabase
 * SEM tentar ler propriedades que causam "body stream already read"
 */
export function extractSafeSupabaseError(error) {
  if (!error) {
    return { message: 'Erro desconhecido', code: 'UNKNOWN' };
  }
  
  // Se for string, retornar direto
  if (typeof error === 'string') {
    return { message: error, code: 'STRING_ERROR' };
  }
  
  // Tentar acessar propriedades de forma segura
  const code = error?.code || error?.status || 'UNKNOWN';
  const message = error?.message || error?.msg || 'Erro desconhecido';
  const details = error?.details || error?.detail || '';
  const hint = error?.hint || '';
  
  return {
    code: String(code),
    message: String(message),
    details: String(details),
    hint: String(hint)
  };
}
