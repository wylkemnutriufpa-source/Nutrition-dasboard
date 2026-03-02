import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Loader2, Plus, Edit, Trash2, CheckSquare, Lightbulb, ListTodo, 
  Save, X, RefreshCw, Users, AlertCircle, Sparkles 
} from 'lucide-react';
import { 
  getCurrentUser, 
  getUserProfile,
  getProfessionalTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from '@/lib/supabase';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';

const TemplatesGlobais = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState('checklist');
  const [professionalId, setProfessionalId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'checklist',
    priority: 'normal',
    category: ''
  });

  const loadTemplates = useCallback(async () => {
    if (!professionalId) return;
    
    setLoading(true);
    try {
      const { data, error } = await getProfessionalTemplates(professionalId);
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          toast.error('Usuário não autenticado');
          return;
        }

        const profile = await getUserProfile(user.id);
        if (profile) {
          setProfessionalId(profile.id);
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (professionalId) {
      loadTemplates();
      trackProfessionalFeature('view_templates');
    }
  }, [professionalId, loadTemplates]);

  const handleCreateTemplate = async () => {
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await createTemplate(professionalId, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        priority: formData.priority,
        category: formData.category,
        is_active: true
      });

      if (error) throw error;

      toast.success('Template criado com sucesso! Será aplicado a todos os pacientes.');
      trackProfessionalFeature('create_template');
      setShowCreateModal(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Erro ao criar template:', error);
      toast.error('Erro ao criar template');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await updateTemplate(editingTemplate.id, {
        title: formData.title.trim(),
        content: formData.description.trim()
      });

      if (error) throw error;

      toast.success('Template atualizado! Alterações propagadas para os pacientes.');
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      toast.error('Erro ao atualizar template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Tem certeza que deseja excluir este template?')) {
      return;
    }

    try {
      const { error } = await deleteTemplate(templateId);
      if (error) throw error;

      toast.success('Template excluído');
      loadTemplates();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      toast.error('Erro ao excluir template');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'checklist',
      priority: 'normal',
      category: ''
    });
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      description: template.description || template.content || '',
      type: template.type,
      priority: template.priority || 'normal',
      category: template.category || ''
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'checklist': return <CheckSquare className="text-teal-600" size={20} />;
      case 'task': return <ListTodo className="text-blue-600" size={20} />;
      case 'tip': return <Lightbulb className="text-yellow-600" size={20} />;
      default: return <Sparkles className="text-purple-600" size={20} />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'checklist': return 'Checklist';
      case 'task': return 'Tarefa';
      case 'tip': return 'Dica';
      default: return type;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'checklist': return 'bg-teal-100 text-teal-700';
      case 'task': return 'bg-blue-100 text-blue-700';
      case 'tip': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (activeTab === 'all') return true;
    return t.type === activeTab;
  });

  if (loading && templates.length === 0) {
    return (
      <Layout title="Templates Globais" showBack userType="professional">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-teal-700" size={48} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Templates Globais" showBack userType="professional">
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/10">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Templates Globais</h1>
                    <p className="text-purple-300 text-sm">Conteudos aplicados automaticamente a todos os seus pacientes</p>
                  </div>
                </div>
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                  <DialogTrigger asChild>
                    <Button className="bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur-sm shadow-lg" data-testid="create-template-btn">
                      <Plus className="mr-2" size={18} />
                      Criar Template
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Plus size={20} />
                      Novo Template Global
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Tipo de Template *</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(v) => setFormData({...formData, type: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checklist">
                            <div className="flex items-center gap-2">
                              <CheckSquare size={16} className="text-teal-600" />
                              Checklist Diário
                            </div>
                          </SelectItem>
                          <SelectItem value="task">
                            <div className="flex items-center gap-2">
                              <ListTodo size={16} className="text-blue-600" />
                              Tarefa
                            </div>
                          </SelectItem>
                          <SelectItem value="tip">
                            <div className="flex items-center gap-2">
                              <Lightbulb size={16} className="text-yellow-600" />
                              Dica
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Título *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder={
                          formData.type === 'checklist' ? 'Ex: Beber 2L de água' :
                          formData.type === 'task' ? 'Ex: Preencher diário alimentar' :
                          'Ex: Prefira alimentos integrais'
                        }
                        data-testid="template-title-input"
                      />
                    </div>

                    <div>
                      <Label>Descrição (opcional)</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Detalhes ou instruções adicionais..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prioridade</Label>
                        <Select 
                          value={formData.priority} 
                          onValueChange={(v) => setFormData({...formData, priority: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Categoria (opcional)</Label>
                        <Input
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          placeholder="Ex: Hidratação"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800 flex items-center gap-2">
                        <Users size={16} />
                        Este template será aplicado automaticamente a todos os seus pacientes.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateTemplate}
                      className="bg-teal-700 hover:bg-teal-800"
                      disabled={saving || !formData.title.trim()}
                      data-testid="save-template-btn"
                    >
                      {saving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
                      Criar Template
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-teal-700 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-teal-800">Como funciona?</h4>
                <ul className="text-sm text-teal-700 mt-1 space-y-1">
                  <li>• <strong>Checklists:</strong> Itens diários que aparecem no checklist de todos os pacientes</li>
                  <li>• <strong>Tarefas:</strong> Atividades programadas para todos os pacientes realizarem</li>
                  <li>• <strong>Dicas:</strong> Sugestões e orientações que aparecem no painel de cada paciente</li>
                  <li>• Alterações são propagadas automaticamente para todos os pacientes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs e Lista */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="text-teal-700" size={20} />
                  Seus Templates ({templates.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadTemplates}
                    disabled={loading}
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </Button>
                  <TabsList>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="checklist" className="gap-1">
                      <CheckSquare size={14} /> Checklists
                    </TabsTrigger>
                    <TabsTrigger value="task" className="gap-1">
                      <ListTodo size={14} /> Tarefas
                    </TabsTrigger>
                    <TabsTrigger value="tip" className="gap-1">
                      <Lightbulb size={14} /> Dicas
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </CardHeader>
          </Card>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <Sparkles size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Nenhum template {activeTab !== 'all' ? `do tipo "${getTypeLabel(activeTab)}"` : ''}</p>
                    <p className="text-sm mt-2">
                      Crie templates para automatizar o conteúdo dos seus pacientes
                    </p>
                    <Button 
                      className="mt-4 bg-teal-700 hover:bg-teal-800"
                      onClick={() => {
                        setFormData({...formData, type: activeTab === 'all' ? 'checklist' : activeTab});
                        setShowCreateModal(true);
                      }}
                    >
                      <Plus className="mr-2" size={16} />
                      Criar Primeiro Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="hover:shadow-md transition-shadow"
                    data-testid={`template-card-${template.id}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(template.type)}`}>
                            {getTypeIcon(template.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{template.title}</h3>
                              <Badge className={getTypeColor(template.type)}>
                                {getTypeLabel(template.type)}
                              </Badge>
                              {template.priority === 'high' && (
                                <Badge variant="destructive">Alta Prioridade</Badge>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                {template.description}
                              </p>
                            )}
                            {template.category && (
                              <span className="text-xs text-gray-500">
                                Categoria: {template.category}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(template)}
                            data-testid={`edit-template-${template.id}`}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteTemplate(template.id)}
                            data-testid={`delete-template-${template.id}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal de Edição */}
        <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit size={20} />
                Editar Template
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Tipo</Label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  {getTypeIcon(formData.type)}
                  <span className="font-medium">{getTypeLabel(formData.type)}</span>
                </div>
              </div>

              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <RefreshCw size={16} />
                  As alterações serão propagadas para todos os pacientes automaticamente.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setEditingTemplate(null); resetForm(); }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateTemplate}
                className="bg-teal-700 hover:bg-teal-800"
                disabled={saving || !formData.title.trim()}
              >
                {saving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default TemplatesGlobais;
