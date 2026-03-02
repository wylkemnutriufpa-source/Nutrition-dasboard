import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, Plus, Trash2, Loader2, Eye, Sparkles, 
  MessageCircle, DollarSign, Users, HelpCircle,
  Upload, Image as ImageIcon, X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const AdminProjetoEditor = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(null);
  
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
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('project_showcase')
        .select('id')
        .eq('project_name', 'biquini_branco')
        .maybeSingle();

      let result;
      if (existing) {
        // UPDATE
        result = await supabase
          .from('project_showcase')
          .update({
            content: projectData,
            updated_at: new Date().toISOString()
          })
          .eq('project_name', 'biquini_branco');
      } else {
        // INSERT
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

  // Upload de imagem para depoimento
  const handleImageUpload = async (testimonialIndex, file) => {
    if (!file) return;
    
    setUploadingImage(testimonialIndex);
    
    try {
      // Upload para Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `testimonial_${Date.now()}.${fileExt}`;
      const filePath = `testimonials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) {
        // Se storage não existe, usar base64
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
      // Fallback para base64
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

  if (loading) {
    return (
      <Layout title="Editor do Projeto" userType="admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editor - Projeto Biquíni Branco" userType="admin">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editor do Projeto Biquíni Branco</h1>
            <p className="text-gray-600">Personalize todo o conteúdo da página de vendas</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => window.open('/visitor/projeto', '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 bg-gray-100">
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="titulos">Títulos</TabsTrigger>
            <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="depoimentos">Depoimentos</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          {/* Tab Hero */}
          <TabsContent value="hero" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Seção Principal (Hero)</CardTitle>
                <CardDescription>Textos que aparecem no topo da página</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome do Projeto</Label>
                  <Input
                    value={projectData.projectName}
                    onChange={(e) => updateField('projectName', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Subtítulo (destaque em amarelo)</Label>
                  <Input
                    value={projectData.heroSubtitle}
                    onChange={(e) => updateField('heroSubtitle', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Textarea
                    value={projectData.heroTagline}
                    onChange={(e) => updateField('heroTagline', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Texto do Botão Principal</Label>
                    <Input
                      value={projectData.ctaMain}
                      onChange={(e) => updateField('ctaMain', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Texto de Urgência</Label>
                    <Input
                      value={projectData.ctaUrgency}
                      onChange={(e) => updateField('ctaUrgency', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>CTA Emocional (seção final)</Label>
                  <Textarea
                    value={projectData.ctaEmotional}
                    onChange={(e) => updateField('ctaEmotional', e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Texto Final (abaixo do CTA)</Label>
                  <Input
                    value={projectData.ctaFinal}
                    onChange={(e) => updateField('ctaFinal', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>WhatsApp (apenas números)</Label>
                    <Input
                      value={projectData.whatsappNumber}
                      onChange={(e) => updateField('whatsappNumber', e.target.value)}
                      placeholder="5591980124814"
                    />
                  </div>
                  <div>
                    <Label>URL do Instagram</Label>
                    <Input
                      value={projectData.instagramUrl}
                      onChange={(e) => updateField('instagramUrl', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Títulos de Seções */}
          <TabsContent value="titulos" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Títulos das Seções</CardTitle>
                <CardDescription>Personalize os títulos de cada seção da página</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Seção "Verdades/Mitos"</Label>
                  <Input
                    value={projectData.sectionTitles?.myths || ''}
                    onChange={(e) => updateSectionTitle('myths', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Seção "O que você vai ter"</Label>
                    <Input
                      value={projectData.sectionTitles?.benefits || ''}
                      onChange={(e) => updateSectionTitle('benefits', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Subtítulo dos Benefícios</Label>
                    <Input
                      value={projectData.sectionTitles?.benefitsSubtitle || ''}
                      onChange={(e) => updateSectionTitle('benefitsSubtitle', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Título "A cada 15 dias"</Label>
                  <Input
                    value={projectData.sectionTitles?.biweekly || ''}
                    onChange={(e) => updateSectionTitle('biweekly', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Seção "Suporte em Grupos"</Label>
                    <Input
                      value={projectData.sectionTitles?.support || ''}
                      onChange={(e) => updateSectionTitle('support', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Subtítulo do Suporte</Label>
                    <Input
                      value={projectData.sectionTitles?.supportSubtitle || ''}
                      onChange={(e) => updateSectionTitle('supportSubtitle', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Seção "Planos"</Label>
                    <Input
                      value={projectData.sectionTitles?.plans || ''}
                      onChange={(e) => updateSectionTitle('plans', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Subtítulo dos Planos</Label>
                    <Input
                      value={projectData.sectionTitles?.plansSubtitle || ''}
                      onChange={(e) => updateSectionTitle('plansSubtitle', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Seção "Depoimentos"</Label>
                  <Input
                    value={projectData.sectionTitles?.testimonials || ''}
                    onChange={(e) => updateSectionTitle('testimonials', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Seção "FAQ"</Label>
                  <Input
                    value={projectData.sectionTitles?.faq || ''}
                    onChange={(e) => updateSectionTitle('faq', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Conteúdo */}
          <TabsContent value="conteudo" className="space-y-4 mt-4">
            {/* Mitos */}
            <Card>
              <CardHeader>
                <CardTitle>Verdades/Mitos</CardTitle>
                <CardDescription>Edite o título, descrição e itens desta seção</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <Label className="text-xs text-gray-500 uppercase">Título da Seção</Label>
                    <Input
                      value={projectData.sectionTitles?.myths || ''}
                      onChange={(e) => updateSectionTitle('myths', e.target.value)}
                      placeholder="Ex: ⚠️ VERDADES QUE NINGUÉM TE CONTA"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 uppercase">Descrição (aparece abaixo do título)</Label>
                    <Input
                      value={projectData.sectionDescriptions?.myths || ''}
                      onChange={(e) => updateSectionDescription('myths', e.target.value)}
                      placeholder="Texto complementar opcional..."
                    />
                  </div>
                </div>
                {projectData.myths.map((myth, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={myth}
                      onChange={(e) => updateArrayItem('myths', index, e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeArrayItem('myths', index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => addArrayItem('myths', 'Novo ponto')}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ponto
                </Button>
              </CardContent>
            </Card>

            {/* Benefícios */}
            <Card>
              <CardHeader>
                <CardTitle>O que você vai ter</CardTitle>
                <CardDescription>Edite o título, descrição e benefícios do programa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 uppercase">Título da Seção</Label>
                      <Input
                        value={projectData.sectionTitles?.benefits || ''}
                        onChange={(e) => updateSectionTitle('benefits', e.target.value)}
                        placeholder="Ex: ✅ O QUE VOCÊ VAI TER"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase">Subtítulo</Label>
                      <Input
                        value={projectData.sectionTitles?.benefitsSubtitle || ''}
                        onChange={(e) => updateSectionTitle('benefitsSubtitle', e.target.value)}
                        placeholder="Subtítulo da seção..."
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 uppercase">Descrição</Label>
                    <Input
                      value={projectData.sectionDescriptions?.benefits || ''}
                      onChange={(e) => updateSectionDescription('benefits', e.target.value)}
                      placeholder="Descrição complementar opcional..."
                    />
                  </div>
                </div>
                {projectData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={benefit.text}
                      onChange={(e) => updateArrayItem('benefits', index, { ...benefit, text: e.target.value })}
                      className="flex-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeArrayItem('benefits', index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => addArrayItem('benefits', { icon: 'Activity', text: 'Novo benefício' })}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Benefício
                </Button>
              </CardContent>
            </Card>

            {/* Tarefas quinzenais */}
            <Card>
              <CardHeader>
                <CardTitle>A cada 15 dias</CardTitle>
                <CardDescription>Tarefas quinzenais do programa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <Label className="text-xs text-gray-500 uppercase">Título da Seção</Label>
                    <Input
                      value={projectData.sectionTitles?.biweekly || ''}
                      onChange={(e) => updateSectionTitle('biweekly', e.target.value)}
                      placeholder="Ex: A cada 15 dias:"
                    />
                  </div>
                </div>
                {projectData.biweeklyTasks.map((task, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={task}
                      onChange={(e) => updateArrayItem('biweeklyTasks', index, e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeArrayItem('biweeklyTasks', index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => addArrayItem('biweeklyTasks', 'Nova tarefa')}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tarefa
                </Button>
              </CardContent>
            </Card>

            {/* Grupos de Suporte */}
            <Card>
              <CardHeader>
                <CardTitle>Grupos de Suporte</CardTitle>
                <CardDescription>Edite o título e os itens dos grupos de suporte</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 uppercase">Título da Seção</Label>
                      <Input
                        value={projectData.sectionTitles?.support || ''}
                        onChange={(e) => updateSectionTitle('support', e.target.value)}
                        placeholder="Ex: 👥 SUPORTE EXCLUSIVO..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase">Subtítulo</Label>
                      <Input
                        value={projectData.sectionTitles?.supportSubtitle || ''}
                        onChange={(e) => updateSectionTitle('supportSubtitle', e.target.value)}
                        placeholder="Subtítulo..."
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 uppercase">Descrição</Label>
                    <Input
                      value={projectData.sectionDescriptions?.support || ''}
                      onChange={(e) => updateSectionDescription('support', e.target.value)}
                      placeholder="Descrição complementar opcional..."
                    />
                  </div>
                </div>
                {projectData.supportGroups.map((group, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={group.text}
                      onChange={(e) => updateArrayItem('supportGroups', index, { ...group, text: e.target.value })}
                      className="flex-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeArrayItem('supportGroups', index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => addArrayItem('supportGroups', { icon: 'Users', text: 'Novo grupo' })}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Grupo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Planos */}
          <TabsContent value="planos" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={addPlan} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Novo Plano
              </Button>
            </div>
            
            {projectData.plans.map((plan, planIndex) => (
              <Card key={planIndex} className={`${plan.highlight ? 'border-2 border-pink-500' : ''} ${!plan.active ? 'opacity-50' : ''}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Plano {plan.name}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm font-normal">
                        <input
                          type="checkbox"
                          checked={plan.active !== false}
                          onChange={(e) => updatePlan(planIndex, 'active', e.target.checked)}
                        />
                        Ativo
                      </label>
                      <label className="flex items-center gap-2 text-sm font-normal">
                        <input
                          type="checkbox"
                          checked={plan.highlight}
                          onChange={(e) => updatePlan(planIndex, 'highlight', e.target.checked)}
                        />
                        Destacar
                      </label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removePlan(planIndex)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={plan.name}
                        onChange={(e) => updatePlan(planIndex, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Preço</Label>
                      <Input
                        value={plan.price}
                        onChange={(e) => updatePlan(planIndex, 'price', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nota do Preço (ex: "Economia de R$40")</Label>
                      <Input
                        value={plan.priceNote}
                        onChange={(e) => updatePlan(planIndex, 'priceNote', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Tagline</Label>
                      <Input
                        value={plan.tagline}
                        onChange={(e) => updatePlan(planIndex, 'tagline', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Features</Label>
                    <div className="space-y-2">
                      {plan.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex gap-2">
                          <Input
                            value={feature}
                            onChange={(e) => updatePlanFeature(planIndex, fIndex, e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              const newFeatures = plan.features.filter((_, i) => i !== fIndex);
                              updatePlan(planIndex, 'features', newFeatures);
                            }}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updatePlan(planIndex, 'features', [...plan.features, 'Nova feature'])}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Feature
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Tab Depoimentos */}
          <TabsContent value="depoimentos" className="space-y-4 mt-4">
            {projectData.testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={testimonial.name}
                        onChange={(e) => updateArrayItem('testimonials', index, { ...testimonial, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Resultado (ex: -12kg)</Label>
                      <Input
                        value={testimonial.result}
                        onChange={(e) => updateArrayItem('testimonials', index, { ...testimonial, result: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Depoimento</Label>
                    <Textarea
                      value={testimonial.text}
                      onChange={(e) => updateArrayItem('testimonials', index, { ...testimonial, text: e.target.value })}
                      rows={2}
                    />
                  </div>
                  
                  {/* Upload de Imagem */}
                  <div>
                    <Label>Print do WhatsApp (opcional)</Label>
                    <div className="flex gap-4 items-center mt-2">
                      {testimonial.image ? (
                        <div className="relative">
                          <img 
                            src={testimonial.image} 
                            alt="Print" 
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6"
                            onClick={() => updateArrayItem('testimonials', index, { ...testimonial, image: '' })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      <div>
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
                            className="cursor-pointer"
                            disabled={uploadingImage === index}
                            asChild
                          >
                            <span>
                              {uploadingImage === index ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              {uploadingImage === index ? 'Enviando...' : 'Upload Print'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeArrayItem('testimonials', index)}
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover Depoimento
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button 
              variant="outline" 
              onClick={() => addArrayItem('testimonials', { name: 'Nome', text: 'Depoimento aqui...', result: '-Xkg', image: '' })}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Depoimento
            </Button>
          </TabsContent>

          {/* Tab FAQ */}
          <TabsContent value="faq" className="space-y-4 mt-4">
            {projectData.faq.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <Label>Pergunta</Label>
                    <Input
                      value={item.question}
                      onChange={(e) => updateArrayItem('faq', index, { ...item, question: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Resposta</Label>
                    <Textarea
                      value={item.answer}
                      onChange={(e) => updateArrayItem('faq', index, { ...item, answer: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeArrayItem('faq', index)}
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover Pergunta
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button 
              variant="outline" 
              onClick={() => addArrayItem('faq', { question: 'Nova pergunta?', answer: 'Resposta aqui...' })}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pergunta
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminProjetoEditor;
