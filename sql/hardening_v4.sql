-- ============================================
-- HARDENING V4 - Error Logs + AutoDiagnóstico
-- ============================================

CREATE TABLE IF NOT EXISTS app_error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid,
  role text,
  route text,
  message text NOT NULL,
  stack text,
  severity text DEFAULT 'error' CHECK (severity IN ('info','warn','error','critical')),
  user_agent text,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON app_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON app_error_logs(severity);

ALTER TABLE app_error_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS app_error_logs_insert ON app_error_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY app_error_logs_insert ON app_error_logs
  FOR INSERT WITH CHECK (true);

DO $$ BEGIN
  DROP POLICY IF EXISTS app_error_logs_admin_read ON app_error_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY app_error_logs_admin_read ON app_error_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- FIM V4
