import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, X, Plus, Trash2, FileCheck, Printer, Download, Search, Calendar, FileText, Building, CheckCircle, Package } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ItemEntrada, EntradaMercancia, ExportDestinoData } from '../types';
import { generarPDFEntradaMercancia, generarDOCXEntradaMercancia, generarPDFListadoEntradas, generarDOCXListadoEntradas } from '../utils/documentExporter';

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
  const [activeTab, setActiveTab] = useState<'registrar' | 'historial'>('registrar');
  const [proveedor, setProveedor] = useState('');
  const [documento, setDocumento] = useState('');
  const [destino, setDestino] = useState('Almacén Central');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<ItemEntrada[]>([
    { producto: '', descripcion: '', cantidad: 1 }
  ]);

  // Historial state
  const [entradas, setEntradas] = useState<EntradaMercancia[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setLoadingHistorial(true);
    const q = query(collection(db, 'entradas_mercancia'), orderBy('creadoEn', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: EntradaMercancia[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EntradaMercancia, 'id'>)
        }));
        setEntradas(data);
        setLoadingHistorial(false);
      },
      (error) => {
        console.error('Error al escuchar entradas_mercancia:', error);
        handleFirestoreError(error, OperationType.GET, 'entradas_mercancia');
        setLoadingHistorial(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

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

      // Solicitar destinatario para emitir la Carta Timbrada Oficial
      onSolicitarDestino(`Carta Timbrada de Recepción — ${proveedor}`, (destData) => {
        generarPDFEntradaMercancia(entradaConId, destData);
        onShowToast('info', 'Carta Timbrada Emitida', 'Se generó la carta timbrada oficial en PDF.');
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

  const entradasFiltradas = entradas.filter((ent) => {
    const term = filtroTexto.toLowerCase();
    return (
      ent.proveedor.toLowerCase().includes(term) ||
      ent.documento.toLowerCase().includes(term) ||
      ent.destino.toLowerCase().includes(term) ||
      ent.items.some((it) => it.producto.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-4xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Módulo de Entrada de Mercancía
                <span className="text-[11px] font-normal bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                  Carta Timbrada Oficial
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Registro de insumos con generación de documento tipo carta timbrada institucional
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-gray-800 pb-3 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('registrar')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'registrar'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white bg-gray-950 border border-gray-800'
            }`}
          >
            <Plus className="w-4 h-4" /> Registrar Nueva Entrada
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'historial'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white bg-gray-950 border border-gray-800'
            }`}
          >
            <Calendar className="w-4 h-4" /> Historial de Entradas ({entradas.length})
          </button>
        </div>

        {activeTab === 'registrar' ? (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {/* Timbrado Info Banner */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-gray-900 border border-emerald-800/40 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-emerald-200">Formato Carta Timbrada:</span>
                  <span className="text-gray-300 ml-1">
                    Hospital Infantil Dr. José Manuel Rodríguez Jiménez | SRS Metropolitano
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                Firma: Encargado de Almacén y Suministros
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Proveedor / Suplidor *</label>
                <input
                  type="text"
                  required
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Ej: Promese/Cal, Laboratorios Dr. Collado..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">No. Conduce / Factura *</label>
                <input
                  type="text"
                  required
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  placeholder="Ej: CMD-9482 / FAC-00129"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Destinado a Sub-Almacén / Área *</label>
                <input
                  type="text"
                  required
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  placeholder="Ej: Almacén Central, Farmacia..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-400" /> Detalle de Insumos / Productos Recibidos
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-gray-700 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Ítem
                </button>
              </div>

              <div className="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
                {items.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                    <span className="text-xs text-gray-500 font-mono w-5 text-center">{idx + 1}.</span>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del Producto / Insumo (ej: Gel de sonografía)"
                      value={row.producto}
                      onChange={(e) => handleItemChange(idx, 'producto', e.target.value)}
                      className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2.5 py-1.5 flex-1 text-white outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Descripción / Marca / Lote (ej: Galones, Lote #849)"
                      value={row.descripcion}
                      onChange={(e) => handleItemChange(idx, 'descripcion', e.target.value)}
                      className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2.5 py-1.5 flex-1 text-white outline-none focus:border-emerald-500"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.cantidad}
                        onChange={(e) => handleItemChange(idx, 'cantidad', parseInt(e.target.value) || 1)}
                        className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2 py-1.5 w-16 text-center text-white outline-none focus:border-emerald-500 font-bold"
                      />
                      <span className="text-[11px] text-gray-400 font-mono">u.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Observaciones de la Recepción (Opcional)</label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Indique novedades técnicas, condiciones de embalaje o empaque..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 resize-none"
              ></textarea>
            </div>

            <div className="flex justify-between items-center border-t border-gray-800 pt-3">
              <span className="text-[11px] text-gray-400 font-mono">
                Total ítems: {items.reduce((acc, curr) => acc + (curr.cantidad || 0), 0)} unidades
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg transition-all"
                >
                  <FileCheck className="w-4 h-4" /> Generar Carta Timbrada y Guardar
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden space-y-3">
            {/* Search and export toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por proveedor, no. conduce o producto..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onSolicitarDestino('Listado General de Entradas', (dest) => {
                      generarPDFListadoEntradas(entradasFiltradas, dest);
                      onShowToast('info', 'Listado PDF', 'Se descargó el reporte consolidado de entradas.');
                    });
                  }}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" /> Reporte PDF
                </button>
                <button
                  onClick={() => {
                    onSolicitarDestino('Listado General de Entradas Word', async (dest) => {
                      await generarDOCXListadoEntradas(entradasFiltradas, dest);
                      onShowToast('info', 'Listado Word', 'Se descargó el reporte consolidado en Word.');
                    });
                  }}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" /> Reporte Word
                </button>
              </div>
            </div>

            {/* List of past entradas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {loadingHistorial ? (
                <div className="py-12 text-center text-xs text-gray-400">Cargando historial de entradas...</div>
              ) : entradasFiltradas.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500 border border-dashed border-gray-800 rounded-2xl">
                  No hay entradas de mercancía registradas que coincidan con la búsqueda.
                </div>
              ) : (
                entradasFiltradas.map((entrada) => (
                  <div
                    key={entrada.id}
                    className="bg-gray-950 border border-gray-800 hover:border-gray-700 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{entrada.proveedor}</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                          Doc: {entrada.documento}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {entrada.fecha} {entrada.hora}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-gray-500" />
                        <span>Destino: <strong className="text-gray-200">{entrada.destino}</strong></span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {entrada.items.map((it) => `${it.producto} (${it.cantidad})`).join(' • ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          onSolicitarDestino(`Carta Timbrada — ${entrada.proveedor}`, (destData) => {
                            generarPDFEntradaMercancia(entrada, destData);
                            onShowToast('success', 'Carta Timbrada Generada', 'Se descargó la carta oficial en PDF.');
                          });
                        }}
                        className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Descargar Carta Timbrada en PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" /> Carta PDF
                      </button>

                      <button
                        onClick={() => {
                          onSolicitarDestino(`Carta Word — ${entrada.proveedor}`, async (destData) => {
                            await generarDOCXEntradaMercancia(entrada, destData);
                            onShowToast('success', 'Carta Word Generada', 'Se descargó la carta oficial en Word.');
                          });
                        }}
                        className="bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Descargar Carta en Word (.docx)"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" /> Word (.docx)
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

