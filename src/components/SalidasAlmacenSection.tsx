import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Trash2, Printer, Calendar, User, Package, Clock, FileText, CheckCircle, FileSpreadsheet, Download, Layers } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SalidaAlmacen, ItemSalida, ExportDestinoData } from '../types';
import { ConfirmModal } from './ConfirmModal';
import {
  generarPDFSalidaAlmacen,
  generarDOCXSalidaAlmacen,
  generarPDFListadoSalidas,
  generarDOCXListadoSalidas
} from '../utils/documentExporter';

interface SalidasAlmacenSectionProps {
  usuarioNombre: string;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onSolicitarDestino?: (titulo: string, callbackFn: (dest: ExportDestinoData) => void) => void;
}

export const SalidasAlmacenSection: React.FC<SalidasAlmacenSectionProps> = ({
  usuarioNombre,
  onShowToast,
  onSolicitarDestino
}) => {
  const [salidas, setSalidas] = useState<SalidaAlmacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  // Deletion modal state
  const [itemAEliminar, setItemAEliminar] = useState<{ id: string; items: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [tipoSalida, setTipoSalida] = useState<SalidaAlmacen['tipoSalida']>('Consumo Interno');
  const [categoriaBien, setCategoriaBien] = useState<SalidaAlmacen['categoriaBien']>('Material médico');
  
  // Multi-item product rows state
  const [itemsList, setItemsList] = useState<ItemSalida[]>([
    { items: '', descripcion: '', cantidad: 1, unidad: 'Cajas', categoriaBien: 'Material médico' }
  ]);

  const [personaRecibe, setPersonaRecibe] = useState('');
  const [personaEntrega, setPersonaEntrega] = useState(usuarioNombre || 'Almacén Central');
  const [departamentoSolicitante, setDepartamentoSolicitante] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'salidas_almacen'), orderBy('creadoEn', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: SalidaAlmacen[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<SalidaAlmacen, 'id'>)
        }));
        setSalidas(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to salidas_almacen:', error);
        handleFirestoreError(error, OperationType.GET, 'salidas_almacen');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAddItemRow = () => {
    setItemsList((prev) => [
      ...prev,
      { items: '', descripcion: '', cantidad: 1, unidad: 'Cajas', categoriaBien }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (itemsList.length <= 1) return;
    setItemsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemRowChange = (index: number, field: keyof ItemSalida, value: any) => {
    setItemsList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCreateSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that every product row has a name
    const validItems = itemsList.filter((it) => it.items.trim().length > 0);
    if (validItems.length === 0 || !personaRecibe.trim() || !departamentoSolicitante.trim()) {
      onShowToast('error', 'Campos Incompletos', 'Agrega al menos un producto con nombre válido y completa los responsables.');
      return;
    }

    const totalCantidad = validItems.reduce((acc, curr) => acc + (curr.cantidad > 0 ? curr.cantidad : 1), 0);
    const primarySummary = validItems.length === 1
      ? validItems[0].items.trim()
      : `${validItems[0].items.trim()} y ${validItems.length - 1} producto(s) más`;

    const primaryUnit = validItems.length === 1 ? validItems[0].unidad : 'ítems';
    const primaryDesc = validItems.map((it) => `${it.items} (${it.cantidad} ${it.unidad})`).join(', ');

    const now = new Date();
    const nuevaSalida: Omit<SalidaAlmacen, 'id'> = {
      fecha: now.toLocaleDateString('es-ES'),
      hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      tipoSalida,
      categoriaBien,
      items: primarySummary,
      descripcion: primaryDesc,
      cantidad: totalCantidad,
      unidad: primaryUnit,
      itemsList: validItems,
      personaRecibe: personaRecibe.trim(),
      personaEntrega: personaEntrega.trim() || usuarioNombre || 'Almacén Central',
      departamentoSolicitante: departamentoSolicitante.trim(),
      observaciones: observaciones.trim(),
      usuarioRegistro: usuarioNombre || 'Almacén Central',
      creadoEn: now.toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'salidas_almacen'), nuevaSalida);
      const salidaConId: SalidaAlmacen = { ...nuevaSalida, id: docRef.id };

      onShowToast('success', 'Salida Registrada', `Se registraron ${validItems.length} producto(s) en la salida.`);
      setShowModal(false);

      // Generar documentos en PDF y Word con lista completa
      if (onSolicitarDestino) {
        onSolicitarDestino(`Carta y Comprobante de Salida — ${salidaConId.items}`, async (destData) => {
          generarPDFSalidaAlmacen(salidaConId, destData);
          await generarDOCXSalidaAlmacen(salidaConId, destData);
          onShowToast('success', 'Documentos Generados', 'Se descargó el comprobante en PDF y la carta en Word (.docx).');
        });
      } else {
        generarPDFSalidaAlmacen(salidaConId);
        await generarDOCXSalidaAlmacen(salidaConId);
        onShowToast('success', 'Documentos Generados', 'Se descargó el comprobante en PDF y la carta en Word (.docx).');
      }

      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'salidas_almacen');
      onShowToast('error', 'Error al guardar', 'No se pudo guardar la salida.');
    }
  };

  const resetForm = () => {
    setItemsList([
      { items: '', descripcion: '', cantidad: 1, unidad: 'Cajas', categoriaBien: 'Material médico' }
    ]);
    setPersonaRecibe('');
    setDepartamentoSolicitante('');
    setObservaciones('');
  };

  const handleConfirmDelete = async () => {
    if (!itemAEliminar) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'salidas_almacen', itemAEliminar.id));
      onShowToast('success', 'Registro Eliminado', `Se eliminó el registro "${itemAEliminar.items}" de Firestore.`);
      setItemAEliminar(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `salidas_almacen/${itemAEliminar.id}`);
      onShowToast('error', 'Error al eliminar', 'No se pudo eliminar el registro.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredSalidas = salidas.filter((item) => {
    if (categoryFilter !== 'Todas' && item.categoriaBien !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchItem = item.items.toLowerCase().includes(q);
      const matchRecibe = item.personaRecibe.toLowerCase().includes(q);
      const matchDept = item.departamentoSolicitante.toLowerCase().includes(q);
      const matchDesc = item.descripcion.toLowerCase().includes(q);
      if (!matchItem && !matchRecibe && !matchDept && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 bg-gray-950 p-4 rounded-xl border border-gray-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            Registro de Salidas del Almacén Hospitalario
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Registro y trazabilidad de medicamentos, material médico, equipos y otros bienes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (onSolicitarDestino) {
                onSolicitarDestino('Exportar Salidas a PDF', (destData) => {
                  generarPDFListadoSalidas(filteredSalidas, destData);
                  onShowToast('success', 'PDF Generado', 'Se exportó el listado completo de salidas a PDF.');
                });
              } else {
                generarPDFListadoSalidas(filteredSalidas);
                onShowToast('success', 'PDF Generado', 'Se exportó el listado completo de salidas a PDF.');
              }
            }}
            className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow"
          >
            <Printer className="w-3.5 h-3.5" /> PDF Listado
          </button>
          <button
            onClick={async () => {
              if (onSolicitarDestino) {
                onSolicitarDestino('Exportar Salidas a Word (.docx)', async (destData) => {
                  await generarDOCXListadoSalidas(filteredSalidas, destData);
                  onShowToast('success', 'Word Generado', 'Se exportó el listado de salidas a Word (.docx).');
                });
              } else {
                await generarDOCXListadoSalidas(filteredSalidas);
                onShowToast('success', 'Word Generado', 'Se exportó el listado de salidas a Word (.docx).');
              }
            }}
            className="bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow"
          >
            <Download className="w-3.5 h-3.5" /> Word (.docx)
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Salida
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por bienes, persona que recibe o departamento..."
            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none focus:border-cyan-500"
          >
            <option value="Todas">Todas las categorías</option>
            <option value="Medicamentos">Medicamentos</option>
            <option value="Material médico">Material médico</option>
            <option value="Equipos">Equipos</option>
            <option value="Otros bienes">Otros bienes</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/60 custom-scrollbar">
        {loading ? (
          <div className="p-10 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            Cargando salidas en tiempo real desde Firestore...
          </div>
        ) : filteredSalidas.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-500 italic">
            No hay salidas registradas con estos criterios.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-900 text-gray-400 border-b border-gray-800 uppercase font-mono text-[10px]">
                <th className="p-3">Fecha / Hora</th>
                <th className="p-3">Tipo Salida</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Bienes / Ítems</th>
                <th className="p-3 text-center">Cantidad</th>
                <th className="p-3">Recibe / Depto</th>
                <th className="p-3">Entrega</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filteredSalidas.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="p-3 text-gray-400 whitespace-nowrap">
                    {item.fecha} <span className="text-[10px] text-gray-500">{item.hora}</span>
                  </td>
                  <td className="p-3">
                    <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {item.tipoSalida}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300 font-medium">{item.categoriaBien}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-white">{item.items}</p>
                      {item.itemsList && item.itemsList.length > 1 && (
                        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5" />
                          {item.itemsList.length} productos
                        </span>
                      )}
                    </div>
                    {item.itemsList && item.itemsList.length > 1 ? (
                      <div className="mt-1 space-y-0.5">
                        {item.itemsList.map((prod, pIdx) => (
                          <p key={pIdx} className="text-[10px] text-gray-400 flex items-center gap-1">
                            • <span className="text-gray-200 font-medium">{prod.items}</span>
                            <span className="text-gray-500">({prod.cantidad} {prod.unidad})</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 line-clamp-1">{item.descripcion}</p>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-emerald-400 font-mono">
                    {item.cantidad} {item.unidad}
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-white">{item.personaRecibe}</p>
                    <p className="text-[10px] text-cyan-400">{item.departamentoSolicitante}</p>
                  </td>
                  <td className="p-3 text-gray-400">{item.personaEntrega}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          if (onSolicitarDestino) {
                            onSolicitarDestino(`Exportar Salida - ${item.items}`, (destData) => {
                              generarPDFSalidaAlmacen(item, destData);
                              onShowToast('success', 'PDF Generado', 'Comprobante individual generado en PDF.');
                            });
                          } else {
                            generarPDFSalidaAlmacen(item);
                            onShowToast('success', 'PDF Generado', 'Comprobante individual generado en PDF.');
                          }
                        }}
                        className="bg-gray-800 hover:bg-cyan-900 border border-gray-700 text-cyan-400 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Exportar a PDF"
                      >
                        <Printer className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button
                        onClick={async () => {
                          if (onSolicitarDestino) {
                            onSolicitarDestino(`Exportar Word - ${item.items}`, async (destData) => {
                              await generarDOCXSalidaAlmacen(item, destData);
                              onShowToast('success', 'Word Generado', 'Comprobante individual generado en Word.');
                            });
                          } else {
                            await generarDOCXSalidaAlmacen(item);
                            onShowToast('success', 'Word Generado', 'Comprobante individual generado en Word.');
                          }
                        }}
                        className="bg-gray-800 hover:bg-blue-900 border border-gray-700 text-blue-400 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Exportar a Word (.docx)"
                      >
                        <Download className="w-3.5 h-3.5" /> Word
                      </button>
                      <button
                        onClick={() => {
                          if (item.id) {
                            setItemAEliminar({ id: item.id, items: item.items });
                          }
                        }}
                        className="bg-gray-800 hover:bg-red-950/60 text-gray-400 hover:text-red-400 border border-gray-700 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                        title="Eliminar registro de salida"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal New Salida */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-400" /> Registrar Salida del Almacén
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSalida} className="space-y-3.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Tipo de Salida *</label>
                  <select
                    value={tipoSalida}
                    onChange={(e) => setTipoSalida(e.target.value as any)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="Consumo Interno">Consumo Interno</option>
                    <option value="Transferencia">Transferencia entre áreas</option>
                    <option value="Préstamo">Préstamo institucional</option>
                    <option value="Urgencia">Urgencia / Guardias</option>
                    <option value="Bautizo / Donación">Bautizo / Donación</option>
                    <option value="Merma / Baja">Merma / Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Categoría del Bien *</label>
                  <select
                    value={categoriaBien}
                    onChange={(e) => setCategoriaBien(e.target.value as any)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="Material médico">Material médico</option>
                    <option value="Medicamentos">Medicamentos</option>
                    <option value="Equipos">Equipos</option>
                    <option value="Otros bienes">Otros bienes</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Product Rows List */}
              <div className="space-y-2 border border-gray-800 rounded-2xl p-3 bg-gray-950/50">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Productos / Ítems de la Salida ({itemsList.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Producto
                  </button>
                </div>

                {itemsList.map((row, idx) => (
                  <div key={idx} className="bg-gray-900 border border-gray-800 p-3 rounded-xl space-y-2 relative group">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-950 px-2 py-0.5 rounded-full border border-gray-800">
                        #{idx + 1}
                      </span>
                      {itemsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Producto / Bien *</label>
                        <input
                          type="text"
                          required
                          value={row.items}
                          onChange={(e) => handleItemRowChange(idx, 'items', e.target.value)}
                          placeholder="Ej: Gasas, Jeringas 5ml, Suero 500ml"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Descripción / Especificaciones</label>
                        <input
                          type="text"
                          value={row.descripcion || ''}
                          onChange={(e) => handleItemRowChange(idx, 'descripcion', e.target.value)}
                          placeholder="Ej: Marca, Lote, Tamaño"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Cantidad *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.cantidad}
                          onChange={(e) => handleItemRowChange(idx, 'cantidad', parseInt(e.target.value) || 1)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Unidad de Medida *</label>
                        <input
                          type="text"
                          required
                          value={row.unidad}
                          onChange={(e) => handleItemRowChange(idx, 'unidad', e.target.value)}
                          placeholder="Ej: Cajas, Unidades, Frascos"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Persona que Recibe *</label>
                  <input
                    type="text"
                    required
                    value={personaRecibe}
                    onChange={(e) => setPersonaRecibe(e.target.value)}
                    placeholder="Nombre completo y cargo"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Persona que Entrega *</label>
                  <input
                    type="text"
                    required
                    value={personaEntrega}
                    onChange={(e) => setPersonaEntrega(e.target.value)}
                    placeholder="Responsable de almacén"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Departamento Solicitante *</label>
                <input
                  type="text"
                  required
                  value={departamentoSolicitante}
                  onChange={(e) => setDepartamentoSolicitante(e.target.value)}
                  placeholder="Ej: Urgencias, Quirófano, Mantenimiento"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Observaciones / Notas</label>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Guardar Salida en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={!!itemAEliminar}
        title="Eliminar Registro de Salida"
        message="¿Estás seguro de que deseas eliminar permanentemente esta salida de almacén?"
        itemName={itemAEliminar?.items}
        onConfirm={handleConfirmDelete}
        onClose={() => setItemAEliminar(null)}
        loading={deleting}
      />
    </div>
  );
};
