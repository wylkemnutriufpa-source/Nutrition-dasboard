import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Lightbulb, Heart, Droplets, Apple, Dumbbell, Moon,
  Brain, Star, Search, Loader2, Scale, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const TIP_CATEGORIES = [
  { id: 'all', label: 'Todas', icon: Lightbulb, color: 'from-violet-500 to-purple-600' },
  { id: 'alimentacao', label: 'Alimentação', icon: Apple, color: 'from-green-500 to-emerald-600' },
  { id: 'hidratacao', label: 'Hidratação', icon: Droplets, color: 'from-blue-500 to-cyan-600' },
  { id: 'sono', label: 'Sono', icon: Moon, color: 'from-indigo-500 to-blue-600' },
  { id: 'exercicio', label: 'Exercício', icon: Dumbbell, color: 'from-orange-500 to-red-600' },
  { id: 'mental', label: 'Bem-estar', icon: Brain, color: 'from-pink-500 to-rose-600' },
  { id: 'emagrecimento', label: 'Emagrecimento', icon: Scale, color: 'from-teal-500 to-emerald-600' },
  { id: 'habitos', label: 'Hábitos', icon: Heart, color: 'from-red-500 to-pink-600' },
];

const PatientDicas = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTip, setExpandedTip] = useState(null);

  const loadTips = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_tips')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (!error && data?.length > 0) {
        setTips(data);
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTips(); }, [loadTips]);

  const filtered = tips.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchTerm && !t.tip.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const featured = filtered.filter(t => t.is_featured);
  const regular = filtered.filter(t => !t.is_featured);

  return (
    <Layout title="Dicas Inteligentes" userType="patient">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Lightbulb className="h-8 w-8 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Dicas Inteligentes</h1>
              <p className="text-violet-200 mt-1">{tips.length} dicas selecionadas pelo seu nutricionista</p>
            </div>
          </div>
        </div>

        {/* Busca + Categorias */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar dicas..." className="pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            {TIP_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat.id ? `bg-gradient-to-r ${cat.color} text-white shadow-lg` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  <Icon size={14} />{cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        )}

        {/* Destaques */}
        {!loading && featured.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" /> Destaques
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featured.map((tip, i) => {
                const cat = TIP_CATEGORIES.find(c => c.id === tip.category) || TIP_CATEGORIES[0];
                const Icon = cat.icon;
                return (
                  <Card key={tip.id || i} className="border-2 border-purple-100 hover:border-purple-300 hover:shadow-lg transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white flex-shrink-0 shadow-md`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px]"><Star className="h-2.5 w-2.5 mr-0.5" />Destaque</Badge>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{tip.tip}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Todas as Dicas */}
        {!loading && regular.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-500" /> Todas as Dicas
            </h2>
            {regular.map((tip, i) => {
              const cat = TIP_CATEGORIES.find(c => c.id === tip.category) || TIP_CATEGORIES[0];
              const Icon = cat.icon;
              const isLong = tip.tip.length > 120;
              const isExpanded = expandedTip === (tip.id || i);
              return (
                <div key={tip.id || i} onClick={() => isLong && setExpandedTip(isExpanded ? null : (tip.id || i))}
                  className="bg-white border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center text-white flex-shrink-0`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm text-gray-700 ${!isExpanded && isLong ? 'line-clamp-2' : ''}`}>{tip.tip}</p>
                      {isLong && (
                        <span className="text-[10px] text-purple-500 mt-1 flex items-center gap-0.5">
                          {isExpanded ? <><ChevronUp className="h-3 w-3" />Menos</> : <><ChevronDown className="h-3 w-3" />Mais</>}
                        </span>
                      )}
                    </div>
                    <Badge className="bg-gray-50 text-gray-400 border-0 text-[9px] flex-shrink-0">{cat.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma dica encontrada</p>
          </div>
        )}
      </div>
    </Layout>
  );
};


export default PatientDicas;
