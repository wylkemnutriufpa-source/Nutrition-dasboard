import React from 'react';
import { Badge } from '@/components/ui/badge';

const PremiumPageHeader = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  badge,
  gradient = 'from-slate-900 via-indigo-900 to-purple-900',
  stats = [],
  children 
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-2xl mb-6" data-testid={`premium-header-${title?.toLowerCase().replace(/\s/g,'-')}`}>
      <div className={`bg-gradient-to-br ${gradient} p-6 md:p-8 text-white relative`}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/3 rounded-full" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 mb-4">
              {Icon && (
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/10">
                  <Icon className="h-7 w-7 text-white" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight">{title}</h1>
                  {badge && (
                    <Badge className="bg-white/15 text-white border-0 text-[10px] font-bold backdrop-blur-sm">{badge}</Badge>
                  )}
                </div>
                {subtitle && <p className="text-white/70 text-sm mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {children}
          </div>

          {stats.length > 0 && (
            <div className={`grid grid-cols-${Math.min(stats.length, 4)} gap-4 mt-4`}>
              {stats.map((stat, i) => {
                const StatIcon = stat.icon;
                return (
                  <div key={i} className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/5">
                    {StatIcon && (
                      <div className="w-10 h-10 mx-auto mb-1.5 rounded-xl bg-white/10 flex items-center justify-center">
                        <StatIcon className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-xs text-white/60 font-medium">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumPageHeader;
