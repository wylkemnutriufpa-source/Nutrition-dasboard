-- ============================================
-- AUTOMATION RULES + LOGS
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================

-- Tabela de regras de automação
CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  trigger_type text NOT NULL,       -- 'inactive_days', 'low_checklist', 'plan_expiring', 'new_patient', 'high_risk', 'no_feedback'
  trigger_value integer DEFAULT 3,  -- valor do gatilho (dias, %, score etc)
  action_type text NOT NULL,        -- 'notify_patient', 'notify_professional', 'create_reminder', 'assign_templates'
  action_message text DEFAULT '',   -- mensagem customizada
  is_active boolean DEFAULT true,
  cooldown_hours integer DEFAULT 24,
  execution_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de logs de execução
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_automation_rules_prof ON automation_rules(professional_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_prof ON automation_logs(professional_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_patient ON automation_logs(rule_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON automation_logs(created_at DESC);

-- RLS
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_rules_all" ON automation_rules;
CREATE POLICY "automation_rules_all" ON automation_rules
  FOR ALL USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "automation_logs_all" ON automation_logs;
CREATE POLICY "automation_logs_all" ON automation_logs
  FOR ALL USING (professional_id = auth.uid());
