import React, { useState } from 'react';
import { ArrowDownToLine, X, Plus, Trash2, FileCheck, Printer, Download } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ItemEntrada, EntradaMercancia, ExportDestinoData } from '../types';
import { generarPDFEntradaMercancia, generarDOCXEntradaMercancia } from '../utils/documentExporter';

interface EntradasMercanciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onSolicitarDestino: (titulo: string, callbackFn: (dest: ExportDestinoData) => void) => void;
}

export const EntradasMercanciaModal: React.FC<EntradasMercanciaModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onSolicitarDestino,
}) => {
  const [proveedor, setProveedor] = useState('');
  const [documento, setDocumento] = useState('');
  const [destino, setDestino] = useState('Almacén Central');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<ItemEntrada[]>([
    { producto: '', descripcion: '', cantidad: 1 }
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { producto: '', descripcion: '', cantidad: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemEntrada, value: any) => {
    setItems(
      items.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedor.trim() || !documento.trim()) {
      onShowToast('error', 'Incompleto', 'Indica el proveedor y número de documento.');
      return;
    }

    const validItems = items.filter((i) => i.producto.trim() !== '');
    if (validItems.length === 0) {
      onShowToast('error', 'Ítems Vacíos', 'Agrega al menos un producto recibido.');
      return;
    }

    const now = new Date();
    const nuevaEntrada: Omit<EntradaMercancia, 'id'> = {
      proveedor: proveedor.trim(),
      documento: documento.trim(),
      destino: destino.trim() || 'Almacén Central',
      observaciones: observaciones.trim(),
      items: validItems,
      fecha: now.toLocaleDateString('es-ES'),
      hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      creadoEn: now.toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'entradas_mercancia'), nuevaEntrada);
      onShowToast('success', 'Entrada Registrada', 'Se guardó el ingreso de mercancía en Firestore.');
      
      const entradaConId: EntradaMercancia = { ...nuevaEntrada, id: docRef.id };

      // Solicitar destinatario para el acta y permitir seleccionar formato
      onSolicitarDestino(`Acta de Recepción — ${proveedor}`, (destData) => {
        generarPDFEntradaMercancia(entradaConId, destData);
        onShowToast('info', 'Acta Generada', 'Acta formal emitida en PDF.');
      });

      onClose();
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'entradas_mercancia');
    }
  };

  const resetForm = () => {
    setProveedor('');
    setDocumento('');
    setDestino('Almacén Central');
    setObservaciones('');
    setItems([{ producto: '', descripcion: '', cantidad: 1 }]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-emerald-400" /> Registrar Entrada de Mercancía al Almacén
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Proveedor / Suplidor *</label>
              <input
                type="text"
                required
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Ej: Promese/Cal"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">No. Conduce / Factura *</label>
              <input
                type="text"
                required
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ej: CMD-9482"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Destinado a Sub-Almacén *</label>
              <input
                type="text"
                required
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Ej: Almacén Central"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-800 pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-white">Detalle de Insumos / Productos Recibidos</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-gray-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Fila
              </button>
            </div>

            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              {items.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-gray-950 p-2 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 font-mono w-5 text-center">{idx + 1}.</span>
                  <input
                    type="text"
                    required
                    placeholder="Producto / Insumo"
                    value={row.producto}
                    onChange={(e) => handleItemChange(idx, 'producto', e.target.value)}
                    className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2.5 py-1.5 flex-1 text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Descripción / Lote"
                    value={row.descripcion}
                    onChange={(e) => handleItemChange(idx, 'descripcion', e.target.value)}
                    className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2.5 py-1.5 flex-1 text-white outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    required
                    value={row.cantidad}
                    onChange={(e) => handleItemChange(idx, 'cantidad', parseInt(e.target.value) || 1)}
                    className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2 py-1.5 w-16 text-center text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">Observaciones de la Recepción</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Estado de empaque, inspección visual..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 resize-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md"
            >
              Compilar Acta y Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
