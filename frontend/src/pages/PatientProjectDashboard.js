/**
 * PatientProjectDashboard - Dashboard Premium do Projeto Biquíni Branco
 * 
 * Contexto: EXECUÇÃO do programa (paciente)
 * Visual: Premium inspirado em PlatformGuide
 * 
 * Mostra:
 * - Fase atual e progresso
 * - Protocolos ativos
 * - Checklist diário automático
 * - Próximo evento
 * - Evolução (fotos/peso)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Sparkles, Calendar, TrendingUp, Droplet, Coffee, Clock,
  CheckCircle2, Circle, Trophy, Camera, Scale, Target,
  ChevronRight, Flame, Heart, Zap, Award, ArrowRight,
  Activity, Bell, PlayCircle, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedGet } from '@/lib/apiClient';
import EmptyState from '@/components/EmptyState';

const PatientProjectDashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [protocols, setProtocols] = useState([]);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Dados mockados para primeira versão (depois virão do backend)
  const programInfo = {
    name: 'Projeto Biquíni Branco',
    currentWeek: 2,
    totalWeeks: 12,
    currentPhase: 1,
    phaseName: 'Adaptação Metabólica',
    phaseDescription: 'Fase inicial de adaptação do organismo aos novos hábitos alimentares'
  };

  const nextEvents = [
    { type: 'feedback', label: 'Próximo Feedback', date: '15/03/2025', days: 5, icon: Camera },
    { type: 'weight', label: 'Próxima Pesagem', date: '18/03/2025', days: 8, icon: Scale },
    { type: 'photos', label: 'Próximas Fotos', date: '30/03/2025', days: 20, icon: Camera }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await authenticatedGet('/api/patient/protocols/active');
      setProtocols(data.protocols || []);
    } catch (error) {
      console.error('Erro ao carregar protocolos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProtocolIcon = (iconName, color) => {
    const icons = { Droplet, Coffee, Clock, Flame, Heart };
    const Icon = icons[iconName] || Activity;
    const colors = {
      blue: 'text-blue-500',
      green: 'text-green-500',
      orange: 'text-orange-500',
      red: 'text-red-500',
      purple: 'text-purple-500'
    };
    return <Icon className={`w-6 h-6 ${colors[color] || 'text-gray-500'}`} />;
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { label: 'Ativo', color: 'bg-green-100 text-green-700 border-green-200' },
      scheduled: { label: 'Programado', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      completed: { label: 'Concluído', color: 'bg-gray-100 text-gray-700 border-gray-200' }
    };
    const { label, color } = config[status] || config.active;
    return <Badge className={`${color} border font-medium`}>{label}</Badge>;
  };

  if (loading) {
    return (
      <Layout userType="patient">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Sparkles className="w-12 h-12 animate-pulse text-pink-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando seu projeto...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userType="patient">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* 🎯 CABEÇALHO DO PROJETO */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mb-48 blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{programInfo.name}</h1>
                <p className="text-white/90 text-sm">Seu programa de transformação</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* Semana Atual */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm font-medium opacity-90">Semana Atual</span>
                </div>
                <div className="text-3xl font-bold">
                  {programInfo.currentWeek} <span className="text-lg opacity-75">/ {programInfo.totalWeeks}</span>
                </div>
              </div>

              {/* Fase Atual */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm font-medium opacity-90">Fase Atual</span>
                </div>
                <div className="text-lg font-bold">{programInfo.phaseName}</div>
                <div className="text-xs opacity-75 mt-1">Fase {programInfo.currentPhase}</div>
              </div>

              {/* Progresso */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium opacity-90">Progresso</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 mt-2">
                  <div 
                    className="bg-white rounded-full h-3 transition-all duration-500"
                    style={{ width: `${(programInfo.currentWeek / programInfo.totalWeeks) * 100}%` }}
                  />
                </div>
                <div className="text-xs opacity-75 mt-2">
                  {Math.round((programInfo.currentWeek / programInfo.totalWeeks) * 100)}% completo
                </div>
              </div>
            </div>

            <p className="mt-6 text-white/80 text-sm bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              {programInfo.phaseDescription}
            </p>
          </div>
        </div>

        {/* 📋 PROTOCOLOS ATIVOS */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Protocolos Ativos</h2>
              <p className="text-sm text-gray-600">Seus protocolos em execução</p>
            </div>
          </div>

          {protocols.length === 0 ? (
            <EmptyState 
              type="protocolo" 
              description="Seu profissional irá ativar protocolos conforme sua evolução no programa."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {protocols.map((protocol) => (
                <Card 
                  key={protocol.id}
                  className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-pink-200 cursor-pointer overflow-hidden"
                  onClick={() => {
                    setSelectedProtocol(protocol);
                    setShowInstructions(true);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl group-hover:scale-110 transition-transform">
                          {getProtocolIcon(protocol.icon, protocol.color)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{protocol.name}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">{protocol.category}</p>
                        </div>
                      </div>
                      {getStatusBadge(protocol.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">{protocol.description}</p>
                    
                    {/* Progresso */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-semibold text-pink-600">
                          Dia {protocol.progress_day} de {protocol.default_duration_days}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(protocol.progress_day / protocol.default_duration_days) * 100}%` }}
                        />
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      className="w-full mt-4 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProtocol(protocol);
                        setShowInstructions(true);
                      }}
                    >
                      Ver instruções completas
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 🎯 PRÓXIMOS EVENTOS */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Próximos Eventos</h2>
              <p className="text-sm text-gray-600">Acompanhe suas atividades programadas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nextEvents.map((event, idx) => {
              const Icon = event.icon;
              return (
                <Card key={idx} className="hover:shadow-lg transition-shadow border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{event.label}</p>
                        <p className="text-sm text-gray-500">{event.date}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        Em <span className="font-semibold text-blue-600">{event.days} dias</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 📊 EVOLUÇÃO (Placeholder) */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Sua Evolução</CardTitle>
                <p className="text-sm text-gray-600">Acompanhe seu progresso visual</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="mb-2">Área de evolução em desenvolvimento</p>
              <p className="text-sm">Em breve você verá suas fotos e peso comparativos aqui</p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 📖 MODAL DE INSTRUÇÕES */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              {selectedProtocol && getProtocolIcon(selectedProtocol.icon, selectedProtocol.color)}
              {selectedProtocol?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProtocol?.category}
            </DialogDescription>
          </DialogHeader>

          {selectedProtocol && (
            <div className="space-y-4 mt-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Descrição</h4>
                <p className="text-gray-700">{selectedProtocol.description}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Como Executar</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-gray-800">{selectedProtocol.instructions}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Duração do protocolo</p>
                  <p className="font-semibold text-gray-900">{selectedProtocol.default_duration_days} dias</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Seu progresso</p>
                  <p className="font-semibold text-pink-600">Dia {selectedProtocol.progress_day}</p>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
                onClick={() => setShowInstructions(false)}
              >
                Entendi, vamos lá!
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default PatientProjectDashboard;
