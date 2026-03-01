import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Utensils, AlertCircle } from 'lucide-react';
import { listProfessionalRecentMealAnalyses } from '@/lib/supabase';

/**
 * Seção de Análises de Refeições Recentes no Dashboard do Profissional
 */
const MealAnalysisSection = ({ professionalId }) => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!professionalId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await listProfessionalRecentMealAnalyses(professionalId, 5);
      setAnalyses(data || []);
      setLoading(false);
    };
    load();
  }, [professionalId]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-teal-500" />
            Análises de Pratos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-teal-500" />
            Análises de Pratos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <Camera className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nenhuma análise de prato ainda</p>
          <p className="text-xs text-gray-400">Seus pacientes podem enviar fotos das refeições</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-teal-500" />
            Análises de Pratos Recentes
          </div>
          <Badge variant="outline" className="text-xs">{analyses.length} recentes</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {analyses.map((analysis) => {
          const foods = (analysis.detected_foods || []).slice(0, 3).map(f => f.name).join(', ');
          const patientName = analysis.patient?.name || 'Paciente';
          const qualityScore = analysis.quality_score || 0;

          return (
            <div
              key={analysis.id}
              onClick={() => navigate(`/professional/patient/${analysis.patient_id}`)}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer group"
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${getScoreColor(qualityScore)}`}>
                {qualityScore}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{patientName}</p>
                <p className="text-xs text-gray-500 truncate">
                  <Utensils className="inline h-3 w-3 mr-1" />
                  {foods || 'Sem detalhes'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">{formatDate(analysis.created_at)}</p>
                {analysis.flags?.low_veggies && (
                  <AlertCircle className="h-3 w-3 text-yellow-500 inline" />
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default MealAnalysisSection;
