import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { User, ChevronRight, TrendingUp, TrendingDown, Minus, Activity, Sparkles } from 'lucide-react';
import { listProfessionalRecentBodyAnalyses } from '@/lib/supabase';

/**
 * Seção de Análises Corporais Premium no Dashboard
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

  const getScoreGradient = (score) => {
    if (score >= 70) return 'from-green-500 to-emerald-600';
    if (score >= 40) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getProgressIcon = (comparison) => {
    if (!comparison) return <Minus className="h-4 w-4 text-gray-400" />;
    if (comparison.overall_progress === 'positive') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (comparison.overall_progress === 'negative') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl">
              <User className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold">Análises Corporais</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold mb-1">Análise Corporal 💪</h3>
          <p className="text-purple-100 text-sm">
            Seus pacientes podem enviar fotos corporais para análise de composição
          </p>
        </div>
      </Card>
    );
  }

  // Contar progressos positivos
  const positiveCount = analyses.filter(a => a.comparison_result?.overall_progress === 'positive').length;

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900">Análises Corporais</span>
              <p className="text-xs text-gray-500 font-normal">Composição e evolução</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {positiveCount > 0 && (
              <Badge className="bg-green-500 text-white border-0 text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                {positiveCount} evoluindo
              </Badge>
            )}
            <Badge className="bg-purple-500 text-white border-0">{analyses.length}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {analyses.map((analysis) => {
          const patientName = analysis.patient?.name || 'Paciente';
          const overallScore = analysis.overall_score || 0;
          const bodyFat = analysis.body_fat_estimate;
          const muscledef = analysis.muscle_definition;

          return (
            <div
              key={analysis.id}
              onClick={() => navigate(`/professional/patient/${analysis.patient_id}`)}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getScoreGradient(overallScore)} flex items-center justify-center text-white font-bold shadow-md`}>
                {overallScore}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate flex items-center gap-1.5">
                  {patientName}
                  {getProgressIcon(analysis.comparison_result)}
                </p>
                <p className="text-xs text-gray-500">
                  BF: {bodyFat}% • Def: {muscledef}/10 • {analysis.body_type || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">{formatDate(analysis.created_at)}</p>
                {analysis.comparison_result?.progress_score && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-200 text-purple-600">
                    +{analysis.comparison_result.progress_score}pts
                  </Badge>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default BodyAnalysisSection;
