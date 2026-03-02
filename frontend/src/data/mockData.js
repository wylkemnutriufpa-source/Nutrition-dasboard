export const mockFoods = [
  // === CARBOIDRATOS ===
  { id: 1, name: 'Arroz branco cozido', source: 'TACO', source_id: 'taco_001', calorias: 128, proteina: 2.5, carboidrato: 28.1, gordura: 0.2, fibra: 1.6, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 101, name: 'Arroz integral cozido', source: 'TACO', source_id: 'taco_101', calorias: 124, proteina: 2.6, carboidrato: 25.8, gordura: 1.0, fibra: 2.7, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 6, name: 'Batata doce cozida', source: 'TACO', source_id: 'taco_006', calorias: 77, proteina: 0.6, carboidrato: 18.4, gordura: 0.1, fibra: 2.2, sodio: 9, porcao: 100, unidade: 'g' },
  { id: 102, name: 'Batata inglesa cozida', source: 'TACO', source_id: 'taco_102', calorias: 52, proteina: 1.2, carboidrato: 11.9, gordura: 0.1, fibra: 1.3, sodio: 3, porcao: 100, unidade: 'g' },
  { id: 103, name: 'Mandioca cozida', source: 'TACO', source_id: 'taco_103', calorias: 125, proteina: 0.6, carboidrato: 30.1, gordura: 0.3, fibra: 1.6, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 104, name: 'Inhame cozido', source: 'TACO', source_id: 'taco_104', calorias: 97, proteina: 2.0, carboidrato: 23.2, gordura: 0.1, fibra: 1.7, sodio: 7, porcao: 100, unidade: 'g' },
  { id: 105, name: 'Macarrão cozido', source: 'TACO', source_id: 'taco_105', calorias: 102, proteina: 3.0, carboidrato: 19.9, gordura: 0.5, fibra: 1.0, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 106, name: 'Macarrão integral cozido', source: 'TACO', source_id: 'taco_106', calorias: 117, proteina: 4.5, carboidrato: 23.0, gordura: 0.9, fibra: 3.0, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 9, name: 'Aveia em flocos', source: 'TACO', source_id: 'taco_009', calorias: 394, proteina: 13.9, carboidrato: 66.6, gordura: 8.5, fibra: 9.1, sodio: 5, porcao: 50, unidade: 'g' },
  { id: 107, name: 'Quinoa cozida', source: 'USDA', source_id: 'usda_107', calorias: 120, proteina: 4.4, carboidrato: 21.3, gordura: 1.9, fibra: 2.8, sodio: 7, porcao: 100, unidade: 'g' },
  { id: 108, name: 'Cuscuz de milho', source: 'TACO', source_id: 'taco_108', calorias: 112, proteina: 2.4, carboidrato: 25.3, gordura: 0.2, fibra: 1.4, sodio: 2, porcao: 100, unidade: 'g' },
  { id: 109, name: 'Tapioca', source: 'TACO', source_id: 'taco_109', calorias: 68, proteina: 0.1, carboidrato: 17.1, gordura: 0, fibra: 0, sodio: 1, porcao: 50, unidade: 'g' },
  { id: 110, name: 'Milho cozido', source: 'TACO', source_id: 'taco_110', calorias: 96, proteina: 3.2, carboidrato: 18.7, gordura: 1.3, fibra: 2.7, sodio: 1, porcao: 100, unidade: 'g' },
  
  // === PÃES E CEREAIS ===
  { id: 13, name: 'Pão integral', source: 'TACO', source_id: 'taco_013', calorias: 253, proteina: 9, carboidrato: 49, gordura: 3.5, fibra: 6.9, sodio: 400, porcao: 50, unidade: 'fatia' },
  { id: 111, name: 'Pão francês', source: 'TACO', source_id: 'taco_111', calorias: 300, proteina: 8.0, carboidrato: 58.6, gordura: 3.1, fibra: 2.3, sodio: 648, porcao: 50, unidade: 'unidade' },
  { id: 112, name: 'Pão de forma', source: 'TACO', source_id: 'taco_112', calorias: 261, proteina: 8.0, carboidrato: 49.0, gordura: 3.6, fibra: 2.5, sodio: 490, porcao: 25, unidade: 'fatia' },
  { id: 113, name: 'Torrada integral', source: 'CUSTOM', source_id: null, calorias: 35, proteina: 1.2, carboidrato: 7.0, gordura: 0.4, fibra: 0.8, sodio: 40, porcao: 10, unidade: 'unidade' },
  { id: 114, name: 'Granola', source: 'USDA', source_id: 'usda_114', calorias: 471, proteina: 10.5, carboidrato: 64.7, gordura: 19.4, fibra: 5.3, sodio: 23, porcao: 40, unidade: 'g' },
  { id: 115, name: 'Cereais matinais integrais', source: 'CUSTOM', source_id: null, calorias: 340, proteina: 8.0, carboidrato: 73.0, gordura: 3.0, fibra: 10.0, sodio: 200, porcao: 30, unidade: 'g' },
  
  // === LEGUMINOSAS ===
  { id: 2, name: 'Feijão preto cozido', source: 'TACO', source_id: 'taco_002', calorias: 77, proteina: 4.5, carboidrato: 14, gordura: 0.5, fibra: 8.4, sodio: 2, porcao: 100, unidade: 'g' },
  { id: 116, name: 'Feijão carioca cozido', source: 'TACO', source_id: 'taco_116', calorias: 76, proteina: 4.8, carboidrato: 13.6, gordura: 0.5, fibra: 8.5, sodio: 2, porcao: 100, unidade: 'g' },
  { id: 117, name: 'Lentilha cozida', source: 'TACO', source_id: 'taco_117', calorias: 93, proteina: 6.3, carboidrato: 16.3, gordura: 0.5, fibra: 7.9, sodio: 2, porcao: 100, unidade: 'g' },
  { id: 118, name: 'Grão-de-bico cozido', source: 'TACO', source_id: 'taco_118', calorias: 121, proteina: 8.9, carboidrato: 18.0, gordura: 2.6, fibra: 5.1, sodio: 7, porcao: 100, unidade: 'g' },
  { id: 119, name: 'Ervilha cozida', source: 'TACO', source_id: 'taco_119', calorias: 63, proteina: 4.2, carboidrato: 10.0, gordura: 0.4, fibra: 4.3, sodio: 3, porcao: 100, unidade: 'g' },
  { id: 120, name: 'Soja cozida', source: 'TACO', source_id: 'taco_120', calorias: 151, proteina: 14.0, carboidrato: 7.5, gordura: 7.5, fibra: 5.6, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 121, name: 'Edamame', source: 'USDA', source_id: 'usda_121', calorias: 121, proteina: 11.9, carboidrato: 8.9, gordura: 5.2, fibra: 5.2, sodio: 6, porcao: 100, unidade: 'g' },
  
  // === PROTEÍNAS ANIMAIS ===
  { id: 3, name: 'Peito de frango grelhado', source: 'TACO', source_id: 'taco_003', calorias: 165, proteina: 31, carboidrato: 0, gordura: 3.6, fibra: 0, sodio: 70, porcao: 100, unidade: 'g' },
  { id: 122, name: 'Frango desfiado', source: 'TACO', source_id: 'taco_122', calorias: 163, proteina: 30, carboidrato: 0, gordura: 4.0, fibra: 0, sodio: 68, porcao: 100, unidade: 'g' },
  { id: 123, name: 'Coxa de frango assada', source: 'TACO', source_id: 'taco_123', calorias: 215, proteina: 27, carboidrato: 0, gordura: 11.5, fibra: 0, sodio: 75, porcao: 100, unidade: 'g' },
  { id: 124, name: 'Peru assado', source: 'USDA', source_id: 'usda_124', calorias: 170, proteina: 29, carboidrato: 0, gordura: 5.0, fibra: 0, sodio: 65, porcao: 100, unidade: 'g' },
  { id: 20, name: 'Carne moída (patinho)', source: 'TACO', source_id: 'taco_020', calorias: 137, proteina: 21, carboidrato: 0, gordura: 5.5, fibra: 0, sodio: 59, porcao: 100, unidade: 'g' },
  { id: 125, name: 'Patinho grelhado', source: 'TACO', source_id: 'taco_125', calorias: 219, proteina: 35.9, carboidrato: 0, gordura: 7.3, fibra: 0, sodio: 56, porcao: 100, unidade: 'g' },
  { id: 126, name: 'Alcatra grelhada', source: 'TACO', source_id: 'taco_126', calorias: 235, proteina: 32.4, carboidrato: 0, gordura: 11.0, fibra: 0, sodio: 51, porcao: 100, unidade: 'g' },
  { id: 127, name: 'Filé mignon grelhado', source: 'TACO', source_id: 'taco_127', calorias: 210, proteina: 32.8, carboidrato: 0, gordura: 8.1, fibra: 0, sodio: 48, porcao: 100, unidade: 'g' },
  { id: 128, name: 'Contrafilé grelhado', source: 'TACO', source_id: 'taco_128', calorias: 278, proteina: 28.9, carboidrato: 0, gordura: 17.3, fibra: 0, sodio: 52, porcao: 100, unidade: 'g' },
  { id: 129, name: 'Acém cozido', source: 'TACO', source_id: 'taco_129', calorias: 212, proteina: 26.7, carboidrato: 0, gordura: 11.2, fibra: 0, sodio: 47, porcao: 100, unidade: 'g' },
  { id: 130, name: 'Costela bovina assada', source: 'TACO', source_id: 'taco_130', calorias: 342, proteina: 28.4, carboidrato: 0, gordura: 24.6, fibra: 0, sodio: 53, porcao: 100, unidade: 'g' },
  { id: 131, name: 'Carne de porco (lombo)', source: 'TACO', source_id: 'taco_131', calorias: 211, proteina: 27.0, carboidrato: 0, gordura: 10.7, fibra: 0, sodio: 56, porcao: 100, unidade: 'g' },
  { id: 132, name: 'Bacon', source: 'USDA', source_id: 'usda_132', calorias: 541, proteina: 37.0, carboidrato: 1.4, gordura: 42.0, fibra: 0, sodio: 1717, porcao: 30, unidade: 'g' },
  { id: 4, name: 'Ovo cozido', source: 'TACO', source_id: 'taco_004', calorias: 155, proteina: 13, carboidrato: 1.1, gordura: 11, fibra: 0, sodio: 124, porcao: 50, unidade: 'unidade' },
  { id: 133, name: 'Ovo mexido', source: 'TACO', source_id: 'taco_133', calorias: 166, proteina: 11.1, carboidrato: 1.6, gordura: 12.7, fibra: 0, sodio: 145, porcao: 50, unidade: 'unidade' },
  { id: 134, name: 'Omelete', source: 'CUSTOM', source_id: null, calorias: 154, proteina: 10.6, carboidrato: 0.7, gordura: 12.0, fibra: 0, sodio: 155, porcao: 60, unidade: 'unidade' },
  { id: 135, name: 'Clara de ovo', source: 'TACO', source_id: 'taco_135', calorias: 52, proteina: 11.0, carboidrato: 0.7, gordura: 0.2, fibra: 0, sodio: 166, porcao: 33, unidade: 'unidade' },
  
  // === PEIXES E FRUTOS DO MAR ===
  { id: 16, name: 'Filé de tilápia', source: 'TACO', source_id: 'taco_016', calorias: 96, proteina: 20, carboidrato: 0, gordura: 1.5, fibra: 0, sodio: 52, porcao: 100, unidade: 'g' },
  { id: 136, name: 'Salmão grelhado', source: 'USDA', source_id: 'usda_136', calorias: 208, proteina: 20.4, carboidrato: 0, gordura: 13.4, fibra: 0, sodio: 59, porcao: 100, unidade: 'g' },
  { id: 137, name: 'Atum em conserva', source: 'TACO', source_id: 'taco_137', calorias: 166, proteina: 26.2, carboidrato: 0, gordura: 6.3, fibra: 0, sodio: 360, porcao: 100, unidade: 'g' },
  { id: 138, name: 'Sardinha em conserva', source: 'TACO', source_id: 'taco_138', calorias: 208, proteina: 24.6, carboidrato: 0, gordura: 11.5, fibra: 0, sodio: 480, porcao: 100, unidade: 'g' },
  { id: 139, name: 'Bacalhau cozido', source: 'TACO', source_id: 'taco_139', calorias: 105, proteina: 22.8, carboidrato: 0, gordura: 0.9, fibra: 0, sodio: 1739, porcao: 100, unidade: 'g' },
  { id: 140, name: 'Camarão cozido', source: 'TACO', source_id: 'taco_140', calorias: 99, proteina: 20.9, carboidrato: 0.2, gordura: 1.5, fibra: 0, sodio: 224, porcao: 100, unidade: 'g' },
  { id: 141, name: 'Merluza assada', source: 'TACO', source_id: 'taco_141', calorias: 122, proteina: 16.6, carboidrato: 0, gordura: 5.8, fibra: 0, sodio: 350, porcao: 100, unidade: 'g' },
  { id: 142, name: 'Pescada branca', source: 'TACO', source_id: 'taco_142', calorias: 111, proteina: 16.7, carboidrato: 0, gordura: 4.6, fibra: 0, sodio: 52, porcao: 100, unidade: 'g' },
  { id: 143, name: 'Truta', source: 'USDA', source_id: 'usda_143', calorias: 190, proteina: 26.6, carboidrato: 0, gordura: 8.5, fibra: 0, sodio: 53, porcao: 100, unidade: 'g' },
  
  // === LATICÍNIOS ===
  { id: 10, name: 'Leite desnatado', source: 'TACO', source_id: 'taco_010', calorias: 35, proteina: 3.4, carboidrato: 4.9, gordura: 0.1, fibra: 0, sodio: 50, porcao: 200, unidade: 'ml' },
  { id: 144, name: 'Leite integral', source: 'TACO', source_id: 'taco_144', calorias: 61, proteina: 3.0, carboidrato: 4.5, gordura: 3.5, fibra: 0, sodio: 50, porcao: 200, unidade: 'ml' },
  { id: 145, name: 'Leite semidesnatado', source: 'TACO', source_id: 'taco_145', calorias: 49, proteina: 3.2, carboidrato: 4.7, gordura: 1.5, fibra: 0, sodio: 50, porcao: 200, unidade: 'ml' },
  { id: 11, name: 'Queijo minas frescal', source: 'TACO', source_id: 'taco_011', calorias: 264, proteina: 17.4, carboidrato: 3.1, gordura: 20.8, fibra: 0, sodio: 215, porcao: 50, unidade: 'g' },
  { id: 146, name: 'Queijo cottage', source: 'USDA', source_id: 'usda_146', calorias: 98, proteina: 11.1, carboidrato: 3.4, gordura: 4.3, fibra: 0, sodio: 364, porcao: 100, unidade: 'g' },
  { id: 147, name: 'Queijo branco', source: 'TACO', source_id: 'taco_147', calorias: 268, proteina: 17.6, carboidrato: 3.3, gordura: 20.9, fibra: 0, sodio: 220, porcao: 30, unidade: 'g' },
  { id: 148, name: 'Ricota', source: 'TACO', source_id: 'taco_148', calorias: 140, proteina: 12.6, carboidrato: 3.8, gordura: 8.0, fibra: 0, sodio: 84, porcao: 50, unidade: 'g' },
  { id: 149, name: 'Cream cheese light', source: 'CUSTOM', source_id: null, calorias: 150, proteina: 6.0, carboidrato: 5.0, gordura: 12.0, fibra: 0, sodio: 350, porcao: 30, unidade: 'g' },
  { id: 150, name: 'Requeijão light', source: 'CUSTOM', source_id: null, calorias: 165, proteina: 9.5, carboidrato: 3.5, gordura: 13.0, fibra: 0, sodio: 420, porcao: 30, unidade: 'g' },
  { id: 18, name: 'Iogurte natural', source: 'USDA', source_id: 'usda_001', calorias: 61, proteina: 3.5, carboidrato: 4.7, gordura: 3.3, fibra: 0, sodio: 46, porcao: 150, unidade: 'ml' },
  { id: 151, name: 'Iogurte grego', source: 'USDA', source_id: 'usda_151', calorias: 97, proteina: 9.0, carboidrato: 3.6, gordura: 5.0, fibra: 0, sodio: 36, porcao: 100, unidade: 'g' },
  { id: 152, name: 'Iogurte desnatado', source: 'TACO', source_id: 'taco_152', calorias: 42, proteina: 4.1, carboidrato: 5.9, gordura: 0.3, fibra: 0, sodio: 60, porcao: 170, unidade: 'ml' },
  { id: 153, name: 'Coalhada', source: 'TACO', source_id: 'taco_153', calorias: 66, proteina: 3.2, carboidrato: 3.8, gordura: 4.2, fibra: 0, sodio: 48, porcao: 150, unidade: 'ml' },
  { id: 154, name: 'Kefir', source: 'USDA', source_id: 'usda_154', calorias: 55, proteina: 3.3, carboidrato: 4.5, gordura: 2.5, fibra: 0, sodio: 40, porcao: 150, unidade: 'ml' },
  
  // === FRUTAS ===
  { id: 5, name: 'Banana', source: 'TACO', source_id: 'taco_005', calorias: 89, proteina: 1.1, carboidrato: 23, gordura: 0.3, fibra: 2.6, sodio: 1, porcao: 100, unidade: 'unidade' },
  { id: 12, name: 'Maçã', source: 'TACO', source_id: 'taco_012', calorias: 52, proteina: 0.3, carboidrato: 14, gordura: 0.2, fibra: 2.4, sodio: 1, porcao: 130, unidade: 'unidade' },
  { id: 155, name: 'Laranja', source: 'TACO', source_id: 'taco_155', calorias: 37, proteina: 1.0, carboidrato: 8.9, gordura: 0.1, fibra: 0.8, sodio: 0, porcao: 130, unidade: 'unidade' },
  { id: 156, name: 'Mamão papaya', source: 'TACO', source_id: 'taco_156', calorias: 40, proteina: 0.5, carboidrato: 10.4, gordura: 0.1, fibra: 1.0, sodio: 3, porcao: 100, unidade: 'g' },
  { id: 157, name: 'Melancia', source: 'TACO', source_id: 'taco_157', calorias: 33, proteina: 0.9, carboidrato: 8.1, gordura: 0, fibra: 0.1, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 158, name: 'Melão', source: 'TACO', source_id: 'taco_158', calorias: 29, proteina: 0.7, carboidrato: 7.5, gordura: 0, fibra: 0.3, sodio: 11, porcao: 100, unidade: 'g' },
  { id: 159, name: 'Morango', source: 'TACO', source_id: 'taco_159', calorias: 30, proteina: 0.9, carboidrato: 6.8, gordura: 0.3, fibra: 1.7, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 160, name: 'Uva', source: 'TACO', source_id: 'taco_160', calorias: 53, proteina: 0.7, carboidrato: 13.7, gordura: 0.2, fibra: 0.9, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 161, name: 'Manga', source: 'TACO', source_id: 'taco_161', calorias: 51, proteina: 0.4, carboidrato: 12.8, gordura: 0.3, fibra: 1.6, sodio: 2, porcao: 100, unidade: 'g' },
  { id: 162, name: 'Abacaxi', source: 'TACO', source_id: 'taco_162', calorias: 48, proteina: 0.9, carboidrato: 12.3, gordura: 0.1, fibra: 1.0, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 163, name: 'Pera', source: 'TACO', source_id: 'taco_163', calorias: 53, proteina: 0.6, carboidrato: 14.0, gordura: 0.1, fibra: 3.0, sodio: 0, porcao: 130, unidade: 'unidade' },
  { id: 164, name: 'Kiwi', source: 'USDA', source_id: 'usda_164', calorias: 61, proteina: 1.1, carboidrato: 14.7, gordura: 0.5, fibra: 3.0, sodio: 3, porcao: 100, unidade: 'g' },
  { id: 165, name: 'Abacate', source: 'TACO', source_id: 'taco_165', calorias: 96, proteina: 1.2, carboidrato: 6.0, gordura: 8.4, fibra: 6.3, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 166, name: 'Açaí (polpa)', source: 'TACO', source_id: 'taco_166', calorias: 58, proteina: 0.8, carboidrato: 6.2, gordura: 3.9, fibra: 2.6, sodio: 4, porcao: 100, unidade: 'g' },
  { id: 167, name: 'Goiaba', source: 'TACO', source_id: 'taco_167', calorias: 54, proteina: 1.1, carboidrato: 13.0, gordura: 0.4, fibra: 6.2, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 168, name: 'Limão', source: 'TACO', source_id: 'taco_168', calorias: 32, proteina: 0.9, carboidrato: 11.1, gordura: 0.1, fibra: 0, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 169, name: 'Maracujá', source: 'TACO', source_id: 'taco_169', calorias: 68, proteina: 2.0, carboidrato: 12.3, gordura: 2.1, fibra: 1.1, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 170, name: 'Coco fresco', source: 'TACO', source_id: 'taco_170', calorias: 354, proteina: 3.3, carboidrato: 15.2, gordura: 33.5, fibra: 9.0, sodio: 20, porcao: 50, unidade: 'g' },
  { id: 171, name: 'Frutas vermelhas (mix)', source: 'CUSTOM', source_id: null, calorias: 43, proteina: 1.0, carboidrato: 10.0, gordura: 0.3, fibra: 3.0, sodio: 1, porcao: 100, unidade: 'g' },
  
  // === VERDURAS E LEGUMES ===
  { id: 7, name: 'Brócolis cozido', source: 'TACO', source_id: 'taco_007', calorias: 25, proteina: 1.9, carboidrato: 4.5, gordura: 0.2, fibra: 3.4, sodio: 8, porcao: 100, unidade: 'g' },
  { id: 14, name: 'Tomate', source: 'TACO', source_id: 'taco_014', calorias: 18, proteina: 0.9, carboidrato: 3.9, gordura: 0.2, fibra: 1.2, sodio: 5, porcao: 100, unidade: 'g' },
  { id: 15, name: 'Alface', source: 'TACO', source_id: 'taco_015', calorias: 14, proteina: 1.4, carboidrato: 2.9, gordura: 0.2, fibra: 2.1, sodio: 8, porcao: 100, unidade: 'g' },
  { id: 172, name: 'Espinafre cozido', source: 'TACO', source_id: 'taco_172', calorias: 23, proteina: 2.9, carboidrato: 3.6, gordura: 0.4, fibra: 2.4, sodio: 79, porcao: 100, unidade: 'g' },
  { id: 173, name: 'Couve refogada', source: 'TACO', source_id: 'taco_173', calorias: 90, proteina: 2.9, carboidrato: 8.5, gordura: 5.4, fibra: 2.6, sodio: 12, porcao: 100, unidade: 'g' },
  { id: 174, name: 'Rúcula', source: 'TACO', source_id: 'taco_174', calorias: 25, proteina: 2.6, carboidrato: 3.6, gordura: 0.7, fibra: 1.6, sodio: 27, porcao: 50, unidade: 'g' },
  { id: 175, name: 'Cenoura crua', source: 'TACO', source_id: 'taco_175', calorias: 34, proteina: 1.3, carboidrato: 7.7, gordura: 0.2, fibra: 3.2, sodio: 4, porcao: 100, unidade: 'g' },
  { id: 176, name: 'Cenoura cozida', source: 'TACO', source_id: 'taco_176', calorias: 30, proteina: 0.8, carboidrato: 6.7, gordura: 0.2, fibra: 2.6, sodio: 43, porcao: 100, unidade: 'g' },
  { id: 177, name: 'Abobrinha', source: 'TACO', source_id: 'taco_177', calorias: 15, proteina: 1.1, carboidrato: 3.0, gordura: 0.1, fibra: 1.1, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 178, name: 'Berinjela', source: 'TACO', source_id: 'taco_178', calorias: 19, proteina: 1.2, carboidrato: 4.5, gordura: 0.1, fibra: 2.5, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 179, name: 'Pepino', source: 'TACO', source_id: 'taco_179', calorias: 10, proteina: 0.9, carboidrato: 2.0, gordura: 0.1, fibra: 1.1, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 180, name: 'Beterraba cozida', source: 'TACO', source_id: 'taco_180', calorias: 32, proteina: 1.2, carboidrato: 7.2, gordura: 0.1, fibra: 1.9, sodio: 13, porcao: 100, unidade: 'g' },
  { id: 181, name: 'Cebola', source: 'TACO', source_id: 'taco_181', calorias: 39, proteina: 1.7, carboidrato: 8.9, gordura: 0.1, fibra: 2.2, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 182, name: 'Alho', source: 'TACO', source_id: 'taco_182', calorias: 113, proteina: 7.0, carboidrato: 23.9, gordura: 0.2, fibra: 4.3, sodio: 10, porcao: 10, unidade: 'g' },
  { id: 183, name: 'Pimentão', source: 'TACO', source_id: 'taco_183', calorias: 27, proteina: 1.2, carboidrato: 5.5, gordura: 0.2, fibra: 1.6, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 184, name: 'Couve-flor cozida', source: 'TACO', source_id: 'taco_184', calorias: 19, proteina: 1.6, carboidrato: 3.9, gordura: 0.2, fibra: 2.1, sodio: 3, porcao: 100, unidade: 'g' },
  { id: 185, name: 'Vagem cozida', source: 'TACO', source_id: 'taco_185', calorias: 25, proteina: 1.6, carboidrato: 5.3, gordura: 0.2, fibra: 2.4, sodio: 1, porcao: 100, unidade: 'g' },
  { id: 186, name: 'Repolho', source: 'TACO', source_id: 'taco_186', calorias: 17, proteina: 0.9, carboidrato: 3.9, gordura: 0.1, fibra: 1.9, sodio: 7, porcao: 100, unidade: 'g' },
  { id: 187, name: 'Chuchu cozido', source: 'TACO', source_id: 'taco_187', calorias: 19, proteina: 0.6, carboidrato: 4.7, gordura: 0.1, fibra: 1.2, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 188, name: 'Abóbora cozida', source: 'TACO', source_id: 'taco_188', calorias: 26, proteina: 1.0, carboidrato: 6.5, gordura: 0.1, fibra: 2.2, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 189, name: 'Quiabo cozido', source: 'TACO', source_id: 'taco_189', calorias: 29, proteina: 2.1, carboidrato: 6.4, gordura: 0.2, fibra: 4.6, sodio: 0, porcao: 100, unidade: 'g' },
  { id: 190, name: 'Aspargos', source: 'USDA', source_id: 'usda_190', calorias: 20, proteina: 2.2, carboidrato: 3.9, gordura: 0.1, fibra: 2.1, sodio: 2, porcao: 100, unidade: 'g' },
  { id: 191, name: 'Cogumelos', source: 'USDA', source_id: 'usda_191', calorias: 22, proteina: 3.1, carboidrato: 3.3, gordura: 0.3, fibra: 1.0, sodio: 5, porcao: 100, unidade: 'g' },
  
  // === GORDURAS E ÓLEOS ===
  { id: 8, name: 'Azeite de oliva', source: 'TACO', source_id: 'taco_008', calorias: 884, proteina: 0, carboidrato: 0, gordura: 100, fibra: 0, sodio: 0, porcao: 10, unidade: 'ml' },
  { id: 192, name: 'Óleo de coco', source: 'USDA', source_id: 'usda_192', calorias: 862, proteina: 0, carboidrato: 0, gordura: 100, fibra: 0, sodio: 0, porcao: 10, unidade: 'ml' },
  { id: 193, name: 'Manteiga', source: 'TACO', source_id: 'taco_193', calorias: 726, proteina: 0.6, carboidrato: 0, gordura: 82, fibra: 0, sodio: 11, porcao: 10, unidade: 'g' },
  { id: 194, name: 'Manteiga ghee', source: 'USDA', source_id: 'usda_194', calorias: 900, proteina: 0, carboidrato: 0, gordura: 100, fibra: 0, sodio: 0, porcao: 10, unidade: 'g' },
  { id: 195, name: 'Pasta de amendoim', source: 'USDA', source_id: 'usda_195', calorias: 588, proteina: 25.1, carboidrato: 20.0, gordura: 50.4, fibra: 6.0, sodio: 17, porcao: 30, unidade: 'g' },
  
  // === OLEAGINOSAS ===
  { id: 17, name: 'Castanha do Pará', source: 'TACO', source_id: 'taco_017', calorias: 656, proteina: 14, carboidrato: 12, gordura: 63, fibra: 7.5, sodio: 3, porcao: 10, unidade: 'g' },
  { id: 196, name: 'Castanha de caju', source: 'TACO', source_id: 'taco_196', calorias: 570, proteina: 18.5, carboidrato: 29.1, gordura: 46.3, fibra: 3.0, sodio: 12, porcao: 30, unidade: 'g' },
  { id: 197, name: 'Amendoim torrado', source: 'TACO', source_id: 'taco_197', calorias: 606, proteina: 27.2, carboidrato: 12.5, gordura: 49.4, fibra: 8.0, sodio: 2, porcao: 30, unidade: 'g' },
  { id: 198, name: 'Nozes', source: 'USDA', source_id: 'usda_198', calorias: 654, proteina: 15.2, carboidrato: 13.7, gordura: 65.2, fibra: 6.7, sodio: 2, porcao: 30, unidade: 'g' },
  { id: 199, name: 'Amêndoas', source: 'USDA', source_id: 'usda_199', calorias: 579, proteina: 21.2, carboidrato: 21.7, gordura: 49.9, fibra: 12.5, sodio: 1, porcao: 30, unidade: 'g' },
  { id: 200, name: 'Macadâmia', source: 'USDA', source_id: 'usda_200', calorias: 718, proteina: 7.9, carboidrato: 13.8, gordura: 75.8, fibra: 8.6, sodio: 5, porcao: 30, unidade: 'g' },
  { id: 201, name: 'Pistache', source: 'USDA', source_id: 'usda_201', calorias: 562, proteina: 20.2, carboidrato: 27.2, gordura: 45.3, fibra: 10.6, sodio: 1, porcao: 30, unidade: 'g' },
  { id: 202, name: 'Avelã', source: 'USDA', source_id: 'usda_202', calorias: 628, proteina: 15.0, carboidrato: 16.7, gordura: 60.8, fibra: 9.7, sodio: 0, porcao: 30, unidade: 'g' },
  
  // === SEMENTES ===
  { id: 203, name: 'Chia', source: 'USDA', source_id: 'usda_203', calorias: 486, proteina: 16.5, carboidrato: 42.1, gordura: 30.7, fibra: 34.4, sodio: 16, porcao: 15, unidade: 'g' },
  { id: 204, name: 'Linhaça', source: 'TACO', source_id: 'taco_204', calorias: 495, proteina: 14.1, carboidrato: 43.3, gordura: 32.3, fibra: 33.5, sodio: 27, porcao: 15, unidade: 'g' },
  { id: 205, name: 'Semente de girassol', source: 'USDA', source_id: 'usda_205', calorias: 584, proteina: 20.8, carboidrato: 20.0, gordura: 51.5, fibra: 8.6, sodio: 9, porcao: 30, unidade: 'g' },
  { id: 206, name: 'Semente de abóbora', source: 'USDA', source_id: 'usda_206', calorias: 559, proteina: 30.2, carboidrato: 10.7, gordura: 49.1, fibra: 6.0, sodio: 7, porcao: 30, unidade: 'g' },
  { id: 207, name: 'Gergelim', source: 'TACO', source_id: 'taco_207', calorias: 584, proteina: 21.2, carboidrato: 21.6, gordura: 50.4, fibra: 11.8, sodio: 11, porcao: 15, unidade: 'g' },
  
  // === SUPLEMENTOS ===
  { id: 19, name: 'Whey Protein', source: 'CUSTOM', source_id: null, calorias: 120, proteina: 24, carboidrato: 3, gordura: 1.5, fibra: 0, sodio: 100, porcao: 30, unidade: 'g', observacoes: 'Suplemento proteico' },
  { id: 208, name: 'Whey Protein Isolado', source: 'CUSTOM', source_id: null, calorias: 110, proteina: 27, carboidrato: 1, gordura: 0.5, fibra: 0, sodio: 90, porcao: 30, unidade: 'g' },
  { id: 209, name: 'Caseína', source: 'CUSTOM', source_id: null, calorias: 115, proteina: 24, carboidrato: 3, gordura: 1, fibra: 0, sodio: 100, porcao: 30, unidade: 'g' },
  { id: 210, name: 'Albumina', source: 'CUSTOM', source_id: null, calorias: 108, proteina: 25, carboidrato: 0.5, gordura: 0.3, fibra: 0, sodio: 90, porcao: 30, unidade: 'g' },
  { id: 211, name: 'Creatina', source: 'CUSTOM', source_id: null, calorias: 0, proteina: 0, carboidrato: 0, gordura: 0, fibra: 0, sodio: 0, porcao: 5, unidade: 'g' },
  { id: 212, name: 'BCAA', source: 'CUSTOM', source_id: null, calorias: 0, proteina: 0, carboidrato: 0, gordura: 0, fibra: 0, sodio: 0, porcao: 5, unidade: 'g' },
  { id: 213, name: 'Dextrose', source: 'CUSTOM', source_id: null, calorias: 380, proteina: 0, carboidrato: 95, gordura: 0, fibra: 0, sodio: 0, porcao: 30, unidade: 'g' },
  { id: 214, name: 'Maltodextrina', source: 'CUSTOM', source_id: null, calorias: 380, proteina: 0, carboidrato: 95, gordura: 0, fibra: 0, sodio: 0, porcao: 30, unidade: 'g' },
  { id: 215, name: 'Colágeno hidrolisado', source: 'CUSTOM', source_id: null, calorias: 35, proteina: 9, carboidrato: 0, gordura: 0, fibra: 0, sodio: 15, porcao: 10, unidade: 'g' },
  
  // === BEBIDAS ===
  { id: 216, name: 'Água de coco', source: 'TACO', source_id: 'taco_216', calorias: 22, proteina: 0, carboidrato: 5.3, gordura: 0, fibra: 0, sodio: 2, porcao: 200, unidade: 'ml' },
  { id: 217, name: 'Suco de laranja natural', source: 'TACO', source_id: 'taco_217', calorias: 45, proteina: 0.8, carboidrato: 10.4, gordura: 0.2, fibra: 0.1, sodio: 1, porcao: 200, unidade: 'ml' },
  { id: 218, name: 'Suco verde', source: 'CUSTOM', source_id: null, calorias: 35, proteina: 1.5, carboidrato: 7.0, gordura: 0.2, fibra: 1.5, sodio: 10, porcao: 200, unidade: 'ml' },
  { id: 219, name: 'Chá verde', source: 'USDA', source_id: 'usda_219', calorias: 1, proteina: 0, carboidrato: 0, gordura: 0, fibra: 0, sodio: 0, porcao: 200, unidade: 'ml' },
  { id: 220, name: 'Café preto', source: 'TACO', source_id: 'taco_220', calorias: 3, proteina: 0.3, carboidrato: 0.7, gordura: 0, fibra: 0, sodio: 2, porcao: 50, unidade: 'ml' },
  { id: 221, name: 'Leite de amêndoas', source: 'USDA', source_id: 'usda_221', calorias: 17, proteina: 0.6, carboidrato: 0.6, gordura: 1.4, fibra: 0, sodio: 67, porcao: 200, unidade: 'ml' },
  { id: 222, name: 'Leite de aveia', source: 'USDA', source_id: 'usda_222', calorias: 48, proteina: 1.0, carboidrato: 9.0, gordura: 1.5, fibra: 0.8, sodio: 36, porcao: 200, unidade: 'ml' },
  { id: 223, name: 'Leite de coco', source: 'USDA', source_id: 'usda_223', calorias: 45, proteina: 0.5, carboidrato: 2.0, gordura: 4.5, fibra: 0, sodio: 15, porcao: 200, unidade: 'ml' },
  
  // === OUTROS ===
  { id: 224, name: 'Mel', source: 'TACO', source_id: 'taco_224', calorias: 309, proteina: 0.3, carboidrato: 84.0, gordura: 0, fibra: 0, sodio: 5, porcao: 20, unidade: 'g' },
  { id: 225, name: 'Açúcar mascavo', source: 'TACO', source_id: 'taco_225', calorias: 369, proteina: 0.4, carboidrato: 94.5, gordura: 0, fibra: 0, sodio: 29, porcao: 10, unidade: 'g' },
  { id: 226, name: 'Adoçante stevia', source: 'CUSTOM', source_id: null, calorias: 0, proteina: 0, carboidrato: 0, gordura: 0, fibra: 0, sodio: 0, porcao: 1, unidade: 'g' },
  { id: 227, name: 'Cacau em pó', source: 'USDA', source_id: 'usda_227', calorias: 228, proteina: 19.6, carboidrato: 57.9, gordura: 13.7, fibra: 33.2, sodio: 21, porcao: 10, unidade: 'g' },
  { id: 228, name: 'Chocolate amargo 70%', source: 'USDA', source_id: 'usda_228', calorias: 598, proteina: 7.8, carboidrato: 45.9, gordura: 42.6, fibra: 10.9, sodio: 20, porcao: 30, unidade: 'g' },
  { id: 229, name: 'Tofu', source: 'TACO', source_id: 'taco_229', calorias: 64, proteina: 6.6, carboidrato: 2.2, gordura: 3.5, fibra: 0.8, sodio: 7, porcao: 100, unidade: 'g' },
  { id: 230, name: 'Tempeh', source: 'USDA', source_id: 'usda_230', calorias: 192, proteina: 20.3, carboidrato: 7.6, gordura: 10.8, fibra: 0, sodio: 9, porcao: 100, unidade: 'g' },
  { id: 231, name: 'Hummus', source: 'USDA', source_id: 'usda_231', calorias: 166, proteina: 7.9, carboidrato: 14.3, gordura: 9.6, fibra: 6.0, sodio: 379, porcao: 100, unidade: 'g' },
  { id: 232, name: 'Tahine', source: 'USDA', source_id: 'usda_232', calorias: 595, proteina: 17.0, carboidrato: 21.2, gordura: 53.8, fibra: 9.3, sodio: 115, porcao: 30, unidade: 'g' }
];

// Helper functions para gerenciar alimentos customizados
// Mantido para compatibilidade com modo offline/sem Supabase
export const getCustomFoodsLocal = () => {
  const stored = localStorage.getItem('fitjourney_custom_foods');
  return stored ? JSON.parse(stored) : [];
};

export const saveCustomFoodLocal = (food) => {
  const customFoods = getCustomFoodsLocal();
  const newFood = {
    ...food,
    id: Date.now(),
    source: 'CUSTOM',
    source_id: null,
    created_at: new Date().toISOString()
  };
  customFoods.push(newFood);
  localStorage.setItem('fitjourney_custom_foods', JSON.stringify(customFoods));
  return newFood;
};

export const updateCustomFoodLocal = (id, updates) => {
  const customFoods = getCustomFoodsLocal();
  const index = customFoods.findIndex(f => f.id === id);
  if (index !== -1) {
    customFoods[index] = { ...customFoods[index], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem('fitjourney_custom_foods', JSON.stringify(customFoods));
    return customFoods[index];
  }
  return null;
};

export const deleteCustomFoodLocal = (id) => {
  const customFoods = getCustomFoodsLocal();
  const filtered = customFoods.filter(f => f.id !== id);
  localStorage.setItem('fitjourney_custom_foods', JSON.stringify(filtered));
  return true;
};

export const getAllFoods = () => {
  return [...mockFoods, ...getCustomFoodsLocal()];
};

// Funções mantidas para compatibilidade (redirect para local)
export const getCustomFoods = getCustomFoodsLocal;
export const saveCustomFood = saveCustomFoodLocal;
export const updateCustomFood = updateCustomFoodLocal;
export const deleteCustomFood = deleteCustomFoodLocal;

// Função para buscar alimento por nome (busca aproximada)
export const findFoodByName = (searchName, allFoods = null) => {
  const foods = allFoods || getAllFoods();
  const searchLower = searchName.toLowerCase().trim();
  
  // 1. Busca exata
  let found = foods.find(f => f.name.toLowerCase() === searchLower);
  if (found) return found;
  
  // 2. Busca por contém
  found = foods.find(f => f.name.toLowerCase().includes(searchLower));
  if (found) return found;
  
  // 3. Busca reversa (nome do banco contém no search)
  found = foods.find(f => searchLower.includes(f.name.toLowerCase()));
  if (found) return found;
  
  // 4. Busca por palavras-chave
  const keywords = searchLower.split(/[\s,]+/).filter(k => k.length > 2);
  for (const keyword of keywords) {
    found = foods.find(f => f.name.toLowerCase().includes(keyword));
    if (found) return found;
  }
  
  // 5. Mapeamento de sinônimos comuns
  const synonyms = {
    'frango': ['peito de frango', 'frango desfiado', 'coxa de frango'],
    'carne': ['carne moída', 'patinho', 'alcatra', 'filé mignon'],
    'peixe': ['tilápia', 'salmão', 'atum'],
    'arroz': ['arroz branco', 'arroz integral'],
    'feijão': ['feijão preto', 'feijão carioca'],
    'ovo': ['ovo cozido', 'ovo mexido', 'omelete'],
    'leite': ['leite desnatado', 'leite integral'],
    'pão': ['pão integral', 'pão francês', 'pão de forma'],
    'iogurte': ['iogurte natural', 'iogurte grego'],
    'queijo': ['queijo minas', 'queijo cottage', 'ricota'],
    'salada': ['alface', 'rúcula', 'tomate'],
    'verdura': ['brócolis', 'espinafre', 'couve'],
    'legume': ['cenoura', 'abobrinha', 'berinjela'],
    'fruta': ['banana', 'maçã', 'laranja', 'morango'],
    'castanha': ['castanha do pará', 'castanha de caju', 'amêndoas'],
    'oleaginosa': ['nozes', 'amêndoas', 'castanha'],
    'proteína': ['whey protein', 'frango', 'ovo', 'peixe']
  };
  
  for (const [key, values] of Object.entries(synonyms)) {
    if (searchLower.includes(key)) {
      for (const val of values) {
        found = foods.find(f => f.name.toLowerCase().includes(val));
        if (found) return found;
      }
    }
  }
  
  return null;
};

// Função para resolver alimentos do pré-plano
export const resolveDraftFoods = (draftFoods, allFoods = null) => {
  const foods = allFoods || getAllFoods();
  
  return draftFoods.map((foodName, index) => {
    const foundFood = findFoodByName(foodName, foods);
    
    if (foundFood) {
      return {
        id: `f${Date.now()}-${index}`,
        foodId: foundFood.id,
        food_id: foundFood.id,
        name: foundFood.name,
        quantity: foundFood.porcao || 100,
        unit: foundFood.unidade || 'g',
        measure: ''
      };
    }
    
    // Se não encontrou, retorna como alimento genérico
    return {
      id: `f${Date.now()}-${index}`,
      foodId: null,
      food_id: null,
      name: foodName,
      quantity: 100,
      unit: 'g',
      measure: '',
      isCustom: true,
      notFound: true
    };
  });
};

export const mockMeals = [
  { id: 'm1', name: 'Café da Manhã', time: '07:00', color: '#F59E0B' },
  { id: 'm2', name: 'Lanche da Manhã', time: '10:00', color: '#10B981' },
  { id: 'm3', name: 'Almoço', time: '12:30', color: '#3B82F6' },
  { id: 'm4', name: 'Lanche da Tarde', time: '15:30', color: '#8B5CF6' },
  { id: 'm5', name: 'Jantar', time: '19:00', color: '#EF4444' },
  { id: 'm6', name: 'Ceia', time: '21:30', color: '#6366F1' }
];

export const mockPatients = [
  { id: 1, name: 'Ana Paula Silva', email: 'ana.silva@email.com', phone: '(11) 98765-4321', age: 28, status: 'Ativo', lastVisit: '2024-01-15', avatar: 'https://ui-avatars.com/api/?name=Ana+Paula+Silva&background=0F766E&color=fff' },
  { id: 2, name: 'Carlos Mendes', email: 'carlos.m@email.com', phone: '(11) 97654-3210', age: 35, status: 'Ativo', lastVisit: '2024-01-12', avatar: 'https://ui-avatars.com/api/?name=Carlos+Mendes&background=0F766E&color=fff' },
  { id: 3, name: 'Mariana Costa', email: 'mari.costa@email.com', phone: '(21) 96543-2109', age: 42, status: 'Ativo', lastVisit: '2024-01-10', avatar: 'https://ui-avatars.com/api/?name=Mariana+Costa&background=0F766E&color=fff' },
  { id: 4, name: 'Pedro Oliveira', email: 'pedro.oli@email.com', phone: '(11) 95432-1098', age: 31, status: 'Inativo', lastVisit: '2023-12-20', avatar: 'https://ui-avatars.com/api/?name=Pedro+Oliveira&background=64748B&color=fff' },
  { id: 5, name: 'Juliana Santos', email: 'ju.santos@email.com', phone: '(85) 94321-0987', age: 26, status: 'Ativo', lastVisit: '2024-01-14', avatar: 'https://ui-avatars.com/api/?name=Juliana+Santos&background=0F766E&color=fff' },
  { id: 6, name: 'Roberto Alves', email: 'roberto.a@email.com', phone: '(11) 93210-9876', age: 38, status: 'Ativo', lastVisit: '2024-01-11', avatar: 'https://ui-avatars.com/api/?name=Roberto+Alves&background=0F766E&color=fff' },
  { id: 7, name: 'Fernanda Lima', email: 'fe.lima@email.com', phone: '(21) 92109-8765', age: 29, status: 'Ativo', lastVisit: '2024-01-13', avatar: 'https://ui-avatars.com/api/?name=Fernanda+Lima&background=0F766E&color=fff' },
  { id: 8, name: 'Lucas Pereira', email: 'lucas.p@email.com', phone: '(11) 91098-7654', age: 33, status: 'Ativo', lastVisit: '2024-01-09', avatar: 'https://ui-avatars.com/api/?name=Lucas+Pereira&background=0F766E&color=fff' },
  { id: 9, name: 'Camila Rocha', email: 'camila.r@email.com', phone: '(47) 90987-6543', age: 27, status: 'Ativo', lastVisit: '2024-01-16', avatar: 'https://ui-avatars.com/api/?name=Camila+Rocha&background=0F766E&color=fff' },
  { id: 10, name: 'Rafael Souza', email: 'rafael.s@email.com', phone: '(11) 99876-5432', age: 40, status: 'Ativo', lastVisit: '2024-01-08', avatar: 'https://ui-avatars.com/api/?name=Rafael+Souza&background=0F766E&color=fff' }
];

export const mockMealPlans = [
  {
    id: 1,
    patientId: 1,
    date: '2024-01-15',
    meals: [
      {
        id: 'm1',
        name: 'Café da Manhã',
        time: '07:00',
        foods: [
          { id: 'f1', foodId: 9, quantity: 50, unit: 'g', measure: '3 colheres de sopa' },
          { id: 'f2', foodId: 10, quantity: 200, unit: 'ml', measure: '1 copo' },
          { id: 'f3', foodId: 5, quantity: 100, unit: 'g', measure: '1 unidade' }
        ]
      },
      {
        id: 'm3',
        name: 'Almoço',
        time: '12:30',
        foods: [
          { id: 'f4', foodId: 1, quantity: 150, unit: 'g', measure: '4 colheres de sopa' },
          { id: 'f5', foodId: 2, quantity: 100, unit: 'g', measure: '2 conchas' },
          { id: 'f6', foodId: 3, quantity: 120, unit: 'g', measure: '1 filé médio' },
          { id: 'f7', foodId: 7, quantity: 80, unit: 'g', measure: '3 colheres de sopa' }
        ]
      },
      {
        id: 'm5',
        name: 'Jantar',
        time: '19:00',
        foods: [
          { id: 'f8', foodId: 6, quantity: 150, unit: 'g', measure: '1 batata média' },
          { id: 'f9', foodId: 16, quantity: 120, unit: 'g', measure: '1 filé' },
          { id: 'f10', foodId: 14, quantity: 100, unit: 'g', measure: '2 unidades' }
        ]
      }
    ]
  }
];

export const householdMeasures = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'unidade', label: 'Unidade' },
  { value: 'colher_sopa', label: 'Colher de sopa' },
  { value: 'colher_cha', label: 'Colher de chá' },
  { value: 'xicara', label: 'Xícara' },
  { value: 'copo', label: 'Copo' },
  { value: 'concha', label: 'Concha' },
  { value: 'fatia', label: 'Fatia' },
  { value: 'porcao', label: 'Porção' }
];

export const anamnesisAlerts = [
  { condition: 'Gastrite', alert: 'Evitar café, condimentos e alimentos ácidos' },
  { condition: 'Diabetes', alert: 'Controlar carboidratos e açúcares' },
  { condition: 'Hipertensão', alert: 'Reduzir sódio e sal' },
  { condition: 'Intolerância à lactose', alert: 'Evitar laticínios ou usar versões sem lactose' }
];
