import React from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * Badge de Engajamento do Paciente
 * @param {Object} props
 * @param {number} props.score - Score 0-100
 * @param {Object} props.classification - Classificação do score
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {boolean} props.showScore - Mostrar número do score
 */
const PatientEngagementBadge = ({ 
  score, 
  classification, 
  size = 'md', 
  showScore = false 
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  if (!classification) {
    return null;
  }

  return (
    <Badge className={`${classification.color} border ${sizeClasses[size]} font-semibold flex items-center gap-1`}>
      <span>{classification.icon}</span>
      <span>{classification.label}</span>
      {showScore && score !== undefined && (
        <span className="ml-1 font-bold">({score})</span>
      )}
    </Badge>
  );
};

export default PatientEngagementBadge;
