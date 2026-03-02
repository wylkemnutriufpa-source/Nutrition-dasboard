-- =====================================================
-- SQL CORRIGIDO - TEMPLATES GLOBAIS + EMERGÊNCIA SOS
-- =====================================================

-- ==================== PARTE 1: CRIAR TABELA DE TEMPLATES ====================

CREATE TABLE IF NOT EXISTS professional_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checklist', 'task', 'tip')),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_professional_templates_professional ON professional_templates(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_templates_type ON professional_templates(type);
CREATE INDEX IF NOT EXISTS idx_professional_templates_active ON professional_templates(is_active);

-- RLS (Row Level Security)
ALTER TABLE professional_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profissionais podem ver seus templates" ON professional_templates;
CREATE POLICY "Profissionais podem ver seus templates"
  ON professional_templates FOR SELECT
  USING (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais podem criar templates" ON professional_templates;
CREATE POLICY "Profissionais podem criar templates"
  ON professional_templates FOR INSERT
  WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais podem editar seus templates" ON professional_templates;
CREATE POLICY "Profissionais podem editar seus templates"
  ON professional_templates FOR UPDATE
  USING (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais podem deletar seus templates" ON professional_templates;
CREATE POLICY "Profissionais podem deletar seus templates"
  ON professional_templates FOR DELETE
  USING (auth.uid() = professional_id);

-- ==================== PARTE 2: ALTERAR TABELAS EXISTENTES ====================

-- Adicionar campos em checklist_tasks
ALTER TABLE checklist_tasks
ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES professional_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_customized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_checklist_tasks_template ON checklist_tasks(source_template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_disabled ON checklist_tasks(is_disabled);

-- Adicionar campos em tips (CORRIGIDO)
ALTER TABLE tips
ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES professional_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_customized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tips_template ON tips(source_template_id);
CREATE INDEX IF NOT EXISTS idx_tips_disabled ON tips(is_disabled);

-- Adicionar campos em feedbacks
ALTER TABLE feedbacks
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'normal' CHECK (type IN ('normal', 'emergency')),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_priority ON feedbacks(priority);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);

-- ==================== PARTE 3: FUNÇÕES SQL ====================

-- Função 1: Sincronizar templates para um paciente específico
CREATE OR REPLACE FUNCTION sync_templates_for_patient(p_patient_id UUID)
RETURNS void AS $$
DECLARE
  template RECORD;
  v_professional_id UUID;
BEGIN
  -- Buscar professional_id do paciente
  SELECT professional_id INTO v_professional_id
  FROM profiles
  WHERE id = p_patient_id;

  IF v_professional_id IS NULL THEN
    RETURN;
  END IF;

  -- Para cada template ativo do profissional
  FOR template IN 
    SELECT *
    FROM professional_templates
    WHERE professional_id = v_professional_id
      AND is_active = true
  LOOP
    -- Sincronizar Checklist
    IF template.type IN ('checklist', 'task') THEN
      INSERT INTO checklist_tasks (
        patient_id,
        professional_id,
        title,
        source_template_id,
        is_customized,
        is_disabled,
        completed
      )
      SELECT
        p_patient_id,
        v_professional_id,
        template.title,
        template.id,
        false,
        false,
        false
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_tasks
        WHERE patient_id = p_patient_id
          AND source_template_id = template.id
      );
    END IF;

    -- Sincronizar Dicas (CORRIGIDO: tips ao invés de personalized_tips)
    IF template.type = 'tip' THEN
      INSERT INTO tips (
        patient_id,
        professional_id,
        title,
        content,
        category,
        priority,
        source_template_id,
        is_customized,
        is_disabled
      )
      SELECT
        p_patient_id,
        v_professional_id,
        template.title,
        template.content,
        template.category,
        'medium',
        template.id,
        false,
        false
      WHERE NOT EXISTS (
        SELECT 1 FROM tips
        WHERE patient_id = p_patient_id
          AND source_template_id = template.id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função 2: Atualizar instâncias quando template é editado
CREATE OR REPLACE FUNCTION update_template_instances(
  p_template_id UUID,
  p_new_title TEXT,
  p_new_content TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_template_type TEXT;
BEGIN
  -- Buscar tipo do template
  SELECT type INTO v_template_type
  FROM professional_templates
  WHERE id = p_template_id;

  -- Atualizar o template
  UPDATE professional_templates
  SET title = p_new_title,
      content = p_new_content,
      updated_at = NOW()
  WHERE id = p_template_id;

  -- Atualizar instâncias de checklist não customizadas
  IF v_template_type IN ('checklist', 'task') THEN
    UPDATE checklist_tasks
    SET title = p_new_title
    WHERE source_template_id = p_template_id
      AND is_customized = false
      AND is_disabled = false;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  -- Atualizar instâncias de dicas não customizadas (CORRIGIDO)
  IF v_template_type = 'tip' THEN
    UPDATE tips
    SET title = p_new_title,
        content = p_new_content
    WHERE source_template_id = p_template_id
      AND is_customized = false
      AND is_disabled = false;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Função 3: Contar instâncias de um template
CREATE OR REPLACE FUNCTION count_template_instances(p_template_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_template_type TEXT;
BEGIN
  SELECT type INTO v_template_type
  FROM professional_templates
  WHERE id = p_template_id;

  IF v_template_type IN ('checklist', 'task') THEN
    SELECT COUNT(*) INTO v_count
    FROM checklist_tasks
    WHERE source_template_id = p_template_id
      AND is_disabled = false;
  ELSIF v_template_type = 'tip' THEN
    SELECT COUNT(*) INTO v_count
    FROM tips
    WHERE source_template_id = p_template_id
      AND is_disabled = false;
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ==================== PARTE 4: TRIGGER PARA AUTO-SYNC (OPCIONAL) ====================

-- Trigger para sincronizar templates quando novo paciente é criado
CREATE OR REPLACE FUNCTION auto_sync_templates_new_patient()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o novo usuário é paciente e tem professional_id
  IF NEW.role = 'patient' AND NEW.professional_id IS NOT NULL THEN
    PERFORM sync_templates_for_patient(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_sync_templates ON profiles;
CREATE TRIGGER trigger_auto_sync_templates
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_templates_new_patient();

-- ==================== FIM DO SQL ====================
