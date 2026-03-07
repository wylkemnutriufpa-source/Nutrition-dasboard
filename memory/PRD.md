# FitJourney - PRD (Product Requirements Document)

## Problema Original
Plataforma de nutrição full-stack (React + FastAPI + Supabase/PostgreSQL) com gerenciamento de pacientes, profissionais e programas nutricionais.

## Arquitetura
- **Frontend:** React + Vite + Tailwind + Radix UI + Shadcn
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL) com Auth triggers
- **Auth:** Supabase Auth (JWT - HS256/ES256)

## Credenciais de Teste
- **Admin:** wylkem.nutri.ufpa@gmail.com / Admin123!
- **Admin UUID:** 177ff33f-f573-4a9c-aca1-1e4c55d94ece

## O que foi implementado

### Fase 1 - Segurança (DONE)
- Depoimentos restritos a admin
- Tratamento de erros 400 no frontend
- Endpoints de reset de senha (admin→prof, prof→patient)

### Fase 2 - Blindagem Operacional (DONE)
- Error Boundaries granulares
- useRequestGuard (anti-double-submit)
- Logs estruturados no backend
- Verificação de email duplicado

### Fase 3 - Projeto Biquíni Branco (IN PROGRESS)
- Tabelas: protocols, patient_protocols, protocol_tasks (DONE)
- Dashboard premium do paciente (DONE)
- Endpoints de backend para protocolos (DONE)
- Ativação de protocolo por profissional (DONE)
- PENDENTE: Conectar protocol_tasks ao checklist diário

### Fase 4 - Correções de Bugs (2026-03-07)
- Causa raiz do login de pacientes: backend agora usa senha do formulário
- Polling robusto: sleep(2) → 5 tentativas com retry
- backend/.env corrigido (linha 17 malformada)
- package_type e professional_id adicionados à subscription
- Limite de 3 pacientes TRIAL removido
- Diretórios duplicados removidos (lib/lib/, components/components/)
- Select components com position="popper" nos formulários

### Fase 5 - Score de Prioridade do Paciente (2026-03-07) (DONE)
- Backend service: backend/services/patient_scoring.py
- Score 0-100 com 6 fatores (checklist 40, login 20, feedback 10, peso 10, fotos 10, protocolos 10)
- API: GET /api/scoring/patients/{id}/score + POST /api/scoring/patients/scores (batch)
- Frontend: Badge numérico colorido na lista de pacientes

### Fase 6 - Fix Anamnese P0 (2026-03-07) (DONE)
- **Causa raiz:** 12 SelectContent sem position="popper" causavam perda de foco e navegação indevida
- **Correções aplicadas:**
  - position="popper" em todos os 12 SelectContent do AnamneseFormComplete
  - Autosave em localStorage como rascunho a cada mudança de campo
  - Restauração automática do rascunho ao voltar à tela
  - Guard beforeunload para prevenir perda ao fechar aba/refresh
  - Guard popstate para interceptar botão voltar do browser
  - Dialog de confirmação ao sair com dados não salvos
  - Auto-save no servidor a cada 30s agora funciona para novas anamneses
  - Removido showBack do Layout para evitar navegação acidental
  - Callback onDirtyChange para comunicar estado ao componente pai
  - Bug fix: cleanAnamnesisPayload adicionado ao supabase.js
- **Testes:** 100% (11/11 frontend tests passed)

## Backlog (Priorizado)

### P1
- Conectar protocol_tasks ao checklist diário do paciente (Projeto Biquíni Branco)
- Integração com motor de automação (eventos do programa + score)

### P2
- Evoluir Dashboard do Paciente (fotos comparativas, gráficos de peso)
- Editor completo de protocolos (AdminProjetoEditor)
- Refatorar supabase.js (4881 linhas) em módulos menores
- Tornar AdminBar.currentContext reativo
