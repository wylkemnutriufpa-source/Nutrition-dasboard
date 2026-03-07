import { ClipboardList, FileText, Image, MessageSquare, Target, Scale, Inbox } from 'lucide-react';

/**
 * EmptyState — Estado vazio inteligente e reutilizável
 * 
 * Uso:
 *   <EmptyState type="checklist" />
 *   <EmptyState type="custom" icon={Star} title="Sem dados" description="..." />
 */

const presets = {
  checklist: {
    icon: ClipboardList,
    title: 'Nenhuma tarefa no checklist',
    description: 'As tarefas aparecerão aqui quando forem adicionadas pelo seu nutricionista ou geradas pelos protocolos ativos.',
    gradient: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
  },
  feedback: {
    icon: MessageSquare,
    title: 'Nenhum feedback enviado',
    description: 'Quando o paciente enviar feedback sobre a dieta ou consulta, ele aparecerá aqui.',
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
  },
  fotos: {
    icon: Image,
    title: 'Nenhuma foto de progresso',
    description: 'As fotos de acompanhamento enviadas pelo paciente aparecerão aqui para comparação visual.',
    gradient: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
  },
  protocolo: {
    icon: Target,
    title: 'Nenhum protocolo ativo',
    description: 'Ative um protocolo para o paciente na aba Projeto. As tarefas serão geradas automaticamente.',
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
  },
  projeto: {
    icon: Target,
    title: 'Projeto não configurado',
    description: 'Configure a jornada do paciente com metas, datas e protocolos para acompanhar o progresso de forma estruturada.',
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
  },
  peso: {
    icon: Scale,
    title: 'Sem registro de peso',
    description: 'O histórico de peso aparecerá aqui conforme o paciente atualizar suas medidas.',
    gradient: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
  },
  plano: {
    icon: FileText,
    title: 'Nenhum plano alimentar',
    description: 'Crie um plano alimentar para o paciente usando a ferramenta de IA ou o editor manual.',
    gradient: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
  },
  pacientes: {
    icon: Inbox,
    title: 'Nenhum paciente cadastrado',
    description: 'Comece cadastrando seu primeiro paciente usando o botão acima. O processo é rápido e simples.',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
  },
  timeline: {
    icon: ClipboardList,
    title: 'Sem atividade recente',
    description: 'Os eventos do paciente (peso, feedback, protocolos, etc.) aparecerão aqui em ordem cronológica.',
    gradient: 'from-gray-400 to-gray-500',
    bg: 'bg-gray-50',
  },
  generic: {
    icon: Inbox,
    title: 'Sem dados',
    description: 'Nenhuma informação disponível no momento.',
    gradient: 'from-gray-400 to-gray-500',
    bg: 'bg-gray-50',
  },
};

const EmptyState = ({
  type = 'generic',
  icon: CustomIcon,
  title: customTitle,
  description: customDescription,
  action,
  actionLabel,
  compact = false,
}) => {
  const preset = presets[type] || presets.generic;
  const Icon = CustomIcon || preset.icon;
  const title = customTitle || preset.title;
  const description = customDescription || preset.description;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100" data-testid={`empty-state-${type}`}>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.gradient} flex items-center justify-center text-white flex-shrink-0`}>
          <Icon size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-xs text-gray-400 truncate">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-gray-200 ${preset.bg}`} data-testid={`empty-state-${type}`}>
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${preset.gradient} flex items-center justify-center text-white shadow-lg mb-4`}>
        <Icon size={24} />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action}
          className="mt-4 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          {actionLabel || 'Começar'}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
