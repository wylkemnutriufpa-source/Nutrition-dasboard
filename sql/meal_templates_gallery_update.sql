-- ============================================
-- MEAL TEMPLATES - Atualização para Galeria Pública
-- Adiciona campos de aprovação e controle
-- ============================================

-- 1) Adicionar coluna de status de aprovação
ALTER TABLE meal_templates 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'private' 
CHECK (approval_status IN ('private', 'pending', 'approved', 'rejected'));

-- 2) Adicionar coluna de quem aprovou
ALTER TABLE meal_templates 
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);

-- 3) Adicionar data de aprovação
ALTER TABLE meal_templates 
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 4) Adicionar motivo de rejeição (opcional)
ALTER TABLE meal_templates 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 5) Índice para templates aprovados (galeria pública)
CREATE INDEX IF NOT EXISTS idx_meal_templates_approved 
ON meal_templates(approval_status, use_count DESC) 
WHERE approval_status = 'approved';

-- 6) Policy atualizada para SELECT: permite ver templates aprovados (galeria)
DROP POLICY IF EXISTS meal_templates_select ON meal_templates;

CREATE POLICY meal_templates_select ON meal_templates FOR SELECT USING (
  -- Próprios templates
  professional_id = auth.uid() 
  OR 
  -- Admin vê todos
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR
  -- Templates aprovados visíveis para planos pagos (basic, pro)
  (
    approval_status = 'approved' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND plan_type IN ('basic', 'pro', 'enterprise')
    )
  )
);

-- 7) Função para contar templates públicos do profissional
CREATE OR REPLACE FUNCTION count_professional_public_templates(p_professional_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer 
  FROM meal_templates 
  WHERE professional_id = p_professional_id 
  AND approval_status IN ('pending', 'approved');
$$;

-- 8) Função para solicitar publicação (verifica limite de 10)
CREATE OR REPLACE FUNCTION request_template_publication(p_template_id uuid, p_professional_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_plan_type text;
BEGIN
  -- Verificar se é PRO
  SELECT plan_type INTO v_plan_type 
  FROM profiles WHERE id = p_professional_id;
  
  IF v_plan_type NOT IN ('pro', 'enterprise') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas usuários PRO podem publicar templates');
  END IF;
  
  -- Contar templates públicos atuais
  SELECT count_professional_public_templates(p_professional_id) INTO v_count;
  
  IF v_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Limite de 10 templates públicos atingido. Remova um para adicionar outro.');
  END IF;
  
  -- Atualizar status para pendente
  UPDATE meal_templates 
  SET approval_status = 'pending', is_public = true
  WHERE id = p_template_id AND professional_id = p_professional_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Solicitação enviada para aprovação');
END;
$$;

-- 9) Função para admin aprovar/rejeitar
CREATE OR REPLACE FUNCTION admin_review_template(
  p_template_id uuid, 
  p_admin_id uuid, 
  p_action text, 
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Verificar se é admin
  SELECT (role = 'admin') INTO v_is_admin 
  FROM profiles WHERE id = p_admin_id;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem aprovar templates');
  END IF;
  
  IF p_action = 'approve' THEN
    UPDATE meal_templates 
    SET approval_status = 'approved', 
        approved_by = p_admin_id, 
        approved_at = now(),
        rejection_reason = NULL
    WHERE id = p_template_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Template aprovado com sucesso');
    
  ELSIF p_action = 'reject' THEN
    UPDATE meal_templates 
    SET approval_status = 'rejected', 
        approved_by = p_admin_id,
        approved_at = now(),
        rejection_reason = p_reason,
        is_public = false
    WHERE id = p_template_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Template rejeitado');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Ação inválida. Use approve ou reject');
  END IF;
END;
$$;

-- ==================== FIM ====================
