import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Shield, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Ranking de Risco Premium - Top 10 pacientes
 */
const RiskRankingList = ({ patients = [], onViewAll }) => {
  const navigate = useNavigate();

  const getRiskGradient = (score) => {
    if (score >= 70) return 'from-red-500 to-rose-600';
    if (score >= 40) return 'from-amber-500 to-orange-600';
    return 'from-green-500 to-emerald-600';
  };

  const getRiskBg = (score) => {
    if (score >= 70) return 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 hover:border-red-300';
    if (score >= 40) return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300';
    return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300';
  };

  const getRiskLabel = (level) => {
    if (!level) return 'N/A';
    return level.label || 'N/A';
  };

  const getTrendIcon = (trend) => {
    if (!trend) return <Minus className="h-3 w-3 text-gray-400" />;
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-red-500" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  if (patients.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold mb-1">Todos Saudáveis! 🎉</h3>
          <p className="text-green-100 text-sm">
            Nenhum paciente em risco elevado no momento.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 via-red-50 to-rose-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">Ranking de Risco</span>
              <p className="text-xs text-gray-500 font-normal">Pacientes que precisam de atenção</p>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
            Top {patients.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2 max-h-[450px] overflow-y-auto">
        {patients.map((patient, index) => {
          const riskScore = patient.dashboardRisk?.score || 0;
          const hasClinic = patient.dashboardRisk?.hasClinicData;
          const trend = patient.dashboardRisk?.trend;

          return (
            <div
              key={patient.id}
              onClick={() => navigate(`/professional/patient/${patient.id}`)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 ${getRiskBg(riskScore)} hover:shadow-md transition-all cursor-pointer group`}
            >
              {/* Posição com destaque para top 3 */}
              <div className={`
                w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm
                ${index < 3 
                  ? `bg-gradient-to-br ${getRiskGradient(riskScore)} text-white` 
                  : 'bg-white text-gray-700 border border-gray-200'
                }
              `}>
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && (index + 1)}
              </div>

              {/* Info do paciente */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate text-sm flex items-center gap-1.5">
                  {patient.name}
                  {getTrendIcon(trend)}
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {patient.email}
                  {hasClinic && (
                    <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 border-blue-200 text-blue-600">
                      Clínico
                    </Badge>
                  )}
                </p>
              </div>

              {/* Score circular */}
              <div className="flex items-center gap-2">
                <div className={`
                  w-12 h-12 rounded-full flex flex-col items-center justify-center
                  bg-gradient-to-br ${getRiskGradient(riskScore)} text-white shadow-lg
                `}>
                  <span className="text-lg font-bold leading-none">{riskScore}</span>
                  <span className="text-[8px] uppercase opacity-80">risco</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          );
        })}

        {onViewAll && (
          <Button
            onClick={onViewAll}
            variant="outline"
            className="w-full mt-4 h-11 border-2 border-dashed hover:border-solid hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all"
          >
            <Users className="mr-2 h-4 w-4" />
            Ver Todos os Pacientes
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskRankingList;
