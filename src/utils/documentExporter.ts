import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import {
  DespachoGlobal,
  SalidaAlmacen,
  HistorialAgua,
  EntradaMercancia,
  Destinatario,
  ExportDestinoData,
  OficioCorrespondenciaData
} from '../types';

const HOSPITAL_NAME = 'HOSPITAL INFANTIL DR. JOSÉ M. RODRÍGUEZ JIMÉNEZ';
const SYSTEM_TITLE = 'SISTEMA DE GESTIÓN Y ALMACÉN CENTRAL';

// Helper for formatting dates in formal Spanish format (e.g. "14 de agosto de 2026")
export function getFormattedSpanishDate(dateInput?: Date | string) {
  let validDate = new Date();
  if (dateInput) {
    if (typeof dateInput === 'string') {
      // Handle dd/mm/yyyy or ISO
      if (dateInput.includes('/')) {
        const parts = dateInput.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          validDate = new Date(y, m, d);
        }
      } else {
        const parsed = new Date(dateInput);
        if (!isNaN(parsed.getTime())) validDate = parsed;
      }
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      validDate = dateInput;
    }
  }

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const dia = validDate.getDate();
  const mes = meses[validDate.getMonth()];
  const anio = validDate.getFullYear();

  return `${dia} de ${mes} de ${anio}`;
}

// Draw the exact official hospital timbrado header (Logo H, typography, subtle arc watermark, and date)
export function drawHospitalTimbradoHeader(doc: jsPDF, fechaTexto?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Subtle circular background arc on right side
  doc.setFillColor(243, 248, 252); // #F3F8FC
  doc.circle(pageWidth + 10, 110, 62, 'F');

  // 2. Vector Logo "H"
  // Left vertical pillar
  doc.setFillColor(107, 164, 184); // #6BA4B8
  doc.roundedRect(18, 14, 5.5, 18, 2.7, 2.7, 'F');

  // Right vertical pillar
  doc.setFillColor(142, 197, 222); // #8EC5DE
  doc.roundedRect(28.5, 14, 5.5, 18, 2.7, 2.7, 'F');

  // Wave connector between pillars
  doc.setFillColor(107, 164, 184);
  doc.roundedRect(21, 21.5, 10.5, 3.8, 1.5, 1.5, 'F');

  // Three small stacked dots above right pillar
  doc.setFillColor(142, 197, 222);
  doc.circle(36.5, 14.5, 0.85, 'F');
  doc.circle(36.5, 17.5, 0.85, 'F');
  doc.circle(36.5, 20.5, 0.85, 'F');

  // 3. Hospital Name Typography
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(112, 179, 214); // #70B3D6
  doc.text('Hospital Infantil', 40, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(75, 156, 213); // #4B9CD5
  doc.text('DR. JOSÉ MANUEL', 40, 23.5);
  doc.text('RODRÍGUEZ JIMÉNES', 40, 29);

  // 4. Date & Location at Top Right
  const fechaDisplay = fechaTexto || getFormattedSpanishDate();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Santo Domingo, R.D. | ${fechaDisplay}`, pageWidth - 18, 34, { align: 'right' });
}

// Draw the exact official hospital timbrado footer (Address, contact, RNC, web & SRS Metropolitano badge)
export function drawHospitalTimbradoFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Bottom right corner decorative curve shape
  doc.setFillColor(142, 156, 168); // #8E9CA8
  doc.circle(pageWidth, pageHeight, 26, 'F');

  // 2. Circular Seal "SRS METROPOLITANO"
  const badgeX = pageWidth - 18;
  const badgeY = pageHeight - 14;

  doc.setFillColor(255, 255, 255);
  doc.circle(badgeX, badgeY, 10, 'F');
  doc.setDrawColor(142, 156, 168);
  doc.setLineWidth(0.6);
  doc.circle(badgeX, badgeY, 9.5, 'S');

  // Inner icon / wave & text in badge
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(badgeX - 5, badgeY - 2, badgeX - 2, badgeY - 4.5);
  doc.line(badgeX - 2, badgeY - 4.5, badgeX + 2, badgeY - 1.5);
  doc.line(badgeX + 2, badgeY - 1.5, badgeX + 5, badgeY - 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.8);
  doc.setTextColor(100, 116, 139);
  doc.text('METROPOLITANO', badgeX, badgeY + 2.2, { align: 'center' });
  doc.setFontSize(5.5);
  doc.text('SRS', badgeX, badgeY + 5.2, { align: 'center' });

  // 3. Bottom Left Institutional Information
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(88, 160, 190); // #58A0BE

  doc.text('Calle 28 Esq. Calle 39,Ens. La Fe , Sto. Dgo. D.N. R.D.', 18, pageHeight - 22);

  doc.text('Telefono : ', 18, pageHeight - 18);
  doc.setFont('helvetica', 'bold');
  doc.text('809-566-3322', 30, pageHeight - 18);
  doc.setFont('helvetica', 'normal');
  doc.text(' | E-mail: direccion@hijmr.gob.do', 49, pageHeight - 18);

  doc.setFont('helvetica', 'bold');
  doc.text('RNC ', 18, pageHeight - 14);
  doc.text('430040495', 25, pageHeight - 14);

  // Small web globe / button
  doc.setFillColor(112, 179, 214);
  doc.circle(20.5, pageHeight - 8.5, 2.8, 'F');
  doc.setFontSize(3.2);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('www', 20.5, pageHeight - 7.5, { align: 'center' });

  // Web text
  doc.setFontSize(7.5);
  doc.setTextColor(88, 160, 190);
  doc.setFont('helvetica', 'normal');
  doc.text('www.hijmr.gob.do', 25.5, pageHeight - 8);
}

// Helper for formatting dates and times
function getFormattedNow() {
  const now = new Date();
  return {
    fecha: now.toLocaleDateString('es-ES'),
    hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  };
}

// ==========================================
// 1. DESPACHOS GLOBALES (HISTORIAL)
// ==========================================

// Individual Despacho PDF (Timbrado Oficial Tipo Carta)
export function generarPDFDespachoGlobal(despacho: DespachoGlobal, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fechaEspanol = getFormattedSpanishDate(despacho.fecha);

  // 1. Encabezado Timbrado Oficial
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  // 2. Destinatario y Asunto
  const receptorNombre = destData ? destData.nombre : despacho.paciente;
  const receptorCargo = destData ? destData.cargo : (destData?.dependencia || despacho.departamento || 'Departamento / Servicio Solicitante');
  const asuntoTexto = `Comprobante de Despacho de Medicamentos — No. ${despacho.numeroDespacho}`;

  let y = 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`A: ${receptorCargo}`, 18, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(receptorNombre, 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Asunto: ${asuntoTexto}`, 18, y + 12);

  // 3. Cuerpo de la Carta Formal
  y = 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const parrafoIntro = 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:';
  const lineasIntro = doc.splitTextToSize(parrafoIntro, pageWidth - 36);
  doc.text(lineasIntro, 18, y);
  y += (lineasIntro.length * 5) + 3;

  const parrafoDetalle = `Se hace constar formalmente el despacho e inmunización/entrega de los medicamentos e insumos hospitalarios detallados a continuación, asignados al paciente/servicio ${despacho.paciente} en el área de ${despacho.departamento}:`;
  const lineasDetalle = doc.splitTextToSize(parrafoDetalle, pageWidth - 36);
  doc.text(lineasDetalle, 18, y);
  y += (lineasDetalle.length * 5) + 4;

  const tableData = despacho.medicamentos.map((item, idx) => [
    (idx + 1).toString(),
    item.nombre,
    `${item.cantidad} ${item.unidad || 'u.'}`,
    item.precioUnitario ? `$${item.precioUnitario.toFixed(2)}` : 'N/A',
    item.precioUnitario ? `$${(item.cantidad * item.precioUnitario).toFixed(2)}` : 'N/A'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Medicamento / Ítem', 'Cantidad', 'Precio Unit.', 'Subtotal ($)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 18, right: 18 }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 30;
  let nextY = finalY + 5;

  // Cuadro de Total
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth - 75, nextY, 57, 10, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL: $${despacho.totales ? despacho.totales.toFixed(2) : '0.00'}`, pageWidth - 46.5, nextY + 6.5, { align: 'center' });

  if (despacho.observaciones) {
    nextY += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Observaciones:', 18, nextY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const obsLines = doc.splitTextToSize(despacho.observaciones, pageWidth - 36);
    doc.text(obsLines, 18, nextY + 4.5);
    nextY += (obsLines.length * 4.5) + 3;
  } else {
    nextY += 14;
  }

  // Párrafo de cierre
  const parrafoCierre = 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(parrafoCierre, 18, nextY);
  nextY += 6;

  doc.text('Atentamente,', 18, nextY);

  // 4. Firmas
  const sigY = Math.min(Math.max(nextY + 18, 195), pageHeight - 55);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(18, sigY, 78, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Recibido por', 18, sigY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(receptorNombre, 18, sigY + 9);

  // Firma Emisor
  const sigCenterX = pageWidth / 2 + 15;
  doc.line(sigCenterX - 38, sigY + 18, sigCenterX + 38, sigY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(despacho.responsable || 'José Miguel Mesa Romero', sigCenterX, sigY + 23, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Encargado de Almacén y Suministros', sigCenterX, sigY + 27.5, { align: 'center' });

  // 5. Pie de Página Timbrado Oficial
  drawHospitalTimbradoFooter(doc);

  doc.save(`Carta_Despacho_${despacho.numeroDespacho}.pdf`);
}

// Export FULL HISTORY of Despachos to PDF (Timbrado)
export function generarPDFHistorialDespachos(despachos: DespachoGlobal[], destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const fechaEspanol = getFormattedSpanishDate();

  // Header Timbrado
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('HISTORIAL COMPLETO DE DESPACHOS DE MEDICAMENTOS', 18, y);

  if (destData) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Destino: ${destData.nombre} (${destData.cargo})`, pageWidth - 18, y, { align: 'right' });
  }

  y += 5;

  const tableData = despachos.map((item, idx) => [
    (idx + 1).toString(),
    item.numeroDespacho,
    `${item.fecha} ${item.hora}`,
    item.paciente,
    item.departamento,
    item.medicamentos.map(m => `${m.nombre} (${m.cantidad} ${m.unidad || 'u.'})`).join(', '),
    item.estado,
    `$${item.totales ? item.totales.toFixed(2) : '0.00'}`,
    item.responsable
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'No. Despacho', 'Fecha/Hora', 'Paciente', 'Departamento', 'Medicamentos / Ítems', 'Estado', 'Total ($)', 'Responsable']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 35 },
      4: { cellWidth: 32 },
      5: { cellWidth: 70 },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 25 }
    },
    margin: { left: 18, right: 18 }
  });

  const totalSuma = despachos.reduce((acc, curr) => acc + (curr.totales || 0), 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL REGISTROS: ${despachos.length} | MONTO TOTAL DESPACHADO: $${totalSuma.toFixed(2)}`, 18, finalY + 8);

  // Footer Timbrado
  drawHospitalTimbradoFooter(doc);

  doc.save(`Historial_Despachos_${fechaEspanol.replace(/\s+/g, '_')}.pdf`);
}

// Individual Despacho DOCX (Timbrado Oficial Tipo Carta)
export async function generarDOCXDespachoGlobal(despacho: DespachoGlobal, destData?: ExportDestinoData) {
  const fechaEspanol = getFormattedSpanishDate(despacho.fecha);
  const receptorNombre = destData ? destData.nombre : despacho.paciente;
  const receptorCargo = destData ? destData.cargo : (destData?.dependencia || despacho.departamento || 'Departamento / Servicio Solicitante');

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true, size: 18 })] })], width: { size: 5, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Medicamento / Ítem', bold: true, size: 18 })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad', bold: true, size: 18 })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Precio Unit.', bold: true, size: 18 })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Subtotal', bold: true, size: 18 })] })], width: { size: 20, type: WidthType.PERCENTAGE } })
      ]
    }),
    ...despacho.medicamentos.map((item, idx) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph((idx + 1).toString())] }),
          new TableCell({ children: [new Paragraph(item.nombre)] }),
          new TableCell({ children: [new Paragraph(`${item.cantidad} ${item.unidad || 'u.'}`)] }),
          new TableCell({ children: [new Paragraph(item.precioUnitario ? `$${item.precioUnitario.toFixed(2)}` : 'N/A')] }),
          new TableCell({ children: [new Paragraph(item.precioUnitario ? `$${(item.cantidad * item.precioUnitario).toFixed(2)}` : 'N/A')] })
        ]
      })
    )
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          // Header Timbrado
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES', bold: true, size: 26, color: '4B9CD5' })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })
            ],
            alignment: AlignmentType.RIGHT
          }),
          new Paragraph({ text: '' }),

          // Encabezado destinatario
          new Paragraph({ children: [new TextRun({ text: `A: ${receptorCargo}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: receptorNombre, bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Asunto: Comprobante de Despacho de Medicamentos — No. ${despacho.numeroDespacho}`, bold: true, size: 20 })] }),
          new Paragraph({ text: '' }),

          // Cuerpo formal
          new Paragraph({
            children: [
              new TextRun({
                text: 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Se hace constar formalmente el despacho y entrega de los medicamentos e insumos hospitalarios detallados a continuación, asignados al paciente/servicio ${despacho.paciente} en el área de ${despacho.departamento}:`,
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),

          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [new TextRun({ text: `TOTAL GENERAL: $${despacho.totales ? despacho.totales.toFixed(2) : '0.00'}`, bold: true, size: 22 })]
          }),
          new Paragraph({ text: '' }),

          ...(despacho.observaciones ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Observaciones: ', bold: true, size: 18 }),
                new TextRun({ text: despacho.observaciones, size: 18, italics: true })
              ]
            }),
            new Paragraph({ text: '' })
          ] : []),

          new Paragraph({
            children: [
              new TextRun({
                text: 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: 'Atentamente,', size: 20 })] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Firmas
          new Paragraph({
            children: [new TextRun({ text: '_____________________________________', bold: true })],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Recibido por', bold: true, size: 20 })],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [new TextRun({ text: receptorNombre, size: 18, color: '64748B' })],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: '________________________________________________', bold: true })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: despacho.responsable || 'José Miguel Mesa Romero', bold: true, size: 20 })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Encargado de Almacén y Suministros', size: 18, color: '64748B' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D.\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'Telefono : 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 15, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Carta_Despacho_${despacho.numeroDespacho}.docx`);
}

// Full History Despachos DOCX (Timbrado)
export async function generarDOCXHistorialDespachos(despachos: DespachoGlobal[], destData?: ExportDestinoData) {
  const fechaEspanol = getFormattedSpanishDate();

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No. Despacho', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fecha/Hora', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Paciente', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Departamento', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Medicamentos', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Estado', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total ($)', bold: true })] })] })
      ]
    }),
    ...despachos.map((item) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(item.numeroDespacho)] }),
          new TableCell({ children: [new Paragraph(`${item.fecha} ${item.hora}`)] }),
          new TableCell({ children: [new Paragraph(item.paciente)] }),
          new TableCell({ children: [new Paragraph(item.departamento)] }),
          new TableCell({ children: [new Paragraph(item.medicamentos.map(m => `${m.nombre} (${m.cantidad})`).join(', '))] }),
          new TableCell({ children: [new Paragraph(item.estado)] }),
          new TableCell({ children: [new Paragraph(`$${item.totales ? item.totales.toFixed(2) : '0.00'}`)] })
        ]
      })
    )
  ];

  const totalSuma = despachos.reduce((acc, curr) => acc + (curr.totales || 0), 0);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES\n', bold: true, size: 26, color: '4B9CD5' }),
              new TextRun({ text: `${SYSTEM_TITLE} — HISTORIAL COMPLETO DE DESPACHOS`, bold: true, size: 20, color: '0F172A' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })],
            alignment: AlignmentType.RIGHT
          }),
          ...(destData ? [new Paragraph({ text: `Dirigido a: ${destData.nombre} (${destData.cargo})`, alignment: AlignmentType.RIGHT })] : []),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL REGISTROS: ${despachos.length} | MONTO ACUMULADO: $${totalSuma.toFixed(2)}`, bold: true })] }),
          new Paragraph({ text: '' }),
          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D. | Telefono: 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 14, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 14, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Historial_Despachos_${fechaEspanol.replace(/\s+/g, '_')}.docx`);
}

// ==========================================
// 2. SALIDAS DE ALMACÉN (TIMBRADO OFICIAL TIPO CARTA)
// ==========================================

export function generarPDFSalidaAlmacen(salida: SalidaAlmacen, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fechaEspanol = getFormattedSpanishDate(salida.fecha);

  // 1. Dibujar Encabezado Timbrado Oficial
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  // 2. Encabezado del Destinatario y Asunto
  const cargoDestino = destData?.cargo || destData?.dependencia || salida.departamentoSolicitante || 'Departamento Solicitante';
  const nombreDestino = destData?.nombre || salida.personaRecibe || 'Encargado(a) Solicitante';

  let y = 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`A: ${cargoDestino}`, 18, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(nombreDestino, 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Asunto: Salida de Bienes e Insumos — Modalidad: ${salida.tipoSalida}`, 18, y + 12);

  // 3. Cuerpo de la Carta Formal
  y = 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const parrafoIntro = 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:';
  const lineasIntro = doc.splitTextToSize(parrafoIntro, pageWidth - 36);
  doc.text(lineasIntro, 18, y);
  y += (lineasIntro.length * 5) + 3;

  const parrafoDetalle = `Se hace constar formalmente la entrega y salida física de almacén de los bienes e insumos correspondientes a la categoría de ${salida.categoriaBien}, solicitados para el área o departamento de ${salida.departamentoSolicitante}, procesados bajo la modalidad de ${salida.tipoSalida}, según el siguiente desglose técnico:`;
  const lineasDetalle = doc.splitTextToSize(parrafoDetalle, pageWidth - 36);
  doc.text(lineasDetalle, 18, y);
  y += (lineasDetalle.length * 5) + 4;

  // 4. Tabla de Ítems Despachados
  const tableData = (salida.itemsList && salida.itemsList.length > 0)
    ? salida.itemsList.map((item, idx) => [
        (idx + 1).toString(),
        item.items,
        item.descripcion || 'Sin especificaciones adicionales',
        `${item.cantidad} ${item.unidad || 'u.'}`,
        item.categoriaBien || salida.categoriaBien
      ])
    : [[ '1', salida.items, salida.descripcion || 'Sin especificaciones adicionales', `${salida.cantidad} ${salida.unidad}`, salida.categoriaBien ]];

  autoTable(doc, {
    startY: y,
    head: [['#', 'Ítem / Bien Despachado', 'Descripción / Marca / Lote', 'Cantidad', 'Categoría']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 55 },
      3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 31 }
    },
    margin: { left: 18, right: 18 }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 30;
  let nextY = finalY + 6;

  if (salida.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Observaciones:', 18, nextY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const obsLines = doc.splitTextToSize(salida.observaciones, pageWidth - 36);
    doc.text(obsLines, 18, nextY + 4.5);
    nextY += (obsLines.length * 4.5) + 3;
  }

  // Párrafo de cierre
  const parrafoCierre = 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(parrafoCierre, 18, nextY);
  nextY += 6;

  doc.text('Atentamente,', 18, nextY);

  // 5. Firmas
  const sigY = Math.min(Math.max(nextY + 18, 195), pageHeight - 55);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(18, sigY, 78, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Recibido por', 18, sigY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(nombreDestino, 18, sigY + 9);

  // Firma Emisor
  const sigCenterX = pageWidth / 2 + 15;
  doc.line(sigCenterX - 38, sigY + 18, sigCenterX + 38, sigY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(salida.personaEntrega || 'José Miguel Mesa Romero', sigCenterX, sigY + 23, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Encargado de Almacén y Suministros', sigCenterX, sigY + 27.5, { align: 'center' });

  // 6. Pie de Página Timbrado Oficial
  drawHospitalTimbradoFooter(doc);

  const cleanItem = (salida.items || 'Insumos').substring(0, 15).replace(/\s+/g, '_');
  doc.save(`Carta_Salida_Almacen_${cleanItem}_${salida.fecha.replace(/\//g, '-')}.pdf`);
}

export async function generarDOCXSalidaAlmacen(salida: SalidaAlmacen, destData?: ExportDestinoData) {
  const fechaEspanol = getFormattedSpanishDate(salida.fecha);
  const cargoDestino = destData?.cargo || destData?.dependencia || salida.departamentoSolicitante || 'Departamento Solicitante';
  const nombreDestino = destData?.nombre || salida.personaRecibe || 'Encargado(a) Solicitante';

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Ítem / Bien Despachado', bold: true, size: 18 })] })],
          width: { size: 35, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Descripción / Marca / Lote', bold: true, size: 18 })] })],
          width: { size: 35, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad', bold: true, size: 18 })] })],
          width: { size: 15, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Categoría', bold: true, size: 18 })] })],
          width: { size: 15, type: WidthType.PERCENTAGE }
        })
      ]
    }),
    ...((salida.itemsList && salida.itemsList.length > 0)
      ? salida.itemsList.map(item => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.items, bold: true, size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.descripcion || 'Sin descripción', size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${item.cantidad} ${item.unidad || 'u.'}`, bold: true, size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.categoriaBien || salida.categoriaBien, size: 18 })] })] })
          ]
        }))
      : [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: salida.items, bold: true, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: salida.descripcion, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${salida.cantidad} ${salida.unidad}`, bold: true, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: salida.categoriaBien, size: 18 })] })] })
            ]
          })
        ]
    )
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header Timbrado
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES', bold: true, size: 26, color: '4B9CD5' })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })
            ],
            alignment: AlignmentType.RIGHT
          }),
          new Paragraph({ text: '' }),

          // Encabezado destinatario
          new Paragraph({ children: [new TextRun({ text: `A: ${cargoDestino}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: nombreDestino, bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Asunto: Salida de Bienes e Insumos — Modalidad: ${salida.tipoSalida}`, bold: true, size: 20 })] }),
          new Paragraph({ text: '' }),

          // Cuerpo formal
          new Paragraph({
            children: [
              new TextRun({
                text: 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Se hace constar formalmente la entrega y salida física de almacén de los bienes e insumos correspondientes a la categoría de ${salida.categoriaBien}, solicitados para el área o departamento de ${salida.departamentoSolicitante}, procesados bajo la modalidad de ${salida.tipoSalida}, según el siguiente desglose técnico:`,
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),

          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),
          new Paragraph({ text: '' }),

          ...(salida.observaciones ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Observaciones: ', bold: true, size: 18 }),
                new TextRun({ text: salida.observaciones, size: 18, italics: true })
              ]
            }),
            new Paragraph({ text: '' })
          ] : []),

          new Paragraph({
            children: [
              new TextRun({
                text: 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: 'Atentamente,', size: 20 })] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Firmas
          new Paragraph({
            children: [new TextRun({ text: '_____________________________________', bold: true })],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Recibido por', bold: true, size: 20 })],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [new TextRun({ text: nombreDestino, size: 18, color: '64748B' })],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: '________________________________________________', bold: true })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: salida.personaEntrega || 'José Miguel Mesa Romero', bold: true, size: 20 })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Encargado de Almacén y Suministros', size: 18, color: '64748B' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D.\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'Telefono : 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 15, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanItem = (salida.items || 'Insumos').substring(0, 15).replace(/\s+/g, '_');
  saveAs(blob, `Carta_Salida_Almacen_${cleanItem}_${salida.fecha.replace(/\//g, '-')}.docx`);
}

export function generarPDFListadoSalidas(salidas: SalidaAlmacen[], destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const fechaEspanol = getFormattedSpanishDate();

  // Header Timbrado
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('LISTADO GENERAL DE SALIDAS DE ALMACÉN', 18, y);

  if (destData) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Destino: ${destData.nombre} (${destData.cargo})`, pageWidth - 18, y, { align: 'right' });
  }

  y += 5;

  const tableData = salidas.map((item, idx) => [
    (idx + 1).toString(),
    `${item.fecha} ${item.hora}`,
    item.tipoSalida,
    item.categoriaBien,
    item.items,
    `${item.cantidad} ${item.unidad}`,
    item.departamentoSolicitante,
    item.personaEntrega,
    item.personaRecibe
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Fecha/Hora', 'Tipo Salida', 'Categoría', 'Ítem / Bien', 'Cantidad', 'Depto Solicitante', 'Entrega', 'Recibe']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    margin: { left: 18, right: 18 }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL SALIDAS REGISTRADAS: ${salidas.length}`, 18, finalY + 8);

  // Footer Timbrado
  drawHospitalTimbradoFooter(doc);

  doc.save(`Listado_Salidas_${fechaEspanol.replace(/\s+/g, '_')}.pdf`);
}

export async function generarDOCXListadoSalidas(salidas: SalidaAlmacen[], destData?: ExportDestinoData) {
  const fechaEspanol = getFormattedSpanishDate();

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fecha/Hora', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tipo', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Categoría', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ítem', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Departamento', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Recibe', bold: true })] })] })
      ]
    }),
    ...salidas.map((item) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(`${item.fecha} ${item.hora}`)] }),
          new TableCell({ children: [new Paragraph(item.tipoSalida)] }),
          new TableCell({ children: [new Paragraph(item.categoriaBien)] }),
          new TableCell({ children: [new Paragraph(item.items)] }),
          new TableCell({ children: [new Paragraph(`${item.cantidad} ${item.unidad}`)] }),
          new TableCell({ children: [new Paragraph(item.departamentoSolicitante)] }),
          new TableCell({ children: [new Paragraph(item.personaRecibe)] })
        ]
      })
    )
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES\n', bold: true, size: 26, color: '4B9CD5' }),
              new TextRun({ text: `${SYSTEM_TITLE} — LISTADO COMPLETO DE SALIDAS`, bold: true, size: 20, color: '0F172A' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })],
            alignment: AlignmentType.RIGHT
          }),
          ...(destData ? [new Paragraph({ text: `Destino: ${destData.nombre} (${destData.cargo})`, alignment: AlignmentType.RIGHT })] : []),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL REGISTROS: ${salidas.length}`, bold: true })] }),
          new Paragraph({ text: '' }),
          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D. | Telefono: 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 14, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 14, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Listado_Salidas_${fechaEspanol.replace(/\s+/g, '_')}.docx`);
}

// ==========================================
// 3. CONTROL DE AGUA PURIFICADA (TIMBRADO OFICIAL)
// ==========================================

export function generarPDFRegistroAgua(itemAgua: HistorialAgua, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fechaEspanol = getFormattedSpanishDate(itemAgua.fecha);

  // 1. Dibujar Encabezado Timbrado Oficial
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  // 2. Encabezado del Destinatario y Asunto
  const cargoDestino = destData?.cargo || destData?.dependencia || itemAgua.departamento || 'Departamento / Servicio';
  const nombreDestino = destData?.nombre || itemAgua.receptor || 'Encargado(a) Receptor';

  let y = 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`A: ${cargoDestino}`, 18, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(nombreDestino, 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Asunto: Control de Despacho de Agua Purificada — Registro No. #${itemAgua.idConsecutivo}`, 18, y + 12);

  // 3. Cuerpo de la Carta Formal
  y = 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const parrafoIntro = 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:';
  const lineasIntro = doc.splitTextToSize(parrafoIntro, pageWidth - 36);
  doc.text(lineasIntro, 18, y);
  y += (lineasIntro.length * 5) + 3;

  const parrafoDetalle = `Se hace constar formalmente la entrega y suministro de agua purificada al departamento ${itemAgua.departamento} bajo la frecuencia programada ${itemAgua.frecuencia}, según el siguiente desglose:`;
  const lineasDetalle = doc.splitTextToSize(parrafoDetalle, pageWidth - 36);
  doc.text(lineasDetalle, 18, y);
  y += (lineasDetalle.length * 5) + 4;

  autoTable(doc, {
    startY: y,
    head: [['Departamento / Servicio', 'Producto Suministrado', 'Cantidad Entregada', 'Stock Habilitado', 'Pendiente en Cuota']],
    body: [
      [
        itemAgua.departamento,
        itemAgua.producto,
        `${itemAgua.cantidad} unidades`,
        `${itemAgua.habilitado} u.`,
        `${itemAgua.pendiente} u.`
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    margin: { left: 18, right: 18 }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 25;
  let nextY = finalY + 8;

  // Párrafo de cierre
  const parrafoCierre = 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(parrafoCierre, 18, nextY);
  nextY += 6;

  doc.text('Atentamente,', 18, nextY);

  // 4. Firmas
  const sigY = Math.min(Math.max(nextY + 18, 195), pageHeight - 55);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(18, sigY, 78, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Recibido por', 18, sigY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(nombreDestino, 18, sigY + 9);

  // Firma Emisor
  const sigCenterX = pageWidth / 2 + 15;
  doc.line(sigCenterX - 38, sigY + 18, sigCenterX + 38, sigY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(itemAgua.responsable || 'José Miguel Mesa Romero', sigCenterX, sigY + 23, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Encargado de Almacén y Suministros', sigCenterX, sigY + 27.5, { align: 'center' });

  // 5. Pie de Página Timbrado Oficial
  drawHospitalTimbradoFooter(doc);

  doc.save(`Carta_Control_Agua_${itemAgua.idConsecutivo}.pdf`);
}

export async function generarDOCXRegistroAgua(itemAgua: HistorialAgua, destData?: ExportDestinoData) {
  const fechaEspanol = getFormattedSpanishDate(itemAgua.fecha);
  const cargoDestino = destData?.cargo || destData?.dependencia || itemAgua.departamento || 'Departamento / Servicio';
  const nombreDestino = destData?.nombre || itemAgua.receptor || 'Encargado(a) Receptor';

  const doc = new Document({
    sections: [
      {
        children: [
          // Header Timbrado
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES', bold: true, size: 26, color: '4B9CD5' })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })
            ],
            alignment: AlignmentType.RIGHT
          }),
          new Paragraph({ text: '' }),

          // Encabezado destinatario
          new Paragraph({ children: [new TextRun({ text: `A: ${cargoDestino}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: nombreDestino, bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Asunto: Control de Despacho de Agua Purificada — Registro No. #${itemAgua.idConsecutivo}`, bold: true, size: 20 })] }),
          new Paragraph({ text: '' }),

          // Cuerpo formal
          new Paragraph({
            children: [
              new TextRun({
                text: 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Se hace constar formalmente la entrega y suministro de agua purificada al departamento ${itemAgua.departamento} bajo la frecuencia programada ${itemAgua.frecuencia}, producto: ${itemAgua.producto}, cantidad: ${itemAgua.cantidad} unidades, stock habilitado: ${itemAgua.habilitado} u., pendiente: ${itemAgua.pendiente} u.`,
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({
                text: 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: 'Atentamente,', size: 20 })] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Firmas
          new Paragraph({
            children: [new TextRun({ text: '_____________________________________', bold: true })],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Recibido por', bold: true, size: 20 })],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [new TextRun({ text: nombreDestino, size: 18, color: '64748B' })],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: '________________________________________________', bold: true })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: itemAgua.responsable || 'José Miguel Mesa Romero', bold: true, size: 20 })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Encargado de Almacén y Suministros', size: 18, color: '64748B' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D.\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'Telefono : 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 15, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Carta_Control_Agua_${itemAgua.idConsecutivo}.docx`);
}

export function generarPDFHistorialAgua(historial: HistorialAgua[], destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const fechaEspanol = getFormattedSpanishDate();

  // Header Timbrado
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('HISTORIAL DE ENTREGAS DE AGUA PURIFICADA', 18, y);

  if (destData) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Destino: ${destData.nombre} (${destData.cargo})`, pageWidth - 18, y, { align: 'right' });
  }

  y += 5;

  const tableData = historial.map((item) => [
    `#${item.idConsecutivo}`,
    `${item.fecha} ${item.hora}`,
    item.departamento,
    item.producto,
    item.cantidad.toString(),
    item.frecuencia,
    item.responsable,
    item.receptor
  ]);

  autoTable(doc, {
    startY: y,
    head: [['No. Consecutivo', 'Fecha/Hora', 'Departamento', 'Producto', 'Cantidad', 'Frecuencia', 'Entregó', 'Recibió']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    margin: { left: 18, right: 18 }
  });

  const totalCantidad = historial.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL REGISTROS: ${historial.length} | TOTAL UNIDADES DESPACHADAS: ${totalCantidad}`, 18, finalY + 8);

  // Footer Timbrado
  drawHospitalTimbradoFooter(doc);

  doc.save(`Historial_Agua_${fechaEspanol.replace(/\s+/g, '_')}.pdf`);
}

export async function generarDOCXHistorialAgua(historial: HistorialAgua[], destData?: ExportDestinoData) {
  const fechaEspanol = getFormattedSpanishDate();

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Consecutivo', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fecha/Hora', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Departamento', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Producto', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Entregó', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Recibió', bold: true })] })] })
      ]
    }),
    ...historial.map((item) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(`#${item.idConsecutivo}`)] }),
          new TableCell({ children: [new Paragraph(`${item.fecha} ${item.hora}`)] }),
          new TableCell({ children: [new Paragraph(item.departamento)] }),
          new TableCell({ children: [new Paragraph(item.producto)] }),
          new TableCell({ children: [new Paragraph(item.cantidad.toString())] }),
          new TableCell({ children: [new Paragraph(item.responsable)] }),
          new TableCell({ children: [new Paragraph(item.receptor)] })
        ]
      })
    )
  ];

  const totalCantidad = historial.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES\n', bold: true, size: 26, color: '4B9CD5' }),
              new TextRun({ text: `${SYSTEM_TITLE} — HISTORIAL DE AGUA PURIFICADA`, bold: true, size: 20, color: '0F172A' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })],
            alignment: AlignmentType.RIGHT
          }),
          ...(destData ? [new Paragraph({ text: `Destino: ${destData.nombre} (${destData.cargo})`, alignment: AlignmentType.RIGHT })] : []),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL REGISTROS: ${historial.length} | TOTAL UNIDADES: ${totalCantidad}`, bold: true })] }),
          new Paragraph({ text: '' }),
          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D. | Telefono: 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 14, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 14, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Historial_Agua_${fechaEspanol.replace(/\s+/g, '_')}.docx`);
}

// ==========================================
// 4. ENTRADAS DE MERCANCÍA (DOCUMENTO TIPO CARTA TIMBRADA OFICIAL)
// ==========================================

export function generarPDFEntradaMercancia(entrada: EntradaMercancia, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fechaEspanol = getFormattedSpanishDate(entrada.fecha);

  // 1. Dibujar Encabezado Timbrado Oficial (Logo H, Texto Hospital y Fecha)
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  // 2. Encabezado del Destinatario y Asunto
  let y = 48;
  const cargoDestino = destData?.cargo || destData?.dependencia || 'Dirección General';
  const nombreDestino = destData?.nombre || 'Dra. Indhira García moreno';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`A: ${cargoDestino}`, 18, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(nombreDestino, 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Asunto: Entrada de Mercancía — Conduce No. ${entrada.documento}`, 18, y + 12);

  // 3. Cuerpo de la Carta Formal
  y = 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const parrafoIntro = 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:';
  const lineasIntro = doc.splitTextToSize(parrafoIntro, pageWidth - 36);
  doc.text(lineasIntro, 18, y);
  y += (lineasIntro.length * 5) + 3;

  const parrafoDetalle = `Se hace constar formalmente la recepción e ingreso en Almacén y Suministros de los insumos y bienes provistos por el proveedor ${entrada.proveedor}, amparados bajo el Conduce / Factura No. ${entrada.documento}, destinados al área de ${entrada.destino}, según el siguiente desglose técnico:`;
  const lineasDetalle = doc.splitTextToSize(parrafoDetalle, pageWidth - 36);
  doc.text(lineasDetalle, 18, y);
  y += (lineasDetalle.length * 5) + 4;

  // 4. Tabla Formal de Productos / Insumos
  const tableData = entrada.items.map((item, idx) => [
    (idx + 1).toString(),
    item.producto,
    item.descripcion || 'Sin descripción adicional',
    `${item.cantidad} u.`
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Producto / Insumo', 'Descripción / Lote', 'Cantidad Recibida']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 72 },
      2: { cellWidth: 64 },
      3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
    },
    margin: { left: 18, right: 18 }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 30;
  let nextY = finalY + 6;

  // Observaciones si existen
  if (entrada.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Observaciones de la Recepción:', 18, nextY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const obsLines = doc.splitTextToSize(entrada.observaciones, pageWidth - 36);
    doc.text(obsLines, 18, nextY + 4.5);
    nextY += (obsLines.length * 4.5) + 6;
  }

  // Párrafo de Cierre y Despedida
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const parrafoCierre = 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.';
  doc.text(parrafoCierre, 18, nextY);
  nextY += 7;

  doc.text('Atentamente,', 18, nextY);

  // 5. Bloque de Firmas
  const sigY = Math.min(Math.max(nextY + 20, 195), pageHeight - 55);

  // Firma izquierda: Recibido por
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(18, sigY, 78, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Recibido por', 18, sigY + 5);

  if (destData?.nombre) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(destData.nombre, 18, sigY + 9);
  }

  // Firma centro / derecha: José Miguel Mesa Romero - Encargado de Almacén y Suministros
  const sigCenterX = pageWidth / 2 + 15;
  doc.line(sigCenterX - 38, sigY + 18, sigCenterX + 38, sigY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('José Miguel Mesa Romero', sigCenterX, sigY + 23, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Encargado de Almacén y Suministros', sigCenterX, sigY + 27.5, { align: 'center' });

  // 6. Pie de Página Timbrado Oficial
  drawHospitalTimbradoFooter(doc);

  doc.save(`Carta_Entrada_Mercancia_${entrada.documento.replace(/\s+/g, '_')}.pdf`);
}

export async function generarDOCXEntradaMercancia(entrada: EntradaMercancia, destData?: ExportDestinoData) {
  const fechaEspanol = getFormattedSpanishDate(entrada.fecha);
  const cargoDestino = destData?.cargo || destData?.dependencia || 'Dirección General';
  const nombreDestino = destData?.nombre || 'Dra. Indhira García moreno';

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true, size: 18 })] })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Producto / Insumo', bold: true, size: 18 })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Descripción / Lote', bold: true, size: 18 })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad Recibida', bold: true, size: 18 })] })], width: { size: 15, type: WidthType.PERCENTAGE } })
      ]
    }),
    ...entrada.items.map((item, idx) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: (idx + 1).toString(), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.producto, bold: true, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph(item.descripcion || 'Sin descripción')] }),
          new TableCell({ children: [new Paragraph({ text: `${item.cantidad} u.`, alignment: AlignmentType.CENTER })] })
        ]
      })
    )
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header Timbrado
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES', bold: true, size: 26, color: '4B9CD5' })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })
            ],
            alignment: AlignmentType.RIGHT
          }),
          new Paragraph({ text: '' }),

          // Encabezado destinatario
          new Paragraph({
            children: [
              new TextRun({ text: `A: ${cargoDestino}`, size: 20 })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: nombreDestino, bold: true, size: 22 })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Asunto: Entrada de Mercancía — Conduce No. ${entrada.documento}`, bold: true, size: 20 })
            ]
          }),
          new Paragraph({ text: '' }),

          // Cuerpo formal
          new Paragraph({
            children: [
              new TextRun({
                text: 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Se hace constar formalmente la recepción e ingreso en Almacén y Suministros de los insumos y bienes provistos por el proveedor ${entrada.proveedor}, amparados bajo el Conduce / Factura No. ${entrada.documento}, con destino al área de ${entrada.destino}, según el siguiente desglose técnico:`,
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),

          // Tabla de Insumos
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),
          new Paragraph({ text: '' }),

          ...(entrada.observaciones ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Observaciones de la Recepción: ', bold: true, size: 18 }),
                new TextRun({ text: entrada.observaciones, size: 18, italics: true })
              ]
            }),
            new Paragraph({ text: '' })
          ] : []),

          new Paragraph({
            children: [
              new TextRun({
                text: 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Atentamente,', size: 20 })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Firmas
          new Paragraph({
            children: [
              new TextRun({ text: '_____________________________________', bold: true })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Recibido por', bold: true, size: 20 })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: '________________________________________________', bold: true })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'José Miguel Mesa Romero', bold: true, size: 20 })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Encargado de Almacén y Suministros', size: 18, color: '64748B' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D.\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'Telefono : 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 15, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Carta_Entrada_Mercancia_${entrada.documento.replace(/\s+/g, '_')}.docx`);
}

export function generarPDFListadoEntradas(entradas: EntradaMercancia[], destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const fechaEspanol = getFormattedSpanishDate();

  // Header Timbrado
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  let y = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Historial Oficial de Entradas de Mercancía', 18, y);

  if (destData) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Destino / Área: ${destData.nombre} (${destData.cargo})`, 18, y + 5);
    y += 10;
  } else {
    y += 6;
  }

  const tableData = entradas.map((item, idx) => [
    (idx + 1).toString(),
    item.documento,
    `${item.fecha} ${item.hora}`,
    item.proveedor,
    item.destino,
    item.items.map(i => `${i.producto} (${i.cantidad})`).join(', ')
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'No. Documento', 'Fecha/Hora', 'Proveedor', 'Destino', 'Productos / Insumos']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    margin: { left: 18, right: 18 }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL ENTRADAS REGISTRADAS: ${entradas.length}`, 18, finalY + 8);

  // Footer Timbrado
  drawHospitalTimbradoFooter(doc);

  doc.save(`Listado_Entradas_${fechaEspanol.replace(/\s+/g, '_')}.pdf`);
}

export async function generarDOCXListadoEntradas(entradas: EntradaMercancia[], destData?: ExportDestinoData) {
  const fechaEspanol = getFormattedSpanishDate();

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No. Documento', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fecha/Hora', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Proveedor', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Destino', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Productos', bold: true })] })] })
      ]
    }),
    ...entradas.map((item) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(item.documento)] }),
          new TableCell({ children: [new Paragraph(`${item.fecha} ${item.hora}`)] }),
          new TableCell({ children: [new Paragraph(item.proveedor)] }),
          new TableCell({ children: [new Paragraph(item.destino)] }),
          new TableCell({ children: [new Paragraph(item.items.map(i => `${i.producto} (${i.cantidad})`).join(', '))] })
        ]
      })
    )
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES\n', bold: true, size: 26, color: '4B9CD5' }),
              new TextRun({ text: `${SYSTEM_TITLE} — HISTORIAL DE ENTRADAS DE MERCANCÍA`, bold: true, size: 20, color: '0F172A' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })],
            alignment: AlignmentType.RIGHT
          }),
          ...(destData ? [new Paragraph({ text: `Destino: ${destData.nombre} (${destData.cargo})`, alignment: AlignmentType.RIGHT })] : []),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL REGISTROS: ${entradas.length}`, bold: true })] }),
          new Paragraph({ text: '' }),
          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D. | Telefono: 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 14, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 14, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Listado_Entradas_${fechaEspanol.replace(/\s+/g, '_')}.docx`);
}

// ==========================================
// 5. DESTINATARIOS
// ==========================================

export function generarPDFListadoDestinatarios(destinatarios: Destinatario[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const fechaEspanol = getFormattedSpanishDate();

  // Header Timbrado
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  let y = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Directorio Oficial de Destinatarios y Dependencias', 18, y);

  const tableData = destinatarios.map((item, idx) => [
    (idx + 1).toString(),
    item.nombre,
    item.cargo,
    item.dependencia || 'N/A',
    item.activo ? 'ACTIVO' : 'INACTIVO'
  ]);

  autoTable(doc, {
    startY: y + 6,
    head: [['#', 'Nombre Completo', 'Cargo / Puesto', 'Dependencia / Depto', 'Estado']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    margin: { left: 18, right: 18 }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL DESTINATARIOS REGISTRADOS: ${destinatarios.length}`, 18, finalY + 8);

  // Footer Timbrado
  drawHospitalTimbradoFooter(doc);

  doc.save(`Directorio_Destinatarios_${fechaEspanol.replace(/\s+/g, '_')}.pdf`);
}

export async function generarDOCXListadoDestinatarios(destinatarios: Destinatario[]) {
  const fechaEspanol = getFormattedSpanishDate();

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nombre Completo', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cargo', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Dependencia', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Estado', bold: true })] })] })
      ]
    }),
    ...destinatarios.map((item) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(item.nombre)] }),
          new TableCell({ children: [new Paragraph(item.cargo)] }),
          new TableCell({ children: [new Paragraph(item.dependencia || 'N/A')] }),
          new TableCell({ children: [new Paragraph(item.activo ? 'ACTIVO' : 'INACTIVO')] })
        ]
      })
    )
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES\n', bold: true, size: 26, color: '4B9CD5' }),
              new TextRun({ text: `${SYSTEM_TITLE} — DIRECTORIO DE DESTINATARIOS`, bold: true, size: 20, color: '0F172A' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })],
            alignment: AlignmentType.RIGHT
          }),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL DESTINATARIOS: ${destinatarios.length}`, bold: true })] }),
          new Paragraph({ text: '' }),
          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D. | Telefono: 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 14, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 14, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Directorio_Destinatarios_${fechaEspanol.replace(/\s+/g, '_')}.docx`);
}

export const generarPDFDirectorioDestinatarios = generarPDFListadoDestinatarios;
export const generarDOCXDirectorioDestinatarios = generarDOCXListadoDestinatarios;

// ==========================================
// 6. CORRESPONDENCIA Y OFICIOS (INFORMES, SOLICITUDES, CERTIFICACIONES)
// ==========================================

export function generarPDFOficioCorrespondencia(data: OficioCorrespondenciaData, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fechaEspanol = getFormattedSpanishDate();

  // 1. Encabezado Timbrado Oficial
  drawHospitalTimbradoHeader(doc, fechaEspanol);

  // 2. Destinatario y Asunto
  const receptorNombre = destData ? destData.nombre : 'Dra. Indhira García moreno';
  const receptorCargo = destData ? destData.cargo : (destData?.dependencia || 'Dirección General');
  const asuntoTexto = data.asunto || (data.tipo === 'Solicitud' ? `Solicitud de Insumo: ${data.solicitudArticulo}` : `Oficio Oficial de ${data.tipo}`);

  let y = 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`A: ${receptorCargo}`, 18, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(receptorNombre, 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Asunto: ${asuntoTexto}`, 18, y + 12);

  // 3. Cuerpo de la Carta
  y = 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const introText = 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:';
  const introLines = doc.splitTextToSize(introText, pageWidth - 36);
  doc.text(introLines, 18, y);
  y += (introLines.length * 5) + 4;

  if (data.tipo === 'Solicitud') {
    const solicitudText = `Se remite la solicitud institucional formal del siguiente insumo o artículo para las operaciones del hospital y sub-almacenes:`;
    const solLines = doc.splitTextToSize(solicitudText, pageWidth - 36);
    doc.text(solLines, 18, y);
    y += (solLines.length * 5) + 3;

    autoTable(doc, {
      startY: y,
      head: [['Insumo / Artículo Solicitado', 'Cantidad Requerida', 'Departamento Solicitante']],
      body: [
        [data.solicitudArticulo || 'No especificado', `${data.solicitudCantidad || 1} unidades`, 'Almacén y Suministros']
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8.5,
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      margin: { left: 18, right: 18 }
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 25;
    y = finalY + 6;
  } else {
    const textoCuerpo = data.cuerpo || data.asunto || 'Se emite constancia y certificación técnica para los fines institucionales correspondientes.';
    const lines = doc.splitTextToSize(textoCuerpo, pageWidth - 36);
    doc.text(lines, 18, y);
    y += (lines.length * 5) + 6;
  }

  // Párrafo de cierre
  const parrafoCierre = 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(parrafoCierre, 18, y);
  y += 7;

  doc.text('Atentamente,', 18, y);

  // 4. Firmas
  const sigY = Math.min(Math.max(y + 20, 195), pageHeight - 55);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(18, sigY, 78, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Recibido por', 18, sigY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(receptorNombre, 18, sigY + 9);

  // Firma Emisor Almacén
  const sigCenterX = pageWidth / 2 + 15;
  doc.line(sigCenterX - 38, sigY + 18, sigCenterX + 38, sigY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.usuarioNombre || 'José Miguel Mesa Romero', sigCenterX, sigY + 23, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Encargado de Almacén y Suministros', sigCenterX, sigY + 27.5, { align: 'center' });

  // 5. Pie de Página Timbrado Oficial
  drawHospitalTimbradoFooter(doc);

  const fileName = `Carta_Oficio_${data.tipo}_${receptorNombre.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

export async function generarDOCXOficioCorrespondencia(data: OficioCorrespondenciaData, destData?: ExportDestinoData) {
  const fechaEspanol = getFormattedSpanishDate();
  const receptorNombre = destData ? destData.nombre : 'Dra. Indhira García moreno';
  const receptorCargo = destData ? destData.cargo : (destData?.dependencia || 'Dirección General');
  const asuntoTexto = data.asunto || (data.tipo === 'Solicitud' ? `Solicitud de Insumo: ${data.solicitudArticulo}` : `Oficio Oficial de ${data.tipo}`);

  const doc = new Document({
    sections: [
      {
        children: [
          // Header Timbrado
          new Paragraph({
            children: [
              new TextRun({ text: 'Hospital Infantil\n', size: 22, color: '70B3D6' }),
              new TextRun({ text: 'DR. JOSÉ MANUEL RODRÍGUEZ JIMÉNES', bold: true, size: 26, color: '4B9CD5' })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Santo Domingo, R.D. | ${fechaEspanol}`, size: 19, color: '0F172A' })
            ],
            alignment: AlignmentType.RIGHT
          }),
          new Paragraph({ text: '' }),

          // Encabezado destinatario
          new Paragraph({
            children: [
              new TextRun({ text: `A: ${receptorCargo}`, size: 20 })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: receptorNombre, bold: true, size: 22 })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Asunto: ${asuntoTexto}`, bold: true, size: 20 })
            ]
          }),
          new Paragraph({ text: '' }),

          // Cuerpo formal
          new Paragraph({
            children: [
              new TextRun({
                text: 'Por medio de la presente correspondencia oficial, se emite constancia formal respecto a la novedad o certificación técnica descrita a continuación:',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({
                text: data.cuerpo || (data.tipo === 'Solicitud' ? `Solicitud formal de ${data.solicitudCantidad || 1} unidades de ${data.solicitudArticulo} para el área de Almacén y Suministros.` : 'Constancia y certificación técnica emitida para los fines institucionales correspondientes.'),
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({
                text: 'Para que así conste a los fines institucionales correspondientes, se suscribe el presente documento.',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Atentamente,', size: 20 })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Firmas
          new Paragraph({
            children: [
              new TextRun({ text: '_____________________________________', bold: true })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Recibido por', bold: true, size: 20 })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({
            children: [
              new TextRun({ text: receptorNombre, size: 18, color: '64748B' })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: '________________________________________________', bold: true })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({ text: data.usuarioNombre || 'José Miguel Mesa Romero', bold: true, size: 20 })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Encargado de Almacén y Suministros', size: 18, color: '64748B' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Footer Institucional
          new Paragraph({
            children: [
              new TextRun({ text: 'Calle 28 Esq. Calle 39, Ens. La Fe, Sto. Dgo. D.N. R.D.\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'Telefono : 809-566-3322 | E-mail: direccion@hijmr.gob.do\n', size: 15, color: '58A0BE' }),
              new TextRun({ text: 'RNC 430040495 | www.hijmr.gob.do | SRS METROPOLITANO', size: 15, color: '58A0BE' })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Carta_Oficio_${data.tipo}_${receptorNombre.replace(/\s+/g, '_')}.docx`);
}
