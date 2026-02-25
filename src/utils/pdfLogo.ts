import type jsPDF from 'jspdf';

/**
 * Dibuja el encabezado con logo del club en un documento PDF
 * @param doc - Instancia de jsPDF
 * @param orientation - Orientación del documento ('portrait' o 'landscape')
 * @param nombreClub - Nombre del club (por defecto "Club Social Realico")
 */
export const dibujarEncabezadoConLogo = (
  doc: jsPDF,
  orientation: 'portrait' | 'landscape' = 'portrait',
  nombreClub: string = 'Club Social Realico',
) => {
  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const headerHeight = orientation === 'landscape' ? 30 : 40;

  // Fondo del encabezado (beige claro)
  doc.setFillColor(250, 248, 245);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Posición del logo
  const logoX = orientation === 'landscape' ? 20 : 30;
  const logoY = orientation === 'landscape' ? 15 : 22;
  const logoRadius = orientation === 'landscape' ? 12 : 14;

  // Dibujar círculo punteado (borde con puntos cuadrados)
  doc.setDrawColor(60, 60, 60); // Gris oscuro
  doc.setLineWidth(0.5);
  
  // Dibujar puntos alrededor del círculo para simular borde punteado
  const numPoints = 40;
  const angleStep = (2 * Math.PI) / numPoints;
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep;
    const x = logoX + Math.cos(angle) * logoRadius;
    const y = logoY + Math.sin(angle) * logoRadius;
    // Dibujar punto cuadrado pequeño
    doc.setFillColor(60, 60, 60);
    doc.rect(x - 0.3, y - 0.3, 0.6, 0.6, 'F');
  }

  // Texto "CLUB SOCIAL" en arco superior
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(orientation === 'landscape' ? 6 : 7);
  doc.setTextColor(60, 60, 60); // Gris oscuro
  
  const topText = 'CLUB SOCIAL';
  const topRadius = logoRadius - 2;
  const topStartAngle = Math.PI * 0.35; // Ajuste para posición superior
  const topAngleStep = (Math.PI * 0.9) / (topText.length - 1);
  
  for (let i = 0; i < topText.length; i++) {
    const angle = topStartAngle + (i * topAngleStep);
    const x = logoX + Math.cos(angle) * topRadius;
    const y = logoY + Math.sin(angle) * topRadius;
    doc.text(topText[i], x, y, { align: 'center', angle: (angle * 180 / Math.PI) - 90 });
  }

  // Texto "REALICÓ" en arco inferior (ligeramente itálico)
  const bottomText = 'REALICÓ';
  const bottomRadius = logoRadius - 2;
  const bottomStartAngle = Math.PI * 1.15; // Ajuste para posición inferior
  const bottomAngleStep = (Math.PI * 0.9) / (bottomText.length - 1);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(orientation === 'landscape' ? 6 : 7);
  
  for (let i = 0; i < bottomText.length; i++) {
    const angle = bottomStartAngle + (i * bottomAngleStep);
    const x = logoX + Math.cos(angle) * bottomRadius;
    const y = logoY + Math.sin(angle) * bottomRadius;
    doc.text(bottomText[i], x, y, { align: 'center', angle: (angle * 180 / Math.PI) - 90 });
  }

  // Letras "C" y "S" superpuestas en el centro (fuente serif, gris medio)
  doc.setFont('times', 'bold'); // Fuente serif
  doc.setFontSize(orientation === 'landscape' ? 18 : 20);
  doc.setTextColor(120, 120, 120); // Gris medio
  
  // Letra "C" (ligeramente arriba y a la izquierda)
  doc.text('C', logoX - 3, logoY + 2, { align: 'center' });
  
  // Letra "S" (ligeramente abajo y a la derecha, superpuesta)
  doc.text('S', logoX + 3, logoY - 2, { align: 'center' });

  // Título del club a la derecha del logo
  doc.setTextColor(45, 55, 72);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(orientation === 'landscape' ? 16 : 14);
  const titleX = orientation === 'landscape' ? 60 : 70;
  const titleY = orientation === 'landscape' ? 12 : 20;
  doc.text(nombreClub.toUpperCase(), titleX, titleY);

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(orientation === 'landscape' ? 10 : 10);
  const subtitleY = orientation === 'landscape' ? 20 : 30;
  doc.text(nombreClub, titleX, subtitleY);
};

