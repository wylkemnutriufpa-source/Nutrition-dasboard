/**
 * GlobalTipsPage.js
 * Dicas Globais - Visível para TODOS os usuários
 * Editável pelo ADM (criar, editar, excluir)
 * Visual premium com categorias
 */
import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Lightbulb, Plus, Edit, Trash2, Search, Loader2, Star,
  Apple, Droplets, Moon, Dumbbell, Brain, Heart, Scale, Utensils,
  ChevronDown, ChevronUp, ShieldCheck, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Categorias de dicas
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

// Dicas padrão pré-carregadas (do documento DICAS_PARA_EMAGRECER)
const DEFAULT_TIPS = [
  { tip: 'Para que você saiba qual o regime ideal, procure observar se ele é balanceado, contendo alimentos que possuam todos os nutrientes essenciais para o bom funcionamento do organismo, em quantidades adequadas e equilibradas.', category: 'alimentacao', is_featured: true },
  { tip: 'A quantidade de calorias fornecida ao corpo precisa estar equilibrada de acordo com a necessidade energética do organismo.', category: 'alimentacao' },
  { tip: 'Não existem alimentos específicos que sejam proibidos em uma dieta: apenas deve-se tomar cuidado em não ingerir alimentos muito calóricos (doces, refrigerantes, bebidas alcoólicas, frituras, massas).', category: 'alimentacao', is_featured: true },
  { tip: 'Procure fazer as refeições nos horários corretos, não deixando de realizar nenhuma refeição: o sucesso da dieta depende só de você.', category: 'habitos' },
  { tip: 'É importante que o emagrecimento não seja rápido e brusco. Isso pode acarretar fraqueza e até doenças mais graves.', category: 'emagrecimento', is_featured: true },
  { tip: 'Para saber seu peso ideal, divida seu peso (kg) pela sua altura (m) ao quadrado. São normais resultados entre 20 e 24 para mulheres e 25 para homens.', category: 'emagrecimento' },
  { tip: 'A maneira mais eficiente de manter o peso ideal é através da reeducação alimentar: ensine seu organismo a se alimentar bem e de modo correto.', category: 'alimentacao', is_featured: true },
  { tip: 'Procure ingerir muita água à vontade: um dos benefícios é a redução de celulite, entre outros.', category: 'hidratacao', is_featured: true },
  { tip: 'Cuidado com os produtos diet e light. Saiba as diferenças entre eles. Eles não estão liberados e devem ser consumidos com moderação.', category: 'alimentacao' },
  { tip: 'Cuidado com a geladeira à noite: refeições noturnas não são bem-vindas, pois você gasta pouquíssima energia neste período.', category: 'habitos', is_featured: true },
  { tip: 'Pense no seu corpo como se fosse um templo sagrado, que deve ser respeitado e tratado com muito cuidado e carinho.', category: 'mental' },
  { tip: 'Imagine você dentro daquela calça jeans esquecida há tempos no seu guarda-roupas, e no quanto você ficará maravilhoso(a) dentro dela.', category: 'mental' },
  { tip: 'Frutas e verduras são fontes de vitaminas; carnes vermelhas e de aves proporcionam força muscular. Não deixe faltar nenhum deles nas suas refeições principais.', category: 'alimentacao' },
  { tip: 'Diminua muito o consumo de glicídios (açúcares). Eles são responsáveis pelo aumento do peso corporal. Elimine os lipídeos (gorduras) provenientes de frituras e cremes.', category: 'emagrecimento', is_featured: true },
  { tip: 'Nunca pense em problemas durante as refeições. Isso levaria você a não saborear os alimentos e automaticamente a comê-los de forma desenfreada.', category: 'mental' },
  { tip: 'Afaste-se da balança: ela pode ser prejudicial ao sucesso da sua dieta, causando ansiedade.', category: 'mental', is_featured: true },
  { tip: 'As dietas, após um certo tempo, sofrem um efeito de estagnação, ou seja, você poderá parar de perder peso por algum tempo. Isso é normal!', category: 'emagrecimento' },
  { tip: 'Não transforme a dieta na coisa mais importante da sua vida. A verdadeira beleza está dentro de você.', category: 'mental' },
  { tip: 'Procure dividir seu tempo durante o dia para não ficar obcecado pela dieta: ocupe-se com trabalho, filhos, passeios.', category: 'habitos' },
  { tip: 'Não fique muito tempo sem se alimentar, pois pode causar prejuízos ao seu metabolismo.', category: 'alimentacao', is_featured: true },
  { tip: 'Evite as frituras e valorize os assados.', category: 'alimentacao' },
  { tip: 'Não esqueça do lanche da tarde, para não abusar no jantar.', category: 'habitos' },
  { tip: 'Substitua o leite integral pelo desnatado.', category: 'alimentacao' },
  { tip: 'Nunca coma até sentir-se cheio(a).', category: 'alimentacao' },
  { tip: 'Coma com o estômago e não com as emoções. Compense a ansiedade praticando esportes.', category: 'mental', is_featured: true },
  { tip: 'Ninguém é gordo porque quer. Lembre-se que isso pode ser mudado a qualquer tempo.', category: 'mental' },
  { tip: 'A obesidade é considerada uma doença e deve ser tratada como tal, consultando-se um especialista.', category: 'emagrecimento' },
];

const GlobalTipsPage = () => {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTip, setEditingTip] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedTip, setExpandedTip] = useState(null);
  
  // Form
  const [formTip, setFormTip] = useState('');
  const [formCategory, setFormCategory] = useState('alimentacao');
  const [formFeatured, setFormFeatured] = useState(false);

  const loadTips = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar dicas do banco (global_tips)
      const { data, error } = await supabase
        .from('global_tips')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setTips(data);
      } else {
        // Se não há dicas no banco, usar as DEFAULT (pré-populadas)
        setTips(DEFAULT_TIPS.map((t, i) => ({
          id: `default-${i}`,
          ...t,
          is_active: true,
          is_default: true,
          created_at: new Date().toISOString()
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar dicas:', err);
      // Fallback para defaults
      setTips(DEFAULT_TIPS.map((t, i) => ({
        id: `default-${i}`,
        ...t,
        is_active: true,
        is_default: true,
        created_at: new Date().toISOString()
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTips(); }, [loadTips]);

  // Seed dicas padrão no banco (ADM)
  const seedDefaultTips = async () => {
    setSaving(true);
    try {
      const inserts = DEFAULT_TIPS.map(t => ({
        id: crypto.randomUUID(),
        professional_id: user.id,
        tip: t.tip,
        category: t.category,
        is_featured: t.is_featured || false,
        is_active: true
      }));
      
      const { error } = await supabase.from('global_tips').insert(inserts);
      if (error) throw error;
      toast.success(`${inserts.length} dicas carregadas no banco!`);
      loadTips();
    } catch (err) {
      console.error('Erro ao popular dicas:', err);
      toast.error('Erro ao carregar dicas no banco');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formTip.trim()) { toast.error('Dica não pode ser vazia'); return; }
    setSaving(true);
    try {
      if (editingTip && !editingTip.is_default) {
        // Atualizar
        const { error } = await supabase
          .from('global_tips')
          .update({ tip: formTip, category: formCategory, is_featured: formFeatured })
          .eq('id', editingTip.id);
        if (error) throw error;
        toast.success('Dica atualizada!');
      } else {
        // Criar nova
        const { error } = await supabase
          .from('global_tips')
          .insert({
            id: crypto.randomUUID(),
            professional_id: user.id,
            tip: formTip,
            category: formCategory,
            is_featured: formFeatured,
            is_active: true
          });
        if (error) throw error;
        toast.success('Dica criada!');
      }
      setShowModal(false);
      setEditingTip(null);
      loadTips();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar dica');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tip) => {
    if (tip.is_default) { toast.info('Dica padrão. Popule o banco primeiro.'); return; }
    try {
      const { error } = await supabase
        .from('global_tips')
        .update({ is_active: false })
        .eq('id', tip.id);
      if (error) throw error;
      toast.success('Dica removida');
      loadTips();
    } catch (err) {
      toast.error('Erro ao remover');
    }
  };

  const openEdit = (tip) => {
    setEditingTip(tip);
    setFormTip(tip.tip);
    setFormCategory(tip.category || 'alimentacao');
    setFormFeatured(tip.is_featured || false);
    setShowModal(true);
  };

  const openNew = () => {
    setEditingTip(null);
    setFormTip('');
    setFormCategory('alimentacao');
    setFormFeatured(false);
    setShowModal(true);
  };

  // Filtrar
  const filtered = tips.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchTerm && !t.tip.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const featured = filtered.filter(t => t.is_featured);
  const regular = filtered.filter(t => !t.is_featured);

  return (
    <Layout title="Dicas Inteligentes" showBack userType={profile?.role === 'patient' ? 'patient' : 'professional'}>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Premium */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <Lightbulb className="h-8 w-8 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Dicas Inteligentes</h1>
                <p className="text-violet-200 mt-1">
                  {tips.length} dicas selecionadas para uma vida mais saudável
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {tips.some(t => t.is_default) && (
                  <Button onClick={seedDefaultTips} disabled={saving} variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Sparkles className="h-4 w-4 mr-2" /> Salvar no Banco
                  </Button>
                )}
                <Button onClick={openNew} className="bg-white text-purple-700 hover:bg-white/90">
                  <Plus className="h-4 w-4 mr-2" /> Nova Dica
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Busca + Categorias */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar dicas..."
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TIP_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const count = tips.filter(t => cat.id === 'all' || t.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat.id
                      ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={14} />
                  {cat.label}
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        )}

        {/* Dicas Destaque */}
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
                  <Card key={tip.id || i} className="border-2 border-purple-100 hover:border-purple-300 transition-all hover:shadow-lg group">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white flex-shrink-0 shadow-md`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px]">
                              <Star className="h-2.5 w-2.5 mr-0.5" /> Destaque
                            </Badge>
                            <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">{cat.label}</Badge>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{tip.tip}</p>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tip)}>
                              <Edit className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(tip)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Todas as dicas */}
        {!loading && regular.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-500" /> Todas as Dicas
            </h2>
            <div className="space-y-2">
              {regular.map((tip, i) => {
                const cat = TIP_CATEGORIES.find(c => c.id === tip.category) || TIP_CATEGORIES[0];
                const Icon = cat.icon;
                const isExpanded = expandedTip === (tip.id || i);
                const isLong = tip.tip.length > 120;
                return (
                  <div
                    key={tip.id || i}
                    className="bg-white border rounded-xl p-4 hover:shadow-md transition-all group cursor-pointer"
                    onClick={() => isLong && setExpandedTip(isExpanded ? null : (tip.id || i))}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center text-white flex-shrink-0`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm text-gray-700 ${!isExpanded && isLong ? 'line-clamp-2' : ''}`}>
                          {tip.tip}
                        </p>
                        {isLong && (
                          <button className="text-[10px] text-purple-500 mt-1 flex items-center gap-0.5">
                            {isExpanded ? <><ChevronUp className="h-3 w-3" /> Menos</> : <><ChevronDown className="h-3 w-3" /> Mais</>}
                          </button>
                        )}
                      </div>
                      <Badge className="bg-gray-50 text-gray-400 border-0 text-[9px] flex-shrink-0">{cat.label}</Badge>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(tip); }}>
                            <Edit className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDelete(tip); }}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma dica encontrada</p>
          </div>
        )}

        {/* Modal de Criação/Edição (ADM) */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-purple-600" />
                {editingTip ? 'Editar Dica' : 'Nova Dica'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Dica *</Label>
                <Textarea
                  value={formTip}
                  onChange={(e) => setFormTip(e.target.value)}
                  placeholder="Digite a dica de saúde..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TIP_CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setFormCategory(cat.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          formCategory === cat.id
                            ? `bg-gradient-to-r ${cat.color} text-white`
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon size={12} /> {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formFeatured}
                  onChange={(e) => setFormFeatured(e.target.checked)}
                  className="rounded"
                  id="featured-check"
                />
                <Label htmlFor="featured-check" className="flex items-center gap-1 cursor-pointer">
                  <Star className="h-4 w-4 text-yellow-500" /> Marcar como destaque
                </Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingTip ? 'Atualizar' : 'Criar Dica'}
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default GlobalTipsPage;
