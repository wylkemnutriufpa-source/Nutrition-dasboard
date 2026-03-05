-- ============================================
-- HARDENING V2 - Blindagem Completa
-- Todos os comandos são IDEMPOTENTES
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1) TRIGGER updated_at UNIVERSAL
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a automation_rules
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_automation_rules_updated_at'
  ) THEN
    CREATE TRIGGER trg_automation_rules_updated_at
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Aplicar a automation_logs (se tiver updated_at)
-- automation_logs geralmente não tem updated_at, então pula

-- Aplicar a outras tabelas com updated_at (adicione conforme necessário)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recipes_updated_at') THEN
      CREATE TRIGGER trg_recipes_updated_at
      BEFORE UPDATE ON recipes
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_meal_plans_updated_at') THEN
      CREATE TRIGGER trg_meal_plans_updated_at
      BEFORE UPDATE ON meal_plans
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tips' AND column_name = 'updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tips_updated_at') THEN
      CREATE TRIGGER trg_tips_updated_at
      BEFORE UPDATE ON tips
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplements' AND column_name = 'updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_supplements_updated_at') THEN
      CREATE TRIGGER trg_supplements_updated_at
      BEFORE UPDATE ON supplements
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'physical_assessments' AND column_name = 'updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_physical_assessments_updated_at') THEN
      CREATE TRIGGER trg_physical_assessments_updated_at
      BEFORE UPDATE ON physical_assessments
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;

-- ============================================
-- 2) ÍNDICE OTIMIZADO PARA COOLDOWN
-- ============================================

CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_patient_created
ON automation_logs (rule_id, patient_id, created_at DESC);

-- ============================================
-- 3) EVOLUÇÃO: automation_rules - config JSONB + schedule
-- ============================================

-- Adicionar coluna config JSONB
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_rules' AND column_name = 'config'
  ) THEN
    ALTER TABLE automation_rules ADD COLUMN config jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Adicionar schedule_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_rules' AND column_name = 'schedule_at'
  ) THEN
    ALTER TABLE automation_rules ADD COLUMN schedule_at timestamptz;
  END IF;
END $$;

-- Adicionar last_evaluated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_rules' AND column_name = 'last_evaluated_at'
  ) THEN
    ALTER TABLE automation_rules ADD COLUMN last_evaluated_at timestamptz;
  END IF;
END $$;

-- ============================================
-- 4) FUNÇÃO RPC: CHECK COOLDOWN NO BANCO
-- ============================================

CREATE OR REPLACE FUNCTION public.check_automation_cooldown(
  p_rule_id uuid,
  p_patient_id uuid,
  p_cooldown_hours integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_exec timestamptz;
BEGIN
  SELECT created_at INTO last_exec
  FROM automation_logs
  WHERE rule_id = p_rule_id
    AND patient_id = p_patient_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_exec IS NULL THEN
    RETURN true;  -- Nunca executou, pode executar
  END IF;

  RETURN (now() - last_exec) >= (p_cooldown_hours || ' hours')::interval;
END;
$$;

-- ============================================
-- 5) GARANTIR tabela platform_features existe
-- ============================================

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
  impact_level text DEFAULT 'basic',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_features_category ON platform_features(category);
CREATE INDEX IF NOT EXISTS idx_platform_features_active ON platform_features(is_active);

-- Garantir colunas extras existem (tabela pode já existir sem elas)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_features' AND column_name = 'impact_level'
  ) THEN
    ALTER TABLE platform_features ADD COLUMN impact_level text DEFAULT 'basic';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_features' AND column_name = 'icon_name'
  ) THEN
    ALTER TABLE platform_features ADD COLUMN icon_name text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_features' AND column_name = 'route'
  ) THEN
    ALTER TABLE platform_features ADD COLUMN route text DEFAULT '';
  END IF;
END $$;

-- RLS para leitura pública
ALTER TABLE platform_features ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "platform_features_read" ON platform_features;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "platform_features_read" ON platform_features
  FOR SELECT USING (true);

-- ============================================
-- 6) SEED: Funcionalidades (UPSERT por slug)
-- ============================================

INSERT INTO platform_features (name, slug, description, category, is_ai, is_active, impact_level, route) VALUES
  ('Lista de Pacientes', 'view_patients_list', 'Visualizar e filtrar todos os pacientes cadastrados', 'Pacientes', false, true, 'basic', '/professional/patients'),
  ('Cadastrar Paciente', 'create_patient', 'Adicionar novo paciente à plataforma', 'Pacientes', false, true, 'high', ''),
  ('Perfil do Paciente', 'view_patient_profile', 'Acessar perfil completo com todas as informações', 'Pacientes', false, true, 'basic', ''),
  ('Configurar Menu do Paciente', 'configure_patient_menu', 'Personalizar funcionalidades visíveis', 'Pacientes', false, true, 'medium', ''),
  ('Preencher Anamnese', 'create_anamnesis', 'Criar ou atualizar anamnese completa', 'Pacientes', false, true, 'high', ''),
  ('Criar Plano Alimentar', 'create_meal_plan', 'Montar plano personalizado com refeições e macros', 'Nutrição', false, true, 'high', ''),
  ('Editar Plano Alimentar', 'edit_meal_plan', 'Modificar plano alimentar existente', 'Nutrição', false, true, 'medium', '/professional/meal-plan-editor'),
  ('Rascunho de Plano', 'create_draft_plan', 'Salvar rascunho para revisão', 'Nutrição', false, true, 'medium', ''),
  ('Prescrever Suplementação', 'create_supplement', 'Criar prescrição de suplementos', 'Nutrição', false, true, 'medium', ''),
  ('Acessar Templates Globais', 'view_templates', 'Visualizar e gerenciar templates reutilizáveis', 'Nutrição', false, true, 'medium', '/professional/templates'),
  ('Criar Template Global', 'create_template', 'Criar template reutilizável', 'Nutrição', false, true, 'strategic', ''),
  ('Análise de Pratos por IA', 'use_meal_photo_analysis', 'Analisar qualidade e macros por foto', 'Inteligência Artificial', true, true, 'strategic', ''),
  ('Análise Corporal por IA', 'use_body_analysis', 'Análise de composição corporal por fotos', 'Inteligência Artificial', true, true, 'strategic', ''),
  ('Recomendações Inteligentes', 'view_smart_recommendations', 'Recomendações automáticas da IA', 'Inteligência Artificial', true, true, 'strategic', '/professional/dashboard'),
  ('Ranking de Risco', 'view_risk_ranking', 'Ranking de pacientes por score de risco', 'Inteligência Artificial', true, true, 'high', '/professional/dashboard'),
  ('Visualizar Feedbacks', 'view_feedbacks', 'Acessar feedbacks dos pacientes', 'Comunicação', false, true, 'basic', '/professional/feedbacks'),
  ('Responder Feedback', 'reply_feedback', 'Enviar resposta a feedback', 'Comunicação', false, true, 'high', ''),
  ('Responder SOS', 'respond_sos', 'Atender emergência nutricional', 'Comunicação', false, true, 'strategic', ''),
  ('Enviar Mensagem', 'send_patient_message', 'Enviar mensagem direta', 'Comunicação', false, true, 'medium', ''),
  ('Criar Lembrete de Feedback', 'create_feedback_reminder', 'Agendar lembrete de feedback', 'Comunicação', false, true, 'medium', ''),
  ('Acessar Dashboard', 'view_dashboard', 'Central de Comando com métricas', 'Monitoramento', true, true, 'basic', '/professional/dashboard'),
  ('Gráfico de Engajamento', 'view_engagement_chart', 'Gráfico de adesão ao checklist', 'Monitoramento', false, true, 'medium', '/professional/dashboard'),
  ('Avaliação Física', 'create_physical_assessment', 'Registrar medidas antropométricas', 'Monitoramento', false, true, 'high', ''),
  ('Criar Checklist', 'create_checklist_template', 'Criar template de checklist diário', 'Monitoramento', false, true, 'high', ''),
  ('Acessar Agenda', 'view_agenda', 'Visualizar agenda de consultas', 'Gestão', false, true, 'basic', '/professional/agenda'),
  ('Criar Evento na Agenda', 'create_calendar_event', 'Agendar consulta ou compromisso', 'Gestão', false, true, 'medium', ''),
  ('Acessar Financeiro', 'view_financeiro', 'Controle financeiro', 'Gestão', false, true, 'basic', '/professional/financeiro'),
  ('Registrar Pagamento', 'create_financial_record', 'Criar registro financeiro', 'Gestão', false, true, 'medium', ''),
  ('Personalizar Marca', 'configure_branding', 'Configurar logo e identidade visual', 'Gestão', false, true, 'medium', '/professional/branding'),
  ('Configurações', 'view_settings', 'Configurações da conta', 'Gestão', false, true, 'basic', '/professional/settings'),
  ('Banco de Alimentos', 'view_food_database', 'Banco de informações nutricionais', 'Ferramentas', false, true, 'basic', '/professional/food-database'),
  ('Cadastrar Alimento', 'create_custom_food', 'Adicionar alimento customizado', 'Ferramentas', false, true, 'medium', ''),
  ('Biblioteca de Receitas', 'view_recipes', 'Acessar receitas nutricionais', 'Ferramentas', false, true, 'basic', '/professional/receitas'),
  ('Criar Receita', 'create_recipe', 'Adicionar receita com ingredientes', 'Ferramentas', false, true, 'medium', ''),
  ('Criar Dica Personalizada', 'create_personalized_tip', 'Dica de nutrição personalizada', 'Ferramentas', false, true, 'medium', ''),
  ('Central de Recursos', 'view_platform_guide', 'Tutorial e guia da plataforma', 'Ferramentas', false, true, 'basic', '/professional/guide'),
  ('Central de Automações', 'view_automations', 'Gerenciar automações inteligentes', 'Inteligência Artificial', true, true, 'strategic', '/professional/automations'),
  ('Criar Automação', 'create_automation', 'Criar regra de automação', 'Inteligência Artificial', true, true, 'strategic', ''),
  ('Relatório Semanal', 'view_weekly_report', 'Relatório automático semanal', 'Inteligência Artificial', true, true, 'strategic', '/professional/reports'),
  ('Ativar Template de Automação', 'activate_automation_template', 'Ativar automação pré-configurada', 'Inteligência Artificial', true, true, 'high', ''),
  ('Plano Programado', 'scheduled_plan', 'Automação de troca de plano alimentar', 'Inteligência Artificial', true, true, 'strategic', '/professional/automations')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_ai = EXCLUDED.is_ai,
  is_active = EXCLUDED.is_active,
  impact_level = EXCLUDED.impact_level,
  route = EXCLUDED.route;

-- ============================================
-- 7) GARANTIR constraint para recipe_patient_visibility
-- ============================================

DO $$ BEGIN
  ALTER TABLE recipe_patient_visibility
  ADD CONSTRAINT recipe_patient_visibility_recipe_patient_unique
  UNIQUE (recipe_id, patient_id);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- FIM DO HARDENING V2
-- ============================================
