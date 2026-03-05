import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Utensils, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { listProfessionalRecentMealAnalyses } from '@/lib/supabase';

/**
 * Seção de Análises de Pratos Premium no Dashboard
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

  const getScoreGradient = (score) => {
    if (score >= 70) return 'from-green-500 to-emerald-600';
    if (score >= 40) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3 bg-gradient-to-r from-teal-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-xl">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold">Análises de Pratos</span>
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
        <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-green-600 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Camera className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold mb-1">Análise de Pratos 📸</h3>
          <p className="text-teal-100 text-sm">
            Seus pacientes podem enviar fotos das refeições para análise por IA
          </p>
        </div>
      </Card>
    );
  }

  // Verificar alertas (baixa qualidade)
  const lowQualityCount = analyses.filter(a => a.quality_score < 50).length;

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-xl">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900">Análises de Pratos</span>
              <p className="text-xs text-gray-500 font-normal">Refeições analisadas por IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lowQualityCount > 0 && (
              <Badge className="bg-red-500 text-white border-0 text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {lowQualityCount} baixa
              </Badge>
            )}
            <Badge className="bg-teal-500 text-white border-0">{analyses.length}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {analyses.map((analysis) => {
          const patientName = analysis.patient?.name || 'Paciente';
          const qualityScore = analysis.quality_score || 0;
          const foods = (analysis.detected_foods || []).slice(0, 3).map(f => f.name).join(', ');

          return (
            <div
              key={analysis.id}
              onClick={() => navigate(`/professional/patient/${analysis.patient_id}`)}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getScoreGradient(qualityScore)} flex items-center justify-center text-white font-bold shadow-md`}>
                {qualityScore}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{patientName}</p>
                <p className="text-xs text-gray-500 truncate">
                  {foods || 'Alimentos analisados'} • {analysis.estimated_calories || '?'} kcal
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">{formatDate(analysis.created_at)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default MealAnalysisSection;
