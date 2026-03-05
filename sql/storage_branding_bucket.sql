-- =====================================================
-- SUPABASE STORAGE: BUCKET BRANDING
-- Para upload de logos personalizados
-- =====================================================

-- ATENÇÃO: Este SQL cria o bucket via código
-- Mas o Supabase recomenda criar via Dashboard (Storage UI)
-- Use este SQL apenas se quiser automatizar

-- Criar bucket "branding" (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,  -- Público (logos devem ser acessíveis)
  2097152,  -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- POLÍTICAS DE ACESSO (RLS)
-- =====================================================

-- Policy: Profissionais podem fazer upload
DROP POLICY IF EXISTS "branding_upload_professional" ON storage.objects;
CREATE POLICY "branding_upload_professional" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'logos'
  );

-- Policy: Profissionais podem atualizar seus próprios arquivos
DROP POLICY IF EXISTS "branding_update_own" ON storage.objects;
CREATE POLICY "branding_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'logos'
  )
  WITH CHECK (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Todos podem ler (bucket público)
DROP POLICY IF EXISTS "branding_read_public" ON storage.objects;
CREATE POLICY "branding_read_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'branding');

-- Policy: Profissionais podem deletar seus próprios arquivos
DROP POLICY IF EXISTS "branding_delete_own" ON storage.objects;
CREATE POLICY "branding_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'logos'
  );

-- Comentários
COMMENT ON TABLE storage.buckets IS 'Buckets de armazenamento do Supabase Storage';
