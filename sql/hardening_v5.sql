-- ============================================
-- HARDENING V5 - Multi-Planos Engine
-- ============================================

-- ==================== 1) AJUSTAR meal_plans ====================

-- Adicionar status enum (se não existir)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'plan_status') THEN
    ALTER TABLE meal_plans ADD COLUMN plan_status text DEFAULT 'active'
      CHECK (plan_status IN ('draft', 'scheduled', 'active', 'completed', 'archived'));
  END IF;
END $$;

-- Adicionar available_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'available_at') THEN
    ALTER TABLE meal_plans ADD COLUMN available_at timestamptz;
  END IF;
END $$;

-- Adicionar activated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'activated_at') THEN
    ALTER TABLE meal_plans ADD COLUMN activated_at timestamptz;
  END IF;
END $$;

-- Adicionar completed_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'completed_at') THEN
    ALTER TABLE meal_plans ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Adicionar criteria_json
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'criteria_json') THEN
    ALTER TABLE meal_plans ADD COLUMN criteria_json jsonb DEFAULT '{}';
  END IF;
END $$;

-- Adicionar is_multi_plan
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'is_multi_plan') THEN
    ALTER TABLE meal_plans ADD COLUMN is_multi_plan boolean DEFAULT false;
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(plan_status);
CREATE INDEX IF NOT EXISTS idx_meal_plans_available ON meal_plans(available_at) WHERE plan_status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_meal_plans_patient_status ON meal_plans(patient_id, plan_status);

-- ==================== 2) CRIAR meal_plan_transitions ====================

CREATE TABLE IF NOT EXISTS meal_plan_transitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL CHECK (to_status IN ('draft', 'scheduled', 'active', 'completed', 'archived')),
  reason text,
  executed_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transitions_plan ON meal_plan_transitions(plan_id);
CREATE INDEX IF NOT EXISTS idx_transitions_patient ON meal_plan_transitions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transitions_created ON meal_plan_transitions(created_at DESC);

-- RLS para meal_plan_transitions
ALTER TABLE meal_plan_transitions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS meal_plan_transitions_read ON meal_plan_transitions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY meal_plan_transitions_read ON meal_plan_transitions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role IN ('professional', 'admin') OR id = patient_id)
    )
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS meal_plan_transitions_insert ON meal_plan_transitions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE POLICY meal_plan_transitions_insert ON meal_plan_transitions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('professional', 'admin')
    )
  );

-- ==================== 3) FUNÇÃO: Ativar plano agendado ====================

CREATE OR REPLACE FUNCTION activate_scheduled_plan(p_plan_id uuid, p_executed_by uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_patient_id uuid;
  v_current_status text;
  v_old_active_plan_id uuid;
  v_result jsonb;
BEGIN
  -- Buscar plano
  SELECT patient_id, plan_status INTO v_patient_id, v_current_status
  FROM meal_plans WHERE id = p_plan_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plano não encontrado');
  END IF;
  
  IF v_current_status != 'scheduled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plano não está agendado');
  END IF;
  
  -- Completar plano ativo anterior (se existir)
  SELECT id INTO v_old_active_plan_id
  FROM meal_plans
  WHERE patient_id = v_patient_id AND plan_status = 'active'
  LIMIT 1;
  
  IF v_old_active_plan_id IS NOT NULL THEN
    UPDATE meal_plans
    SET plan_status = 'completed', completed_at = now()
    WHERE id = v_old_active_plan_id;
    
    INSERT INTO meal_plan_transitions (plan_id, patient_id, from_status, to_status, reason, executed_by)
    VALUES (v_old_active_plan_id, v_patient_id, 'active', 'completed', 'Auto-completado por ativação de novo plano', p_executed_by);
  END IF;
  
  -- Ativar novo plano
  UPDATE meal_plans
  SET plan_status = 'active', activated_at = now(), is_active = true
  WHERE id = p_plan_id;
  
  INSERT INTO meal_plan_transitions (plan_id, patient_id, from_status, to_status, reason, executed_by)
  VALUES (p_plan_id, v_patient_id, 'scheduled', 'active', 'Ativado manualmente ou por critério', p_executed_by);
  
  RETURN jsonb_build_object('success', true, 'plan_id', p_plan_id, 'patient_id', v_patient_id);
END;
$$;

-- ==================== 4) FUNÇÃO: Verificar planos prontos para ativar ====================

CREATE OR REPLACE FUNCTION check_plans_ready_to_activate()
RETURNS TABLE(plan_id uuid, patient_id uuid, available_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, patient_id, available_at
  FROM meal_plans
  WHERE plan_status = 'scheduled'
    AND available_at IS NOT NULL
    AND available_at <= now()
  ORDER BY available_at ASC;
$$;

-- FIM V5
