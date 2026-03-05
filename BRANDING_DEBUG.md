# 🔍 DEBUG: Branding não persiste após recarregar página

## ❓ Problema
- ✅ Salva com sucesso (toast aparece)
- ❌ Ao recarregar a página, volta ao padrão

## 🧪 TESTES DE DIAGNÓSTICO

### **Teste 1: Verificar se salvou no banco**

Execute no **Supabase SQL Editor**:

```sql
-- Ver TODOS os registros de branding (sem RLS)
SELECT 
  id,
  professional_id,
  brand_name,
  primary_color,
  login_title,
  created_at,
  updated_at
FROM professional_branding;
```

**Resultado esperado:**
- ✅ Se aparecer seu registro → dados estão salvos
- ❌ Se estiver vazio → não está salvando

---

### **Teste 2: Verificar se a policy RLS está permitindo leitura**

```sql
-- Testar como profissional autenticado
-- Substitua 'SEU_USER_ID_AQUI' pelo UUID do seu usuário
SET request.jwt.claim.sub = 'SEU_USER_ID_AQUI';

SELECT * FROM professional_branding 
WHERE professional_id = 'SEU_USER_ID_AQUI';
```

**Como pegar seu User ID:**
1. Abra o Console do navegador (F12)
2. Execute no Console:
```javascript
localStorage.getItem('sb-<seu-projeto-ref>-auth-token')
```
3. Procure por `"id": "uuid-aqui"`

---

### **Teste 3: Ver logs de erro no Console**

1. **Abra o Console do navegador** (F12 → Console)
2. **Limpe o console** (ícone 🚫)
3. **Recarregue a página** `/professional/branding`
4. **Procure por erros** em vermelho

**Erros comuns:**
- `"Error fetching branding"` → problema na query
- `"Row level security policy"` → problema de RLS
- `"Column does not exist"` → schema incorreto

---

### **Teste 4: Verificar localStorage (user_type)**

No Console do navegador:

```javascript
console.log('User Type:', localStorage.getItem('fitjourney_user_type'));
console.log('Auth User:', await supabase.auth.getUser());
```

**Resultado esperado:**
- ✅ `fitjourney_user_type` = `"professional"`
- ✅ `auth.user.id` = UUID válido

---

### **Teste 5: Testar manualmente a query**

No Console do navegador:

```javascript
// Importar supabase (se não estiver disponível)
import { supabase } from './lib/supabase';

// Buscar branding
const user = await supabase.auth.getUser();
console.log('User ID:', user.data.user?.id);

const { data, error } = await supabase
  .from('professional_branding')
  .select('*')
  .eq('professional_id', user.data.user?.id)
  .maybeSingle();

console.log('Branding Data:', data);
console.log('Error:', error);
```

---

## 🐛 DIAGNÓSTICO POR SINTOMA

### **Sintoma A: Tabela vazia no Teste 1**
❌ **Problema**: Não está salvando no banco

**Solução:**
1. Verificar se há erro no console ao clicar "Salvar"
2. Verificar se `professionalId` está correto
3. Testar policy RLS de INSERT

---

### **Sintoma B: Tabela tem dados MAS erro no Teste 2**
❌ **Problema**: Policy RLS bloqueando leitura

**Solução:**
```sql
-- Verificar policies ativas
SELECT * FROM pg_policies 
WHERE tablename = 'professional_branding';

-- Verificar se a policy de SELECT está correta
SELECT policyname, qual 
FROM pg_policies 
WHERE tablename = 'professional_branding' 
  AND cmd = 'SELECT';
```

---

### **Sintoma C: Dados existem E policy OK**
❌ **Problema**: Merge incorreto com DEFAULT_BRANDING ou cache

**Causa provável:**
Linha 81 de `branding.js`:
```javascript
return data || DEFAULT_BRANDING;
```

Se `data` for `null`, retorna DEFAULT.

**Debug adicional:**
```javascript
// Em BrandingContext.js, linha 13-14
const activeBranding = await getActiveBranding();
console.log('🔍 Active Branding:', activeBranding);
console.log('🔍 Is Default?', activeBranding === DEFAULT_BRANDING);
```

---

## 🔧 POSSÍVEL PROBLEMA: JSONB FIELDS

Se você editou campos JSONB (`login_stats`, `footer_faq_items`, `footer_links`), eles podem não estar salvando corretamente.

**Teste específico:**
```sql
SELECT 
  brand_name,
  primary_color,
  login_stats::text,
  footer_faq_items::text,
  footer_links::text
FROM professional_branding;
```

Se os JSONB estiverem como `null`, o problema está no salvamento desses campos.

---

## 📋 CHECKLIST DE DEBUG

Execute os testes na ordem e me informe os resultados:

- [ ] **Teste 1**: Dados estão no banco? (sim/não)
- [ ] **Teste 2**: Policy RLS permite leitura? (sim/não/erro)
- [ ] **Teste 3**: Há erros no Console do navegador? (quais?)
- [ ] **Teste 4**: `fitjourney_user_type` é "professional"? (sim/não)
- [ ] **Teste 5**: Query manual retorna dados? (sim/não/erro)

---

## 🚀 APÓS OS TESTES

Me envie os resultados e eu vou identificar o problema exato!

**Formato:**
```
Teste 1: ✅ Dados existem / ❌ Tabela vazia
Teste 2: ✅ Policy OK / ❌ Erro: [mensagem]
Teste 3: ✅ Sem erros / ❌ Erro: [mensagem]
Teste 4: ✅ User type OK / ❌ [valor encontrado]
Teste 5: ✅ Retornou dados / ❌ Erro: [mensagem]
```
