-- ============================================================
-- FitJourney – Regra P80: checklist.low_detected
-- ============================================================
-- Executa quando a aderência alimentar de um paciente < 40%.
--
-- Actions:
--   1. notify_professional  – notifica o profissional responsável
--   2. create_task          – cria tarefa para o profissional
--   3. create_pre_plan_draft – gera rascunho de plano na tabela
--                             meal_plan_drafts
--
-- Deduplicação: cooldown de 24h por paciente/org/rule.
-- O detector também usa dedupe_key diário.
--
-- INSTRUÇÕES:
--   1. Substitua {YOUR_ORG_ID} pelo UUID real do profissional/org
--   2. Execute no Supabase SQL Editor
-- ============================================================

-- ── Garantir que as tabelas de engine existem ───────────────
-- (Execute automation_engine_setup.sql antes se ainda não fez)

-- ── Inserir regra P80 ───────────────────────────────────────
INSERT INTO automation_engine_rules (
    id,
    org_id,
    name,
    enabled,
    trigger_type,
    conditions,
    actions,
    cooldown_hours,
    priority,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),

    -- ⚠️  SUBSTITUA pelo UUID real do profissional/org
    '{YOUR_ORG_ID}',

    -- Nome da regra
    'P80 – Baixa Aderência Alimentar',

    -- Habilitada
    true,

    -- Trigger: evento emitido pelo detector C ou por meal_completion.py
    'checklist.low_detected',

    -- Condição: aderência < 40%
    -- O payload inclui checklist_pct (número 0-100)
    '{
      "field": "checklist_pct",
      "op": "lt",
      "value": 40
    }'::jsonb,

    -- Actions (3 ações em ordem)
    '[
      {
        "type": "notify_professional",
        "target": "assigned_professional",
        "title": "⚠️ Paciente com baixa aderência",
        "body": "O paciente {patient_name} completou apenas {checklist_pct}% das refeições. Considere entrar em contato."
      },
      {
        "type": "create_task",
        "title": "Verificar aderência: {patient_name}",
        "details": "Aderência atual: {checklist_pct}%. Verificar e ajustar plano alimentar se necessário.",
        "due_in_days": 1
      },
      {
        "type": "create_pre_plan_draft",
        "notes": "Rascunho automático gerado por baixa aderência ({checklist_pct}%)"
      }
    ]'::jsonb,

    -- Cooldown: 24 horas (não dispara mais de uma vez por dia por paciente)
    24,

    -- Prioridade: 80 (alta)
    80,

    now(),
    now()
)
ON CONFLICT DO NOTHING;


-- ── Verificar inserção ──────────────────────────────────────
SELECT
    id,
    name,
    trigger_type,
    enabled,
    cooldown_hours,
    priority,
    org_id
FROM automation_engine_rules
WHERE trigger_type = 'checklist.low_detected'
ORDER BY priority DESC;
