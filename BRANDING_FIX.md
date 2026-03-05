# 🎨 FIX: Personalização de Branding

## 📋 Problema Identificado

A funcionalidade de personalização de marca (branding) não estava salvando porque a tabela `professional_branding` não existia no banco de dados Supabase.

### O que estava acontecendo:
1. A página `/professional/branding` permite configurar logo, cores, textos, etc.
2. Ao clicar em "Salvar", o código frontend chamava `upsertProfessionalBranding()`
3. Essa função tentava inserir/atualizar na tabela `professional_branding`
4. **Mas a tabela não existia!** ❌

## ✅ Solução Implementada

### 1. Criado arquivo SQL completo
- **Arquivo**: `/app/sql/professional_branding_setup.sql`
- **Conteúdo**:
  - Tabela `professional_branding` com todos os campos necessários
  - Políticas RLS (Row Level Security) para segurança
  - Índices para performance
  - Trigger para `updated_at` automático
  - Suporte a JSONB para arrays (stats, FAQ, links)

### 2. Atualizado código frontend
- Marcadas funções antigas como `@deprecated`
- Redirecionadas para as novas funções `getProfessionalBranding()` e `upsertProfessionalBranding()`

### 3. Estrutura da tabela

```sql
professional_branding (
  - id (uuid, PK)
  - professional_id (uuid, FK → auth.users) UNIQUE
  - logo_url (text)
  - primary_color, secondary_color, accent_color (text)
  - brand_name, brand_initials (text)
  - login_title, login_footer (text)
  - login_bg_color, login_bg_gradient_from/to (text)
  - login_card_style, login_effect (text)
  - login_show_stats (boolean)
  - login_stats (jsonb) ← Array de stats
  - footer_copyright, footer_about (text)
  - footer_faq_items (jsonb) ← Array de perguntas
  - footer_links (jsonb) ← Array de links
  - footer_show_about/faq/links (boolean)
  - font_family, font_size_* (text)
  - font_weight_* (text)
  - badge_size, button_size (text)
  - created_at, updated_at (timestamptz)
)
```

### 4. Políticas de Segurança (RLS)

✅ **Profissional**:
- Pode ver e editar **apenas o próprio branding**
- Inserção: `auth.uid() = professional_id`
- Leitura/atualização: `auth.uid() = professional_id`

✅ **Paciente**:
- Pode ver o branding do **seu profissional**
- Policy verifica relação em `patient_profiles`

## 🚀 Como Aplicar no Supabase

### Passo 1: Abrir SQL Editor
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Clique em **SQL Editor** no menu lateral

### Passo 2: Executar o SQL
1. Copie **TODO O CONTEÚDO** do arquivo `/app/sql/professional_branding_setup.sql`
2. Cole no SQL Editor
3. Clique em **Run** (ou Ctrl+Enter)

### Passo 3: Verificar sucesso
Execute no SQL Editor:
```sql
SELECT * FROM professional_branding LIMIT 1;
```

Deve retornar sucesso (mesmo que vazio).

### Passo 4: Testar no app
1. Faça login como profissional
2. Vá em `/professional/branding`
3. Altere alguma cor ou texto
4. Clique em **Salvar**
5. Deve aparecer: ✅ "Configurações de marca salvas com sucesso!"

## 🔍 Verificação no Supabase

### Conferir se a tabela foi criada:
```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'professional_branding';
```

### Conferir políticas RLS:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'professional_branding';
```

Deve mostrar 4 policies:
- `professional_branding_select_own`
- `professional_branding_insert_own`
- `professional_branding_update_own`
- `professional_branding_patient_view`

## 📦 Bucket de Storage (Opcional)

Se quiser upload de logos, crie um bucket chamado `branding`:

1. No Supabase Dashboard → **Storage**
2. Clique em **New bucket**
3. Nome: `branding`
4. **Public**: ✅ (para logos serem acessíveis)
5. **File size limit**: 5 MB

## 🧪 Teste E2E Recomendado

```
1. Login como profissional
2. Ir em /professional/branding
3. Alterar:
   - Primary color → #ff0000 (vermelho)
   - Brand name → "Minha Clínica"
4. Salvar
5. Fazer logout
6. Verificar se a tela de login mudou de cor
7. Fazer login novamente
8. Verificar se as configurações estão salvas
```

## 📝 Notas Técnicas

- **Idempotência**: O SQL pode ser executado múltiplas vezes sem erro
- **Migração**: Se existir tabela antiga `branding_configs`, ela será ignorada (comentada)
- **JSON**: Campos como `login_stats`, `footer_faq_items` e `footer_links` usam JSONB (mais eficiente que JSON)
- **Defaults**: Todos os campos têm valores padrão (FitJourney branding)

## 🎯 Próximos Passos

Após executar o SQL:
1. ✅ Branding personalizado funcionando
2. ✅ Cada profissional pode ter sua identidade visual
3. ✅ Pacientes herdam o branding do profissional
4. ✅ Tudo salvo no Supabase (não mais em localStorage)

---

**Criado em**: Etapa de correção do sistema de automação
**Status**: ✅ Pronto para aplicação
**Dependências**: Supabase com auth.users e patient_profiles
