import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChefHat, Plus, Search, Eye, EyeOff, Users, Edit2, Trash2, 
  Loader2, Save, X, Clock, Flame, Filter, UserCheck, UserX
} from 'lucide-react';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getProfessionalPatients,
  getRecipeVisibility,
  setRecipeVisibility,
  updateRecipeVisibilityMode
} from '@/lib/supabase';
import ImageUploader from '@/components/ImageUploader';

const RecipesManager = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Estados para criação/edição de receita
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'almoco',
    prep_time: 30,
    servings: 2,
    calories: 300,
    image_url: '',
    ingredients: '',
    instructions: '',
    visibility_mode: 'selected',
    is_active: true,
    is_global: false
  });
  
  // Estados para controle de visibilidade
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeVisibility, setRecipeVisibilityState] = useState({});
  const [savingVisibility, setSavingVisibility] = useState(false);

  const professionalId = user?.id || profile?.id;

  const categories = [
    { id: 'all', name: 'Todas' },
    { id: 'cafe-da-manha', name: 'Café da Manhã' },
    { id: 'almoco', name: 'Almoço' },
    { id: 'lanche', name: 'Lanches' },
    { id: 'jantar', name: 'Jantar' },
    { id: 'sobremesa', name: 'Sobremesas' }
  ];

  useEffect(() => {
    loadData();
    trackProfessionalFeature('view_recipes');
  }, [professionalId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar receitas do profissional
      const { data: recipesData, error: recipesError } = await getRecipes(professionalId);
      if (recipesError) {
        console.error('Erro ao carregar receitas:', recipesError);
        toast.error('Erro ao carregar receitas');
      } else {
        setRecipes(recipesData || []);
      }

      // Carregar pacientes do profissional
      const { data: patientsData, error: patientsError } = await getProfessionalPatients(professionalId);
      if (!patientsError) {
        setPatients(patientsData || []);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecipe = async () => {
    if (!formData.title.trim()) {
      toast.error('Nome da receita é obrigatório');
      return;
    }

    try {
      const recipeData = {
        ...formData,
        professional_id: professionalId
      };

      const { data, error } = await createRecipe(recipeData);
      if (error) {
        toast.error('Erro ao criar receita');
        return;
      }

      toast.success('Receita criada com sucesso! 🍳');
      trackProfessionalFeature('create_recipe');
      setRecipes([data, ...recipes]);
      resetForm();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao criar receita');
    }
  };

  const handleUpdateRecipe = async () => {
    if (!editingRecipe) return;

    try {
      const updates = {
        ...formData
      };

      const { data, error } = await updateRecipe(editingRecipe.id, updates);
      if (error) {
        toast.error('Erro ao atualizar receita');
        return;
      }

      toast.success('Receita atualizada!');
      setRecipes(recipes.map(r => r.id === editingRecipe.id ? data : r));
      resetForm();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar receita');
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm('Excluir esta receita?')) return;

    try {
      const { error } = await deleteRecipe(recipeId);
      if (error) {
        toast.error('Erro ao excluir receita');
        return;
      }

      toast.success('Receita excluída');
      setRecipes(recipes.filter(r => r.id !== recipeId));
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRecipe(null);
    setFormData({
      title: '',
      description: '',
      category: 'almoco',
      prep_time: 30,
      servings: 2,
      calories: 300,
      image_url: '',
      ingredients: '',
      instructions: '',
      visibility_mode: 'selected',
      is_active: true,
      is_global: false
    });
  };

  const startEditing = (recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      title: recipe.title || '',
      description: recipe.description || '',
      category: recipe.category || 'almoco',
      prep_time: recipe.prep_time || 30,
      servings: recipe.servings || 2,
      calories: recipe.calories || 300,
      image_url: recipe.image_url || '',
      ingredients: recipe.ingredients || '',
      instructions: recipe.instructions || '',
      visibility_mode: recipe.visibility_mode || 'selected',
      is_active: recipe.is_active !== false,
      is_global: recipe.is_global || false
    });
    setShowForm(true);
  };

  // Abrir modal de visibilidade
  const openVisibilityModal = async (recipe) => {
    setSelectedRecipe(recipe);
    setShowVisibilityModal(true);
    
    // Carregar visibilidade atual
    const { data } = await getRecipeVisibility(recipe.id);
    const visibility = {};
    patients.forEach(p => {
      visibility[p.id] = false;
    });
    data?.forEach(v => {
      visibility[v.patient_id] = v.visible;
    });
    setRecipeVisibilityState(visibility);
  };

  // Salvar visibilidade
  const saveVisibility = async () => {
    if (!selectedRecipe) return;
    setSavingVisibility(true);

    try {
      // Atualizar visibilidade para cada paciente
      for (const patientId of Object.keys(recipeVisibility)) {
        await setRecipeVisibility(
          selectedRecipe.id,
          patientId,
          professionalId,
          recipeVisibility[patientId]
        );
      }

      toast.success('Visibilidade atualizada!');
      setShowVisibilityModal(false);
      setSelectedRecipe(null);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar visibilidade');
    } finally {
      setSavingVisibility(false);
    }
  };

  // Toggle visibilidade de um paciente
  const togglePatientVisibility = (patientId) => {
    setRecipeVisibilityState(prev => ({
      ...prev,
      [patientId]: !prev[patientId]
    }));
  };

  // Selecionar todos os pacientes
  const selectAllPatients = () => {
    const allSelected = {};
    patients.forEach(p => {
      allSelected[p.id] = true;
    });
    setRecipeVisibilityState(allSelected);
  };

  // Desselecionar todos
  const deselectAllPatients = () => {
    const noneSelected = {};
    patients.forEach(p => {
      noneSelected[p.id] = false;
    });
    setRecipeVisibilityState(noneSelected);
  };

  // Adicionar/remover ingrediente ou instrução
  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const getVisibilityBadge = (recipe) => {
    if (recipe.is_global || recipe.visibility_mode === 'all') {
      return <Badge className="bg-green-500">Todos veem</Badge>;
    }
    if (recipe.visibility_mode === 'none') {
      return <Badge variant="outline" className="text-gray-500">Rascunho</Badge>;
    }
    return <Badge className="bg-blue-500">Selecionados</Badge>;
  };

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
      <div className="max-w-7xl mx-auto space-y-6 pb-8">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 via-amber-900 to-orange-900 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/10">
                    <ChefHat className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Gerenciar Receitas</h1>
                    <p className="text-amber-300 text-sm">Crie receitas e controle a visibilidade para seus pacientes</p>
                  </div>
                </div>
                <Button onClick={() => setShowForm(true)} className="bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur-sm shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Receita
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-lg mt-4">
                <div className="text-center bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-black">{filteredRecipes.length}</p>
                  <p className="text-xs text-white/60">Receitas</p>
                </div>
                <div className="text-center bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-black">{categories.length}</p>
                  <p className="text-xs text-white/60">Categorias</p>
                </div>
                <div className="text-center bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-black">{recipes.filter(r => r.is_global || r.visibility_mode === 'all').length}</p>
                  <p className="text-xs text-white/60">Publicadas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar receita..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? "bg-teal-600" : ""}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Formulário de Criação/Edição */}
        {showForm && (
          <Card className="border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-teal-600" />
                {editingRecipe ? 'Editar Receita' : 'Nova Receita'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nome da Receita *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Frango Grelhado com Legumes"
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tempo de Preparo (min)</Label>
                  <Input
                    type="number"
                    value={formData.prep_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, prep_time: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Porções</Label>
                  <Input
                    type="number"
                    value={formData.servings}
                    onChange={(e) => setFormData(prev => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label>Calorias (por porção)</Label>
                  <Input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <ImageUploader
                    label="Foto do Prato"
                    value={formData.image_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                    folder="recipes"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Breve descrição da receita..."
                  rows={2}
                />
              </div>

              {/* Ingredientes */}
              <div>
                <Label>Ingredientes (um por linha)</Label>
                <Textarea
                  value={formData.ingredients}
                  onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
                  placeholder="200g de frango&#10;1 colher de azeite&#10;Sal a gosto"
                  rows={5}
                />
              </div>

              {/* Instruções */}
              <div>
                <Label>Modo de Preparo (um passo por linha)</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Tempere o frango&#10;Grelhe em fogo médio&#10;Sirva quente"
                  rows={5}
                />
              </div>

              {/* Visibilidade */}
              <div className="border-t pt-4">
                <Label className="mb-3 block">Visibilidade da Receita</Label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibility_mode === 'all'}
                      onChange={() => setFormData(prev => ({ ...prev, visibility_mode: 'all', is_global: true }))}
                      className="text-teal-600"
                    />
                    <Eye className="w-4 h-4 text-green-600" />
                    <span>Todos os pacientes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibility_mode === 'selected'}
                      onChange={() => setFormData(prev => ({ ...prev, visibility_mode: 'selected', is_global: false }))}
                      className="text-teal-600"
                    />
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Pacientes selecionados</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibility_mode === 'none'}
                      onChange={() => setFormData(prev => ({ ...prev, visibility_mode: 'none', is_global: false }))}
                      className="text-teal-600"
                    />
                    <EyeOff className="w-4 h-4 text-gray-500" />
                    <span>Rascunho (ninguém vê)</span>
                  </label>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button 
                  onClick={editingRecipe ? handleUpdateRecipe : handleCreateRecipe}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingRecipe ? 'Atualizar' : 'Criar Receita'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Receitas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.length === 0 ? (
            <Card className="col-span-full p-8 text-center">
              <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">Nenhuma receita encontrada</h3>
              <p className="text-gray-500 mt-2">Clique em "Nova Receita" para criar sua primeira receita.</p>
            </Card>
          ) : (
            filteredRecipes.map(recipe => (
              <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {recipe.image_url && (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={recipe.image_url} 
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 line-clamp-1">{recipe.title}</h3>
                    {getVisibilityBadge(recipe)}
                  </div>
                  
                  <div className="flex gap-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {recipe.prep_time} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-4 h-4" /> {recipe.calories} kcal
                    </span>
                  </div>
                  
                  <Badge variant="outline" className="mb-3">
                    {getCategoryLabel(recipe.category)}
                  </Badge>

                  <div className="flex justify-between items-center pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openVisibilityModal(recipe)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Visibilidade
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(recipe)}
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRecipe(recipe.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modal de Visibilidade */}
        {showVisibilityModal && selectedRecipe && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Controle de Visibilidade
                </CardTitle>
                <CardDescription>
                  Selecione quais pacientes podem ver: <strong>{selectedRecipe.title}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {/* Ações Rápidas */}
                <div className="flex gap-2 mb-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectAllPatients}
                    className="flex-1"
                  >
                    <UserCheck className="w-4 h-4 mr-1 text-green-600" />
                    Selecionar Todos
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={deselectAllPatients}
                    className="flex-1"
                  >
                    <UserX className="w-4 h-4 mr-1 text-red-500" />
                    Desmarcar Todos
                  </Button>
                </div>

                {/* Lista de Pacientes */}
                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-3">
                  {patients.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Nenhum paciente cadastrado
                    </p>
                  ) : (
                    patients.map(patient => (
                      <label
                        key={patient.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          recipeVisibility[patient.id] 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <Checkbox
                          checked={recipeVisibility[patient.id] || false}
                          onCheckedChange={() => togglePatientVisibility(patient.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {patient.full_name || 'Sem nome'}
                          </p>
                          <p className="text-sm text-gray-500">{patient.email}</p>
                        </div>
                        {recipeVisibility[patient.id] && (
                          <Eye className="w-4 h-4 text-blue-600" />
                        )}
                      </label>
                    ))
                  )}
                </div>

                {/* Contador */}
                <p className="text-sm text-gray-600 mt-3 text-center">
                  {Object.values(recipeVisibility).filter(Boolean).length} de {patients.length} pacientes selecionados
                </p>
              </CardContent>
              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowVisibilityModal(false);
                    setSelectedRecipe(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={saveVisibility}
                  disabled={savingVisibility}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {savingVisibility ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Visibilidade
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RecipesManager;
