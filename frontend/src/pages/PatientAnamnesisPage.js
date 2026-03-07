import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AnamneseFormComplete from '@/components/AnamneseFormComplete';
import { useAuth } from '@/contexts/AuthContext';
import { getAnamnesis } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * PatientAnamnesisPage - Página para paciente preencher sua própria anamnese
 * Inclui guard de navegação para evitar perda de dados
 */
const PatientAnamnesisPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [anamnesis, setAnamnesis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  useEffect(() => {
    loadAnamnesis();
  }, [profile]);

  // Interceptar cliques no botão "voltar" do Layout
  // O Layout usa window.history.back() ou navigate(-1) — vamos interceptar
  useEffect(() => {
    if (!hasUnsaved) return;
    const handlePopState = (e) => {
      // Usuário clicou "voltar" no browser
      // Re-push o estado atual para cancelar a navegação
      window.history.pushState(null, '', window.location.href);
      setShowExitDialog(true);
      setPendingNavigation(() => () => navigate(-1));
    };
    // Push estado extra para poder interceptar
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsaved, navigate]);

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
    setHasUnsaved(false);
    navigate('/patient/dashboard');
  };

  const handleConfirmExit = () => {
    setHasUnsaved(false);
    setShowExitDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
    } else {
      navigate('/patient/dashboard');
    }
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
    <Layout title="Minha Anamnese" userType="patient">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Por que preencher a anamnese?</h3>
          <p className="text-sm text-blue-800">
            Suas respostas são fundamentais para que seu nutricionista possa criar um plano alimentar 
            verdadeiramente personalizado, considerando sua saúde, hábitos e objetivos. Quanto mais 
            detalhadas forem suas respostas, melhor será seu plano!
          </p>
        </div>

        <AnamneseFormComplete
          anamnesis={anamnesis}
          patientId={profile?.id}
          professionalId={profile?.professional_id || profile?.id}
          patient={profile}
          isPatientView={true}
          onUpdate={loadAnamnesis}
          onComplete={handleComplete}
          onDirtyChange={setHasUnsaved}
        />
      </div>

      {/* Dialog de confirmação ao sair com dados não salvos */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-700">Sair sem salvar?</DialogTitle>
            <DialogDescription>
              Você tem alterações não salvas na anamnese. Se sair agora, suas mudanças serão mantidas como rascunho local e restauradas quando você voltar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowExitDialog(false)} data-testid="stay-btn">
              Continuar editando
            </Button>
            <Button variant="default" onClick={handleConfirmExit} data-testid="exit-btn">
              Sair (rascunho salvo)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default PatientAnamnesisPage;
