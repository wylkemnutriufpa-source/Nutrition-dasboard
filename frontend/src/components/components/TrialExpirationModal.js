import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Zap, Bot, TrendingUp, Users, Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { updateProfessionalPlan } from '@/lib/supabase';
import { toast } from 'sonner';

const PLAN_FEATURES = {
  basic: [
    { icon: Users, text: 'Até 10 pacientes ativos', color: 'text-gray-600' },
    { icon: Calendar, text: 'Planos alimentares básicos', color: 'text-gray-600' },
    { icon: TrendingUp, text: 'Acompanhamento simples', color: 'text-gray-600' },
    { icon: Check, text: 'Suporte por email', color: 'text-gray-600' }
  ],
  pro: [
    { icon: Sparkles, text: 'Pacientes ilimitados', color: 'text-purple-600' },
    { icon: Bot, text: 'Análise com IA (fotos, corpo)', color: 'text-purple-600' },
    { icon: Zap, text: 'Automações inteligentes', color: 'text-purple-600' },
    { icon: TrendingUp, text: 'Relatórios avançados', color: 'text-purple-600' },
    { icon: Crown, text: 'Receitas IA + Multi-planos', color: 'text-purple-600' },
    { icon: Users, text: 'Suporte prioritário', color: 'text-purple-600' }
  ]
};

const TrialExpirationModal = ({ open, userId, onClose, onUpgrade }) => {
  const [selecting, setSelecting] = useState(false);

  const handleSelectPlan = async (planType) => {
    setSelecting(true);
    try {
      const { error } = await updateProfessionalPlan(userId, planType);
      if (error) throw error;
      
      toast.success(`Plano ${planType === 'pro' ? 'PRO' : 'Basic'} ativado com sucesso!`);
      if (onUpgrade) onUpgrade(planType);
      if (onClose) onClose();
      
      // Recarregar página para atualizar permissões
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error('Erro ao ativar plano. Tente novamente.');
    } finally {
      setSelecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden" hideClose>
        <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white border-0 text-xs mb-1">Período de teste encerrado</Badge>
              <h2 className="text-2xl font-black">Escolha seu Plano</h2>
            </div>
          </div>
          <p className="text-white/80 text-sm">
            Seu período de teste de 7 dias chegou ao fim. Continue aproveitando a plataforma escolhendo um dos planos abaixo:
          </p>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* PLANO BASIC */}
          <div className="relative rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-gray-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Basic</h3>
                <p className="text-sm text-gray-500">Para começar</p>
              </div>
              <Badge className="bg-gray-100 text-gray-700 border-0">Gratuito</Badge>
            </div>

            <div className="space-y-3 mb-6">
              {PLAN_FEATURES.basic.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${feature.color}`} />
                    <span className="text-sm text-gray-700">{feature.text}</span>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={() => handleSelectPlan('basic')}
              disabled={selecting}
              className="w-full bg-gray-600 hover:bg-gray-700"
            >
              {selecting ? 'Ativando...' : 'Escolher Basic'}
            </Button>
          </div>

          {/* PLANO PRO */}
          <div className="relative rounded-2xl border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-violet-50 p-6 shadow-lg">
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
              ⭐ Recomendado
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900">PRO</h3>
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-sm text-purple-600 font-medium">Poder total da IA</p>
              </div>
              <Badge className="bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0">
                🚀 Premium
              </Badge>
            </div>

            <div className="space-y-3 mb-6">
              {PLAN_FEATURES.pro.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${feature.color}`} />
                    <span className="text-sm text-gray-800 font-medium">{feature.text}</span>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={() => handleSelectPlan('pro')}
              disabled={selecting}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:opacity-90 shadow-lg"
            >
              {selecting ? 'Ativando...' : (
                <>
                  Escolher PRO <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Você pode alterar seu plano a qualquer momento no painel de configurações
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrialExpirationModal;
