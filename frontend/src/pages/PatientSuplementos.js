import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Pill, Clock, AlertCircle, CheckCircle2, Info,
  Sun, Moon, Coffee, Utensils, Loader2, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const PatientSuplementos = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supplements, setSupplements] = useState([]);
  const [takenToday, setTakenToday] = useState(new Set());

  const patientId = user?.id || profile?.id || localStorage.getItem('fitjourney_patient_id');

  // Suplementos de exemplo (podem vir do banco depois)
  const defaultSupplements = [
    {
      id: 1,
      name: 'Vitamina D3',
      dosage: '2000 UI',
      frequency: 'Diário',
      timing: 'morning',
      timingLabel: 'Manhã (com café)',
      icon: Sun,
      color: 'yellow',
      instructions: 'Tomar com uma refeição que contenha gordura para melhor absorção.',
      benefits: ['Fortalece ossos', 'Melhora imunidade', 'Regula humor']
    },
    {
      id: 2,
      name: 'Ômega 3',
      dosage: '1000mg',
      frequency: 'Diário',
      timing: 'lunch',
      timingLabel: 'Almoço',
      icon: Utensils,
      color: 'blue',
      instructions: 'Tomar junto com a principal refeição do dia.',
      benefits: ['Saúde cardiovascular', 'Anti-inflamatório', 'Função cerebral']
    },
    {
      id: 3,
      name: 'Magnésio',
      dosage: '400mg',
      frequency: 'Diário',
      timing: 'night',
      timingLabel: 'Noite (antes de dormir)',
      icon: Moon,
      color: 'purple',
      instructions: 'Tomar 30 minutos antes de dormir para melhor qualidade do sono.',
      benefits: ['Relaxamento muscular', 'Qualidade do sono', 'Reduz estresse']
    },
    {
      id: 4,
      name: 'Complexo B',
      dosage: '1 cápsula',
      frequency: 'Diário',
      timing: 'morning',
      timingLabel: 'Manhã (em jejum ou café)',
      icon: Coffee,
      color: 'orange',
      instructions: 'Pode causar urina amarelada, é normal.',
      benefits: ['Energia', 'Sistema nervoso', 'Metabolismo']
    }
  ];

  useEffect(() => {
    loadSupplements();
    loadTakenToday();
  }, [patientId]);

  const loadSupplements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_supplements')
        .select('*')
        .eq('patient_id', patientId);

      if (error || !data || data.length === 0) {
        setSupplements(defaultSupplements);
      } else {
        setSupplements(data);
      }
    } catch (error) {
      console.error('Erro:', error);
      setSupplements(defaultSupplements);
    } finally {
      setLoading(false);
    }
  };

  const loadTakenToday = () => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem(`supplements_taken_${patientId}_${today}`);
    if (saved) {
      setTakenToday(new Set(JSON.parse(saved)));
    }
  };

  const toggleTaken = (supplementId) => {
    const today = new Date().toDateString();
    const newTaken = new Set(takenToday);
    
    if (newTaken.has(supplementId)) {
      newTaken.delete(supplementId);
    } else {
      newTaken.add(supplementId);
      toast.success('Suplemento marcado como tomado! 💊');
    }
    
    setTakenToday(newTaken);
    localStorage.setItem(`supplements_taken_${patientId}_${today}`, JSON.stringify(Array.from(newTaken)));
  };

  const getColorClasses = (color) => {
    const colors = {
      yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', badge: 'bg-green-100 text-green-700' }
    };
    return colors[color] || colors.blue;
  };

  const takenCount = takenToday.size;
  const totalCount = supplements.length;

  if (loading) {
    return (
      <Layout title="Suplementos" userType="patient">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Suplementos" userType="patient">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Botão Voltar */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/patient/biblioteca')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Biblioteca
        </Button>

        {/* Header */}
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Meus Suplementos</h2>
                <p className="text-indigo-100">
                  Acompanhe sua suplementação diária
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{takenCount}/{totalCount}</p>
                <p className="text-sm text-indigo-200">tomados hoje</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${totalCount > 0 ? (takenCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de suplementos */}
        {supplements.length > 0 ? (
          <div className="space-y-4">
            {supplements.map((supplement) => {
              const colors = getColorClasses(supplement.color);
              const Icon = supplement.icon || Pill;
              const isTaken = takenToday.has(supplement.id);

              return (
                <Card 
                  key={supplement.id} 
                  className={`${colors.bg} ${colors.border} border-2 transition-all ${
                    isTaken ? 'opacity-60' : ''
                  }`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${colors.badge}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{supplement.name}</h3>
                          <Badge className={colors.badge}>
                            {supplement.timingLabel}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                          <strong>Dose:</strong> {supplement.dosage} • {supplement.frequency}
                        </p>
                        
                        {supplement.instructions && (
                          <div className="flex items-start gap-2 text-sm text-gray-500 mb-3">
                            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>{supplement.instructions}</span>
                          </div>
                        )}
                        
                        {supplement.benefits && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {supplement.benefits.map((benefit, idx) => (
                              <span key={idx} className="text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                                ✓ {benefit}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <Button
                          onClick={() => toggleTaken(supplement.id)}
                          variant={isTaken ? 'outline' : 'default'}
                          className={isTaken ? 'border-green-500 text-green-600' : 'bg-teal-600 hover:bg-teal-700'}
                          size="sm"
                        >
                          {isTaken ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Tomado
                            </>
                          ) : (
                            <>
                              <Pill className="h-4 w-4 mr-2" />
                              Marcar como tomado
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <Pill className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium mb-2">Nenhum suplemento cadastrado</p>
              <p className="text-sm text-gray-400">
                Seu nutricionista pode adicionar suplementos para você
              </p>
            </CardContent>
          </Card>
        )}

        {/* Aviso */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Importante</p>
                <p className="text-sm text-amber-700">
                  Sempre consulte seu nutricionista antes de iniciar qualquer suplementação. 
                  Esta lista é apenas para acompanhamento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PatientSuplementos;
