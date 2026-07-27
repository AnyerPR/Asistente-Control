import React, { useState } from 'react';
import { FileSpreadsheet, X, Filter, FileText, ChevronRight, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExportDestinoData } from '../types';

interface ExcelItem {
  codigo: string;
  nombre: string;
  descripcion: string;
  stock: number;
  lote: string;
  tipo: string;
}

interface AnalizadorExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaNombre: string;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onSolicitarDestino: (titulo: string, callbackFn: (dest: ExportDestinoData) => void) => void;
}

export const AnalizadorExcelModal: React.FC<AnalizadorExcelModalProps> = ({
  isOpen,
  onClose,
  areaNombre,
  onShowToast,
  onSolicitarDestino,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<'Todos' | 'Sin Saldo' | 'Cantidades Mínimas'>('Todos');
  const [processedItems, setProcessedItems] = useState<ExcelItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  if (!isOpen) return null;

  const handleProcess = () => {
    if (!file) {
      onShowToast('error', 'Archivo Faltante', 'Selecciona la Hoja Maestra Excel.');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames.find((n) => n.toUpperCase() === 'STOCK') || workbook.SheetNames[0];

        const rows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        const results: ExcelItem[] = [];

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (r && r[2]) {
            results.push({
              codigo: r[1] ? String(r[1]) : 'N/A',
              nombre: String(r[2]),
              descripcion: r[3] ? String(r[3]) : 'Sin descripción',
              stock: parseFloat(r[4]) || 0,
              lote: r[6] ? String(r[6]) : 'N/A',
              tipo: r[8] ? String(r[8]).trim() : 'General'
            });
          }
        }

        setProcessedItems(results);
        setIsProcessing(false);
        setShowResults(true);
        onShowToast('success', 'Excel Procesado', `Se leyeron ${results.length} ítems del catálogo.`);
      } catch (err) {
        setIsProcessing(false);
        onShowToast('error', 'Error Excel', 'No se pudo leer la estructura de la hoja.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredItems = processedItems.filter((i) => {
    if (reportType === 'Sin Saldo') return i.stock === 0;
    if (reportType === 'Cantidades Mínimas') return i.stock > 0 && i.stock <= 5;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-3xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Analizador de Excel y Alertas Críticas — {areaNombre}</h3>
              <p className="text-xs text-gray-400">Filtrado inteligente de stock general de almacén</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showResults ? (
          <div className="space-y-4 py-4 max-w-lg mx-auto w-full">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">1. Seleccionar Archivo Excel Maestro (.xlsx / .xls)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2 text-xs text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-cyan-950 file:text-cyan-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">2. Criterio de Filtrado de Existencias</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              >
                <option value="Todos">Ver Todos los ítems del catálogo</option>
                <option value="Sin Saldo">Agotados (Stock en 0 unidades)</option>
                <option value="Cantidades Mínimas">Críticos (1 a 5 unidades)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
              <button onClick={onClose} className="bg-gray-800 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold">
                Cancelar
              </button>
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? 'Procesando...' : 'Analizar y Segmentar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 space-y-3 overflow-hidden">
            <div className="flex justify-between items-center bg-gray-950 p-3 rounded-xl border border-gray-800 text-xs">
              <span className="font-bold text-white">
                Resultados filtrados: {filteredItems.length} de {processedItems.length} ítems
              </span>
              <button
                onClick={() => {
                  onSolicitarDestino(`Informe Crítico — ${areaNombre}`, () => {
                    onShowToast('success', 'Informe Emitido', 'Se descargó el informe de alerta.');
                  });
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-md"
              >
                <FileText className="w-4 h-4" /> Exportar Informe Word
              </button>
            </div>

            <div className="overflow-y-auto flex-1 rounded-xl border border-gray-800 bg-gray-950/60 custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-gray-400 border-b border-gray-800 uppercase font-mono text-[10px] sticky top-0">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Insumo</th>
                    <th className="p-2.5">Descripción</th>
                    <th className="p-2.5">Lote</th>
                    <th className="p-2.5 text-center">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {filteredItems.slice(0, 100).map((i, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/40">
                      <td className="p-2.5 font-mono text-gray-500">{i.codigo}</td>
                      <td className="p-2.5 font-bold text-white">{i.nombre}</td>
                      <td className="p-2.5 text-gray-400">{i.descripcion}</td>
                      <td className="p-2.5 text-amber-400 font-mono">{i.lote}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-400 font-mono">{i.stock} u.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 font-mono pt-2 border-t border-gray-800">
              <button onClick={() => setShowResults(false)} className="text-cyan-400 hover:underline">
                ← Volver a cargar otro archivo
              </button>
              <span>Mostrando los primeros 100 registros</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
