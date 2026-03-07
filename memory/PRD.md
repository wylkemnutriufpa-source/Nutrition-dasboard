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
- **PENDENTE:** Conectar protocol_tasks ao checklist diário

### Fase 4 - Correções de Bugs (2026-03-07)
- ✅ Causa raiz do login de pacientes: backend ignorava senha do formulário
  - Adicionado campo `password` ao CreatePatientRequest
  - Backend usa senha do form (se >= 6 chars) em vez de aleatória
  - Resposta inclui `password_set: true/false`
- ✅ Polling robusto: sleep(2) substituído por 5 tentativas com 1s entre cada
- ✅ backend/.env linha 17 malformada corrigida
- ✅ package_type adicionado à criação de subscription
- ✅ professional_id adicionado à criação de subscription
- ✅ Limite de 3 pacientes TRIAL removido
- ✅ Diretórios duplicados removidos (lib/lib/, components/components/)
- ✅ Select components com position="popper" (fix formulário)

## Backlog (Priorizado)

### P1
- Conectar protocol_tasks ao checklist diário do paciente
- Integração com motor de automação (eventos do programa)
- Revisar race condition no login (AuthContext vs pendingLogin)

### P2
- Evoluir Dashboard do Paciente (fotos comparativas, gráficos de peso)
- Editor completo de protocolos (AdminProjetoEditor)
- Refatorar supabase.js (4881 linhas) em módulos menores
- Tornar AdminBar.currentContext reativo
