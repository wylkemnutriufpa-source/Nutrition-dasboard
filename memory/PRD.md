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
- Select components com position="popper"

### Fase 5 - Score de Prioridade do Paciente (2026-03-07) (DONE)
- **Backend service**: `backend/services/patient_scoring.py`
  - Score determinístico 0-100 com 6 fatores:
    - checklist_adherence (40pts), recency_login (20pts), feedback (10pts), peso (10pts), fotos (10pts), protocolos (10pts)
  - Faixas: green (80-100 Engajado), yellow (50-79 Atenção), red (0-49 Risco alto)
  - Alertas acionáveis gerados automaticamente
  - Handles missing data gracefully (neutral scores)
- **Backend routes**: `backend/routes/patient_scoring.py`
  - GET /api/scoring/patients/{id}/score (single)
  - POST /api/scoring/patients/scores (batch, max 100)
- **Frontend**: Score badge integrado na lista de pacientes
  - Badge numérico colorido (verde/amarelo/vermelho)
  - Label (Engajado/Atenção/Risco alto) + alertas
  - Versão compacta em telas menores
- **Ganchos para automação futura**: patient.score_dropped, patient.score_critical, patient.ready_for_next_phase
- **Testes**: 100% (13/13 backend, todos frontend)

## Backlog (Priorizado)

### P1
- Conectar protocol_tasks ao checklist diário do paciente (Projeto Biquíni Branco)
- Integração com motor de automação (eventos do programa)
- Automação de score: patient.score_dropped → notificar profissional

### P2
- Evoluir Dashboard do Paciente (fotos comparativas, gráficos de peso)
- Editor completo de protocolos (AdminProjetoEditor)
- Refatorar supabase.js (4881 linhas) em módulos menores
- Tornar AdminBar.currentContext reativo
