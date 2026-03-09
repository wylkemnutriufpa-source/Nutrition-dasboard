# FitJourney 2.0 — PRD

## Problema Original
Consolidação de dois projetos:
- **FitJourney 2.0** (base): `nutrition-insights`, branch `projeto-fase-3-lovable` — plataforma React/FastAPI/Supabase com 54 páginas
- **FitJourney 1.0** (fonte): `nutrition-dashboard` — funcionalidades premium a serem migradas

## Regras
- Não reescrever o sistema
- Não duplicar páginas/módulos
- Reutilizar componentes existentes
- Preservar arquitetura multi-tenant

## Stack
- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: FastAPI (Python) + emergentintegrations (AI)
- **Banco de dados**: Supabase (PostgreSQL) — projeto `ifuiiycfrehjnmlzletw`
- **Auth**: Supabase Auth (JWT)
- **IA**: Emergent LLM Key (gpt-4o via emergentintegrations)

## URLs
- **Preview**: https://migrate-premium.preview.emergentagent.com
- **Supabase**: https://ifuiiycfrehjnmlzletw.supabase.co

## Arquitetura
```
/app                  # Frontend Vite (React/TS)
  /src/pages/         # 54 páginas
  /src/components/    # Componentes
  /src/integrations/  # Supabase client
  /supabase/          # Migrations SQL (34 arquivos)
/app/backend          # Backend FastAPI
  /app/main.py        # Entry point
  /app/routes/        # ai, meal, patient, upload
  /app/services/      # ai_service, supabase_client
  server.py           # Bridge para supervisor
/app/frontend         # Bridge para supervisor (yarn start)
  package.json        # start → cd /app && vite --port 3000
```

## O Que Foi Implementado

### Fase 0 — Infraestrutura + Recuperação de Módulos (Concluído 2026-03-09)
- ✅ Configuração completa do ambiente Emergent
- ✅ 34 migrations SQL aplicadas no novo banco Supabase `ifuiiycfrehjnmlzletw`
- ✅ ai_service.py migrado para emergentintegrations (gpt-4o)
- ✅ Landing page na raiz `/` para usuários não autenticados
- ✅ Usuário admin criado: wylkem.nutri.ufpa@gmail.com (roles: admin + nutritionist)
- ✅ Google login corrigido (Lovable OAuth → Supabase OAuth padrão)
- ✅ RECUPERAÇÃO: Clinical Dashboard restaurado para admin
- ✅ RECUPERAÇÃO: Protocolos, Programas, Receitas, Planos, Check-ins, Chat, Financeiro, Suplementação, Dicas - todos visíveis no menu admin
- ✅ RECUPERAÇÃO: Refresh loop corrigido (removida dupla inicialização auth - getSession + onAuthStateChange)
- ✅ Sidebar sem duplicatas (Configurações única, Automação única)
- ✅ Frontend rodando em https://migrate-premium.preview.emergentagent.com

## Roadmap (5 Fases)

### P0 — Fase 1: Controle de Features + Admin Avançado
- AdminFeatureControl.tsx — auditar e completar
- AdminResourceCenter.tsx — auditar e completar
- Painel de controle global de funcionalidades
- Central de recursos no painel admin
- Migrar lógica premium do FitJourney 1.0

### P1 — Fase 2: Expansão do sistema de Programs
- Expansão do "Projeto Biquíni Branco"
- Módulo de programas avançado

### P1 — Fase 3: Sistema de Dicas Inteligentes
- GlobalTips.tsx (já existe) — expandir
- Dicas baseadas em contexto do usuário

### P2 — Fase 4: Agenda Integrada
- Appointments.tsx (já existe) — expandir
- Integração com calendário

### P2 — Fase 5: Melhoria UX/UI Financeiro
- Financial.tsx — redesign e melhorias
- Relatórios financeiros avançados

## Credenciais (não commitar)
- Supabase URL: https://ifuiiycfrehjnmlzletw.supabase.co
- Emergent LLM Key: no backend/.env
- Supabase service key: no backend/.env
