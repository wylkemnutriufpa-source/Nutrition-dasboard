import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, Calendar, DollarSign, Star, Package, 
  Edit, Save, X, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { getPatientSubscription, upsertPatientSubscription } from '@/lib/supabase';

/**
 * Componente de Gestão de Assinatura do Paciente
 * Exibe e edita: Pacote, Datas, Pagamento, Tier, Plano Atual
 */
const PatientSubscriptionCard = ({ patientId, professionalId, onUpdate }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    package_type: 'mensal',
    start_date: '',
    end_date: '',
    amount_paid: '',
    payment_method: 'pix',
    payment_date: '',
    tier: 'basic',
    current_plan_name: 'Plano Inicial',
    notes: ''
  });

  useEffect(() => {
    loadSubscription();
  }, [patientId]);

  const loadSubscription = async () => {
    setLoading(true);
    const { data, error } = await getPatientSubscription(patientId);
    
    if (error && error.code !== 'PGRST116') { // Não é erro de "não encontrado"
      console.error('Erro ao carregar assinatura:', error);
      toast.error('Erro ao carregar assinatura');
    }
    
    if (data) {
      setSubscription(data);
      setFormData({
        package_type: data.package_type,
        start_date: data.start_date,
        end_date: data.end_date,
        amount_paid: data.amount_paid || '',
        payment_method: data.payment_method || 'pix',
        payment_date: data.payment_date || '',
        tier: data.tier,
        current_plan_name: data.current_plan_name || 'Plano Inicial',
        notes: data.notes || ''
      });
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { data, error } = await upsertPatientSubscription(
      patientId, 
      professionalId, 
      formData
    );
    
    if (error) {
      console.error('Erro ao salvar assinatura:', error);
      toast.error('Erro ao salvar assinatura');
    } else {
      setSubscription(data);
      setEditing(false);
      toast.success('✅ Assinatura atualizada!');
      onUpdate?.();
    }
    
    setSaving(false);
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'Ativo', color: 'emerald', icon: <CheckCircle2 size={12} /> },
      expiring: { label: 'Vencendo', color: 'amber', icon: <Clock size={12} /> },
      expired: { label: 'Vencido', color: 'red', icon: <AlertTriangle size={12} /> },
      cancelled: { label: 'Cancelado', color: 'gray', icon: <X size={12} /> }
    };
    
    const badge = badges[status] || badges.expired;
    
    return (
      <Badge className={`bg-${badge.color}-100 text-${badge.color}-700 flex items-center gap-1`}>
        {badge.icon}
        {badge.label}
      </Badge>
    );
  };

  const getTierBadge = (tier) => {
    return tier === 'pro' ? (
      <Badge className="bg-violet-100 text-violet-700 flex items-center gap-1">
        <Star size={12} /> PRO
      </Badge>
    ) : (
      <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
        Basic
      </Badge>
    );
  };

  const packageOptions = [
    { value: 'mensal', label: 'Mensal', duration: '30 dias' },
    { value: 'trimestral', label: 'Trimestral', duration: '90 dias' },
    { value: 'semestral', label: 'Semestral', duration: '180 dias' },
    { value: 'anual', label: 'Anual', duration: '365 dias' }
  ];

  const paymentMethods = [
    { value: 'pix', label: '📱 PIX' },
    { value: 'cartao', label: '💳 Cartão' },
    { value: 'boleto', label: '📄 Boleto' },
    { value: 'dinheiro', label: '💵 Dinheiro' },
    { value: 'outro', label: '➕ Outro' }
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin text-violet-600">⏳</div>
            <span className="ml-2 text-gray-600">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <CreditCard size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">💳 Assinatura & Pacote</h3>
              <p className="text-sm text-gray-500">Gerencie o plano do paciente</p>
            </div>
          </div>
          
          {!editing && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setEditing(true)}
              className="border-violet-300 text-violet-700 hover:bg-violet-50"
            >
              <Edit size={14} className="mr-2" />
              Editar
            </Button>
          )}
        </div>

        {!subscription && !editing ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Package size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 mb-4">Nenhuma assinatura cadastrada</p>
            <Button 
              size="sm"
              onClick={() => setEditing(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus size={14} className="mr-2" />
              Cadastrar Assinatura
            </Button>
          </div>
        ) : editing ? (
          <div className="space-y-4">
            {/* Pacote */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">📦 Tipo de Pacote *</Label>
                <select
                  value={formData.package_type}
                  onChange={(e) => setFormData({...formData, package_type: e.target.value})}
                  className="w-full h-9 text-sm border rounded-lg px-3"
                >
                  {packageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.duration})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">⭐ Tier *</Label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({...formData, tier: e.target.value})}
                  className="w-full h-9 text-sm border rounded-lg px-3"
                >
                  <option value="basic">🔹 Basic</option>
                  <option value="pro">⭐ PRO</option>
                </select>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">📅 Data de Início *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">📅 Data de Término *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Financeiro */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold">💰 Valor Pago</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({...formData, amount_paid: e.target.value})}
                  placeholder="150.00"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">💳 Forma de Pagamento</Label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  className="w-full h-9 text-sm border rounded-lg px-3"
                >
                  {paymentMethods.map(pm => (
                    <option key={pm.value} value={pm.value}>{pm.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">📅 Data Pagamento</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Plano Atual */}
            <div>
              <Label className="text-xs font-semibold">🍽️ Plano Alimentar Atual</Label>
              <select
                value={formData.current_plan_name}
                onChange={(e) => setFormData({...formData, current_plan_name: e.target.value})}
                className="w-full h-9 text-sm border rounded-lg px-3"
              >
                <option value="Plano Inicial">Plano Inicial</option>
                <option value="Plan 1">Plan 1</option>
                <option value="Plan 2">Plan 2</option>
                <option value="Plan 3">Plan 3</option>
              </select>
            </div>

            {/* Observações */}
            <div>
              <Label className="text-xs font-semibold">📝 Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Observações sobre a assinatura..."
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditing(false);
                  if (subscription) {
                    setFormData({
                      package_type: subscription.package_type,
                      start_date: subscription.start_date,
                      end_date: subscription.end_date,
                      amount_paid: subscription.amount_paid || '',
                      payment_method: subscription.payment_method || 'pix',
                      payment_date: subscription.payment_date || '',
                      tier: subscription.tier,
                      current_plan_name: subscription.current_plan_name || 'Plano Inicial',
                      notes: subscription.notes || ''
                    });
                  }
                }}
                className="flex-1"
                disabled={saving}
              >
                <X size={14} className="mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                disabled={saving || !formData.package_type || !formData.start_date || !formData.end_date}
              >
                {saving ? (
                  <>⏳ Salvando...</>
                ) : (
                  <>
                    <Save size={14} className="mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Status e Tier */}
            <div className="flex items-center gap-3">
              {getStatusBadge(subscription.status)}
              {getTierBadge(subscription.tier)}
            </div>

            {/* Pacote */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">📦 Pacote</p>
                <p className="text-sm font-bold text-gray-900 capitalize">{subscription.package_type}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">🍽️ Plano Atual</p>
                <p className="text-sm font-bold text-gray-900">{subscription.current_plan_name}</p>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">📅 Início</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(subscription.start_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">📅 Término</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(subscription.end_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Financeiro */}
            {subscription.amount_paid && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-700 mb-1">💰 Valor Pago</p>
                    <p className="text-lg font-bold text-emerald-900">
                      R$ {parseFloat(subscription.amount_paid).toFixed(2)}
                    </p>
                  </div>
                  {subscription.payment_method && (
                    <Badge className="bg-white text-gray-700 text-xs">
                      {paymentMethods.find(p => p.value === subscription.payment_method)?.label || subscription.payment_method}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Observações */}
            {subscription.notes && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">📝 Observações</p>
                <p className="text-sm text-gray-700">{subscription.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientSubscriptionCard;
