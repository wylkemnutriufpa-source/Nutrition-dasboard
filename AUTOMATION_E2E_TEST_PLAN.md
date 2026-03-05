# 🤖 PLANO DE TESTES E2E - AUTOMATION ENGINE

## 📋 CONTEXTO

**Sistema:** FitJourney Nutrition Dashboard
**Componente:** Automation Engine (Meal Adherence Tracking)
**Objetivo:** Testar fluxo completo: checkbox → adherence → event → automation → notification

---

## ✅ JÁ IMPLEMENTADO (Segundo test_result.md)

### **Backend:**
- ✅ `automation_engine/types.py` → Pydantic models
- ✅ `automation_engine/evaluator.py` → DSL de condições
- ✅ `automation_engine/templates.py` → Renderização de mensagens
- ✅ `automation_engine/cooldown.py` → Controle de cooldown
- ✅ `automation_engine/actions.py` → notify_user, notify_professional, create_task
- ✅ `automation_engine/worker.py` → Loop de processamento
- ✅ `automation_engine/detectors.py` → Detectores de eventos
- ✅ `routes/automation_engine.py` → API endpoints

### **Frontend:**
- ✅ `pages/AutomationCenter.js` → UI de gerenciamento
- ✅ `utils/automationEngine.js` → Helper functions
- ✅ `utils/automationEngineApi.js` → API calls

### **Database:**
- ✅ `automation_engine_events` → Eventos pendentes/processados
- ✅ `automation_engine_rules` → Regras de automação
- ✅ `automation_engine_runs` → Histórico de execuções
- ✅ `checklist_entries` → Tracking de refeições
- ✅ `notifications` → Notificações geradas

---

## 🎯 FLUXO E2E A TESTAR

```
1. SETUP
   ├─ Paciente com plano alimentar ativo
   ├─ Profissional com acesso ao paciente
   └─ Regra de automação: "baixa aderência < 40%"

2. AÇÃO DO PACIENTE
   ├─ Marcar refeições como "Feito ✔️" (checkbox)
   └─ Atingir < 40% de aderência

3. CÁLCULO DE ADERÊNCIA
   ├─ Sistema calcula % de refeições completas
   └─ Detecta: adherence_percentage < 40%

4. EMISSÃO DE EVENTO
   ├─ Criar evento: checklist.low_detected
   ├─ Inserir em: automation_engine_events
   └─ Status: pending

5. WORKER PROCESSA
   ├─ Worker lê eventos pendentes
   ├─ Busca regras com trigger_type = checklist.low_detected
   ├─ Avalia condições (DSL)
   ├─ Verifica cooldown
   └─ Executa ações

6. AÇÃO: NOTIFICAR
   ├─ Criar notificação para profissional
   ├─ Inserir em: notifications
   └─ Marcar evento como: done

7. VERIFICAÇÃO
   ├─ Profissional recebe notificação
   ├─ Log em automation_engine_runs
   └─ Dashboard atualizado
```

---

## 🧪 TESTES DETALHADOS

### **TESTE 1: Setup Inicial**

**Objetivo:** Verificar se as tabelas e configurações existem

```sql
-- 1.1 Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
  'automation_engine_events',
  'automation_engine_rules', 
  'automation_engine_runs',
  'checklist_entries',
  'notifications'
);

-- 1.2 Verificar se há regras ativas
SELECT id, name, trigger_type, enabled 
FROM automation_engine_rules 
WHERE enabled = true;

-- 1.3 Verificar se há pacientes ativos
SELECT id, email FROM auth.users 
WHERE id IN (
  SELECT patient_id FROM patient_profiles LIMIT 1
);
```

**Resultado Esperado:**
- ✅ 5 tabelas encontradas
- ✅ Pelo menos 1 regra ativa
- ✅ Pelo menos 1 paciente

---

### **TESTE 2: Marcar Refeições (Manual)**

**Objetivo:** Simular paciente marcando refeições

```sql
-- 2.1 Ver checklist do paciente
SELECT * FROM checklist_entries 
WHERE patient_id = '<PATIENT_ID>' 
ORDER BY created_at DESC 
LIMIT 10;

-- 2.2 Marcar algumas refeições como feitas
UPDATE checklist_entries 
SET completed = true 
WHERE patient_id = '<PATIENT_ID>' 
  AND meal_name IN ('Café da Manhã', 'Lanche da Manhã')
  AND date = CURRENT_DATE;

-- 2.3 Deixar outras sem marcar (para atingir < 40%)
-- (não fazer nada, já está false)

-- 2.4 Calcular aderência
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed,
  ROUND(100.0 * SUM(CASE WHEN completed THEN 1 ELSE 0 END) / COUNT(*), 1) as adherence_pct
FROM checklist_entries
WHERE patient_id = '<PATIENT_ID>' 
  AND date = CURRENT_DATE;
```

**Resultado Esperado:**
- ✅ `adherence_pct` < 40%

---

### **TESTE 3: Emitir Evento (Manual ou Detector)**

**Opção A: Inserir evento manualmente**
```sql
INSERT INTO automation_engine_events (
  org_id, 
  patient_id, 
  actor_user_id, 
  type, 
  payload, 
  status
) VALUES (
  '<ORG_ID>',
  '<PATIENT_ID>',
  '<PATIENT_ID>',
  'checklist.low_detected',
  jsonb_build_object(
    'patient_id', '<PATIENT_ID>',
    'adherence_percentage', 30.0,
    'date', CURRENT_DATE
  ),
  'pending'
);
```

**Opção B: Rodar detector**
```bash
# Via API
curl -X POST http://localhost:8001/api/automation/run-detectors \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Resultado Esperado:**
- ✅ Evento criado com status = `pending`

---

### **TESTE 4: Processar Worker**

**Opção A: Via API**
```bash
curl -X POST http://localhost:8001/api/admin/automation-engine/run \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 10}'
```

**Opção B: Via Python direto**
```python
# No backend
from services.automation_engine.worker import process_batch
import asyncio

asyncio.run(process_batch(batch_size=10))
```

**Resultado Esperado:**
- ✅ Worker processa evento
- ✅ Status muda: `pending` → `processing` → `done`

---

### **TESTE 5: Verificar Notificação Criada**

```sql
-- 5.1 Ver notificações geradas
SELECT * FROM notifications 
WHERE patient_id = '<PATIENT_ID>' 
ORDER BY created_at DESC 
LIMIT 5;

-- 5.2 Ver runs da automação
SELECT * FROM automation_engine_runs 
WHERE event_id IN (
  SELECT id FROM automation_engine_events 
  WHERE patient_id = '<PATIENT_ID>'
)
ORDER BY created_at DESC;
```

**Resultado Esperado:**
- ✅ 1 notificação criada para profissional
- ✅ 1 run registrado com success = true

---

### **TESTE 6: Verificar UI (Frontend)**

**6.1 Dashboard do Profissional**
- Ir em `/professional/dashboard`
- Ver se aparece notificação no sino 🔔

**6.2 Central de Automações**
- Ir em `/professional/automation-center`
- Tab "Histórico"
- Ver execução recente

**6.3 Perfil do Paciente**
- Ir em `/professional/patients/<PATIENT_ID>`
- Ver progress bar de aderência
- Verificar se está < 40%

---

## 🐛 POSSÍVEIS PROBLEMAS

### **Problema 1: Eventos não são criados**
**Causa:** Detector não está rodando
**Solução:** Rodar manualmente ou verificar scheduler

### **Problema 2: Worker não processa**
**Causa:** SUPABASE_SERVICE_ROLE_KEY não configurada
**Solução:** Adicionar no `.env` do backend

### **Problema 3: Notificações não aparecem**
**Causa:** Policy RLS bloqueando
**Solução:** Verificar policies da tabela `notifications`

### **Problema 4: Cooldown impedindo execução**
**Causa:** Regra já executou recentemente
**Solução:** Resetar cooldown ou aguardar

---

## 📊 MÉTRICAS DE SUCESSO

- ✅ Evento criado: `status = 'done'`
- ✅ Run registrado: `success = true`
- ✅ Notificação criada: `EXISTS` em notifications
- ✅ Cooldown registrado: `last_run_at` atualizado
- ✅ UI atualizada: Notificação visível

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Executar TESTE 1 (Setup)
2. ✅ Executar TESTE 2 (Marcar refeições)
3. ✅ Executar TESTE 3 (Emitir evento)
4. ✅ Executar TESTE 4 (Worker)
5. ✅ Executar TESTE 5 (Verificar notificação)
6. ✅ Executar TESTE 6 (UI)

---

## 📝 LOG DE TESTES

### Data: [A PREENCHER]
- [ ] TESTE 1: Setup ✅ / ❌
- [ ] TESTE 2: Refeições ✅ / ❌
- [ ] TESTE 3: Evento ✅ / ❌
- [ ] TESTE 4: Worker ✅ / ❌
- [ ] TESTE 5: Notificação ✅ / ❌
- [ ] TESTE 6: UI ✅ / ❌

**Observações:**
[Adicionar aqui problemas encontrados e soluções]
