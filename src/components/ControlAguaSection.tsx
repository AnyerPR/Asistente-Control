import React, { useState, useEffect } from 'react';
import { Droplet, Package, Droplets, History, Plus, FileCheck, Send, Download, Settings2, Trash2, Printer } from 'lucide-react';
import { collection, onSnapshot, setDoc, doc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { DepartamentoAgua, HistorialAgua, ExportDestinoData } from '../types';
import { ConfirmModal } from './ConfirmModal';
import {
  generarPDFRegistroAgua,
  generarDOCXRegistroAgua,
  generarPDFHistorialAgua,
  generarDOCXHistorialAgua
} from '../utils/documentExporter';

interface ControlAguaSectionProps {
  usuarioNombre: string;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onSolicitarDestino: (titulo: string, callbackFn: (dest: ExportDestinoData) => void) => void;
}

export const ControlAguaSection: React.FC<ControlAguaSectionProps> = ({
  usuarioNombre,
  onShowToast,
  onSolicitarDestino,
}) => {
  const [departamentos, setDepartamentos] = useState<DepartamentoAgua[]>([]);
  const [historial, setHistorial] = useState<HistorialAgua[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'faldos' | 'botellones' | 'historial'>('faldos');
  const [selectedDeptIndex, setSelectedDeptIndex] = useState<number | null>(0);

  // Modals state
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartamentoAgua | null>(null);

  // Deletion modal state
  const [deptAEliminar, setDeptAEliminar] = useState<DepartamentoAgua | null>(null);
  const [historialAEliminar, setHistorialAEliminar] = useState<{ id: string; idConsecutivo: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Delivery form state
  const [entregaCantidad, setEntregaCantidad] = useState(1);
  const [entregaResponsable, setEntregaResponsable] = useState(usuarioNombre || 'Almacén Central');
  const [entregaReceptor, setEntregaReceptor] = useState('');

  // New department form state
  const [newDeptNombre, setNewDeptNombre] = useState('');
  const [newFaldosHab, setNewFaldosHab] = useState(40);
  const [newFaldosFrec, setNewFaldosFrec] = useState<'Semanal' | 'Quincenal' | 'Mensual'>('Semanal');
  const [newBotellonesHab, setNewBotellonesHab] = useState(50);
  const [newBotellonesFrec, setNewBotellonesFrec] = useState<'Semanal' | 'Quincenal' | 'Mensual'>('Semanal');

  // Firestore real-time listeners for departamentos and historial
  useEffect(() => {
    setLoading(true);

    // Initial seed if departamentos collection is empty
    const unsubDept = onSnapshot(collection(db, 'departamentos'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default hospital areas
        const initialAreas: DepartamentoAgua[] = [
          {
            id: 'dept_uci',
            nombre: 'Área de UCI',
            faldos: { historico: 36, habilitado: 40, entregado: 0, frecuencia: 'Semanal' },
            botellones: { historico: 42, habilitado: 50, entregado: 0, frecuencia: 'Semanal' }
          },
          {
            id: 'dept_lab',
            nombre: 'Laboratorio Clínico',
            faldos: { historico: 24, habilitado: 28, entregado: 0, frecuencia: 'Quincenal' },
            botellones: { historico: 30, habilitado: 35, entregado: 0, frecuencia: 'Quincenal' }
          },
          {
            id: 'dept_may',
            nombre: 'Mayordomía General',
            faldos: { historico: 60, habilitado: 65, entregado: 0, frecuencia: 'Semanal' },
            botellones: { historico: 72, habilitado: 80, entregado: 0, frecuencia: 'Semanal' }
          },
          {
            id: 'dept_emerg',
            nombre: 'Emergencia Pediátrica',
            faldos: { historico: 44, habilitado: 50, entregado: 0, frecuencia: 'Semanal' },
            botellones: { historico: 54, habilitado: 60, entregado: 0, frecuencia: 'Semanal' }
          }
        ];
        initialAreas.forEach((area) => {
          setDoc(doc(db, 'departamentos', area.id!), area);
        });
      } else {
        const data: DepartamentoAgua[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<DepartamentoAgua, 'id'>)
        }));
        setDepartamentos(data);
      }
      setLoading(false);
    });

    const qHist = query(collection(db, 'historial_agua'), orderBy('creadoEn', 'desc'));
    const unsubHist = onSnapshot(qHist, (snapshot) => {
      const data: HistorialAgua[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<HistorialAgua, 'id'>)
      }));
      setHistorial(data);
    });

    return () => {
      unsubDept();
      unsubHist();
    };
  }, []);

  const calcularCuotaTexto = (habilitado: number, frecuencia: string) => {
    const sufijo = frecuencia === 'Semanal' ? '/ sem' : frecuencia === 'Quincenal' ? '/ quin' : '/ mes';
    return `${habilitado} u. ${sufijo}`;
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptNombre.trim()) return;

    const newId = `dept_${Date.now()}`;
    const newDept: DepartamentoAgua = {
      id: newId,
      nombre: newDeptNombre.trim(),
      faldos: { historico: 0, habilitado: newFaldosHab, entregado: 0, frecuencia: newFaldosFrec },
      botellones: { historico: 0, habilitado: newBotellonesHab, entregado: 0, frecuencia: newBotellonesFrec },
      actualizadoEn: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'departamentos', newId), newDept);
      onShowToast('success', 'Área Agregada', `Se creó el departamento ${newDept.nombre}.`);
      setShowAddDeptModal(false);
      setNewDeptNombre('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `departamentos/${newId}`);
    }
  };

  const handleOpenEdit = (dept: DepartamentoAgua) => {
    setEditingDept({ ...dept });
    setShowEditDeptModal(true);
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editingDept.id) return;

    try {
      await setDoc(doc(db, 'departamentos', editingDept.id), {
        ...editingDept,
        actualizadoEn: new Date().toISOString()
      });
      onShowToast('info', 'Área Actualizada', `Se guardaron las cuotas para ${editingDept.nombre}.`);
      setShowEditDeptModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `departamentos/${editingDept.id}`);
    }
  };

  const handleEntregaParcial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDeptIndex === null || !departamentos[selectedDeptIndex]) return;

    const dept = departamentos[selectedDeptIndex];
    const tipo = activeTab === 'faldos' ? 'faldos' : 'botellones';
    const inv = dept[tipo];
    const pend = Math.max(0, inv.habilitado - inv.entregado);

    if (entregaCantidad <= 0 || entregaCantidad > pend) {
      onShowToast('error', 'Cantidad Inválida', `Ingresa un valor entre 1 y ${pend}.`);
      return;
    }

    const nuevoEntregado = inv.entregado + entregaCantidad;
    const nuevoPendiente = Math.max(0, inv.habilitado - nuevoEntregado);

    const now = new Date();
    const noDoc = historial.length + 1;
    const productoLabel = tipo === 'faldos' ? 'Faldos de Agua' : 'Botellones de Agua';

    const nuevoHistorial: Omit<HistorialAgua, 'id'> = {
      idConsecutivo: noDoc,
      fecha: now.toLocaleDateString('es-ES'),
      hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      departamento: dept.nombre,
      producto: productoLabel,
      cantidad: entregaCantidad,
      habilitado: inv.habilitado,
      frecuencia: inv.frecuencia,
      cuota: calcularCuotaTexto(inv.habilitado, inv.frecuencia),
      pendiente: nuevoPendiente,
      responsable: entregaResponsable || usuarioNombre || 'Almacén Central',
      receptor: entregaReceptor || 'Área Receptora',
      creadoEn: now.toISOString()
    };

    try {
      // Update department delivered amount in Firestore
      const updatedDept = {
        ...dept,
        [tipo]: {
          ...inv,
          entregado: nuevoEntregado
        }
      };
      await setDoc(doc(db, 'departamentos', dept.id!), updatedDept);
      await addDoc(collection(db, 'historial_agua'), nuevoHistorial);

      onShowToast('success', 'Entrega Confirmada', `Se entregaron ${entregaCantidad} unidades a ${dept.nombre}.`);
      setShowEntregaModal(false);
      setEntregaCantidad(1);
      setEntregaReceptor('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'historial_agua');
    }
  };

  const handleConfirmDeleteDept = async () => {
    if (!deptAEliminar || !deptAEliminar.id) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'departamentos', deptAEliminar.id));
      onShowToast('success', 'Área Eliminada', `Se eliminó el departamento ${deptAEliminar.nombre} de Firestore.`);
      setDeptAEliminar(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `departamentos/${deptAEliminar.id}`);
      onShowToast('error', 'Error', 'No se pudo eliminar el departamento.');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDeleteHistorial = async () => {
    if (!historialAEliminar) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'historial_agua', historialAEliminar.id));
      onShowToast('success', 'Eliminado', `Registro #${historialAEliminar.idConsecutivo} eliminado de Firestore.`);
      setHistorialAEliminar(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `historial_agua/${historialAEliminar.id}`);
      onShowToast('error', 'Error', 'No se pudo eliminar el registro.');
    } finally {
      setDeleting(false);
    }
  };

  const selectedDept = selectedDeptIndex !== null ? departamentos[selectedDeptIndex] : null;

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Droplet className="text-cyan-400 w-5 h-5" />
            Monitoreo e Inventario de Agua Purificada
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Control independiente de Faldos y Botellones por departamento con cuota automática</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeTab === 'historial' && (
            <>
              <button
                onClick={() => {
                  onSolicitarDestino('Exportar Historial de Agua a PDF', (destData) => {
                    generarPDFHistorialAgua(historial, destData);
                    onShowToast('success', 'PDF Generado', 'Se exportó el historial de entregas de agua a PDF.');
                  });
                }}
                className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> PDF Historial
              </button>
              <button
                onClick={async () => {
                  onSolicitarDestino('Exportar Historial de Agua a Word (.docx)', async (destData) => {
                    await generarDOCXHistorialAgua(historial, destData);
                    onShowToast('success', 'Word Generado', 'Se exportó el historial de entregas de agua a Word (.docx).');
                  });
                }}
                className="bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" /> Word Historial
              </button>
            </>
          )}
          <button
            onClick={() => setShowAddDeptModal(true)}
            className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Agregar Área
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2 font-semibold text-xs">
        <button
          onClick={() => { setActiveTab('faldos'); setSelectedDeptIndex(0); }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'faldos' ? 'bg-cyan-600 text-white shadow' : 'bg-gray-950 text-gray-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> Faldos de Agua
        </button>
        <button
          onClick={() => { setActiveTab('botellones'); setSelectedDeptIndex(0); }}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'botellones' ? 'bg-blue-600 text-white shadow' : 'bg-gray-950 text-gray-400 hover:text-white'
          }`}
        >
          <Droplets className="w-4 h-4" /> Botellones
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'historial' ? 'bg-purple-600 text-white shadow' : 'bg-gray-950 text-gray-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" /> Historial de Entregas
        </button>
      </div>

      {/* Active Tab Panel */}
      {activeTab !== 'historial' ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/60 custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 border-b border-gray-800 uppercase font-mono text-[10px]">
                  <th className="p-3">Departamento</th>
                  <th className="p-3 text-center">Cons. Histórico</th>
                  <th className="p-3 text-center">Habilitado</th>
                  <th className="p-3 text-center">Frecuencia</th>
                  <th className="p-3 text-center">Cuota Asignada</th>
                  <th className="p-3 text-center">Entregado</th>
                  <th className="p-3 text-center">Pendiente</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {departamentos.map((dept, idx) => {
                  const inv = activeTab === 'faldos' ? dept.faldos : dept.botellones;
                  const pend = Math.max(0, inv.habilitado - inv.entregado);
                  const isSelected = selectedDeptIndex === idx;

                  return (
                    <tr
                      key={dept.id || idx}
                      onClick={() => setSelectedDeptIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-cyan-950/40 border-l-4 border-cyan-500' : 'hover:bg-gray-800/40'
                      }`}
                    >
                      <td className="p-3 font-bold text-white">{dept.nombre}</td>
                      <td className="p-3 text-center text-gray-400">{inv.historico || 0}</td>
                      <td className="p-3 text-center text-cyan-400 font-bold">{inv.habilitado}</td>
                      <td className="p-3 text-center">
                        <span className="bg-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded-full border border-gray-700">
                          {inv.frecuencia}
                        </span>
                      </td>
                      <td className="p-3 text-center text-amber-400 font-mono">
                        {calcularCuotaTexto(inv.habilitado, inv.frecuencia)}
                      </td>
                      <td className="p-3 text-center text-amber-400 font-bold">{inv.entregado}</td>
                      <td className={`p-3 text-center font-bold ${pend > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {pend}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(dept);
                            }}
                            className="bg-gray-800 hover:bg-cyan-700 text-gray-300 hover:text-white px-2 py-1 rounded-lg text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer border border-gray-700"
                            title="Editar cuota"
                          >
                            <Settings2 className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeptAEliminar(dept);
                            }}
                            className="bg-gray-800 hover:bg-red-950/60 text-gray-400 hover:text-red-400 border border-gray-700 p-1 rounded-lg transition-all cursor-pointer"
                            title="Eliminar departamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detailed area panel */}
          {selectedDept && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2 border-b border-gray-800 pb-2">
                <span className="text-xs font-bold text-cyan-400 font-mono tracking-wide">
                  {selectedDept.nombre.toUpperCase()} — PENDIENTE:{' '}
                  {Math.max(
                    0,
                    (activeTab === 'faldos' ? selectedDept.faldos : selectedDept.botellones).habilitado -
                      (activeTab === 'faldos' ? selectedDept.faldos : selectedDept.botellones).entregado
                  )}{' '}
                  UNIDADES
                </span>
                <button
                  onClick={() => setShowEntregaModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Registrar Entrega Parcial
                </button>
              </div>

              {/* Progress Bar */}
              {(() => {
                const inv = activeTab === 'faldos' ? selectedDept.faldos : selectedDept.botellones;
                const pct = inv.habilitado > 0 ? Math.min(100, Math.round((inv.entregado / inv.habilitado) * 100)) : 0;
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Progreso de distribución de la cuota:</span>
                      <span className="font-mono text-cyan-400 font-bold">{pct}% entregado</span>
                    </div>
                    <div className="w-full bg-gray-900 rounded-full h-2.5 border border-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ) : (
        /* Historial tab */
        <div className="overflow-y-auto max-h-80 rounded-xl border border-gray-800 bg-gray-950/60 custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-900 text-gray-400 border-b border-gray-800 uppercase font-mono text-[10px] sticky top-0">
                <th className="p-3"># Doc</th>
                <th className="p-3">Fecha / Hora</th>
                <th className="p-3">Departamento</th>
                <th className="p-3">Producto</th>
                <th className="p-3 text-center">Entregado</th>
                <th className="p-3 text-center">Pendiente</th>
                <th className="p-3">Entregó</th>
                <th className="p-3">Recibió</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {historial.map((r) => (
                <tr key={r.id} className="hover:bg-gray-800/40">
                  <td className="p-3 font-mono text-cyan-400 font-bold">#{String(r.idConsecutivo).padStart(4, '0')}</td>
                  <td className="p-3 text-gray-400">
                    {r.fecha} <span className="text-[10px] text-gray-500">{r.hora}</span>
                  </td>
                  <td className="p-3 font-bold text-white">{r.departamento}</td>
                  <td className="p-3 text-blue-400">{r.producto}</td>
                  <td className="p-3 text-center text-emerald-400 font-bold">{r.cantidad} u.</td>
                  <td className="p-3 text-center text-amber-400">{r.pendiente} u.</td>
                  <td className="p-3 text-gray-400">{r.responsable}</td>
                  <td className="p-3 text-gray-400">{r.receptor}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          onSolicitarDestino(`Exportar Registro Agua #${r.idConsecutivo}`, (destData) => {
                            generarPDFRegistroAgua(r, destData);
                            onShowToast('success', 'PDF Generado', `Comprobante de entrega #${r.idConsecutivo} generado en PDF.`);
                          });
                        }}
                        className="bg-gray-800 hover:bg-cyan-900 text-cyan-400 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-gray-700"
                        title="Exportar a PDF"
                      >
                        <Printer className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button
                        onClick={async () => {
                          onSolicitarDestino(`Exportar Word Registro Agua #${r.idConsecutivo}`, async (destData) => {
                            await generarDOCXRegistroAgua(r, destData);
                            onShowToast('success', 'Word Generado', `Comprobante de entrega #${r.idConsecutivo} generado en Word.`);
                          });
                        }}
                        className="bg-gray-800 hover:bg-blue-900 text-blue-400 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-gray-700"
                        title="Exportar a Word (.docx)"
                      >
                        <Download className="w-3.5 h-3.5" /> Word
                      </button>
                      <button
                        onClick={() => {
                          if (r.id) {
                            setHistorialAEliminar({ id: r.id, idConsecutivo: r.idConsecutivo });
                          }
                        }}
                        className="bg-gray-800 hover:bg-red-950/60 text-gray-400 hover:text-red-400 border border-gray-700 p-1 rounded-lg transition-all cursor-pointer"
                        title="Eliminar registro de entrega"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Delivery */}
      {showEntregaModal && selectedDept && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
              <Send className="w-4 h-4 text-emerald-400" /> Registrar Entrega Parcial — {selectedDept.nombre}
            </h3>

            <form onSubmit={handleEntregaParcial} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Cantidad a Entregar *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={entregaCantidad}
                  onChange={(e) => setEntregaCantidad(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Persona que Recibe *</label>
                <input
                  type="text"
                  required
                  value={entregaReceptor}
                  onChange={(e) => setEntregaReceptor(e.target.value)}
                  placeholder="Ej: Lic. María López — Supervisora"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Persona que Entrega *</label>
                <input
                  type="text"
                  required
                  value={entregaResponsable}
                  onChange={(e) => setEntregaResponsable(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowEntregaModal(false)}
                  className="bg-gray-800 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md"
                >
                  Confirmar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Dept */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
              <Plus className="w-4 h-4 text-cyan-400" /> Agregar Nuevo Departamento / Área
            </h3>

            <form onSubmit={handleAddDept} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Nombre del Departamento *</label>
                <input
                  type="text"
                  required
                  value={newDeptNombre}
                  onChange={(e) => setNewDeptNombre(e.target.value)}
                  placeholder="Ej: Quirófano Central / Sala 3"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Cuota Faldos</label>
                  <input
                    type="number"
                    min="1"
                    value={newFaldosHab}
                    onChange={(e) => setNewFaldosHab(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Frecuencia Faldos</label>
                  <select
                    value={newFaldosFrec}
                    onChange={(e) => setNewFaldosFrec(e.target.value as any)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Cuota Botellones</label>
                  <input
                    type="number"
                    min="1"
                    value={newBotellonesHab}
                    onChange={(e) => setNewBotellonesHab(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Frecuencia Botellones</label>
                  <select
                    value={newBotellonesFrec}
                    onChange={(e) => setNewBotellonesFrec(e.target.value as any)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="bg-gray-800 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Guardar Departamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Dept */}
      {showEditDeptModal && editingDept && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
              <Settings2 className="w-4 h-4 text-cyan-400" /> Editar Cuotas — {editingDept.nombre}
            </h3>

            <form onSubmit={handleUpdateDept} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Límite Faldos</label>
                  <input
                    type="number"
                    min="0"
                    value={editingDept.faldos.habilitado}
                    onChange={(e) =>
                      setEditingDept({
                        ...editingDept,
                        faldos: { ...editingDept.faldos, habilitado: parseInt(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Frecuencia Faldos</label>
                  <select
                    value={editingDept.faldos.frecuencia}
                    onChange={(e) =>
                      setEditingDept({
                        ...editingDept,
                        faldos: { ...editingDept.faldos, frecuencia: e.target.value as any }
                      })
                    }
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Límite Botellones</label>
                  <input
                    type="number"
                    min="0"
                    value={editingDept.botellones.habilitado}
                    onChange={(e) =>
                      setEditingDept({
                        ...editingDept,
                        botellones: { ...editingDept.botellones, habilitado: parseInt(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Frecuencia Botellones</label>
                  <select
                    value={editingDept.botellones.frecuencia}
                    onChange={(e) =>
                      setEditingDept({
                        ...editingDept,
                        botellones: { ...editingDept.botellones, frecuencia: e.target.value as any }
                      })
                    }
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowEditDeptModal(false)}
                  className="bg-gray-800 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Departamento */}
      <ConfirmModal
        isOpen={!!deptAEliminar}
        title="Eliminar Departamento"
        message="¿Estás seguro de que deseas eliminar este departamento? Se eliminarán las configuraciones de cuota de agua."
        itemName={deptAEliminar?.nombre}
        onConfirm={handleConfirmDeleteDept}
        onClose={() => setDeptAEliminar(null)}
        loading={deleting}
      />

      {/* Modal de Confirmación para Historial de Agua */}
      <ConfirmModal
        isOpen={!!historialAEliminar}
        title="Eliminar Registro de Entrega"
        message="¿Estás seguro de que deseas eliminar este registro del historial de entregas de agua?"
        itemName={historialAEliminar ? `Registro #${historialAEliminar.idConsecutivo}` : undefined}
        onConfirm={handleConfirmDeleteHistorial}
        onClose={() => setHistorialAEliminar(null)}
        loading={deleting}
      />
    </div>
  );
};
