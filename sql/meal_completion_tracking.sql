-- ==========================================
-- Meal Completion Tracking Schema
-- ==========================================
-- This extends the checklist system to track meal completions
-- and power adherence analytics + automation

-- Table: checklist_entries (if not exists)
-- Used to track all checklist items including meals
CREATE TABLE IF NOT EXISTS public.checklist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  date date NOT NULL,
  task_type text NOT NULL,  -- 'meal', 'exercise', 'medication', etc.
  task_key text NOT NULL,    -- 'breakfast', 'lunch', 'dinner', 'snack', or meal_id
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'completed', 'skipped'
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Logical key: one entry per patient/date/task combination
  UNIQUE (patient_id, date, task_type, task_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_entries_patient_date 
  ON public.checklist_entries (patient_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_entries_status 
  ON public.checklist_entries (status, task_type);

-- Table: patient_adherence_stats (new - for gamification foundation)
CREATE TABLE IF NOT EXISTS public.patient_adherence_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE,
  current_streak_days int DEFAULT 0,
  longest_streak_days int DEFAULT 0,
  total_meals_completed int DEFAULT 0,
  total_meals_planned int DEFAULT 0,
  last_updated_date date,
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT fk_patient FOREIGN KEY (patient_id) 
    REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_adherence_stats_patient 
  ON public.patient_adherence_stats (patient_id);

-- RLS Policies
ALTER TABLE public.checklist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_adherence_stats ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY IF NOT EXISTS service_role_all_checklist_entries
  ON public.checklist_entries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS service_role_all_adherence_stats
  ON public.patient_adherence_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Patients can view/update their own entries
CREATE POLICY IF NOT EXISTS patient_own_checklist_entries
  ON public.checklist_entries FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY IF NOT EXISTS patient_own_adherence_stats
  ON public.patient_adherence_stats FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Professionals can view their patients' entries
CREATE POLICY IF NOT EXISTS professional_view_patient_checklist
  ON public.checklist_entries FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id FROM public.patient_profiles 
      WHERE professional_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS professional_view_patient_stats
  ON public.patient_adherence_stats FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id FROM public.patient_profiles 
      WHERE professional_id = auth.uid()
    )
  );

COMMENT ON TABLE public.checklist_entries IS 'Tracks completion of all checklist items including meals';
COMMENT ON TABLE public.patient_adherence_stats IS 'Stores patient adherence metrics and streaks for gamification';
