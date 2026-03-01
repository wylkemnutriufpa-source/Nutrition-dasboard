import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Ranking de Risco - Top 10 pacientes ordenados por score de risco
 */
const RiskRankingList = ({ patients = [], onViewAll }) => {
  const navigate = useNavigate();

  const getRiskColor = (score) => {
    if (score >= 70) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800 border-red-200' };
    if (score >= 40) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800 border-green-200' };
  };

  const getRiskLabel = (level) => {
    if (!level) return 'N/A';
    return level.label || 'N/A';
  };

  if (patients.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-3 text-green-400 opacity-60" />
          <h3 className="text-lg font-semibold text-green-800 mb-1">Sem Pacientes em Risco</h3>
          <p className="text-sm text-gray-500">Todos os pacientes estão com score adequado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Ranking de Risco
          </div>
          <span className="text-sm font-normal text-gray-500">Top {patients.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
        {patients.map((patient, index) => {
          const colors = getRiskColor(patient.dashboardRisk?.score || 0);
          const riskScore = patient.dashboardRisk?.score || 0;
          const hasClinic = patient.dashboardRisk?.hasClinicData;

          return (
            <div
              key={patient.id}
              onClick={() => navigate(`/professional/patient/${patient.id}`)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 ${colors.border} ${colors.bg} hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group`}
            >
              {/* Posição */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${riskScore >= 70 ? 'bg-red-200 text-red-800' : riskScore >= 40 ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>
                {index + 1}
              </div>

              {/* Info do paciente */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate text-sm">
                  {patient.name}
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {patient.email}
                  {hasClinic && <span className="ml-1 text-blue-500">• Dados clínicos</span>}
                </p>
              </div>

              {/* Score + Badge */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className={`text-xl font-bold ${colors.text}`}>
                    {riskScore}
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">risco</div>
                </div>
                <Badge className={`${colors.badge} border text-xs px-2 py-0.5`}>
                  {getRiskLabel(patient.dashboardRisk?.level)}
                </Badge>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          );
        })}

        {onViewAll && (
          <Button
            onClick={onViewAll}
            variant="outline"
            className="w-full mt-3"
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
