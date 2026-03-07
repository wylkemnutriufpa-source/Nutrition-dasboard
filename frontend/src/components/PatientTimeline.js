import { useState, useEffect } from 'react';
import { CheckCircle2, FileText, Scale, MessageSquare, Image, Target, Bell, UserPlus, Loader2, Clock, Calendar, ListChecks } from 'lucide-react';
import { authenticatedGet } from '@/lib/apiClient';
import EmptyState from '@/components/EmptyState';

/**
 * PatientTimeline — Timeline de eventos recentes do paciente
 * Busca dados do backend (agrega múltiplas tabelas)
 */

const iconMap = {
  check: CheckCircle2,
  file: FileText,
  scale: Scale,
  message: MessageSquare,
  image: Image,
  target: Target,
  bell: Bell,
  user: UserPlus,
  // novos: eventos de protocolo
  calendar: Calendar,
  'list-checks': ListChecks,
};

const colorMap = {
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  blue: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  indigo: { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  violet: { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' },
  teal: { dot: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700' },
  amber: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  gray: { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600' },
  green: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  // novos: eventos de protocolo
  orange: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  purple: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PatientTimeline = ({ patientId, limit = 15 }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!patientId) return;
    loadTimeline();
  }, [patientId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await authenticatedGet(`/api/timeline/patients/${patientId}/events?limit=${limit}`);
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Erro ao carregar timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (events.length === 0) {
    return <EmptyState type="timeline" compact />;
  }

  return (
    <div className="space-y-1" data-testid="patient-timeline">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          Atividade Recente
        </h3>
        <span className="text-[10px] text-gray-400 font-medium">{total} eventos</span>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />

        {events.map((event, i) => {
          const Icon = iconMap[event.icon] || Bell;
          const colors = colorMap[event.color] || colorMap.gray;

          return (
            <div key={i} className="relative flex items-start gap-3 py-2 group" data-testid={`timeline-event-${event.type}`}>
              {/* Dot */}
              <div className={`relative z-10 w-[22px] h-[22px] rounded-full ${colors.dot} flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white`}>
                <Icon size={10} className="text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 -mt-0.5">
                <p className="text-sm text-gray-800 leading-tight truncate group-hover:text-gray-900 transition-colors">
                  {event.title}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5" title={formatDate(event.timestamp)}>
                  {formatTimeAgo(event.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatientTimeline;
