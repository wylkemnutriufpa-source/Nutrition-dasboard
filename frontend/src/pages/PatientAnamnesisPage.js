import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AnamneseFormComplete from '@/components/AnamneseFormComplete';
import { useAuth } from '@/contexts/AuthContext';
import { getAnamnesis } from '@/lib/supabase';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * PatientAnamnesisPage - Paciente preenche sua própria anamnese
 *
 * BUGS CORRIGIDOS:
 * 1. Silent refresh: onUpdate não desmonta o form (setLoading só no carregamento inicial)
 * 2. Concluir com validação: requer progress >= 60%
 * 3. Após concluir: fica na página com mensagem de sucesso (não redireciona)
 */
const PatientAnamnesisPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [anamnesis, setAnamnesis] = useState(null);
  const [loading, setLoading] = useState(true);   // Só true no carregamento inicial
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [completed, setCompleted] = useState(false); // Mostrar tela de sucesso após concluir
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (profile?.id) initialLoad();
  }, [profile?.id]);

  // ─── Carregamento inicial (mostra spinner, desmonta nada porque form ainda não existe) ─
  const initialLoad = async () => {
    setLoading(true);
    try {
      const { data } = await getAnamnesis(profile.id);
      if (mountedRef.current) setAnamnesis(data);
    } catch (error) {
      console.error('Erro ao carregar anamnese:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Refresh silencioso: chamado após salvar — NÃO mostra spinner, NÃO desmonta form ─
  const silentRefresh = async () => {
    try {
      const { data } = await getAnamnesis(profile.id);
      if (mountedRef.current) setAnamnesis(data);
    } catch (error) {
      console.warn('Aviso: refresh silencioso falhou:', error);
    }
  };

  // ─── Guard de navegação (voltar no browser com dados não salvos) ─────────────────────
  useEffect(() => {
    if (!hasUnsaved) return;
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowExitDialog(true);
      setPendingNavigation(() => () => navigate(-1));
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsaved, navigate]);

  // ─── Após concluir: mostra tela de sucesso IN-PAGE, não redireciona ─────────────────
  const handleComplete = () => {
    setHasUnsaved(false);
    setCompleted(true);
    // Refresh silencioso para garantir status=complete no state
    silentRefresh();
  };

  const handleConfirmExit = () => {
    setHasUnsaved(false);
    setShowExitDialog(false);
    if (pendingNavigation) pendingNavigation();
    else navigate('/patient/dashboard');
  };

  // ─── Loading inicial ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout title="Minha Anamnese" userType="patient">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-teal-600" size={32} />
        </div>
      </Layout>
    );
  }

  // ─── Tela de sucesso após concluir ────────────────────────────────────────────────
  if (completed) {
    return (
      <Layout title="Minha Anamnese" userType="patient">
        <div className="max-w-xl mx-auto mt-16 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Anamnese concluída! 🎉</h2>
          <p className="text-gray-600">
            Suas informações foram salvas com sucesso. Seu nutricionista já pode visualizá-las
            e criar seu plano personalizado.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => { setCompleted(false); silentRefresh(); }}
              className="border-teal-600 text-teal-700 hover:bg-teal-50"
            >
              Revisar / Editar respostas
            </Button>
            <Button
              onClick={() => navigate('/patient/dashboard')}
              className="bg-teal-700 hover:bg-teal-800"
            >
              Ir para meu Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Formulário principal ──────────────────────────────────────────────────────────
  return (
    <Layout title="Minha Anamnese" userType="patient">
      <div className="max-w-4xl mx-auto">
        {/* Banner informativo */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-1">Por que preencher a anamnese?</h3>
          <p className="text-sm text-blue-800">
            Suas respostas são a base do seu plano personalizado. Quanto mais detalhes você fornecer,
            mais preciso será o trabalho do seu nutricionista. Salve rascunhos e volte quando quiser!
          </p>
        </div>

        <AnamneseFormComplete
          anamnesis={anamnesis}
          patientId={profile?.id}
          professionalId={profile?.professional_id || profile?.id}
          patient={profile}
          isPatientView={true}
          onUpdate={silentRefresh}
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
              Você tem alterações não salvas. Se sair agora, suas mudanças ficam salvas como
              rascunho local e serão restauradas quando você voltar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Continuar editando
            </Button>
            <Button onClick={handleConfirmExit}>
              Sair (rascunho salvo)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default PatientAnamnesisPage;
