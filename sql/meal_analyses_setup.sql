-- ==================================================================================
-- MEAL ANALYSES - Tabela + RLS + Storage
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ==================================================================================

-- 1) Criar tabela meal_analyses
CREATE TABLE IF NOT EXISTS public.meal_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Imagem
  image_path text NOT NULL,
  image_url text NULL,
  
  -- Status
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'done', 'failed')),
  
  -- Resultado da IA
  detected_foods jsonb NOT NULL DEFAULT '[]'::jsonb,
  portions jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_calories int NULL,
  protein_g numeric NULL,
  carbs_g numeric NULL,
  fat_g numeric NULL,
  fiber_g numeric NULL,
  
  -- Scores
  quality_score int NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  adherence_score int NULL CHECK (adherence_score >= 0 AND adherence_score <= 100),
  
  -- Flags e Feedback
  flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_feedback text NULL,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Índices para performance
CREATE INDEX IF NOT EXISTS idx_meal_analyses_patient_id ON public.meal_analyses(patient_id);
CREATE INDEX IF NOT EXISTS idx_meal_analyses_patient_created ON public.meal_analyses(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_analyses_status ON public.meal_analyses(status);

-- 3) Trigger para updated_at
CREATE OR REPLACE FUNCTION update_meal_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meal_analyses_updated_at ON public.meal_analyses;
CREATE TRIGGER trigger_meal_analyses_updated_at
  BEFORE UPDATE ON public.meal_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_analyses_updated_at();

-- ==================================================================================
-- RLS POLICIES
-- ==================================================================================

ALTER TABLE public.meal_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Paciente pode inserir suas próprias análises
DROP POLICY IF EXISTS "meal_analyses_patient_insert" ON public.meal_analyses;
CREATE POLICY "meal_analyses_patient_insert" ON public.meal_analyses
  FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- Policy: Paciente pode ver suas próprias análises
DROP POLICY IF EXISTS "meal_analyses_patient_select" ON public.meal_analyses;
CREATE POLICY "meal_analyses_patient_select" ON public.meal_analyses
  FOR SELECT
  USING (patient_id = auth.uid());

-- Policy: Paciente pode atualizar suas próprias análises
DROP POLICY IF EXISTS "meal_analyses_patient_update" ON public.meal_analyses;
CREATE POLICY "meal_analyses_patient_update" ON public.meal_analyses
  FOR UPDATE
  USING (patient_id = auth.uid());

-- Policy: Profissional pode ver análises de seus pacientes
DROP POLICY IF EXISTS "meal_analyses_professional_select" ON public.meal_analyses;
CREATE POLICY "meal_analyses_professional_select" ON public.meal_analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_profiles pp
      WHERE pp.patient_id = meal_analyses.patient_id
        AND pp.professional_id = auth.uid()
    )
  );

-- ==================================================================================
-- STORAGE BUCKET (meal-photos)
-- ==================================================================================
-- Execute no painel de Storage do Supabase ou via SQL:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meal-photos',
  'meal-photos',
  false,  -- privado
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Paciente pode fazer upload de suas próprias fotos
DROP POLICY IF EXISTS "meal_photos_upload" ON storage.objects;
CREATE POLICY "meal_photos_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'meal-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage Policy: Paciente pode ver suas próprias fotos
DROP POLICY IF EXISTS "meal_photos_select" ON storage.objects;
CREATE POLICY "meal_photos_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'meal-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage Policy: Profissional pode ver fotos de seus pacientes
DROP POLICY IF EXISTS "meal_photos_professional_select" ON storage.objects;
CREATE POLICY "meal_photos_professional_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'meal-photos' AND
    EXISTS (
      SELECT 1 FROM public.patient_profiles pp
      WHERE pp.patient_id::text = (storage.foldername(name))[1]
        AND pp.professional_id = auth.uid()
    )
  );

-- ==================================================================================
-- VERIFICAÇÃO FINAL
-- ==================================================================================
-- Execute para verificar se tudo foi criado corretamente:

SELECT 
  'meal_analyses table' as item,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'meal_analyses') as exists;

SELECT 
  'meal-photos bucket' as item,
  EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'meal-photos') as exists;
