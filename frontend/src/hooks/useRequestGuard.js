/**
 * useRequestGuard Hook
 * 
 * Previne múltiplos requests simultâneos (double-submit, clique duplo, etc)
 * 
 * Uso:
 * const { isProcessing, executeGuarded } = useRequestGuard();
 * 
 * await executeGuarded(async () => {
 *   await apiCall();
 * });
 * 
 * <Button disabled={isProcessing}>Salvar</Button>
 */

import { useState, useCallback, useRef } from 'react';

export function useRequestGuard() {
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  const executeGuarded = useCallback(async (asyncFn) => {
    // Previne múltiplas execuções simultâneas
    if (processingRef.current) {
      console.warn('⚠️ Request já em andamento - ignorando clique duplo');
      return { prevented: true };
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const result = await asyncFn();
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Erro no request guardado:', error);
      return { success: false, error };
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    processingRef.current = false;
    setIsProcessing(false);
  }, []);

  return {
    isProcessing,
    executeGuarded,
    reset,
  };
}

/**
 * useDebounce Hook adicional
 * Previne cliques rápidos consecutivos
 */
export function useDebounce(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  return debouncedCallback;
}
