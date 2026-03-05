# 🖼️ FIX: Upload de Logo não funciona

## ❌ Problema
- Selecionando imagem, fica "carregando" mas não sobe
- Bucket `branding` provavelmente não existe

---

## ✅ SOLUÇÃO: Criar Bucket no Supabase Storage

### **MÉTODO 1: Via Dashboard (RECOMENDADO)**

#### **Passo 1: Acessar Storage**
1. Abra [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Clique em **"Storage"** no menu lateral (ícone 📦)

#### **Passo 2: Criar Bucket**
1. Clique em **"New bucket"**
2. Preencha:
   - **Name**: `branding`
   - **Public bucket**: ✅ **MARCAR** (logos devem ser públicos)
   - **File size limit**: `2 MB`
   - **Allowed MIME types**: 
     - `image/png`
     - `image/jpeg`
     - `image/jpg`
     - `image/webp`
     - `image/svg+xml`
3. Clique em **"Create bucket"**

#### **Passo 3: Criar Pasta "logos"**
1. Entre no bucket `branding` (clique nele)
2. Clique em **"Create folder"**
3. Nome: `logos`
4. Clique em **"Create"**

#### **Passo 4: Configurar Políticas (RLS)**

**Ir em: Storage → branding → Policies**

Clique em **"New policy"** e crie **4 policies**:

---

##### **Policy 1: Upload (INSERT)**
```
Name: branding_upload_professional
Operation: INSERT
Policy definition:
  bucket_id = 'branding' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'logos'
```

---

##### **Policy 2: Leitura (SELECT)**
```
Name: branding_read_public
Operation: SELECT
Policy definition:
  bucket_id = 'branding'
```

---

##### **Policy 3: Atualizar (UPDATE)**
```
Name: branding_update_own
Operation: UPDATE
Policy definition:
  bucket_id = 'branding' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'logos'
```

---

##### **Policy 4: Deletar (DELETE)**
```
Name: branding_delete_own
Operation: DELETE
Policy definition:
  bucket_id = 'branding' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'logos'
```

---

### **MÉTODO 2: Via SQL (Alternativo)**

Se preferir automação, execute no **SQL Editor**:

```sql
-- Criar bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Upload
CREATE POLICY "branding_upload_professional" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'logos'
  );

-- Policy: Leitura pública
CREATE POLICY "branding_read_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'branding');

-- Policy: Atualizar
CREATE POLICY "branding_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Deletar
CREATE POLICY "branding_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
  );
```

---

## 🧪 TESTE APÓS CRIAR O BUCKET

### **1. Abrir Console (F12)**
- Limpe o console (🚫)

### **2. Tentar upload novamente**
- Vá em `/professional/branding`
- Tab **"Marca"** (2ª aba)
- Clique em **"Carregar Logo"**
- Selecione uma imagem

### **3. Ver logs no Console**

**✅ Sucesso esperado:**
```
🖼️ [LOGO UPLOAD] Arquivo selecionado: logo.png 150000 image/png
🖼️ [LOGO UPLOAD] Nome do arquivo: abc-123-1234567890.png
🖼️ [LOGO UPLOAD] Tentando upload no bucket "branding"...
🖼️ [LOGO UPLOAD] Resultado do upload: { uploadData: {...}, uploadError: null }
✅ [LOGO UPLOAD] URL pública: https://...
```

**❌ Erros possíveis:**

#### Erro 1: Bucket não existe
```
❌ [LOGO UPLOAD] Erro: Bucket not found
Toast: "Bucket 'branding' nao existe. Crie no Supabase Storage primeiro!"
```
**Solução:** Criar o bucket (Método 1 ou 2 acima)

---

#### Erro 2: Sem permissão
```
❌ [LOGO UPLOAD] Erro: Row level security policy
Toast: "Sem permissao para upload. Verifique as policies do bucket!"
```
**Solução:** Configurar as 4 policies (Passo 4 acima)

---

#### Erro 3: Arquivo muito grande
```
Toast: "Imagem muito grande! Maximo 2MB"
```
**Solução:** Comprimir a imagem ou usar arquivo menor

---

## ✅ VERIFICAÇÃO FINAL

Após criar o bucket e policies, execute no SQL Editor:

```sql
-- Ver se o bucket foi criado
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE name = 'branding';
```

**Resultado esperado:**
```
id       | name     | public | file_size_limit
---------|----------|--------|----------------
branding | branding | true   | 2097152
```

---

## 📝 CHECKLIST

- [ ] Bucket `branding` criado
- [ ] Bucket configurado como **público**
- [ ] Pasta `logos` criada dentro do bucket
- [ ] 4 policies configuradas (INSERT, SELECT, UPDATE, DELETE)
- [ ] Teste de upload funcionando
- [ ] Logo aparece no preview da página

---

## 🚀 APÓS FUNCIONAR

1. Faça upload do logo
2. Clique em **"Salvar"**
3. Faça **logout**
4. O logo deve aparecer na tela de login!

---

**Crie o bucket e me avise o resultado!** 🎯
