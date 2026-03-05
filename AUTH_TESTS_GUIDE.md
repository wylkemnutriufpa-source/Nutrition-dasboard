# 🧪 GUIA DE TESTES - Auth + Role Guards

## ✅ **CORREÇÕES APLICADAS:**

1. ✅ Backend: Endpoint `/api/admin/patients/create`
2. ✅ Frontend: Bypass removido
3. ✅ Role Guards: Paciente bloqueado de `/admin` e `/professional`
4. ✅ Syntax error corrigido

---

## 🎯 **TESTE 1: Criar Paciente via Backend**

### **Passo 1: Login como Profissional/Admin**
```
URL: /login
Email: seu-profissional@email.com
```

### **Passo 2: Ir para Lista de Pacientes**
```
URL: /professional/patients
Botão: "Novo Paciente" ou "+"
```

### **Passo 3: Preencher Formulário**
```
Nome: Teste Backend Auth
Email: teste-backend@gmail.com
Telefone: (opcional)
Data Nasc: (opcional)
```

### **Passo 4: Salvar e Ver Console**
Abra DevTools (F12) → Console

**Logs esperados:**
```
🆕 Criando paciente via backend...
✅ Paciente criado: {patient_id: "...", email: "teste-backend@gmail.com"}
📧 Magic link gerado: https://...
```

### **Passo 5: Verificar no Banco**
Execute no Supabase SQL Editor:

```sql
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.role,
  p.auth_user_id,
  pp.professional_id
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN patient_profiles pp ON pp.patient_id = u.id
WHERE u.email = 'teste-backend@gmail.com';
```

**Resultado esperado:**
```
id: [UUID]
email: teste-backend@gmail.com
email_confirmed_at: [timestamp] ✅
role: patient ✅
auth_user_id: [mesmo UUID] ✅
professional_id: [UUID do profissional] ✅
```

---

## 🎯 **TESTE 2: Login com Magic Link**

### **Passo 1: Pegar Magic Link**

**Opção A: Do Console (teste)**
```javascript
// Copie o action_link que apareceu no console
// Exemplo: https://xxx.supabase.co/auth/v1/verify?token=...
```

**Opção B: Do Email (produção)**
```
Verificar email do paciente
Clicar no link recebido
```

### **Passo 2: Acessar Link**
```
Cole o magic link no navegador (aba anônima recomendado)
Deve redirecionar para: /patient/home
```

### **Passo 3: Verificar Dashboard Paciente**
```
✅ Menu lateral deve mostrar apenas opções de paciente
✅ Não deve ter opções de profissional/admin
✅ Deve ver seu plano alimentar (se tiver)
```

---

## 🎯 **TESTE 3: Bloqueio de Rotas**

### **Com usuário PACIENTE logado:**

#### **Teste 3.1: Tentar acessar /professional/dashboard**
```
1. Copiar URL: http://localhost:3000/professional/dashboard
2. Colar na barra de endereços
3. Pressionar Enter
```

**Resultado esperado:**
```
❌ Não carrega a página
✅ Redireciona para: /patient/home
✅ Console mostra: 🚫 Acesso negado: patient tentou acessar...
```

#### **Teste 3.2: Tentar acessar /admin/dashboard**
```
1. URL: http://localhost:3000/admin/dashboard
2. Pressionar Enter
```

**Resultado esperado:**
```
❌ Não carrega a página
✅ Redireciona para: /patient/home
✅ Console mostra: 🚫 Acesso negado: patient tentou acessar...
```

#### **Teste 3.3: Verificar menu lateral**
```
✅ NÃO deve aparecer:
   - "Pacientes" (profissional)
   - "Profissionais" (admin)
   - "Features" (admin)
   - "Banco de Alimentos" (profissional)
   - "Galeria" (profissional)

✅ DEVE aparecer apenas:
   - "Meu Plano"
   - "Minhas Refeições"
   - "Receitas"
   - "Lista de Compras"
   - "Minha Jornada"
   - etc (opções de paciente)
```

---

## 🎯 **TESTE 4: Admin Override**

### **Com usuário ADMIN logado:**

#### **Teste 4.1: Acessar rota de profissional**
```
URL: /professional/dashboard
```

**Resultado esperado:**
```
✅ DEVE funcionar (admin tem acesso total)
✅ NÃO redireciona
```

#### **Teste 4.2: Acessar rota de paciente**
```
URL: /patient/home
```

**Resultado esperado:**
```
✅ DEVE funcionar
✅ Admin pode ver tudo
```

---

## 🎯 **TESTE 5: Verificar Backend API Diretamente**

### **Teste 5.1: Criar paciente via curl**
```bash
curl -X POST http://localhost:8001/api/admin/patients/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Curl",
    "email": "teste-curl@gmail.com",
    "professional_id": "SEU-PROFESSIONAL-ID-AQUI"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "patient_id": "uuid-aqui",
  "email": "teste-curl@gmail.com",
  "message": "Paciente criado com sucesso!"
}
```

### **Teste 5.2: Gerar magic link**
```bash
curl -X POST http://localhost:8001/api/admin/patients/invite \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste-curl@gmail.com",
    "redirect_to": "http://localhost:3000/patient/home"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "email": "teste-curl@gmail.com",
  "action_link": "https://xxx.supabase.co/auth/v1/verify?token=...",
  "message": "Magic link gerado!"
}
```

### **Teste 5.3: Verificar paciente**
```bash
curl http://localhost:8001/api/admin/patients/verify/PATIENT-ID-AQUI
```

**Resposta esperada:**
```json
{
  "patient_id": "uuid",
  "auth_exists": true,
  "profile_exists": true,
  "patient_profile_exists": true,
  "profile": {...},
  "patient_profile": {...}
}
```

---

## ❌ **ERROS COMUNS E SOLUÇÕES:**

### **Erro 1: "SUPABASE_SERVICE_ROLE_KEY not configured"**
**Solução:**
```bash
# Adicionar no /app/backend/.env
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...seu-service-role-key
```

### **Erro 2: Backend não responde**
**Solução:**
```bash
sudo supervisorctl status backend
sudo supervisorctl restart backend
tail -50 /var/log/supervisor/backend.err.log
```

### **Erro 3: "Erro ao criar usuário no Auth"**
**Possíveis causas:**
- Email já existe
- Service role key inválida
- Supabase projeto inativo

**Debug:**
```sql
-- Ver se email já existe
SELECT email FROM auth.users WHERE email = 'email@teste.com';
```

### **Erro 4: Paciente criado mas não consegue logar**
**Solução:**
```sql
-- Verificar se email foi confirmado
SELECT email, email_confirmed_at FROM auth.users 
WHERE email = 'email@teste.com';

-- Se NULL, confirmar manualmente:
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'email@teste.com';
```

---

## 📊 **CHECKLIST FINAL:**

- [ ] ✅ Paciente criado via backend (auth.users + profiles + patient_profiles)
- [ ] ✅ Magic link gerado e funciona
- [ ] ✅ Paciente consegue fazer login
- [ ] ✅ Paciente bloqueado de /professional/*
- [ ] ✅ Paciente bloqueado de /admin/*
- [ ] ✅ Admin consegue acessar tudo
- [ ] ✅ Profissional consegue acessar /professional/* mas não /admin/*
- [ ] ✅ Console mostra logs de bloqueio
- [ ] ✅ Backend API responde corretamente

---

## 🚀 **PRÓXIMOS PASSOS:**

Após confirmar que TODOS os testes acima passaram:
1. ✅ Corrigir bugs menores (menu, IAs bloqueadas, etc)
2. ✅ Voltar para testes de automação
3. ✅ Implementar features pendentes

---

**Execute os testes e me informe os resultados!** 🎯
