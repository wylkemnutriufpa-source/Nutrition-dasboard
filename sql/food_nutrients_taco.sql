-- ============================================
-- TABELA DE NUTRIENTES DE ALIMENTOS - TACO + USDA
-- FitJourney Nutrition Dashboard
-- ============================================

-- 1) CRIAR TABELA food_nutrients
CREATE TABLE IF NOT EXISTS food_nutrients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text, -- Nome em inglês (para USDA)
  source text NOT NULL DEFAULT 'TACO' CHECK (source IN ('TACO', 'USDA', 'IBGE', 'CUSTOM')),
  source_id text, -- ID original da fonte (ex: taco_001)
  category text,
  
  -- Valores nutricionais POR 100g
  calories_100g numeric(10,2) NOT NULL DEFAULT 0,
  protein_100g numeric(10,2) DEFAULT 0,
  carbs_100g numeric(10,2) DEFAULT 0,
  fat_100g numeric(10,2) DEFAULT 0,
  fiber_100g numeric(10,2) DEFAULT 0,
  sodium_100g numeric(10,2) DEFAULT 0,
  
  -- Porção padrão
  serving_size numeric(10,2) DEFAULT 100, -- Tamanho da porção em gramas
  serving_unit text DEFAULT 'g', -- Unidade (g, ml, unidade, fatia)
  serving_description text, -- Descrição da porção (ex: "1 ovo médio")
  
  -- Conversões de unidade
  unit_weight_g numeric(10,2), -- Peso de 1 unidade em gramas (ex: 1 ovo = 50g)
  
  -- Metadados
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) ÍNDICES PARA BUSCA EFICIENTE
CREATE INDEX IF NOT EXISTS idx_food_nutrients_name ON food_nutrients USING gin(to_tsvector('portuguese', name));
CREATE INDEX IF NOT EXISTS idx_food_nutrients_source ON food_nutrients(source);
CREATE INDEX IF NOT EXISTS idx_food_nutrients_category ON food_nutrients(category);

-- 3) FUNÇÃO DE BUSCA COM PRIORIDADE TACO
CREATE OR REPLACE FUNCTION search_foods(search_term text, limit_results int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  name text,
  source text,
  category text,
  calories_100g numeric,
  protein_100g numeric,
  carbs_100g numeric,
  fat_100g numeric,
  fiber_100g numeric,
  sodium_100g numeric,
  serving_size numeric,
  serving_unit text,
  unit_weight_g numeric,
  relevance numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.source,
    f.category,
    f.calories_100g,
    f.protein_100g,
    f.carbs_100g,
    f.fat_100g,
    f.fiber_100g,
    f.sodium_100g,
    f.serving_size,
    f.serving_unit,
    f.unit_weight_g,
    (
      -- Score de relevância: TACO ganha bônus de 10 pontos
      ts_rank(to_tsvector('portuguese', f.name), plainto_tsquery('portuguese', search_term)) * 100
      + CASE WHEN f.source = 'TACO' THEN 10 ELSE 0 END
      + CASE WHEN f.source = 'IBGE' THEN 5 ELSE 0 END
    )::numeric as relevance
  FROM food_nutrients f
  WHERE 
    f.is_active = true
    AND (
      f.name ILIKE '%' || search_term || '%'
      OR f.name_en ILIKE '%' || search_term || '%'
      OR to_tsvector('portuguese', f.name) @@ plainto_tsquery('portuguese', search_term)
    )
  ORDER BY 
    relevance DESC,
    f.source ASC, -- TACO primeiro (A antes de U)
    f.name ASC
  LIMIT limit_results;
END;
$$;

-- 4) INSERT DE DADOS TACO (Amostra - Principais Alimentos BR)
INSERT INTO food_nutrients (name, source, source_id, category, calories_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, sodium_100g, serving_size, serving_unit, unit_weight_g, serving_description) 
VALUES
-- CEREAIS E DERIVADOS
('Arroz branco cozido', 'TACO', 'taco_001', 'Cereais', 128.0, 2.5, 28.1, 0.2, 1.6, 1.0, 100, 'g', NULL, '4 colheres de sopa'),
('Arroz integral cozido', 'TACO', 'taco_002', 'Cereais', 124.0, 2.6, 25.8, 1.0, 2.7, 1.0, 100, 'g', NULL, '4 colheres de sopa'),
('Macarrão cozido', 'TACO', 'taco_003', 'Cereais', 102.0, 3.0, 19.9, 0.5, 1.0, 1.0, 100, 'g', NULL, '3 colheres de sopa'),
('Macarrão integral cozido', 'TACO', 'taco_004', 'Cereais', 117.0, 4.5, 23.0, 0.9, 3.0, 1.0, 100, 'g', NULL, '3 colheres de sopa'),
('Pão francês', 'TACO', 'taco_005', 'Pães', 300.0, 8.0, 58.6, 3.1, 2.3, 648.0, 50, 'unidade', 50.0, '1 unidade'),
('Pão integral', 'TACO', 'taco_006', 'Pães', 253.0, 9.0, 49.0, 3.5, 6.9, 400.0, 50, 'fatia', 30.0, '2 fatias'),
('Pão de forma', 'TACO', 'taco_007', 'Pães', 261.0, 8.0, 49.0, 3.6, 2.5, 490.0, 25, 'fatia', 25.0, '1 fatia'),
('Aveia em flocos', 'TACO', 'taco_008', 'Cereais', 394.0, 13.9, 66.6, 8.5, 9.1, 5.0, 30, 'g', NULL, '3 colheres de sopa'),
('Tapioca', 'TACO', 'taco_009', 'Cereais', 358.0, 0.1, 87.8, 0.0, 0.0, 1.0, 30, 'g', NULL, '2 colheres de sopa'),
('Cuscuz de milho', 'TACO', 'taco_010', 'Cereais', 112.0, 2.4, 25.3, 0.2, 1.4, 2.0, 100, 'g', NULL, '1 fatia média'),

-- TUBÉRCULOS E RAÍZES
('Batata doce cozida', 'TACO', 'taco_011', 'Tubérculos', 77.0, 0.6, 18.4, 0.1, 2.2, 9.0, 100, 'g', NULL, '1 batata média'),
('Batata inglesa cozida', 'TACO', 'taco_012', 'Tubérculos', 52.0, 1.2, 11.9, 0.1, 1.3, 3.0, 100, 'g', NULL, '1 batata média'),
('Mandioca cozida', 'TACO', 'taco_013', 'Tubérculos', 125.0, 0.6, 30.1, 0.3, 1.6, 1.0, 100, 'g', NULL, '2 pedaços médios'),
('Inhame cozido', 'TACO', 'taco_014', 'Tubérculos', 97.0, 2.0, 23.2, 0.1, 1.7, 7.0, 100, 'g', NULL, '1 pedaço médio'),

-- LEGUMINOSAS
('Feijão preto cozido', 'TACO', 'taco_015', 'Leguminosas', 77.0, 4.5, 14.0, 0.5, 8.4, 2.0, 100, 'g', NULL, '1 concha'),
('Feijão carioca cozido', 'TACO', 'taco_016', 'Leguminosas', 76.0, 4.8, 13.6, 0.5, 8.5, 2.0, 100, 'g', NULL, '1 concha'),
('Lentilha cozida', 'TACO', 'taco_017', 'Leguminosas', 93.0, 6.3, 16.3, 0.5, 7.9, 2.0, 100, 'g', NULL, '1 concha'),
('Grão-de-bico cozido', 'TACO', 'taco_018', 'Leguminosas', 121.0, 8.9, 18.0, 2.6, 5.1, 7.0, 100, 'g', NULL, '1 concha'),
('Ervilha cozida', 'TACO', 'taco_019', 'Leguminosas', 63.0, 4.2, 10.0, 0.4, 4.3, 3.0, 100, 'g', NULL, '3 colheres de sopa'),
('Soja cozida', 'TACO', 'taco_020', 'Leguminosas', 151.0, 14.0, 7.5, 7.5, 5.6, 1.0, 100, 'g', NULL, '1 concha'),

-- CARNES E OVOS
('Ovo cozido', 'TACO', 'taco_021', 'Ovos', 146.0, 13.3, 0.6, 9.5, 0.0, 146.0, 50, 'unidade', 50.0, '1 ovo médio'),
('Ovo frito', 'TACO', 'taco_022', 'Ovos', 240.0, 15.6, 0.6, 19.3, 0.0, 191.0, 60, 'unidade', 60.0, '1 ovo frito'),
('Clara de ovo', 'TACO', 'taco_023', 'Ovos', 43.0, 9.0, 1.0, 0.0, 0.0, 163.0, 33, 'unidade', 33.0, '1 clara'),
('Peito de frango grelhado', 'TACO', 'taco_024', 'Carnes', 159.0, 32.0, 0.0, 2.5, 0.0, 75.0, 100, 'g', NULL, '1 filé médio'),
('Coxa de frango assada', 'TACO', 'taco_025', 'Carnes', 215.0, 27.0, 0.0, 11.5, 0.0, 75.0, 100, 'g', NULL, '1 coxa'),
('Carne moída (patinho)', 'TACO', 'taco_026', 'Carnes', 137.0, 21.0, 0.0, 5.5, 0.0, 59.0, 100, 'g', NULL, '4 colheres de sopa'),
('Alcatra grelhada', 'TACO', 'taco_027', 'Carnes', 235.0, 32.4, 0.0, 11.0, 0.0, 51.0, 100, 'g', NULL, '1 bife médio'),
('Filé mignon grelhado', 'TACO', 'taco_028', 'Carnes', 210.0, 32.8, 0.0, 8.1, 0.0, 48.0, 100, 'g', NULL, '1 filé'),
('Contrafilé grelhado', 'TACO', 'taco_029', 'Carnes', 278.0, 28.9, 0.0, 17.3, 0.0, 52.0, 100, 'g', NULL, '1 bife médio'),
('Carne de porco (lombo)', 'TACO', 'taco_030', 'Carnes', 211.0, 27.0, 0.0, 10.7, 0.0, 56.0, 100, 'g', NULL, '1 bife'),

-- PEIXES
('Filé de tilápia grelhado', 'TACO', 'taco_031', 'Peixes', 96.0, 20.0, 0.0, 1.5, 0.0, 52.0, 100, 'g', NULL, '1 filé'),
('Sardinha em conserva', 'TACO', 'taco_032', 'Peixes', 208.0, 24.6, 0.0, 11.5, 0.0, 480.0, 100, 'g', NULL, '3-4 unidades'),
('Atum em conserva', 'TACO', 'taco_033', 'Peixes', 166.0, 26.2, 0.0, 6.3, 0.0, 360.0, 100, 'g', NULL, '1/2 lata'),
('Bacalhau cozido', 'TACO', 'taco_034', 'Peixes', 105.0, 22.8, 0.0, 0.9, 0.0, 1739.0, 100, 'g', NULL, '1 posta'),
('Camarão cozido', 'TACO', 'taco_035', 'Frutos do mar', 99.0, 20.9, 0.2, 1.5, 0.0, 224.0, 100, 'g', NULL, '10 unidades'),

-- LATICÍNIOS
('Leite integral', 'TACO', 'taco_036', 'Laticínios', 61.0, 3.0, 4.5, 3.5, 0.0, 50.0, 200, 'ml', NULL, '1 copo'),
('Leite desnatado', 'TACO', 'taco_037', 'Laticínios', 35.0, 3.4, 4.9, 0.1, 0.0, 50.0, 200, 'ml', NULL, '1 copo'),
('Iogurte natural', 'TACO', 'taco_038', 'Laticínios', 51.0, 4.1, 5.6, 0.9, 0.0, 55.0, 170, 'ml', NULL, '1 pote'),
('Iogurte desnatado', 'TACO', 'taco_039', 'Laticínios', 42.0, 4.1, 5.9, 0.3, 0.0, 60.0, 170, 'ml', NULL, '1 pote'),
('Queijo minas frescal', 'TACO', 'taco_040', 'Laticínios', 264.0, 17.4, 3.1, 20.8, 0.0, 215.0, 30, 'g', 30.0, '1 fatia'),
('Queijo cottage', 'TACO', 'taco_041', 'Laticínios', 98.0, 11.1, 3.4, 4.3, 0.0, 364.0, 60, 'g', NULL, '2 colheres de sopa'),
('Ricota', 'TACO', 'taco_042', 'Laticínios', 140.0, 12.6, 3.8, 8.0, 0.0, 84.0, 50, 'g', 50.0, '2 colheres de sopa'),

-- FRUTAS
('Banana prata', 'TACO', 'taco_043', 'Frutas', 98.0, 1.3, 26.0, 0.1, 2.0, 0.0, 86, 'unidade', 86.0, '1 unidade média'),
('Banana nanica', 'TACO', 'taco_044', 'Frutas', 92.0, 1.4, 23.8, 0.1, 1.9, 0.0, 100, 'unidade', 100.0, '1 unidade'),
('Maçã', 'TACO', 'taco_045', 'Frutas', 56.0, 0.3, 15.2, 0.0, 1.3, 0.0, 130, 'unidade', 130.0, '1 unidade média'),
('Laranja pera', 'TACO', 'taco_046', 'Frutas', 37.0, 1.0, 8.9, 0.1, 0.8, 0.0, 137, 'unidade', 137.0, '1 unidade'),
('Mamão papaya', 'TACO', 'taco_047', 'Frutas', 40.0, 0.5, 10.4, 0.1, 1.0, 3.0, 100, 'g', NULL, '1 fatia'),
('Melancia', 'TACO', 'taco_048', 'Frutas', 33.0, 0.9, 8.1, 0.0, 0.1, 0.0, 100, 'g', NULL, '1 fatia média'),
('Morango', 'TACO', 'taco_049', 'Frutas', 30.0, 0.9, 6.8, 0.3, 1.7, 0.0, 100, 'g', NULL, '7-8 unidades'),
('Uva', 'TACO', 'taco_050', 'Frutas', 53.0, 0.7, 13.7, 0.2, 0.9, 1.0, 100, 'g', NULL, '1 cacho pequeno'),
('Manga', 'TACO', 'taco_051', 'Frutas', 51.0, 0.4, 12.8, 0.3, 1.6, 2.0, 100, 'g', NULL, '1/2 manga'),
('Abacaxi', 'TACO', 'taco_052', 'Frutas', 48.0, 0.9, 12.3, 0.1, 1.0, 0.0, 100, 'g', NULL, '1 fatia'),
('Abacate', 'TACO', 'taco_053', 'Frutas', 96.0, 1.2, 6.0, 8.4, 6.3, 0.0, 100, 'g', NULL, '4 colheres de sopa'),
('Açaí polpa', 'TACO', 'taco_054', 'Frutas', 58.0, 0.8, 6.2, 3.9, 2.6, 4.0, 100, 'g', NULL, '1 tigela'),
('Goiaba', 'TACO', 'taco_055', 'Frutas', 54.0, 1.1, 13.0, 0.4, 6.2, 0.0, 100, 'g', NULL, '1 unidade'),
('Maracujá', 'TACO', 'taco_056', 'Frutas', 68.0, 2.0, 12.3, 2.1, 1.1, 0.0, 100, 'g', NULL, '1 unidade'),

-- HORTALIÇAS
('Alface', 'TACO', 'taco_057', 'Verduras', 11.0, 1.3, 1.7, 0.2, 1.0, 3.0, 50, 'g', NULL, '4 folhas'),
('Tomate', 'TACO', 'taco_058', 'Verduras', 15.0, 1.1, 3.1, 0.2, 1.2, 0.0, 80, 'unidade', 80.0, '1 unidade'),
('Cenoura crua', 'TACO', 'taco_059', 'Verduras', 34.0, 1.3, 7.7, 0.2, 3.2, 3.0, 60, 'unidade', 60.0, '1 unidade média'),
('Brócolis cozido', 'TACO', 'taco_060', 'Verduras', 25.0, 2.1, 4.4, 0.5, 3.4, 4.0, 100, 'g', NULL, '4 buquês'),
('Couve refogada', 'TACO', 'taco_061', 'Verduras', 90.0, 2.9, 5.7, 6.5, 5.7, 6.0, 100, 'g', NULL, '3 colheres de sopa'),
('Espinafre cozido', 'TACO', 'taco_062', 'Verduras', 22.0, 2.6, 2.6, 0.2, 2.1, 55.0, 100, 'g', NULL, '3 colheres de sopa'),
('Pepino', 'TACO', 'taco_063', 'Verduras', 10.0, 0.9, 2.0, 0.1, 1.1, 2.0, 100, 'g', NULL, '5 rodelas'),
('Abobrinha', 'TACO', 'taco_064', 'Verduras', 15.0, 1.1, 3.0, 0.1, 1.3, 0.0, 100, 'g', NULL, '1/2 unidade'),
('Berinjela', 'TACO', 'taco_065', 'Verduras', 19.0, 1.2, 4.5, 0.1, 2.9, 0.0, 100, 'g', NULL, '3 fatias'),
('Chuchu cozido', 'TACO', 'taco_066', 'Verduras', 19.0, 0.4, 4.7, 0.1, 1.8, 0.0, 100, 'g', NULL, '2 colheres de sopa'),
('Quiabo cozido', 'TACO', 'taco_067', 'Verduras', 22.0, 1.5, 4.6, 0.2, 4.6, 1.0, 100, 'g', NULL, '4 colheres de sopa'),
('Beterraba cozida', 'TACO', 'taco_068', 'Verduras', 32.0, 1.2, 7.2, 0.0, 1.9, 45.0, 50, 'g', NULL, '2 fatias'),

-- ÓLEOS E GORDURAS
('Azeite de oliva', 'TACO', 'taco_069', 'Óleos', 884.0, 0.0, 0.0, 100.0, 0.0, 0.0, 8, 'ml', NULL, '1 colher de sopa'),
('Óleo de coco', 'TACO', 'taco_070', 'Óleos', 862.0, 0.0, 0.0, 100.0, 0.0, 0.0, 15, 'ml', NULL, '1 colher de sopa'),
('Manteiga', 'TACO', 'taco_071', 'Gorduras', 726.0, 0.4, 0.0, 82.4, 0.0, 625.0, 10, 'g', NULL, '1 colher de chá'),

-- OLEAGINOSAS
('Castanha-do-pará', 'TACO', 'taco_072', 'Oleaginosas', 643.0, 14.5, 3.4, 67.0, 7.9, 0.0, 10, 'g', 4.0, '2 unidades'),
('Castanha de caju', 'TACO', 'taco_073', 'Oleaginosas', 570.0, 18.5, 29.1, 46.3, 3.7, 15.0, 25, 'g', NULL, '10 unidades'),
('Amendoim torrado', 'TACO', 'taco_074', 'Oleaginosas', 544.0, 27.2, 20.3, 43.9, 8.0, 5.0, 30, 'g', NULL, '1 punhado'),
('Nozes', 'TACO', 'taco_075', 'Oleaginosas', 620.0, 14.0, 18.4, 59.4, 4.8, 0.0, 20, 'g', NULL, '4 unidades'),

-- DOCES E AÇÚCARES
('Mel', 'TACO', 'taco_076', 'Açúcares', 309.0, 0.3, 84.0, 0.0, 0.0, 5.0, 20, 'ml', NULL, '1 colher de sopa'),
('Açúcar refinado', 'TACO', 'taco_077', 'Açúcares', 387.0, 0.0, 99.5, 0.0, 0.0, 0.0, 10, 'g', NULL, '2 colheres de chá'),
('Açúcar mascavo', 'TACO', 'taco_078', 'Açúcares', 369.0, 0.0, 94.5, 0.0, 0.0, 29.0, 10, 'g', NULL, '2 colheres de chá'),
('Chocolate amargo 70%', 'TACO', 'taco_079', 'Doces', 479.0, 6.3, 47.5, 29.4, 9.0, 24.0, 25, 'g', NULL, '1 quadrado grande'),

-- BEBIDAS
('Café sem açúcar', 'TACO', 'taco_080', 'Bebidas', 2.0, 0.2, 0.0, 0.0, 0.0, 1.0, 50, 'ml', NULL, '1 xícara'),
('Chá sem açúcar', 'TACO', 'taco_081', 'Bebidas', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 200, 'ml', NULL, '1 xícara'),
('Suco de laranja natural', 'TACO', 'taco_082', 'Bebidas', 45.0, 0.7, 10.0, 0.2, 0.1, 0.0, 200, 'ml', NULL, '1 copo'),
('Água de coco', 'TACO', 'taco_083', 'Bebidas', 22.0, 0.0, 5.3, 0.2, 0.0, 2.0, 200, 'ml', NULL, '1 copo')

ON CONFLICT DO NOTHING;

-- 5) TRIGGER PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_food_nutrients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_food_nutrients_updated_at ON food_nutrients;
CREATE TRIGGER trigger_food_nutrients_updated_at
  BEFORE UPDATE ON food_nutrients
  FOR EACH ROW
  EXECUTE FUNCTION update_food_nutrients_updated_at();

-- 6) POLÍTICA RLS
ALTER TABLE food_nutrients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS food_nutrients_read ON food_nutrients;
CREATE POLICY food_nutrients_read ON food_nutrients
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS food_nutrients_admin ON food_nutrients;
CREATE POLICY food_nutrients_admin ON food_nutrients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== FIM ====================
