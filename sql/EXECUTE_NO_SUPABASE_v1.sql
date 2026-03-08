-- ================================================================
-- FITJOURNEY — PROTOCOL → CHECKLIST INTEGRATION
-- Execute TUDO ISSO no Supabase SQL Editor de uma vez
-- (ou em blocos na ordem indicada)
-- ================================================================


-- ================================================================
-- BLOCO 1 — CRIAR TABELAS DE PROTOCOLOS (se ainda não existirem)
-- ================================================================

-- 1.1 Tabela master de protocolos (definições, não por paciente)
CREATE TABLE IF NOT EXISTS protocols (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  category              TEXT,             -- ex: hidratacao, alimentacao, treino, termogenicos
  description           TEXT,
  instructions          TEXT,
  default_duration_days INTEGER DEFAULT 30,
  is_active             BOOLEAN DEFAULT true,
  org_id                UUID,             -- opcional: restringir a uma organização
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Tarefas de um protocolo (template, não por paciente)
CREATE TABLE IF NOT EXISTS protocol_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  day_number  INTEGER DEFAULT 1,    -- em qual dia do protocolo esta task aparece (1 = todos)
  "order"     INTEGER DEFAULT 0,    -- ordem de exibição dentro do dia
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Protocolo ativo por paciente
CREATE TABLE IF NOT EXISTS patient_protocols (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL,
  protocol_id  UUID NOT NULL REFERENCES protocols(id),
  org_id       UUID,                        -- professional_id que ativou
  status       TEXT NOT NULL DEFAULT 'active',  -- active | paused | completed | cancelled
  start_date   DATE DEFAULT CURRENT_DATE,
  end_date     DATE,
  progress_day INTEGER DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT patient_protocols_status_check
    CHECK (status IN ('active','paused','completed','cancelled'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_patient_protocols_patient
  ON patient_protocols(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_protocols_status
  ON patient_protocols(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_protocol_tasks_protocol
  ON protocol_tasks(protocol_id);


-- ================================================================
-- BLOCO 2 — ALTERAR checklist_tasks (adicionar colunas de origem)
-- ================================================================

ALTER TABLE checklist_tasks
  ADD COLUMN IF NOT EXISTS source             TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS protocol_task_id   UUID,
  ADD COLUMN IF NOT EXISTS patient_protocol_id UUID;

COMMENT ON COLUMN checklist_tasks.source IS
  'Origem: manual (criada pelo profissional/paciente) | protocol (gerada por protocolo ativo)';
COMMENT ON COLUMN checklist_tasks.protocol_task_id IS
  'ID da protocol_task que originou esta tarefa (NULL para tasks manuais)';
COMMENT ON COLUMN checklist_tasks.patient_protocol_id IS
  'ID do patient_protocol que originou esta tarefa (NULL para tasks manuais)';

-- Índice único: mesma protocol_task não pode aparecer 2x para o mesmo paciente
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_tasks_protocol_dedup
  ON checklist_tasks(patient_id, protocol_task_id)
  WHERE protocol_task_id IS NOT NULL;

-- Índice auxiliar: para remoção rápida ao desativar protocolo
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_patient_protocol_id
  ON checklist_tasks(patient_protocol_id)
  WHERE patient_protocol_id IS NOT NULL;


-- ================================================================
-- BLOCO 3 — RLS (Row Level Security) para as novas tabelas
-- ================================================================

-- Habilitar RLS
ALTER TABLE protocols        ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_protocols ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem) antes de recriar
DROP POLICY IF EXISTS protocols_select_all          ON protocols;
DROP POLICY IF EXISTS protocols_manage_admin        ON protocols;
DROP POLICY IF EXISTS protocol_tasks_select_all     ON protocol_tasks;
DROP POLICY IF EXISTS protocol_tasks_manage_admin   ON protocol_tasks;
DROP POLICY IF EXISTS patient_protocols_select_own  ON patient_protocols;
DROP POLICY IF EXISTS patient_protocols_manage_prof ON patient_protocols;

-- Qualquer usuário autenticado pode LER protocolos
CREATE POLICY protocols_select_all ON protocols
  FOR SELECT TO authenticated USING (true);

-- Admin e service_role podem escrever
CREATE POLICY protocols_manage_admin ON protocols
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Qualquer usuário autenticado pode LER protocol_tasks
CREATE POLICY protocol_tasks_select_all ON protocol_tasks
  FOR SELECT TO authenticated USING (true);

-- Service_role pode escrever
CREATE POLICY protocol_tasks_manage_admin ON protocol_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Paciente vê seus próprios patient_protocols
CREATE POLICY patient_protocols_select_own ON patient_protocols
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Service_role gerencia tudo (backend usa service_role)
CREATE POLICY patient_protocols_manage_prof ON patient_protocols
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ================================================================
-- BLOCO 4 — DADOS DE EXEMPLO (Projeto Biquíni Branco)
-- Apague/ajuste se já tiver protocolos cadastrados
-- ================================================================

-- 4.1 Inserir protocolos base (não duplica se já existir pelo nome)
INSERT INTO protocols (name, category, description, instructions, default_duration_days)
VALUES
  (
    'Protocolo de Hidratação',
    'hidratacao',
    'Aumentar progressivamente a ingestão hídrica diária para 35ml/kg.',
    'Distribuir o consumo ao longo do dia. Usar garrafa de 1L como referência visual.',
    21
  ),
  (
    'Protocolo de Chás Termogênicos',
    'termogenicos',
    'Uso estratégico de chás com propriedades termogênicas para apoiar o metabolismo.',
    'Consumir em jejum ou entre refeições. Evitar à noite.',
    30
  ),
  (
    'Protocolo de Jejum Intermitente',
    'alimentacao',
    'Janela alimentar de 8h com jejum de 16h para melhora da sensibilidade à insulina.',
    'Iniciar com 12h e progredir gradualmente. Manter hidratação no período de jejum.',
    30
  ),
  (
    'Protocolo de Sono e Recuperação',
    'sono',
    'Higiene do sono para otimizar GH, cortisol e recuperação muscular.',
    'Luz azul off às 21h. Dormir às 22h. Acordar no mesmo horário todos os dias.',
    14
  )
ON CONFLICT DO NOTHING;

-- 4.2 Inserir tasks dos protocolos
-- Hidratação
INSERT INTO protocol_tasks (protocol_id, title, description, day_number, "order")
SELECT
  p.id,
  task.title,
  task.description,
  task.day_number,
  task."order"
FROM protocols p,
(VALUES
  ('Beber 1º copo d''água ao acordar (300ml)', 'Antes do café, em jejum', 1, 1),
  ('Atingir 2L de água até o almoço', 'Distribuir entre manhã e almoço', 1, 2),
  ('Completar meta hídrica do dia (2,5–3L)', 'Meta baseada em 35ml/kg', 1, 3),
  ('Registrar consumo hídrico no app', 'Anotar total de água consumida', 1, 4)
) AS task(title, description, day_number, "order")
WHERE p.name = 'Protocolo de Hidratação'
ON CONFLICT DO NOTHING;

-- Chás Termogênicos
INSERT INTO protocol_tasks (protocol_id, title, description, day_number, "order")
SELECT
  p.id,
  task.title,
  task.description,
  task.day_number,
  task."order"
FROM protocols p,
(VALUES
  ('Chá verde em jejum (manhã)', 'Antes do café da manhã', 1, 1),
  ('Chá de gengibre com canela (tarde)', 'Entre almoço e jantar', 1, 2),
  ('Evitar chás após 18h', 'Não interfere no sono', 1, 3)
) AS task(title, description, day_number, "order")
WHERE p.name = 'Protocolo de Chás Termogênicos'
ON CONFLICT DO NOTHING;

-- Jejum Intermitente
INSERT INTO protocol_tasks (protocol_id, title, description, day_number, "order")
SELECT
  p.id,
  task.title,
  task.description,
  task.day_number,
  task."order"
FROM protocols p,
(VALUES
  ('Iniciar janela alimentar no horário combinado', 'Ex: 12h', 1, 1),
  ('Encerrar janela alimentar no horário combinado', 'Ex: 20h', 1, 2),
  ('Manter hidratação no período de jejum', 'Água, chás e café sem açúcar liberados', 1, 3),
  ('Registrar como se sentiu durante o jejum', 'Fome, energia, humor', 1, 4)
) AS task(title, description, day_number, "order")
WHERE p.name = 'Protocolo de Jejum Intermitente'
ON CONFLICT DO NOTHING;

-- Sono e Recuperação
INSERT INTO protocol_tasks (protocol_id, title, description, day_number, "order")
SELECT
  p.id,
  task.title,
  task.description,
  task.day_number,
  task."order"
FROM protocols p,
(VALUES
  ('Desligar telas (celular/TV) às 21h', 'Reduz luz azul', 1, 1),
  ('Dormir até 22h30', 'Faixa ideal de GH', 1, 2),
  ('Acordar no mesmo horário', 'Ritmo circadiano', 1, 3),
  ('Fazer 5 min de respiração antes de dormir', 'Reduz cortisol', 1, 4)
) AS task(title, description, day_number, "order")
WHERE p.name = 'Protocolo de Sono e Recuperação'
ON CONFLICT DO NOTHING;


-- ================================================================
-- BLOCO 5 — VERIFICAÇÃO FINAL
-- (Ver resultado logo após executar)
-- ================================================================

SELECT
  p.name                            AS protocolo,
  p.category,
  p.default_duration_days           AS dias,
  COUNT(pt.id)                      AS tasks_cadastradas
FROM protocols p
LEFT JOIN protocol_tasks pt ON pt.protocol_id = p.id
GROUP BY p.id, p.name, p.category, p.default_duration_days
ORDER BY p.name;

-- Verificar colunas novas em checklist_tasks
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'checklist_tasks'
  AND column_name IN ('source', 'protocol_task_id', 'patient_protocol_id')
ORDER BY column_name;
