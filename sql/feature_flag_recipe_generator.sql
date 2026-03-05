-- ============================================
-- FEATURE FLAG: AI Recipe Generator
-- ============================================

INSERT INTO platform_features (name, slug, description, category, is_ai, is_active, is_pro, impact_level)
VALUES ('Gerador de Receitas IA', 'ai_recipe_generator', 'Gerar receitas personalizadas com IA baseadas em ingredientes disponíveis', 'IA', true, true, true, 'strategic')
ON CONFLICT (slug) DO UPDATE SET is_pro = true, is_active = true, is_ai = true;
