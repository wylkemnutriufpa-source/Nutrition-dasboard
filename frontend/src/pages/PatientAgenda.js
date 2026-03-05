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
import { Calendar, Clock, Plus, Trash2, Loader2, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getPatientAppointments, createAppointment, deleteAppointment } from '@/lib/supabase';

const TYPE_CONFIG = {
  presencial: { label: 'Presencial', color: 'bg-teal-500', bg: 'bg-teal-100', text: 'text-teal-700', icon: '🏢' },
  online: { label: 'Online', color: 'bg-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', icon: '💻' },
  retorno: { label: 'Retorno', color: 'bg-purple-500', bg: 'bg-purple-100', text: 'text-purple-700', icon: '🔄' },
  lembrete: { label: 'Lembrete', color: 'bg-orange-500', bg: 'bg-orange-100', text: 'text-orange-700', icon: '🔔' },
  feedback: { label: 'Feedback', color: 'bg-pink-500', bg: 'bg-pink-100', text: 'text-pink-700', icon: '📝' },
  vencimento: { label: 'Vencimento Plano', color: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700', icon: '⚠️' },
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Componente de Calendário Visual
const CalendarView = ({ appointments, onDateClick, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    // Dias do mês anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
    }
    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    // Dias do próximo mês
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }
    return days;
  };

  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(a => a.date === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    return date.toISOString().split('T')[0] === selectedDate;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            <ChevronLeft size={20} />
          </Button>
          <CardTitle className="text-lg">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            <ChevronRight size={20} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Header dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid dos dias */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((dayInfo, idx) => {
            const dayAppointments = getAppointmentsForDate(dayInfo.date);
            const hasAppointments = dayAppointments.length > 0;
            
            return (
              <div
                key={idx}
                onClick={() => onDateClick(dayInfo.date.toISOString().split('T')[0])}
                className={`
                  relative min-h-[60px] p-1 rounded-lg cursor-pointer transition-all
                  ${dayInfo.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400'}
                  ${isToday(dayInfo.date) ? 'ring-2 ring-teal-500' : ''}
                  ${isSelected(dayInfo.date) ? 'bg-teal-50 ring-2 ring-teal-600' : ''}
                `}
              >
                <span className={`
                  text-sm font-medium
                  ${isToday(dayInfo.date) ? 'text-teal-700' : ''}
                `}>
                  {dayInfo.day}
                </span>
                
                {/* Indicadores de compromissos */}
                {hasAppointments && (
                  <div className="mt-1 space-y-0.5">
                    {dayAppointments.slice(0, 2).map((appt, i) => {
                      const cfg = TYPE_CONFIG[appt.type] || TYPE_CONFIG.lembrete;
                      return (
                        <div key={i} className={`text-xs truncate px-1 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                          {appt.title.substring(0, 8)}...
                        </div>
                      );
                    })}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayAppointments.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const PatientAgenda = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const [form, setForm] = useState({
    title: '', date: '', time: '', type: 'lembrete', notes: ''
  });

  useEffect(() => {
    if (user?.id) loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    setLoading(true);
    const { data } = await getPatientAppointments(user.id);
    setAppointments(data || []);
    setLoading(false);
  };

  const openModal = (date = null) => {
    setForm({ 
      title: '', 
      date: date || new Date().toISOString().split('T')[0], 
      time: '', 
      type: 'lembrete', 
      notes: '' 
    });
    setShowModal(true);
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    openModal(dateStr);
  };

  const handleSave = async () => {
    if (!form.title || !form.date) { toast.error('Preencha título e data'); return; }
    setSaving(true);
    const { error } = await createAppointment({ ...form, patient_id: user.id, professional_id: null });
    if (error) { toast.error('Erro ao salvar'); } else {
      toast.success('Compromisso salvo!');
      setShowModal(false);
      loadAppointments();
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deleteAppointment(id);
    toast.success('Removido!');
    loadAppointments();
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = appointments.filter(a => new Date(a.date + 'T00:00:00') >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = appointments.filter(a => new Date(a.date + 'T00:00:00') < now);

  if (loading) return (
    <Layout title="Minha Agenda" userType="patient">
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    </Layout>
  );

  return (
    <Layout title="Minha Agenda" userType="patient">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Minha Agenda</h2>
            <p className="text-gray-500">Consultas, feedbacks e lembretes</p>
          </div>
          <Button
            data-testid="new-reminder-btn"
            onClick={() => openModal()}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Lembrete
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendário Visual */}
          <CalendarView 
            appointments={appointments} 
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
          />

          {/* Lista de Próximos Compromissos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-600" />
                Próximos Compromissos
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {upcoming.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum compromisso futuro</p>
                  <p className="text-sm text-gray-400">Clique no calendário para adicionar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map(appt => {
                    const cfg = TYPE_CONFIG[appt.type] || TYPE_CONFIG.lembrete;
                    return (
                      <div key={appt.id} data-testid={`appointment-${appt.id}`} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                        <div className={`w-3 h-3 mt-1.5 rounded-full flex-shrink-0 ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{appt.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-sm text-gray-500">
                              {new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </span>
                            {appt.time && (
                              <span className="text-sm text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {appt.time}
                              </span>
                            )}
                            <Badge className={`${cfg.bg} ${cfg.text} text-xs`}>
                              {cfg.icon} {cfg.label}
                            </Badge>
                          </div>
                          {appt.notes && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{appt.notes}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(appt.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Compromissos Passados */}
        {past.length > 0 && (
          <Card className="opacity-75">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-500">Compromissos Passados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {past.slice(0, 5).map(appt => {
                  const cfg = TYPE_CONFIG[appt.type] || TYPE_CONFIG.lembrete;
                  return (
                    <div key={appt.id} className="flex items-center gap-3 p-2 rounded text-gray-500">
                      <div className={`w-2 h-2 rounded-full ${cfg.color} opacity-50`} />
                      <span className="text-sm">{appt.title}</span>
                      <span className="text-xs ml-auto">
                        {new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 h-6 w-6 p-0" onClick={() => handleDelete(appt.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
                {past.length > 5 && (
                  <p className="text-sm text-gray-400 text-center">
                    + {past.length - 5} compromissos anteriores
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Compromisso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Consulta de retorno"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Horário</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Detalhes ou lembretes adicionais..."
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PatientAgenda;
