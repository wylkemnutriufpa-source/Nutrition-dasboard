/**
 * PublicTemplatesGallery.js
 * Galeria de Templates Públicos aprovados
 * Disponível para planos Basic e PRO
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Globe, Search, Star, Utensils, Clock, Copy, Loader2, 
  ChevronRight, User, TrendingUp, Filter, Sparkles, Check,
  Lock, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getPublicMealTemplates, 
  copyPublicTemplate,
  incrementTemplateUse
} from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES = [
  { value: 'all', label: 'Todos', icon: '📋' },
  { value: 'breakfast', label: 'Café da Manhã', icon: '🌅' },
  { value: 'lunch', label: 'Almoço', icon: '☀️' },
  { value: 'dinner', label: 'Jantar', icon: '🌙' },
  { value: 'snack', label: 'Lanche', icon: '🍎' },
  { value: 'general', label: 'Geral', icon: '🍽️' }
];

// Template Card Component
const PublicTemplateCard = ({ template, onCopy, onApply, copying }) => {
  const mealData = template.meal_data || {};
  const foodCount = mealData.foods?.length || 0;
  const creator = template.creator;
  
  return (
    <div className="group p-4 border-2 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all bg-white">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ backgroundColor: `${mealData.color || '#3B82F6'}20` }}
        >
          <Utensils size={22} style={{ color: mealData.color || '#3B82F6' }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 truncate">{template.title}</h4>
          <p className="text-xs text-gray-500 line-clamp-1">{template.description || 'Sem descrição'}</p>
        </div>
        
        {template.use_count > 10 && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex-shrink-0">
            <TrendingUp size={12} className="mr-1" /> Popular
          </Badge>
        )}
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="font-semibold text-blue-600">{template.total_calories || 0} kcal</span>
        <span>{foodCount} alimentos</span>
        <span className="flex items-center gap-1">
          <Star size={12} className="text-amber-500" /> {template.use_count || 0}x usado
        </span>
      </div>
      
      {/* Creator */}
      {creator && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
          <Avatar className="h-6 w-6">
            <AvatarImage src={creator.photo_url} />
            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
              {creator.name?.charAt(0) || 'P'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-gray-600">por <strong>{creator.name || 'Profissional'}</strong></span>
        </div>
      )}
      
      {/* Foods Preview */}
      {mealData.foods?.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-gray-400 uppercase mb-1">Alimentos</p>
          <div className="flex flex-wrap gap-1">
            {mealData.foods.slice(0, 4).map((food, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] bg-white">
                {food.name || 'Alimento'}
              </Badge>
            ))}
            {mealData.foods.length > 4 && (
              <Badge variant="outline" className="text-[10px] bg-gray-100">
                +{mealData.foods.length - 4}
              </Badge>
            )}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 h-9"
          onClick={() => onApply(template)}
        >
          <Sparkles size={14} className="mr-1" /> Usar Agora
        </Button>
        <Button 
          size="sm" 
          className="flex-1 h-9 bg-blue-600 hover:bg-blue-700"
          onClick={() => onCopy(template)}
          disabled={copying === template.id}
        >
          {copying === template.id ? (
            <Loader2 size={14} className="animate-spin mr-1" />
          ) : (
            <Copy size={14} className="mr-1" />
          )}
          Copiar
        </Button>
      </div>
    </div>
  );
};

// Locked State for Free Users
const LockedGallery = () => (
  <div className="text-center py-12 px-6">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Lock size={32} className="text-gray-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">Galeria Exclusiva</h3>
    <p className="text-gray-500 mb-4 max-w-md mx-auto">
      A galeria de templates públicos está disponível apenas para planos pagos (Basic e PRO).
      Faça upgrade para acessar centenas de templates criados por profissionais.
    </p>
    <Button className="bg-gradient-to-r from-amber-500 to-orange-500">
      <Crown size={16} className="mr-2" /> Fazer Upgrade
    </Button>
  </div>
);

// Main Component
const PublicTemplatesGallery = ({ 
  onApplyTemplate,
  onCopyComplete 
}) => {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copying, setCopying] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  
  // Check if user has access (basic, pro, enterprise, admin)
  const hasAccess = profile?.plan_type && ['basic', 'pro', 'enterprise'].includes(profile.plan_type) || profile?.role === 'admin';
  
  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await getPublicMealTemplates(
        selectedCategory === 'all' ? null : selectedCategory
      );
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Erro ao carregar galeria:', err);
      toast.error('Erro ao carregar galeria');
    } finally {
      setLoading(false);
    }
  }, [hasAccess, selectedCategory]);
  
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);
  
  // Handlers
  const handleCopy = async (template) => {
    if (!user?.id) return;
    
    setCopying(template.id);
    try {
      const { data, error } = await copyPublicTemplate(template.id, user.id);
      if (error) throw error;
      
      toast.success('Template copiado para seus modelos!');
      onCopyComplete?.(data);
    } catch (err) {
      console.error('Erro ao copiar:', err);
      toast.error('Erro ao copiar template');
    } finally {
      setCopying(null);
    }
  };
  
  const handleApply = async (template) => {
    await incrementTemplateUse(template.id);
    onApplyTemplate?.(template.meal_data);
    toast.success(`Template "${template.title}" aplicado!`);
  };
  
  // Filter templates
  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.creator?.name && t.creator.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // If no access, show locked state
  if (!hasAccess) {
    return (
      <Card className="border-2 border-gray-200">
        <LockedGallery />
      </Card>
    );
  }
  
  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow">
            <Globe size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <span className="text-lg">Galeria de Templates</span>
            <p className="text-xs text-gray-500 font-normal">Templates públicos da comunidade</p>
          </div>
          <Badge className="bg-blue-100 text-blue-700">{templates.length} disponíveis</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <Input 
              placeholder="Buscar template ou criador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <Filter size={14} className="mr-2 text-gray-400" />
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
        
        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">
              {searchTerm ? 'Nenhum template encontrado' : 'Nenhum template disponível nesta categoria'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
              {filteredTemplates.map(template => (
                <PublicTemplateCard 
                  key={template.id}
                  template={template}
                  onCopy={handleCopy}
                  onApply={handleApply}
                  copying={copying}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PublicTemplatesGallery;
