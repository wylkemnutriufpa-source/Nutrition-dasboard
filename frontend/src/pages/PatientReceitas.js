import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChefHat, Clock, Users, Flame, Search, Heart, 
  BookOpen, Star, Filter, Loader2, UtensilsCrossed, ArrowLeft,
  Sparkles, Plus, X, AlertCircle, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getVisibleRecipesForPatient, getAnamnesis } from '@/lib/supabase';

// ===== SMART RECIPE SUGGESTER (busca do banco + compatibilidade) =====
const calculateCompatibility = (recipe, patientIngredients, patientRestrictions, mealTarget) => {
  let score = 100;
  const warnings = [];
  const positives = [];

  // 1) Ingredientes do paciente vs receita
  if (patientIngredients.length > 0) {
    const recipeIngredients = `${recipe.ingredients || ''} ${recipe.name || ''}`.toLowerCase();
    let matchCount = 0;
    patientIngredients.forEach(ing => {
      if (recipeIngredients.includes(ing.toLowerCase())) matchCount++;
    });
    const ingredientScore = Math.round((matchCount / patientIngredients.length) * 100);
    if (ingredientScore >= 80) positives.push(`${ingredientScore}% dos seus ingredientes`);
    else if (ingredientScore < 50) warnings.push(`Apenas ${ingredientScore}% dos seus ingredientes`);
    score = Math.min(score, ingredientScore);
  }

  // 2) Restrições alimentares
  if (patientRestrictions.length > 0) {
    const recipeText = `${recipe.name} ${recipe.ingredients} ${recipe.description || ''}`.toLowerCase();
    patientRestrictions.forEach(r => {
      if (recipeText.includes(r.toLowerCase())) {
        score = Math.max(score - 30, 10);
        warnings.push(`Contém "${r}" (restrição)`);
      }
    });
  }

  // 3) Compatibilidade calórica
  if (mealTarget?.kcal && recipe.calories) {
    const diff = Math.abs(recipe.calories - mealTarget.kcal);
    const pct = mealTarget.kcal > 0 ? (diff / mealTarget.kcal) * 100 : 0;
    if (pct <= 15) positives.push('Calorias adequadas');
    else if (pct > 40) {
      score = Math.max(score - 20, 10);
      warnings.push(`${recipe.calories}kcal (meta: ~${mealTarget.kcal}kcal)`);
    }
  }

  if (mealTarget?.category && recipe.category === mealTarget.category) {
    positives.push('Categoria compatível');
  }

  return { score: Math.max(0, Math.min(100, score)), warnings, positives };
};

const SmartRecipeSuggester = ({ patientId }) => {
  const [ingredients, setIngredients] = useState([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [loading, setLoading] = useState(false);
  const [allRecipes, setAllRecipes] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [patientRestrictions, setPatientRestrictions] = useState([]);
  const [mealTarget, setMealTarget] = useState(null);
  const [targetMeal, setTargetMeal] = useState('all');
  const [searched, setSearched] = useState(false);

  const mealCategories = [
    { id: 'all', label: 'Todas' },
    { id: 'cafe_manha', label: 'Café' },
    { id: 'lanche_manha', label: 'Lanche AM' },
    { id: 'almoco', label: 'Almoço' },
    { id: 'lanche_tarde', label: 'Lanche PM' },
    { id: 'jantar', label: 'Jantar' },
    { id: 'ceia', label: 'Ceia' }
  ];

  useEffect(() => {
    if (patientId) loadPatientContext();
  }, [patientId]);

  const loadPatientContext = async () => {
    try {
      const [recipesRes, anamnesisRes, planRes] = await Promise.allSettled([
        getVisibleRecipesForPatient(patientId),
        getAnamnesis(patientId),
        supabase.from('meal_plans').select('daily_targets').eq('patient_id', patientId).eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      ]);
      if (recipesRes.status === 'fulfilled') setAllRecipes(recipesRes.value?.data || []);
      if (anamnesisRes.status === 'fulfilled' && anamnesisRes.value?.data) {
        const an = anamnesisRes.value.data;
        const r = [];
        [an.alergias, an.intolerancia_alimentar, an.restricoes_alimentares, String(an.allergies || '')]
          .forEach(s => { if (s) r.push(...s.split(',').map(x => x.trim()).filter(Boolean)); });
        setPatientRestrictions(r);
      }
      if (planRes.status === 'fulfilled' && planRes.value?.data?.daily_targets) {
        const dt = planRes.value.data.daily_targets;
        setMealTarget({ kcal: Math.round((dt.kcal || 2000) / 5), totalKcal: dt.kcal });
      }
    } catch (err) { console.error('Erro contexto:', err); }
  };

  const addIngredient = () => {
    const val = currentIngredient.trim();
    if (!val || ingredients.includes(val) || ingredients.length >= 15) return;
    setIngredients([...ingredients, val]);
    setCurrentIngredient('');
  };

  const searchRecipes = () => {
    setLoading(true);
    setSearched(true);
    try {
      let filtered = targetMeal !== 'all' ? allRecipes.filter(r => r.category === targetMeal) : allRecipes;
      const scored = filtered.map(recipe => {
        const target = targetMeal !== 'all' ? { ...mealTarget, category: targetMeal } : mealTarget;
        return { ...recipe, compatibility: calculateCompatibility(recipe, ingredients, patientRestrictions, target) };
      });
      scored.sort((a, b) => b.compatibility.score - a.compatibility.score);
      let results = scored;
      if (ingredients.length > 0) {
        const matched = scored.filter(r => {
          const txt = (r.ingredients || '').toLowerCase();
          return ingredients.some(ing => txt.includes(ing.toLowerCase()));
        });
        if (matched.length > 0) results = matched;
      }
      setSuggestions(results.slice(0, 20));
      if (results.length === 0) toast.info('Nenhuma receita encontrada. Tente outros filtros.');
      else toast.success(`${Math.min(results.length, 20)} receita(s) encontrada(s)!`);
    } catch (err) { console.error('Erro busca:', err); }
    finally { setLoading(false); }
  };

  const getScoreColor = (s) => s >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s >= 50 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
  const getScoreIcon = (s) => s >= 80 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : s >= 50 ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />;

  if (selectedSuggestion) {
    const c = selectedSuggestion.compatibility || { score: 100, warnings: [], positives: [] };
    return (
      <Card className="border-2 border-teal-200 shadow-lg">
        <CardContent className="pt-6 space-y-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedSuggestion(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <ChefHat className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{selectedSuggestion.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`border text-xs ${getScoreColor(c.score)}`}>{getScoreIcon(c.score)}<span className="ml-1">{c.score}% compatível</span></Badge>
              </div>
            </div>
          </div>
          {c.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-bold text-amber-800 mb-1"><AlertTriangle className="h-3 w-3 inline mr-1" />Atenção:</p>
              {c.warnings.map((w, i) => <p key={i} className="text-xs text-amber-700">• {w}</p>)}
            </div>
          )}
          {c.positives.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              {c.positives.map((p, i) => <p key={i} className="text-xs text-emerald-700"><CheckCircle2 className="h-3 w-3 inline mr-1" />{p}</p>)}
            </div>
          )}
          <div className="flex gap-3 text-sm text-gray-600 flex-wrap">
            {selectedSuggestion.calories && <span className="flex items-center gap-1"><Flame className="h-4 w-4 text-orange-500" />{selectedSuggestion.calories} kcal</span>}
            {selectedSuggestion.prep_time && <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-blue-500" />{selectedSuggestion.prep_time} min</span>}
            {selectedSuggestion.servings && <span className="flex items-center gap-1"><Users className="h-4 w-4 text-purple-500" />{selectedSuggestion.servings} porções</span>}
          </div>
          {selectedSuggestion.ingredients && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><ChefHat className="h-4 w-4 text-teal-600" /> Ingredientes</h4>
              <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3">{selectedSuggestion.ingredients}</div>
            </div>
          )}
          {selectedSuggestion.instructions && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4 text-teal-600" /> Modo de Preparo</h4>
              <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3">{selectedSuggestion.instructions}</div>
            </div>
          )}
          {selectedSuggestion.description && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
              <p className="text-sm text-teal-800">{selectedSuggestion.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50/30 to-emerald-50/30 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Search className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Buscar Receita com o que tenho em casa</h3>
              <p className="text-xs text-gray-500">Busca inteligente em {allRecipes.length} receitas • Score de compatibilidade</p>
            </div>
          </div>
          {patientRestrictions.length > 0 && (
            <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]">
              <ShieldCheck className="h-3 w-3 mr-1" />{patientRestrictions.length} restrição(ões)
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {mealCategories.map(cat => (
            <button key={cat.id} onClick={() => setTargetMeal(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${targetMeal === cat.id ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >{cat.label}</button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <Input value={currentIngredient} onChange={(e) => setCurrentIngredient(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
            placeholder="Digite um ingrediente (ex: frango, arroz, tomate...)" className="flex-1" />
          <Button onClick={addIngredient} size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
        </div>
        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {ingredients.map((ing, i) => (
              <Badge key={i} className="bg-teal-100 text-teal-800 border-0 pl-2 pr-1 py-1 flex items-center gap-1">
                {ing}
                <button onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))} className="ml-1 hover:text-red-600"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        )}
        <Button onClick={searchRecipes} disabled={loading} className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:opacity-90">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Buscando...</> : <><Search className="h-4 w-4 mr-2" />Buscar Receitas Compatíveis</>}
        </Button>
        <div className="flex items-center gap-2 mt-3 text-xs text-purple-600 bg-purple-50 rounded-lg p-2 border border-purple-200">
          <Sparkles className="h-3 w-3 flex-shrink-0" />
          <span><strong>Em breve (PRO):</strong> Gerador de receitas com IA personalizada</span>
        </div>
        {searched && suggestions.length === 0 && !loading && (
          <div className="mt-4 text-center py-6 bg-gray-50 rounded-xl">
            <UtensilsCrossed className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhuma receita encontrada.</p>
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">{suggestions.length} receita(s)</h4>
              <Badge className="bg-teal-50 text-teal-600 border-0 text-[10px]">Por compatibilidade</Badge>
            </div>
            {suggestions.map((recipe, i) => {
              const c = recipe.compatibility || { score: 100, warnings: [] };
              return (
                <div key={recipe.id || i} onClick={() => setSelectedSuggestion(recipe)}
                  className="flex items-center justify-between bg-white border rounded-xl p-3 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${getScoreColor(c.score)}`}>
                      <span className="text-xs font-bold">{c.score}%</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{recipe.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {recipe.calories && <span>{recipe.calories} kcal</span>}
                        {recipe.prep_time && <span>• {recipe.prep_time} min</span>}
                      </div>
                      {c.warnings.length > 0 && <p className="text-[10px] text-amber-600 mt-0.5"><AlertTriangle className="h-2.5 w-2.5 inline mr-1" />{c.warnings[0]}</p>}
                    </div>
                  </div>
                  {getScoreIcon(c.score)}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const PatientReceitas = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const patientId = user?.id || profile?.id || localStorage.getItem('fitjourney_patient_id');

  // Receitas de exemplo (podem vir do banco depois)
  const defaultRecipes = [
    {
      id: 1,
      name: 'Omelete de Claras com Espinafre',
      category: 'cafe-da-manha',
      time: 10,
      servings: 1,
      calories: 180,
      image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400',
      ingredients: ['3 claras de ovo', '1 xícara de espinafre', 'Sal e pimenta a gosto', '1 colher de azeite'],
      instructions: [
        'Bata as claras em uma tigela',
        'Aqueça o azeite em uma frigideira antiaderente',
        'Adicione o espinafre e refogue por 1 minuto',
        'Despeje as claras sobre o espinafre',
        'Cozinhe em fogo baixo até firmar',
        'Dobre e sirva'
      ],
      tips: 'Você pode adicionar tomate cereja para mais sabor!'
    },
    {
      id: 2,
      name: 'Salada de Frango Grelhado',
      category: 'almoco',
      time: 20,
      servings: 2,
      calories: 350,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      ingredients: ['200g peito de frango', 'Mix de folhas verdes', '1 tomate', '1/2 pepino', 'Azeite e limão'],
      instructions: [
        'Tempere o frango com sal e pimenta',
        'Grelhe em fogo médio por 6 min cada lado',
        'Lave e corte os vegetais',
        'Fatie o frango e coloque sobre as folhas',
        'Tempere com azeite e limão'
      ],
      tips: 'Deixe o frango descansar 3 minutos antes de fatiar!'
    },
    {
      id: 3,
      name: 'Smoothie de Banana e Aveia',
      category: 'lanche',
      time: 5,
      servings: 1,
      calories: 250,
      image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400',
      ingredients: ['1 banana congelada', '1 colher de aveia', '200ml leite desnatado', '1 colher de mel'],
      instructions: [
        'Coloque todos os ingredientes no liquidificador',
        'Bata até ficar cremoso',
        'Sirva imediatamente'
      ],
      tips: 'Congele a banana em rodelas para um smoothie mais cremoso!'
    },
    {
      id: 4,
      name: 'Peixe Assado com Legumes',
      category: 'jantar',
      time: 35,
      servings: 2,
      calories: 280,
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
      ingredients: ['2 filés de tilápia', 'Abobrinha', 'Cenoura', 'Brócolis', 'Azeite e ervas'],
      instructions: [
        'Pré-aqueça o forno a 200°C',
        'Corte os legumes em pedaços médios',
        'Tempere o peixe e os legumes',
        'Asse por 25 minutos',
        'Sirva quente'
      ],
      tips: 'Regue com limão antes de servir para realçar o sabor!'
    },
    {
      id: 5,
      name: 'Bowl de Açaí Fit',
      category: 'lanche',
      time: 5,
      servings: 1,
      calories: 220,
      image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400',
      ingredients: ['100g polpa de açaí sem açúcar', '1 banana', 'Granola light', 'Frutas vermelhas'],
      instructions: [
        'Bata o açaí com metade da banana',
        'Coloque em uma tigela',
        'Decore com as frutas e granola'
      ],
      tips: 'Use frutas congeladas para uma textura mais cremosa!'
    },
    {
      id: 6,
      name: 'Wrap Integral de Atum',
      category: 'almoco',
      time: 10,
      servings: 1,
      calories: 320,
      image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
      ingredients: ['1 wrap integral', '1 lata de atum light', 'Alface', 'Tomate', 'Iogurte natural'],
      instructions: [
        'Escorra o atum e misture com iogurte',
        'Aqueça levemente o wrap',
        'Monte com alface, tomate e o atum',
        'Enrole e sirva'
      ],
      tips: 'Adicione um pouco de mostarda para mais sabor!'
    }
  ];

  const categories = [
    { id: 'all', name: 'Todas', icon: BookOpen },
    { id: 'cafe-da-manha', name: 'Café da Manhã', icon: UtensilsCrossed },
    { id: 'almoco', name: 'Almoço', icon: UtensilsCrossed },
    { id: 'lanche', name: 'Lanches', icon: UtensilsCrossed },
    { id: 'jantar', name: 'Jantar', icon: UtensilsCrossed }
  ];

  useEffect(() => {
    loadRecipes();
    loadFavorites();
  }, [patientId]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      // Tentar carregar receitas visíveis para este paciente
      const { data, error } = await getVisibleRecipesForPatient(patientId);

      if (error) {
        console.log('Erro ao buscar receitas:', error);
        // Usar receitas padrão se houver erro
        setRecipes(defaultRecipes);
      } else if (!data || data.length === 0) {
        // Não há receitas personalizadas - usar padrão
        console.log('Nenhuma receita personalizada encontrada, usando padrão');
        setRecipes(defaultRecipes);
      } else {
        // Mapear campos do banco para o formato esperado pelo componente
        const mappedRecipes = data.map(r => ({
          ...r,
          name: r.title || r.name, // Compatibilidade com ambos os campos
          time: r.prep_time || r.time,
          image: r.image_url || r.image,
          tips: r.description || r.tips
        }));
        setRecipes(mappedRecipes);
      }
    } catch (error) {
      console.error('Erro:', error);
      setRecipes(defaultRecipes);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem(`recipe_favorites_${patientId}`);
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  };

  const toggleFavorite = (recipeId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(recipeId)) {
      newFavorites.delete(recipeId);
      toast.success('Removido dos favoritos');
    } else {
      newFavorites.add(recipeId);
      toast.success('Adicionado aos favoritos! ❤️');
    }
    setFavorites(newFavorites);
    localStorage.setItem(`recipe_favorites_${patientId}`, JSON.stringify(Array.from(newFavorites)));
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  if (loading) {
    return (
      <Layout title="Minhas Receitas" userType="patient">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  // Modal de receita selecionada
  if (selectedRecipe) {
    return (
      <Layout title={selectedRecipe.name} userType="patient">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button 
            variant="outline" 
            onClick={() => setSelectedRecipe(null)}
            className="mb-4"
          >
            ← Voltar para receitas
          </Button>

          <Card className="overflow-hidden">
            {selectedRecipe.image && (
              <img 
                src={selectedRecipe.image} 
                alt={selectedRecipe.name}
                className="w-full h-64 object-cover"
              />
            )}
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedRecipe.name}</h1>
                  <Badge variant="outline" className="mt-2">
                    {getCategoryLabel(selectedRecipe.category)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavorite(selectedRecipe.id)}
                  className={favorites.has(selectedRecipe.id) ? 'text-red-500' : 'text-gray-400'}
                >
                  <Heart className={`h-6 w-6 ${favorites.has(selectedRecipe.id) ? 'fill-current' : ''}`} />
                </Button>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{selectedRecipe.time} min</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{selectedRecipe.servings} porção(ões)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Flame className="h-4 w-4" />
                  <span>{selectedRecipe.calories} kcal</span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-teal-600" />
                    Ingredientes
                  </h3>
                  <ul className="space-y-2">
                    {selectedRecipe.ingredients?.map((ing, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-teal-600" />
                    Modo de Preparo
                  </h3>
                  <ol className="space-y-3">
                    {selectedRecipe.instructions?.map((step, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {selectedRecipe.tips && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="flex items-center gap-2 text-yellow-800">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <strong>Dica:</strong> {selectedRecipe.tips}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Minhas Receitas" userType="patient">
      <div className="max-w-6xl mx-auto space-y-6">
        
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
        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Receitas Saudáveis</h2>
                <p className="text-orange-100">
                  Delícias que cabem no seu plano alimentar
                </p>
              </div>
              <ChefHat className="h-12 w-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        {/* ===== GERADOR DE RECEITAS IA ===== */}
        <SmartRecipeSuggester patientId={patientId} />

        {/* Busca e filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar receitas..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? 'bg-teal-600 hover:bg-teal-700' : ''}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid de receitas */}
        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <Card 
                key={recipe.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div className="relative">
                  {recipe.image ? (
                    <img 
                      src={recipe.image} 
                      alt={recipe.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                      <ChefHat className="h-16 w-16 text-orange-300" />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(recipe.id);
                    }}
                  >
                    <Heart className={`h-5 w-5 ${favorites.has(recipe.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </Button>
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{recipe.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {recipe.time} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-4 w-4" />
                      {recipe.calories} kcal
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <ChefHat className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium mb-2">Nenhuma receita encontrada</p>
              <p className="text-sm text-gray-400">
                Tente buscar por outro termo ou categoria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default PatientReceitas;
