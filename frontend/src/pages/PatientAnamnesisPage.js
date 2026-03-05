import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AnamneseFormComplete from '@/components/AnamneseFormComplete';
import { useAuth } from '@/contexts/AuthContext';
import { getAnamnesis } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

/**
 * PatientAnamnesisPage - Página para paciente preencher sua própria anamnese
 * Parte do acompanhamento online
 */
const PatientAnamnesisPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [anamnesis, setAnamnesis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnamnesis();
  }, [profile]);

  const loadAnamnesis = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const { data } = await getAnamnesis(profile.id);
      setAnamnesis(data);
    } catch (error) {
      console.error('Error loading anamnesis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    // Quando completar, voltar para o dashboard
    navigate('/patient/dashboard');
  };

  if (loading) {
    return (
      <Layout title="Minha Anamnese" userType="patient">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Minha Anamnese" showBack userType="patient">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Por que preencher a anamnese?</h3>
          <p className="text-sm text-blue-800">
            Suas respostas são fundamentais para que seu nutricionista possa criar um plano alimentar 
            verdadeiramente personalizado, considerando sua saúde, hábitos e objetivos. Quanto mais 
            detalhadas forem suas respostas, melhor será seu plano!
          </p>
        </div>

        <AnamneseFormComplete
          anamnesis={anamnesis}
          patientId={profile?.id}
          professionalId={profile?.professional_id || profile?.id} // Se não tiver profissional atribuído, usa o próprio ID
          patient={profile}
          isPatientView={true}
          onUpdate={loadAnamnesis}
          onComplete={handleComplete}
        />
      </div>
    </Layout>
  );
};

export default PatientAnamnesisPage;
