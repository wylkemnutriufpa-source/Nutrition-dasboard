import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Gera relatório PDF do progresso do paciente
 * @param {Object} patient - Dados do paciente
 * @param {Array} journeyData - Dados da jornada (peso, medidas)
 * @param {Object} professionalInfo - Informações do profissional
 */
export const generatePatientProgressReport = async (patient, journeyData, professionalInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 20;

  // ===== CABEÇALHO =====
  doc.setFontSize(20);
  doc.setTextColor(15, 118, 110); // teal-700
  doc.text('Relatório de Progresso', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // ===== INFORMAÇÕES DO PROFISSIONAL =====
  if (professionalInfo) {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Profissional: ${professionalInfo.name}`, 14, yPosition);
    yPosition += 7;
    if (professionalInfo.email) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Email: ${professionalInfo.email}`, 14, yPosition);
      yPosition += 10;
    }
  }

  // ===== INFORMAÇÕES DO PACIENTE =====
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Dados do Paciente', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.text(`Nome: ${patient.name || 'N/A'}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Email: ${patient.email || 'N/A'}`, 14, yPosition);
  yPosition += 10;

  // ===== DADOS DA JORNADA =====
  if (journeyData && journeyData.length > 0) {
    const journey = journeyData[0]; // Pega o plano mais recente

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Plano Atual', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    if (journey.plan_name) {
      doc.text(`Nome do Plano: ${journey.plan_name}`, 14, yPosition);
      yPosition += 6;
    }

    if (journey.plan_start_date) {
      doc.text(`Início: ${format(new Date(journey.plan_start_date), 'dd/MM/yyyy')}`, 14, yPosition);
      yPosition += 6;
    }

    if (journey.plan_end_date) {
      doc.text(`Término: ${format(new Date(journey.plan_end_date), 'dd/MM/yyyy')}`, 14, yPosition);
      yPosition += 6;
    }

    if (journey.plan_duration_days) {
      doc.text(`Duração: ${journey.plan_duration_days} dias`, 14, yPosition);
      yPosition += 10;
    }

    // ===== EVOLUÇÃO DE PESO =====
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Evolução de Peso', 14, yPosition);
    yPosition += 8;

    const weightData = [
      ['Tipo', 'Peso (kg)', 'Diferença'],
      [
        'Peso Inicial',
        journey.initial_weight ? journey.initial_weight.toString() : 'N/A',
        '-'
      ],
      [
        'Peso Atual',
        journey.current_weight ? journey.current_weight.toString() : 'N/A',
        journey.initial_weight && journey.current_weight
          ? `${(journey.current_weight - journey.initial_weight).toFixed(1)} kg`
          : '-'
      ],
      [
        'Peso Meta',
        journey.target_weight ? journey.target_weight.toString() : 'N/A',
        journey.current_weight && journey.target_weight
          ? `${(journey.target_weight - journey.current_weight).toFixed(1)} kg restantes`
          : '-'
      ]
    ];

    doc.autoTable({
      startY: yPosition,
      head: [weightData[0]],
      body: weightData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: 255 },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 }
    });

    yPosition = doc.lastAutoTable.finalY + 10;

    // ===== PROGRESSO =====
    if (journey.initial_weight && journey.current_weight && journey.target_weight) {
      const totalToLose = journey.initial_weight - journey.target_weight;
      const alreadyLost = journey.initial_weight - journey.current_weight;
      const progressPercentage = (alreadyLost / totalToLose) * 100;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Progresso:', 14, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.text(`${progressPercentage.toFixed(1)}% concluído`, 14, yPosition);
      yPosition += 5;
      doc.text(`Perdeu: ${alreadyLost.toFixed(1)} kg de ${totalToLose.toFixed(1)} kg`, 14, yPosition);
      yPosition += 10;
    }

    // ===== OBSERVAÇÕES =====
    if (journey.notes) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Observações', 14, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(journey.notes, pageWidth - 28);
      doc.text(splitNotes, 14, yPosition);
      yPosition += splitNotes.length * 5 + 10;
    }
  } else {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Nenhum dado de jornada disponível.', 14, yPosition);
  }

  // ===== RODAPÉ =====
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // ===== SALVAR PDF =====
  const fileName = `relatorio_${patient.name?.replace(/\s+/g, '_') || 'paciente'}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  
  // Abrir em nova aba ao invés de download (solução para iframe sandbox)
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Gera relatório simplificado de peso
 */
export const generateWeightReport = (patient, journeyData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  doc.setFontSize(18);
  doc.setTextColor(15, 118, 110);
  doc.text('Relatório de Peso', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Paciente: ${patient.name}`, 14, 35);

  if (journeyData && journeyData[0]) {
    const journey = journeyData[0];
    
    const data = [
      ['Medida', 'Valor'],
      ['Peso Inicial', journey.initial_weight ? `${journey.initial_weight} kg` : 'N/A'],
      ['Peso Atual', journey.current_weight ? `${journey.current_weight} kg` : 'N/A'],
      ['Peso Meta', journey.target_weight ? `${journey.target_weight} kg` : 'N/A'],
      [
        'Perdido',
        journey.initial_weight && journey.current_weight
          ? `${(journey.initial_weight - journey.current_weight).toFixed(1)} kg`
          : 'N/A'
      ]
    ];

    doc.autoTable({
      startY: 45,
      head: [data[0]],
      body: data.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [15, 118, 110] }
    });
  }

  doc.save(`peso_${patient.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

/**
 * Gera PDF da Anamnese
 */
export const generateAnamnesePDF = (patient, anamnesis, professionalInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 20;

  // Cabeçalho
  doc.setFontSize(20);
  doc.setTextColor(15, 118, 110);
  doc.text('Anamnese Nutricional', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // Info Profissional
  if (professionalInfo) {
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Profissional: ${professionalInfo.name}`, 14, yPosition);
    yPosition += 10;
  }

  // Info Paciente
  doc.setFontSize(12);
  doc.text(`Paciente: ${patient.name}`, 14, yPosition);
  yPosition += 10;

  if (!anamnesis) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Nenhuma anamnese registrada.', 14, yPosition);
    doc.save(`anamnese_${patient.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    return;
  }

  // Objetivo
  if (anamnesis.objective) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Objetivo', 14, yPosition);
    yPosition += 7;
    doc.setFontSize(11);
    const objective = doc.splitTextToSize(anamnesis.objective, pageWidth - 28);
    doc.text(objective, 14, yPosition);
    yPosition += objective.length * 5 + 8;
  }

  // Histórico Clínico
  if (anamnesis.medical_history) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Histórico Clínico', 14, yPosition);
    yPosition += 7;
    doc.setFontSize(11);
    const history = doc.splitTextToSize(anamnesis.medical_history, pageWidth - 28);
    doc.text(history, 14, yPosition);
    yPosition += history.length * 5 + 8;
  }

  // Medicamentos
  if (anamnesis.medications) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(14);
    doc.text('Medicamentos', 14, yPosition);
    yPosition += 7;
    doc.setFontSize(11);
    const meds = doc.splitTextToSize(anamnesis.medications, pageWidth - 28);
    doc.text(meds, 14, yPosition);
    yPosition += meds.length * 5 + 8;
  }

  // Hábitos Alimentares
  if (anamnesis.eating_habits) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(14);
    doc.text('Hábitos Alimentares', 14, yPosition);
    yPosition += 7;
    doc.setFontSize(11);
    const habits = doc.splitTextToSize(anamnesis.eating_habits, pageWidth - 28);
    doc.text(habits, 14, yPosition);
    yPosition += habits.length * 5 + 8;
  }

  // Observações
  if (anamnesis.notes) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(14);
    doc.text('Observações', 14, yPosition);
    yPosition += 7;
    doc.setFontSize(11);
    const notes = doc.splitTextToSize(anamnesis.notes, pageWidth - 28);
    doc.text(notes, 14, yPosition);
  }

  // Rodapé
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`anamnese_${patient.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

/**
 * Gera PDF do Plano Alimentar
 */
export const generateMealPlanPDF = (patient, mealPlan, professionalInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 20;

  doc.setFontSize(20);
  doc.setTextColor(15, 118, 110);
  doc.text('Plano Alimentar', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  if (professionalInfo) {
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Profissional: ${professionalInfo.name}`, 14, yPosition);
    yPosition += 10;
  }

  doc.setFontSize(12);
  doc.text(`Paciente: ${patient.name}`, 14, yPosition);
  yPosition += 10;

  if (!mealPlan) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Nenhum plano alimentar cadastrado.', 14, yPosition);
    doc.save(`plano_alimentar_${patient.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    return;
  }

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`Plano: ${mealPlan.name}`, 14, yPosition);
  yPosition += 10;

  if (mealPlan.description) {
    doc.setFontSize(11);
    const desc = doc.splitTextToSize(mealPlan.description, pageWidth - 28);
    doc.text(desc, 14, yPosition);
    yPosition += desc.length * 5 + 10;
  }

  // Refeições
  if (mealPlan.meals && Array.isArray(mealPlan.meals)) {
    mealPlan.meals.forEach((meal, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(13);
      doc.setTextColor(15, 118, 110);
      doc.text(meal.name || `Refeição ${index + 1}`, 14, yPosition);
      yPosition += 7;

      if (meal.time) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Horário: ${meal.time}`, 14, yPosition);
        yPosition += 6;
      }

      if (meal.foods && Array.isArray(meal.foods)) {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        meal.foods.forEach(food => {
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Usar customName se existir, senão usar name
          const displayName = food.customName || food.name;
          doc.text(`• ${displayName} - ${food.quantity}`, 18, yPosition);
          yPosition += 5;
          
          // Adicionar observações do alimento se existirem
          if (food.observations) {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            const obsLines = doc.splitTextToSize(`  Obs: ${food.observations}`, pageWidth - 40);
            obsLines.forEach(line => {
              if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(line, 22, yPosition);
              yPosition += 4;
            });
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
          }
        });
      }

      yPosition += 8;
    });
  }

  // Observações gerais do plano
  if (mealPlan.observations || mealPlan.orientations) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }
    
    yPosition += 5;
    doc.setFontSize(13);
    doc.setTextColor(15, 118, 110);
    doc.text('Observações e Orientações', 14, yPosition);
    yPosition += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    if (mealPlan.observations) {
      const obsLines = doc.splitTextToSize(mealPlan.observations, pageWidth - 28);
      obsLines.forEach(line => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 14, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }
    
    if (mealPlan.orientations) {
      const orientLines = doc.splitTextToSize(mealPlan.orientations, pageWidth - 28);
      orientLines.forEach(line => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 14, yPosition);
        yPosition += 5;
      });
    }
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`plano_alimentar_${patient.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};


/**
 * Gera PDF de Receitas do paciente
 * @param {Object} patient - Dados do paciente
 * @param {Array} recipes - Array de receitas
 * @param {Object} professionalInfo - Informações do profissional
 */
export const generateRecipesPDF = async (patient, recipes, professionalInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // Função auxiliar para adicionar nova página se necessário
  const checkPageBreak = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // ===== CABEÇALHO =====
  doc.setFontSize(20);
  doc.setTextColor(15, 118, 110);
  doc.text('Receitas Personalizadas', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // ===== PROFISSIONAL =====
  if (professionalInfo) {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Profissional: ${professionalInfo.name}`, 14, yPosition);
    yPosition += 7;
    if (professionalInfo.email) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Email: ${professionalInfo.email}`, 14, yPosition);
      yPosition += 10;
    }
  }

  // ===== PACIENTE =====
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Paciente: ${patient.name || 'N/A'}`, 14, yPosition);
  yPosition += 15;

  // ===== RECEITAS =====
  if (!recipes || recipes.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Nenhuma receita disponível', 14, yPosition);
  } else {
    recipes.forEach((recipe, index) => {
      checkPageBreak(40);

      // Título da receita
      doc.setFontSize(14);
      doc.setTextColor(15, 118, 110);
      doc.text(`${index + 1}. ${recipe.title || 'Receita sem título'}`, 14, yPosition);
      yPosition += 8;

      // Categoria
      if (recipe.category) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Categoria: ${recipe.category}`, 14, yPosition);
        yPosition += 6;
      }

      // Tempo de preparo
      if (recipe.prep_time) {
        doc.text(`Tempo de preparo: ${recipe.prep_time} minutos`, 14, yPosition);
        yPosition += 6;
      }

      // Ingredientes
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        checkPageBreak(15);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Ingredientes:', 14, yPosition);
        yPosition += 6;

        doc.setFontSize(10);
        recipe.ingredients.forEach(ingredient => {
          checkPageBreak();
          doc.text(`• ${ingredient}`, 18, yPosition);
          yPosition += 5;
        });
        yPosition += 3;
      }

      // Modo de preparo
      if (recipe.instructions) {
        checkPageBreak(15);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Modo de Preparo:', 14, yPosition);
        yPosition += 6;

        doc.setFontSize(10);
        const lines = doc.splitTextToSize(recipe.instructions, pageWidth - 28);
        lines.forEach(line => {
          checkPageBreak();
          doc.text(line, 14, yPosition);
          yPosition += 5;
        });
      }

      // Informação nutricional
      if (recipe.nutrition_info) {
        checkPageBreak(15);
        doc.setFontSize(11);
        doc.setTextColor(15, 118, 110);
        doc.text('Informação Nutricional:', 14, yPosition);
        yPosition += 6;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const nutrition = recipe.nutrition_info;
        if (nutrition.calories) doc.text(`Calorias: ${nutrition.calories} kcal`, 18, yPosition), yPosition += 5;
        if (nutrition.protein) doc.text(`Proteína: ${nutrition.protein}g`, 18, yPosition), yPosition += 5;
        if (nutrition.carbs) doc.text(`Carboidratos: ${nutrition.carbs}g`, 18, yPosition), yPosition += 5;
        if (nutrition.fat) doc.text(`Gordura: ${nutrition.fat}g`, 18, yPosition), yPosition += 5;
      }

      yPosition += 10; // Espaço entre receitas
    });
  }

  // Rodapé
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  doc.save(`receitas_${patient.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

/**
 * Gera PDF de Dicas do paciente
 * @param {Object} patient - Dados do paciente
 * @param {Array} tips - Array de dicas
 * @param {Object} professionalInfo - Informações do profissional
 */
export const generateTipsPDF = async (patient, tips, professionalInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  const checkPageBreak = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // ===== CABEÇALHO =====
  doc.setFontSize(20);
  doc.setTextColor(15, 118, 110);
  doc.text('Dicas de Nutrição', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // ===== PROFISSIONAL =====
  if (professionalInfo) {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Profissional: ${professionalInfo.name}`, 14, yPosition);
    yPosition += 7;
    if (professionalInfo.email) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Email: ${professionalInfo.email}`, 14, yPosition);
      yPosition += 10;
    }
  }

  // ===== PACIENTE =====
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Paciente: ${patient.name || 'N/A'}`, 14, yPosition);
  yPosition += 15;

  // ===== DICAS =====
  if (!tips || tips.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Nenhuma dica disponível', 14, yPosition);
  } else {
    tips.forEach((tip, index) => {
      checkPageBreak(30);

      // Título da dica
      doc.setFontSize(14);
      doc.setTextColor(15, 118, 110);
      doc.text(`${index + 1}. ${tip.title || 'Dica'}`, 14, yPosition);
      yPosition += 8;

      // Categoria
      if (tip.category) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Categoria: ${tip.category}`, 14, yPosition);
        yPosition += 6;
      }

      // Conteúdo
      if (tip.content) {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(tip.content, pageWidth - 28);
        lines.forEach(line => {
          checkPageBreak();
          doc.text(line, 14, yPosition);
          yPosition += 5;
        });
      }

      yPosition += 10; // Espaço entre dicas
    });
  }

  // Rodapé
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  doc.save(`dicas_${patient.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
