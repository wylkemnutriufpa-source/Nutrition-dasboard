# 📋 PLANEJAMENTO COMPLETO - TEMPLATES GLOBAIS + EMERGÊNCIA SOS

## 🎯 VISÃO GERAL

Duas funcionalidades estratégicas para transformar a plataforma em SaaS Premium:
1. **Sistema de Templates Globais** (Profissional → Todos Pacientes)
2. **Botão de Emergência (SOS)** (Paciente → Nutricionista)

---

## 🗄️ PARTE 1 - ESTRUTURA DE TABELAS

### 1.1 Tabelas Existentes (Verificadas)

#### `checklist_tasks` (JÁ EXISTE)
```sql
-- Usada para instâncias de tarefas do paciente
id UUID PRIMARY KEY
patient_id UUID REFERENCES profiles(id)
title TEXT NOT NULL
completed BOOLEAN DEFAULT false
created_at TIMESTAMP
```

#### `personalized_tips` (JÁ EXISTE)
```sql
-- Usada para dicas personalizadas
id UUID PRIMARY KEY
patient_id UUID REFERENCES profiles(id)
professional_id UUID REFERENCES profiles(id)
title TEXT
content TEXT
category TEXT
priority TEXT
is_pinned BOOLEAN
created_at TIMESTAMP
```

#### `feedbacks` (JÁ EXISTE)
```sql
-- Sistema de feedback profissional → paciente
id UUID PRIMARY KEY
patient_id UUID REFERENCES profiles(id)
professional_id UUID REFERENCES profiles(id)
message TEXT NOT NULL
patient_response TEXT
created_at TIMESTAMP
```

---

### 1.2 Novas Tabelas a Criar

#### ✅ `professional_templates` (UNIFICADA - Melhor abordagem)
```sql
CREATE TABLE professional_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checklist', 'task', 'tip')),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Para dicas
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_professional_templates_professional ON professional_templates(professional_id);
CREATE INDEX idx_professional_templates_type ON professional_templates(type);
CREATE INDEX idx_professional_templates_active ON professional_templates(is_active);

-- RLS
ALTER TABLE professional_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profissionais podem ver seus templates"
  ON professional_templates FOR SELECT
  USING (auth.uid() = professional_id);

CREATE POLICY "Profissionais podem criar templates"
  ON professional_templates FOR INSERT
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Profissionais podem editar seus templates"
  ON professional_templates FOR UPDATE
  USING (auth.uid() = professional_id);

CREATE POLICY "Profissionais podem deletar seus templates"
  ON professional_templates FOR DELETE
  USING (auth.uid() = professional_id);
```

---

### 1.3 Modificações em Tabelas Existentes

#### ✅ Adicionar campos em `checklist_tasks`
```sql
ALTER TABLE checklist_tasks
ADD COLUMN source_template_id UUID REFERENCES professional_templates(id) ON DELETE SET NULL,
ADD COLUMN is_customized BOOLEAN DEFAULT false,
ADD COLUMN is_disabled BOOLEAN DEFAULT false,
ADD COLUMN professional_id UUID REFERENCES profiles(id);

CREATE INDEX idx_checklist_tasks_template ON checklist_tasks(source_template_id);
```

#### ✅ Adicionar campos em `personalized_tips`
```sql
ALTER TABLE personalized_tips
ADD COLUMN source_template_id UUID REFERENCES professional_templates(id) ON DELETE SET NULL,
ADD COLUMN is_customized BOOLEAN DEFAULT false,
ADD COLUMN is_disabled BOOLEAN DEFAULT false;

CREATE INDEX idx_personalized_tips_template ON personalized_tips(source_template_id);
```

#### ✅ Adicionar campos em `feedbacks`
```sql
ALTER TABLE feedbacks
ADD COLUMN type TEXT DEFAULT 'normal' CHECK (type IN ('normal', 'emergency')),
ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
ADD COLUMN category TEXT;

CREATE INDEX idx_feedbacks_type ON feedbacks(type);
CREATE INDEX idx_feedbacks_priority ON feedbacks(priority);
CREATE INDEX idx_feedbacks_status ON feedbacks(status);
```

---

## 🔄 PARTE 2 - ESTRATÉGIA DE PROPAGAÇÃO

### 2.1 Abordagem Escolhida: **LAZY + EAGER HÍBRIDA**

#### Quando criar Template:
1. **Criar registro** em `professional_templates`
2. **Não instanciar imediatamente** (lazy)
3. **Instanciar sob demanda:**
   - Quando paciente abre dashboard
   - Quando profissional visualiza perfil do paciente
   - Via função: `syncTemplatesForPatient(patientId)`

#### Vantagens:
- ✅ Performance (não cria 1000 registros de uma vez)
- ✅ Flexível (templates futuros para novos pacientes)
- ✅ Escalável

---

### 2.2 Função de Sincronização

```sql
CREATE OR REPLACE FUNCTION sync_templates_for_patient(p_patient_id UUID)
RETURNS void AS $$
DECLARE
  template RECORD;
BEGIN
  -- Para cada template ativo do profissional do paciente
  FOR template IN 
    SELECT t.*
    FROM professional_templates t
    INNER JOIN profiles p ON p.professional_id = t.professional_id
    WHERE p.id = p_patient_id
      AND t.is_active = true
  LOOP
    -- Checklist
    IF template.type = 'checklist' THEN
      INSERT INTO checklist_tasks (
        patient_id,
        professional_id,
        title,
        source_template_id,
        is_customized,
        is_disabled
      )
      SELECT
        p_patient_id,
        template.professional_id,
        template.title,
        template.id,
        false,
        false
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_tasks
        WHERE patient_id = p_patient_id
          AND source_template_id = template.id
      );
    END IF;

    -- Tips
    IF template.type = 'tip' THEN
      INSERT INTO personalized_tips (
        patient_id,
        professional_id,
        title,
        content,
        category,
        source_template_id,
        is_customized,
        is_disabled
      )
      SELECT
        p_patient_id,
        template.professional_id,
        template.title,
        template.content,
        template.category,
        template.id,
        false,
        false
      WHERE NOT EXISTS (
        SELECT 1 FROM personalized_tips
        WHERE patient_id = p_patient_id
          AND source_template_id = template.id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

### 2.3 Função de Atualização de Template

```sql
CREATE OR REPLACE FUNCTION update_template_instances(
  p_template_id UUID,
  p_new_title TEXT,
  p_new_content TEXT
)
RETURNS void AS $$
BEGIN
  -- Atualizar template
  UPDATE professional_templates
  SET title = p_new_title,
      content = p_new_content,
      updated_at = NOW()
  WHERE id = p_template_id;

  -- Atualizar instâncias não customizadas
  UPDATE checklist_tasks
  SET title = p_new_title
  WHERE source_template_id = p_template_id
    AND is_customized = false
    AND is_disabled = false;

  UPDATE personalized_tips
  SET title = p_new_title,
      content = p_new_content
  WHERE source_template_id = p_template_id
    AND is_customized = false
    AND is_disabled = false;
END;
$$ LANGUAGE plpgsql;
```

---

## 📂 PARTE 3 - ARQUIVOS FRONTEND A MODIFICAR/CRIAR

### 3.1 Novos Componentes

```
/app/frontend/src/pages/
├── ProfessionalTemplates.js (NOVO)
└── ProfessionalTemplatesManager.js (NOVO - componente interno)

/app/frontend/src/components/
├── TemplateCard.js (NOVO)
├── TemplateForm.js (NOVO)
├── EmergencyButton.js (NOVO - floating button)
└── EmergencyModal.js (NOVO - modal SOS)
```

### 3.2 Arquivos a Modificar

#### **Backend/Queries:**
```
/app/frontend/src/lib/supabase.js
```
Adicionar funções:
- `getProfessionalTemplates(professionalId, type)`
- `createTemplate(professionalId, data)`
- `updateTemplate(templateId, data)`
- `deleteTemplate(templateId)`
- `syncTemplatesForPatient(patientId)`
- `getPatientInstancesWithSource(patientId)`
- `disableTemplateForPatient(patientId, templateId)`
- `createEmergencyFeedback(patientId, data)`
- `getProfessionalEmergencies(professionalId)`
- `updateFeedbackStatus(feedbackId, status)`

#### **Páginas do Profissional:**
```
/app/frontend/src/pages/ProfessionalDashboard.js
```
- Adicionar botão "Gerenciar Templates Globais"

```
/app/frontend/src/pages/FeedbacksList.js (se existir) OU criar
```
- Adicionar filtro "Somente Emergências"
- Badge vermelho para emergências
- Botão "Resolver"

```
/app/frontend/src/pages/PatientProfile.js
```
- Modificar exibição de checklist/dicas
- Mostrar badge "GLOBAL" ou "PERSONALIZADO"
- Botão "Desativar para este paciente"

#### **Páginas do Paciente:**
```
/app/frontend/src/pages/PatientDashboard.js
/app/frontend/src/pages/MinhaJornada.js
/app/frontend/src/pages/MealPlanEditor.js (quando paciente visualiza)
```
- Adicionar `<EmergencyButton />` em todas

```
/app/frontend/src/components/Layout.js
```
- Se userType === 'patient', renderizar `<EmergencyButton />`

---

## 🔄 PARTE 4 - FLUXO DE FUNCIONAMENTO

### 4.1 Templates Globais

#### 📝 Criar Template (Profissional)
1. Profissional acessa "Templates Globais"
2. Seleciona tipo (Checklist | Dica)
3. Preenche título + descrição/conteúdo
4. Clica "Criar e Aplicar a Todos"
5. **Backend:**
   - Cria registro em `professional_templates`
   - **Não instancia imediatamente** (lazy)
6. Toast: "Template criado! Será aplicado aos pacientes automaticamente."

#### 👁️ Visualizar Perfil do Paciente (Profissional)
1. Profissional abre perfil do paciente
2. **Backend chama:** `syncTemplatesForPatient(patientId)`
3. Função verifica templates ativos do profissional
4. Cria instâncias que não existem ainda
5. Frontend exibe:
   - Lista de tarefas com badge "🌍 GLOBAL" ou "👤 PERSONALIZADO"

#### ✏️ Editar Template (Profissional)
1. Profissional edita template
2. **Backend chama:** `update_template_instances(templateId, ...)`
3. Atualiza template + instâncias não customizadas
4. Toast: "Template atualizado! Afetou X pacientes."

#### 🚫 Desativar para Paciente Específico
1. Profissional no perfil do paciente clica "Desativar este item"
2. **Backend:** `UPDATE ... SET is_disabled = true WHERE ...`
3. Item continua no template global, mas não aparece para aquele paciente

#### ✏️ Paciente Customiza Item
1. Paciente edita título/descrição da tarefa
2. **Backend:** `UPDATE ... SET is_customized = true WHERE ...`
3. Futuras edições do template não afetam este item

---

### 4.2 Botão de Emergência (SOS)

#### 🆘 Criar Emergência (Paciente)
1. Paciente clica botão floating "🆘 Emergência"
2. Modal abre com:
   - Select categoria (Compulsão, Ansiedade, Dor, Dificuldade no plano, Outro)
   - Textarea obrigatório (min 10 chars)
   - Botão "Enviar para meu Nutricionista"
3. **Validação:** Limitar 1 a cada 5 minutos (localStorage)
4. **Backend:**
   ```javascript
   createEmergencyFeedback({
     patient_id: patientId,
     professional_id: professionalId,
     message: textarea,
     category: select,
     type: 'emergency',
     priority: 'high',
     status: 'open'
   })
   ```
5. Toast: "🆘 Emergência enviada! Seu nutricionista será notificado."

#### 👨‍⚕️ Ver Emergências (Profissional)
1. Dashboard mostra badge vermelho: "3 Emergências"
2. Profissional acessa "Feedbacks"
3. Emergências aparecem no topo com:
   - Badge "🆘 EMERGÊNCIA"
   - Categoria + mensagem
   - Botão "Responder"
   - Botão "Marcar como Resolvida"
4. Filtro: "Somente Emergências Abertas"

#### ✅ Resolver Emergência
1. Profissional clica "Marcar como Resolvida"
2. **Backend:** `UPDATE feedbacks SET status = 'resolved' WHERE id = ...`
3. Emergência sai da lista de abertas

---

## ⚡ PARTE 5 - OTIMIZAÇÕES DE PERFORMANCE

### 5.1 Queries Otimizadas

#### Buscar instâncias com info do template:
```sql
SELECT
  ct.*,
  pt.title as template_title,
  CASE
    WHEN ct.source_template_id IS NULL THEN 'PERSONALIZADO'
    ELSE 'GLOBAL'
  END as source_type
FROM checklist_tasks ct
LEFT JOIN professional_templates pt ON pt.id = ct.source_template_id
WHERE ct.patient_id = $1
  AND ct.is_disabled = false
ORDER BY ct.created_at DESC;
```

#### Contar emergências abertas:
```sql
SELECT COUNT(*)
FROM feedbacks
WHERE professional_id = $1
  AND type = 'emergency'
  AND status = 'open';
```

### 5.2 Estratégias de Cache

- **Templates:** Cache de 5 minutos no frontend
- **Emergências:** Polling a cada 30s OU WebSocket (futuro)
- **Sincronização:** Executar 1x por sessão do paciente

---

## 🎨 PARTE 6 - UI/UX DETALHADA

### 6.1 Tela de Templates Globais (Profissional)

```
┌─────────────────────────────────────────────────┐
│ Templates Globais                        [+ Novo]│
├─────────────────────────────────────────────────┤
│ Tabs:  [Checklist] [Dicas]                      │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ 🔘 Beber 2L de água                     [⚙️] │ │
│ │    🌍 Aplicado a 42 pacientes                │ │
│ │    ✏️ Editar  |  🗑️ Deletar                 │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🔘 Exercício 30 min                     [⚙️] │ │
│ │    🌍 Aplicado a 42 pacientes                │ │
│ │    ✏️ Editar  |  🗑️ Deletar                 │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 6.2 Perfil do Paciente - Checklist (Profissional)

```
┌─────────────────────────────────────────────────┐
│ Checklist de João Silva                         │
├─────────────────────────────────────────────────┤
│ ☑️ Beber 2L de água           [🌍 GLOBAL]  [🚫] │
│ ☐ Exercício 30 min            [🌍 GLOBAL]  [🚫] │
│ ☑️ Pesar pela manhã           [👤 PERSON.] [✏️] │
└─────────────────────────────────────────────────┘

🚫 = Desativar para este paciente
✏️ = Editar (ao editar, vira PERSONALIZADO)
```

### 6.3 Botão de Emergência (Paciente)

```
Floating button no canto inferior direito:

   ┌──────┐
   │ 🆘   │  <- Vermelho, pulsante
   │ SOS  │
   └──────┘
```

### 6.4 Modal de Emergência

```
┌───────────────────────────────────────┐
│  🆘 Preciso de Ajuda Urgente          │
├───────────────────────────────────────┤
│ Categoria:                            │
│ [🍔 Compulsão/Fome           ▼]       │
│                                       │
│ Descreva sua dificuldade:             │
│ ┌───────────────────────────────────┐ │
│ │                                   │ │
│ │                                   │ │
│ │                                   │ │
│ └───────────────────────────────────┘ │
│                                       │
│    [Cancelar]  [Enviar ao Nutricionista]│
└───────────────────────────────────────┘
```

---

## ✅ PARTE 7 - CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Database
- [ ] Criar tabela `professional_templates`
- [ ] Alterar `checklist_tasks` (add campos)
- [ ] Alterar `personalized_tips` (add campos)
- [ ] Alterar `feedbacks` (add campos)
- [ ] Criar função `sync_templates_for_patient()`
- [ ] Criar função `update_template_instances()`
- [ ] Configurar RLS

### Fase 2: Backend (Supabase.js)
- [ ] `getProfessionalTemplates()`
- [ ] `createTemplate()`
- [ ] `updateTemplate()`
- [ ] `deleteTemplate()`
- [ ] `syncTemplatesForPatient()`
- [ ] `getPatientInstancesWithSource()`
- [ ] `disableTemplateForPatient()`
- [ ] `createEmergencyFeedback()`
- [ ] `getProfessionalEmergencies()`
- [ ] `updateFeedbackStatus()`

### Fase 3: Componentes UI
- [ ] `TemplateCard.js`
- [ ] `TemplateForm.js`
- [ ] `EmergencyButton.js`
- [ ] `EmergencyModal.js`

### Fase 4: Páginas
- [ ] `ProfessionalTemplates.js` (nova)
- [ ] Modificar `PatientProfile.js` (badges)
- [ ] Modificar `PatientDashboard.js` (botão SOS)
- [ ] Modificar `MinhaJornada.js` (botão SOS)
- [ ] Criar/Modificar `FeedbacksList.js`

### Fase 5: Testes
- [ ] Criar template → verificar lazy load
- [ ] Editar template → verificar propagação
- [ ] Desativar para paciente → verificar
- [ ] Enviar emergência → verificar
- [ ] Resolver emergência → verificar

---

## 🚀 PRÓXIMOS PASSOS

**Aguardando aprovação para:**
1. Executar SQL de criação/alteração de tabelas
2. Implementar funções no Supabase
3. Criar componentes UI
4. Integrar nas páginas existentes
5. Testar fluxo completo

**Tempo estimado:** 2-3 horas de implementação

---

**Documento pronto para revisão! 📋✅**
