import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowRight, CheckCircle2, Bell, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Componente de Alertas de Atenção Premium
 */
const AttentionAlert = ({ alerts = [], onAction }) => {
  const navigate = useNavigate();

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold mb-1">Tudo em Ordem! ✨</h3>
          <p className="text-green-100 text-sm">
            Nenhum paciente precisa de atenção urgente no momento.
          </p>
        </div>
      </Card>
    );
  }

  const handleAction = (action, patientId) => {
    if (action.type === 'link') {
      navigate(action.link);
    } else if (action.type === 'action' && onAction) {
      onAction(action.action, patientId);
    }
  };

  // Ordenar por prioridade (P0 > P1 > P2 > P3)
  const sortedAlerts = [...alerts].sort((a, b) => (a.priority || 99) - (b.priority || 99));

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 0:
        return {
          border: 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50',
          badge: 'bg-red-500',
          ring: 'ring-2 ring-red-200'
        };
      case 1:
        return {
          border: 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50',
          badge: 'bg-orange-500',
          ring: ''
        };
      case 2:
        return {
          border: 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50',
          badge: 'bg-yellow-500',
          ring: ''
        };
      default:
        return {
          border: 'border-gray-200 bg-white',
          badge: 'bg-gray-500',
          ring: ''
        };
    }
  };

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-2 rounded-xl">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">Atenção Hoje</span>
              <p className="text-xs text-gray-500 font-normal">Pacientes que precisam de você</p>
            </div>
          </div>
          <Badge className="bg-orange-500 text-white border-0">
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {sortedAlerts.slice(0, 5).map((alert) => {
          const style = getPriorityStyle(alert.priority);
          
          return (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border-2 ${style.border} ${style.ring} hover:shadow-md transition-all group`}
            >
              <div className="flex items-start gap-3">
                {/* Ícone com animação para urgentes */}
                <div className={`relative ${alert.iconBg} p-2.5 rounded-xl flex-shrink-0`}>
                  {alert.priority === 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                  )}
                  <span className="text-2xl">{alert.icon}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900">{alert.title}</h4>
                    {alert.priority <= 1 && (
                      <Badge className={`${style.badge} text-white text-[10px] px-1.5 py-0`}>
                        P{alert.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {alert.message}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {alert.actions.map((action, idx) => (
                      <Button
                        key={idx}
                        onClick={() => handleAction(action, alert.patientId)}
                        size="sm"
                        variant={idx === 0 ? 'default' : 'outline'}
                        className={idx === 0 
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm' 
                          : 'hover:bg-gray-100'
                        }
                      >
                        {action.label}
                        {action.type === 'link' && <ArrowRight className="ml-1 h-3 w-3" />}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {alerts.length > 5 && (
          <div className="text-center pt-2">
            <Button variant="ghost" className="text-teal-600 hover:text-teal-700">
              Ver todos os {alerts.length} alertas
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttentionAlert;
