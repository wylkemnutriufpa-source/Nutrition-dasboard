import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ShoppingCart, Plus, Trash2, CheckCircle2, Circle, 
  Apple, Beef, Milk, Wheat, Leaf, Fish, Egg,
  Download, Share2, Loader2, RefreshCw, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getPatientMealPlan } from '@/lib/supabase';

const PatientListaCompras = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set());

  const patientId = user?.id || profile?.id || localStorage.getItem('fitjourney_patient_id');

  useEffect(() => {
    loadMealPlan();
    loadSavedList();
  }, [patientId]);

  const loadMealPlan = async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await getPatientMealPlan(patientId);
      setMealPlan(data);
      
      if (data?.plan_data?.meals) {
        generateShoppingList(data.plan_data.meals);
      }
    } catch (error) {
      console.error('Erro ao carregar plano:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedList = () => {
    const saved = localStorage.getItem(`shopping_list_${patientId}`);
    if (saved) {
      const { custom, checked } = JSON.parse(saved);
      setCustomItems(custom || []);
      setCheckedItems(new Set(checked || []));
    }
  };

  const saveList = (custom, checked) => {
    localStorage.setItem(`shopping_list_${patientId}`, JSON.stringify({
      custom,
      checked: Array.from(checked)
    }));
  };

  const generateShoppingList = (meals) => {
    const items = new Map();
    
    // Categorias de alimentos
    const categories = {
      'Frutas': { icon: Apple, color: 'text-red-500', bg: 'bg-red-50' },
      'Proteínas': { icon: Beef, color: 'text-amber-700', bg: 'bg-amber-50' },
      'Laticínios': { icon: Milk, color: 'text-blue-500', bg: 'bg-blue-50' },
      'Grãos': { icon: Wheat, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      'Vegetais': { icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
      'Peixes': { icon: Fish, color: 'text-cyan-600', bg: 'bg-cyan-50' },
      'Ovos': { icon: Egg, color: 'text-orange-400', bg: 'bg-orange-50' },
      'Outros': { icon: ShoppingCart, color: 'text-gray-500', bg: 'bg-gray-50' }
    };

    // Palavras-chave para categorização
    const categoryKeywords = {
      'Frutas': ['banana', 'maçã', 'laranja', 'morango', 'uva', 'melão', 'manga', 'abacaxi', 'mamão', 'pera', 'fruta'],
      'Proteínas': ['frango', 'carne', 'boi', 'porco', 'peru', 'patinho', 'alcatra', 'músculo', 'proteína'],
      'Laticínios': ['leite', 'queijo', 'iogurte', 'requeijão', 'cream cheese', 'manteiga', 'nata'],
      'Grãos': ['arroz', 'feijão', 'aveia', 'quinoa', 'granola', 'pão', 'macarrão', 'massa', 'tapioca'],
      'Vegetais': ['alface', 'tomate', 'cenoura', 'brócolis', 'couve', 'espinafre', 'pepino', 'abobrinha', 'legume', 'verdura', 'salada'],
      'Peixes': ['peixe', 'salmão', 'atum', 'tilápia', 'sardinha', 'bacalhau'],
      'Ovos': ['ovo', 'clara', 'gema']
    };

    const categorizeItem = (name) => {
      const lowerName = name.toLowerCase();
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => lowerName.includes(kw))) {
          return category;
        }
      }
      return 'Outros';
    };

    // Extrair ingredientes de todas as refeições
    Object.values(meals).forEach(meal => {
      if (meal.foods && Array.isArray(meal.foods)) {
        meal.foods.forEach(food => {
          const name = food.name || food.food_name || '';
          if (name) {
            const key = name.toLowerCase().trim();
            if (!items.has(key)) {
              items.set(key, {
                name: name,
                quantity: food.quantity || food.portion || '',
                unit: food.unit || 'porção',
                category: categorizeItem(name)
              });
            }
          }
        });
      }
    });

    // Organizar por categoria
    const groupedList = {};
    items.forEach((item) => {
      if (!groupedList[item.category]) {
        groupedList[item.category] = {
          ...categories[item.category],
          items: []
        };
      }
      groupedList[item.category].items.push(item);
    });

    setShoppingList(groupedList);
  };

  const toggleItem = (itemName) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemName)) {
      newChecked.delete(itemName);
    } else {
      newChecked.add(itemName);
    }
    setCheckedItems(newChecked);
    saveList(customItems, newChecked);
  };

  const addCustomItem = () => {
    if (!newItem.trim()) return;
    
    const item = {
      name: newItem.trim(),
      isCustom: true,
      id: Date.now()
    };
    
    const newCustomItems = [...customItems, item];
    setCustomItems(newCustomItems);
    setNewItem('');
    saveList(newCustomItems, checkedItems);
    toast.success('Item adicionado!');
  };

  const removeCustomItem = (id) => {
    const newCustomItems = customItems.filter(item => item.id !== id);
    setCustomItems(newCustomItems);
    saveList(newCustomItems, checkedItems);
  };

  const clearChecked = () => {
    setCheckedItems(new Set());
    saveList(customItems, new Set());
    toast.success('Lista desmarcada!');
  };

  const shareList = () => {
    let text = "🛒 Minha Lista de Compras - FitJourney\n\n";
    
    Object.entries(shoppingList).forEach(([category, data]) => {
      if (data.items.length > 0) {
        text += `📦 ${category}:\n`;
        data.items.forEach(item => {
          const checked = checkedItems.has(item.name) ? '✅' : '⬜';
          text += `${checked} ${item.name}${item.quantity ? ` - ${item.quantity}` : ''}\n`;
        });
        text += '\n';
      }
    });
    
    if (customItems.length > 0) {
      text += "📝 Itens Extras:\n";
      customItems.forEach(item => {
        const checked = checkedItems.has(item.name) ? '✅' : '⬜';
        text += `${checked} ${item.name}\n`;
      });
    }
    
    if (navigator.share) {
      navigator.share({ title: 'Lista de Compras', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Lista copiada!');
    }
  };

  const totalItems = Object.values(shoppingList).reduce((acc, cat) => acc + cat.items.length, 0) + customItems.length;
  const checkedCount = checkedItems.size;

  if (loading) {
    return (
      <Layout title="Lista de Compras" userType="patient">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Lista de Compras" userType="patient">
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
        <Card className="bg-gradient-to-br from-teal-500 to-green-500 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Lista de Compras</h2>
                <p className="text-teal-100">
                  Baseada no seu plano alimentar
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{checkedCount}/{totalItems}</p>
                <p className="text-sm text-teal-200">itens marcados</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex gap-2">
          <Button onClick={shareList} variant="outline" className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Button onClick={clearChecked} variant="outline" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Desmarcar Tudo
          </Button>
        </div>

        {/* Adicionar item custom */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Adicionar item extra..."
                onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
              />
              <Button onClick={addCustomItem} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista por categorias */}
        {Object.entries(shoppingList).map(([category, data]) => {
          if (data.items.length === 0) return null;
          const Icon = data.icon;
          
          return (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className={`p-2 rounded-lg ${data.bg}`}>
                    <Icon className={`h-5 w-5 ${data.color}`} />
                  </div>
                  {category}
                  <span className="text-sm font-normal text-gray-400">
                    ({data.items.filter(i => checkedItems.has(i.name)).length}/{data.items.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.items.map((item, idx) => {
                    const isChecked = checkedItems.has(item.name);
                    return (
                      <div 
                        key={idx}
                        onClick={() => toggleItem(item.name)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={`flex-1 ${isChecked ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                          {item.name}
                        </span>
                        {item.quantity && (
                          <span className="text-sm text-gray-400">
                            {item.quantity} {item.unit}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Itens customizados */}
        {customItems.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Plus className="h-5 w-5 text-purple-500" />
                </div>
                Itens Extras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {customItems.map((item) => {
                  const isChecked = checkedItems.has(item.name);
                  return (
                    <div 
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isChecked 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div 
                        onClick={() => toggleItem(item.name)}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={isChecked ? 'text-green-700 line-through' : 'text-gray-700'}>
                          {item.name}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeCustomItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sem plano alimentar */}
        {Object.keys(shoppingList).length === 0 && customItems.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium mb-2">Nenhum item na lista</p>
              <p className="text-sm text-gray-400">
                Quando seu nutricionista criar seu plano alimentar, os ingredientes aparecerão aqui automaticamente!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default PatientListaCompras;
