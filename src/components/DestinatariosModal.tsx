import React, { useState, useEffect } from 'react';
import { Users, X, Plus, Trash2, CheckCircle2, UserCheck, Printer, Download } from 'lucide-react';
import { collection, onSnapshot, setDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Destinatario, ExportDestinoData } from '../types';
import { generarPDFDirectorioDestinatarios, generarDOCXDirectorioDestinatarios } from '../utils/documentExporter';
import { ConfirmModal } from './ConfirmModal';

interface DestinatariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'manage' | 'select';
  selectionTitle?: string;
  onSelectDestinatario?: (data: ExportDestinoData) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DestinatariosModal: React.FC<DestinatariosModalProps> = ({
  isOpen,
  onClose,
  mode = 'manage',
  selectionTitle = 'Selecciona el Destinatario Oficial',
  onSelectDestinatario,
  onShowToast,
}) => {
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [dependencia, setDependencia] = useState('');

  // Selected index for picker mode
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Deletion state
  const [destinatarioAEliminar, setDestinatarioAEliminar] = useState<Destinatario | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const unsub = onSnapshot(collection(db, 'destinatarios'), (snapshot) => {
      if (snapshot.empty) {
        // Seed initial recipients
        const initialDest: Destinatario[] = [
          { id: 'dest_1', nombre: 'Dra. María Elena Rodríguez', cargo: 'Directora General del Hospital', dependencia: 'Dirección Ejecutiva', activo: true },
          { id: 'dest_2', nombre: 'Lic. Juan Carlos Peralta', cargo: 'Encargado de Compras y Suministros', dependencia: 'Administración Central', activo: true },
          { id: 'dest_3', nombre: 'Dra. Carmen Almonte', cargo: 'Jefa de Servicios Médicos', dependencia: 'Departamento Médico', activo: true }
        ];
        initialDest.forEach((d) => setDoc(doc(db, 'destinatarios', d.id!), d));
      } else {
        const data: Destinatario[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Destinatario, 'id'>)
        }));
        setDestinatarios(data);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !cargo.trim()) {
      onShowToast('error', 'Campos Incompletos', 'Ingresa nombre y cargo.');
      return;
    }

    const newDest: Omit<Destinatario, 'id'> = {
      nombre: nombre.trim(),
      cargo: cargo.trim(),
      dependencia: dependencia.trim() || 'Hospital Infantil',
      activo: true
    };

    try {
      await addDoc(collection(db, 'destinatarios'), newDest);
      onShowToast('success', 'Destinatario Guardado', `Se agregó a ${nombre} al catálogo de Firestore.`);
      setShowAddForm(false);
      setNombre('');
      setCargo('');
      setDependencia('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'destinatarios');
    }
  };

  const handleConfirmDelete = async () => {
    if (!destinatarioAEliminar || !destinatarioAEliminar.id) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'destinatarios', destinatarioAEliminar.id));
      onShowToast('info', 'Eliminado', `Se retiró a ${destinatarioAEliminar.nombre} del catálogo de Firestore.`);
      setDestinatarioAEliminar(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `destinatarios/${destinatarioAEliminar.id}`);
      onShowToast('error', 'Error', 'No se pudo eliminar el destinatario.');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmSelection = () => {
    const sel = destinatarios[selectedIndex];
    if (sel && onSelectDestinatario) {
      onSelectDestinatario({
        nombre: sel.nombre,
        cargo: sel.cargo,
        dependencia: sel.dependencia
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            {mode === 'select' ? selectionTitle : 'Catálogo de Destinatarios Oficiales'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'manage' && (
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <span className="text-xs text-gray-400">{destinatarios.length} personas registradas</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  generarPDFDirectorioDestinatarios(destinatarios);
                  onShowToast('success', 'PDF Generado', 'Se exportó el directorio de destinatarios.');
                }}
                className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                title="Exportar directorio a PDF"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={async () => {
                  await generarDOCXDirectorioDestinatarios(destinatarios);
                  onShowToast('success', 'Word Generado', 'Se exportó el directorio a Word (.docx).');
                }}
                className="bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                title="Exportar directorio a Word (.docx)"
              >
                <Download className="w-3.5 h-3.5" /> Word
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1 rounded-xl text-xs flex items-center gap-1 shadow cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> {showAddForm ? 'Cancelar' : 'Nuevo Destinatario'}
              </button>
            </div>
          </div>
        )}

        {showAddForm && mode === 'manage' && (
          <form onSubmit={handleAddRecipient} className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-3 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Dra. Juana Martínez"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Cargo *</label>
                <input
                  type="text"
                  required
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ej: Directora Médica"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Dependencia / Área</label>
                <input
                  type="text"
                  value={dependencia}
                  onChange={(e) => setDependencia(e.target.value)}
                  placeholder="Ej: Dirección General"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 rounded-lg text-xs cursor-pointer shadow-md"
            >
              Guardar en Firestore
            </button>
          </form>
        )}

        {/* Recipients list */}
        <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">Cargando destinatarios en tiempo real...</div>
          ) : destinatarios.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 italic">No hay destinatarios registrados.</div>
          ) : (
            destinatarios.map((d, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={d.id || idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center gap-2 ${
                    mode === 'select' && isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-md'
                      : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-white flex items-center gap-1.5">
                      {mode === 'select' && isSelected && <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />}
                      {d.nombre}
                    </p>
                    <p className="text-[11px] text-gray-400">{d.cargo}</p>
                    {d.dependencia && <p className="text-[10px] text-cyan-400 font-mono">{d.dependencia}</p>}
                  </div>

                  {mode === 'manage' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDestinatarioAEliminar(d);
                      }}
                      className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/40 border border-transparent hover:border-red-800/40 cursor-pointer transition-all"
                      title="Eliminar destinatario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 pt-3 mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-800 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold">
            {mode === 'select' ? 'Cancelar' : 'Cerrar'}
          </button>
          {mode === 'select' && destinatarios.length > 0 && (
            <button
              onClick={handleConfirmSelection}
              className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md"
            >
              Confirmar y Generar PDF
            </button>
          )}
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={!!destinatarioAEliminar}
        title="Eliminar Destinatario Oficial"
        message="¿Estás seguro de que deseas retirar a este destinatario del catálogo oficial?"
        itemName={destinatarioAEliminar ? `${destinatarioAEliminar.nombre} (${destinatarioAEliminar.cargo})` : undefined}
        onConfirm={handleConfirmDelete}
        onClose={() => setDestinatarioAEliminar(null)}
        loading={deleting}
      />
    </div>
  );
};
