# 🔒 PLANO DE CORREÇÃO: Autenticação + Role Guards

## 📋 PROBLEMAS IDENTIFICADOS

### **1. BYPASS DE AUTENTICAÇÃO**
- ✅ Localizado em: `/app/frontend/src/lib/supabase.js:312`
- ❌ Linha: `USE_BYPASS = true`
- ❌ Cria paciente com `auth_user_id = null`
- ❌ Paciente sem acesso ao sistema

### **2. ERROS ENCONTRADOS (9 bugs)**
1. ❌ Perfil paciente → Receitas dando erro
2. ❌ IAs devem ser bloqueadas para paciente
3. ❌ Menu paciente vendo "Plano" como profissional
4. ❌ Paciente acessando "Biquini Branco" (admin only)
5. ❌ Erro de senha: "body stream already read"
6. ❌ Arquivar paciente não funciona/sem botão excluir
7. ❌ Profissional Basic tendo ações PRO
8. ❌ Profissional acessando "Biquini Branco" (admin only)
9. ❌ (Adicionar se houver mais)

---

## 🎯 SOLUÇÃO: ETAPAS

### **ETAPA 1: Backend - Criar Endpoint Admin** ⏱️ 30min
- [ ] Criar `/app/backend/routes/admin_patients.py`
- [ ] Endpoint: `POST /api/admin/patients/create`
- [ ] Endpoint: `POST /api/admin/patients/invite`
- [ ] Usar Supabase Admin API (createUser)
- [ ] Criar em auth.users + profiles + patient_profiles

### **ETAPA 2: Frontend - Remover Bypass** ⏱️ 20min
- [ ] Remover `USE_BYPASS = true` de `supabase.js`
- [ ] Atualizar `createPatientByProfessional()` para chamar backend
- [ ] Atualizar `PatientsList.js` para usar novo fluxo

### **ETAPA 3: Role Guards** ⏱️ 40min
- [ ] Criar `/app/frontend/src/guards/RoleGuard.js`
- [ ] Bloquear rotas `/professional/*` para patients
- [ ] Bloquear rotas `/admin/*` para patients e professionals
- [ ] Atualizar App.js com guards

### **ETAPA 4: Corrigir Menu Paciente** ⏱️ 20min
- [ ] Revisar `PatientSidebar.js`
- [ ] Remover opções de profissional
- [ ] Bloquear IAs
- [ ] Bloquear "Biquini Branco"

### **ETAPA 5: Corrigir Bugs Específicos** ⏱️ 60min
- [ ] Bug 1: Perfil paciente → Receitas
- [ ] Bug 5: Erro "body stream already read"
- [ ] Bug 6: Arquivar paciente
- [ ] Bug 7: Profissional Basic vs PRO
- [ ] Bug 8: Profissional acessando Biquini Branco

### **ETAPA 6: Testes E2E** ⏱️ 30min
- [ ] Criar paciente via UI (como profissional)
- [ ] Verificar banco (auth.users + profiles + patient_profiles)
- [ ] Login com magic link
- [ ] Verificar acesso paciente (bloqueios)
- [ ] Verificar checklist/meal completion

**TEMPO TOTAL ESTIMADO: ~3 horas**

---

## 🚀 COMEÇAR POR:

**PRIORIDADE 1:** Etapa 1 (Backend endpoint)
**PRIORIDADE 2:** Etapa 2 (Remover bypass)
**PRIORIDADE 3:** Etapa 3 (Role guards)

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] `admin_patients.py` criado
- [ ] Service role key configurada
- [ ] createUser funcionando
- [ ] Magic link funcionando

### Frontend
- [ ] Bypass removido
- [ ] PatientsList atualizado
- [ ] Role guards implementados
- [ ] Menu paciente limpo

### Database
- [ ] Policies RLS revisadas
- [ ] auth_user_id sempre preenchido
- [ ] patient_profiles com FK correto

### Testes
- [ ] Criar paciente E2E
- [ ] Login paciente E2E
- [ ] Bloqueios testados
- [ ] Todos os 9 bugs corrigidos

---

## 🔥 COMEÇAR AGORA!
