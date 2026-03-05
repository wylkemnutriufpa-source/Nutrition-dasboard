import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ChefHat, Plus, X, Sparkles, Loader2, Clock, Users, Flame,
  UtensilsCrossed, CheckCircle2, Crown, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessFeature } from '@/lib/supabase';

const RecipeGenerator = ({ patientProfile, onRecipeGenerated }) => {
  const { profile } = useAuth();
  const [ingredients, setIngredients] = useState([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [generating, setGenerating] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [mode, setMode] = useState('strict'); // 'strict' ou 'flexible'

  React.useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { allowed } = await canAccessFeature('ai_recipe_generator', profile);
    setHasAccess(allowed);
  };

  const addIngredient = () => {
    if (!currentIngredient.trim()) return;
    if (ingredients.includes(currentIngredient.trim())) {
      toast.error('Ingrediente já adicionado');
      return;
    }
    if (ingredients.length >= 15) {
      toast.error('Máximo de 15 ingredientes permitidos');
      return;
    }
    setIngredients([...ingredients, currentIngredient.trim()]);
    setCurrentIngredient('');
  };

  const removeIngredient = (ing) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  };

  const generateRecipe = async () => {
    if (ingredients.length === 0) {
      toast.error('Adicione pelo menos 1 ingrediente');
      return;
    }

    setGenerating(true);
    setRecipe(null);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/recipes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          patient_profile: {
            id: patientProfile?.id,
            goal: patientProfile?.goal || 'Manutenção de peso',
            daily_calories: patientProfile?.daily_targets?.calorias || 2000,
            daily_protein: patientProfile?.daily_targets?.proteina || 100,
            daily_carbs: patientProfile?.daily_targets?.carboidrato || 250,
            daily_fat: patientProfile?.daily_targets?.gordura || 70
          },
          dietary_restrictions: patientProfile?.dietary_restrictions || [],
          mode: mode
        })
      });

      const data = await response.json();

      if (data.success && data.recipe) {
        setRecipe(data.recipe);
        toast.success('Receita gerada com sucesso! 🎉');
        if (onRecipeGenerated) onRecipeGenerated(data.recipe);
      } else {
        throw new Error(data.error || 'Erro ao gerar receita');
      }
    } catch (err) {
      toast.error('Erro ao gerar receita. Tente novamente.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (!hasAccess) {
    return (
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Recurso PRO</h3>
          <p className="text-gray-600 mb-4">
            O Gerador de Receitas IA está disponível apenas no plano PRO
          </p>
          <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">
            <Sparkles className="h-3 w-3 mr-1" />
            Faça upgrade para PRO
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50/30 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl">
              <ChefHat className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-black text-gray-900">Gerar Receitas com IA</h3>
                <Badge className="bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  PRO
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                Informe os ingredientes que você tem em casa e a IA criará receitas personalizadas
              </p>
            </div>
          </div>

          {/* Input de Ingredientes */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={currentIngredient}
                onChange={(e) => setCurrentIngredient(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite um ingrediente e pressione Enter..."
                className="flex-1"
              />
              <Button
                onClick={addIngredient}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Tags de Ingredientes */}
            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ing, i) => (
                  <Badge
                    key={i}
                    className="bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 text-sm"
                  >
                    {ing}
                    <button
                      onClick={() => removeIngredient(ing)}
                      className="ml-2 hover:text-purple-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Badge className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-1 text-xs">
                  {ingredients.length}/15
                </Badge>
              </div>
            )}

            {/* Toggle de Modo */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 border-2 border-purple-200">
              <p className="text-xs font-semibold text-gray-700 mb-3">Modo de Geração:</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="mode"
                    value="strict"
                    checked={mode === 'strict'}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 group-hover:text-purple-700">
                      🔒 Somente o que tenho em casa
                    </span>
                    <p className="text-xs text-gray-500">Usa apenas os ingredientes da lista</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="mode"
                    value="flexible"
                    checked={mode === 'flexible'}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 group-hover:text-purple-700">
                      ✨ Permitir sugestões de melhoria
                    </span>
                    <p className="text-xs text-gray-500">Receita base + até 3 ingredientes opcionais</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Botão Gerar */}
            <Button
              onClick={generateRecipe}
              disabled={generating || ingredients.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:opacity-90 shadow-lg text-base py-6"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Gerando receita mágica...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Gerar Receita com IA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Receita Gerada */}
      {recipe && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 shadow-xl animate-in fade-in duration-500">
          <CardContent className="p-6">
            {/* Header da Receita */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">{recipe.nome}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {recipe.tempo_preparo}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {recipe.porcoes} {recipe.porcoes === 1 ? 'porção' : 'porções'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {recipe.calorias_por_porcao} kcal
                  </span>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Gerado por IA
              </Badge>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <p className="text-xs text-blue-600 font-semibold mb-1">Proteína</p>
                <p className="text-xl font-black text-blue-700">{recipe.macros.proteina}g</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <p className="text-xs text-amber-600 font-semibold mb-1">Carboidrato</p>
                <p className="text-xl font-black text-amber-700">{recipe.macros.carboidrato}g</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-200">
                <p className="text-xs text-rose-600 font-semibold mb-1">Gordura</p>
                <p className="text-xl font-black text-rose-700">{recipe.macros.gordura}g</p>
              </div>
            </div>

            {/* Ingredientes */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
                Ingredientes
              </h3>
              <div className="space-y-2">
                {recipe.ingredientes.map((ing, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-medium">{ing.quantidade}</span>
                    <span>{ing.item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modo de Preparo */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-emerald-600" />
                Modo de Preparo
              </h3>
              <ol className="space-y-3">
                {recipe.modo_preparo.map((passo, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 flex-1">{passo}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Dicas */}
            {recipe.dicas && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 mb-1">Dica do Chef</h4>
                    <p className="text-sm text-amber-800">{recipe.dicas}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sugestões (Modo Flexível) */}
            {recipe.generation_mode === 'flexible' && recipe.suggestions && recipe.suggestions.length > 0 && (
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  <h4 className="font-bold text-gray-900">Sugestões para Melhorar</h4>
                  <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px]">
                    Opcional
                  </Badge>
                </div>
                <div className="space-y-2">
                  {recipe.suggestions.map((sug, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-violet-200">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-violet-700">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{sug.item}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{sug.reason}</p>
                        </div>
                        {sug.optional && (
                          <Badge className="bg-violet-50 text-violet-600 border-0 text-[10px]">
                            Opcional
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Estas sugestões são opcionais e não alteram a receita base
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecipeGenerator;
