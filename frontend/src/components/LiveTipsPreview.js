/**
 * LiveTipsPreview - Componente que mostra dicas em tempo real
 * enquanto o formulário está sendo preenchido
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, ChevronDown, ChevronUp, Lightbulb, Send, Loader2 } from 'lucide-react';
import { generateAnamnesisTips, generateAssessmentTips, combineTips } from '@/utils/dynamicTips';
import { createPersonalizedTip, createAutomaticTips } from '@/lib/supabase';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { toast } from 'sonner';

const TipCard = ({ tip, isCompact = false }) => {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-green-500 bg-green-50'
  };
  
  const priorityLabels = {
    high: { text: 'Importante', color: 'bg-red-100 text-red-700' },
    medium: { text: 'Atenção', color: 'bg-amber-100 text-amber-700' },
    low: { text: 'Dica', color: 'bg-green-100 text-green-700' }
  };
  
  return (
    <div className={`border-l-4 rounded-r-lg p-3 ${priorityColors[tip.priority] || priorityColors.low}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="text-xl">{tip.icon}</span>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{tip.title}</h4>
            {!isCompact && (
              <p className="text-sm text-gray-700 mt-1">{tip.content}</p>
            )}
          </div>
        </div>
        <Badge className={`text-xs ${priorityLabels[tip.priority]?.color || 'bg-gray-100'}`}>
          {priorityLabels[tip.priority]?.text || 'Info'}
        </Badge>
      </div>
    </div>
  );
};

const LiveTipsPreview = ({ 
  formData, 
  patient,
  previousAssessment = null,
  type = 'anamnese', // 'anamnese' ou 'assessment'
  patientId,
  professionalId,
  onTipsSent,
  showSendButton = true
}) => {
  const [tips, setTips] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [sending, setSending] = useState(false);

  // Gerar dicas em tempo real quando os dados mudam
  useEffect(() => {
    let generatedTips = [];
    
    if (type === 'anamnese') {
      generatedTips = generateAnamnesisTips(formData, patient);
    } else if (type === 'assessment') {
      generatedTips = generateAssessmentTips(formData, patient, previousAssessment);
    }
    
    setTips(generatedTips);
  }, [formData, patient, previousAssessment, type]);

  const handleSendTips = async () => {
    if (!patientId || !professionalId || tips.length === 0) {
      toast.error('Não há dicas para enviar');
      return;
    }
    
    setSending(true);
    try {
      // Enviar todas as dicas geradas
      const tipsToSend = tips.map(tip => ({
        title: tip.title,
        content: tip.content,
        category: tip.category
      }));
      
      const { error } = await createAutomaticTips(patientId, professionalId, tipsToSend);
      
      if (error) throw error;
      
      toast.success(`${tips.length} dica(s) enviada(s) para o paciente!`);
      trackProfessionalFeature('create_personalized_tip');
      onTipsSent && onTipsSent(tips);
    } catch (error) {
      console.error('Erro ao enviar dicas:', error);
      toast.error('Erro ao enviar dicas');
    } finally {
      setSending(false);
    }
  };

  if (tips.length === 0) {
    return (
      <Card className="bg-gray-50 border-dashed">
        <CardContent className="py-6 text-center">
          <Lightbulb className="mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-sm text-gray-500">
            As dicas personalizadas aparecerão aqui conforme você preenche o formulário
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-teal-800">
            <Sparkles className="text-teal-600" size={20} />
            Dicas Geradas em Tempo Real
            <Badge variant="outline" className="ml-2 bg-teal-100 text-teal-700 border-teal-300">
              {tips.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {showSendButton && tips.length > 0 && (
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleSendTips}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 size={16} className="mr-1 animate-spin" />
                ) : (
                  <Send size={16} className="mr-1" />
                )}
                Enviar para Paciente
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Baseadas nas informações preenchidas • Atualizadas automaticamente
        </p>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <ScrollArea className="h-auto max-h-[400px]">
            <div className="space-y-3">
              {tips.map((tip, index) => (
                <TipCard key={index} tip={tip} />
              ))}
            </div>
          </ScrollArea>
          
          {tips.length > 0 && (
            <div className="mt-4 p-3 bg-teal-100 rounded-lg border border-teal-200">
              <p className="text-xs text-teal-700 flex items-center gap-1">
                <Lightbulb size={14} />
                <strong>Dica:</strong> Essas dicas são geradas automaticamente e serão enviadas para o dashboard do paciente ao salvar.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default LiveTipsPreview;
