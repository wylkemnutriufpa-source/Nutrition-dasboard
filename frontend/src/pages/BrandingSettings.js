import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Upload, RotateCcw, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trackProfessionalFeature } from '@/utils/featureTracking';
import { useBranding } from '@/contexts/BrandingContext';
import { saveProfessionalBranding, DEFAULT_BRANDING } from '@/utils/branding';
import { getCurrentUser, supabase } from '@/lib/supabase';

const BrandingSettings = () => {
  const { branding, refreshBranding } = useBranding();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [professionalId, setProfessionalId] = useState(null);
  
  const [formData, setFormData] = useState({
    logo_url: '',
    primary_color: DEFAULT_BRANDING.primary_color,
    secondary_color: DEFAULT_BRANDING.secondary_color,
    accent_color: DEFAULT_BRANDING.accent_color,
    // Tipografia
    font_family: DEFAULT_BRANDING.font_family,
    font_size_base: DEFAULT_BRANDING.font_size_base,
    font_size_heading: DEFAULT_BRANDING.font_size_heading,
    font_size_subheading: DEFAULT_BRANDING.font_size_subheading,
    font_size_body: DEFAULT_BRANDING.font_size_body,
    font_size_small: DEFAULT_BRANDING.font_size_small,
    badge_size: DEFAULT_BRANDING.badge_size,
    button_size: DEFAULT_BRANDING.button_size
  });

  useEffect(() => {
    loadProfessionalData();
  }, []);

  useEffect(() => {
    // Atualizar form com branding carregado do contexto
    if (branding) {
      setFormData({
        logo_url: branding.logo_url || '',
        primary_color: branding.primary_color || DEFAULT_BRANDING.primary_color,
        secondary_color: branding.secondary_color || DEFAULT_BRANDING.secondary_color,
        accent_color: branding.accent_color || DEFAULT_BRANDING.accent_color,
        font_family: branding.font_family || DEFAULT_BRANDING.font_family,
        font_size_base: branding.font_size_base || DEFAULT_BRANDING.font_size_base,
        font_size_heading: branding.font_size_heading || DEFAULT_BRANDING.font_size_heading,
        font_size_subheading: branding.font_size_subheading || DEFAULT_BRANDING.font_size_subheading,
        font_size_body: branding.font_size_body || DEFAULT_BRANDING.font_size_body,
        font_size_small: branding.font_size_small || DEFAULT_BRANDING.font_size_small,
        badge_size: branding.badge_size || DEFAULT_BRANDING.badge_size,
        button_size: branding.button_size || DEFAULT_BRANDING.button_size
      });
    }
  }, [branding]);

  const loadProfessionalData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // O professional_id é o próprio user.id
      setProfessionalId(user.id);
    } catch (error) {
      console.error('Erro ao carregar dados do profissional:', error);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande! Máximo 2MB');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    setUploading(true);
    try {
      // Upload para Supabase Storage
      const fileName = `${professionalId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(`logos/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Obter URL pública
      const { data: publicData } = supabase.storage
        .from('branding')
        .getPublicUrl(`logos/${fileName}`);

      setFormData({ ...formData, logo_url: publicData.publicUrl });
      toast.success('Logo carregada! Clique em Salvar para aplicar');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!professionalId) {
      toast.error('Profissional não identificado');
      return;
    }

    setLoading(true);
    try {
      const result = await saveProfessionalBranding(professionalId, formData);
      
      if (result.success) {
        await refreshBranding();
        toast.success('Configurações de marca atualizadas com sucesso!');
        trackProfessionalFeature('configure_branding');
      } else {
        toast.error('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
      setFormData({
        logo_url: '',
        primary_color: DEFAULT_BRANDING.primary_color,
        secondary_color: DEFAULT_BRANDING.secondary_color,
        accent_color: DEFAULT_BRANDING.accent_color
      });
      
      // Salvar o reset
      if (professionalId) {
        await saveProfessionalBranding(professionalId, {
          logo_url: null,
          primary_color: DEFAULT_BRANDING.primary_color,
          secondary_color: DEFAULT_BRANDING.secondary_color,
          accent_color: DEFAULT_BRANDING.accent_color
        });
        await refreshBranding();
      }
      
      toast.success('Configurações restauradas para o padrão');
    }
  };

  return (
    <Layout title="Personalização da Marca" showBack userType="professional">
      <div data-testid="branding-settings" className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 via-fuchsia-900 to-pink-900 p-6 md:p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg border border-white/10">
                    <Palette className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Personalizacao</h1>
                    <p className="text-fuchsia-300 text-sm">Customize a aparencia do sistema com sua identidade visual</p>
                  </div>
                </div>
                <Button onClick={handleReset} className="bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur-sm" disabled={loading}>
                  <RotateCcw size={16} className="mr-2" />
                  Restaurar Padrao
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ImageIcon className="mr-2 text-teal-700" size={20} />
              Logo da Marca
            </CardTitle>
            <CardDescription>
              Faça upload do logo que aparecerá no topo e na sidebar (recomendado: 200x200px, PNG com fundo transparente)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                {uploading ? (
                  <Loader2 className="animate-spin text-teal-700" size={32} />
                ) : formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <Upload className="text-gray-400" size={32} />
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-teal-300 rounded-lg p-6 hover:border-teal-500 transition-colors text-center">
                    <Upload className="mx-auto text-teal-700 mb-2" size={24} />
                    <p className="text-sm font-medium text-gray-700">Clique para fazer upload</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG até 2MB</p>
                  </div>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cores da Marca</CardTitle>
            <CardDescription>
              Escolha as cores que representam sua marca. Elas serão aplicadas em botões, links e destaques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex gap-3 mt-2">
                  <input
                    id="primaryColor"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-20 h-12 rounded border-2 border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    placeholder="#059669"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Cor principal</p>
              </div>

              <div>
                <Label htmlFor="secondaryColor">Cor Secundária</Label>
                <div className="flex gap-3 mt-2">
                  <input
                    id="secondaryColor"
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-20 h-12 rounded border-2 border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    placeholder="#10b981"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Cor alternativa</p>
              </div>

              <div>
                <Label htmlFor="accentColor">Cor de Destaque</Label>
                <div className="flex gap-3 mt-2">
                  <input
                    id="accentColor"
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="w-20 h-12 rounded border-2 border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    placeholder="#34d399"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Destaques</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">Preview das Cores:</p>
              <div className="flex gap-4">
                <Button style={{ backgroundColor: formData.primary_color }} className="text-white">
                  Primária
                </Button>
                <Button style={{ backgroundColor: formData.secondary_color }} className="text-white">
                  Secundária
                </Button>
                <Button style={{ backgroundColor: formData.accent_color }} className="text-white">
                  Destaque
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tipografia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">⚙️ Configurações de Tipografia</CardTitle>
            <CardDescription>
              Personalize fontes, tamanhos de texto, badges e botões
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fonte */}
            <div>
              <Label htmlFor="fontFamily">Família de Fonte</Label>
              <select
                id="fontFamily"
                value={formData.font_family}
                onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                className="w-full mt-2 p-2 border rounded-md"
              >
                <option value="Inter, system-ui, sans-serif">Inter (Padrão)</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="Open Sans, sans-serif">Open Sans</option>
                <option value="Lato, sans-serif">Lato</option>
                <option value="Montserrat, sans-serif">Montserrat</option>
                <option value="Poppins, sans-serif">Poppins</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia (Serifada)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Fonte padrão de todo o sistema</p>
            </div>

            {/* Tamanhos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fontSize_base">Tamanho Base</Label>
                <Input
                  id="fontSize_base"
                  value={formData.font_size_base}
                  onChange={(e) => setFormData({ ...formData, font_size_base: e.target.value })}
                  placeholder="16px"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 16px, 18px</p>
              </div>

              <div>
                <Label htmlFor="fontSize_heading">Título Principal</Label>
                <Input
                  id="fontSize_heading"
                  value={formData.font_size_heading}
                  onChange={(e) => setFormData({ ...formData, font_size_heading: e.target.value })}
                  placeholder="2rem"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 2rem, 2.5rem</p>
              </div>

              <div>
                <Label htmlFor="fontSize_subheading">Subtítulo</Label>
                <Input
                  id="fontSize_subheading"
                  value={formData.font_size_subheading}
                  onChange={(e) => setFormData({ ...formData, font_size_subheading: e.target.value })}
                  placeholder="1.5rem"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 1.5rem, 1.75rem</p>
              </div>

              <div>
                <Label htmlFor="fontSize_body">Texto Normal</Label>
                <Input
                  id="fontSize_body"
                  value={formData.font_size_body}
                  onChange={(e) => setFormData({ ...formData, font_size_body: e.target.value })}
                  placeholder="1rem"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 1rem, 1.125rem</p>
              </div>

              <div>
                <Label htmlFor="fontSize_small">Texto Pequeno</Label>
                <Input
                  id="fontSize_small"
                  value={formData.font_size_small}
                  onChange={(e) => setFormData({ ...formData, font_size_small: e.target.value })}
                  placeholder="0.875rem"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 0.875rem, 0.75rem</p>
              </div>

              <div>
                <Label htmlFor="badge_size">Tamanho Badge</Label>
                <Input
                  id="badge_size"
                  value={formData.badge_size}
                  onChange={(e) => setFormData({ ...formData, badge_size: e.target.value })}
                  placeholder="0.75rem"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 0.75rem, 0.875rem</p>
              </div>

              <div>
                <Label htmlFor="button_size">Tamanho Botão</Label>
                <Input
                  id="button_size"
                  value={formData.button_size}
                  onChange={(e) => setFormData({ ...formData, button_size: e.target.value })}
                  placeholder="1rem"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 1rem, 1.125rem</p>
              </div>
            </div>

            {/* Preview Tipografia */}
            <div className="mt-6 p-6 bg-gray-50 rounded-lg space-y-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Preview da Tipografia:</p>
              <h1 style={{ fontSize: formData.font_size_heading, fontFamily: formData.font_family, fontWeight: 'bold' }}>
                Título Principal (Heading)
              </h1>
              <h2 style={{ fontSize: formData.font_size_subheading, fontFamily: formData.font_family, fontWeight: 'bold' }}>
                Subtítulo (Subheading)
              </h2>
              <p style={{ fontSize: formData.font_size_body, fontFamily: formData.font_family }}>
                Este é um texto de corpo normal. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
              <p style={{ fontSize: formData.font_size_small, fontFamily: formData.font_family }}>
                Texto pequeno para notas e informações secundárias.
              </p>
              <div className="flex gap-3 items-center">
                <span 
                  className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium"
                  style={{ fontSize: formData.badge_size, fontFamily: formData.font_family }}
                >
                  Badge Exemplo
                </span>
                <Button style={{ fontSize: formData.button_size, fontFamily: formData.font_family }}>
                  Botão Exemplo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                className="flex-1 bg-teal-700 hover:bg-teal-800"
                size="lg"
                disabled={loading || !professionalId}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="lg"
              >
                Visualizar Mudanças
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500 mt-4">
              As alterações serão aplicadas imediatamente após salvar. Recarregue a página para ver o efeito completo.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default BrandingSettings;
