/**
 * PatientActivityTimeline
 * Timeline gamificada para o paciente — ver o que fez hoje, streak, XP e conquistas.
 *
 * Gamificação:
 *  - Streak diário (dias consecutivos com atividade)
 *  - XP por tipo de evento
 *  - Barra de progresso diária
 *  - Badges de conquistas desbloqueadas
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame, Star, Trophy, Zap, CheckCircle2, Target, Calendar,
  ListChecks, Scale, MessageSquare, Image, Bell, UserPlus,
  ChevronDown, ChevronUp, Loader2, Sparkles, Award, TrendingUp
} from 'lucide-react';
import { authenticatedGet } from '@/lib/apiClient';

// ─── XP por tipo de evento ────────────────────────────────────────────────────
const XP_MAP = {
  checklist:              10,
  anamnese:               30,
  peso:                   20,
  feedback:               25,
  foto:                   30,
  protocol_activated:     50,
  protocol_scheduled:     20,
  protocol_tasks_synced:  15,
  notificacao:            5,
  cadastro:               100,
};

// ─── Ícone + cor por tipo ─────────────────────────────────────────────────────
const EVENT_CONFIG = {
  checklist:              { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Tarefa concluída' },
  anamnese:               { icon: ListChecks,   color: 'text-blue-500',    bg: 'bg-blue-100',    label: 'Anamnese' },
  peso:                   { icon: Scale,        color: 'text-indigo-500',  bg: 'bg-indigo-100',  label: 'Peso registrado' },
  feedback:               { icon: MessageSquare,color: 'text-violet-500',  bg: 'bg-violet-100',  label: 'Feedback enviado' },
  foto:                   { icon: Image,        color: 'text-pink-500',    bg: 'bg-pink-100',    label: 'Foto enviada' },
  protocol_activated:     { icon: Target,       color: 'text-orange-500',  bg: 'bg-orange-100',  label: 'Protocolo ativado' },
  protocol_scheduled:     { icon: Calendar,     color: 'text-amber-500',   bg: 'bg-amber-100',   label: 'Protocolo programado' },
  protocol_tasks_synced:  { icon: ListChecks,   color: 'text-purple-500',  bg: 'bg-purple-100',  label: 'Tasks adicionadas' },
  notificacao:            { icon: Bell,         color: 'text-gray-400',    bg: 'bg-gray-100',    label: 'Notificação' },
  cadastro:               { icon: UserPlus,     color: 'text-green-500',   bg: 'bg-green-100',   label: 'Cadastro' },
};

// ─── Badges de conquistas ─────────────────────────────────────────────────────
const BADGES = [
  {
    id: 'first_task',
    label: 'Primeira Tarefa',
    emoji: '✅',
    description: 'Completou sua primeira tarefa',
    check: (events) => events.some(e => e.type === 'checklist'),
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'first_photo',
    label: 'Registro Visual',
    emoji: '📸',
    description: 'Enviou sua primeira foto de progresso',
    check: (events) => events.some(e => e.type === 'foto'),
    gradient: 'from-pink-400 to-rose-500',
  },
  {
    id: 'first_feedback',
    label: 'Comunicativa',
    emoji: '💬',
    description: 'Enviou seu primeiro feedback',
    check: (events) => events.some(e => e.type === 'feedback'),
    gradient: 'from-violet-400 to-purple-500',
  },
  {
    id: 'first_weight',
    label: 'Controle Total',
    emoji: '⚖️',
    description: 'Registrou seu peso',
    check: (events) => events.some(e => e.type === 'peso'),
    gradient: 'from-blue-400 to-indigo-500',
  },
  {
    id: 'protocol_star',
    label: 'Em Protocolo',
    emoji: '🎯',
    description: 'Tem um protocolo ativo',
    check: (events) => events.some(e => e.type === 'protocol_activated'),
    gradient: 'from-orange-400 to-amber-500',
  },
  {
    id: 'five_tasks',
    label: 'Produtiva',
    emoji: '🔥',
    description: 'Completou 5 tarefas no total',
    check: (events) => events.filter(e => e.type === 'checklist').length >= 5,
    gradient: 'from-red-400 to-orange-500',
  },
  {
    id: 'ten_tasks',
    label: 'Imparável',
    emoji: '🏆',
    description: 'Completou 10 tarefas no total',
    check: (events) => events.filter(e => e.type === 'checklist').length >= 10,
    gradient: 'from-amber-400 to-yellow-500',
  },
  {
    id: 'all_rounder',
    label: 'Completa',
    emoji: '⭐',
    description: 'Usou 4+ funcionalidades diferentes',
    check: (events) => new Set(events.map(e => e.type)).size >= 4,
    gradient: 'from-purple-400 to-pink-500',
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
const isToday = (ts) => {
  if (!ts) return false;
  return new Date(ts).toDateString() === new Date().toDateString();
};

const isThisWeek = (ts) => {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  return d >= weekAgo && d <= now;
};

const timeAgo = (ts) => {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 172800) return 'ontem';
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// ─── Componente principal ─────────────────────────────────────────────────────
const PatientActivityTimeline = ({ patientId, compact = false }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const data = await authenticatedGet(
        `/api/timeline/patients/${patientId}/events?limit=30`
      );
      setEvents(data.events || []);
    } catch (e) {
      console.error('PatientActivityTimeline error:', e);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  // ── calcular métricas ──────────────────────────────────────────
  const todayEvents = events.filter(e => isToday(e.timestamp));
  const weekEvents  = events.filter(e => isThisWeek(e.timestamp));

  const totalXP = events.reduce((sum, e) => sum + (XP_MAP[e.type] || 5), 0);
  const todayXP  = todayEvents.reduce((sum, e) => sum + (XP_MAP[e.type] || 5), 0);

  // streak: dias únicos com atividade (máx 30 dias passados)
  const uniqueDays = new Set(
    events.map(e => e.timestamp ? new Date(e.timestamp).toDateString() : null).filter(Boolean)
  );
  const streak = uniqueDays.size; // simplificado — dias distintos

  // meta diária: 3 atividades = 100%
  const DAILY_GOAL = 3;
  const dailyPct = Math.min(100, Math.round((todayEvents.length / DAILY_GOAL) * 100));
  const goalReached = todayEvents.length >= DAILY_GOAL;

  // badges desbloqueadas
  const unlockedBadges = BADGES.filter(b => b.check(events));

  // histórico (eventos não de hoje)
  const historyEvents = events.filter(e => !isToday(e.timestamp));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Carregando sua atividade...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── STREAK + XP ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Streak */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-4 text-white text-center shadow-sm">
          <Flame size={20} className="mx-auto mb-1" />
          <p className="text-2xl font-black">{streak}</p>
          <p className="text-[11px] opacity-80 leading-tight">dias ativos</p>
        </div>
        {/* XP total */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white text-center shadow-sm">
          <Star size={20} className="mx-auto mb-1" />
          <p className="text-2xl font-black">{totalXP}</p>
          <p className="text-[11px] opacity-80 leading-tight">XP total</p>
        </div>
        {/* Conquistas */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 p-4 text-white text-center shadow-sm">
          <Trophy size={20} className="mx-auto mb-1" />
          <p className="text-2xl font-black">{unlockedBadges.length}</p>
          <p className="text-[11px] opacity-80 leading-tight">conquistas</p>
        </div>
      </div>

      {/* ── META DO DIA ─────────────────────────────────────────── */}
      <div className={`rounded-2xl p-4 border-2 transition-all ${
        goalReached
          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {goalReached
              ? <Sparkles size={16} className="text-emerald-500" />
              : <TrendingUp size={16} className="text-gray-400" />}
            <span className="text-sm font-bold text-gray-800">
              {goalReached ? '🎉 Meta do dia atingida!' : 'Meta do dia'}
            </span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            goalReached ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
          }`}>
            {todayEvents.length}/{DAILY_GOAL} atividades
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              goalReached ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-violet-400 to-purple-500'
            }`}
            style={{ width: `${dailyPct}%` }}
          />
        </div>
        {todayXP > 0 && (
          <p className="text-xs text-gray-500 mt-1.5">
            <span className="font-bold text-purple-600">+{todayXP} XP</span> conquistados hoje
          </p>
        )}
      </div>

      {/* ── ATIVIDADE DE HOJE ───────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Hoje
        </p>

        {todayEvents.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm text-gray-400">Nenhuma atividade registrada hoje.</p>
            <p className="text-xs text-gray-300 mt-1">Complete tarefas para acumular XP! ✨</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((ev, i) => {
              const cfg = EVENT_CONFIG[ev.type] || { icon: Zap, color: 'text-gray-400', bg: 'bg-gray-100' };
              const Icon = cfg.icon;
              const xp = XP_MAP[ev.type] || 5;
              return (
                <div key={i}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  {/* ícone */}
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={cfg.color} />
                  </div>
                  {/* texto */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-400">{timeAgo(ev.timestamp)}</p>
                  </div>
                  {/* XP */}
                  <div className="flex-shrink-0">
                    <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                      +{xp} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CONQUISTAS ──────────────────────────────────────────── */}
      {unlockedBadges.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Award size={12} />
            Suas Conquistas
          </p>
          <div className="grid grid-cols-4 gap-2">
            {unlockedBadges.map(b => (
              <div key={b.id}
                className={`rounded-xl bg-gradient-to-br ${b.gradient} p-2.5 text-white text-center shadow-sm`}
                title={b.description}>
                <div className="text-xl leading-none mb-1">{b.emoji}</div>
                <p className="text-[10px] font-bold leading-tight">{b.label}</p>
              </div>
            ))}
            {/* bloqueadas (cinza) */}
            {BADGES.filter(b => !b.check(events)).slice(0, Math.max(0, 4 - unlockedBadges.length % 4)).map(b => (
              <div key={b.id}
                className="rounded-xl bg-gray-100 p-2.5 text-center border border-dashed border-gray-200"
                title={b.description}>
                <div className="text-xl leading-none mb-1 opacity-30">{b.emoji}</div>
                <p className="text-[10px] text-gray-300 font-medium leading-tight">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HISTÓRICO RECENTE ───────────────────────────────────── */}
      {historyEvents.length > 0 && !compact && (
        <div>
          <button
            className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors w-full"
            onClick={() => setShowHistory(p => !p)}>
            <Clock size={12} />
            Histórico recente ({historyEvents.length})
            {showHistory ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {historyEvents.map((ev, i) => {
                const cfg = EVENT_CONFIG[ev.type] || { icon: Zap, color: 'text-gray-400', bg: 'bg-gray-100' };
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={13} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate">{ev.title}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(ev.timestamp)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

// Importar Clock aqui (foi usado mas não importado acima)
import { Clock } from 'lucide-react';

export default PatientActivityTimeline;
