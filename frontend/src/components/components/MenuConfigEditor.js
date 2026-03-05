import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, Eye, EyeOff, Edit2, Check, X, Save,
  Calendar, ClipboardList, MessageSquare, ShoppingCart,
  ChefHat, Pill, Lightbulb, TrendingUp, RotateCcw,
  Home, Bell, Calculator, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { getPatientMenuConfig, upsertPatientMenuConfig, DEFAULT_PATIENT_MENU } from '@/lib/supabase';

// Mapeamento de ícones para display
const iconMap = {
  Home,
  Bell,
  Calendar,
  ClipboardList,
  MessageSquare,
  ShoppingCart,
  ChefHat,
  Pill,
  Lightbulb,
  TrendingUp,
  Calculator
};

const MenuConfigEditor = ({ patientId, professionalId, onSave }) => {
  const [menuItems, setMenuItems] = useState(DEFAULT_PATIENT_MENU);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    loadMenuConfig();
  }, [patientId]);

  const loadMenuConfig = async () => {
    setLoading(true);
    try {
      const { data } = await getPatientMenuConfig(patientId);
      if (data?.menu_items && Array.isArray(data.menu_items)) {
        setMenuItems(data.menu_items);
      } else {
        setMenuItems([...DEFAULT_PATIENT_MENU]);
      }
    } catch (error) {
      console.error('Erro ao carregar menu:', error);
      setMenuItems([...DEFAULT_PATIENT_MENU]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = (itemId) => {
    setMenuItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const handleSaveEdit = (itemId) => {
    if (!editName.trim()) {
      toast.error('O nome não pode ficar vazio');
      return;
    }
    
    setMenuItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, name: editName } : item
      )
    );
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  // Drag and Drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetItem) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    setMenuItems(items => {
      const newItems = [...items];
      const draggedIndex = newItems.findIndex(i => i.id === draggedItem.id);
      const targetIndex = newItems.findIndex(i => i.id === targetItem.id);
      
      // Reordenar
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, removed);
      
      // Atualizar order
      return newItems.map((item, index) => ({ ...item, order: index + 1 }));
    });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleReset = () => {
    setMenuItems([...DEFAULT_PATIENT_MENU]);
    toast.info('Menu resetado para configuração padrão');
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await upsertPatientMenuConfig(patientId, menuItems, professionalId);
      
      if (error) {
        toast.error('Erro ao salvar configuração');
        console.error(error);
        return;
      }
      
      toast.success('Menu configurado com sucesso!');
      trackProfessionalFeature('configure_patient_menu');
      if (onSave) onSave(menuItems);
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (iconName) => {
    const Icon = iconMap[iconName];
    return Icon ? <Icon size={18} className="text-gray-500" /> : null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Carregando configuração do menu...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit2 size={20} />
          Configurar Menu Completo do Paciente
        </CardTitle>
        <CardDescription>
          Personalize TODO o menu do paciente. Arraste para reordenar, clique no nome para editar, use o switch para mostrar/ocultar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de itens */}
        <div className="space-y-2">
          {menuItems.sort((a, b) => a.order - b.order).map((item) => (
            <div
              key={item.id}
              draggable={!item.fixed}
              onDragStart={(e) => !item.fixed && handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                item.visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
              } ${draggedItem?.id === item.id ? 'opacity-50' : ''} ${item.fixed ? 'cursor-default' : 'cursor-move'} hover:shadow-sm`}
            >
              {/* Grip para arrastar */}
              <GripVertical size={18} className={`flex-shrink-0 ${item.fixed ? 'text-gray-200' : 'text-gray-400'}`} />
              
              {/* Ícone do item */}
              <div className="flex-shrink-0">
                {getIcon(item.icon)}
              </div>
              
              {/* Nome (editável) */}
              <div className="flex-1">
                {editingId === item.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(item.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(item.id)}>
                      <Check size={16} className="text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      <X size={16} className="text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(item)}
                      className={`text-left font-medium text-sm hover:text-teal-600 transition-colors ${
                        !item.visible ? 'text-gray-400' : 'text-gray-700'
                      }`}
                    >
                      {item.name}
                    </button>
                    {item.fixed && (
                      <Badge variant="outline" className="text-xs text-gray-400">
                        <Lock size={10} className="mr-1" /> Fixo
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {/* Toggle de visibilidade */}
              <div className="flex items-center gap-2">
                <Label htmlFor={`visibility-${item.id}`} className="text-xs text-gray-500">
                  {item.visible ? 'Visível' : 'Oculto'}
                </Label>
                <Switch
                  id={`visibility-${item.id}`}
                  checked={item.visible}
                  onCheckedChange={() => handleToggleVisibility(item.id)}
                  disabled={item.fixed}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            <RotateCcw size={16} className="mr-2" />
            Resetar Padrão
          </Button>
          <Button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            <Save size={16} className="mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Preview do Menu</p>
          <div className="flex flex-wrap gap-2">
            {menuItems
              .filter(item => item.visible)
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <span 
                  key={item.id}
                  className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border"
                >
                  {item.name}
                </span>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuConfigEditor;
