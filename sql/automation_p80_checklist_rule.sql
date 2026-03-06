-- ============================================================
-- FitJourney - Regra P80: checklist.low_detected
-- ============================================================
-- Executa quando a aderência alimentar de um paciente < 40%.
--
-- Actions:
--   1. notify_professional  - notifica o profissional responsável
--   2. create_task          - cria tarefa para o profissional
--   3. create_pre_plan_draft - gera rascunho de plano na tabela
--                             meal_plan_drafts
--
-- INSTRUÇÕES:
--   1. Substitua SEU_ORG_ID_AQUI pelo UUID real do profissional
--      (o mesmo UUID que está em patient_profiles.professional_id)
--   2. Execute no Supabase SQL Editor
-- ============================================================

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

    -- SUBSTITUA pelo UUID real do profissional/org
    'SEU_ORG_ID_AQUI',

    'P80 - Baixa Aderencia Alimentar',

    true,

    'checklist.low_detected',

    -- Condição: aderência abaixo de 40%
    $conditions${"field":"checklist_pct","op":"lt","value":40}$conditions$::jsonb,

    -- Actions: notificar profissional + criar tarefa + criar rascunho de plano
    $actions$[
      {
        "type": "notify_professional",
        "target": "assigned_professional",
        "title": "Paciente com baixa adesao alimentar",
        "body": "O paciente {patient_name} completou apenas {checklist_pct}% das refeicoes. Considere entrar em contato."
      },
      {
        "type": "create_task",
        "title": "Verificar adesao: {patient_name}",
        "details": "Adesao atual: {checklist_pct}%. Verificar e ajustar plano se necessario.",
        "due_in_days": 1
      },
      {
        "type": "create_pre_plan_draft",
        "notes": "Rascunho automatico gerado por baixa adesao ({checklist_pct}%)"
      }
    ]$actions$::jsonb,

    24,

    80,

    now(),
    now()
);


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
