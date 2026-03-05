import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Send } from 'lucide-react';
import { createEmergencyFeedback } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Modal de Emergência (SOS)
 * Permite paciente enviar alerta urgente ao nutricionista
 */
const EmergencyModal = ({ isOpen, onClose, patientId, professionalId }) => {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const categories = [
    { value: 'compulsao', label: '🍔 Compulsão/Fome Excessiva', icon: '🍔' },
    { value: 'ansiedade', label: '😰 Ansiedade/Estresse', icon: '😰' },
    { value: 'dor', label: '🤢 Dor/Mal-estar Estomacal', icon: '🤢' },
    { value: 'dificuldade', label: '😕 Dificuldade no Plano', icon: '😕' },
    { value: 'outro', label: '❓ Outro', icon: '❓' }
  ];

  const handleSubmit = async () => {
    // Validações
    if (!category) {
      toast.error('Selecione uma categoria');
      return;
    }

    if (!message || message.trim().length < 10) {
      toast.error('Descreva sua dificuldade (mínimo 10 caracteres)');
      return;
    }

    // Verificar rate limit (localStorage)
    const lastEmergency = localStorage.getItem('last_emergency_sent');
    if (lastEmergency) {
      const timeSince = Date.now() - parseInt(lastEmergency);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeSince < fiveMinutes) {
        const remaining = Math.ceil((fiveMinutes - timeSince) / 60000);
        toast.error(`Aguarde ${remaining} minuto(s) para enviar outra emergência`);
        return;
      }
    }

    setSending(true);

    try {
      const { data, error } = await createEmergencyFeedback(patientId, professionalId, {
        category,
        message: message.trim()
      });

      if (error) throw error;

      // Salvar timestamp
      localStorage.setItem('last_emergency_sent', Date.now().toString());

      toast.success('🆘 Emergência enviada! Seu nutricionista será notificado.');
      
      // Limpar e fechar
      setCategory('');
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Erro ao enviar emergência:', error);
      toast.error('Erro ao enviar emergência. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setCategory('');
      setMessage('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-red-600">
            <AlertCircle className="h-6 w-6" />
            🆘 Preciso de Ajuda Urgente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Categoria */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              O que está acontecendo?
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Descreva sua dificuldade: *
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Estou com muita fome fora do horário e não sei o que fazer. Preciso de orientação urgente!"
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/500 caracteres (mínimo 10)
            </p>
          </div>

          {/* Aviso */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Atenção:</strong> Use apenas para situações urgentes. 
              Seu nutricionista será notificado imediatamente.
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 justify-end">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700"
            disabled={sending || !category || message.trim().length < 10}
          >
            {sending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar ao Nutricionista
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyModal;
