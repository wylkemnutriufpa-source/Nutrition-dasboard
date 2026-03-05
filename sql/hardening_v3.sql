-- ============================================
-- HARDENING V3 - Feature Flags + Plans + Multi-Planos
-- Todos os comandos são IDEMPOTENTES
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1) EVOLUIR platform_features (Feature Flags)
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_features' AND column_name = 'is_pro') THEN
    ALTER TABLE platform_features ADD COLUMN is_pro boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_features' AND column_name = 'is_visible') THEN
    ALTER TABLE platform_features ADD COLUMN is_visible boolean DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_features' AND column_name = 'coming_soon') THEN
    ALTER TABLE platform_features ADD COLUMN coming_soon boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_features' AND column_name = 'enabled_for_patient') THEN
    ALTER TABLE platform_features ADD COLUMN enabled_for_patient boolean DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_features' AND column_name = 'enabled_for_professional') THEN
    ALTER TABLE platform_features ADD COLUMN enabled_for_professional boolean DEFAULT true;
  END IF;
END $$;

-- ============================================
-- 2) PLANO DO PROFISSIONAL em profiles
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'plan_type') THEN
    ALTER TABLE profiles ADD COLUMN plan_type text NOT NULL DEFAULT 'basic'
      CHECK (plan_type IN ('basic', 'pro', 'trial'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'plan_expires_at') THEN
    ALTER TABLE profiles ADD COLUMN plan_expires_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'plan_started_at') THEN
    ALTER TABLE profiles ADD COLUMN plan_started_at timestamptz;
  END IF;
END $$;

-- ============================================
-- 3) MULTI-PLANOS em meal_plans
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'available_at') THEN
    ALTER TABLE meal_plans ADD COLUMN available_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'plan_status') THEN
    ALTER TABLE meal_plans ADD COLUMN plan_status text DEFAULT 'active'
      CHECK (plan_status IN ('draft', 'scheduled', 'active', 'completed'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'automation_rule_id') THEN
    ALTER TABLE meal_plans ADD COLUMN automation_rule_id uuid REFERENCES automation_rules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 4) RLS: Somente admin edita platform_features
-- ============================================

-- Leitura pública (já existe mas garantir)
DO $$ BEGIN
  DROP POLICY IF EXISTS "platform_features_read" ON platform_features;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "platform_features_read" ON platform_features
  FOR SELECT USING (true);

-- Escrita somente admin
DO $$ BEGIN
  DROP POLICY IF EXISTS "platform_features_admin_write" ON platform_features;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY "platform_features_admin_write" ON platform_features
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 5) ATUALIZAR SEED com flags PRO/IA corretas
-- ============================================

UPDATE platform_features SET is_pro = true WHERE slug IN (
  'use_meal_photo_analysis', 'use_body_analysis', 'scheduled_plan',
  'view_smart_recommendations', 'view_risk_ranking', 'view_weekly_report',
  'create_automation', 'activate_automation_template'
);

UPDATE platform_features SET is_pro = false WHERE slug NOT IN (
  'use_meal_photo_analysis', 'use_body_analysis', 'scheduled_plan',
  'view_smart_recommendations', 'view_risk_ranking', 'view_weekly_report',
  'create_automation', 'activate_automation_template'
);

-- Marcar features de IA
UPDATE platform_features SET is_ai = true WHERE slug IN (
  'use_meal_photo_analysis', 'use_body_analysis', 'view_smart_recommendations',
  'view_risk_ranking', 'view_automations', 'create_automation',
  'view_weekly_report', 'activate_automation_template', 'scheduled_plan',
  'view_dashboard'
);

-- Garantir defaults corretos
UPDATE platform_features SET
  is_visible = COALESCE(is_visible, true),
  coming_soon = COALESCE(coming_soon, false),
  enabled_for_patient = COALESCE(enabled_for_patient, true),
  enabled_for_professional = COALESCE(enabled_for_professional, true)
WHERE is_visible IS NULL OR coming_soon IS NULL OR enabled_for_patient IS NULL OR enabled_for_professional IS NULL;

-- Inserir feature nova: Gerador de Receitas IA
INSERT INTO platform_features (name, slug, description, category, is_ai, is_active, is_pro, impact_level, route, coming_soon)
VALUES ('Gerador de Receitas IA', 'ai_recipe_generator', 'Gera receitas compatíveis com perfil e restrições do paciente', 'Inteligência Artificial', true, true, true, 'strategic', '', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category,
  is_ai = EXCLUDED.is_ai, is_pro = EXCLUDED.is_pro, impact_level = EXCLUDED.impact_level;

-- ============================================
-- FIM DO HARDENING V3
-- ============================================
