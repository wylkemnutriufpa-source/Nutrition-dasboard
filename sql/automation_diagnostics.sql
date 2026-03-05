-- =====================================================
-- VERIFICAÇÃO DO SETUP DE AUTOMAÇÕES
-- Execute no Supabase SQL Editor para diagnosticar
-- =====================================================

-- 1. VERIFICAR TABELAS
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'automation_engine_events',
      'automation_engine_rules',
      'automation_engine_runs',
      'checklist_entries',
      'notifications'
    ) THEN '✅ Existe'
    ELSE '❌ Faltando'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN (
    'automation_engine_events',
    'automation_engine_rules',
    'automation_engine_runs',
    'checklist_entries',
    'notifications'
  )
ORDER BY table_name;

-- 2. VERIFICAR REGRAS ATIVAS
SELECT 
  id,
  name,
  trigger_type,
  enabled,
  cooldown_hours,
  created_at
FROM automation_engine_rules 
WHERE enabled = true
ORDER BY created_at DESC;

-- 3. VERIFICAR EVENTOS PENDENTES
SELECT 
  id,
  type,
  status,
  created_at,
  payload::text
FROM automation_engine_events 
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- 4. VERIFICAR CHECKLIST ENTRIES (últimas 24h)
SELECT 
  patient_id,
  date,
  COUNT(*) as total_meals,
  SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_meals,
  ROUND(100.0 * SUM(CASE WHEN completed THEN 1 ELSE 0 END) / COUNT(*), 1) as adherence_pct
FROM checklist_entries
WHERE date >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY patient_id, date
ORDER BY adherence_pct ASC;

-- 5. VERIFICAR RUNS (últimos 10)
SELECT 
  r.id,
  r.created_at,
  r.success,
  r.actions_executed,
  e.type as event_type,
  e.status as event_status
FROM automation_engine_runs r
JOIN automation_engine_events e ON e.id = r.event_id
ORDER BY r.created_at DESC
LIMIT 10;

-- 6. VERIFICAR NOTIFICAÇÕES GERADAS (últimas 24h)
SELECT 
  id,
  patient_id,
  professional_id,
  type,
  message,
  is_read,
  created_at
FROM notifications
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 7. CONTAR TOTAIS
SELECT 
  'Eventos Pendentes' as metric,
  COUNT(*) as count
FROM automation_engine_events
WHERE status = 'pending'
UNION ALL
SELECT 
  'Eventos Processados (hoje)',
  COUNT(*)
FROM automation_engine_events
WHERE status = 'done' AND created_at >= CURRENT_DATE
UNION ALL
SELECT 
  'Regras Ativas',
  COUNT(*)
FROM automation_engine_rules
WHERE enabled = true
UNION ALL
SELECT 
  'Runs (hoje)',
  COUNT(*)
FROM automation_engine_runs
WHERE created_at >= CURRENT_DATE
UNION ALL
SELECT 
  'Notificações (hoje)',
  COUNT(*)
FROM notifications
WHERE created_at >= CURRENT_DATE;
