-- ============================================================
-- AUTOMATION ENGINE TABLES
-- Run this in Supabase Dashboard → SQL Editor
-- These are NEW tables – do NOT use the legacy automation_rules
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. automation_engine_events
--    Source of truth for every trigger that enters the engine
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_engine_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        NOT NULL,
  patient_id      uuid,
  actor_user_id   uuid,
  type            text        NOT NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','processing','done','failed','skipped')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  error           text
);

CREATE INDEX IF NOT EXISTS idx_aee_status_created
  ON public.automation_engine_events (status, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_aee_org_type
  ON public.automation_engine_events (org_id, type);

-- ─────────────────────────────────────────────────────────────
-- 2. automation_engine_rules
--    Rules evaluated per event
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_engine_rules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        NOT NULL,
  name            text        NOT NULL,
  enabled         boolean     NOT NULL DEFAULT true,
  trigger_type    text        NOT NULL,
  conditions      jsonb       NOT NULL DEFAULT '{}',
  actions         jsonb       NOT NULL DEFAULT '[]',
  cooldown_hours  integer     NOT NULL DEFAULT 24,
  priority        integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aer_org_trigger
  ON public.automation_engine_rules (org_id, trigger_type)
  WHERE enabled = true;

-- ─────────────────────────────────────────────────────────────
-- 3. automation_engine_runs
--    Audit log: one row per (event × rule) evaluation
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_engine_runs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL,
  event_id    uuid        NOT NULL REFERENCES public.automation_engine_events(id) ON DELETE CASCADE,
  rule_id     uuid        NOT NULL REFERENCES public.automation_engine_rules(id)  ON DELETE CASCADE,
  status      text        NOT NULL
              CHECK (status IN ('success','failed','skipped','cooldown')),
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  output      jsonb,
  error       text
);

CREATE INDEX IF NOT EXISTS idx_arun_event   ON public.automation_engine_runs (event_id);
CREATE INDEX IF NOT EXISTS idx_arun_rule    ON public.automation_engine_runs (rule_id);
CREATE INDEX IF NOT EXISTS idx_arun_created ON public.automation_engine_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_arun_cooldown
  ON public.automation_engine_runs (org_id, rule_id, status, finished_at DESC)
  WHERE status = 'success';

-- ─────────────────────────────────────────────────────────────
-- 4. notifications   (if not already present)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL,
  user_id    uuid        NOT NULL,
  title      text        NOT NULL,
  body       text,
  meta       jsonb       DEFAULT '{}',
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications (user_id, read, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 5. tasks   (if not already present)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid        NOT NULL,
  patient_id           uuid        NOT NULL,
  assigned_to_user_id  uuid,
  type                 text        NOT NULL DEFAULT 'general',
  title                text        NOT NULL,
  details              text,
  due_at               timestamptz,
  status               text        NOT NULL DEFAULT 'open'
                                   CHECK (status IN ('open','in_progress','done','cancelled')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_patient ON public.tasks (patient_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks (assigned_to_user_id, status);

-- ─────────────────────────────────────────────────────────────
-- RLS – all tables bypass via service_role key from backend
--       frontend users see only their own org rows
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.automation_engine_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_engine_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_engine_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                    ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (backend worker)
CREATE POLICY "service_role_all_aee"   ON public.automation_engine_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_aer"   ON public.automation_engine_rules  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_arun"  ON public.automation_engine_runs   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_notif" ON public.notifications            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_tasks" ON public.tasks                    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to read their own org
CREATE POLICY "anon_read_rules" ON public.automation_engine_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "anon_read_notif" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "anon_read_tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR assigned_to_user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Sample rule (inactive patient trigger) – optional seed
-- ─────────────────────────────────────────────────────────────
/*
INSERT INTO public.automation_engine_rules (org_id, name, trigger_type, conditions, actions, cooldown_hours, priority)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Paciente inativo há 5+ dias',
  'patient.inactive',
  '{
    "and": [
      { "payload.inactive_days": { "gte": 5 } },
      { "payload.patient_status": { "eq": "active" } }
    ]
  }',
  '[
    {
      "type": "notify_professional",
      "user_id": "{professional_id}",
      "title": "Paciente inativo",
      "body": "O paciente ficou {inactive_days} dias sem registrar atividade.",
      "meta": { "source": "automation_engine" }
    }
  ]',
  48,
  10
);
*/
