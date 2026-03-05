-- ============================================
-- MEAL TEMPLATES - Sistema de Modelos de Refeições
-- Permite profissionais salvarem refeições como modelos reutilizáveis
-- ============================================

-- ==================== 1) TABELA meal_templates ====================

CREATE TABLE IF NOT EXISTS meal_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Metadados
  title text NOT NULL,
  description text,
  category text DEFAULT 'general', -- general, breakfast, lunch, dinner, snack
  tags text[] DEFAULT '{}',
  
  -- Dados da refeição
  meal_data jsonb NOT NULL DEFAULT '{}',
  -- Estrutura esperada do meal_data:
  -- {
  --   "name": "Nome da refeição",
  --   "time": "07:00",
  --   "color": "#F97316",
  --   "foods": [
  --     { "id": "f1", "foodId": "123", "name": "Ovo cozido", "quantity": 2, "unit": "unidade" }
  --   ],
  --   "observations": "Observações..."
  -- }
  
  -- Nutrientes calculados
  total_calories integer DEFAULT 0,
  total_protein numeric(6,1) DEFAULT 0,
  total_carbs numeric(6,1) DEFAULT 0,
  total_fat numeric(6,1) DEFAULT 0,
  
  -- Controle
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT false, -- Futuramente para templates compartilhados
  use_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==================== 2) ÍNDICES ====================

CREATE INDEX IF NOT EXISTS idx_meal_templates_professional ON meal_templates(professional_id);
CREATE INDEX IF NOT EXISTS idx_meal_templates_category ON meal_templates(category);
CREATE INDEX IF NOT EXISTS idx_meal_templates_active ON meal_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_meal_templates_use_count ON meal_templates(use_count DESC);

-- ==================== 3) RLS POLICIES ====================

ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: profissional vê seus próprios templates
DO $$ BEGIN
  DROP POLICY IF EXISTS meal_templates_select ON meal_templates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY meal_templates_select ON meal_templates
  FOR SELECT USING (
    professional_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy para INSERT: profissional pode criar seus templates
DO $$ BEGIN
  DROP POLICY IF EXISTS meal_templates_insert ON meal_templates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY meal_templates_insert ON meal_templates
  FOR INSERT WITH CHECK (
    professional_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy para UPDATE: profissional pode editar seus templates
DO $$ BEGIN
  DROP POLICY IF EXISTS meal_templates_update ON meal_templates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY meal_templates_update ON meal_templates
  FOR UPDATE USING (
    professional_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy para DELETE: profissional pode deletar seus templates
DO $$ BEGIN
  DROP POLICY IF EXISTS meal_templates_delete ON meal_templates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY meal_templates_delete ON meal_templates
  FOR DELETE USING (
    professional_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ==================== 4) FUNÇÃO: Incrementar uso de template ====================

CREATE OR REPLACE FUNCTION increment_template_use(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE meal_templates
  SET use_count = use_count + 1
  WHERE id = p_template_id;
END;
$$;

-- ==================== 5) TRIGGER para updated_at ====================

CREATE OR REPLACE FUNCTION update_meal_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meal_templates_updated_at ON meal_templates;
CREATE TRIGGER meal_templates_updated_at
  BEFORE UPDATE ON meal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_templates_timestamp();

-- ==================== FIM ====================
-- Execute este SQL no Supabase SQL Editor
