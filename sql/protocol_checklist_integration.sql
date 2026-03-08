-- ============================================================
-- FitJourney: Protocol → Checklist Integration
-- Executar no Supabase SQL Editor
-- 
-- Adiciona campos opcionais à checklist_tasks para rastrear
-- origem das tarefas de protocolo.
-- NOTA: O backend funciona SEM este SQL (fallback por título).
-- Com este SQL, o dedup é mais robusto.
-- ============================================================

-- 1. Adicionar colunas de rastreamento de origem
ALTER TABLE checklist_tasks 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS protocol_task_id UUID,
  ADD COLUMN IF NOT EXISTS patient_protocol_id UUID;

-- 2. Comentários descritivos
COMMENT ON COLUMN checklist_tasks.source IS 
  'Origem da task: manual (criada pelo profissional/paciente) ou protocol (gerada por protocolo ativo)';
COMMENT ON COLUMN checklist_tasks.protocol_task_id IS 
  'ID da protocol_task que gerou esta checklist_task (NULL para tasks manuais)';
COMMENT ON COLUMN checklist_tasks.patient_protocol_id IS 
  'ID do patient_protocol que gerou esta checklist_task (NULL para tasks manuais)';

-- 3. Índice único para evitar duplicação de tasks de protocolo
-- Garante que a mesma protocol_task não seja injetada 2x para o mesmo paciente
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_tasks_protocol_dedup
  ON checklist_tasks(patient_id, protocol_task_id)
  WHERE protocol_task_id IS NOT NULL;

-- 4. Índice auxiliar para busca rápida por patient_protocol_id
-- (usado ao remover tasks quando protocolo é desativado)
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_patient_protocol_id
  ON checklist_tasks(patient_protocol_id)
  WHERE patient_protocol_id IS NOT NULL;

-- Verificação
SELECT 
  column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'checklist_tasks'
  AND column_name IN ('source', 'protocol_task_id', 'patient_protocol_id')
ORDER BY column_name;
