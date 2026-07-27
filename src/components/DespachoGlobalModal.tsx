import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Search,
  Filter,
  FileText,
  Printer,
  Trash2,
  CheckCircle,
  Clock,
  Package,
  Calendar,
  User,
  Building,
  Check,
  AlertCircle,
  Download
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { DespachoGlobal, ItemDespacho, ExportDestinoData } from '../types';
import { ConfirmModal } from './ConfirmModal';
import {
  generarPDFDespachoGlobal,
  generarDOCXDespachoGlobal,
  generarPDFHistorialDespachos,
  generarDOCXHistorialDespachos
} from '../utils/documentExporter';

interface DespachoGlobalModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioNombre: string;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onSolicitarDestino: (titulo: string, callbackFn: (dest: ExportDestinoData) => void) => void;
}

export const DespachoGlobalModal: React.FC<DespachoGlobalModalProps> = ({
  isOpen,
  onClose,
  usuarioNombre,
  onShowToast,
  onSolicitarDestino,
}) => {
  const [despachos, setDespachos] = useState<DespachoGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'todos' | 'pendiente' | 'completado'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  // Deletion modal state
  const [despachoAEliminar, setDespachoAEliminar] = useState<{ id: string; num: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states for new despacho
  const [numeroDespacho, setNumeroDespacho] = useState('');
  const [paciente, setPaciente] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [responsable, setResponsable] = useState(usuarioNombre || 'Almacén Central');
  const [observaciones, setObservaciones] = useState('');
  const [medicamentosItems, setMedicamentosItems] = useState<ItemDespacho[]>([
    { id: '1', nombre: '', cantidad: 1, unidad: 'Ampollas', precioUnitario: 0 }
  ]);

  // Firestore real-time listener
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const q = query(collection(db, 'despachos_globales'), orderBy('creadoEn', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: DespachoGlobal[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<DespachoGlobal, 'id'>)
        }));
        setDespachos(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to despachos:', error);
        handleFirestoreError(error, OperationType.GET, 'despachos_globales');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter logic
  const filteredDespachos = despachos.filter((item) => {
    // Status tab filter
    if (activeTab === 'pendiente' && item.estado !== 'Pendiente') return false;
    if (activeTab === 'completado' && item.estado !== 'Completado') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPac = item.paciente.toLowerCase().includes(q);
      const matchNum = item.numeroDespacho.toLowerCase().includes(q);
      const matchDept = item.departamento.toLowerCase().includes(q);
      const matchResp = item.responsable.toLowerCase().includes(q);
      if (!matchPac && !matchNum && !matchDept && !matchResp) return false;
    }

    // Date filter
    if (dateFilter && item.fecha !== dateFilter) return false;

    return true;
  });

  const handleAddItemRow = () => {
    setMedicamentosItems([
      ...medicamentosItems,
      { id: Date.now().toString(), nombre: '', cantidad: 1, unidad: 'u.', precioUnitario: 0 }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (medicamentosItems.length <= 1) return;
    setMedicamentosItems(medicamentosItems.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ItemDespacho, value: any) => {
    setMedicamentosItems(
      medicamentosItems.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const calcularTotalForm = () => {
    return medicamentosItems.reduce((acc, item) => {
      const price = item.precioUnitario || 0;
      return acc + item.cantidad * price;
    }, 0);
  };

  const handleCreateDespacho = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente.trim() || !departamento.trim()) {
      onShowToast('error', 'Campos requeridos', 'Ingresa el paciente y departamento.');
      return;
    }

    const validMedications = medicamentosItems.filter((i) => i.nombre.trim() !== '');
    if (validMedications.length === 0) {
      onShowToast('error', 'Medicamentos vacíos', 'Agrega al menos un medicamento válido.');
      return;
    }

    const autoNum = numeroDespacho.trim() || `DSP-${Date.now().toString().slice(-5)}`;
    const now = new Date();
    const fecha = now.toLocaleDateString('es-ES');
    const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const newDespacho: Omit<DespachoGlobal, 'id'> = {
      numeroDespacho: autoNum,
      paciente: paciente.trim(),
      departamento: departamento.trim(),
      fecha,
      hora,
      estado: 'Pendiente',
      responsable: responsable.trim() || usuarioNombre || 'Almacén Central',
      medicamentos: validMedications,
      totales: calcularTotalForm(),
      observaciones: observaciones.trim(),
      creadoEn: now.toISOString()
    };

    try {
      await addDoc(collection(db, 'despachos_globales'), newDespacho);
      onShowToast('success', 'Despacho Creado', `Se registró el despacho ${autoNum} en Firestore.`);
      setShowNewModal(false);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'despachos_globales');
      onShowToast('error', 'Error al guardar', 'No se pudo crear el despacho.');
    }
  };

  const resetForm = () => {
    setNumeroDespacho('');
    setPaciente('');
    setDepartamento('');
    setObservaciones('');
    setMedicamentosItems([{ id: '1', nombre: '', cantidad: 1, unidad: 'Ampollas', precioUnitario: 0 }]);
  };

  const handleToggleEstado = async (item: DespachoGlobal) => {
    if (!item.id) return;
    const nuevoEstado = item.estado === 'Pendiente' ? 'Completado' : 'Pendiente';
    try {
      await updateDoc(doc(db, 'despachos_globales', item.id), { estado: nuevoEstado });
      onShowToast('info', 'Estado Actualizado', `El despacho ${item.numeroDespacho} pasó a ${nuevoEstado}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `despachos_globales/${item.id}`);
    }
  };

  const handleConfirmDeleteDespacho = async () => {
    if (!despachoAEliminar) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'despachos_globales', despachoAEliminar.id));
      onShowToast('success', 'Eliminado', `El despacho ${despachoAEliminar.num} fue eliminado de Firestore.`);
      setDespachoAEliminar(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `despachos_globales/${despachoAEliminar.id}`);
      onShowToast('error', 'Error', 'No se pudo eliminar el despacho.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportPDF = (item: DespachoGlobal) => {
    onSolicitarDestino(`Generar PDF — Despacho ${item.numeroDespacho}`, (destData) => {
      generarPDFDespachoGlobal(item, destData);
      onShowToast('success', 'PDF Generado', `Se descargó el comprobante del despacho ${item.numeroDespacho}.`);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-5xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Módulo de Despacho Global
                <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-mono">
                  {despachos.length} registros
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Control completo de despachos pendientes, entregados e impresión de comprobantes en PDF
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                onSolicitarDestino('Exportar Todo el Historial a PDF', (destData) => {
                  generarPDFHistorialDespachos(filteredDespachos, destData);
                  onShowToast('success', 'PDF Generado', 'Se exportó todo el historial de despachos a PDF.');
                });
              }}
              className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow"
              title="Exportar todo el historial a PDF"
            >
              <Printer className="w-3.5 h-3.5" /> PDF Historial
            </button>
            <button
              onClick={async () => {
                onSolicitarDestino('Exportar Todo el Historial a Word (.docx)', async (destData) => {
                  await generarDOCXHistorialDespachos(filteredDespachos, destData);
                  onShowToast('success', 'Word Generado', 'Se exportó todo el historial de despachos a Word (.docx).');
                });
              }}
              className="bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow"
              title="Exportar todo el historial a Word (.docx)"
            >
              <Download className="w-3.5 h-3.5" /> Word Historial
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Nuevo Despacho
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por paciente, número de despacho o departamento..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-cyan-500 outline-none"
            />
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 focus:border-cyan-500 outline-none"
            />
          </div>

          <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'todos' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setActiveTab('pendiente')}
              className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'pendiente' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setActiveTab('completado')}
              className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'completado' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Completados
            </button>
          </div>
        </div>

        {/* Table of Despachos */}
        <div className="overflow-y-auto flex-1 rounded-xl border border-gray-800 bg-gray-950/60 custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs">Sincronizando despachos en tiempo real con Firestore...</p>
            </div>
          ) : filteredDespachos.length === 0 ? (
            <div className="p-12 text-center text-gray-500 italic flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-gray-600" />
              <p className="text-xs">No se encontraron despachos registrados con estos criterios.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 border-b border-gray-800 uppercase font-mono text-[10px] sticky top-0 z-10">
                  <th className="p-3">No. Despacho</th>
                  <th className="p-3">Fecha / Hora</th>
                  <th className="p-3">Paciente</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3 text-center">Medicamentos</th>
                  <th className="p-3 text-center">Total ($)</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredDespachos.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-400">{item.numeroDespacho}</td>
                    <td className="p-3 text-gray-400">
                      {item.fecha} <span className="text-[10px] text-gray-500">{item.hora}</span>
                    </td>
                    <td className="p-3 font-bold text-white">{item.paciente}</td>
                    <td className="p-3 text-gray-300">{item.departamento}</td>
                    <td className="p-3 text-center">
                      <span className="bg-gray-800 text-gray-300 font-mono text-[11px] px-2 py-0.5 rounded-full border border-gray-700">
                        {item.medicamentos.length} ítem(s)
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-amber-400 font-mono">
                      ${item.totales ? item.totales.toFixed(2) : '0.00'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleEstado(item)}
                        title="Haz clic para cambiar estado"
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer ${
                          item.estado === 'Completado'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                      >
                        {item.estado === 'Completado' ? (
                          <>
                            <CheckCircle className="w-3 h-3" /> Completado
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> Pendiente
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleExportPDF(item)}
                          className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                          title="Generar e imprimir PDF"
                        >
                          <Printer className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                          onClick={() => {
                            onSolicitarDestino(`Generar Word — Despacho ${item.numeroDespacho}`, async (destData) => {
                              await generarDOCXDespachoGlobal(item, destData);
                              onShowToast('success', 'Word Generado', `Se descargó el documento de Word para el despacho ${item.numeroDespacho}.`);
                            });
                          }}
                          className="bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                          title="Generar documento de Word (.docx)"
                        >
                          <Download className="w-3.5 h-3.5" /> Word
                        </button>
                        <button
                          onClick={() => {
                            if (item.id) {
                              setDespachoAEliminar({ id: item.id, num: item.numeroDespacho });
                            }
                          }}
                          className="bg-gray-800 hover:bg-red-950/60 text-gray-400 hover:text-red-400 border border-gray-700 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                          title="Eliminar despacho"
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

        {/* Modal footer summary */}
        <div className="border-t border-gray-800 pt-3 mt-3 flex justify-between items-center text-xs text-gray-400 font-mono">
          <span>Mostrando {filteredDespachos.length} de {despachos.length} despachos</span>
          <span>Sincronizado con Firestore en tiempo real</span>
        </div>
      </div>

      {/* Nested Modal: Create New Despacho */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Registrar Nuevo Despacho de Medicamentos
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDespacho} className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">No. Despacho (Opcional)</label>
                  <input
                    type="text"
                    value={numeroDespacho}
                    onChange={(e) => setNumeroDespacho(e.target.value)}
                    placeholder="Auto si está vacío"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Paciente *</label>
                  <input
                    type="text"
                    required
                    value={paciente}
                    onChange={(e) => setPaciente(e.target.value)}
                    placeholder="Nombre del paciente"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Departamento / Área *</label>
                  <input
                    type="text"
                    required
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    placeholder="Ej: Pediatría / UCI"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Dynamic items table */}
              <div className="border-t border-gray-800 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-white">Medicamentos e Insumos</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-gray-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Fila
                  </button>
                </div>

                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                  {medicamentosItems.map((row, idx) => (
                    <div key={row.id} className="flex gap-2 items-center bg-gray-950 p-2 rounded-xl border border-gray-800">
                      <span className="text-xs text-gray-500 font-mono w-5 text-center">{idx + 1}.</span>
                      <input
                        type="text"
                        required
                        placeholder="Nombre medicamento / insumo"
                        value={row.nombre}
                        onChange={(e) => handleItemChange(row.id, 'nombre', e.target.value)}
                        className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2.5 py-1.5 flex-1 text-white outline-none focus:border-cyan-500"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.cantidad}
                        onChange={(e) => handleItemChange(row.id, 'cantidad', parseInt(e.target.value) || 1)}
                        className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2 py-1.5 w-16 text-center text-white outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Unidad (Ampollas, Cajas)"
                        value={row.unidad || ''}
                        onChange={(e) => handleItemChange(row.id, 'unidad', e.target.value)}
                        className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2 py-1.5 w-28 text-white outline-none"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Precio U."
                        value={row.precioUnitario || ''}
                        onChange={(e) => handleItemChange(row.id, 'precioUnitario', parseFloat(e.target.value) || 0)}
                        className="bg-gray-900 border border-gray-800 text-xs rounded-lg px-2 py-1.5 w-24 text-right text-amber-400 font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(row.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs font-bold text-gray-300 mt-2 bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                  <span>TOTAL ESTIMADO:</span>
                  <span className="text-amber-400 font-mono text-sm">${calcularTotalForm().toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Detalles de la prescripción o indicaciones..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md"
                >
                  Guardar Despacho en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={!!despachoAEliminar}
        title="Eliminar Despacho Global"
        message="¿Estás seguro de que deseas eliminar este despacho global de la base de datos?"
        itemName={despachoAEliminar ? `Despacho #${despachoAEliminar.num}` : undefined}
        onConfirm={handleConfirmDeleteDespacho}
        onClose={() => setDespachoAEliminar(null)}
        loading={deleting}
      />
    </div>
  );
};
