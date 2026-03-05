-- ==================== TABELA DE ASSINATURAS DE PACIENTES ====================
-- Armazena informações de pacote, pagamento e tier do paciente

CREATE TABLE IF NOT EXISTS patient_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Tipo de Pacote
  package_type TEXT NOT NULL CHECK (package_type IN ('mensal', 'trimestral', 'semestral', 'anual')),
  
  -- Datas
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Financeiro
  amount_paid DECIMAL(10, 2),
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT, -- pix, cartao, boleto, dinheiro
  payment_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired', 'cancelled')),
  
  -- Tier e Plano Atual
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'pro')),
  current_plan_name TEXT DEFAULT 'Plano Inicial', -- 'Plano Inicial', 'Plan 1', 'Plan 2', 'Plan 3'
  current_plan_id UUID, -- Referência ao meal_plans (opcional)
  
  -- Observações
  notes TEXT,
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices
  UNIQUE(patient_id) -- Um paciente só tem uma assinatura ativa por vez
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_patient ON patient_subscriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_professional ON patient_subscriptions(professional_id);
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_status ON patient_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_patient_subscriptions_end_date ON patient_subscriptions(end_date);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_patient_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_subscriptions_updated_at
  BEFORE UPDATE ON patient_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_subscription_updated_at();

-- RLS (Row Level Security)
ALTER TABLE patient_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Profissional vê apenas suas assinaturas
CREATE POLICY patient_subscriptions_professional_policy ON patient_subscriptions
  FOR ALL
  USING (
    professional_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.user_id = auth.uid()
      AND professionals.id = patient_subscriptions.professional_id
    )
  );

-- Policy: Admin vê tudo
CREATE POLICY patient_subscriptions_admin_policy ON patient_subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ==================== FUNÇÃO: ATUALIZAR STATUS AUTOMATICAMENTE ====================
-- Verifica se assinaturas estão vencendo ou vencidas

CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS void AS $$
BEGIN
  -- Marcar como 'expiring' se faltam 7 dias ou menos
  UPDATE patient_subscriptions
  SET status = 'expiring'
  WHERE status = 'active'
  AND end_date - CURRENT_DATE <= 7
  AND end_date >= CURRENT_DATE;
  
  -- Marcar como 'expired' se passou da data
  UPDATE patient_subscriptions
  SET status = 'expired'
  WHERE status IN ('active', 'expiring')
  AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ==================== COMENTÁRIOS ====================
COMMENT ON TABLE patient_subscriptions IS 'Armazena informações de assinatura/pacote dos pacientes';
COMMENT ON COLUMN patient_subscriptions.package_type IS 'Tipo de pacote contratado: mensal, trimestral, semestral, anual';
COMMENT ON COLUMN patient_subscriptions.status IS 'Status da assinatura: active (ativo), expiring (vencendo em 7 dias), expired (vencido), cancelled (cancelado)';
COMMENT ON COLUMN patient_subscriptions.tier IS 'Nível de acesso: basic (recursos básicos) ou pro (recursos avançados)';
COMMENT ON COLUMN patient_subscriptions.current_plan_name IS 'Nome do plano alimentar atual: Plano Inicial, Plan 1, Plan 2, Plan 3';

-- ==================== DADOS INICIAIS (EXEMPLO) ====================
-- Descomentar para criar exemplos

/*
INSERT INTO patient_subscriptions (patient_id, professional_id, package_type, start_date, end_date, amount_paid, tier, current_plan_name, status)
VALUES
  -- Exemplo: Paciente com assinatura mensal ativa
  ((SELECT id FROM patients LIMIT 1), (SELECT id FROM professionals LIMIT 1), 'mensal', '2026-03-01', '2026-04-01', 150.00, 'pro', 'Plano Inicial', 'active')
ON CONFLICT (patient_id) DO NOTHING;
*/
