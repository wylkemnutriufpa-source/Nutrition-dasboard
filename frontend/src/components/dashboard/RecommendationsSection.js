import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, ArrowRight, Sparkles } from 'lucide-react';

/**
 * Seção de Recomendações Inteligentes
 */
const RecommendationsSection = ({ recommendations = [] }) => {
  const navigate = useNavigate();

  const colorMap = {
    red: 'border-l-red-500 bg-red-50',
    orange: 'border-l-orange-500 bg-orange-50',
    blue: 'border-l-blue-500 bg-blue-50',
    purple: 'border-l-purple-500 bg-purple-50',
    green: 'border-l-green-500 bg-green-50',
    gray: 'border-l-gray-500 bg-gray-50'
  };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Recomendações Inteligentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-4 rounded-lg border-l-4 ${colorMap[rec.color] || colorMap.gray} transition-all hover:shadow-sm`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{rec.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {rec.title}
                </h4>
                <p className="text-xs text-gray-600 mb-2">
                  {rec.description}
                </p>
                {rec.actionLabel && rec.actionLink && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(rec.actionLink)}
                    className="h-7 text-xs"
                  >
                    {rec.actionLabel}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecommendationsSection;
