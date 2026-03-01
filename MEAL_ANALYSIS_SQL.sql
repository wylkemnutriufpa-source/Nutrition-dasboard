-- ============================================================
-- FITJOURNEY: Meal Photo Analysis - SQL Setup
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1) TABELA meal_analyses
CREATE TABLE IF NOT EXISTS meal_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  professional_id uuid NULL,
  image_path text NOT NULL,
  image_url text NULL,
  status text NOT NULL DEFAULT 'processing',
  detected_foods jsonb NOT NULL DEFAULT '[]'::jsonb,
  portions jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_calories int NULL,
  protein_g numeric NULL,
  carbs_g numeric NULL,
  fat_g numeric NULL,
  fiber_g numeric NULL,
  quality_score int NULL,
  adherence_score int NULL,
  flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_feedback text NULL,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) INDEXES
CREATE INDEX IF NOT EXISTS idx_meal_analyses_patient_date 
  ON meal_analyses(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meal_analyses_professional_date 
  ON meal_analyses(professional_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meal_analyses_status 
  ON meal_analyses(status);

-- 3) TRIGGER para updated_at
CREATE OR REPLACE FUNCTION update_meal_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meal_analyses_updated_at ON meal_analyses;
CREATE TRIGGER trigger_meal_analyses_updated_at
  BEFORE UPDATE ON meal_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_analyses_updated_at();

-- 4) RLS (Row Level Security)
ALTER TABLE meal_analyses ENABLE ROW LEVEL SECURITY;

-- Paciente: INSERT/SELECT/UPDATE apenas seus próprios registros
CREATE POLICY "Patients can insert own meal analyses"
  ON meal_analyses FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can view own meal analyses"
  ON meal_analyses FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR
    professional_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM patient_profiles pp 
      WHERE pp.patient_id = meal_analyses.patient_id 
      AND pp.professional_id = auth.uid()
    )
  );

CREATE POLICY "Patients can update own meal analyses"
  ON meal_analyses FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- 5) STORAGE BUCKET (executar via Dashboard > Storage > New Bucket)
-- Nome: meal-photos
-- Private: sim
-- Tamanho máximo: 10MB
-- Tipos permitidos: image/jpeg, image/png, image/webp

-- Se quiser criar via SQL (pode não funcionar em todos os planos):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', false);

-- 6) STORAGE POLICIES (executar depois de criar o bucket)
-- No Dashboard: Storage > meal-photos > Policies

-- Policy: Paciente upload próprios arquivos
-- CREATE POLICY "Patients can upload own meal photos"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Paciente ler próprios arquivos
-- CREATE POLICY "Patients can view own meal photos"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Profissional ler fotos dos pacientes
-- CREATE POLICY "Professionals can view patient meal photos"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (
--     bucket_id = 'meal-photos' 
--     AND EXISTS (
--       SELECT 1 FROM patient_profiles pp 
--       WHERE pp.patient_id::text = (storage.foldername(name))[1]
--       AND pp.professional_id = auth.uid()
--     )
--   );
