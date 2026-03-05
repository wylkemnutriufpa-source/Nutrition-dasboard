import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, ClipboardList, Copy, BarChart3, Sparkles } from 'lucide-react';

/**
 * Grid de Ações Rápidas Premium
 */
const QuickActionsGrid = ({ actions = [], onAction }) => {
  const defaultActions = [
    {
      id: 'create_plan',
      icon: Plus,
      label: 'Criar Plano',
      gradient: 'from-teal-500 to-emerald-600',
      action: 'createPlan',
      emoji: '📋'
    },
    {
      id: 'send_feedback',
      icon: MessageSquare,
      label: 'Enviar Feedback',
      gradient: 'from-blue-500 to-indigo-600',
      action: 'sendFeedback',
      emoji: '💬'
    },
    {
      id: 'create_checklist',
      icon: ClipboardList,
      label: 'Criar Checklist',
      gradient: 'from-purple-500 to-pink-600',
      action: 'createChecklist',
      emoji: '✅'
    },
    {
      id: 'duplicate_plan',
      icon: Copy,
      label: 'Duplicar Plano',
      gradient: 'from-indigo-500 to-purple-600',
      action: 'duplicatePlan',
      emoji: '📑'
    },
    {
      id: 'reports',
      icon: BarChart3,
      label: 'Ver Relatórios',
      gradient: 'from-orange-500 to-red-600',
      action: 'viewReports',
      emoji: '📊'
    }
  ];

  const actionsToRender = actions.length > 0 ? actions : defaultActions;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {actionsToRender.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction && onAction(action.action)}
            className={`
              relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} 
              text-white h-auto py-5 px-4 flex flex-col items-center gap-2 
              shadow-lg hover:shadow-xl transition-all duration-300 
              hover:scale-[1.03] active:scale-[0.98] group
            `}
          >
            {/* Efeito de brilho */}
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
            
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-center leading-tight">
                {action.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActionsGrid;
