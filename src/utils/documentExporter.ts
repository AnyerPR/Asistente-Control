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

// Individual Despacho PDF
export function generarPDFDespachoGlobal(despacho: DespachoGlobal, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  // Banner Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — COMPROBANTE DE DESPACHO DE MEDICAMENTOS`, 14, 20);

  // Status Badge
  const isCompleted = despacho.estado === 'Completado';
  doc.setFillColor(isCompleted ? 16 : 217, isCompleted ? 185 : 119, isCompleted ? 129 : 6);
  doc.roundedRect(pageWidth - 45, 10, 32, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(despacho.estado.toUpperCase(), pageWidth - 29, 15, { align: 'center' });

  let y = 40;

  // Details box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 38, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`DESPACHO NO: ${despacho.numeroDespacho}`, 20, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Fecha y Hora: ${despacho.fecha} — ${despacho.hora}`, 20, y + 16);
  doc.text(`Paciente: ${despacho.paciente}`, 20, y + 23);
  doc.text(`Departamento / Área: ${despacho.departamento}`, 20, y + 30);

  doc.text(`Responsable / Entrega: ${despacho.responsable}`, pageWidth - 85, y + 16);
  if (destData) {
    doc.text(`Destino / Recibe: ${destData.nombre}`, pageWidth - 85, y + 23);
    doc.text(`Cargo / Dependencia: ${destData.cargo}${destData.dependencia ? ' - ' + destData.dependencia : ''}`, pageWidth - 85, y + 30);
  }

  y += 46;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('DETALLE DE MEDICAMENTOS E INSUMOS DESPACHADOS', 14, y);

  y += 4;

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
    headStyles: { fillColor: [14, 116, 144], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' }
    }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 30;
  let nextY = finalY + 8;

  // Totals box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth - 75, nextY, 61, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL: $${despacho.totales ? despacho.totales.toFixed(2) : '0.00'}`, pageWidth - 45, nextY + 8, { align: 'center' });

  if (despacho.observaciones) {
    nextY += 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Observaciones:', 14, nextY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(despacho.observaciones, 14, nextY + 5, { maxWidth: pageWidth - 28 });
  }

  // Signatures
  const sigY = Math.max(nextY + 30, 230);
  doc.setDrawColor(148, 163, 184);
  doc.line(25, sigY, 85, sigY);
  doc.line(pageWidth - 85, sigY, pageWidth - 25, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Firma y Sello — Entregó Conforme', 55, sigY + 5, { align: 'center' });
  doc.text('Firma y Sello — Recibió Conforme', pageWidth - 55, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(despacho.responsable, 55, sigY + 9, { align: 'center' });
  if (destData) {
    doc.text(destData.nombre, pageWidth - 55, sigY + 9, { align: 'center' });
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Documento generado por Hospital Supply Manager | Impreso el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 285, { align: 'center' });

  doc.save(`Despacho_${despacho.numeroDespacho}.pdf`);
}

// Export FULL HISTORY of Despachos to PDF
export function generarPDFHistorialDespachos(despachos: DespachoGlobal[], destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — HISTORIAL COMPLETO DE DESPACHOS DE MEDICAMENTOS`, 14, 19);

  if (destData) {
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`Dirigido a: ${destData.nombre} (${destData.cargo})`, pageWidth - 14, 19, { align: 'right' });
  }

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
    startY: 34,
    head: [['#', 'No. Despacho', 'Fecha/Hora', 'Paciente', 'Departamento', 'Medicamentos / Ítems', 'Estado', 'Total ($)', 'Responsable']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [14, 116, 144], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 35 },
      4: { cellWidth: 32 },
      5: { cellWidth: 80 },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 28 }
    }
  });

  const totalSuma = despachos.reduce((acc, curr) => acc + (curr.totales || 0), 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL REGISTROS: ${despachos.length} | MONTO TOTAL DESPACHADO: $${totalSuma.toFixed(2)}`, 14, finalY + 8);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Reporte generado por Hospital Supply Manager | Impreso el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 198, { align: 'center' });

  doc.save(`Historial_Despachos_${fechaImpresion.replace(/\//g, '-')}.pdf`);
}

// Individual Despacho DOCX
export async function generarDOCXDespachoGlobal(despacho: DespachoGlobal, destData?: ExportDestinoData) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true })] })], width: { size: 5, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Medicamento / Ítem', bold: true })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad', bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Precio Unit.', bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Subtotal', bold: true })] })], width: { size: 20, type: WidthType.PERCENTAGE } })
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
          new Paragraph({
            text: HOSPITAL_NAME,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            text: `${SYSTEM_TITLE} — COMPROBANTE OFICIAL DE DESPACHO`,
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `Número de Despacho: ${despacho.numeroDespacho}`, bold: true, size: 24 })] }),
          new Paragraph({ text: `Fecha y Hora: ${despacho.fecha} - ${despacho.hora}` }),
          new Paragraph({ text: `Paciente: ${despacho.paciente}` }),
          new Paragraph({ text: `Departamento: ${despacho.departamento}` }),
          new Paragraph({ text: `Estado: ${despacho.estado}` }),
          new Paragraph({ text: `Responsable: ${despacho.responsable}` }),
          ...(destData ? [
            new Paragraph({ text: `Destino: ${destData.nombre} (${destData.cargo})` })
          ] : []),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: 'Detalle de Medicamentos:', bold: true })] }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL GENERAL: $${despacho.totales ? despacho.totales.toFixed(2) : '0.00'}`, bold: true, size: 22 })] }),
          ...(despacho.observaciones ? [new Paragraph({ text: `Observaciones: ${despacho.observaciones}` })] : []),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '_____________________________          _____________________________', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'Entregó Conforme                                 Recibió Conforme', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `Generado el ${fechaImpresion} a las ${horaImpresion}`, size: 16 })], alignment: AlignmentType.RIGHT })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Despacho_${despacho.numeroDespacho}.docx`);
}

// Full History Despachos DOCX
export async function generarDOCXHistorialDespachos(despachos: DespachoGlobal[], destData?: ExportDestinoData) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

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
          new Paragraph({ text: HOSPITAL_NAME, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `${SYSTEM_TITLE} — HISTORIAL COMPLETO DE DESPACHOS`, alignment: AlignmentType.CENTER }),
          ...(destData ? [new Paragraph({ text: `Dirigido a: ${destData.nombre} (${destData.cargo})`, alignment: AlignmentType.RIGHT })] : []),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL REGISTROS: ${despachos.length} | MONTO ACUMULADO: $${totalSuma.toFixed(2)}`, bold: true })] }),
          new Paragraph({ text: `Generado el ${fechaImpresion} a las ${horaImpresion}`, alignment: AlignmentType.RIGHT })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Historial_Despachos_${fechaImpresion.replace(/\//g, '-')}.docx`);
}

// ==========================================
// 2. SALIDAS DE ALMACÉN
// ==========================================

export function generarPDFSalidaAlmacen(salida: SalidaAlmacen, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — REGISTRO OFICIAL DE SALIDA DE ALMACÉN`, 14, 18);

  let y = 38;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 44, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tipo de Salida: ${salida.tipoSalida}`, 20, y + 8);
  doc.text(`Categoría: ${salida.categoriaBien}`, pageWidth - 80, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Fecha/Hora: ${salida.fecha} — ${salida.hora}`, 20, y + 16);
  doc.text(`Depto. Solicitante: ${salida.departamentoSolicitante}`, 20, y + 23);
  doc.text(`Entregado por: ${salida.personaEntrega}`, 20, y + 30);
  doc.text(`Recibido por: ${destData ? destData.nombre : salida.personaRecibe}`, 20, y + 37);

  doc.text(`Registrado por: ${salida.usuarioRegistro}`, pageWidth - 80, y + 16);
  doc.text(`Cantidad Total: ${salida.cantidad} ${salida.unidad}`, pageWidth - 80, y + 23);

  y += 50;

  const tableBody = (salida.itemsList && salida.itemsList.length > 0)
    ? salida.itemsList.map((item, idx) => [
        (idx + 1).toString(),
        item.items,
        item.descripcion || 'Sin especificaciones',
        `${item.cantidad} ${item.unidad || 'u.'}`,
        item.categoriaBien || salida.categoriaBien
      ])
    : [[ '1', salida.items, salida.descripcion || 'Sin especificaciones', `${salida.cantidad} ${salida.unidad}`, salida.categoriaBien ]];

  autoTable(doc, {
    startY: y,
    head: [['#', 'Ítem / Bien Insumo', 'Descripción / Marca / Lote', 'Cantidad', 'Categoría']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 30;

  if (salida.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Observaciones:', 14, finalY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(salida.observaciones, 14, finalY + 15, { maxWidth: pageWidth - 28 });
  }

  const sigY = Math.max(finalY + 40, 220);
  doc.setDrawColor(148, 163, 184);
  doc.line(25, sigY, 85, sigY);
  doc.line(pageWidth - 85, sigY, pageWidth - 25, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Firma Persona que Entrega', 55, sigY + 5, { align: 'center' });
  doc.text('Firma Persona que Recibe', pageWidth - 55, sigY + 5, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Hospital Supply Manager | Impreso el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 285, { align: 'center' });

  doc.save(`Salida_Almacen_${salida.fecha.replace(/\//g, '-')}.pdf`);
}

export async function generarDOCXSalidaAlmacen(salida: SalidaAlmacen, destData?: ExportDestinoData) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();
  const receptorNombre = destData ? destData.nombre : salida.personaRecibe;
  const receptorCargo = destData ? destData.cargo : salida.departamentoSolicitante;
  const receptorDependencia = destData?.dependencia ? ` (${destData.dependencia})` : '';

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header / Encabezado Hospitalario
          new Paragraph({
            children: [
              new TextRun({ text: HOSPITAL_NAME, bold: true, size: 26, color: '0F172A' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${SYSTEM_TITLE} — DEPARTAMENTO DE ALMACÉN CENTRAL`, bold: true, size: 18, color: '0E7490' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Sub-dirección de Gestión de Suministros e Insumos Hospitalarios', italics: true, size: 16, color: '475569' })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          
          // Fecha y Lugar estilo carta
          new Paragraph({
            children: [
              new TextRun({ text: `Santo Domingo, R.D. — ${salida.fecha} (${salida.hora})`, bold: true, size: 20 })
            ],
            alignment: AlignmentType.RIGHT
          }),
          new Paragraph({ text: '' }),

          // Encabezado Tipo Oficio / Carta
          new Paragraph({
            children: [
              new TextRun({ text: 'CARTA OFICIO DE SALIDA DE BIENES E INSUMOS', bold: true, size: 22, color: '0F172A' })
            ],
            alignment: AlignmentType.LEFT
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({ text: 'PARA: ', bold: true, size: 20 }),
              new TextRun({ text: `${receptorNombre.toUpperCase()}`, bold: true, size: 20 }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'CARGO / DEPTO: ', bold: true, size: 20 }),
              new TextRun({ text: `${receptorCargo}${receptorDependencia}`, size: 20 }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'DE: ', bold: true, size: 20 }),
              new TextRun({ text: `${salida.personaEntrega} (Almacén Central)`, size: 20 }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'ASUNTO: ', bold: true, size: 20 }),
              new TextRun({ text: `Despacho Oficial de ${salida.categoriaBien} — Modalidad: ${salida.tipoSalida}`, size: 20 }),
            ]
          }),
          new Paragraph({ text: '' }),

          // Cuerpo de la Carta
          new Paragraph({
            children: [
              new TextRun({ text: 'Estimado(a) Señor(a):', bold: true, size: 20 })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Por medio de la presente comunicación oficial, se hace entrega formal de los bienes e insumos correspondientes a la categoría de ',
                size: 20
              }),
              new TextRun({ text: `${salida.categoriaBien}`, bold: true, size: 20 }),
              new TextRun({
                text: ', solicitados para el área o departamento de ',
                size: 20
              }),
              new TextRun({ text: `${salida.departamentoSolicitante}`, bold: true, size: 20 }),
              new TextRun({
                text: '. Los detalles del despacho procesado bajo la modalidad de ',
                size: 20
              }),
              new TextRun({ text: `${salida.tipoSalida}`, bold: true, size: 20 }),
              new TextRun({
                text: ' se especifican a continuación:',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),

          // Tabla de los Ítems Despachados
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
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
                    children: [new Paragraph({ children: [new TextRun({ text: 'Unidad', bold: true, size: 18 })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              ...((salida.itemsList && salida.itemsList.length > 0)
                ? salida.itemsList.map(item => new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.items, bold: true, size: 18 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.descripcion || 'Sin descripción', size: 18 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.cantidad.toString(), bold: true, size: 18 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.unidad || 'u.', size: 18 })] })] })
                    ]
                  }))
                : [
                    new TableRow({
                      children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: salida.items, bold: true, size: 18 })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: salida.descripcion, size: 18 })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: salida.cantidad.toString(), bold: true, size: 18 })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: salida.unidad, size: 18 })] })] })
                      ]
                    })
                  ]
              )
            ]
          }),
          new Paragraph({ text: '' }),

          // Observaciones si existen
          ...(salida.observaciones ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Observaciones / Notas Adicionales: ', bold: true, size: 18 }),
                new TextRun({ text: salida.observaciones, size: 18, italics: true })
              ]
            }),
            new Paragraph({ text: '' })
          ] : []),

          // Párrafo de Cierre de la Carta
          new Paragraph({
            children: [
              new TextRun({
                text: 'Favor verificar el estado físico y las cantidades de los materiales al momento de su recepción y retornar el presente oficio firmado y sellado como constancia de conformidad.',
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Sin otro particular a que hacer referencia, quedamos a su entera disposición.', size: 20 })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Firmas estilo carta
          new Paragraph({
            children: [
              new TextRun({
                text: '_____________________________________          _____________________________________',
                bold: true
              })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'ENTREGADO POR                                            RECIBIDO CONFORME', bold: true, size: 18 })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${salida.personaEntrega}                                    ${receptorNombre}`, size: 16 })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Almacén Central - Depto. Suministros                ${salida.departamentoSolicitante}`, size: 15, italics: true })
            ],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: `Documento certificado generado por Hospital Supply Manager el ${fechaImpresion} a las ${horaImpresion}`, size: 14, color: '94A3B8' })
            ],
            alignment: AlignmentType.RIGHT
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Carta_Salida_Almacen_${salida.items.substring(0, 15).replace(/\s+/g, '_')}_${salida.fecha.replace(/\//g, '-')}.docx`);
}

export function generarPDFListadoSalidas(salidas: SalidaAlmacen[], destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — LISTADO GENERAL DE SALIDAS DE ALMACÉN`, 14, 19);

  if (destData) {
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`Destino: ${destData.nombre} (${destData.cargo})`, pageWidth - 14, 19, { align: 'right' });
  }

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
    startY: 34,
    head: [['#', 'Fecha/Hora', 'Tipo Salida', 'Categoría', 'Ítem / Bien', 'Cantidad', 'Depto Solicitante', 'Entrega', 'Recibe']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL SALIDAS REGISTRADAS: ${salidas.length}`, 14, finalY + 8);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Hospital Supply Manager | Impreso el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 198, { align: 'center' });

  doc.save(`Listado_Salidas_${fechaImpresion.replace(/\//g, '-')}.pdf`);
}

export async function generarDOCXListadoSalidas(salidas: SalidaAlmacen[], destData?: ExportDestinoData) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

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
          new Paragraph({ text: HOSPITAL_NAME, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `${SYSTEM_TITLE} — LISTADO COMPLETO DE SALIDAS`, alignment: AlignmentType.CENTER }),
          ...(destData ? [new Paragraph({ text: `Destino: ${destData.nombre} (${destData.cargo})`, alignment: AlignmentType.RIGHT })] : []),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL REGISTROS: ${salidas.length}`, bold: true })] }),
          new Paragraph({ text: `Generado el ${fechaImpresion} a las ${horaImpresion}`, alignment: AlignmentType.RIGHT })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Listado_Salidas_${fechaImpresion.replace(/\//g, '-')}.docx`);
}

// ==========================================
// 3. CONTROL DE AGUA PURIFICADA
// ==========================================

export function generarPDFRegistroAgua(itemAgua: HistorialAgua, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — REGISTRO DE DESPACHO DE AGUA PURIFICADA`, 14, 18);

  let y = 40;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 42, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`REGISTRO CONSECUTIVO NO: #${itemAgua.idConsecutivo}`, 20, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Fecha y Hora: ${itemAgua.fecha} — ${itemAgua.hora}`, 20, y + 17);
  doc.text(`Departamento / Servicio: ${itemAgua.departamento}`, 20, y + 24);
  doc.text(`Producto Entregado: ${itemAgua.producto}`, 20, y + 31);
  doc.text(`Cantidad Despachada: ${itemAgua.cantidad} unidades`, 20, y + 38);

  doc.text(`Frecuencia: ${itemAgua.frecuencia}`, pageWidth - 80, y + 17);
  doc.text(`Responsable Entrega: ${itemAgua.responsable}`, pageWidth - 80, y + 24);
  doc.text(`Receptor Conforme: ${destData ? destData.nombre : itemAgua.receptor}`, pageWidth - 80, y + 31);

  y += 50;

  autoTable(doc, {
    startY: y,
    head: [['Departamento', 'Producto', 'Cantidad Entregada', 'Habilitado Stock', 'Pendiente Cuota']],
    body: [
      [
        itemAgua.departamento,
        itemAgua.producto,
        itemAgua.cantidad.toString(),
        itemAgua.habilitado.toString(),
        itemAgua.pendiente.toString()
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  const sigY = 220;
  doc.setDrawColor(148, 163, 184);
  doc.line(25, sigY, 85, sigY);
  doc.line(pageWidth - 85, sigY, pageWidth - 25, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Firma Responsable Almacén', 55, sigY + 5, { align: 'center' });
  doc.text('Firma Receptor Departamento', pageWidth - 55, sigY + 5, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Hospital Supply Manager | Impreso el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 285, { align: 'center' });

  doc.save(`Registro_Agua_${itemAgua.idConsecutivo}.pdf`);
}

export async function generarDOCXRegistroAgua(itemAgua: HistorialAgua, destData?: ExportDestinoData) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: HOSPITAL_NAME, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `${SYSTEM_TITLE} — REGISTRO DE AGUA PURIFICADA`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Consecutivo: #${itemAgua.idConsecutivo}`, heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Fecha / Hora: ${itemAgua.fecha} ${itemAgua.hora}` }),
          new Paragraph({ text: `Departamento: ${itemAgua.departamento}` }),
          new Paragraph({ text: `Producto: ${itemAgua.producto}` }),
          new Paragraph({ text: `Cantidad Entregada: ${itemAgua.cantidad}` }),
          new Paragraph({ text: `Habilitado en Stock: ${itemAgua.habilitado}` }),
          new Paragraph({ text: `Pendiente en Cuota: ${itemAgua.pendiente}` }),
          new Paragraph({ text: `Responsable: ${itemAgua.responsable}` }),
          new Paragraph({ text: `Receptor: ${destData ? destData.nombre : itemAgua.receptor}` }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '_____________________________          _____________________________', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'Firma Responsable Almacén                       Firma Receptor', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Generado el ${fechaImpresion} a las ${horaImpresion}`, alignment: AlignmentType.RIGHT })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Registro_Agua_${itemAgua.idConsecutivo}.docx`);
}

export function generarPDFHistorialAgua(historial: HistorialAgua[], destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — HISTORIAL DE ENTREGAS DE AGUA PURIFICADA`, 14, 19);

  if (destData) {
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`Destino: ${destData.nombre} (${destData.cargo})`, pageWidth - 14, 19, { align: 'right' });
  }

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
    startY: 34,
    head: [['No. Consecutivo', 'Fecha/Hora', 'Departamento', 'Producto', 'Cantidad', 'Frecuencia', 'Entregó', 'Recibió']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  const totalCantidad = historial.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL REGISTROS: ${historial.length} | TOTAL UNIDADES DESPACHADAS: ${totalCantidad}`, 14, finalY + 8);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Hospital Supply Manager | Impreso el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 198, { align: 'center' });

  doc.save(`Historial_Agua_${fechaImpresion.replace(/\//g, '-')}.pdf`);
}

export async function generarDOCXHistorialAgua(historial: HistorialAgua[], destData?: ExportDestinoData) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

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
          new Paragraph({ text: HOSPITAL_NAME, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `${SYSTEM_TITLE} — HISTORIAL DE AGUA PURIFICADA`, alignment: AlignmentType.CENTER }),
          ...(destData ? [new Paragraph({ text: `Destino: ${destData.nombre} (${destData.cargo})`, alignment: AlignmentType.RIGHT })] : []),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL REGISTROS: ${historial.length} | TOTAL UNIDADES: ${totalCantidad}`, bold: true })] }),
          new Paragraph({ text: `Generado el ${fechaImpresion} a las ${horaImpresion}`, alignment: AlignmentType.RIGHT })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Historial_Agua_${fechaImpresion.replace(/\//g, '-')}.docx`);
}

// ==========================================
// 4. ENTRADAS DE MERCANCÍA
// ==========================================

export function generarPDFEntradaMercancia(entrada: EntradaMercancia, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — REGISTRO DE ENTRADA DE MERCANCÍA / RECEPCIÓN`, 14, 18);

  let y = 38;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 38, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Proveedor: ${entrada.proveedor}`, 20, y + 8);
  doc.text(`No. Documento / Factura: ${entrada.documento}`, pageWidth - 90, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Fecha/Hora: ${entrada.fecha} — ${entrada.hora}`, 20, y + 16);
  doc.text(`Destino / Área: ${entrada.destino}`, 20, y + 23);
  if (destData) {
    doc.text(`Dirigido a: ${destData.nombre} (${destData.cargo})`, pageWidth - 90, y + 16);
  }

  y += 44;

  const tableData = entrada.items.map((item, idx) => [
    (idx + 1).toString(),
    item.producto,
    item.descripcion,
    item.cantidad.toString()
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Producto / Insumo', 'Descripción / Marca', 'Cantidad Recibida']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 30;

  if (entrada.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Observaciones:', 14, finalY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(entrada.observaciones, 14, finalY + 15, { maxWidth: pageWidth - 28 });
  }

  const sigY = Math.max(finalY + 40, 220);
  doc.setDrawColor(148, 163, 184);
  doc.line(25, sigY, 85, sigY);
  doc.line(pageWidth - 85, sigY, pageWidth - 25, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Firma Encargado de Almacén', 55, sigY + 5, { align: 'center' });
  doc.text('Firma Transportista / Entregó', pageWidth - 55, sigY + 5, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Hospital Supply Manager | Impreso el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 285, { align: 'center' });

  doc.save(`Entrada_Mercancia_${entrada.documento}.pdf`);
}

export async function generarDOCXEntradaMercancia(entrada: EntradaMercancia, destData?: ExportDestinoData) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: HOSPITAL_NAME, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `${SYSTEM_TITLE} — RECEPCIÓN DE MERCANCÍA`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Proveedor: ${entrada.proveedor}` }),
          new Paragraph({ text: `Documento: ${entrada.documento}` }),
          new Paragraph({ text: `Fecha / Hora: ${entrada.fecha} ${entrada.hora}` }),
          new Paragraph({ text: `Destino: ${entrada.destino}` }),
          ...(destData ? [new Paragraph({ text: `Dirigido a: ${destData.nombre} (${destData.cargo})` })] : []),
          new Paragraph({ text: '' }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Producto', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Descripción', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cantidad', bold: true })] })] })
                ]
              }),
              ...entrada.items.map((item) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(item.producto)] }),
                    new TableCell({ children: [new Paragraph(item.descripcion)] }),
                    new TableCell({ children: [new Paragraph(item.cantidad.toString())] })
                  ]
                })
              )
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),
          ...(entrada.observaciones ? [new Paragraph({ text: '' }), new Paragraph({ text: `Observaciones: ${entrada.observaciones}` })] : []),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '_____________________________          _____________________________', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'Firma Encargado Almacén                          Firma Transportista', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Generado el ${fechaImpresion} a las ${horaImpresion}`, alignment: AlignmentType.RIGHT })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Entrada_Mercancia_${entrada.documento}.docx`);
}

export function generarPDFListadoEntradas(entradas: EntradaMercancia[], destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — HISTORIAL COMPLETO DE ENTRADAS DE MERCANCÍA`, 14, 19);

  if (destData) {
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`Destino: ${destData.nombre} (${destData.cargo})`, pageWidth - 14, 19, { align: 'right' });
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
    startY: 34,
    head: [['#', 'No. Documento', 'Fecha/Hora', 'Proveedor', 'Destino', 'Productos / Insumos']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL ENTRADAS REGISTRADAS: ${entradas.length}`, 14, finalY + 8);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Hospital Supply Manager | Impreso el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 198, { align: 'center' });

  doc.save(`Listado_Entradas_${fechaImpresion.replace(/\//g, '-')}.pdf`);
}

export async function generarDOCXListadoEntradas(entradas: EntradaMercancia[], destData?: ExportDestinoData) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

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
          new Paragraph({ text: HOSPITAL_NAME, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `${SYSTEM_TITLE} — HISTORIAL DE ENTRADAS DE MERCANCÍA`, alignment: AlignmentType.CENTER }),
          ...(destData ? [new Paragraph({ text: `Destino: ${destData.nombre} (${destData.cargo})`, alignment: AlignmentType.RIGHT })] : []),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL REGISTROS: ${entradas.length}`, bold: true })] }),
          new Paragraph({ text: `Generado el ${fechaImpresion} a las ${horaImpresion}`, alignment: AlignmentType.RIGHT })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Listado_Entradas_${fechaImpresion.replace(/\//g, '-')}.docx`);
}

// ==========================================
// 5. DESTINATARIOS
// ==========================================

export function generarPDFListadoDestinatarios(destinatarios: Destinatario[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — DIRECTORIO OFICIAL DE DESTINATARIOS`, 14, 19);

  const tableData = destinatarios.map((item, idx) => [
    (idx + 1).toString(),
    item.nombre,
    item.cargo,
    item.dependencia || 'N/A',
    item.activo ? 'ACTIVO' : 'INACTIVO'
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['#', 'Nombre Completo', 'Cargo / Puesto', 'Dependencia / Depto', 'Estado']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL DESTINATARIOS REGISTRADOS: ${destinatarios.length}`, 14, finalY + 8);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Hospital Supply Manager | Impreso el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 285, { align: 'center' });

  doc.save(`Directorio_Destinatarios_${fechaImpresion.replace(/\//g, '-')}.pdf`);
}

export async function generarDOCXListadoDestinatarios(destinatarios: Destinatario[]) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

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
          new Paragraph({ text: HOSPITAL_NAME, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `${SYSTEM_TITLE} — DIRECTORIO DE DESTINATARIOS`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `TOTAL DESTINATARIOS: ${destinatarios.length}`, bold: true })] }),
          new Paragraph({ text: `Generado el ${fechaImpresion} a las ${horaImpresion}`, alignment: AlignmentType.RIGHT })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Directorio_Destinatarios_${fechaImpresion.replace(/\//g, '-')}.docx`);
}

export const generarPDFDirectorioDestinatarios = generarPDFListadoDestinatarios;
export const generarDOCXDirectorioDestinatarios = generarDOCXListadoDestinatarios;

// ==========================================
// 6. CORRESPONDENCIA Y OFICIOS (INFORMES, SOLICITUDES, CERTIFICACIONES)
// ==========================================

export function generarPDFOficioCorrespondencia(data: OficioCorrespondenciaData, destData?: ExportDestinoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();

  // Dark Banner Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(HOSPITAL_NAME, 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${SYSTEM_TITLE} — OFICIO Y CORRESPONDENCIA OFICIAL`, 14, 20);

  // Type Badge
  doc.setFillColor(14, 116, 144); // cyan-700
  doc.roundedRect(pageWidth - 55, 10, 41, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`OFICIO: ${data.tipo.toUpperCase()}`, pageWidth - 34.5, 15, { align: 'center' });

  let y = 40;

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 42, 3, 3, 'FD');

  const receptorNombre = destData ? destData.nombre : 'A QUIEN PUEDA INTERESAR';
  const receptorCargo = destData ? destData.cargo : 'Dirección / Departamento';
  const receptorDependencia = destData?.dependencia ? ` — ${destData.dependencia}` : '';

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`PARA: ${receptorNombre.toUpperCase()}`, 20, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`CARGO / DEPTO: ${receptorCargo}${receptorDependencia}`, 20, y + 16);
  doc.text(`DE: ${data.usuarioNombre} (Almacén Central)`, 20, y + 23);
  doc.text(`ASUNTO: ${data.asunto || data.solicitudArticulo || 'Oficio de Correspondencia Oficial'}`, 20, y + 30);
  doc.text(`FECHA DE EMISIÓN: ${fechaImpresion} — ${horaImpresion}`, 20, y + 37);

  y += 50;

  // Title of letter body
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`COMUNICACIÓN OFICIAL — ${data.tipo.toUpperCase()}`, 14, y);

  y += 8;

  // Body Content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  if (data.tipo === 'Solicitud') {
    doc.text('Por medio de la presente comunicación oficial, se solicita formalmente el suministro del siguiente insumo o artículo para las operaciones del hospital:', 14, y, { maxWidth: pageWidth - 28 });
    y += 12;

    autoTable(doc, {
      startY: y,
      head: [['Insumo / Artículo Solicitado', 'Cantidad Requerida', 'Departamento Solicitante']],
      body: [
        [data.solicitudArticulo || 'No especificado', `${data.solicitudCantidad || 1} unidades`, 'Almacén Central']
      ],
      theme: 'grid',
      headStyles: { fillColor: [126, 34, 206], textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 25;
    y = finalY + 12;
  } else {
    const textoCuerpo = data.cuerpo || data.asunto || 'Sin más por el momento, quedamos a su entera disposición para cualquier aclaración respecto a esta comunicación.';
    const lines = doc.splitTextToSize(textoCuerpo, pageWidth - 28);
    doc.text(lines, 14, y);
    y += (lines.length * 5) + 12;
  }

  // Closing greeting
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Agradeciendo de antemano la atención brindada a la presente, se despide atentamente,', 14, y, { maxWidth: pageWidth - 28 });

  // Signature lines
  const sigY = Math.max(y + 35, 225);
  doc.setDrawColor(148, 163, 184);
  doc.line(25, sigY, 85, sigY);
  doc.line(pageWidth - 85, sigY, pageWidth - 25, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Firma y Sello — Emisor del Oficio', 55, sigY + 5, { align: 'center' });
  doc.text('Firma y Sello — Recibido / Conforme', pageWidth - 55, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(data.usuarioNombre, 55, sigY + 9, { align: 'center' });
  doc.text(receptorNombre, pageWidth - 55, sigY + 9, { align: 'center' });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Hospital Supply Manager | Documento generado el ${fechaImpresion} a las ${horaImpresion}`, pageWidth / 2, 285, { align: 'center' });

  const fileName = `Oficio_${data.tipo}_${receptorNombre.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

export async function generarDOCXOficioCorrespondencia(data: OficioCorrespondenciaData, destData?: ExportDestinoData) {
  const { fecha: fechaImpresion, hora: horaImpresion } = getFormattedNow();
  const receptorNombre = destData ? destData.nombre : 'A QUIEN PUEDA INTERESAR';
  const receptorCargo = destData ? destData.cargo : 'Dirección / Departamento';
  const receptorDependencia = destData?.dependencia ? ` — ${destData.dependencia}` : '';

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: HOSPITAL_NAME, bold: true, size: 26, color: '0F172A' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `${SYSTEM_TITLE} — DEPARTAMENTO DE ALMACÉN CENTRAL`, bold: true, size: 18, color: '0E7490' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: `Santo Domingo, R.D. — ${fechaImpresion}`, bold: true, size: 20 })],
            alignment: AlignmentType.RIGHT
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: `OFICIO OFICIAL DE ${data.tipo.toUpperCase()}`, bold: true, size: 22, color: '0F172A' })]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: 'PARA: ', bold: true, size: 20 }), new TextRun({ text: receptorNombre.toUpperCase(), bold: true, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: 'CARGO: ', bold: true, size: 20 }), new TextRun({ text: `${receptorCargo}${receptorDependencia}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: 'DE: ', bold: true, size: 20 }), new TextRun({ text: `${data.usuarioNombre} (Almacén Central)`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: 'ASUNTO: ', bold: true, size: 20 }), new TextRun({ text: data.asunto || data.solicitudArticulo || 'Comunicación Oficial', size: 20 })] }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.cuerpo || (data.tipo === 'Solicitud' ? `Solicitud formal de ${data.solicitudCantidad || 1} unidades de ${data.solicitudArticulo}.` : 'Por medio de la presente comunicación oficial...'),
                size: 20
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '_____________________________          _____________________________', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'Firma y Sello Emisor                                Firma y Sello Recibido', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `${data.usuarioNombre}                                ${receptorNombre}`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Generado el ${fechaImpresion} a las ${horaImpresion}`, alignment: AlignmentType.RIGHT })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Oficio_${data.tipo}_${receptorNombre.replace(/\s+/g, '_')}.docx`);
}
