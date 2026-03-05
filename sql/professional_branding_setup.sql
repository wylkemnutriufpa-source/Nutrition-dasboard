-- =====================================================
-- PROFESSIONAL BRANDING SETUP
-- Tabela para personalização de marca dos profissionais
-- =====================================================

-- Função auxiliar para updated_at (idempotente)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela professional_branding (idempotente)
CREATE TABLE IF NOT EXISTS professional_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Logo e cores principais
  logo_url text,
  primary_color text DEFAULT '#059669',
  secondary_color text DEFAULT '#10b981',
  accent_color text DEFAULT '#34d399',
  
  -- Nome da marca e textos da tela de login
  brand_name text DEFAULT 'FitJourney',
  brand_initials text DEFAULT 'FJ',
  login_title text DEFAULT 'Sua jornada para uma vida mais saudavel comeca aqui',
  login_footer text DEFAULT 'Sistema de Nutricao Premium',
  
  -- Login - Aparencia
  login_bg_color text DEFAULT '#f8fafc',
  login_bg_gradient_from text DEFAULT '#f8fafc',
  login_bg_gradient_to text DEFAULT '#f0fdfa',
  login_card_style text DEFAULT 'glass',
  login_effect text DEFAULT 'floating',
  login_show_stats boolean DEFAULT true,
  login_stats jsonb DEFAULT '[
    {"label": "Profissionais", "value": "500+"},
    {"label": "Pacientes", "value": "10k+"},
    {"label": "Sucesso", "value": "98%"}
  ]'::jsonb,
  
  -- Footer editavel
  footer_copyright text DEFAULT '2025 FitJourney. Todos os direitos reservados.',
  footer_about text DEFAULT 'Plataforma completa de nutricao para profissionais e pacientes.',
  footer_faq_items jsonb DEFAULT '[
    {"question": "Como funciona?", "answer": "Cadastre-se como profissional ou paciente e acesse todas as ferramentas."},
    {"question": "E gratuito?", "answer": "Oferecemos planos gratuitos e premium para profissionais."},
    {"question": "Como faco contato?", "answer": "Envie um email para suporte@fitjourney.com"}
  ]'::jsonb,
  footer_links jsonb DEFAULT '[
    {"label": "Termos de Uso", "url": "#"},
    {"label": "Politica de Privacidade", "url": "#"},
    {"label": "Contato", "url": "#"}
  ]'::jsonb,
  footer_show_about boolean DEFAULT true,
  footer_show_faq boolean DEFAULT true,
  footer_show_links boolean DEFAULT true,
  
  -- Tipografia
  font_family text DEFAULT 'Inter, system-ui, -apple-system, sans-serif',
  font_size_base text DEFAULT '16px',
  font_size_heading text DEFAULT '2rem',
  font_size_subheading text DEFAULT '1.5rem',
  font_size_body text DEFAULT '1rem',
  font_size_small text DEFAULT '0.875rem',
  font_weight_normal text DEFAULT '400',
  font_weight_medium text DEFAULT '500',
  font_weight_bold text DEFAULT '700',
  badge_size text DEFAULT '0.75rem',
  button_size text DEFAULT '1rem',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Um profissional tem apenas um branding
  UNIQUE(professional_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_professional_branding_professional 
ON professional_branding(professional_id);

-- RLS Policies
ALTER TABLE professional_branding ENABLE ROW LEVEL SECURITY;

-- Profissional pode ver e editar apenas o próprio branding
DROP POLICY IF EXISTS professional_branding_select_own ON professional_branding;
CREATE POLICY professional_branding_select_own ON professional_branding
  FOR SELECT USING (
    auth.uid() = professional_id
  );

DROP POLICY IF EXISTS professional_branding_insert_own ON professional_branding;
CREATE POLICY professional_branding_insert_own ON professional_branding
  FOR INSERT WITH CHECK (
    auth.uid() = professional_id
  );

DROP POLICY IF EXISTS professional_branding_update_own ON professional_branding;
CREATE POLICY professional_branding_update_own ON professional_branding
  FOR UPDATE USING (
    auth.uid() = professional_id
  ) WITH CHECK (
    auth.uid() = professional_id
  );

-- Paciente pode visualizar o branding do seu profissional
DROP POLICY IF EXISTS professional_branding_patient_view ON professional_branding;
CREATE POLICY professional_branding_patient_view ON professional_branding
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patient_profiles
      WHERE patient_profiles.user_id = auth.uid()
        AND patient_profiles.professional_id = professional_branding.professional_id
    )
  );

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_professional_branding_updated_at ON professional_branding;
CREATE TRIGGER update_professional_branding_updated_at
  BEFORE UPDATE ON professional_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRAÇÃO: Remover tabela antiga branding_configs se existir
-- =====================================================
-- DROP TABLE IF EXISTS branding_configs CASCADE;

COMMENT ON TABLE professional_branding IS 'Configurações de personalização de marca (white-label) para cada profissional';
COMMENT ON COLUMN professional_branding.professional_id IS 'Referência ao profissional (auth.users)';
COMMENT ON COLUMN professional_branding.logo_url IS 'URL do logo personalizado (pode ser do Supabase Storage)';
COMMENT ON COLUMN professional_branding.login_stats IS 'Array JSON com estatísticas exibidas na tela de login';
COMMENT ON COLUMN professional_branding.footer_faq_items IS 'Array JSON com perguntas frequentes do footer';
COMMENT ON COLUMN professional_branding.footer_links IS 'Array JSON com links do footer';
