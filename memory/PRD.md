# FitJourney - Nutrition Dashboard PRD

## Problema Original
Dashboard de nutricao FitJourney com Supabase. Fase de estabilizacao arquitetural.

## Arquitetura
- **Frontend**: React.js + Tailwind CSS + ShadCN/UI + React Router
- **Backend**: Supabase (direto do frontend via @supabase/supabase-js)
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (branding logos)

## Usuarios
- **Admin**: Gerenciamento completo
- **Profissional**: Nutricionistas (pacientes, planos, receitas)
- **Paciente**: Acompanhamento (plano alimentar, tarefas, feedbacks)
- **Visitante**: Calculadoras gratis

## Implementado nesta sessao (2026-03-05)

### 1. Templates de Branding (NOVO)
- 6 temas prontos: Minimalista, Corporativo, Natural, Vibrante, Saude Verde, Oceano
- Aplicacao com 1 clique + preview em tempo real
- Tab "Temas" como aba padrao na pagina de Personalizacao

### 2. Personalizacao da Marca (Brand Customization) - COMPLETO
- BrandingSettings com layout Editor + Preview lado a lado
- 6 tabs: Temas, Marca, Cores, Login, Fontes, Rodape
- LoginPage consume TODOS os campos do branding dinamicamente
- Footer editavel: FAQ accordion, Quem Somos, Links, Copyright
- Efeitos visuais configuraveis (floating, particles, gradient_wave, none)
- Estilo de cards (glass, solid, gradient)
- Tipografia editavel (familia, tamanhos)

### 3. Calculo Energetico -> Aplicar ao Plano (P0) - COMPLETO
- Botao "Calculo Energetico" integrado nas Acoes Rapidas do MealPlanEditor
- EnergyCalculatorModal abre dentro do editor
- "Carregar Dados" puxa automaticamente peso/altura do paciente
- Calculo com formula Mifflin-St Jeor ou Harris-Benedict
- Botao "Aplicar ao Plano" salva daily_targets no meal_plans do Supabase
- Se nao tem plano ativo, cria um "Plano Atual" automaticamente
- Update otimista + revalidacao do Supabase

### 4. Grafico Metas vs Plano em Tempo Real (P0) - COMPLETO
- Painel "Metas vs Plano Atual" com barras de progresso
- Mostra: Calorias, Proteina, Carboidratos, Gordura, Fibras
- Percentual de meta atingida para cada macro
- Alerta visual se ultrapassar meta (>110% em vermelho)
- Badge "Via Calculadora" e "Tempo real"
- Agua recomendada em ml/dia e litros
- Se sem metas: mostra "Nenhuma meta definida" + botao "Definir Metas"
- Carrega plano ativo automaticamente quando navega via URL

### 5. Correcao: Carregamento de Plano Ativo
- loadInitialData agora busca plano ativo quando nao tem planId explicito
- Resolve bug de plano nao carregando ao navegar via Pacientes > Plano Alimentar

## Trabalho Ja Concluido (anteriormente)
- Bug input Calculadora de Energia
- Bug planos alimentares desaparecendo
- Criacao de paciente por Admin
- Busca Global (Ctrl+K)
- Galeria Publica de Planos Alimentares
- Automacoes Editaveis
- Filtros Avancados de Pacientes
- Modal de Status do Paciente
- Sugestor Inteligente de Receitas
- Pagina Dicas Inteligentes
- Grafico em tempo real no MealPlanEditor

## Backlog Priorizado
### P1
- Vinculacao de paciente criado pelo ADMIN para PROFESSIONAL
- Adaptacoes adicionais na Calculadora de Energia

### P2
- Receitas: Aguardando banco de receitas
- Integracao receitas de documentos Word
