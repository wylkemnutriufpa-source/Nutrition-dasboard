-- =============================================
-- TABELA: professional_feature_usage
-- Sistema de Gamificação - Jornada Profissional
-- =============================================

CREATE TABLE IF NOT EXISTS professional_feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  first_used_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  usage_count int DEFAULT 1,
  
  -- Constraint única: um profissional + uma feature
  CONSTRAINT unique_professional_feature UNIQUE (professional_id, feature_key)
);

-- Index para queries por profissional
CREATE INDEX IF NOT EXISTS idx_pfu_professional_id 
  ON professional_feature_usage(professional_id);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE professional_feature_usage ENABLE ROW LEVEL SECURITY;

-- Profissional vê e gerencia apenas seus registros
CREATE POLICY "professional_own_usage" ON professional_feature_usage
  FOR ALL
  USING (auth.uid() = professional_id)
  WITH CHECK (auth.uid() = professional_id);

-- Admin pode ver todos (para ranking)
CREATE POLICY "admin_view_all_usage" ON professional_feature_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );


-- =============================================
-- TABELA: professional_monthly_goals
-- Metas mensais de ativação de funcionalidades
-- =============================================

CREATE TABLE IF NOT EXISTS professional_monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_reference text NOT NULL, -- formato: '2025-07'
  target_features_to_activate int DEFAULT 5,
  activated_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_professional_month UNIQUE (professional_id, month_reference)
);

CREATE INDEX IF NOT EXISTS idx_pmg_professional_id 
  ON professional_monthly_goals(professional_id);

ALTER TABLE professional_monthly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professional_own_goals" ON professional_monthly_goals
  FOR ALL
  USING (auth.uid() = professional_id)
  WITH CHECK (auth.uid() = professional_id);
