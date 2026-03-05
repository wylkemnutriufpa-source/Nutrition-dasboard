import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Database, Loader2 } from 'lucide-react';
import { mockFoods } from '@/data/mockData';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomFoods, createCustomFood, updateCustomFood, deleteCustomFood } from '@/lib/supabase';

const FoodDatabase = () => {
  const { user } = useAuth();
  const [customFoods, setCustomFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unidade: 'g',
    porcao: 100,
    calorias: 0,
    proteina: 0,
    carboidrato: 0,
    gordura: 0,
    fibra: 0,
    sodio: 0,
    observacoes: ''
  });

  useEffect(() => {
    if (user) {
      loadCustomFoods();
      trackProfessionalFeature('view_food_database');
    }
  }, [user]);

  const loadCustomFoods = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await getCustomFoods(user.id);
      if (error) throw error;
      setCustomFoods(data || []);
    } catch (error) {
      console.error('Error loading custom foods:', error);
      toast.error('Erro ao carregar alimentos customizados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (food = null) => {
    if (food) {
      setEditingFood(food);
      setFormData({
        name: food.name,
        unidade: food.unidade,
        porcao: food.porcao,
        calorias: food.calorias,
        proteina: food.proteina,
        carboidrato: food.carboidrato,
        gordura: food.gordura,
        fibra: food.fibra || 0,
        sodio: food.sodio || 0,
        observacoes: food.observacoes || ''
      });
    } else {
      setEditingFood(null);
      setFormData({
        name: '',
        unidade: 'g',
        porcao: 100,
        calorias: 0,
        proteina: 0,
        carboidrato: 0,
        gordura: 0,
        fibra: 0,
        sodio: 0,
        observacoes: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Nome do alimento é obrigatório');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setSaving(true);
    try {
      if (editingFood) {
        const { error } = await updateCustomFood(editingFood.id, formData);
        if (error) throw error;
        toast.success('Alimento atualizado com sucesso!');
      } else {
        const { error } = await createCustomFood(user.id, formData);
        if (error) throw error;
        toast.success('Alimento criado com sucesso!');
        trackProfessionalFeature('create_custom_food');
      }

      setIsDialogOpen(false);
      await loadCustomFoods();
    } catch (error) {
      console.error('Error saving food:', error);
      toast.error(error.message || 'Erro ao salvar alimento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este alimento?')) return;

    try {
      const { error } = await deleteCustomFood(id);
      if (error) throw error;
      toast.success('Alimento excluído com sucesso!');
      await loadCustomFoods();
    } catch (error) {
      console.error('Error deleting food:', error);
      toast.error('Erro ao excluir alimento');
    }
  };

  const FoodCard = ({ food, isCustom }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{food.name}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {food.source} {food.source_id ? `• ${food.source_id}` : ''}
            </p>
          </div>
          {isCustom && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenDialog(food)}
                className="h-8 w-8 p-0"
              >
                <Edit size={16} className="text-blue-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(food.id)}
                className="h-8 w-8 p-0"
              >
                <Trash2 size={16} className="text-red-600" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="bg-teal-50 p-2 rounded">
            <p className="text-xs text-gray-600">Calorias</p>
            <p className="font-semibold text-teal-700">{food.calorias} kcal</p>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <p className="text-xs text-gray-600">Proteína</p>
            <p className="font-semibold text-blue-700">{food.proteina}g</p>
          </div>
          <div className="bg-amber-50 p-2 rounded">
            <p className="text-xs text-gray-600">Carboidrato</p>
            <p className="font-semibold text-amber-700">{food.carboidrato}g</p>
          </div>
          <div className="bg-purple-50 p-2 rounded">
            <p className="text-xs text-gray-600">Gordura</p>
            <p className="font-semibold text-purple-700">{food.gordura}g</p>
          </div>
        </div>

        {(food.fibra > 0 || food.sodio > 0) && (
          <div className="flex gap-4 mt-3 text-xs text-gray-600">
            {food.fibra > 0 && <span>Fibra: {food.fibra}g</span>}
            {food.sodio > 0 && <span>Sódio: {food.sodio}mg</span>}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Valores por {food.porcao}{food.unidade}
        </p>

        {food.observacoes && (
          <p className="text-xs text-gray-600 mt-2 italic">{food.observacoes}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout title="Banco de Alimentos" showBack userType="professional">
      <div data-testid="food-database" className="max-w-7xl mx-auto space-y-6 pb-8">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-lime-500 via-green-500 to-emerald-600 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-3">Banco de Dados</span>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Banco de Alimentos</h1>
                    <p className="text-white/80 text-sm">Visualize alimentos TACO/USDA e crie seus proprios</p>
                  </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur-sm shadow-lg" onClick={() => handleOpenDialog()}>
                      <Plus size={18} className="mr-2" />
                      Novo Alimento
                    </Button>
                  </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingFood ? 'Editar Alimento' : 'Novo Alimento Customizado'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha os dados nutricionais por 100g/ml ou por porção
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Alimento *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Bolo caseiro de chocolate"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="porcao">Porção de Referência</Label>
                      <Input
                        id="porcao"
                        type="number"
                        value={formData.porcao}
                        onChange={(e) => setFormData({ ...formData, porcao: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="unidade">Unidade</Label>
                      <Select value={formData.unidade} onValueChange={(v) => setFormData({ ...formData, unidade: v })}>
                        <SelectTrigger id="unidade">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">Gramas (g)</SelectItem>
                          <SelectItem value="ml">Mililitros (ml)</SelectItem>
                          <SelectItem value="unidade">Unidade</SelectItem>
                          <SelectItem value="fatia">Fatia</SelectItem>
                          <SelectItem value="colher">Colher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-semibold text-gray-900">Macronutrientes *</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="calorias">Calorias (kcal)</Label>
                        <Input
                          id="calorias"
                          type="number"
                          step="0.1"
                          value={formData.calorias}
                          onChange={(e) => setFormData({ ...formData, calorias: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="proteina">Proteína (g)</Label>
                        <Input
                          id="proteina"
                          type="number"
                          step="0.1"
                          value={formData.proteina}
                          onChange={(e) => setFormData({ ...formData, proteina: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="carboidrato">Carboidrato (g)</Label>
                        <Input
                          id="carboidrato"
                          type="number"
                          step="0.1"
                          value={formData.carboidrato}
                          onChange={(e) => setFormData({ ...formData, carboidrato: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="gordura">Gordura (g)</Label>
                        <Input
                          id="gordura"
                          type="number"
                          step="0.1"
                          value={formData.gordura}
                          onChange={(e) => setFormData({ ...formData, gordura: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-semibold text-gray-900">Informações Adicionais (Opcional)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fibra">Fibra (g)</Label>
                        <Input
                          id="fibra"
                          type="number"
                          step="0.1"
                          value={formData.fibra}
                          onChange={(e) => setFormData({ ...formData, fibra: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sodio">Sódio (mg)</Label>
                        <Input
                          id="sodio"
                          type="number"
                          step="0.1"
                          value={formData.sodio}
                          onChange={(e) => setFormData({ ...formData, sodio: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Ex: Receita caseira, marca específica, etc."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="flex-1 bg-teal-700 hover:bg-teal-800"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>{editingFood ? 'Atualizar' : 'Criar'} Alimento</>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>

        <Tabs defaultValue="custom" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom">
              Meus Alimentos ({customFoods.length})
            </TabsTrigger>
            <TabsTrigger value="taco">
              TACO/USDA ({mockFoods.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="space-y-4">
            {customFoods.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="mx-auto text-gray-400 mb-4" size={48} />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum alimento customizado ainda
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Crie seus próprios alimentos personalizados para usar nos planos alimentares
                  </p>
                  <Button
                    onClick={() => handleOpenDialog()}
                    className="bg-teal-700 hover:bg-teal-800"
                  >
                    <Plus size={18} className="mr-2" />
                    Criar Primeiro Alimento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customFoods.map((food) => (
                  <FoodCard key={food.id} food={food} isCustom={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="taco" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockFoods.map((food) => (
                <FoodCard key={food.id} food={food} isCustom={false} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default FoodDatabase;
