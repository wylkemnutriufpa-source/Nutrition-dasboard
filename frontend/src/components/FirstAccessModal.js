import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

/**
 * FirstAccessModal - Modal exibido no primeiro acesso do paciente
 * Informa que o plano só será elaborado após preencher toda a anamnese
 */
const FirstAccessModal = ({ show, onClose, onStartAnamnesis, anamnesisStatus }) => {
  // Controle interno do estado do modal
  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleStart = () => {
    handleClose();
    if (onStartAnamnesis) onStartAnamnesis();
  };

  const isComplete = anamnesisStatus === 'complete';
  const isDraft = anamnesisStatus === 'draft';

  // Se não deve mostrar, retorna null
  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="text-green-600" size={28} />
                Anamnese Completa!
              </>
            ) : (
              <>
                <FileText className="text-blue-600" size={28} />
                Bem-vindo(a)!
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isComplete ? (
              'Sua anamnese está completa. Seu plano alimentar personalizado será elaborado pelo seu nutricionista em breve!'
            ) : (
              'Para receber seu plano alimentar personalizado, precisamos conhecer você melhor.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isComplete ? (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-2">Próximos passos:</h4>
                    <ul className="space-y-2 text-sm text-green-800">
                      <li>✓ Sua anamnese foi enviada para análise</li>
                      <li>✓ Seu nutricionista está elaborando seu plano personalizado</li>
                      <li>✓ Em breve você receberá seu plano alimentar completo</li>
                      <li>✓ Enquanto isso, explore as ferramentas disponíveis no menu</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Importante:</strong> Seu plano alimentar personalizado só será elaborado após você preencher toda a sua anamnese.
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-3">O que é a anamnese?</h4>
                  <p className="text-sm text-gray-700 mb-4">
                    A anamnese é um questionário completo sobre sua saúde, hábitos alimentares e rotina esportiva. 
                    Com essas informações, seu nutricionista poderá criar um plano alimentar verdadeiramente personalizado para você!
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <FileText size={18} className="text-teal-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Parte Clínica</p>
                        <p className="text-xs text-gray-600">Histórico médico, alergias, medicamentos</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock size={18} className="text-teal-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Estilo de Vida</p>
                        <p className="text-xs text-gray-600">Sono, estresse, hábitos diários</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText size={18} className="text-teal-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Alimentação</p>
                        <p className="text-xs text-gray-600">Preferências, restrições, objetivos</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText size={18} className="text-teal-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Parte Esportiva</p>
                        <p className="text-xs text-gray-600">Treinos, modalidades, performance</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isDraft && (
                <Alert className="bg-amber-50 border-amber-200">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800">
                    Você já começou a preencher sua anamnese! Continue de onde parou para liberar seu plano alimentar.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              {isComplete ? 'Entendi' : 'Depois'}
            </Button>
            {!isComplete && (
              <Button onClick={handleStart} className="bg-teal-700 hover:bg-teal-800">
                {isDraft ? 'Continuar Anamnese' : 'Preencher Anamnese Agora'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * AnamneseBanner - Banner persistente no dashboard
 * Lembra o paciente de preencher/atualizar a anamnese
 * - draft/null → banner de urgência
 * - complete → banner suave de atualização (paciente sempre pode editar)
 */
export const AnamneseBanner = ({ anamnesisStatus, onStartAnamnesis }) => {
  const isComplete = anamnesisStatus === 'complete';
  const isDraft = anamnesisStatus === 'draft';
  const isEmpty = !anamnesisStatus;

  // Anamnese completa: mostrar banner suave de atualização (paciente pode sempre editar)
  if (isComplete) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <FileText className="h-5 w-5 text-green-700" />
        <div className="flex items-center justify-between w-full">
          <AlertDescription className="text-sm">
            <strong className="text-green-900">✅ Anamnese concluída</strong>
            <p className="text-green-800 mt-1">
              Seus dados estão salvos. Você pode atualizar suas informações sempre que precisar.
            </p>
          </AlertDescription>
          <Button
            onClick={onStartAnamnesis}
            variant="outline"
            className="border-green-600 text-green-700 hover:bg-green-100 ml-4 flex-shrink-0"
            size="sm"
          >
            Atualizar
          </Button>
        </div>
      </Alert>
    );
  }

  // Anamnese incompleta (draft ou vazia): banner de urgência
  return (
    <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300">
      <FileText className="h-5 w-5 text-amber-700" />
      <div className="flex items-center justify-between w-full">
        <div>
          <AlertDescription className="text-sm">
            <strong className="text-amber-900">
              {isDraft ? '📝 Continue sua anamnese' : '⚠️ Ação necessária'}
            </strong>
            <p className="text-amber-800 mt-1">
              {isDraft
                ? 'Você começou a preencher sua anamnese. Complete-a para receber seu plano alimentar personalizado!'
                : 'Preencha sua anamnese para que seu nutricionista possa elaborar seu plano alimentar personalizado.'}
            </p>
          </AlertDescription>
        </div>
        <Button
          onClick={onStartAnamnesis}
          className="bg-amber-600 hover:bg-amber-700 ml-4 flex-shrink-0"
          size="sm"
        >
          {isDraft ? 'Continuar' : 'Preencher Agora'}
        </Button>
      </div>
    </Alert>
  );
};

export default FirstAccessModal;
