# FitJourney - Nutrition Dashboard PRD

## Problema Original
Dashboard de nutrição FitJourney com Supabase. Fase de estabilização arquitetural. Objetivo: evoluir sem criar camadas duplicadas, sem conflitos futuros e sem regressões.

## Arquitetura
- **Frontend**: React.js com Tailwind CSS, ShadCN/UI components, React Router
- **Backend**: Supabase (direto do frontend via @supabase/supabase-js)
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (branding logos)

## Usuarios
- **Admin**: Gerenciamento completo (profissionais, features, branding)
- **Profissional**: Nutricionistas (pacientes, planos, receitas, automações)
- **Paciente**: Acompanhamento (plano alimentar, tarefas, feedbacks)
- **Visitante**: Calculadoras grátis, health check

## O que foi implementado

### Concluído anteriormente:
- Bug do input na Calculadora de Energia
- Bug dos planos alimentares desaparecendo
- Criação de paciente por Admin
- Busca Global (Ctrl+K)
- Galeria Pública de Planos Alimentares
- Automações Editáveis
- Filtros Avançados de Pacientes
- Modal de Status do Paciente
- Sugestor Inteligente de Receitas
- Página "Dicas Inteligentes"
- Gráfico de Análise em Tempo Real no MealPlanEditor

### Concluído nesta sessão (2026-03-05):
- **Personalização da Marca (Brand Customization) - COMPLETO**
  - BrandingSettings.js reescrito com layout Editor + Preview em tempo real
  - 5 tabs organizadas: Marca, Cores, Login, Fontes, Rodapé
  - LoginPage.js atualizado para consumir TODOS os campos do branding
  - Novos campos: login_bg_gradient, login_card_style, login_effect, footer_copyright, footer_about, footer_faq_items, footer_links, login_show_stats
  - Footer completo com FAQ accordion, Quem Somos, Links, Copyright
  - Preview em tempo real sticky no lado direito
  - Efeitos visuais configuráveis (floating, particles, gradient_wave, none)
  - Estilo de cards configurável (glass, solid, gradient)
  - Tipografia editável (família, tamanhos de heading/body/small/badge/button)
  - Sidebar e Layout já consomem o branding context

## Backlog Priorizado
### P0 (Alta)
- Nenhum blocker

### P1 (Média)
- Gráficos na Calculadora de Energia (P2 - verificar se necessário)

### P2 (Baixa)
- Receitas: Aguardando banco de receitas do usuário
- Integração de receitas de documentos Word

## Próximos Passos
1. Ajustes na Calculadora de Energia (gráficos)
2. Adaptações adicionais conforme feedback do usuário
