# FitJourney - Nutrition Dashboard PRD

## 1. Visão Geral
Sistema de nutrição premium para profissionais de saúde gerenciarem planos alimentares de seus pacientes, com funcionalidades de IA para geração automática de planos.

## 2. Arquitetura
- **Frontend:** React + Tailwind CSS + Shadcn/UI
- **Backend:** Supabase (PostgreSQL + Auth + Functions)
- **Autenticação:** Supabase Auth

## 3. Funcionalidades Implementadas

### ✅ Sistema de Login Multi-Tipo
- Login Administrador
- Login Profissional
- Login Paciente
- Acesso Visitante

### ✅ Dashboard Profissional
- Gerenciamento de pacientes
- Estatísticas e métricas

### ✅ Editor de Planos Alimentares (`MealPlanEditor.js`)
- Interface dashboard premium com gradientes
- Adição/remoção de refeições
- Adição/remoção de alimentos
- Cálculo nutricional automático (kcal, proteína, carboidrato, gordura)
- Medidas caseiras (colher, xícara, etc.)

### ✅ Central de Planos (`PlanSchedulerSidebar.js`)
- Visualização do plano atual
- Planos programados (scheduled)
- Criação de IA Plans
- Drawer para edição de planos programados

### ✅ Sistema de Meal Templates (Novo - 2026-03-04)
- Componente `MealTemplatesPanel.js`
- Funções no `supabase.js`: getMealTemplates, createMealTemplate, updateMealTemplate, deleteMealTemplate
- Botão "Modelo" em cada refeição para salvar como template
- Painel compacto na sidebar para aplicar templates existentes

### ✅ Calculadora de Nutrientes (`nutritionCalculator.js`)
- Função centralizada `calculateNutrition`
- Suporte a medidas caseiras
- Conversão automática de unidades

### ✅ IA Plan (Renomeado de "Pré-Plano")
- Gerador de planos baseado em anamnese
- Estilos: Clássico Brasileiro, Prático e Rápido, Proteico, Low Carb, Mediterrâneo, Fitness

## 4. Pendências/Issues

### 🔴 P0 - Bug Crítico: Salvamento de Plano Programado
**Status:** EM INVESTIGAÇÃO
- O salvamento de planos scheduled pode falhar devido a RLS policies
- Possível causa: auth.uid() não está sendo reconhecido corretamente

### 🟠 P1 - Automações Editáveis (PRO)
**Status:** NÃO INICIADO
- Permitir edição de templates de automação para usuários PRO

### 🟠 P1 - Integrar IA Plan Generator
**Status:** NÃO INICIADO
- Botão "Gerar com IA Plan" no drawer do scheduler

### 🟡 P2 - Integrar Receitas
**Status:** NÃO INICIADO
- Adicionar seção "Receitas" no editor e scheduler

## 5. Tabelas do Banco de Dados

### Existentes
- `profiles` - Usuários (admin, professional, patient, visitor)
- `patient_profiles` - Vínculo profissional-paciente
- `meal_plans` - Planos alimentares
- `meal_plan_transitions` - Histórico de mudanças de status
- `anamnesis` - Dados de anamnese do paciente
- `foods_v2` - Base de alimentos TACO/USDA
- `custom_foods` - Alimentos customizados pelo profissional
- `automation_rules` - Regras de automação

### Novas (Aguardando execução do SQL)
- `meal_templates` - Modelos de refeições salvos pelo profissional

## 6. SQL Pendente de Execução

Arquivo: `/app/sql/meal_templates_setup.sql`
- Criar tabela `meal_templates`
- Configurar RLS policies
- Criar índices
- Função `increment_template_use`

## 7. Arquivos de Referência

- `/app/frontend/src/pages/MealPlanEditor.js` - Editor principal
- `/app/frontend/src/components/PlanSchedulerSidebar.js` - Sidebar de planos
- `/app/frontend/src/components/MealTemplatesPanel.js` - Painel de templates
- `/app/frontend/src/lib/supabase.js` - Funções do backend
- `/app/frontend/src/utils/nutritionCalculator.js` - Cálculos nutricionais
- `/app/sql/hardening_v5.sql` - Multi-planos engine
- `/app/sql/meal_templates_setup.sql` - Setup de meal templates

## 8. Próximos Passos

1. Executar SQL de `meal_templates_setup.sql` no Supabase
2. Testar funcionalidade de salvar/aplicar templates
3. Investigar e corrigir bug de salvamento de planos programados
4. Implementar automações editáveis para PRO
5. Integrar IA Plan generator no drawer

---
Última atualização: 2026-03-04
