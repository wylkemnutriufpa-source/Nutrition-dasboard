import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';

/**
 * Gráfico de Engajamento Premium
 */
const SimpleEngagementChart = ({ data = { labels: [], values: [] }, title = 'Adesão ao Checklist (7 dias)' }) => {
  const { labels, values } = data;

  if (labels.length === 0 || values.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Dados insuficientes</p>
          <p className="text-sm text-gray-400">Aguardando mais atividade dos pacientes</p>
        </CardContent>
      </Card>
    );
  }

  const width = 100;
  const height = 60;
  const padding = 5;
  const maxValue = Math.max(...values, 100);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const avgValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const points = values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  const getAvgColor = (avg) => {
    if (avg >= 70) return { gradient: 'from-green-500 to-emerald-600', text: 'text-green-600', bg: 'bg-green-100' };
    if (avg >= 40) return { gradient: 'from-yellow-500 to-amber-600', text: 'text-amber-600', bg: 'bg-amber-100' };
    return { gradient: 'from-red-500 to-rose-600', text: 'text-red-600', bg: 'bg-red-100' };
  };

  const colors = getAvgColor(avgValue);

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900">{title}</span>
              <p className="text-xs text-gray-500 font-normal">Engajamento dos pacientes</p>
            </div>
          </div>
          <Badge className={`${colors.bg} ${colors.text} border-0`}>
            {avgValue}% média
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36" style={{ maxHeight: '144px' }}>
            <line x1={padding} y1={height * 0.25} x2={width - padding} y2={height * 0.25} stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
            <line x1={padding} y1={height * 0.5} x2={width - padding} y2={height * 0.5} stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
            <line x1={padding} y1={height * 0.75} x2={width - padding} y2={height * 0.75} stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
            <polygon points={areaPoints} fill="url(#chartGradient)" opacity="0.4" />
            <polyline points={points} fill="none" stroke="url(#lineGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {values.map((value, index) => {
              const x = padding + (index / (values.length - 1)) * (width - 2 * padding);
              const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
              const isLast = index === values.length - 1;
              return (
                <g key={index}>
                  {isLast && <circle cx={x} cy={y} r="3.5" fill="#6366f1" opacity="0.3" />}
                  <circle cx={x} cy={y} r={isLast ? "2" : "1.5"} fill={isLast ? "#4f46e5" : "#6366f1"} stroke="white" strokeWidth="0.5" />
                </g>
              );
            })}
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex justify-between px-1 -mt-1">
          {labels.map((label, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400 font-medium">{label}</span>
              <span className={`text-xs font-bold ${values[index] >= 70 ? 'text-green-600' : values[index] >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                {values[index]}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Melhor</p>
            <p className="text-lg font-bold text-green-600">{Math.max(...values)}%</p>
          </div>
          <div className={`text-center flex-1 py-2 rounded-xl ${colors.bg}`}>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Média</p>
            <p className={`text-2xl font-bold ${colors.text}`}>{avgValue}%</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pior</p>
            <p className="text-lg font-bold text-red-500">{Math.min(...values)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleEngagementChart;
