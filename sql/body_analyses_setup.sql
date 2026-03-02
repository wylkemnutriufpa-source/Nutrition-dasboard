-- ==================================================================================
-- BODY ANALYSES - Análise Corporal por IA
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ==================================================================================

-- 1) Criar tabela body_analyses
CREATE TABLE IF NOT EXISTS public.body_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Fotos (paths no storage)
  photo_front text NULL,
  photo_side text NULL,
  photo_back text NULL,
  
  -- Status
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'done', 'failed')),
  
  -- Estimativas da IA
  body_fat_estimate numeric NULL,  -- % estimado de gordura
  muscle_definition int NULL CHECK (muscle_definition >= 1 AND muscle_definition <= 10),  -- 1-10
  body_type text NULL,  -- ectomorfo, mesomorfo, endomorfo, misto
  fat_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "abdominal": "high", "arms": "low", etc }
  
  -- Análise por região
  region_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  /* Exemplo:
  {
    "shoulders": { "score": 7, "notes": "Boa largura, leve assimetria" },
    "chest": { "score": 6, "notes": "Desenvolvimento moderado" },
    "abdomen": { "score": 5, "notes": "Acúmulo moderado de gordura" },
    "arms": { "score": 6, "notes": "Bom tônus muscular" },
    "legs": { "score": 7, "notes": "Bem desenvolvidas" },
    "back": { "score": 6, "notes": "Largura adequada" },
    "posture": { "score": 7, "notes": "Leve anteriorização de ombros" }
  }
  */
  
  -- Postura
  posture_score int NULL CHECK (posture_score >= 1 AND posture_score <= 10),
  posture_notes text NULL,
  
  -- Score geral e feedback
  overall_score int NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  ai_feedback text NULL,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Comparação com análise anterior (preenchido se houver)
  previous_analysis_id uuid NULL REFERENCES public.body_analyses(id) ON DELETE SET NULL,
  comparison_result jsonb NULL,
  /* Exemplo:
  {
    "body_fat_change": -1.5,
    "muscle_definition_change": +1,
    "overall_progress": "positive",
    "progress_score": 75,
    "highlights": [
      "Redução visível na região abdominal",
      "Aumento de definição nos braços",
      "Melhora na postura"
    ],
    "areas_improved": ["abdomen", "arms"],
    "areas_attention": ["legs"]
  }
  */
  
  -- Contexto
  analysis_type text NOT NULL DEFAULT 'progress' CHECK (analysis_type IN ('baseline', 'progress', 'feedback')),
  feedback_id uuid NULL,  -- Se veio de um feedback
  notes text NULL,  -- Notas do paciente
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Índices
CREATE INDEX IF NOT EXISTS idx_body_analyses_patient_id ON public.body_analyses(patient_id);
CREATE INDEX IF NOT EXISTS idx_body_analyses_patient_created ON public.body_analyses(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_analyses_type ON public.body_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_body_analyses_feedback ON public.body_analyses(feedback_id);

-- 3) Trigger para updated_at
CREATE OR REPLACE FUNCTION update_body_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_body_analyses_updated_at ON public.body_analyses;
CREATE TRIGGER trigger_body_analyses_updated_at
  BEFORE UPDATE ON public.body_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_body_analyses_updated_at();

-- ==================================================================================
-- RLS POLICIES (Paciente + Profissional podem ver)
-- ==================================================================================

ALTER TABLE public.body_analyses ENABLE ROW LEVEL SECURITY;

-- Paciente pode inserir suas próprias análises
DROP POLICY IF EXISTS "body_analyses_patient_insert" ON public.body_analyses;
CREATE POLICY "body_analyses_patient_insert" ON public.body_analyses
  FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- Paciente pode ver suas próprias análises
DROP POLICY IF EXISTS "body_analyses_patient_select" ON public.body_analyses;
CREATE POLICY "body_analyses_patient_select" ON public.body_analyses
  FOR SELECT
  USING (patient_id = auth.uid());

-- Paciente pode atualizar suas próprias análises
DROP POLICY IF EXISTS "body_analyses_patient_update" ON public.body_analyses;
CREATE POLICY "body_analyses_patient_update" ON public.body_analyses
  FOR UPDATE
  USING (patient_id = auth.uid());

-- Profissional pode ver análises de seus pacientes
DROP POLICY IF EXISTS "body_analyses_professional_select" ON public.body_analyses;
CREATE POLICY "body_analyses_professional_select" ON public.body_analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_profiles pp
      WHERE pp.patient_id = body_analyses.patient_id
        AND pp.professional_id = auth.uid()
    )
  );

-- ==================================================================================
-- STORAGE BUCKET (body-photos) - PRIVADO
-- ==================================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'body-photos',
  'body-photos',
  false,
  15728640,  -- 15MB por foto
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage: Paciente pode upload
DROP POLICY IF EXISTS "body_photos_upload" ON storage.objects;
CREATE POLICY "body_photos_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'body-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage: Paciente pode ver suas fotos
DROP POLICY IF EXISTS "body_photos_patient_select" ON storage.objects;
CREATE POLICY "body_photos_patient_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'body-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage: Profissional pode ver fotos de seus pacientes
DROP POLICY IF EXISTS "body_photos_professional_select" ON storage.objects;
CREATE POLICY "body_photos_professional_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'body-photos' AND
    EXISTS (
      SELECT 1 FROM public.patient_profiles pp
      WHERE pp.patient_id::text = (storage.foldername(name))[1]
        AND pp.professional_id = auth.uid()
    )
  );

-- ==================================================================================
-- VERIFICAÇÃO
-- ==================================================================================
SELECT 
  'body_analyses table' as item,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'body_analyses') as exists;
