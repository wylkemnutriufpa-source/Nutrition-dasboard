import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Card de Métrica Premium
 */
const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-gray-600',
  iconBg = 'bg-gray-100',
  gradient = null,
  trend = null,
  urgent = false
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp className="h-3.5 w-3.5" />;
    if (trend.direction === 'down') return <TrendingDown className="h-3.5 w-3.5" />;
    return <Minus className="h-3.5 w-3.5" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    if (trend.direction === 'up') return 'text-green-500';
    if (trend.direction === 'down') return 'text-red-500';
    return 'text-gray-400';
  };

  // Se tem gradiente, usa estilo premium
  if (gradient) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 md:p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group`}>
        {/* Elementos decorativos */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/80 mb-1">{title}</p>
              <h3 className="text-2xl md:text-3xl font-bold">{value}</h3>
              <p className="text-[10px] text-white/70 mt-1">{subtitle}</p>
            </div>
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
          
          {trend && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/20">
              {getTrendIcon()}
              <span className="text-xs font-medium text-white/90">{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Estilo padrão com melhorias
  return (
    <Card className={`
      relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-0 shadow-md
      ${urgent ? 'bg-gradient-to-br from-red-50 to-orange-50 ring-2 ring-red-200' : 'bg-white'}
    `}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
            <h3 className={`text-2xl md:text-3xl font-bold ${urgent ? 'text-red-700' : 'text-gray-900'}`}>
              {value}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className="relative">
            {urgent && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
            <div className={`${iconBg} p-3 rounded-xl shadow-sm`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
          </div>
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-xs font-medium">{trend.value}</span>
            <span className="text-xs text-gray-400">vs anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
