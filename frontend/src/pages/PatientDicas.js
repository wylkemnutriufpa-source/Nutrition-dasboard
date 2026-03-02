import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, Heart, Droplet, Apple, Dumbbell, Moon,
  Brain, Leaf, Star, BookOpen, ChevronRight, Loader2,
  ThumbsUp, Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const PatientDicas = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState([]);
  const [personalizedTip, setPersonalizedTip] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [likedTips, setLikedTips] = useState(new Set());

  const patientId = user?.id || profile?.id || localStorage.getItem('fitjourney_patient_id');

  // Dicas padrão
  const defaultTips = [
    {
      id: 1,
      category: 'hydration',
      title: 'Hidratação é Fundamental',
      content: 'Beba pelo menos 2 litros de água por dia. Uma dica é manter uma garrafa sempre por perto e estabelecer horários para beber água.',
      icon: Droplet,
      color: 'blue',
      importance: 'high'
    },
    {
      id: 2,
      category: 'nutrition',
      title: 'Não Pule o Café da Manhã',
      content: 'O café da manhã "acorda" seu metabolismo. Inclua proteínas, carboidratos complexos e frutas para ter energia durante toda a manhã.',
      icon: Apple,
      color: 'green',
      importance: 'high'
    },
    {
      id: 3,
      category: 'exercise',
      title: 'Movimento Diário',
      content: 'Mesmo 30 minutos de caminhada fazem diferença. Escolha uma atividade que você goste para manter a consistência.',
      icon: Dumbbell,
      color: 'orange',
      importance: 'medium'
    },
    {
      id: 4,
      category: 'sleep',
      title: 'Sono de Qualidade',
      content: 'Durma de 7 a 9 horas por noite. Evite telas 1 hora antes de dormir e mantenha o quarto escuro e fresco.',
      icon: Moon,
      color: 'purple',
      importance: 'high'
    },
    {
      id: 5,
      category: 'mindfulness',
      title: 'Coma com Atenção',
      content: 'Evite distrações durante as refeições. Mastigue devagar e preste atenção nos sinais de saciedade do seu corpo.',
      icon: Brain,
      color: 'teal',
      importance: 'medium'
    },
    {
      id: 6,
      category: 'nutrition',
      title: 'Vegetais em Todas as Refeições',
      content: 'Tente incluir pelo menos uma porção de vegetais em cada refeição principal. Eles são ricos em fibras, vitaminas e minerais.',
      icon: Leaf,
      color: 'green',
      importance: 'high'
    },
    {
      id: 7,
      category: 'habits',
      title: 'Planeje Suas Refeições',
      content: 'Reserve um momento no domingo para planejar as refeições da semana. Isso evita decisões impulsivas e ajuda a manter o foco.',
      icon: BookOpen,
      color: 'indigo',
      importance: 'medium'
    },
    {
      id: 8,
      category: 'mindfulness',
      title: 'Celebre Pequenas Vitórias',
      content: 'Cada escolha saudável conta! Celebre seu progresso, mesmo que pareça pequeno. Consistência é mais importante que perfeição.',
      icon: Star,
      color: 'yellow',
      importance: 'medium'
    },
    {
      id: 9,
      category: 'hydration',
      title: 'Água Antes das Refeições',
      content: 'Beber um copo de água 30 minutos antes das refeições pode ajudar na digestão e na sensação de saciedade.',
      icon: Droplet,
      color: 'blue',
      importance: 'medium'
    },
    {
      id: 10,
      category: 'nutrition',
      title: 'Proteína em Cada Refeição',
      content: 'A proteína ajuda a manter a saciedade por mais tempo e é essencial para a manutenção muscular durante o emagrecimento.',
      icon: Apple,
      color: 'red',
      importance: 'high'
    }
  ];

  const categories = [
    { id: 'all', name: 'Todas', icon: Lightbulb },
    { id: 'nutrition', name: 'Nutrição', icon: Apple },
    { id: 'hydration', name: 'Hidratação', icon: Droplet },
    { id: 'exercise', name: 'Exercícios', icon: Dumbbell },
    { id: 'sleep', name: 'Sono', icon: Moon },
    { id: 'mindfulness', name: 'Mindfulness', icon: Brain },
    { id: 'habits', name: 'Hábitos', icon: BookOpen }
  ];

  useEffect(() => {
    loadTips();
    loadLiked();
  }, [patientId]);

  const loadTips = async () => {
    setLoading(true);
    try {
      // Primeiro, buscar dica personalizada do paciente
      const { data: personalData } = await supabase
        .from('tips')
        .select('*')
        .eq('patient_id', patientId)
        .eq('category', 'personalized')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (personalData) {
        setPersonalizedTip(personalData);
      }

      // Buscar outras dicas do profissional para este paciente
      const { data: patientTips } = await supabase
        .from('tips')
        .select('*')
        .eq('patient_id', patientId)
        .neq('category', 'personalized')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Buscar dicas gerais
      const { data: generalTips, error } = await supabase
        .from('nutrition_tips')
        .select('*')
        .eq('is_active', true);

      // Combinar dicas
      let allTips = [];
      
      if (patientTips && patientTips.length > 0) {
        allTips = [...allTips, ...patientTips.map(t => ({
          ...t,
          isFromProfessional: true
        }))];
      }

      if (!error && generalTips && generalTips.length > 0) {
        allTips = [...allTips, ...generalTips];
      }

      if (allTips.length === 0) {
        setTips(defaultTips);
      } else {
        setTips(allTips);
      }
    } catch (error) {
      console.error('Erro:', error);
      setTips(defaultTips);
    } finally {
      setLoading(false);
    }
  };

  const loadLiked = () => {
    const saved = localStorage.getItem(`liked_tips_${patientId}`);
    if (saved) {
      setLikedTips(new Set(JSON.parse(saved)));
    }
  };

  const toggleLike = (tipId) => {
    const newLiked = new Set(likedTips);
    if (newLiked.has(tipId)) {
      newLiked.delete(tipId);
    } else {
      newLiked.add(tipId);
      toast.success('Dica salva nos favoritos! 💡');
    }
    setLikedTips(newLiked);
    localStorage.setItem(`liked_tips_${patientId}`, JSON.stringify(Array.from(newLiked)));
  };

  const shareTip = (tip) => {
    const text = `💡 Dica de Saúde - ${tip.title}\n\n${tip.content}\n\n📱 FitJourney - Sua jornada para uma vida mais saudável`;
    
    if (navigator.share) {
      navigator.share({ title: tip.title, text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Dica copiada!');
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', icon: 'bg-blue-100' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', icon: 'bg-green-100' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', icon: 'bg-orange-100' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', icon: 'bg-purple-100' },
      teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', icon: 'bg-teal-100' },
      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', icon: 'bg-indigo-100' },
      yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', icon: 'bg-yellow-100' },
      red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: 'bg-red-100' }
    };
    return colors[color] || colors.teal;
  };

  const filteredTips = tips.filter(tip => 
    selectedCategory === 'all' || tip.category === selectedCategory
  );

  if (loading) {
    return (
      <Layout title="Dicas" userType="patient">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dicas" userType="patient">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Dicas de Saúde</h2>
                <p className="text-amber-100">
                  Pequenas mudanças, grandes resultados!
                </p>
              </div>
              <Lightbulb className="h-12 w-12 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        {/* Filtro de categorias */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? 'bg-teal-600 hover:bg-teal-700' : ''}
              >
                <Icon className="h-4 w-4 mr-1" />
                {cat.name}
              </Button>
            );
          })}
        </div>

        {/* ✨ DICA PERSONALIZADA - DESTAQUE ESPECIAL */}
        {personalizedTip && (
          <Card className="bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm animate-pulse">
                  <Star className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-white/25 text-white border-white/30">
                      ✨ Mensagem Especial para Você
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{personalizedTip.title}</h3>
                  <p className="text-white/90 leading-relaxed text-lg">
                    {personalizedTip.content}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-white/70 text-sm">
                    <Heart className="h-4 w-4" />
                    <span>Criada especialmente para você pelo seu nutricionista</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dica em destaque */}
        {filteredTips.length > 0 && filteredTips[0].importance === 'high' && (
          <Card className="bg-gradient-to-br from-teal-500 to-green-500 text-white">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Star className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <Badge className="bg-white/20 text-white mb-2">Dica em Destaque</Badge>
                  <h3 className="text-xl font-bold mb-2">{filteredTips[0].title}</h3>
                  <p className="text-teal-100">{filteredTips[0].content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid de dicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTips.slice(filteredTips[0]?.importance === 'high' ? 1 : 0).map((tip) => {
            const colors = getColorClasses(tip.color);
            const Icon = tip.icon || Lightbulb;
            const isLiked = likedTips.has(tip.id);

            return (
              <Card 
                key={tip.id} 
                className={`${colors.bg} ${colors.border} border hover:shadow-md transition-all`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colors.icon}`}>
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{tip.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{tip.content}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLike(tip.id)}
                          className={isLiked ? 'text-red-500' : 'text-gray-400'}
                        >
                          <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                          {isLiked ? 'Salvo' : 'Salvar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => shareTip(tip)}
                          className="text-gray-400"
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Compartilhar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTips.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium mb-2">Nenhuma dica nesta categoria</p>
              <p className="text-sm text-gray-400">
                Selecione outra categoria para ver mais dicas
              </p>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium text-purple-800 mb-2">
              💪 Lembre-se: consistência é mais importante que perfeição!
            </p>
            <p className="text-purple-600">
              Cada pequena escolha saudável te aproxima dos seus objetivos.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PatientDicas;
