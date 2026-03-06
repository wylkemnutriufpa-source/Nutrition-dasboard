-- ============================================
-- MIGRAÇÃO: SISTEMA CENTRAL DE AUTORIZAÇÃO v2
-- ============================================
-- Idempotente: pode ser executado múltiplas vezes sem erros.
-- Adiciona colunas professional_state e patient_state
-- com 3 estados: 'active', 'disabled', 'coming_soon'
-- ============================================

-- 1. Adicionar coluna professional_state (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_features' 
    AND column_name = 'professional_state'
  ) THEN
    ALTER TABLE platform_features 
    ADD COLUMN professional_state text DEFAULT 'active' 
    CHECK (professional_state IN ('active', 'disabled', 'coming_soon'));
    
    RAISE NOTICE 'Coluna professional_state adicionada';
  ELSE
    RAISE NOTICE 'Coluna professional_state já existe';
  END IF;
END $$;

-- 2. Adicionar coluna patient_state (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_features' 
    AND column_name = 'patient_state'
  ) THEN
    ALTER TABLE platform_features 
    ADD COLUMN patient_state text DEFAULT 'active' 
    CHECK (patient_state IN ('active', 'disabled', 'coming_soon'));
    
    RAISE NOTICE 'Coluna patient_state adicionada';
  ELSE
    RAISE NOTICE 'Coluna patient_state já existe';
  END IF;
END $$;

-- 3. Migrar dados antigos das colunas boolean para os novos estados
-- (apenas se os booleans existirem e os novos estados estiverem no default)
DO $$
BEGIN
  -- Migrar enabled_for_professional → professional_state
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_features' 
    AND column_name = 'enabled_for_professional'
  ) THEN
    UPDATE platform_features 
    SET professional_state = CASE 
      WHEN enabled_for_professional = false THEN 'disabled'
      WHEN coming_soon = true THEN 'coming_soon'
      ELSE 'active'
    END
    WHERE professional_state = 'active' 
      AND (enabled_for_professional = false OR coming_soon = true);
    
    RAISE NOTICE 'Dados migrados: enabled_for_professional → professional_state';
  END IF;
  
  -- Migrar enabled_for_patient → patient_state
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_features' 
    AND column_name = 'enabled_for_patient'
  ) THEN
    UPDATE platform_features 
    SET patient_state = CASE 
      WHEN enabled_for_patient = false THEN 'disabled'
      WHEN coming_soon = true THEN 'coming_soon'
      ELSE 'active'
    END
    WHERE patient_state = 'active' 
      AND (enabled_for_patient = false OR coming_soon = true);
    
    RAISE NOTICE 'Dados migrados: enabled_for_patient → patient_state';
  END IF;
END $$;

-- 4. Verificar resultado
SELECT slug, name, is_active, professional_state, patient_state, coming_soon
FROM platform_features 
ORDER BY category, name
LIMIT 30;
