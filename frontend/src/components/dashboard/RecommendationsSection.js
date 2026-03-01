import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, ArrowRight, Sparkles, Brain } from 'lucide-react';

/**
 * Seção de Recomendações Inteligentes Premium
 */
const RecommendationsSection = ({ recommendations = [] }) => {
  const navigate = useNavigate();

  const colorMap = {
    red: { border: 'border-red-400', bg: 'from-red-50 to-rose-50', icon: 'bg-red-100 text-red-600' },
    orange: { border: 'border-orange-400', bg: 'from-orange-50 to-amber-50', icon: 'bg-orange-100 text-orange-600' },
    blue: { border: 'border-blue-400', bg: 'from-blue-50 to-indigo-50', icon: 'bg-blue-100 text-blue-600' },
    purple: { border: 'border-purple-400', bg: 'from-purple-50 to-pink-50', icon: 'bg-purple-100 text-purple-600' },
    green: { border: 'border-green-400', bg: 'from-green-50 to-emerald-50', icon: 'bg-green-100 text-green-600' },
    gray: { border: 'border-gray-400', bg: 'from-gray-50 to-slate-50', icon: 'bg-gray-100 text-gray-600' }
  };

  if (recommendations.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Brain className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold mb-1">Tudo Certo! ✨</h3>
          <p className="text-amber-100 text-sm">
            Nenhuma recomendação pendente no momento.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2 rounded-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900">Recomendações IA</span>
              <p className="text-xs text-gray-500 font-normal">Sugestões personalizadas</p>
            </div>
          </div>
          <Badge className="bg-amber-500 text-white border-0">
            {recommendations.length} {recommendations.length === 1 ? 'sugestão' : 'sugestões'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {recommendations.slice(0, 5).map((rec, index) => {
          const colors = colorMap[rec.color] || colorMap.gray;
          
          return (
            <div
              key={rec.id || index}
              className={`
                relative overflow-hidden p-4 rounded-xl border-l-4 ${colors.border} 
                bg-gradient-to-r ${colors.bg} hover:shadow-md transition-all group
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${colors.icon} flex-shrink-0`}>
                  <span className="text-xl">{rec.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
                    {rec.title}
                    {index === 0 && (
                      <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">
                        Prioridade
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {rec.description}
                  </p>
                  {rec.actionLabel && rec.actionLink && (
                    <Button
                      size="sm"
                      onClick={() => navigate(rec.actionLink)}
                      className="h-8 text-xs bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm"
                    >
                      {rec.actionLabel}
                      <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default RecommendationsSection;
