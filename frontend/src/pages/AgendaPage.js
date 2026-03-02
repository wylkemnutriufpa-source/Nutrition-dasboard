import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Clock, User,
  Video, MapPin, Trash2, Edit, Loader2, Check, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAppointments, createAppointment, updateAppointment,
  deleteAppointment, getProfessionalPatients
} from '@/lib/supabase';

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

const TYPE_CONFIG = {
  presencial: { label: 'Presencial', color: 'bg-teal-500', text: 'text-teal-700', bg: 'bg-teal-100', icon: '🏢' },
  online: { label: 'Online', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-100', icon: '💻' },
  retorno: { label: 'Retorno', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-100', icon: '🔄' },
  lembrete: { label: 'Lembrete', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-100', icon: '🔔' },
  feedback: { label: 'Feedback', color: 'bg-pink-500', text: 'text-pink-700', bg: 'bg-pink-100', icon: '📝' },
  vencimento: { label: 'Vencimento Plano', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-100', icon: '⚠️' },
};

const STATUS_CONFIG = {
  scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Realizado', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
};

const AgendaPage = () => {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    patient_id: 'none',
    title: '',
    date: '',
    time: '',
    type: 'presencial',
    status: 'scheduled',
    notes: ''
  });

  const professionalId = user?.id || profile?.id;

  useEffect(() => {
    if (professionalId) loadData();
    trackProfessionalFeature('view_agenda');
  }, [professionalId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apptResult, patientsResult] = await Promise.all([
        getAppointments(professionalId),
        getProfessionalPatients(professionalId, profile?.role === 'admin')
      ]);
      setAppointments(apptResult.data || []);
      setPatients((patientsResult.data || []).map(p => p.patient || p));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday-first
  };

  const calendarDays = (() => {
    const total = getDaysInMonth(year, month);
    const padding = getFirstDayOfMonth(year, month);
    const days = Array(padding).fill(null);
    for (let d = 1; d <= total; d++) days.push(d);
    return days;
  })();

  const getAppointmentsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(a => a.date === dateStr);
  };

  const today = new Date();
  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (day) => {
    if (!selectedDate || !day) return false;
    return selectedDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowDayModal(true);
  };

  const openAddModal = (dateStr = null) => {
    setEditingAppointment(null);
    setForm({
      patient_id: 'none',
      title: '',
      date: dateStr || selectedDate || new Date().toISOString().split('T')[0],
      time: '09:00',
      type: 'presencial',
      status: 'scheduled',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (appt) => {
    setEditingAppointment(appt);
    setForm({
      patient_id: appt.patient_id || 'none',
      title: appt.title || '',
      date: appt.date || '',
      time: appt.time || '',
      type: appt.type || 'presencial',
      status: appt.status || 'scheduled',
      notes: appt.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date) {
      toast.error('Título e data são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, professional_id: professionalId, patient_id: form.patient_id === 'none' ? null : (form.patient_id || null) };
      if (editingAppointment) {
        const { error } = await updateAppointment(editingAppointment.id, payload);
        if (error) throw error;
        toast.success('Consulta atualizada!');
      } else {
        const { error } = await createAppointment(payload);
        if (error) throw error;
        toast.success('Consulta agendada!');
        trackProfessionalFeature('create_calendar_event');
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
    if (!window.confirm('Excluir esta consulta?')) return;
    const { error } = await deleteAppointment(id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Excluído!');
    loadData();
  };

  const handleStatusChange = async (appt, newStatus) => {
    await updateAppointment(appt.id, { status: newStatus });
    loadData();
  };

  // Upcoming appointments (next 7 days)
  const upcomingAppointments = appointments
    .filter(a => {
      const d = new Date(a.date + 'T00:00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return d >= now && a.status === 'scheduled';
    })
    .slice(0, 8);

  const selectedDayAppointments = selectedDate
    ? appointments.filter(a => a.date === selectedDate)
    : [];

  if (loading) {
    return (
      <Layout title="Agenda" userType={profile?.role || 'professional'}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Agenda de Consultas" userType={profile?.role || 'professional'}>
      <div className="max-w-7xl mx-auto space-y-6 pb-8">

        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-3">Organizacao</span>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Agenda de Consultas</h1>
                    <p className="text-white/80 text-sm">Organize e gerencie seus atendimentos</p>
                  </div>
                </div>
                <Button data-testid="new-appointment-btn" onClick={() => openAddModal()} className="bg-white/20 text-white hover:bg-white/30 border border-white/20 backdrop-blur-sm shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Consulta
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Calendar, value: appointments.filter(a => a.status === 'scheduled').length, label: 'Agendadas' },
                  { icon: Clock, value: upcomingAppointments.length, label: 'Proximas' },
                  { icon: CheckCircle2, value: appointments.filter(a => a.status === 'completed').length, label: 'Concluidas' },
                  { icon: User, value: appointments.length, label: 'Total' }
                ].map((stat, i) => {
                  const StatIcon = stat.icon;
                  return (
                    <div key={i} className="text-center bg-white/15 backdrop-blur-sm rounded-xl p-3">
                      <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-white/20 flex items-center justify-center">
                        <StatIcon className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-xl font-black">{stat.value}</p>
                      <p className="text-[10px] text-white/70">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                {/* Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h3 className="text-lg font-bold text-gray-900">
                    {MONTHS_PT[month]} {year}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_PT.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const dayAppts = getAppointmentsForDay(day);
                    return (
                      <div
                        key={idx}
                        data-testid={day ? `calendar-day-${day}` : undefined}
                        onClick={() => handleDayClick(day)}
                        className={`min-h-[60px] p-1 rounded-lg border transition-all cursor-pointer ${
                          !day ? 'border-transparent' :
                          isSelected(day) ? 'border-teal-500 bg-teal-50' :
                          isToday(day) ? 'border-teal-300 bg-teal-50/50' :
                          'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {day && (
                          <>
                            <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                              isToday(day) ? 'bg-teal-600 text-white' : 'text-gray-700'
                            }`}>
                              {day}
                            </div>
                            <div className="space-y-0.5">
                              {dayAppts.slice(0, 2).map((a, i) => {
                                const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.presencial;
                                return (
                                  <div
                                    key={i}
                                    className={`text-xs px-1 py-0.5 rounded truncate ${cfg.bg} ${cfg.text} font-medium`}
                                    title={a.title}
                                  >
                                    {a.time ? a.time.slice(0,5) + ' ' : ''}{a.title}
                                  </div>
                                );
                              })}
                              {dayAppts.length > 2 && (
                                <div className="text-xs text-gray-400">+{dayAppts.length - 2}</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected day details inline removido - agora usa modal */}
          </div>

          {/* Sidebar: Próximas consultas */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-600" />
                  Próximas Consultas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Nenhuma consulta futura</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.map(appt => {
                      const cfg = TYPE_CONFIG[appt.type] || TYPE_CONFIG.presencial;
                      return (
                        <div
                          key={appt.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                          onClick={() => openEditModal(appt)}
                        >
                          <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${cfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{appt.title}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              {appt.time ? ' • ' + appt.time.slice(0,5) : ''}
                            </p>
                            {appt.patient?.name && (
                              <p className="text-xs text-teal-600">{appt.patient.name}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Legenda</p>
                <div className="space-y-2">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${cfg.color}`} />
                      <span className="text-sm text-gray-600">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de Detalhes do Dia */}
        <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-teal-600" />
                {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </DialogTitle>
              <DialogDescription>Eventos e consultas do dia</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedDayAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhuma consulta neste dia</p>
                  <Button 
                    size="sm" 
                    onClick={() => { setShowDayModal(false); openAddModal(selectedDate); }} 
                    className="mt-4 bg-teal-600 hover:bg-teal-700"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Agendar Consulta
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500 font-medium">
                      {selectedDayAppointments.length} evento{selectedDayAppointments.length > 1 ? 's' : ''}
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => { setShowDayModal(false); openAddModal(selectedDate); }}
                      className="text-teal-600 border-teal-300 hover:bg-teal-50"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {selectedDayAppointments
                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                    .map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      onEdit={() => { setShowDayModal(false); openEditModal(appt); }}
                      onDelete={() => { handleDelete(appt.id); }}
                      onStatusChange={(s) => handleStatusChange(appt, s)}
                    />
                  ))}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Criar/Editar Consulta */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? 'Editar Consulta' : 'Nova Consulta'}
              </DialogTitle>
              <DialogDescription>Preencha os dados da consulta</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input
                  data-testid="appointment-title-input"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Consulta de retorno"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="retorno">Retorno</SelectItem>
                      <SelectItem value="lembrete">Lembrete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="completed">Realizado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Paciente (opcional)</Label>
                <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar paciente..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Anotações sobre a consulta..."
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-teal-600 hover:bg-teal-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingAppointment ? 'Salvar' : 'Agendar'}
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

const AppointmentCard = ({ appt, onEdit, onDelete, onStatusChange }) => {
  const cfg = TYPE_CONFIG[appt.type] || TYPE_CONFIG.presencial;
  const statusCfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow">
      <div className={`w-3 h-3 mt-1 rounded-full flex-shrink-0 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 text-sm">{appt.title}</p>
          <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
        </div>
        {appt.time && <p className="text-xs text-gray-500">{appt.time.slice(0,5)}</p>}
        {appt.patient?.name && <p className="text-xs text-teal-600">{appt.patient.name}</p>}
        {appt.notes && <p className="text-xs text-gray-400 mt-1 truncate">{appt.notes}</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {appt.status === 'scheduled' && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => onStatusChange('completed')} title="Marcar como realizado">
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default AgendaPage;
