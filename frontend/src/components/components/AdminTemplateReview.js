/**
 * AdminTemplateReview.js
 * Painel para administradores aprovarem/rejeitarem templates públicos
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Shield, Check, X, Utensils, Clock, Loader2, 
  User, AlertCircle, Eye, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getPendingMealTemplates, 
  adminReviewTemplate 
} from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Pending Template Card
const PendingTemplateCard = ({ template, onApprove, onReject, onPreview }) => {
  const mealData = template.meal_data || {};
  const foodCount = mealData.foods?.length || 0;
  const creator = template.creator;
  
  return (
    <div className="p-4 border-2 border-amber-200 rounded-xl bg-amber-50/30">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${mealData.color || '#F59E0B'}20` }}
        >
          <Utensils size={22} style={{ color: mealData.color || '#F59E0B' }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900">{template.title}</h4>
          <p className="text-xs text-gray-500 line-clamp-2">{template.description || 'Sem descrição'}</p>
        </div>
        
        <Badge className="bg-amber-100 text-amber-700 flex-shrink-0">
          <Clock size={12} className="mr-1" /> Pendente
        </Badge>
      </div>
      
      {/* Creator Info */}
      {creator && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-white rounded-lg border">
          <Avatar className="h-8 w-8">
            <AvatarImage src={creator.photo_url} />
            <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
              {creator.name?.charAt(0) || 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{creator.name || 'Profissional'}</p>
            <p className="text-xs text-gray-500">{creator.email}</p>
          </div>
        </div>
      )}
      
      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="font-semibold text-amber-600">{template.total_calories || 0} kcal</span>
        <span>{foodCount} alimentos</span>
        <span>Categoria: {template.category || 'geral'}</span>
      </div>
      
      {/* Foods Preview */}
      {mealData.foods?.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-gray-400 uppercase mb-1">Alimentos incluídos</p>
          <div className="flex flex-wrap gap-1">
            {mealData.foods.map((food, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] bg-white">
                {food.name} ({food.quantity} {food.unit})
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Observations */}
      {mealData.observations && (
        <div className="mb-3 p-2 bg-white rounded-lg border text-xs text-gray-600">
          <strong>Observações:</strong> {mealData.observations}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 h-9"
          onClick={() => onPreview(template)}
        >
          <Eye size={14} className="mr-1" /> Visualizar
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-9 text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => onReject(template)}
        >
          <X size={14} className="mr-1" /> Rejeitar
        </Button>
        <Button 
          size="sm" 
          className="h-9 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => onApprove(template)}
        >
          <Check size={14} className="mr-1" /> Aprovar
        </Button>
      </div>
    </div>
  );
};

// Main Component
const AdminTemplateReview = () => {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [rejectDialog, setRejectDialog] = useState({ open: false, template: null });
  const [rejectReason, setRejectReason] = useState('');
  
  // Check if admin
  const isAdmin = profile?.role === 'admin';
  
  // Load pending templates
  const loadTemplates = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await getPendingMealTemplates();
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Erro ao carregar pendentes:', err);
      toast.error('Erro ao carregar templates pendentes');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);
  
  // Handlers
  const handleApprove = async (template) => {
    if (!user?.id) return;
    
    setProcessing(template.id);
    try {
      const { data, error } = await adminReviewTemplate(template.id, user.id, 'approve');
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao aprovar');
      
      toast.success(`Template "${template.title}" aprovado!`);
      loadTemplates();
    } catch (err) {
      console.error('Erro ao aprovar:', err);
      toast.error(err.message || 'Erro ao aprovar template');
    } finally {
      setProcessing(null);
    }
  };
  
  const handleRejectClick = (template) => {
    setRejectDialog({ open: true, template });
    setRejectReason('');
  };
  
  const handleRejectConfirm = async () => {
    const template = rejectDialog.template;
    if (!template || !user?.id) return;
    
    setProcessing(template.id);
    try {
      const { data, error } = await adminReviewTemplate(
        template.id, 
        user.id, 
        'reject',
        rejectReason || null
      );
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao rejeitar');
      
      toast.success(`Template "${template.title}" rejeitado`);
      setRejectDialog({ open: false, template: null });
      loadTemplates();
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
      toast.error(err.message || 'Erro ao rejeitar template');
    } finally {
      setProcessing(null);
    }
  };
  
  // If not admin, show nothing
  if (!isAdmin) {
    return null;
  }
  
  return (
    <>
      <Card className="border-2 border-amber-200">
        <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <span className="text-lg">Aprovação de Templates</span>
              <p className="text-xs text-gray-500 font-normal">Templates aguardando revisão</p>
            </div>
            <Badge className="bg-amber-100 text-amber-700">
              {templates.length} pendentes
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Check className="mx-auto h-12 w-12 text-emerald-300 mb-3" />
              <p className="text-gray-500">Nenhum template pendente de aprovação</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-2">
                {templates.map(template => (
                  <PendingTemplateCard 
                    key={template.id}
                    template={template}
                    onApprove={handleApprove}
                    onReject={handleRejectClick}
                    onPreview={(t) => console.log('Preview:', t)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, template: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} /> Rejeitar Template
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Tem certeza que deseja rejeitar o template <strong>"{rejectDialog.template?.title}"</strong>?
            </p>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Motivo da rejeição (opcional)</label>
              <Textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explique o motivo da rejeição..."
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, template: null })}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleRejectConfirm}
              disabled={processing === rejectDialog.template?.id}
            >
              {processing === rejectDialog.template?.id ? (
                <Loader2 size={14} className="animate-spin mr-2" />
              ) : (
                <X size={14} className="mr-2" />
              )}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminTemplateReview;
