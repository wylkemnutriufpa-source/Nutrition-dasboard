import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChefHat, Clock, Users, Flame, Search, Heart, 
  BookOpen, Star, Filter, Loader2, UtensilsCrossed, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getVisibleRecipesForPatient } from '@/lib/supabase';

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
