import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MessageCircle, Camera, Send, Smile, Meh, Frown, 
  ThumbsUp, Heart, Star, Upload, X, Image as ImageIcon,
  CheckCircle, Clock, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const PatientFeedbacks = () => {
  const { user, profile } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [mood, setMood] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const patientId = user?.id || profile?.id || localStorage.getItem('fitjourney_patient_id');

  useEffect(() => {
    loadFeedbacks();
  }, [patientId]);

  const loadFeedbacks = async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('patient_messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar feedbacks:', error);
        setFeedbacks([]);
      } else {
        setFeedbacks(data || []);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!newFeedback.trim()) {
      toast.error('Escreva uma mensagem');
      return;
    }

    setSending(true);
    try {
      // Buscar professional_id do paciente
      const { data: patientProfile, error: profileError } = await supabase
        .from('patient_profiles')
        .select('professional_id')
        .eq('patient_id', patientId)
        .single();

      if (profileError || !patientProfile) {
        toast.error('Erro ao identificar seu profissional');
        return;
      }

      const { error } = await supabase
        .from('patient_messages')
        .insert({
          patient_id: patientId,
          professional_id: patientProfile.professional_id,
          title: mood ? `Feedback - ${getMoodLabel(mood)}` : 'Feedback',
          content: newFeedback.trim(),
          type: 'feedback',
          priority: 'normal',
          is_pinned: false,
          is_read: false
        });

      if (error) {
        throw error;
      }

      toast.success('Feedback enviado! 🎉');
      setNewFeedback('');
      setMood(null);
      setShowForm(false);
      loadFeedbacks();
    } catch (error) {
      toast.error('Erro ao enviar feedback');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const getMoodIcon = (moodValue) => {
    switch (moodValue) {
      case 'great': return <Smile className="h-6 w-6 text-green-500" />;
      case 'good': return <ThumbsUp className="h-6 w-6 text-blue-500" />;
      case 'neutral': return <Meh className="h-6 w-6 text-yellow-500" />;
      case 'bad': return <Frown className="h-6 w-6 text-red-500" />;
      default: return null;
    }
  };

  const getMoodLabel = (moodValue) => {
    switch (moodValue) {
      case 'great': return 'Ótimo';
      case 'good': return 'Bem';
      case 'neutral': return 'Normal';
      case 'bad': return 'Difícil';
      default: return '';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'read':
        return (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Visualizado
          </span>
        );
      case 'replied':
        return (
          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            <MessageCircle className="h-3 w-3" />
            Respondido
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            Aguardando
          </span>
        );
    }
  };

  if (loading) {
    return (
      <Layout title="Meus Feedbacks" userType="patient">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Meus Feedbacks" userType="patient">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Compartilhe seu Progresso</h2>
                <p className="text-purple-100">
                  Conte para seu nutricionista como você está se sentindo
                </p>
              </div>
              <MessageCircle className="h-12 w-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        {/* Botão de novo feedback */}
        {!showForm && (
          <Button 
            onClick={() => setShowForm(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
          >
            <Send className="mr-2" />
            Enviar Novo Feedback
          </Button>
        )}

        {/* Formulário de feedback */}
        {showForm && (
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Como você está?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seletor de humor */}
              <div>
                <Label className="mb-3 block">Como está seu humor hoje?</Label>
                <div className="flex gap-3">
                  {[
                    { value: 'great', icon: Smile, color: 'green', label: 'Ótimo' },
                    { value: 'good', icon: ThumbsUp, color: 'blue', label: 'Bem' },
                    { value: 'neutral', icon: Meh, color: 'yellow', label: 'Normal' },
                    { value: 'bad', icon: Frown, color: 'red', label: 'Difícil' }
                  ].map((option) => {
                    const Icon = option.icon;
                    const isSelected = mood === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setMood(option.value)}
                        className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? `border-${option.color}-500 bg-${option.color}-50` 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-8 w-8 ${isSelected ? `text-${option.color}-500` : 'text-gray-400'}`} />
                        <span className={`text-sm ${isSelected ? `text-${option.color}-600 font-medium` : 'text-gray-500'}`}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mensagem */}
              <div>
                <Label className="mb-2 block">Sua mensagem</Label>
                <Textarea
                  value={newFeedback}
                  onChange={(e) => setNewFeedback(e.target.value)}
                  placeholder="Conte como está sendo sua semana, dúvidas, conquistas, dificuldades..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleSubmitFeedback}
                  disabled={sending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Feedback
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setNewFeedback('');
                    setMood(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de feedbacks */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Seus Feedbacks</h3>
          
          {feedbacks.length > 0 ? (
            feedbacks.map((feedback) => (
              <Card key={feedback.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">{feedback.title}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(feedback.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {feedback.is_read ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Visualizado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        Aguardando
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-3">{feedback.content}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 font-medium mb-2">Nenhum feedback ainda</p>
                <p className="text-sm text-gray-400">
                  Envie seu primeiro feedback e compartilhe como está indo sua jornada!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PatientFeedbacks;
