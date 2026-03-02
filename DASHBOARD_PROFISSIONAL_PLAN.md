# 📋 PLANEJAMENTO - Dashboard Profissional Inteligente

## 🎯 OBJETIVO
Transformar o Dashboard do Profissional em um **Cockpit Inteligente** com:
- Controle Operacional
- Visão Estratégica  
- Inteligência Preditiva

---

## 📦 1. ESTRUTURA DE COMPONENTES

### Novos Arquivos a Criar

#### 1.1 Utilitários
```
/app/frontend/src/utils/professionalIntelligence.js
```
**Responsabilidade:** Lógica de cálculo de métricas e scores

**Funções exportadas:**
- `calculatePatientEngagementScore(patient, stats)` → Score 0-100
- `classifyEngagement(score)` → { level, color, icon, label }
- `detectAttentionNeeded(patients)` → Array de alertas priorizados
- `calculateAverageEngagement(patients)` → Número %
- `calculateActiveInactive(patients)` → { active, inactive }
- `aggregateMonthlyRevenue(patients, plans)` → Valor R$

#### 1.2 Componentes de Dashboard
```
/app/frontend/src/components/dashboard/MetricCard.js
```
**Props:** `{ title, value, subtitle, icon, color, trend }`
**Responsabilidade:** Card de métrica reutilizável

```
/app/frontend/src/components/dashboard/AttentionAlert.js  
```
**Props:** `{ alerts, onAction }`
**Responsabilidade:** Lista de alertas com ações rápidas

```
/app/frontend/src/components/dashboard/QuickActionsGrid.js
```
**Props:** `{ actions }`
**Responsabilidade:** Grid de botões de ação rápida

```
/app/frontend/src/components/dashboard/SimpleEngagementChart.js
```
**Props:** `{ data, type }`
**Responsabilidade:** Gráfico simples com SVG nativo (sem biblioteca)

```
/app/frontend/src/components/dashboard/PatientEngagementBadge.js
```
**Props:** `{ score, size }`
**Responsabilidade:** Badge colorido de engajamento

#### 1.3 Hooks Customizados
```
/app/frontend/src/hooks/useProfessionalDashboard.js
```
**Responsabilidade:** Centralizar todas as queries do dashboard

**Retorno:**
```javascript
{
  loading,
  metrics: { activePatients, inactivePatients, avgEngagement, revenue, activePlans },
  attentionAlerts: [{ id, patientId, type, message, priority, action }],
  patientsWithScore: [{ ...patient, engagementScore, classification }],
  chartData: { labels, values }
}
```

---

## 📝 2. ARQUIVOS A MODIFICAR

### 2.1 ProfessionalDashboard.js
**Caminho:** `/app/frontend/src/pages/ProfessionalDashboard.js`

**Mudanças:**
- Substituir conteúdo atual por novo layout
- Importar componentes de dashboard
- Usar hook `useProfessionalDashboard`
- Manter lógica de autenticação intacta
- Adicionar seções:
  1. Visão Executiva (Cards)
  2. Atenção Hoje
  3. Ações Rápidas
  4. Mini Gráfico
  5. Lista de Pacientes com Score

### 2.2 Layout.js (Menu Lateral)
**Caminho:** `/app/frontend/src/components/Layout.js`

**Mudanças:**
- Reorganizar menu em grupos visuais
- Adicionar separadores
- Manter todos os links existentes
- Melhorar hierarquia visual

**Estrutura:**
```
PRINCIPAL
├─ Dashboard
├─ Pacientes
├─ Agenda
└─ Financeiro

CONTEÚDO
├─ Planos
├─ Receitas
├─ Alimentos
└─ Dicas

CONFIGURAÇÕES
├─ Projeto
├─ Personalização
└─ Configurações
```

### 2.3 MealPlanEditor.js (Corrigir Bug)
**Caminho:** `/app/frontend/src/pages/MealPlanEditor.js`

**Bug:** Menu do paciente mostra "Excluir Refeição" e "Duplicar"

**Correção:**
```javascript
// Esconder ações de edição quando userType === 'patient'
{userType === 'professional' && (
  <>
    <Button onClick={duplicateMeal}>Duplicar</Button>
    <Button onClick={deleteMeal}>Excluir</Button>
  </>
)}
```

---

## 🗄️ 3. ESTRATÉGIA DE QUERIES NO BANCO

### 3.1 Query Principal - Dashboard Stats
**Função no Supabase:** `getProfessionalDashboardData(professionalId)`

**Retorna:**
```javascript
{
  patients: [
    {
      id,
      name,
      email,
      last_login,
      created_at,
      goal_weight,
      current_weight,
      // Stats agregados
      checklist_completion_7d: 85, // %
      last_weight_update: '2026-02-20',
      pending_feedbacks: 2,
      next_appointment: '2026-03-05',
      has_active_plan: true
    }
  ],
  aggregated: {
    total_patients: 50,
    active_patients: 42,
    inactive_patients: 8,
    avg_engagement: 73.5,
    total_plans: 45,
    monthly_revenue: 12500.00
  }
}
```

**Implementação:**
```sql
-- Pacientes com estatísticas agregadas
SELECT 
  p.id,
  p.name,
  p.email,
  p.last_login,
  p.created_at,
  -- Checklist completion
  (SELECT COUNT(*)::float / NULLIF(COUNT(*), 0) * 100 
   FROM checklist_tasks 
   WHERE patient_id = p.id 
   AND created_at >= NOW() - INTERVAL '7 days'
   AND completed = true) as checklist_completion_7d,
  -- Outras agregações...
FROM profiles p
WHERE p.professional_id = $1
AND p.role = 'patient'
```

### 3.2 Otimizações
- **Single query** com LEFT JOINs para evitar N+1
- **Agregações no banco** (não no frontend)
- **Cache de 5 minutos** para métricas gerais
- **Paginação** para lista de pacientes (se >50)

---

## 🧮 4. CÁLCULO DO SCORE DE ENGAJAMENTO

### Fórmula (0-100 pontos)

```javascript
Score = (
  checklistScore * 0.40 +
  weightUpdateScore * 0.20 +
  feedbackScore * 0.20 +
  appointmentScore * 0.20
)
```

### Detalhamento

#### 4.1 Checklist (40 pontos)
```javascript
// % de tarefas completadas nos últimos 7 dias
checklistScore = (completedTasks / totalTasks) * 40
```

#### 4.2 Atualização de Peso (20 pontos)
```javascript
// Últimos 14 dias
const daysSinceUpdate = Math.floor((today - lastWeightUpdate) / (1000*60*60*24))
if (daysSinceUpdate <= 7) weightUpdateScore = 20
else if (daysSinceUpdate <= 14) weightUpdateScore = 15
else if (daysSinceUpdate <= 30) weightUpdateScore = 10
else weightUpdateScore = 0
```

#### 4.3 Feedback (20 pontos)
```javascript
// Feedbacks respondidos nos últimos 7 dias
const respondedFeedbacks = feedbacks.filter(f => f.patient_response && isRecent(f))
feedbackScore = Math.min((respondedFeedbacks.length / 2) * 20, 20)
```

#### 4.4 Presença na Agenda (20 pontos)
```javascript
// Tem consulta agendada nos próximos 30 dias
appointmentScore = hasUpcomingAppointment ? 20 : 5
```

### Classificação Visual

```javascript
function classifyEngagement(score) {
  if (score >= 80) return { 
    level: 'high', 
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: '🟢',
    label: 'Engajado' 
  }
  if (score >= 50) return { 
    level: 'medium', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: '🟡',
    label: 'Atenção' 
  }
  return { 
    level: 'low', 
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: '🔴',
    label: 'Risco' 
  }
}
```

---

## 🚨 5. LÓGICA DE ALERTAS "ATENÇÃO HOJE"

### Tipos de Alerta (Priorizados)

#### 5.1 Novo Paciente Sem Plano (P1 - Alta)
```javascript
{
  type: 'no_plan',
  priority: 1,
  icon: '📋',
  message: 'Novo paciente aguardando plano',
  patientId: xxx,
  actions: [
    { label: 'Criar Plano', link: `/professional/patient/${id}/plano` }
  ]
}
```

#### 5.2 Sem Checklist Hoje (P2 - Média)
```javascript
{
  type: 'no_checklist_today',
  priority: 2,
  icon: '⚠️',
  message: 'Não marcou checklist hoje',
  patientId: xxx,
  actions: [
    { label: 'Enviar Lembrete', action: 'sendReminder' },
    { label: 'Ver Perfil', link: `/professional/patient/${id}` }
  ]
}
```

#### 5.3 Inativo 3+ Dias (P2 - Média)
```javascript
{
  type: 'inactive_3d',
  priority: 2,
  icon: '😴',
  message: '3+ dias sem atividade',
  patientId: xxx,
  actions: [
    { label: 'Enviar Feedback', action: 'sendFeedback' },
    { label: 'Ver Perfil', link: `/professional/patient/${id}` }
  ]
}
```

#### 5.4 Sem Feedback 7+ Dias (P3 - Baixa)
```javascript
{
  type: 'no_feedback_7d',
  priority: 3,
  icon: '💬',
  message: 'Sem feedback há 7 dias',
  patientId: xxx,
  actions: [
    { label: 'Enviar Feedback', action: 'sendFeedback' }
  ]
}
```

### Limite de Exibição
- Máximo 5 alertas por vez
- Ordenados por prioridade + data

---

## 🎨 6. DESIGN E UX

### Paleta de Cores
- **Cards:** Bordas sutis, sombras leves
- **Métricas positivas:** Verde (#10B981)
- **Atenção:** Amarelo (#F59E0B)
- **Crítico:** Vermelho (#EF4444)
- **Neutro:** Cinza (#6B7280)

### Responsividade
- **Desktop:** Grid 4 colunas para cards
- **Tablet:** Grid 2 colunas
- **Mobile:** Stack vertical

### Animações
- Hover suave nos cards (scale 1.02)
- Transições de 200ms
- Loading skeleton para métricas

---

## ⚡ 7. PERFORMANCE

### Estratégias

#### 7.1 Queries Otimizadas
- ✅ Agregações no banco (não no frontend)
- ✅ Single query com JOINs
- ✅ Índices nas colunas filtradas
- ✅ Limit/Offset para paginação

#### 7.2 Frontend
- ✅ useCallback para funções
- ✅ useMemo para cálculos pesados
- ✅ Evitar loops de useEffect
- ✅ Debounce em buscas

#### 7.3 Cache
- ✅ Cache de 5min para métricas gerais
- ✅ Invalidação ao criar/editar plano
- ✅ SWR ou React Query (futuro)

---

## 📊 8. MINI GRÁFICO ESTRATÉGICO

### Opção Escolhida: Adesão ao Checklist (7 dias)

**Dados:**
```javascript
{
  labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  values: [75, 80, 72, 85, 90, 65, 70] // % médio
}
```

**Implementação:**
- SVG nativo (sem bibliotecas)
- Linha simples com gradient
- Responsivo
- Tooltip ao hover

**Alternativa:** Caso queira biblioteca leve → Recharts (15kb)

---

## 🔧 9. IMPLEMENTAÇÃO INCREMENTAL

### Fase 1: Estrutura Base
1. Corrigir bug do menu paciente
2. Criar `professionalIntelligence.js`
3. Criar componentes de dashboard

### Fase 2: Hook Centralizado
4. Criar `useProfessionalDashboard.js`
5. Implementar queries no Supabase

### Fase 3: Dashboard Principal
6. Refatorar `ProfessionalDashboard.js`
7. Adicionar seções

### Fase 4: Menu e Polimento
8. Reorganizar menu lateral
9. Testes e ajustes

---

## ✅ CHECKLIST DE VALIDAÇÃO

Antes de finalizar:
- [ ] Não quebrou rotas existentes
- [ ] Não quebrou autenticação
- [ ] Métricas mostram dados reais
- [ ] Alertas são acionáveis
- [ ] Performance mantida (<2s carregamento)
- [ ] Responsivo em mobile
- [ ] Sem loops de useEffect
- [ ] Código documentado

---

## 🚀 PRÓXIMOS PASSOS

Após aprovação deste plano:
1. Implementar correção do bug do menu
2. Criar componentes base
3. Implementar hook e queries
4. Refatorar dashboard
5. Testar com dados reais
6. Entregar resumo final

---

**Aguardando aprovação para iniciar implementação! 🎯**
