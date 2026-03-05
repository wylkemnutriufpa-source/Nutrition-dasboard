/**
 * errorLogger.js
 * Captura global de erros JS e envia para app_error_logs no Supabase
 * Inicializar UMA VEZ no App.js
 */
import { supabase } from '@/lib/supabase';

let _initialized = false;
let _errorBuffer = [];
let _flushTimer = null;
const FLUSH_INTERVAL = 5000;
const MAX_BUFFER = 20;

const getContext = () => {
  try {
    const user = JSON.parse(localStorage.getItem('fitjourney_user_type') || 'null');
    return {
      route: window.location.pathname,
      user_agent: navigator.userAgent?.substring(0, 200),
      role: user || 'unknown'
    };
  } catch { return { route: window.location.pathname, user_agent: '', role: 'unknown' }; }
};

const pushError = (message, stack, severity = 'error') => {
  const ctx = getContext();
  _errorBuffer.push({
    message: String(message).substring(0, 500),
    stack: String(stack || '').substring(0, 2000),
    severity,
    route: ctx.route,
    user_agent: ctx.user_agent,
    role: ctx.role
  });
  if (_errorBuffer.length >= MAX_BUFFER) flushErrors();
};

const flushErrors = async () => {
  if (_errorBuffer.length === 0) return;
  const batch = _errorBuffer.splice(0, MAX_BUFFER);
  try {
    await supabase.from('app_error_logs').insert(batch);
  } catch { /* silent */ }
};

export const initErrorLogger = () => {
  if (_initialized) return;
  _initialized = true;

  window.addEventListener('error', (e) => {
    pushError(e.message, e.error?.stack, 'error');
  });

  window.addEventListener('unhandledrejection', (e) => {
    pushError(e.reason?.message || String(e.reason), e.reason?.stack, 'error');
  });

  const origWarn = console.warn;
  let warnCount = 0;
  console.warn = (...args) => {
    origWarn.apply(console, args);
    warnCount++;
    if (warnCount <= 50) pushError(args.join(' '), '', 'warn');
  };

  _flushTimer = setInterval(flushErrors, FLUSH_INTERVAL);
  window.addEventListener('beforeunload', flushErrors);
};

export const getErrorBufferCount = () => _errorBuffer.length;
