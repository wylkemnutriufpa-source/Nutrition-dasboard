import { useState, useEffect, useRef } from 'react';
import { Check, Loader2, AlertCircle, CloudOff } from 'lucide-react';

/**
 * SaveStatusIndicator — Indicador visual de estado de salvamento
 * 
 * Uso:
 *   <SaveStatusIndicator status="saved" />
 *   <SaveStatusIndicator status="saving" />
 *   <SaveStatusIndicator status="unsaved" />
 *   <SaveStatusIndicator status="error" />
 * 
 * Props:
 *   status: 'idle' | 'saving' | 'saved' | 'unsaved' | 'error'
 *   className: string (opcional)
 *   compact: boolean (apenas ícone, sem texto)
 */
const configs = {
  idle: { icon: null, text: '', bg: '', border: '', textColor: '' },
  saving: {
    icon: Loader2,
    text: 'Salvando...',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    textColor: 'text-blue-700',
    iconClass: 'animate-spin text-blue-500',
  },
  saved: {
    icon: Check,
    text: 'Salvo',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    textColor: 'text-emerald-700',
    iconClass: 'text-emerald-500',
  },
  unsaved: {
    icon: CloudOff,
    text: 'Alterações não salvas',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    textColor: 'text-amber-700',
    iconClass: 'text-amber-500',
  },
  error: {
    icon: AlertCircle,
    text: 'Erro ao salvar',
    bg: 'bg-red-50',
    border: 'border-red-200',
    textColor: 'text-red-700',
    iconClass: 'text-red-500',
  },
};

export const SaveStatusIndicator = ({ status = 'idle', className = '', compact = false }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (status === 'idle') {
      setVisible(false);
      return;
    }
    setVisible(true);

    // Auto-hide "saved" after 3s
    if (status === 'saved') {
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [status]);

  if (!visible || status === 'idle') return null;

  const cfg = configs[status];
  if (!cfg?.icon) return null;
  const Icon = cfg.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center ${className}`} title={cfg.text}>
        <Icon size={14} className={cfg.iconClass} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.border} ${cfg.textColor} transition-all duration-300 ${className}`}
      data-testid="save-status-indicator"
    >
      <Icon size={12} className={cfg.iconClass} />
      {cfg.text}
    </span>
  );
};

/**
 * Hook: useSaveStatus
 * Gerencia o ciclo de vida do status de salvamento.
 * 
 * Uso:
 *   const { status, markSaving, markSaved, markError, markUnsaved } = useSaveStatus();
 */
export const useSaveStatus = () => {
  const [status, setStatus] = useState('idle');

  return {
    status,
    markSaving: () => setStatus('saving'),
    markSaved: () => setStatus('saved'),
    markError: () => setStatus('error'),
    markUnsaved: () => setStatus('unsaved'),
    reset: () => setStatus('idle'),
  };
};
