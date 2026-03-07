-- ================================================================
-- FitJourney: Índice em checklist_tasks.patient_id
-- Execute no Supabase SQL Editor
-- ================================================================
--
-- CONTEXTO:
--   Toda query contra checklist_tasks filtra por patient_id:
--     - getChecklistTasks (frontend)
--     - patient_auto_sync_protocols (backend)
--     - remove_protocol_tasks_from_checklist (backend)
--
--   Os índices existentes NÃO cobrem queries simples WHERE patient_id = X:
--     - idx_checklist_tasks_protocol_dedup    → parcial (WHERE protocol_task_id IS NOT NULL)
--     - idx_checklist_tasks_patient_protocol_id → coluna patient_protocol_id (não patient_id)
--
--   Sem este índice, cada acesso ao checklist faz full table scan.
--
-- IMPACTO: zero downtime — CREATE INDEX CONCURRENTLY é seguro em produção.
-- Porém no Supabase SQL Editor você deve usar CREATE INDEX IF NOT EXISTS (sem CONCURRENTLY).
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_checklist_tasks_patient_id
  ON checklist_tasks(patient_id);

-- Verificação: confirmar que o índice foi criado
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'checklist_tasks'
ORDER BY indexname;
