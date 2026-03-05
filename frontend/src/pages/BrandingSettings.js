import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Palette, Upload, RotateCcw, Image as ImageIcon, Loader2, Sparkles,
  Eye, Monitor, Type, Globe, HelpCircle, Link2, Shield, Stethoscope,
  User, Heart, Activity, TrendingUp, Star, Zap, Lock, Mail, ChevronRight,
  Plus, Trash2, Save, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { useBranding } from '@/contexts/BrandingContext';
import { saveProfessionalBranding, DEFAULT_BRANDING } from '@/utils/branding';
import { getCurrentUser, supabase } from '@/lib/supabase';

// ==================== TEMPLATES DE BRANDING ====================
const BRANDING_TEMPLATES = [
  {
    id: 'minimalista',
    name: 'Minimalista',
    description: 'Limpo, moderno e profissional',
    preview_colors: ['#1a1a2e', '#16213e', '#0f3460'],
    values: {
      primary_color: '#1a1a2e', secondary_color: '#16213e', accent_color: '#0f3460',
      login_bg_gradient_from: '#f8f9fa', login_bg_gradient_to: '#e9ecef',
      login_card_style: 'solid', login_effect: 'none',
      font_family: 'Inter, system-ui, sans-serif'
    }
  },
  {
    id: 'corporativo',
    name: 'Corporativo',
    description: 'Elegante e serio para clinicas',
    preview_colors: ['#1e3a5f', '#2563eb', '#3b82f6'],
    values: {
      primary_color: '#1e3a5f', secondary_color: '#2563eb', accent_color: '#3b82f6',
      login_bg_gradient_from: '#f0f4f8', login_bg_gradient_to: '#dbeafe',
      login_card_style: 'solid', login_effect: 'gradient_wave',
      font_family: 'Montserrat, sans-serif'
    }
  },
  {
    id: 'natural',
    name: 'Natural',
    description: 'Tons terrosos e organicos',
    preview_colors: ['#5c4033', '#8b6914', '#a0522d'],
    values: {
      primary_color: '#5c4033', secondary_color: '#8b6914', accent_color: '#a0522d',
      login_bg_gradient_from: '#fefce8', login_bg_gradient_to: '#fef3c7',
      login_card_style: 'glass', login_effect: 'floating',
      font_family: 'Georgia, serif'
    }
  },
  {
    id: 'vibrante',
    name: 'Vibrante',
    description: 'Energetico e colorido',
    preview_colors: ['#7c3aed', '#ec4899', '#f59e0b'],
    values: {
      primary_color: '#7c3aed', secondary_color: '#ec4899', accent_color: '#f59e0b',
      login_bg_gradient_from: '#fdf4ff', login_bg_gradient_to: '#fce7f3',
      login_card_style: 'glass', login_effect: 'particles',
      font_family: 'Poppins, sans-serif'
    }
  },
  {
    id: 'saude_verde',
    name: 'Saude Verde',
    description: 'Padrao FitJourney classico',
    preview_colors: ['#059669', '#10b981', '#34d399'],
    values: {
      primary_color: '#059669', secondary_color: '#10b981', accent_color: '#34d399',
      login_bg_gradient_from: '#f8fafc', login_bg_gradient_to: '#f0fdfa',
      login_card_style: 'glass', login_effect: 'floating',
      font_family: 'Inter, system-ui, sans-serif'
    }
  },
  {
    id: 'oceano',
    name: 'Oceano',
    description: 'Calmo e profissional',
    preview_colors: ['#0e7490', '#06b6d4', '#67e8f9'],
    values: {
      primary_color: '#0e7490', secondary_color: '#06b6d4', accent_color: '#67e8f9',
      login_bg_gradient_from: '#f0fdfa', login_bg_gradient_to: '#ecfeff',
      login_card_style: 'gradient', login_effect: 'gradient_wave',
      font_family: 'Nunito, sans-serif'
    }
  }
];

// ==================== MINI LOGIN PREVIEW ====================
const LoginPreview = ({ formData }) => {
  const bgStyle = {
    background: `linear-gradient(135deg, ${formData.login_bg_gradient_from || '#f8fafc'}, ${formData.login_bg_gradient_to || '#f0fdfa'})`,
    minHeight: '400px'
  };

  const stats = formData.login_stats || DEFAULT_BRANDING.login_stats;
  const faqItems = formData.footer_faq_items || DEFAULT_BRANDING.footer_faq_items;
  const footerLinks = formData.footer_links || DEFAULT_BRANDING.footer_links;

  return (
    <div data-testid="login-preview" className="rounded-2xl overflow-hidden border shadow-xl relative" style={bgStyle}>
      {/* Efeitos visuais */}
      {formData.login_effect === 'floating' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-5 w-32 h-32 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: `${formData.primary_color}20` }} />
          <div className="absolute bottom-10 right-5 w-40 h-40 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: `${formData.secondary_color}20`, animationDelay: '1s' }} />
        </div>
      )}
      {formData.login_effect === 'particles' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute rounded-full animate-bounce" style={{
              width: `${4 + Math.random() * 6}px`, height: `${4 + Math.random() * 6}px`,
              top: `${Math.random() * 80}%`, left: `${Math.random() * 90}%`,
              backgroundColor: `${formData.primary_color}30`,
              animationDuration: `${2 + Math.random() * 3}s`, animationDelay: `${Math.random() * 2}s`
            }} />
          ))}
        </div>
      )}
      {formData.login_effect === 'gradient_wave' && (
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{
          background: `linear-gradient(0deg, ${formData.primary_color}15, transparent)`
        }} />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center p-6 pt-8">
        {/* Logo */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})` }}>
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
            ) : (
              <span className="text-white font-black text-xl">{formData.brand_initials || 'FJ'}</span>
            )}
          </div>
        </div>

        {/* Nome */}
        <h2 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: formData.font_family, fontSize: formData.font_size_heading }}>
          {formData.brand_name || 'FitJourney'}
        </h2>
        <p className="text-sm text-gray-600 text-center max-w-[240px] mb-4" style={{ fontFamily: formData.font_family }}>
          {formData.login_title || 'Sua jornada para uma vida mais saudavel'}
        </p>

        {/* Stats */}
        {formData.login_show_stats && (
          <div className="flex gap-4 mb-4">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-lg font-bold" style={{ color: formData.primary_color }}>{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Cards de login mini */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-[280px] mb-4">
          {[
            { icon: Shield, label: 'Admin', color: '#7C3AED' },
            { icon: Stethoscope, label: 'Profissional', color: formData.primary_color },
            { icon: User, label: 'Paciente', color: '#22c55e' },
            { icon: Eye, label: 'Visitante', color: '#3b82f6' }
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className={`${formData.login_card_style === 'glass' ? 'bg-white/60 backdrop-blur-sm' : 'bg-white'} rounded-xl p-2 border border-gray-100 text-center shadow-sm`}>
                <Icon size={16} style={{ color: c.color }} className="mx-auto mb-1" />
                <span className="text-[10px] font-medium text-gray-700">{c.label}</span>
              </div>
            );
          })}
        </div>

        {/* Footer Preview */}
        <div className="w-full border-t border-gray-200/50 pt-3 mt-2 text-center">
          {formData.footer_show_links && (
            <div className="flex gap-2 justify-center flex-wrap mb-2">
              {footerLinks.map((link, i) => (
                <span key={i} className="text-[9px] text-gray-400 hover:text-gray-600 cursor-pointer underline">{link.label}</span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Lock className="w-3 h-3" />
            <span className="text-[9px]">Conexao segura</span>
          </div>
          <p className="text-[9px] text-gray-500">{formData.footer_copyright || DEFAULT_BRANDING.footer_copyright}</p>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const BrandingSettings = () => {
  const { branding, refreshBranding } = useBranding();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [professionalId, setProfessionalId] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');

  const [formData, setFormData] = useState(() => ({
    ...DEFAULT_BRANDING,
    logo_url: ''
  }));

  useEffect(() => {
    loadProfessionalData();
  }, []);

  useEffect(() => {
    if (branding) {
      setFormData(prev => {
        const merged = { ...DEFAULT_BRANDING };
        Object.keys(merged).forEach(key => {
          if (branding[key] !== undefined && branding[key] !== null) {
            merged[key] = branding[key];
          }
        });
        if (!merged.logo_url) merged.logo_url = '';
        return merged;
      });
    }
  }, [branding]);

  const loadProfessionalData = async () => {
    try {
      const user = await getCurrentUser();
      if (user) setProfessionalId(user.id);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('🖼️ [LOGO UPLOAD] Arquivo selecionado:', file.name, file.size, file.type);
    
    if (file.size > 2 * 1024 * 1024) { 
      toast.error('Imagem muito grande! Maximo 2MB'); 
      return; 
    }
    if (!file.type.startsWith('image/')) { 
      toast.error('Apenas imagens sao permitidas'); 
      return; 
    }

    setUploading(true);
    try {
      const fileName = `${professionalId}-${Date.now()}.${file.name.split('.').pop()}`;
      console.log('🖼️ [LOGO UPLOAD] Nome do arquivo:', fileName);
      console.log('🖼️ [LOGO UPLOAD] Tentando upload no bucket "branding"...');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('branding')
        .upload(`logos/${fileName}`, file, { 
          cacheControl: '3600', 
          upsert: true 
        });
      
      console.log('🖼️ [LOGO UPLOAD] Resultado do upload:', { uploadData, uploadError });
      console.log('🖼️ [LOGO UPLOAD] Erro detalhado:', JSON.stringify(uploadError, null, 2));
      
      if (uploadError) {
        console.error('❌ [LOGO UPLOAD] Erro completo:', uploadError);
        console.error('❌ [LOGO UPLOAD] Mensagem:', uploadError.message);
        console.error('❌ [LOGO UPLOAD] Status:', uploadError.statusCode);
        console.error('❌ [LOGO UPLOAD] Error object:', uploadError.error);
        
        // Verificar se o bucket existe
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
          toast.error('Bucket "branding" nao existe. Crie no Supabase Storage primeiro!');
          return;
        }
        
        // Verificar se é problema de permissão
        if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
          toast.error('Sem permissao para upload. Verifique as policies do bucket!');
          return;
        }
        
        throw uploadError;
      }
      
      const { data: publicData } = supabase.storage.from('branding').getPublicUrl(`logos/${fileName}`);
      console.log('✅ [LOGO UPLOAD] URL pública:', publicData.publicUrl);
      
      updateField('logo_url', publicData.publicUrl);
      toast.success('Logo carregada! Clique em Salvar para aplicar');
    } catch (error) {
      console.error('❌ [LOGO UPLOAD] Erro geral:', error);
      toast.error(`Erro ao fazer upload: ${error.message || 'Desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!professionalId) { toast.error('Profissional nao identificado'); return; }
    setLoading(true);
    try {
      const dataToSave = { ...formData };
      if (dataToSave.login_stats) dataToSave.login_stats = JSON.parse(JSON.stringify(dataToSave.login_stats));
      if (dataToSave.footer_faq_items) dataToSave.footer_faq_items = JSON.parse(JSON.stringify(dataToSave.footer_faq_items));
      if (dataToSave.footer_links) dataToSave.footer_links = JSON.parse(JSON.stringify(dataToSave.footer_links));

      const result = await saveProfessionalBranding(professionalId, dataToSave);
      if (result.success) {
        await refreshBranding();
        toast.success('Configuracoes de marca salvas com sucesso!');
        trackProfessionalFeature('configure_branding');
      } else {
        toast.error('Erro ao salvar configuracoes');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Restaurar configuracoes padrao?')) {
      setFormData({ ...DEFAULT_BRANDING, logo_url: '' });
      if (professionalId) {
        await saveProfessionalBranding(professionalId, { ...DEFAULT_BRANDING, logo_url: null });
        await refreshBranding();
      }
      toast.success('Configuracoes restauradas');
    }
  };

  // FAQ helpers
  const addFaqItem = () => {
    const items = [...(formData.footer_faq_items || []), { question: '', answer: '' }];
    updateField('footer_faq_items', items);
  };
  const removeFaqItem = (index) => {
    const items = (formData.footer_faq_items || []).filter((_, i) => i !== index);
    updateField('footer_faq_items', items);
  };
  const updateFaqItem = (index, field, value) => {
    const items = [...(formData.footer_faq_items || [])];
    items[index] = { ...items[index], [field]: value };
    updateField('footer_faq_items', items);
  };

  // Footer links helpers
  const addFooterLink = () => {
    const links = [...(formData.footer_links || []), { label: '', url: '#' }];
    updateField('footer_links', links);
  };
  const removeFooterLink = (index) => {
    const links = (formData.footer_links || []).filter((_, i) => i !== index);
    updateField('footer_links', links);
  };
  const updateFooterLink = (index, field, value) => {
    const links = [...(formData.footer_links || [])];
    links[index] = { ...links[index], [field]: value };
    updateField('footer_links', links);
  };

  // Stats helpers
  const updateStat = (index, field, value) => {
    const stats = [...(formData.login_stats || DEFAULT_BRANDING.login_stats)];
    stats[index] = { ...stats[index], [field]: value };
    updateField('login_stats', stats);
  };

  return (
    <Layout title="Personalizacao da Marca" showBack userType="professional">
      <div data-testid="branding-settings" className="max-w-6xl mx-auto pb-8 px-4">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl shadow-xl mb-6">
          <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-400 p-4 md:p-6 text-white relative">
            <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Palette className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div>
                  <span className="inline-block px-2 md:px-3 py-0.5 md:py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-1">White-Label</span>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight">Personalizacao da Marca</h1>
                  <p className="text-white/80 text-xs md:text-sm">Personalize toda a aparencia do sistema</p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={handleReset} className="bg-white/20 text-white hover:bg-white/30 border border-white/20 flex-1 md:flex-none" size="sm" disabled={loading}>
                  <RotateCcw size={14} className="mr-1" /> Restaurar
                </Button>
                <Button onClick={handleSave} className="bg-white text-rose-600 hover:bg-white/90 font-bold flex-1 md:flex-none" size="sm" disabled={loading || !professionalId}>
                  {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Layout: Editor + Preview lado a lado */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6">
          {/* Editor - 3 colunas */}
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full gap-1">
                <TabsTrigger value="templates" className="text-[10px] md:text-xs px-1 md:px-3"><Star size={12} className="mr-0 md:mr-1" /> <span className="hidden md:inline">Temas</span><span className="md:hidden">🎨</span></TabsTrigger>
                <TabsTrigger value="identity" className="text-[10px] md:text-xs px-1 md:px-3"><Sparkles size={12} className="mr-0 md:mr-1" /> <span className="hidden md:inline">Marca</span><span className="md:hidden">✨</span></TabsTrigger>
                <TabsTrigger value="colors" className="text-[10px] md:text-xs px-1 md:px-3"><Palette size={12} className="mr-0 md:mr-1" /> <span className="hidden md:inline">Cores</span><span className="md:hidden">🎨</span></TabsTrigger>
                <TabsTrigger value="login" className="text-[10px] md:text-xs px-1 md:px-3"><Monitor size={12} className="mr-0 md:mr-1" /> <span className="hidden md:inline">Login</span><span className="md:hidden">📊</span></TabsTrigger>
                <TabsTrigger value="typography" className="text-[10px] md:text-xs px-1 md:px-3"><Type size={12} className="mr-0 md:mr-1" /> <span className="hidden md:inline">Fontes</span><span className="md:hidden">Aa</span></TabsTrigger>
                <TabsTrigger value="footer" className="text-[10px] md:text-xs px-1 md:px-3"><Globe size={12} className="mr-0 md:mr-1" /> <span className="hidden md:inline">Rodape</span><span className="md:hidden">🌐</span></TabsTrigger>
              </TabsList>

              {/* ====== TAB: TEMPLATES ====== */}
              <TabsContent value="templates">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center"><Star className="mr-2 text-amber-500" size={20} /> Temas Prontos</CardTitle>
                    <CardDescription>Aplique um visual completo com 1 clique. Voce pode personalizar depois.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {BRANDING_TEMPLATES.map((template) => (
                        <button key={template.id} data-testid={`template-${template.id}`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, ...template.values }));
                            toast.success(`Tema "${template.name}" aplicado! Clique em Salvar para confirmar.`);
                          }}
                          className="group p-4 rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all text-left">
                          <div className="flex gap-1 mb-3">
                            {template.preview_colors.map((color, i) => (
                              <div key={i} className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                          <p className="font-bold text-gray-900 text-sm">{template.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-semibold text-amber-600">Clique para aplicar</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ====== TAB: IDENTIDADE ====== */}
              <TabsContent value="identity">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center"><ImageIcon className="mr-2 text-teal-700" size={20} /> Logo e Identidade</CardTitle>
                    <CardDescription>Upload do logo e informacoes basicas da marca</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Logo Upload */}
                    <div className="flex items-center gap-6">
                      <div className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 flex-shrink-0">
                        {uploading ? <Loader2 className="animate-spin text-teal-700" size={28} /> :
                          formData.logo_url ? <img src={formData.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-2" /> :
                            <Upload className="text-gray-400" size={28} />}
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="logo-upload" className="cursor-pointer">
                          <div className="border-2 border-dashed border-teal-300 rounded-xl p-4 hover:border-teal-500 transition-colors text-center">
                            <Upload className="mx-auto text-teal-700 mb-1" size={20} />
                            <p className="text-sm font-medium text-gray-700">Clique para upload</p>
                            <p className="text-xs text-gray-500">PNG, JPG ate 2MB</p>
                          </div>
                        </Label>
                        <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                      </div>
                    </div>

                    {/* Nome e Iniciais */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome da Marca</Label>
                        <Input data-testid="brand-name-input" value={formData.brand_name} onChange={(e) => updateField('brand_name', e.target.value)} placeholder="FitJourney" className="mt-1" />
                      </div>
                      <div>
                        <Label>Iniciais/Sigla</Label>
                        <Input data-testid="brand-initials-input" value={formData.brand_initials} onChange={(e) => updateField('brand_initials', e.target.value.toUpperCase().slice(0, 3))} placeholder="FJ" maxLength={3} className="mt-1" />
                      </div>
                    </div>

                    {/* Slogan */}
                    <div>
                      <Label>Slogan / Subtitulo</Label>
                      <Input data-testid="login-title-input" value={formData.login_title} onChange={(e) => updateField('login_title', e.target.value)} placeholder="Sua jornada para uma vida mais saudavel" className="mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ====== TAB: CORES ====== */}
              <TabsContent value="colors">
                <Card>
                  <CardHeader>
                    <CardTitle>Cores da Marca</CardTitle>
                    <CardDescription>Cores aplicadas em botoes, links, sidebar e destaques</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { key: 'primary_color', label: 'Primaria', desc: 'Cor principal' },
                        { key: 'secondary_color', label: 'Secundaria', desc: 'Cor alternativa' },
                        { key: 'accent_color', label: 'Destaque', desc: 'Destaques e acentos' }
                      ].map(({ key, label, desc }) => (
                        <div key={key}>
                          <Label>{label}</Label>
                          <div className="flex gap-2 mt-1">
                            <input type="color" value={formData[key]} onChange={(e) => updateField(key, e.target.value)} className="w-14 h-10 rounded border cursor-pointer" />
                            <Input value={formData[key]} onChange={(e) => updateField(key, e.target.value)} className="flex-1 text-sm" />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{desc}</p>
                        </div>
                      ))}
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm font-medium text-gray-700 mb-3">Preview:</p>
                      <div className="flex gap-3">
                        <Button style={{ backgroundColor: formData.primary_color }} className="text-white">Primaria</Button>
                        <Button style={{ backgroundColor: formData.secondary_color }} className="text-white">Secundaria</Button>
                        <Button style={{ backgroundColor: formData.accent_color }} className="text-white">Destaque</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ====== TAB: LOGIN ====== */}
              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center"><Monitor className="mr-2 text-blue-600" size={20} /> Tela de Login</CardTitle>
                    <CardDescription>Configure a aparencia completa da tela de login</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Cores de fundo */}
                    <div>
                      <Label className="text-sm font-semibold">Gradiente de Fundo</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label className="text-xs">De (cor inicial)</Label>
                          <div className="flex gap-2 mt-1">
                            <input type="color" value={formData.login_bg_gradient_from} onChange={(e) => updateField('login_bg_gradient_from', e.target.value)} className="w-12 h-9 rounded border cursor-pointer" />
                            <Input value={formData.login_bg_gradient_from} onChange={(e) => updateField('login_bg_gradient_from', e.target.value)} className="flex-1 text-sm" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Para (cor final)</Label>
                          <div className="flex gap-2 mt-1">
                            <input type="color" value={formData.login_bg_gradient_to} onChange={(e) => updateField('login_bg_gradient_to', e.target.value)} className="w-12 h-9 rounded border cursor-pointer" />
                            <Input value={formData.login_bg_gradient_to} onChange={(e) => updateField('login_bg_gradient_to', e.target.value)} className="flex-1 text-sm" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Estilo dos Cards */}
                    <div>
                      <Label className="text-sm font-semibold">Estilo dos Cards</Label>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        {[
                          { value: 'glass', label: 'Glass', desc: 'Transparente com blur' },
                          { value: 'solid', label: 'Solido', desc: 'Fundo branco opaco' },
                          { value: 'gradient', label: 'Gradiente', desc: 'Com gradiente sutil' }
                        ].map(style => (
                          <button key={style.value} onClick={() => updateField('login_card_style', style.value)}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${formData.login_card_style === style.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <p className="text-sm font-semibold">{style.label}</p>
                            <p className="text-xs text-gray-500">{style.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Efeitos Visuais */}
                    <div>
                      <Label className="text-sm font-semibold">Efeito Visual</Label>
                      <div className="grid grid-cols-4 gap-3 mt-2">
                        {[
                          { value: 'none', label: 'Nenhum' },
                          { value: 'floating', label: 'Flutuante' },
                          { value: 'particles', label: 'Particulas' },
                          { value: 'gradient_wave', label: 'Onda' }
                        ].map(effect => (
                          <button key={effect.value} onClick={() => updateField('login_effect', effect.value)}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${formData.login_effect === effect.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <p className="text-sm font-semibold">{effect.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Estatisticas */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Activity size={16} className="text-blue-500" />
                          Estatisticas no Login
                        </Label>
                        <Switch checked={formData.login_show_stats} onCheckedChange={(v) => updateField('login_show_stats', v)} />
                      </div>
                      {formData.login_show_stats && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                            💡 <strong>Edite aqui:</strong> os números e textos que aparecem na tela de login
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(formData.login_stats || DEFAULT_BRANDING.login_stats).map((stat, i) => (
                              <div key={i} className="space-y-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                <Label className="text-[10px] text-gray-600">Estatística {i + 1}</Label>
                                <Input value={stat.value} onChange={(e) => updateStat(i, 'value', e.target.value)} placeholder="500+" className="text-sm font-bold" />
                                <Input value={stat.label} onChange={(e) => updateStat(i, 'label', e.target.value)} placeholder="Profissionais" className="text-xs" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ====== TAB: TIPOGRAFIA ====== */}
              <TabsContent value="typography">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center"><Type className="mr-2 text-purple-600" size={20} /> Tipografia</CardTitle>
                    <CardDescription>Fontes e tamanhos de texto</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Familia de Fonte</Label>
                      <select value={formData.font_family} onChange={(e) => updateField('font_family', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-sm">
                        <option value="Inter, system-ui, sans-serif">Inter (Padrao)</option>
                        <option value="Roboto, sans-serif">Roboto</option>
                        <option value="Open Sans, sans-serif">Open Sans</option>
                        <option value="Lato, sans-serif">Lato</option>
                        <option value="Montserrat, sans-serif">Montserrat</option>
                        <option value="Poppins, sans-serif">Poppins</option>
                        <option value="Nunito, sans-serif">Nunito</option>
                        <option value="Raleway, sans-serif">Raleway</option>
                        <option value="Georgia, serif">Georgia (Serifada)</option>
                        <option value="Playfair Display, serif">Playfair Display</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { key: 'font_size_heading', label: 'Titulo Principal', placeholder: '2rem' },
                        { key: 'font_size_subheading', label: 'Subtitulo', placeholder: '1.5rem' },
                        { key: 'font_size_body', label: 'Texto Normal', placeholder: '1rem' },
                        { key: 'font_size_small', label: 'Texto Pequeno', placeholder: '0.875rem' },
                        { key: 'badge_size', label: 'Badge', placeholder: '0.75rem' },
                        { key: 'button_size', label: 'Botao', placeholder: '1rem' }
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <Label className="text-xs">{label}</Label>
                          <Input value={formData[key]} onChange={(e) => updateField(key, e.target.value)} placeholder={placeholder} className="mt-1 text-sm" />
                        </div>
                      ))}
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                      <h1 style={{ fontSize: formData.font_size_heading, fontFamily: formData.font_family, fontWeight: 'bold' }}>Titulo Principal</h1>
                      <h2 style={{ fontSize: formData.font_size_subheading, fontFamily: formData.font_family, fontWeight: 'bold' }}>Subtitulo</h2>
                      <p style={{ fontSize: formData.font_size_body, fontFamily: formData.font_family }}>Texto de corpo normal para conteudo.</p>
                      <p style={{ fontSize: formData.font_size_small, fontFamily: formData.font_family, color: '#6b7280' }}>Texto pequeno para notas.</p>
                      <div className="flex gap-2 items-center pt-2">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium" style={{ fontSize: formData.badge_size }}>Badge</span>
                        <Button style={{ fontSize: formData.button_size, backgroundColor: formData.primary_color }} className="text-white">Botao</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ====== TAB: RODAPE / FOOTER ====== */}
              <TabsContent value="footer">
                <div className="space-y-4">
                  {/* Copyright */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base"><Globe className="mr-2 text-green-600" size={18} /> Copyright e Texto do Rodape</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Texto de Copyright</Label>
                        <Input data-testid="footer-copyright-input" value={formData.footer_copyright} onChange={(e) => updateField('footer_copyright', e.target.value)} placeholder="2025 FitJourney. Todos os direitos reservados." className="mt-1" />
                      </div>
                      <div>
                        <Label>Texto do Rodape (Login)</Label>
                        <Input value={formData.login_footer} onChange={(e) => updateField('login_footer', e.target.value)} placeholder="Sistema de Nutricao Premium" className="mt-1" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quem Somos */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base"><User className="mr-2 text-blue-600" size={18} /> Quem Somos</CardTitle>
                        <Switch checked={formData.footer_show_about} onCheckedChange={(v) => updateField('footer_show_about', v)} />
                      </div>
                    </CardHeader>
                    {formData.footer_show_about && (
                      <CardContent>
                        <Textarea data-testid="footer-about-textarea" value={formData.footer_about} onChange={(e) => updateField('footer_about', e.target.value)}
                          placeholder="Descreva seu negocio..." rows={3} />
                      </CardContent>
                    )}
                  </Card>

                  {/* FAQ */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base"><HelpCircle className="mr-2 text-amber-600" size={18} /> FAQ</CardTitle>
                        <Switch checked={formData.footer_show_faq} onCheckedChange={(v) => updateField('footer_show_faq', v)} />
                      </div>
                    </CardHeader>
                    {formData.footer_show_faq && (
                      <CardContent className="space-y-3">
                        {(formData.footer_faq_items || []).map((item, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2 relative">
                            <button onClick={() => removeFaqItem(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                            <Input value={item.question} onChange={(e) => updateFaqItem(i, 'question', e.target.value)} placeholder="Pergunta..." className="text-sm" />
                            <Textarea value={item.answer} onChange={(e) => updateFaqItem(i, 'answer', e.target.value)} placeholder="Resposta..." rows={2} className="text-sm" />
                          </div>
                        ))}
                        <Button onClick={addFaqItem} variant="outline" size="sm" className="w-full"><Plus size={14} className="mr-1" /> Adicionar Pergunta</Button>
                      </CardContent>
                    )}
                  </Card>

                  {/* Links do Rodape */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base"><Link2 className="mr-2 text-indigo-600" size={18} /> Links do Rodape</CardTitle>
                        <Switch checked={formData.footer_show_links} onCheckedChange={(v) => updateField('footer_show_links', v)} />
                      </div>
                    </CardHeader>
                    {formData.footer_show_links && (
                      <CardContent className="space-y-3">
                        {(formData.footer_links || []).map((link, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input value={link.label} onChange={(e) => updateFooterLink(i, 'label', e.target.value)} placeholder="Texto do link" className="flex-1 text-sm" />
                            <Input value={link.url} onChange={(e) => updateFooterLink(i, 'url', e.target.value)} placeholder="URL" className="flex-1 text-sm" />
                            <button onClick={() => removeFooterLink(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                          </div>
                        ))}
                        <Button onClick={addFooterLink} variant="outline" size="sm" className="w-full"><Plus size={14} className="mr-1" /> Adicionar Link</Button>
                      </CardContent>
                    )}
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview - 2 colunas (sticky) */}
          <div className="xl:col-span-2">
            <div className="sticky top-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={16} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Preview em Tempo Real</span>
              </div>
              <LoginPreview formData={formData} />

              {/* Botao salvar flutuante */}
              <Button onClick={handleSave} className="w-full bg-teal-700 hover:bg-teal-800 text-white py-4 md:py-5" disabled={loading || !professionalId}>
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Salvando...</> : <><Save size={16} className="mr-2" /> Salvar Configuracoes</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BrandingSettings;
