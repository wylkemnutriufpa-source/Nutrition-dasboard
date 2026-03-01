import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { User, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { listProfessionalRecentBodyAnalyses } from '@/lib/supabase';

/**
 * Seção de Análises Corporais Recentes no Dashboard do Profissional
 */
const BodyAnalysisSection = ({ professionalId }) => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!professionalId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await listProfessionalRecentBodyAnalyses(professionalId, 5);
      setAnalyses(data || []);
      setLoading(false);
    };
    load();
  }, [professionalId]);

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getProgressIcon = (comparison) => {
    if (!comparison) return null;
    if (comparison.overall_progress === 'positive') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (comparison.overall_progress === 'negative') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  if (loading) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-purple-500" />
            Análises Corporais
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
            <User className="h-5 w-5 text-purple-500" />
            Análises Corporais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nenhuma análise corporal ainda</p>
          <p className="text-xs text-gray-400">Seus pacientes podem enviar fotos de progresso</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-500" />
            Análises Corporais
          </div>
          <Badge variant="outline" className="text-xs">{analyses.length} recentes</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {analyses.map((analysis) => {
          const patientName = analysis.patient?.name || 'Paciente';
          const overallScore = analysis.overall_score || 0;
          const bodyFat = analysis.body_fat_estimate;
          const muscledef = analysis.muscle_definition;

          return (
            <div
              key={analysis.id}
              onClick={() => navigate(`/professional/patient/${analysis.patient_id}`)}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer group"
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{patientName}</p>
                <p className="text-xs text-gray-500">
                  BF: {bodyFat}% • Def: {muscledef}/10
                </p>
              </div>
              <div className="text-right flex items-center gap-2">
                {getProgressIcon(analysis.comparison_result)}
                <p className="text-[10px] text-gray-400">{formatDate(analysis.created_at)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default BodyAnalysisSection;
