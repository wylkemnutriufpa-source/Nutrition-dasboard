-- ============================================
-- FITJOURNEY - SQL COMPLETO DE SETUP
-- Execute no Supabase Dashboard → SQL Editor
-- Idempotente: pode rodar múltiplas vezes
-- ============================================

-- 1) AUTOMAÇÃO: Regras
CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  trigger_type text NOT NULL,
  trigger_value integer DEFAULT 3,
  action_type text NOT NULL,
  action_message text DEFAULT '',
  is_active boolean DEFAULT true,
  cooldown_hours integer DEFAULT 24,
  execution_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) AUTOMAÇÃO: Logs
CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id uuid REFERENCES automation_rules(id) ON DELETE CASCADE,
  rule_name text,
  professional_id uuid NOT NULL,
  patient_id uuid,
  patient_name text,
  trigger_type text,
  action_type text,
  action_detail text,
  created_at timestamptz DEFAULT now()
);

-- 3) PLATFORM FEATURES: Catálogo dinâmico
CREATE TABLE IF NOT EXISTS platform_features (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  is_ai boolean DEFAULT false,
  is_active boolean DEFAULT true,
  icon_name text DEFAULT '',
  route text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 4) Índices
CREATE INDEX IF NOT EXISTS idx_automation_rules_prof ON automation_rules(professional_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_prof ON automation_logs(professional_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_features_category ON platform_features(category);
CREATE INDEX IF NOT EXISTS idx_platform_features_active ON platform_features(is_active);

-- 5) RLS
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_features ENABLE ROW LEVEL SECURITY;

-- Policies (drop if exist first)
DO $$ BEGIN
  DROP POLICY IF EXISTS "automation_rules_all" ON automation_rules;
  DROP POLICY IF EXISTS "automation_logs_all" ON automation_logs;
  DROP POLICY IF EXISTS "platform_features_read" ON platform_features;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "automation_rules_all" ON automation_rules
  FOR ALL USING (professional_id = auth.uid());

CREATE POLICY "automation_logs_all" ON automation_logs
  FOR ALL USING (professional_id = auth.uid());

CREATE POLICY "platform_features_read" ON platform_features
  FOR SELECT USING (true);

-- 6) Constraint para upsert de receitas (ignora se já existe)
DO $$ BEGIN
  ALTER TABLE recipe_patient_visibility
  ADD CONSTRAINT recipe_patient_visibility_recipe_patient_unique
  UNIQUE (recipe_id, patient_id);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 7) SEED: Funcionalidades da plataforma
INSERT INTO platform_features (name, slug, description, category, is_ai, is_active, route) VALUES
  ('Lista de Pacientes', 'view_patients_list', 'Visualizar e filtrar todos os pacientes', 'Pacientes', false, true, '/professional/patients'),
  ('Cadastrar Paciente', 'create_patient', 'Adicionar novo paciente', 'Pacientes', false, true, '/professional/patients'),
  ('Perfil do Paciente', 'view_patient_profile', 'Acessar perfil completo', 'Pacientes', false, true, ''),
  ('Configurar Menu do Paciente', 'configure_patient_menu', 'Personalizar funcionalidades por paciente', 'Pacientes', false, true, ''),
  ('Preencher Anamnese', 'create_anamnesis', 'Criar anamnese completa', 'Pacientes', false, true, ''),
  ('Criar Plano Alimentar', 'create_meal_plan', 'Montar plano alimentar completo', 'Nutrição', false, true, ''),
  ('Criar Receita', 'create_recipe', 'Adicionar receitas ao banco', 'Nutrição', false, true, '/professional/recipes'),
  ('Banco de Alimentos', 'view_food_database', 'Consultar banco de alimentos', 'Nutrição', false, true, '/professional/food-database'),
  ('Visibilidade de Receitas', 'manage_recipe_visibility', 'Controlar acesso dos pacientes', 'Nutrição', false, true, '/professional/recipes'),
  ('Calculadora de Calorias', 'use_calorie_calculator', 'Calcular necessidades calóricas', 'Ferramentas', false, true, '/professional/calorie-calculator'),
  ('Calculadora de Água', 'use_water_calculator', 'Calcular necessidade hídrica', 'Ferramentas', false, true, '/professional/water-calculator'),
  ('Calculadora de Peso', 'use_weight_calculator', 'Estimar peso ideal', 'Ferramentas', false, true, '/professional/weight-calculator'),
  ('Suplementos', 'manage_supplements', 'Gerenciar suplementos', 'Nutrição', false, true, '/professional/supplements'),
  ('Análise Corporal', 'create_body_analysis', 'Registrar medidas e composição corporal', 'Monitoramento', false, true, ''),
  ('Avaliação Física', 'create_physical_assessment', 'Criar avaliação física detalhada', 'Monitoramento', false, true, ''),
  ('Dashboard Profissional', 'view_dashboard', 'Central de comando inteligente', 'Gestão', true, true, '/professional/dashboard'),
  ('Agenda/Consultas', 'view_agenda', 'Gerenciar agendamentos e lembretes', 'Gestão', false, true, '/professional/agenda'),
  ('Templates Globais', 'manage_templates', 'Criar e gerenciar templates', 'Gestão', false, true, '/professional/templates'),
  ('Feedbacks', 'view_feedbacks', 'Gerenciar feedbacks dos pacientes', 'Comunicação', false, true, '/professional/feedbacks'),
  ('Mensagens', 'send_patient_message', 'Enviar mensagens aos pacientes', 'Comunicação', false, true, ''),
  ('Notificações', 'view_notifications', 'Central de notificações', 'Comunicação', false, true, ''),
  ('Financeiro', 'view_financeiro', 'Gestão financeira', 'Gestão', false, true, '/professional/financeiro'),
  ('Personalização/Branding', 'customize_branding', 'Personalizar marca e cores', 'Gestão', false, true, '/professional/branding'),
  ('Configurações', 'view_settings', 'Configurações gerais da conta', 'Gestão', false, true, '/professional/settings'),
  ('Risk Score Engine', 'view_risk_ranking', 'Motor de risco clínico dos pacientes', 'IA', true, true, '/professional/dashboard'),
  ('Dicas Inteligentes por IA', 'view_dynamic_tips', 'Dicas personalizadas geradas por IA', 'IA', true, true, ''),
  ('Análise de Prato por IA', 'analyze_meal_photo', 'Análise nutricional de fotos', 'IA', true, true, '/professional/meal-analysis'),
  ('Recomendações Inteligentes', 'view_smart_recommendations', 'Sugestões automáticas do dashboard', 'IA', true, true, '/professional/dashboard'),
  ('Gráfico de Engajamento', 'view_engagement_chart', 'Visualizar evolução do engajamento', 'Monitoramento', false, true, '/professional/dashboard'),
  ('Central de Automações', 'view_automations', 'Regras automáticas de acompanhamento', 'IA', true, true, '/professional/automations'),
  ('Criar Automação', 'create_automation', 'Configurar nova regra de automação', 'IA', true, true, '/professional/automations'),
  ('Relatórios Inteligentes', 'view_weekly_report', 'Relatórios dinâmicos por período', 'IA', true, true, '/professional/reports'),
  ('Minha Jornada', 'view_platform_guide', 'Central de recursos e gamificação', 'Gestão', false, true, '/professional/guide'),
  ('Projeto Biquíni Branco', 'view_projeto', 'Programa de transformação', 'Gestão', false, true, '/professional/projeto'),
  ('Checklist do Paciente', 'manage_checklists', 'Gerenciar checklists diários', 'Monitoramento', false, true, ''),
  ('SOS/Emergência', 'view_sos', 'Monitorar emergências dos pacientes', 'Comunicação', false, true, '/professional/dashboard'),
  ('Onboarding Automático', 'activate_automation_template', 'Onboarding automático de novos pacientes', 'IA', true, true, '/professional/automations')
ON CONFLICT (slug) DO NOTHING;
