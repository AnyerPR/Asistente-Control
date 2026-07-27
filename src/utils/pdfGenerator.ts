import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DespachoGlobal, SalidaAlmacen, ExportDestinoData } from '../types';

export function generarPDFDespachoGlobal(despacho: DespachoGlobal, destData?: ExportDestinoData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header / Header background banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Title and Hospital name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('HOSPITAL INFANTIL DR. JOSÉ M. RODRÍGUEZ JIMÉNEZ', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('SISTEMA DE GESTIÓN Y ALMACÉN CENTRAL — COMPROBANTE OFICIAL DE DESPACHO', 14, 20);

  // Status Badge in header
  const isCompleted = despacho.estado === 'Completado';
  doc.setFillColor(isCompleted ? 16 : 217, isCompleted ? 185 : 119, isCompleted ? 129 : 6); // emerald or amber
  doc.roundedRect(pageWidth - 45, 10, 32, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(despacho.estado.toUpperCase(), pageWidth - 29, 15, { align: 'center' });

  let y = 42;

  // Document details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 36, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`DESPACHO NO: ${despacho.numeroDespacho}`, 20, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Fecha y Hora: ${despacho.fecha} — ${despacho.hora}`, 20, y + 16);
  doc.text(`Paciente: ${despacho.paciente}`, 20, y + 23);
  doc.text(`Departamento / Área: ${despacho.departamento}`, 20, y + 30);

  doc.text(`Responsable: ${despacho.responsable}`, pageWidth - 80, y + 16);
  if (destData) {
    doc.text(`Destino / Para: ${destData.nombre}`, pageWidth - 80, y + 23);
    doc.text(`Cargo: ${destData.cargo}`, pageWidth - 80, y + 30);
  }

  y += 44;

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('DETALLE DE MEDICAMENTOS E INSUMOS DESPACHADOS', 14, y);

  y += 5;

  // Table of medications
  const tableData = despacho.medicamentos.map((item, index) => [
    (index + 1).toString(),
    item.nombre,
    `${item.cantidad} ${item.unidad || 'u.'}`,
    item.precioUnitario ? `$${item.precioUnitario.toFixed(2)}` : 'N/A',
    item.precioUnitario ? `$${(item.cantidad * item.precioUnitario).toFixed(2)}` : 'N/A'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Medicamento / Ítem', 'Cantidad', 'Precio Unit.', 'Total ($)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144], // cyan-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' }
    }
  });

  // Get table final Y
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || y + 40;

  let nextY = finalY + 8;

  // Totals box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth - 75, nextY, 61, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL GENERAL: $${despacho.totales ? despacho.totales.toFixed(2) : '0.00'}`, pageWidth - 45, nextY + 9, { align: 'center' });

  if (despacho.observaciones) {
    nextY += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Observaciones:', 14, nextY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(despacho.observaciones, 14, nextY + 6, { maxWidth: pageWidth - 28 });
  }

  // Signature Block
  const sigY = Math.max(nextY + 35, 230);

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
  doc.text(`Documento generado por Hospital Supply Manager v3.1 | Fecha de Impresión: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 285, { align: 'center' });

  // Save PDF
  doc.save(`Despacho_${despacho.numeroDespacho}.pdf`);
}

export function generarPDFSalidaAlmacen(salida: SalidaAlmacen) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('HOSPITAL INFANTIL DR. JOSÉ M. RODRÍGUEZ JIMÉNEZ', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('REGISTRO OFICIAL DE SALIDA DE ALMACÉN Y BIENES HOSPITALARIOS', 14, 18);

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
  doc.text(`Recibido por: ${salida.personaRecibe}`, 20, y + 37);

  doc.text(`Registrado por: ${salida.usuarioRegistro}`, pageWidth - 80, y + 16);
  doc.text(`Cantidad Total: ${salida.cantidad} ${salida.unidad}`, pageWidth - 80, y + 23);

  y += 52;

  autoTable(doc, {
    startY: y,
    head: [['Ítem / Bien', 'Descripción Detallada', 'Cantidad', 'Unidad']],
    body: [
      [salida.items, salida.descripcion, salida.cantidad.toString(), salida.unidad]
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || y + 30;

  if (salida.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Observaciones:', 14, finalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(salida.observaciones, 14, finalY + 18, { maxWidth: pageWidth - 28 });
  }

  const sigY = Math.max(finalY + 45, 220);
  doc.setDrawColor(148, 163, 184);
  doc.line(25, sigY, 85, sigY);
  doc.line(pageWidth - 85, sigY, pageWidth - 25, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Firma Persona que Entrega', 55, sigY + 5, { align: 'center' });
  doc.text('Firma Persona que Recibe', pageWidth - 55, sigY + 5, { align: 'center' });

  doc.save(`Salida_Almacen_${salida.fecha.replace(/\//g, '-')}.pdf`);
}
