import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, Scale, Ruler, Heart, Calendar, TrendingUp, TrendingDown,
  Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getPhysicalAssessments, compareAssessments } from '@/lib/supabase';

const PatientAvaliacaoFisica = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadAssessments();
    }
  }, [user]);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const { data, error } = await getPhysicalAssessments(user.id);
      if (error) throw error;
      setAssessments(data || []);
      if (data && data.length > 0) {
        setExpandedId(data[0].id); // Expandir a mais recente
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIMCClassification = (bmi) => {
    if (!bmi) return { label: '-', color: 'gray' };
    const value = parseFloat(bmi);
    if (value < 18.5) return { label: 'Abaixo do peso', color: 'yellow' };
    if (value < 25) return { label: 'Peso normal', color: 'green' };
    if (value < 30) return { label: 'Sobrepeso', color: 'orange' };
    return { label: 'Obesidade', color: 'red' };
  };

  const getDiffIndicator = (current, previous, field, inverse = false) => {
    if (!current || !previous || !current[field] || !previous[field]) return null;
    
    const diff = current[field] - previous[field];
    if (Math.abs(diff) < 0.1) return null;
    
    const isPositive = inverse ? diff < 0 : diff > 0;
    const Icon = diff > 0 ? TrendingUp : TrendingDown;
    
    return (
      <span className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <Icon size={14} />
        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
      </span>
    );
  };

  const renderMetricCard = (icon, label, value, unit, diff = null, highlight = false) => (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 text-gray-600 mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${highlight ? 'text-teal-700' : 'text-gray-800'}`}>
          {value || '-'}
        </span>
        {unit && <span className="text-gray-500 text-sm">{unit}</span>}
        {diff}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Minha Avaliação Física</h1>
          <p className="text-gray-600">Acompanhe sua evolução física ao longo do tempo</p>
        </div>

        {assessments.length === 0 ? (
          <Card className="p-8 text-center">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">Nenhuma avaliação disponível</h3>
            <p className="text-gray-500 mt-2">Seu profissional ainda não registrou avaliações físicas.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {assessments.map((assessment, index) => {
              const previousAssessment = assessments[index + 1];
              const isExpanded = expandedId === assessment.id;
              const imcClass = getIMCClassification(assessment.bmi);
              
              return (
                <Card key={assessment.id} className="overflow-hidden">
                  {/* Header da avaliação */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <span className="font-medium text-gray-800">
                          {new Date(assessment.assessment_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {index === 0 && <Badge className="bg-teal-500">Mais recente</Badge>}
                    </div>
                    <div className="flex items-center gap-4">
                      {assessment.weight && (
                        <span className="text-gray-600">{assessment.weight} kg</span>
                      )}
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </button>

                  {/* Conteúdo expandido */}
                  {isExpanded && (
                    <CardContent className="pt-0 pb-6">
                      {/* Dados Principais */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {renderMetricCard(
                          <Scale className="w-4 h-4" />,
                          'Peso',
                          assessment.weight,
                          'kg',
                          getDiffIndicator(assessment, previousAssessment, 'weight', true),
                          true
                        )}
                        {renderMetricCard(
                          <Ruler className="w-4 h-4" />,
                          'Altura',
                          assessment.height,
                          'cm'
                        )}
                        <div className={`p-4 rounded-lg bg-${imcClass.color}-50 border border-${imcClass.color}-200`}>
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="text-sm">IMC</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-800">{assessment.bmi || '-'}</span>
                            <Badge className={`bg-${imcClass.color}-500`}>{imcClass.label}</Badge>
                          </div>
                        </div>
                        {assessment.body_fat_percentage && renderMetricCard(
                          <Activity className="w-4 h-4" />,
                          '% Gordura',
                          assessment.body_fat_percentage,
                          '%',
                          getDiffIndicator(assessment, previousAssessment, 'body_fat_percentage', true),
                          true
                        )}
                      </div>

                      {/* Circunferências */}
                      {(assessment.waist || assessment.hip || assessment.chest || assessment.abdomen) && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Ruler className="w-4 h-4 text-blue-600" /> Circunferências
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {assessment.waist && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <span className="text-xs text-gray-600">Cintura</span>
                                <div className="font-semibold text-gray-800">{assessment.waist} cm</div>
                              </div>
                            )}
                            {assessment.hip && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <span className="text-xs text-gray-600">Quadril</span>
                                <div className="font-semibold text-gray-800">{assessment.hip} cm</div>
                              </div>
                            )}
                            {assessment.chest && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <span className="text-xs text-gray-600">Tórax</span>
                                <div className="font-semibold text-gray-800">{assessment.chest} cm</div>
                              </div>
                            )}
                            {assessment.abdomen && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <span className="text-xs text-gray-600">Abdômen</span>
                                <div className="font-semibold text-gray-800">{assessment.abdomen} cm</div>
                              </div>
                            )}
                            {assessment.arm_right && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <span className="text-xs text-gray-600">Braço D</span>
                                <div className="font-semibold text-gray-800">{assessment.arm_right} cm</div>
                              </div>
                            )}
                            {assessment.arm_left && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <span className="text-xs text-gray-600">Braço E</span>
                                <div className="font-semibold text-gray-800">{assessment.arm_left} cm</div>
                              </div>
                            )}
                            {assessment.thigh_right && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <span className="text-xs text-gray-600">Coxa D</span>
                                <div className="font-semibold text-gray-800">{assessment.thigh_right} cm</div>
                              </div>
                            )}
                            {assessment.thigh_left && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <span className="text-xs text-gray-600">Coxa E</span>
                                <div className="font-semibold text-gray-800">{assessment.thigh_left} cm</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Composição Corporal */}
                      {(assessment.lean_mass || assessment.fat_mass || assessment.muscle_mass) && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-purple-600" /> Composição Corporal
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {assessment.lean_mass && (
                              <div className="p-3 bg-purple-50 rounded-lg">
                                <span className="text-xs text-gray-600">Massa Magra</span>
                                <div className="font-semibold text-gray-800">{assessment.lean_mass} kg</div>
                              </div>
                            )}
                            {assessment.fat_mass && (
                              <div className="p-3 bg-purple-50 rounded-lg">
                                <span className="text-xs text-gray-600">Massa Gorda</span>
                                <div className="font-semibold text-gray-800">{assessment.fat_mass} kg</div>
                              </div>
                            )}
                            {assessment.muscle_mass && (
                              <div className="p-3 bg-purple-50 rounded-lg">
                                <span className="text-xs text-gray-600">Massa Muscular</span>
                                <div className="font-semibold text-gray-800">{assessment.muscle_mass} kg</div>
                              </div>
                            )}
                            {assessment.body_water && (
                              <div className="p-3 bg-purple-50 rounded-lg">
                                <span className="text-xs text-gray-600">Água Corporal</span>
                                <div className="font-semibold text-gray-800">{assessment.body_water}%</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dados Vitais */}
                      {(assessment.blood_pressure_systolic || assessment.heart_rate) && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-600" /> Dados Vitais
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {assessment.blood_pressure_systolic && assessment.blood_pressure_diastolic && (
                              <div className="p-3 bg-red-50 rounded-lg">
                                <span className="text-xs text-gray-600">Pressão Arterial</span>
                                <div className="font-semibold text-gray-800">
                                  {assessment.blood_pressure_systolic}/{assessment.blood_pressure_diastolic} mmHg
                                </div>
                              </div>
                            )}
                            {assessment.heart_rate && (
                              <div className="p-3 bg-red-50 rounded-lg">
                                <span className="text-xs text-gray-600">Freq. Cardíaca</span>
                                <div className="font-semibold text-gray-800">{assessment.heart_rate} bpm</div>
                              </div>
                            )}
                            {assessment.basal_metabolic_rate && (
                              <div className="p-3 bg-red-50 rounded-lg">
                                <span className="text-xs text-gray-600">TMB</span>
                                <div className="font-semibold text-gray-800">{assessment.basal_metabolic_rate} kcal</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fotos */}
                      {(assessment.photo_front || assessment.photo_side || assessment.photo_back) && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-700 mb-3">📷 Fotos</h4>
                          <div className="grid grid-cols-3 gap-4">
                            {assessment.photo_front && (
                              <img src={assessment.photo_front} alt="Frontal" className="w-full h-48 object-cover rounded-lg" />
                            )}
                            {assessment.photo_side && (
                              <img src={assessment.photo_side} alt="Lateral" className="w-full h-48 object-cover rounded-lg" />
                            )}
                            {assessment.photo_back && (
                              <img src={assessment.photo_back} alt="Costas" className="w-full h-48 object-cover rounded-lg" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Observações */}
                      {assessment.notes && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-semibold text-gray-700 mb-2">📝 Observações</h4>
                          <p className="text-gray-600">{assessment.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PatientAvaliacaoFisica;
