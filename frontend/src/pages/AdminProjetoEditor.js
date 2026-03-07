import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, Plus, Trash2, Loader2, Eye, Sparkles, 
  MessageCircle, DollarSign, Users, HelpCircle,
  Upload, Image as ImageIcon, X, Crown, Flame,
  CheckCircle, Zap, Target, Gift, Star, Heart,
  ArrowRight, ChevronRight, Gem, ExternalLink,
  Layout as LayoutIcon, Type, Package, MessageSquare,
  Settings, Palette, PlayCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { authenticatedGet } from '@/lib/apiClient';

const AdminProjetoEditor = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(null);

  // Estado da aba Protocolos
  const [protocols, setProtocols] = useState([]);
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [protocolPatientCounts, setProtocolPatientCounts] = useState({});
  
  const [projectData, setProjectData] = useState({
    // Hero Section
    projectName: 'Projeto Biquíni Branco',
    heroSubtitle: 'EMAGRECIMENTO INTELIGENTE',
    heroTagline: 'Um processo completo para emagrecer com saúde, sem efeito sanfona e sem sofrimento.',
    
    // Títulos das Seções (NOVOS - EDITÁVEIS)
    sectionTitles: {
      myths: '⚠️ VERDADES QUE NINGUÉM TE CONTA',
      benefits: '✅ O QUE VOCÊ VAI TER',
      benefitsSubtitle: 'Um programa completo para transformação real',
      biweekly: 'A cada 15 dias:',
      support: '👥 SUPORTE EXCLUSIVO EM 2 GRUPOS',
      supportSubtitle: 'Você não vai estar sozinha nessa jornada!',
      plans: '🏆 PLANOS DE SUCESSO',
      plansSubtitle: 'Escolha o plano ideal para sua transformação',
      testimonials: '💬 TRANSFORMAÇÕES REAIS',
      faq: '❓ PERGUNTAS FREQUENTES'
    },
    
    // Mitos
    myths: [
      'Emagrecer em 1 mês é furada',
      'Remédio não resolve',
      'O resultado só permanece quando você aprende a comer',
      'A mudança começa na mente e reflete no corpo'
    ],
    
    // Benefícios
    benefits: [
      { icon: 'Calendar', text: '3 meses de acompanhamento' },
      { icon: 'Utensils', text: '3 ajustes estratégicos na dieta' },
      { icon: 'Clock', text: 'Mudança de protocolo a cada 30 dias' }
    ],
    
    // Tarefas quinzenais
    biweeklyTasks: ['Envio de peso', 'Fotos de acompanhamento'],
    
    // Grupos de suporte
    supportGroups: [
      { icon: 'Users', text: 'Grupo de bate-papo' },
      { icon: 'Camera', text: 'Fotos das refeições' },
      { icon: 'Dumbbell', text: 'Treinos e academia' }
    ],
    
    // Planos (COM MENSAL)
    plans: [
      { 
        name: 'MENSAL', 
        price: 'R$ 80', 
        priceNote: 'Experimente primeiro',
        tagline: '1 MÊS PARA COMEÇAR',
        features: ['Plano alimentar personalizado', 'Checklist diário', 'Suporte WhatsApp'],
        highlight: false,
        active: true
      },
      { 
        name: 'TRIMESTRAL', 
        price: 'R$ 200', 
        priceNote: 'Plano mais popular',
        tagline: '3 MESES DE FOCO TOTAL',
        features: ['Tudo do plano mensal', 'Ajustes a cada 30 dias', 'Acesso aos 2 grupos', '3 ajustes estratégicos'],
        highlight: true,
        active: true
      },
      { 
        name: 'SEMESTRAL', 
        price: 'R$ 360', 
        priceNote: 'Economia de R$40',
        tagline: '6 MESES PARA TRANSFORMAR',
        features: ['Tudo do plano trimestral', 'Receitas exclusivas', 'Prioridade no atendimento', 'Suplementação básica'],
        highlight: false,
        active: true
      },
      { 
        name: 'ANUAL', 
        price: 'R$ 660', 
        priceNote: 'Melhor custo-benefício',
        tagline: '1 ANO PELA SUA SAÚDE',
        features: ['Tudo dos planos anteriores', 'Grupo VIP exclusivo', 'Consultas extras', 'Bônus surpresa'],
        highlight: false,
        active: true
      }
    ],
    
    // Depoimentos (COM IMAGEM)
    testimonials: [
      { name: 'Ana Paula', text: 'Perdi 12kg em 3 meses! Finalmente entendi como comer direito.', result: '-12kg', image: '' },
      { name: 'Carla Santos', text: 'O suporte no grupo faz toda diferença. Não me sinto sozinha!', result: '-8kg', image: '' },
      { name: 'Mariana Costa', text: 'Sem passar fome e sem efeito sanfona. Recomendo muito!', result: '-10kg', image: '' }
    ],
    
    // FAQ
    faq: [
      { question: 'Como funciona o acompanhamento?', answer: 'Você terá acesso à plataforma FitJourney com seu plano personalizado, tarefas diárias, e suporte direto comigo via WhatsApp.' },
      { question: 'Preciso malhar?', answer: 'Não é obrigatório, mas atividade física potencializa os resultados.' },
      { question: 'Vou passar fome?', answer: 'De jeito nenhum! O diferencial do programa é ensinar você a comer de forma inteligente.' },
      { question: 'E se eu não conseguir seguir?', answer: 'Por isso temos os grupos de suporte! Você não está sozinha.' }
    ],
    
    // CTAs
    ctaMain: 'QUERO TRANSFORMAR MEU CORPO',
    ctaUrgency: '🔥 VAGAS LIMITADAS',
    ctaEmotional: 'Seu biquíni branco não vai se conquistar sozinho. Garanta sua vaga agora e comece a mudança hoje!',
    ctaFinal: 'Centenas de mulheres já transformaram suas vidas. Agora é sua vez!',
    
    // Contatos
    whatsappNumber: '5591980124814',
    instagramUrl: 'https://www.instagram.com/dr_wylkem_raiol/'
  });

  useEffect(() => {
    loadProjectData();
  }, []);

  const loadProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('project_showcase')
        .select('*')
        .eq('project_name', 'biquini_branco')
        .maybeSingle();

      if (data?.content) {
        setProjectData(prev => ({ ...prev, ...data.content }));
      }
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('project_showcase')
        .select('id')
        .eq('project_name', 'biquini_branco')
        .maybeSingle();

      let result;
      if (existing) {
        result = await supabase
          .from('project_showcase')
          .update({
            content: projectData,
            updated_at: new Date().toISOString()
          })
          .eq('project_name', 'biquini_branco');
      } else {
        result = await supabase
          .from('project_showcase')
          .insert({
            project_name: 'biquini_branco',
            content: projectData
          });
      }

      if (result.error) throw result.error;
      
      toast.success('Projeto salvo com sucesso! 🎉');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar: ' + (error.message || 'Verifique se a tabela existe no Supabase'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const updateSectionTitle = (key, value) => {
    setProjectData(prev => ({
      ...prev,
      sectionTitles: { ...prev.sectionTitles, [key]: value }
    }));
  };

  const updateSectionDescription = (key, value) => {
    setProjectData(prev => ({
      ...prev,
      sectionDescriptions: { ...(prev.sectionDescriptions || {}), [key]: value }
    }));
  };

  const updateArrayItem = (arrayName, index, value) => {
    setProjectData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (arrayName, newItem) => {
    setProjectData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], newItem]
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setProjectData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const updatePlan = (index, field, value) => {
    setProjectData(prev => ({
      ...prev,
      plans: prev.plans.map((plan, i) => i === index ? { ...plan, [field]: value } : plan)
    }));
  };

  const updatePlanFeature = (planIndex, featureIndex, value) => {
    setProjectData(prev => ({
      ...prev,
      plans: prev.plans.map((plan, i) => {
        if (i !== planIndex) return plan;
        return {
          ...plan,
          features: plan.features.map((f, fi) => fi === featureIndex ? value : f)
        };
      })
    }));
  };

  const addPlan = () => {
    setProjectData(prev => ({
      ...prev,
      plans: [...prev.plans, {
        name: 'NOVO PLANO',
        price: 'R$ 0',
        priceNote: 'Descrição do preço',
        tagline: 'TAGLINE DO PLANO',
        features: ['Feature 1', 'Feature 2'],
        highlight: false,
        active: true
      }]
    }));
  };

  const removePlan = (index) => {
    setProjectData(prev => ({
      ...prev,
      plans: prev.plans.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = async (testimonialIndex, file) => {
    if (!file) return;
    
    setUploadingImage(testimonialIndex);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `testimonial_${Date.now()}.${fileExt}`;
      const filePath = `testimonials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) {
        const reader = new FileReader();
        reader.onloadend = () => {
          updateArrayItem('testimonials', testimonialIndex, {
            ...projectData.testimonials[testimonialIndex],
            image: reader.result
          });
          toast.success('Imagem adicionada!');
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('public')
          .getPublicUrl(filePath);
        
        updateArrayItem('testimonials', testimonialIndex, {
          ...projectData.testimonials[testimonialIndex],
          image: publicUrl
        });
        toast.success('Imagem enviada!');
      }
    } catch (error) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateArrayItem('testimonials', testimonialIndex, {
          ...projectData.testimonials[testimonialIndex],
          image: reader.result
        });
        toast.success('Imagem adicionada!');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(null);
    }
  };

  // Carrega protocolos apenas quando a aba é acessada pela primeira vez
  useEffect(() => {
    if (activeTab !== 'protocolos' || protocols.length > 0) return;
    const load = async () => {
      setProtocolsLoading(true);
      try {
        const data = await authenticatedGet('/api/professional/protocols/list');
        const list = data?.protocols || [];
        setProtocols(list);
        if (list.length > 0) {
          const { data: ppRows } = await supabase
            .from('patient_protocols')
            .select('protocol_id')
            .eq('status', 'active');
          if (ppRows) {
            const counts = {};
            ppRows.forEach(r => { counts[r.protocol_id] = (counts[r.protocol_id] || 0) + 1; });
            setProtocolPatientCounts(counts);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar protocolos:', err);
        toast.error('Não foi possível carregar os protocolos.');
      } finally {
        setProtocolsLoading(false);
      }
    };
    load();
  }, [activeTab, protocols.length]);

  // Tab configuration
  const tabs = [
    { id: 'hero', label: 'Hero', icon: Sparkles, gradient: 'from-pink-500 to-rose-500' },
    { id: 'titulos', label: 'Títulos', icon: Type, gradient: 'from-purple-500 to-indigo-500' },
    { id: 'conteudo', label: 'Conteúdo', icon: LayoutIcon, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'planos', label: 'Planos', icon: Package, gradient: 'from-amber-500 to-orange-500' },
    { id: 'depoimentos', label: 'Depoimentos', icon: MessageSquare, gradient: 'from-green-500 to-emerald-500' },
    { id: 'faq', label: 'FAQ', icon: HelpCircle, gradient: 'from-teal-500 to-cyan-500' },
    { id: 'protocolos', label: 'Protocolos', icon: Zap, gradient: 'from-violet-500 to-purple-600' },
  ];

  if (loading) {
    return (
      <Layout title="Editor do Projeto" userType="admin">
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-pink-200 rounded-full animate-spin border-t-pink-600" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-pink-600" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editor - Projeto Biquíni Branco" userType="admin">
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        
        {/* ==================== HEADER PREMIUM ==================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-rose-500 to-orange-500 p-8 text-white shadow-2xl">
          {/* Background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24 blur-2xl" />
          <div className="absolute top-1/2 right-1/4 opacity-20">
            <Flame className="w-24 h-24" />
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Crown className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-black tracking-tight">Editor do Projeto</h1>
                      <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">PRO</Badge>
                    </div>
                    <p className="text-white/80">Personalize sua página de vendas premium</p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => window.open('/visitor/projeto', '_blank')}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                  <ExternalLink className="h-3 w-3 ml-2 opacity-70" />
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-white text-pink-600 hover:bg-white/90 shadow-lg font-bold"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              {[
                { label: 'Planos', value: projectData.plans.filter(p => p.active !== false).length, icon: Package },
                { label: 'Depoimentos', value: projectData.testimonials.length, icon: MessageSquare },
                { label: 'FAQs', value: projectData.faq.length, icon: HelpCircle },
                { label: 'Benefícios', value: projectData.benefits.length, icon: Gift }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                    <Icon className="w-5 h-5 mx-auto mb-1 opacity-80" />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-white/70">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==================== TABS PREMIUM ==================== */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex gap-2 p-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                    ${isActive 
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg` 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* ==================== TAB HERO ==================== */}
          <TabsContent value="hero" className="space-y-4 mt-4">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-pink-500 to-rose-500" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Seção Principal (Hero)</CardTitle>
                    <CardDescription>Textos que aparecem no topo da página de vendas</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Nome do Projeto</Label>
                    <Input
                      value={projectData.projectName}
                      onChange={(e) => updateField('projectName', e.target.value)}
                      className="border-gray-200 focus:border-pink-400 focus:ring-pink-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Subtítulo (destaque em amarelo)</Label>
                    <Input
                      value={projectData.heroSubtitle}
                      onChange={(e) => updateField('heroSubtitle', e.target.value)}
                      className="border-gray-200 focus:border-pink-400 focus:ring-pink-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Tagline Principal</Label>
                  <Textarea
                    value={projectData.heroTagline}
                    onChange={(e) => updateField('heroTagline', e.target.value)}
                    rows={2}
                    className="border-gray-200 focus:border-pink-400 focus:ring-pink-200"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Texto do Botão Principal</Label>
                    <Input
                      value={projectData.ctaMain}
                      onChange={(e) => updateField('ctaMain', e.target.value)}
                      className="border-gray-200 focus:border-pink-400 focus:ring-pink-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Texto de Urgência</Label>
                    <Input
                      value={projectData.ctaUrgency}
                      onChange={(e) => updateField('ctaUrgency', e.target.value)}
                      className="border-gray-200 focus:border-pink-400 focus:ring-pink-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">CTA Emocional (seção final)</Label>
                  <Textarea
                    value={projectData.ctaEmotional}
                    onChange={(e) => updateField('ctaEmotional', e.target.value)}
                    rows={2}
                    className="border-gray-200 focus:border-pink-400 focus:ring-pink-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Texto Final (abaixo do CTA)</Label>
                  <Input
                    value={projectData.ctaFinal}
                    onChange={(e) => updateField('ctaFinal', e.target.value)}
                    className="border-gray-200 focus:border-pink-400 focus:ring-pink-200"
                  />
                </div>
                
                {/* Contact Info */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    Informações de Contato
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">WhatsApp (apenas números)</Label>
                      <Input
                        value={projectData.whatsappNumber}
                        onChange={(e) => updateField('whatsappNumber', e.target.value)}
                        placeholder="5591980124814"
                        className="border-gray-200 focus:border-green-400 focus:ring-green-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">URL do Instagram</Label>
                      <Input
                        value={projectData.instagramUrl}
                        onChange={(e) => updateField('instagramUrl', e.target.value)}
                        className="border-gray-200 focus:border-green-400 focus:ring-green-200"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB TÍTULOS ==================== */}
          <TabsContent value="titulos" className="space-y-4 mt-4">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white">
                    <Type className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Títulos das Seções</CardTitle>
                    <CardDescription>Personalize os títulos de cada seção da página</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { key: 'myths', label: 'Seção "Verdades/Mitos"', placeholder: '⚠️ VERDADES QUE NINGUÉM TE CONTA' },
                  { key: 'benefits', label: 'Seção "O que você vai ter"', placeholder: '✅ O QUE VOCÊ VAI TER', hasSubtitle: true, subtitleKey: 'benefitsSubtitle' },
                  { key: 'biweekly', label: 'Título "A cada 15 dias"', placeholder: 'A cada 15 dias:' },
                  { key: 'support', label: 'Seção "Suporte em Grupos"', placeholder: '👥 SUPORTE EXCLUSIVO...', hasSubtitle: true, subtitleKey: 'supportSubtitle' },
                  { key: 'plans', label: 'Seção "Planos"', placeholder: '🏆 PLANOS DE SUCESSO', hasSubtitle: true, subtitleKey: 'plansSubtitle' },
                  { key: 'testimonials', label: 'Seção "Depoimentos"', placeholder: '💬 TRANSFORMAÇÕES REAIS' },
                  { key: 'faq', label: 'Seção "FAQ"', placeholder: '❓ PERGUNTAS FREQUENTES' }
                ].map((item, i) => (
                  <div key={item.key} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {item.hasSubtitle ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">{item.label}</Label>
                          <Input
                            value={projectData.sectionTitles?.[item.key] || ''}
                            onChange={(e) => updateSectionTitle(item.key, e.target.value)}
                            placeholder={item.placeholder}
                            className="border-gray-200 focus:border-purple-400 focus:ring-purple-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Subtítulo</Label>
                          <Input
                            value={projectData.sectionTitles?.[item.subtitleKey] || ''}
                            onChange={(e) => updateSectionTitle(item.subtitleKey, e.target.value)}
                            placeholder="Subtítulo da seção..."
                            className="border-gray-200 focus:border-purple-400 focus:ring-purple-200"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">{item.label}</Label>
                        <Input
                          value={projectData.sectionTitles?.[item.key] || ''}
                          onChange={(e) => updateSectionTitle(item.key, e.target.value)}
                          placeholder={item.placeholder}
                          className="border-gray-200 focus:border-purple-400 focus:ring-purple-200"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB CONTEÚDO ==================== */}
          <TabsContent value="conteudo" className="space-y-4 mt-4">
            {/* Mitos */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Verdades/Mitos</CardTitle>
                    <CardDescription>Pontos importantes que aparecem na seção de verdades</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectData.myths.map((myth, index) => (
                  <div key={index} className="flex gap-2 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <Input
                      value={myth}
                      onChange={(e) => updateArrayItem('myths', index, e.target.value)}
                      className="flex-1 border-gray-200 focus:border-amber-400 focus:ring-amber-200"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeArrayItem('myths', index)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => addArrayItem('myths', 'Novo ponto')}
                  className="w-full border-dashed border-amber-300 text-amber-600 hover:bg-amber-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ponto
                </Button>
              </CardContent>
            </Card>

            {/* Benefícios */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>O que você vai ter</CardTitle>
                    <CardDescription>Benefícios principais do programa</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <Input
                      value={benefit.text}
                      onChange={(e) => updateArrayItem('benefits', index, { ...benefit, text: e.target.value })}
                      className="flex-1 border-gray-200 focus:border-green-400 focus:ring-green-200"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeArrayItem('benefits', index)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => addArrayItem('benefits', { icon: 'Activity', text: 'Novo benefício' })}
                  className="w-full border-dashed border-green-300 text-green-600 hover:bg-green-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Benefício
                </Button>
              </CardContent>
            </Card>

            {/* Tarefas quinzenais */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-teal-500 to-cyan-500" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>A cada 15 dias</CardTitle>
                    <CardDescription>Tarefas quinzenais do programa</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectData.biweeklyTasks.map((task, index) => (
                  <div key={index} className="flex gap-2 group">
                    <Input
                      value={task}
                      onChange={(e) => updateArrayItem('biweeklyTasks', index, e.target.value)}
                      className="flex-1 border-gray-200 focus:border-teal-400 focus:ring-teal-200"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeArrayItem('biweeklyTasks', index)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => addArrayItem('biweeklyTasks', 'Nova tarefa')}
                  className="w-full border-dashed border-teal-300 text-teal-600 hover:bg-teal-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tarefa
                </Button>
              </CardContent>
            </Card>

            {/* Grupos de Suporte */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-fuchsia-500" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Grupos de Suporte</CardTitle>
                    <CardDescription>Grupos de apoio disponíveis no programa</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectData.supportGroups.map((group, index) => (
                  <div key={index} className="flex gap-2 group">
                    <Input
                      value={group.text}
                      onChange={(e) => updateArrayItem('supportGroups', index, { ...group, text: e.target.value })}
                      className="flex-1 border-gray-200 focus:border-purple-400 focus:ring-purple-200"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeArrayItem('supportGroups', index)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => addArrayItem('supportGroups', { icon: 'Users', text: 'Novo grupo' })}
                  className="w-full border-dashed border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Grupo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB PLANOS ==================== */}
          <TabsContent value="planos" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={addPlan} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Novo Plano
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {projectData.plans.map((plan, planIndex) => (
                <Card 
                  key={planIndex} 
                  className={`relative overflow-hidden border-0 shadow-lg transition-all
                    ${plan.highlight ? 'ring-2 ring-pink-500 shadow-pink-100' : ''}
                    ${!plan.active ? 'opacity-50' : ''}
                  `}
                >
                  {/* Highlight badge */}
                  {plan.highlight && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-center py-1.5 text-xs font-bold flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3" />
                      MAIS ESCOLHIDO
                    </div>
                  )}
                  
                  <CardContent className={`space-y-4 ${plan.highlight ? 'pt-10' : 'pt-6'}`}>
                    {/* Header with controls */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={plan.active !== false}
                            onChange={(e) => updatePlan(planIndex, 'active', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          Ativo
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={plan.highlight}
                            onChange={(e) => updatePlan(planIndex, 'highlight', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          Destacar
                        </label>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removePlan(planIndex)}
                          className="text-red-400 hover:text-red-600 h-7 w-7 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Form fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Nome</Label>
                        <Input
                          value={plan.name}
                          onChange={(e) => updatePlan(planIndex, 'name', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Preço</Label>
                        <Input
                          value={plan.price}
                          onChange={(e) => updatePlan(planIndex, 'price', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Nota do Preço</Label>
                        <Input
                          value={plan.priceNote}
                          onChange={(e) => updatePlan(planIndex, 'priceNote', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Tagline</Label>
                        <Input
                          value={plan.tagline}
                          onChange={(e) => updatePlan(planIndex, 'tagline', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Features */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Features</Label>
                      {plan.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex gap-2 group">
                          <Input
                            value={feature}
                            onChange={(e) => updatePlanFeature(planIndex, fIndex, e.target.value)}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              const newFeatures = plan.features.filter((_, i) => i !== fIndex);
                              updatePlan(planIndex, 'features', newFeatures);
                            }}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updatePlan(planIndex, 'features', [...plan.features, 'Nova feature'])}
                        className="w-full h-8 text-xs border-dashed"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar Feature
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ==================== TAB DEPOIMENTOS ==================== */}
          <TabsContent value="depoimentos" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectData.testimonials.map((testimonial, index) => (
                <Card key={index} className="border-0 shadow-lg overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
                  <CardContent className="pt-5 space-y-4">
                    {/* Image upload */}
                    <div className="flex items-center gap-4">
                      {testimonial.image ? (
                        <div className="relative">
                          <img 
                            src={testimonial.image} 
                            alt="Print" 
                            className="w-20 h-20 object-cover rounded-xl border-2 border-gray-100"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 hover:bg-red-600"
                            onClick={() => updateArrayItem('testimonials', index, { ...testimonial, image: '' })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-300 bg-gray-50">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(index, e.target.files[0])}
                          className="hidden"
                          id={`image-upload-${index}`}
                        />
                        <label htmlFor={`image-upload-${index}`}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="cursor-pointer w-full"
                            disabled={uploadingImage === index}
                            asChild
                          >
                            <span>
                              {uploadingImage === index ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              {uploadingImage === index ? 'Enviando...' : 'Upload'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                    
                    {/* Form fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Nome</Label>
                        <Input
                          value={testimonial.name}
                          onChange={(e) => updateArrayItem('testimonials', index, { ...testimonial, name: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Resultado</Label>
                        <Input
                          value={testimonial.result}
                          onChange={(e) => updateArrayItem('testimonials', index, { ...testimonial, result: e.target.value })}
                          className="h-9 text-sm"
                          placeholder="-12kg"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Depoimento</Label>
                      <Textarea
                        value={testimonial.text}
                        onChange={(e) => updateArrayItem('testimonials', index, { ...testimonial, text: e.target.value })}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeArrayItem('testimonials', index)}
                      className="text-red-400 hover:text-red-600 w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </CardContent>
                </Card>
              ))}
              
              {/* Add new testimonial card */}
              <Card 
                className="border-2 border-dashed border-gray-200 hover:border-green-400 transition-colors cursor-pointer bg-gray-50/50 flex items-center justify-center min-h-[300px]"
                onClick={() => addArrayItem('testimonials', { name: 'Nome', text: 'Depoimento aqui...', result: '-Xkg', image: '' })}
              >
                <div className="text-center p-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                    <Plus className="h-7 w-7 text-green-600" />
                  </div>
                  <p className="font-medium text-gray-600">Adicionar Depoimento</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ==================== TAB FAQ ==================== */}
          <TabsContent value="faq" className="space-y-4 mt-4">
            {projectData.faq.map((item, index) => (
              <Card key={index} className="border-0 shadow-lg overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Pergunta</Label>
                        <Input
                          value={item.question}
                          onChange={(e) => updateArrayItem('faq', index, { ...item, question: e.target.value })}
                          className="border-gray-200 focus:border-teal-400 focus:ring-teal-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Resposta</Label>
                        <Textarea
                          value={item.answer}
                          onChange={(e) => updateArrayItem('faq', index, { ...item, answer: e.target.value })}
                          rows={3}
                          className="border-gray-200 focus:border-teal-400 focus:ring-teal-200"
                        />
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeArrayItem('faq', index)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button 
              variant="outline" 
              onClick={() => addArrayItem('faq', { question: 'Nova pergunta?', answer: 'Resposta aqui...' })}
              className="w-full border-dashed border-teal-300 text-teal-600 hover:bg-teal-50 py-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pergunta
            </Button>
          </TabsContent>

          {/* ==================== TAB PROTOCOLOS ==================== */}
          <TabsContent value="protocolos" className="space-y-4 mt-4">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-violet-500 to-purple-600" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  Catálogo de Protocolos
                </CardTitle>
                <CardDescription>
                  Protocolos disponíveis para ativação no Projeto Biquíni Branco.
                  Para ativar em um paciente, acesse o perfil dele → aba Projeto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {protocolsLoading ? (
                  <div className="flex items-center gap-3 py-8 justify-center text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Carregando protocolos...</span>
                  </div>
                ) : protocols.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-purple-200 rounded-xl bg-purple-50">
                    <Zap className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                    <p className="font-semibold text-purple-700">Nenhum protocolo cadastrado.</p>
                    <p className="text-sm text-purple-500 mt-1">Crie protocolos via painel administrativo.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {protocols.map((p) => {
                      const activeCount = protocolPatientCounts[p.id] || 0;
                      return (
                        <div key={p.id}
                          className="flex items-center justify-between p-4 bg-gray-50 hover:bg-purple-50 rounded-xl border border-gray-200 hover:border-purple-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <PlayCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{p.name}</p>
                              <p className="text-xs text-gray-500">
                                {p.category && <span className="mr-2">{p.category}</span>}
                                {p.default_duration_days && <span className="mr-2">⏱ {p.default_duration_days} dias</span>}
                                {p.task_count != null && <span>📋 {p.task_count} tarefa(s)</span>}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-black text-purple-600">{activeCount}</p>
                            <p className="text-[11px] text-gray-400 whitespace-nowrap">
                              {activeCount === 1 ? 'paciente ativo' : 'pacientes ativos'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo operacional */}
            {protocols.length > 0 && (
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-violet-500 to-purple-600" />
                <CardContent className="pt-5">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <p className="text-3xl font-black text-purple-700">{protocols.length}</p>
                      <p className="text-xs text-purple-500 mt-1">Protocolos no catálogo</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <p className="text-3xl font-black text-purple-700">
                        {Object.values(protocolPatientCounts).reduce((a, b) => a + b, 0)}
                      </p>
                      <p className="text-xs text-purple-500 mt-1">Ativações ativas</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <p className="text-3xl font-black text-purple-700">
                        {protocols.reduce((s, p) => s + (p.task_count || 0), 0)}
                      </p>
                      <p className="text-xs text-purple-500 mt-1">Tasks no catálogo</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-4">
                    Para ativar um protocolo em um paciente, acesse: <strong>Pacientes → Perfil → aba Projeto → Protocolos</strong>
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminProjetoEditor;
