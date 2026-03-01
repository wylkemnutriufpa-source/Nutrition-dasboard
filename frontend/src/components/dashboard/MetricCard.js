import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Card de Métrica Reutilizável
 * @param {Object} props
 * @param {string} props.title - Título da métrica
 * @param {string|number} props.value - Valor principal
 * @param {string} props.subtitle - Descrição/contexto
 * @param {React.Component} props.icon - Ícone do lucide-react
 * @param {string} props.iconColor - Cor do ícone (ex: text-blue-600)
 * @param {string} props.iconBg - Fundo do ícone (ex: bg-blue-100)
 * @param {Object} props.trend - { value, direction } opcional
 */
const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-gray-600',
  iconBg = 'bg-gray-100',
  trend = null,
  urgent = false
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend.direction === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.direction === 'up') return 'text-green-600';
    if (trend.direction === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-gray-200 ${urgent ? 'border-red-300 bg-red-50/30 ring-1 ring-red-200' : ''}`}>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">{title}</p>
            <h3 className={`text-2xl md:text-3xl font-bold mb-1 ${urgent ? 'text-red-700' : 'text-gray-900'}`}>{value}</h3>
            <p className="text-[10px] md:text-xs text-gray-500">{subtitle}</p>
          </div>
          <div className="relative">
            {urgent && (
              <div className={`absolute inset-0 ${iconBg} rounded-lg animate-pulse-ring opacity-40`} />
            )}
            <div className={`${iconBg} p-2.5 md:p-3 rounded-lg relative`}>
              <Icon className={`h-5 w-5 md:h-6 md:w-6 ${iconColor}`} />
            </div>
          </div>
        </div>
        
        {trend && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>
              {trend.value}
            </span>
            <span className="text-xs text-gray-500">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
