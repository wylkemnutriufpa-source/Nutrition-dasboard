/**
 * MealTemplatesPanel.js
 * Painel para gerenciar e aplicar templates de refeições
 * Inclui funcionalidade de publicar para galeria (PRO only)
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookMarked, Plus, Trash2, Edit, Star, Clock, Utensils,
  Search, Copy, Loader2, ChevronRight, Sparkles, Save,
  Globe, Crown, Check, X, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getMealTemplates, 
  createMealTemplate, 
  deleteMealTemplate,
  incrementTemplateUse,
  requestTemplatePublication,
  cancelTemplatePublication,
  countProfessionalPublicTemplates
} from '@/lib/supabase';
import { calculateMealTotals } from '@/utils/nutritionCalculator';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES = [
  { value: 'all', label: 'Todos', icon: '📋' },
  { value: 'breakfast', label: 'Café da Manhã', icon: '🌅' },
  { value: 'lunch', label: 'Almoço', icon: '☀️' },
  { value: 'dinner', label: 'Jantar', icon: '🌙' },
  { value: 'snack', label: 'Lanche', icon: '🍎' },
  { value: 'general', label: 'Geral', icon: '🍽️' }
];

const APPROVAL_STATUS = {
  private: { label: 'Privado', color: 'bg-gray-100 text-gray-600', icon: null },
  pending: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Público', color: 'bg-emerald-100 text-emerald-700', icon: Globe },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-700', icon: X }
};

// Template Item Component
const TemplateItem = ({ template, onApply, onDelete, onPublish, onUnpublish, isPro, publicCount }) => {
  const mealData = template.meal_data || {};
  const foodCount = mealData.foods?.length || 0;
  const status = APPROVAL_STATUS[template.approval_status] || APPROVAL_STATUS.private;
  const StatusIcon = status.icon;
  
  const canPublish = isPro && template.approval_status === 'private' && publicCount < 10;
  const canUnpublish = template.approval_status === 'pending' || template.approval_status === 'approved';
  
  return (
    <div className="group p-3 border rounded-xl hover:border-teal-400 hover:bg-teal-50/30 transition-all cursor-pointer">
      <div className="flex items-start gap-3" onClick={() => onApply(template)}>
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${mealData.color || '#0F766E'}20` }}
        >
          <Utensils size={18} style={{ color: mealData.color || '#0F766E' }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 text-sm truncate">{template.title}</h4>
            {template.use_count > 0 && (
              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                <Star size={10} className="mr-0.5" /> {template.use_count}x
              </Badge>
            )}
            {template.approval_status !== 'private' && (
              <Badge className={`text-[9px] ${status.color}`}>
                {StatusIcon && <StatusIcon size={10} className="mr-0.5" />}
                {status.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{template.description || 'Sem descrição'}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
            <span className="font-semibold text-teal-600">{template.total_calories || 0} kcal</span>
            <span>{foodCount} alimentos</span>
            {mealData.time && <span><Clock size={10} className="inline mr-0.5" />{mealData.time}</span>}
          </div>
          {template.rejection_reason && (
            <p className="text-[10px] text-red-500 mt-1">
              <AlertCircle size={10} className="inline mr-0.5" /> {template.rejection_reason}
            </p>
          )}
        </div>
        
        <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-500 flex-shrink-0 mt-2" />
      </div>
      
      <div className="flex gap-1 mt-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); onApply(template); }}>
          <Copy size={12} className="mr-1" /> Aplicar
        </Button>
        
        {/* Botão Publicar (PRO only) */}
        {canPublish && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" 
            onClick={(e) => { e.stopPropagation(); onPublish(template); }}
            title="Publicar na galeria (requer aprovação)"
          >
            <Globe size={12} className="mr-1" /> Publicar
          </Button>
        )}
        
        {/* Botão Cancelar publicação */}
        {canUnpublish && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50" 
            onClick={(e) => { e.stopPropagation(); onUnpublish(template); }}
            title="Remover da galeria"
          >
            <X size={12} className="mr-1" /> Despublicar
          </Button>
        )}
        
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={(e) => { e.stopPropagation(); onDelete(template); }}>
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
};

// Save Template Dialog Component
const SaveTemplateDialog = ({ meal, allFoods, professionalId, open, onOpenChange, onSaved }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (meal) {
      setTitle(meal.name || 'Modelo de Refeição');
      setDescription(meal.observations || '');
    }
  }, [meal]);
  
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Digite um nome para o modelo');
      return;
    }
    
    setSaving(true);
    try {
      const totals = calculateMealTotals(meal.foods || [], allFoods);
      
      const { data, error } = await createMealTemplate(professionalId, {
        title: title.trim(),
        description: description.trim(),
        category,
        meal_data: {
          name: meal.name,
          time: meal.time,
          color: meal.color,
          foods: meal.foods,
          observations: meal.observations
        },
        total_calories: totals.kcal,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat
      });
      
      if (error) throw error;
      
      toast.success('Modelo salvo com sucesso!');
      onSaved?.(data);
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao salvar modelo:', err);
      toast.error('Erro ao salvar modelo');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="text-teal-600" size={20} />
            Salvar como Modelo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Nome do Modelo *</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Café da Manhã Proteico"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm">Descrição</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o modelo..."
              className="mt-1 h-20"
            />
          </div>
          
          <div>
            <Label className="text-sm">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {meal && (
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="text-xs text-gray-500 mb-1">Preview</p>
              <p className="font-medium text-gray-900">{meal.name}</p>
              <p className="text-xs text-gray-500">{meal.foods?.length || 0} alimentos</p>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-teal-600" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              Salvar Modelo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const MealTemplatesPanel = ({ 
  professionalId, 
  allFoods = [], 
  onApplyTemplate,
  compact = false 
}) => {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [publicCount, setPublicCount] = useState(0);
  
  // Check if PRO
  const isPro = profile?.plan_type === 'pro' || profile?.plan_type === 'enterprise' || profile?.role === 'admin';
  
  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!professionalId) return;
    
    setLoading(true);
    try {
      const { data, error } = await getMealTemplates(professionalId, selectedCategory === 'all' ? null : selectedCategory);
      if (error) throw error;
      setTemplates(data || []);
      
      // Count public templates
      const { count } = await countProfessionalPublicTemplates(professionalId);
      setPublicCount(count || 0);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      toast.error('Erro ao carregar modelos');
    } finally {
      setLoading(false);
    }
  }, [professionalId, selectedCategory]);
  
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);
  
  // Handlers
  const handleApply = async (template) => {
    try {
      await incrementTemplateUse(template.id);
      onApplyTemplate?.(template.meal_data);
      toast.success(`Modelo "${template.title}" aplicado!`);
    } catch (err) {
      console.error('Erro ao aplicar template:', err);
    }
  };
  
  const handleDelete = async (template) => {
    if (!window.confirm(`Remover modelo "${template.title}"?`)) return;
    
    try {
      const { error } = await deleteMealTemplate(template.id);
      if (error) throw error;
      
      toast.success('Modelo removido');
      loadTemplates();
    } catch (err) {
      console.error('Erro ao remover template:', err);
      toast.error('Erro ao remover modelo');
    }
  };
  
  // Filter templates
  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <BookMarked size={16} className="text-teal-600" />
          <span className="font-semibold text-sm text-gray-900">Meus Modelos</span>
          <Badge className="bg-teal-100 text-teal-700 text-[9px]">{templates.length}</Badge>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-400">Nenhum modelo salvo</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredTemplates.slice(0, 5).map(template => (
              <button
                key={template.id}
                onClick={() => handleApply(template)}
                className="w-full text-left p-2 rounded-lg border hover:border-teal-400 hover:bg-teal-50/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />
                  <span className="text-sm font-medium text-gray-700 truncate flex-1">{template.title}</span>
                  <span className="text-[10px] text-teal-600 font-semibold">{template.total_calories}kcal</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <Card className="border-2 border-teal-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
            <BookMarked size={16} className="text-teal-600" />
          </div>
          Modelos de Refeições
          <Badge className="bg-teal-100 text-teal-700 ml-auto">{templates.length}</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
            <Input 
              placeholder="Buscar modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Templates List */}
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <BookMarked className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">
                {searchTerm ? 'Nenhum modelo encontrado' : 'Você ainda não tem modelos salvos'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Salve refeições como modelo para reutilizar
              </p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {filteredTemplates.map(template => (
                <TemplateItem 
                  key={template.id}
                  template={template}
                  onApply={handleApply}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Export both components
export { MealTemplatesPanel, SaveTemplateDialog };
export default MealTemplatesPanel;
