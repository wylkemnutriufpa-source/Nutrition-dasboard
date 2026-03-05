import { useState, useEffect } from 'react';
import { checkTrialExpiration } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para verificar expiração de trial
 * Retorna: { expired, daysLeft, showModal, setShowModal }
 */
export const useTrialCheck = () => {
  const { user, profile } = useAuth();
  const [expired, setExpired] = useState(false);
  const [daysLeft, setDaysLeft] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkTrial = async () => {
      if (!user?.id || !profile) return;
      
      // Apenas verificar para profissionais
      if (profile.role !== 'professional') return;
      
      // Apenas verificar se está em trial
      if (profile.plan_type !== 'trial') return;

      const result = await checkTrialExpiration(user.id);
      
      if (result.expired) {
        setExpired(true);
        setDaysLeft(0);
        setShowModal(true);
      } else if (result.daysLeft !== undefined) {
        setDaysLeft(result.daysLeft);
      }
    };

    checkTrial();
    // Verificar a cada hora
    const interval = setInterval(checkTrial, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, profile]);

  return { expired, daysLeft, showModal, setShowModal };
};
