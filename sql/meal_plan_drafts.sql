-- ==========================================
-- Meal Plan Drafts Table
-- ==========================================
-- This table stores pre-plan drafts generated automatically
-- from anamnesis completion. The IA PLAN screen will load
-- these drafts and allow professionals to review and publish.

CREATE TABLE IF NOT EXISTS public.meal_plan_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  source_event_id uuid,
  template_key text NOT NULL,
  anamnesis_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_patient 
  ON public.meal_plan_drafts (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_status 
  ON public.meal_plan_drafts (status, org_id);

-- RLS policies
ALTER TABLE public.meal_plan_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: service_role can do anything
CREATE POLICY IF NOT EXISTS service_role_all_meal_plan_drafts
  ON public.meal_plan_drafts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: authenticated users can view their org's drafts
CREATE POLICY IF NOT EXISTS authenticated_view_meal_plan_drafts
  ON public.meal_plan_drafts
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT professional_id FROM public.patient_profiles WHERE patient_id = auth.uid()
    )
  );

-- Policy: authenticated can update status
CREATE POLICY IF NOT EXISTS authenticated_update_meal_plan_drafts
  ON public.meal_plan_drafts
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.meal_plan_drafts IS 'Pre-plan drafts generated from anamnesis, to be reviewed in IA PLAN screen';
