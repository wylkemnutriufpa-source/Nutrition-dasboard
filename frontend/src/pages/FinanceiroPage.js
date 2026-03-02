import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2,
  Edit, Loader2, ArrowUpCircle, ArrowDownCircle, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFinancialRecords, createFinancialRecord,
  updateFinancialRecord, deleteFinancialRecord
} from '@/lib/supabase';

const MONTHS_PT_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const CATEGORIES = {
  income: ['Mensalidade', 'Consulta avulsa', 'Plano trimestral', 'Plano semestral', 'Plano anual', 'Outro'],
  expense: ['Aluguel', 'Material', 'Software', 'Cursos', 'Marketing', 'Transporte', 'Alimentação', 'Outro'],
};

const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const FinanceiroPage = () => {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: 'income',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const professionalId = user?.id || profile?.id;

  useEffect(() => {
    if (professionalId) loadData();
    trackProfessionalFeature('view_financeiro');
  }, [professionalId, year]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await getFinancialRecords(professionalId, year);
    setRecords(data || []);
    setLoading(false);
  };

  // KPIs
  const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
  const balance = totalIncome - totalExpense;

  // Monthly chart data
  const monthlyData = MONTHS_PT_SHORT.map((name, i) => {
    const monthRecords = records.filter(r => {
      const d = new Date(r.date + 'T00:00:00');
      return d.getMonth() === i && d.getFullYear() === year;
    });
    return {
      name,
      Receitas: monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0),
      Despesas: monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0),
    };
  });

  // Category breakdown
  const categoryTotals = records.reduce((acc, r) => {
    const key = r.category || 'Outro';
    if (!acc[key]) acc[key] = { income: 0, expense: 0 };
    acc[key][r.type] += Number(r.amount);
    return acc;
  }, {});

  // Filtered list
  const filteredRecords = records.filter(r => filterType === 'all' || r.type === filterType);

  const openAddModal = () => {
    setEditingRecord(null);
    setForm({ type: 'income', category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowModal(true);
  };

  const openEditModal = (r) => {
    setEditingRecord(r);
    setForm({ type: r.type, category: r.category || '', description: r.description, amount: String(r.amount), date: r.date, notes: r.notes || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.date) {
      toast.error('Preencha descrição, valor e data');
      return;
    }
    setSaving(true);
    const payload = { ...form, amount: parseFloat(form.amount), professional_id: professionalId };
    try {
      if (editingRecord) {
        const { error } = await updateFinancialRecord(editingRecord.id, payload);
        if (error) throw error;
        toast.success('Registro atualizado!');
      } else {
        const { error } = await createFinancialRecord(payload);
        if (error) throw error;
        toast.success('Registro adicionado!');
        trackProfessionalFeature('create_financial_record');
      }
      setShowModal(false);
      loadData();
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este registro?')) return;
    await deleteFinancialRecord(id);
    toast.success('Excluído!');
    loadData();
  };

  if (loading) return (
    <Layout title="Financeiro" userType={profile?.role || 'professional'}>
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    </Layout>
  );

  return (
    <Layout title="Gestão Financeira" userType={profile?.role || 'professional'}>
      <div className="max-w-7xl mx-auto space-y-6 pb-8">

        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-3">Gestao Financeira</span>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Financeiro</h1>
                    <p className="text-white/80 text-sm">Controle de entradas e saidas do seu consultorio</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                    <SelectTrigger className="w-24 bg-white/20 border-white/30 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={openAddModal} className="bg-white/20 text-white hover:bg-white/30 border border-white/20 backdrop-blur-sm shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lancamento
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: TrendingUp, value: formatBRL(totalIncome), label: 'Receita Total', color: '' },
                  { icon: TrendingDown, value: formatBRL(totalExpense), label: 'Despesa Total', color: '' },
                  { icon: DollarSign, value: formatBRL(balance), label: 'Balanco', color: '' },
                  { icon: Calendar, value: records.length, label: 'Lancamentos', color: '' }
                ].map((stat, i) => {
                  const StatIcon = stat.icon;
                  return (
                    <div key={i} className="text-center bg-white/15 backdrop-blur-sm rounded-xl p-3">
                      <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-white/20 flex items-center justify-center">
                        <StatIcon className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-lg font-black">{stat.value}</p>
                      <p className="text-[10px] text-white/70">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Recebido</p>
                  <p data-testid="total-income" className="text-2xl font-bold text-green-700">{formatBRL(totalIncome)}</p>
                  <p className="text-xs text-gray-400">{records.filter(r => r.type === 'income').length} lançamento(s)</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowUpCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-red-50 to-rose-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Gasto</p>
                  <p data-testid="total-expense" className="text-2xl font-bold text-red-700">{formatBRL(totalExpense)}</p>
                  <p className="text-xs text-gray-400">{records.filter(r => r.type === 'expense').length} lançamento(s)</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <ArrowDownCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 bg-gradient-to-br ${balance >= 0 ? 'from-teal-50 to-cyan-50' : 'from-orange-50 to-amber-50'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Saldo {year}</p>
                  <p data-testid="balance" className={`text-2xl font-bold ${balance >= 0 ? 'text-teal-700' : 'text-orange-700'}`}>
                    {formatBRL(balance)}
                  </p>
                  <p className="text-xs text-gray-400">Receitas - Despesas</p>
                </div>
                <div className={`w-12 h-12 ${balance >= 0 ? 'bg-teal-100' : 'bg-orange-100'} rounded-full flex items-center justify-center`}>
                  {balance >= 0
                    ? <TrendingUp className="h-6 w-6 text-teal-600" />
                    : <TrendingDown className="h-6 w-6 text-orange-600" />
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receitas vs Despesas por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatBRL(v)} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#0d9488" radius={[3,3,0,0]} />
                  <Bar dataKey="Despesas" fill="#f87171" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Saldo Acumulado</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={monthlyData.map((m, i) => ({
                    name: m.name,
                    Saldo: monthlyData.slice(0, i + 1).reduce((s, x) => s + x.Receitas - x.Despesas, 0)
                  }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatBRL(v)} />
                  <Line type="monotone" dataKey="Saldo" stroke="#0d9488" strokeWidth={2} dot={{ fill: '#0d9488', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Lançamentos</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="income">Receitas</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum lançamento registrado</p>
                <p className="text-sm text-gray-400">Clique em "Novo Lançamento" para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecords.map(record => (
                  <div
                    key={record.id}
                    data-testid={`record-${record.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${record.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{record.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">
                          {new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        {record.category && (
                          <Badge className="text-xs bg-gray-100 text-gray-600">{record.category}</Badge>
                        )}
                        {record.patient?.name && (
                          <Badge className="text-xs bg-teal-50 text-teal-700">{record.patient.name}</Badge>
                        )}
                      </div>
                    </div>
                    <p className={`font-bold text-sm flex-shrink-0 ${record.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                      {record.type === 'income' ? '+' : '-'}{formatBRL(record.amount)}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" onClick={() => openEditModal(record)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'income', category: '' })}
                    className={`p-3 rounded-lg border-2 flex items-center gap-2 transition-all ${form.type === 'income' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                  >
                    <ArrowUpCircle className={`h-4 w-4 ${form.type === 'income' ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${form.type === 'income' ? 'text-green-700' : 'text-gray-600'}`}>Receita</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'expense', category: '' })}
                    className={`p-3 rounded-lg border-2 flex items-center gap-2 transition-all ${form.type === 'expense' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  >
                    <ArrowDownCircle className={`h-4 w-4 ${form.type === 'expense' ? 'text-red-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${form.type === 'expense' ? 'text-red-700' : 'text-gray-600'}`}>Despesa</span>
                  </button>
                </div>
              </div>
              <div>
                <Label>Descrição *</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Mensalidade Maria - Março" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {(CATEGORIES[form.type] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-teal-600 hover:bg-teal-700">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingRecord ? 'Salvar' : 'Adicionar'}
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FinanceiroPage;
