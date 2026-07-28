import React, { useState, useEffect } from 'react';
import {
  Droplet,
  Package,
  Droplets,
  History,
  Plus,
  FileCheck,
  Send,
  Download,
  Settings2,
  Trash2,
  Printer,
  Calendar,
  CheckSquare,
  Square,
  Building2,
  AlertTriangle,
  RefreshCw,
  Search,
  Sliders,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DepartamentoAgua,
  HistorialAgua,
  InventarioGeneralAgua,
  ExportDestinoData
} from '../types';
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
  onSolicitarDestino
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'planificacion' | 'entregas_dia' | 'inventario_general' | 'historial'>('planificacion');

  // Firestore States
  const [departamentos, setDepartamentos] = useState<DepartamentoAgua[]>([]);
  const [historial, setHistorial] = useState<HistorialAgua[]>([]);
  const [inventarioGeneral, setInventarioGeneral] = useState<InventarioGeneralAgua>({
    fardosDisponibles: 450,
    botellonesDisponibles: 280
  });
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Modals state
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [showEntregaHoyModal, setShowEntregaHoyModal] = useState(false);
  const [showInventarioModal, setShowInventarioModal] = useState(false);

  const [selectedDept, setSelectedDept] = useState<DepartamentoAgua | null>(null);
  const [editingDept, setEditingDept] = useState<DepartamentoAgua | null>(null);

  // Deletion modals state
  const [deptAEliminar, setDeptAEliminar] = useState<DepartamentoAgua | null>(null);
  const [historialAEliminar, setHistorialAEliminar] = useState<{ id: string; idConsecutivo: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Delivery Modal Form State
  const [entregaFardos, setEntregaFardos] = useState(1);
  const [entregaBotellones, setEntregaBotellones] = useState(0);
  const [entregaResponsable, setEntregaResponsable] = useState(usuarioNombre || 'Almacén Central');
  const [entregaReceptor, setEntregaReceptor] = useState('');
  const [entregaObservaciones, setEntregaObservaciones] = useState('');

  // Department creation form state
  const [newDeptNombre, setNewDeptNombre] = useState('');
  const [newMaxFardos, setNewMaxFardos] = useState(40);
  const [newMaxBotellones, setNewMaxBotellones] = useState(50);
  const [newFrecuencia, setNewFrecuencia] = useState<'Semanal' | 'Quincenal' | 'Mensual' | 'Personalizada'>('Mensual');

  // General inventory update form state
  const [editStockFardos, setEditStockFardos] = useState(450);
  const [editStockBotellones, setEditStockBotellones] = useState(280);

  // Firestore listeners
  useEffect(() => {
    setLoading(true);

    // 1. General Water Inventory listener
    const unsubInv = onSnapshot(doc(db, 'inventario_agua', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as InventarioGeneralAgua;
        setInventarioGeneral(data);
        setEditStockFardos(data.fardosDisponibles);
        setEditStockBotellones(data.botellonesDisponibles);
      } else {
        // Initialize general water inventory
        const defaultInv: InventarioGeneralAgua = {
          fardosDisponibles: 450,
          botellonesDisponibles: 280,
          actualizadoEn: new Date().toISOString(),
          usuarioActualizacion: usuarioNombre || 'Almacén Central'
        };
        setDoc(doc(db, 'inventario_agua', 'general'), defaultInv);
      }
    });

    // 2. Departments listener
    const unsubDept = onSnapshot(collection(db, 'departamentos'), (snapshot) => {
      if (snapshot.empty) {
        // Initial hospital areas setup
        const initialAreas: DepartamentoAgua[] = [
          {
            id: 'dept_uci',
            nombre: 'Unidad de Cuidados Intensivos (UCI)',
            maxFardosMensual: 50,
            maxBotellonesMensual: 60,
            frecuencia: 'Mensual',
            entregadoFardosPeriodo: 12,
            entregadoBotellonesPeriodo: 18,
            entregadoHoy: false
          },
          {
            id: 'dept_emergencia',
            nombre: 'Emergencia Pediátrica',
            maxFardosMensual: 60,
            maxBotellonesMensual: 70,
            frecuencia: 'Mensual',
            entregadoFardosPeriodo: 20,
            entregadoBotellonesPeriodo: 25,
            entregadoHoy: false
          },
          {
            id: 'dept_lab',
            nombre: 'Laboratorio Clínico y Banco de Sangre',
            maxFardosMensual: 30,
            maxBotellonesMensual: 35,
            frecuencia: 'Quincenal',
            entregadoFardosPeriodo: 10,
            entregadoBotellonesPeriodo: 12,
            entregadoHoy: false
          },
          {
            id: 'dept_quirofano',
            nombre: 'Quirófano Central',
            maxFardosMensual: 45,
            maxBotellonesMensual: 50,
            frecuencia: 'Mensual',
            entregadoFardosPeriodo: 15,
            entregadoBotellonesPeriodo: 20,
            entregadoHoy: false
          },
          {
            id: 'dept_mayordomia',
            nombre: 'Mayordomía y Mantenimiento',
            maxFardosMensual: 80,
            maxBotellonesMensual: 90,
            frecuencia: 'Semanal',
            entregadoFardosPeriodo: 35,
            entregadoBotellonesPeriodo: 40,
            entregadoHoy: false
          }
        ];
        initialAreas.forEach((area) => {
          setDoc(doc(db, 'departamentos', area.id!), area);
        });
      } else {
        const data: DepartamentoAgua[] = snapshot.docs.map((d) => {
          const docData = d.data() as any;
          // Compatibility mapping for legacy dept records
          const maxFardos = docData.maxFardosMensual ?? docData.faldos?.habilitado ?? 40;
          const maxBotellones = docData.maxBotellonesMensual ?? docData.botellones?.habilitado ?? 50;
          const delivFardos = docData.entregadoFardosPeriodo ?? docData.faldos?.entregado ?? 0;
          const delivBotellones = docData.entregadoBotellonesPeriodo ?? docData.botellones?.entregado ?? 0;

          return {
            id: d.id,
            nombre: docData.nombre || 'Departamento',
            maxFardosMensual: maxFardos,
            maxBotellonesMensual: maxBotellones,
            frecuencia: docData.frecuencia || docData.faldos?.frecuencia || 'Mensual',
            entregadoFardosPeriodo: delivFardos,
            entregadoBotellonesPeriodo: delivBotellones,
            fechaUltimaEntrega: docData.fechaUltimaEntrega,
            entregadoHoy: docData.entregadoHoy || false,
            entregadoHoyDetalle: docData.entregadoHoyDetalle,
            actualizadoEn: docData.actualizadoEn
          };
        });
        setDepartamentos(data);
      }
      setLoading(false);
    });

    // 3. Water history listener
    const qHist = query(collection(db, 'historial_agua'), orderBy('creadoEn', 'desc'));
    const unsubHist = onSnapshot(qHist, (snapshot) => {
      const data: HistorialAgua[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<HistorialAgua, 'id'>)
      }));
      setHistorial(data);
    });

    return () => {
      unsubInv();
      unsubDept();
      unsubHist();
    };
  }, []);

  // Helpers
  const getDeptStatus = (dept: DepartamentoAgua) => {
    const fardosPct = dept.maxFardosMensual > 0 ? (dept.entregadoFardosPeriodo / dept.maxFardosMensual) * 100 : 0;
    const botellonesPct = dept.maxBotellonesMensual > 0 ? (dept.entregadoBotellonesPeriodo / dept.maxBotellonesMensual) * 100 : 0;
    const maxPct = Math.max(fardosPct, botellonesPct);

    if (maxPct > 100) return { label: 'Excedido', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (maxPct === 100) return { label: 'Límite Alcanzado', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    if (maxPct >= 80) return { label: 'Cerca del Límite', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    return { label: 'Normal', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  };

  // Handle Update General Warehouse Inventory
  const handleSaveInventarioGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'inventario_agua', 'general'), {
        fardosDisponibles: editStockFardos >= 0 ? editStockFardos : 0,
        botellonesDisponibles: editStockBotellones >= 0 ? editStockBotellones : 0,
        actualizadoEn: new Date().toISOString(),
        usuarioActualizacion: usuarioNombre || 'Almacén Central'
      });
      onShowToast('success', 'Inventario Actualizado', 'El stock general de agua en almacén fue guardado.');
      setShowInventarioModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'inventario_agua/general');
    }
  };

  // Open modal for Daily Delivery Checkbox
  const handleOpenEntregaModal = (dept: DepartamentoAgua) => {
    setSelectedDept(dept);
    setEntregaFardos(1);
    setEntregaBotellones(1);
    setEntregaReceptor('');
    setEntregaObservaciones('');
    setShowEntregaHoyModal(true);
  };

  // Submit Daily Delivery (Updates Dept, Logs History & Deducts Warehouse Inventory)
  const handleConfirmEntregaHoy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !selectedDept.id) return;

    if (entregaFardos <= 0 && entregaBotellones <= 0) {
      onShowToast('error', 'Cantidad Inválida', 'Indica al menos 1 fardo o 1 botellón a entregar.');
      return;
    }

    const now = new Date();
    const fechaActual = now.toLocaleDateString('es-ES');
    const horaActual = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // Deduct stock from General Warehouse Inventory
    const newFardosGeneral = Math.max(0, inventarioGeneral.fardosDisponibles - entregaFardos);
    const newBotellonesGeneral = Math.max(0, inventarioGeneral.botellonesDisponibles - entregaBotellones);

    try {
      // 1. Update general warehouse stock
      await setDoc(doc(db, 'inventario_agua', 'general'), {
        fardosDisponibles: newFardosGeneral,
        botellonesDisponibles: newBotellonesGeneral,
        actualizadoEn: now.toISOString(),
        usuarioActualizacion: usuarioNombre || 'Almacén Central'
      });

      // 2. Update department record
      const updatedFardosPeriodo = (selectedDept.entregadoFardosPeriodo || 0) + entregaFardos;
      const updatedBotellonesPeriodo = (selectedDept.entregadoBotellonesPeriodo || 0) + entregaBotellones;

      const entregaDetalle = {
        fecha: fechaActual,
        hora: horaActual,
        usuario: entregaResponsable || usuarioNombre || 'Almacén Central',
        fardos: entregaFardos,
        botellones: entregaBotellones,
        receptor: entregaReceptor.trim() || 'Personal Autorizado',
        observaciones: entregaObservaciones.trim()
      };

      await updateDoc(doc(db, 'departamentos', selectedDept.id), {
        entregadoHoy: true,
        fechaUltimaEntrega: `${fechaActual} ${horaActual}`,
        entregadoHoyDetalle: entregaDetalle,
        entregadoFardosPeriodo: updatedFardosPeriodo,
        entregadoBotellonesPeriodo: updatedBotellonesPeriodo,
        actualizadoEn: now.toISOString()
      });

      // 3. Log into History
      const nextConsecutivo = (historial[0]?.idConsecutivo || 0) + 1;

      if (entregaFardos > 0) {
        const histFardos: Omit<HistorialAgua, 'id'> = {
          idConsecutivo: nextConsecutivo,
          fecha: fechaActual,
          hora: horaActual,
          departamento: selectedDept.nombre,
          producto: 'Agua Purificada (Fardos)',
          cantidad: entregaFardos,
          habilitado: selectedDept.maxFardosMensual,
          frecuencia: selectedDept.frecuencia,
          cuota: `${selectedDept.maxFardosMensual} fardos / mes`,
          pendiente: Math.max(0, selectedDept.maxFardosMensual - updatedFardosPeriodo),
          responsable: entregaResponsable || usuarioNombre || 'Almacén Central',
          receptor: entregaReceptor.trim() || 'Personal Autorizado',
          creadoEn: now.toISOString()
        };
        await addDoc(collection(db, 'historial_agua'), histFardos);
      }

      if (entregaBotellones > 0) {
        const histBotellones: Omit<HistorialAgua, 'id'> = {
          idConsecutivo: nextConsecutivo + (entregaFardos > 0 ? 1 : 0),
          fecha: fechaActual,
          hora: horaActual,
          departamento: selectedDept.nombre,
          producto: 'Agua Purificada (Botellones)',
          cantidad: entregaBotellones,
          habilitado: selectedDept.maxBotellonesMensual,
          frecuencia: selectedDept.frecuencia,
          cuota: `${selectedDept.maxBotellonesMensual} botellones / mes`,
          pendiente: Math.max(0, selectedDept.maxBotellonesMensual - updatedBotellonesPeriodo),
          responsable: entregaResponsable || usuarioNombre || 'Almacén Central',
          receptor: entregaReceptor.trim() || 'Personal Autorizado',
          creadoEn: now.toISOString()
        };
        await addDoc(collection(db, 'historial_agua'), histBotellones);
      }

      onShowToast(
        'success',
        'Entrega Registrada y Descontada',
        `Se entregó a ${selectedDept.nombre}. Descontados ${entregaFardos} fardos y ${entregaBotellones} botellones del inventario general.`
      );
      setShowEntregaHoyModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `departamentos/${selectedDept.id}`);
    }
  };

  // Toggle OFF "Agua entregada hoy"
  const handleToggleOffEntregaHoy = async (dept: DepartamentoAgua) => {
    if (!dept.id) return;
    try {
      await updateDoc(doc(db, 'departamentos', dept.id), {
        entregadoHoy: false,
        actualizadoEn: new Date().toISOString()
      });
      onShowToast('info', 'Estado Actualizado', `Se desmarcó la entrega del día de ${dept.nombre}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `departamentos/${dept.id}`);
    }
  };

  // Reset Period Deliveries for all departments (Nuevo período mensual/semanal)
  const handleResetearPeriodo = async () => {
    try {
      const promises = departamentos.map((d) => {
        if (!d.id) return Promise.resolve();
        return updateDoc(doc(db, 'departamentos', d.id), {
          entregadoFardosPeriodo: 0,
          entregadoBotellonesPeriodo: 0,
          entregadoHoy: false,
          actualizadoEn: new Date().toISOString()
        });
      });
      await Promise.all(promises);
      onShowToast('success', 'Período Reiniciado', 'Se reiniciaron los contadores de consumo para todos los departamentos.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'departamentos');
    }
  };

  // Add new department
  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptNombre.trim()) return;

    const newId = `dept_${Date.now()}`;
    const newDept: DepartamentoAgua = {
      id: newId,
      nombre: newDeptNombre.trim(),
      maxFardosMensual: newMaxFardos,
      maxBotellonesMensual: newMaxBotellones,
      frecuencia: newFrecuencia,
      entregadoFardosPeriodo: 0,
      entregadoBotellonesPeriodo: 0,
      entregadoHoy: false,
      actualizadoEn: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'departamentos', newId), newDept);
      onShowToast('success', 'Departamento Creado', `Se configuró el consumo para ${newDept.nombre}.`);
      setShowAddDeptModal(false);
      setNewDeptNombre('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `departamentos/${newId}`);
    }
  };

  // Save edit department
  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editingDept.id) return;

    try {
      await updateDoc(doc(db, 'departamentos', editingDept.id), {
        nombre: editingDept.nombre,
        maxFardosMensual: editingDept.maxFardosMensual,
        maxBotellonesMensual: editingDept.maxBotellonesMensual,
        frecuencia: editingDept.frecuencia,
        actualizadoEn: new Date().toISOString()
      });
      onShowToast('success', 'Configuración Guardada', `Se actualizaron los límites de ${editingDept.nombre}.`);
      setShowEditDeptModal(false);
      setEditingDept(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `departamentos/${editingDept.id}`);
    }
  };

  // Delete department
  const handleConfirmDeleteDept = async () => {
    if (!deptAEliminar || !deptAEliminar.id) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'departamentos', deptAEliminar.id));
      onShowToast('success', 'Departamento Eliminado', `Se eliminó el departamento ${deptAEliminar.nombre}.`);
      setDeptAEliminar(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `departamentos/${deptAEliminar.id}`);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered lists
  const filteredDeptos = departamentos.filter((d) =>
    d.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const entregasHoyList = departamentos.filter((d) => d.entregadoHoy === true);

  // Totals for today
  const totalFardosEntregadosHoy = entregasHoyList.reduce(
    (acc, d) => acc + (d.entregadoHoyDetalle?.fardos || 0),
    0
  );
  const totalBotellonesEntregadosHoy = entregasHoyList.reduce(
    (acc, d) => acc + (d.entregadoHoyDetalle?.botellones || 0),
    0
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-400 animate-pulse" />
            Monitoreo e Inventario General de Agua Purificada
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Planificación de consumo mensual, entregas del día con descuento automático y stock físico en almacén.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddDeptModal(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Configurar Departamento
          </button>

          <button
            onClick={() => setShowInventarioModal(true)}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-cyan-300 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-cyan-400" /> Ajustar Stock Físico
          </button>
        </div>
      </div>

      {/* General Warehouse Inventory Card Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-cyan-950/80 to-gray-900 border border-cyan-800/40 p-4 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Fardos en Almacén</p>
              <p className="text-2xl font-black text-white font-mono mt-1">
                {inventarioGeneral.fardosDisponibles} <span className="text-xs font-normal text-cyan-300">fardos</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
            <span>Stock disponible físico</span>
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
                inventarioGeneral.fardosDisponibles > 50
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {inventarioGeneral.fardosDisponibles > 50 ? 'Stock OK' : 'Stock Bajo'}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-950/80 to-gray-900 border border-blue-800/40 p-4 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Botellones en Almacén</p>
              <p className="text-2xl font-black text-white font-mono mt-1">
                {inventarioGeneral.botellonesDisponibles} <span className="text-xs font-normal text-blue-300">bot.</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Droplet className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
            <span>Stock disponible físico</span>
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
                inventarioGeneral.botellonesDisponibles > 30
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {inventarioGeneral.botellonesDisponibles > 30 ? 'Stock OK' : 'Stock Bajo'}
            </span>
          </div>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Entregado Hoy</p>
              <p className="text-xl font-bold text-white font-mono mt-1">
                {totalFardosEntregadosHoy} <span className="text-xs text-gray-400 font-normal">fardos</span> /{' '}
                {totalBotellonesEntregadosHoy} <span className="text-xs text-gray-400 font-normal font-mono">bot.</span>
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            {entregasHoyList.length} de {departamentos.length} departamentos atendidos hoy
          </p>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Período Activo</p>
              <p className="text-sm font-bold text-white mt-1">Plan Mensual / Semanal</p>
            </div>
            <button
              onClick={handleResetearPeriodo}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors cursor-pointer"
              title="Reiniciar acumulados del período"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Descuento automático en almacén al marcar entrega
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('planificacion')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'planificacion'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Building2 className="w-4 h-4" /> Planificación de Consumo ({departamentos.length})
        </button>

        <button
          onClick={() => setActiveTab('entregas_dia')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'entregas_dia'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Entregas del Día ({entregasHoyList.length})
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'historial'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <History className="w-4 h-4" /> Historial de Entregas ({historial.length})
        </button>
      </div>

      {/* TAB 1: PLANIFICACIÓN POR DEPARTAMENTOS */}
      {activeTab === 'planificacion' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar departamento..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500"
              />
            </div>
            <p className="text-xs text-gray-400 font-mono">
              Marcador <span className="text-cyan-400 font-bold">"Agua entregada hoy"</span> descuenta stock físico automáticamente
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              Cargando departamentos y consumo de agua...
            </div>
          ) : filteredDeptos.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-500 italic bg-gray-950 rounded-2xl border border-gray-800">
              No hay departamentos configurados con ese nombre.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDeptos.map((dept) => {
                const status = getDeptStatus(dept);
                const restanteFardos = Math.max(0, dept.maxFardosMensual - dept.entregadoFardosPeriodo);
                const restanteBotellones = Math.max(0, dept.maxBotellonesMensual - dept.entregadoBotellonesPeriodo);

                return (
                  <div
                    key={dept.id}
                    className={`bg-gray-950 border rounded-2xl p-4 space-y-3 transition-all relative group ${
                      dept.entregadoHoy
                        ? 'border-emerald-500/50 bg-emerald-950/10'
                        : 'border-gray-800 hover:border-cyan-500/40'
                    }`}
                  >
                    {/* Header Card */}
                    <div className="flex justify-between items-start gap-2 border-b border-gray-800/80 pb-2.5">
                      <div>
                        <h3 className="font-bold text-white text-sm line-clamp-1">{dept.nombre}</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <span>Frecuencia: {dept.frecuencia}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                        <button
                          onClick={() => {
                            setEditingDept({ ...dept });
                            setShowEditDeptModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                          title="Editar cuotas"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeptAEliminar(dept)}
                          className="p-1 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Eliminar departamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Fardos Consumption Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-300 font-semibold flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-cyan-400" /> Fardos:
                        </span>
                        <span className="font-mono text-white">
                          <strong className="text-cyan-400">{dept.entregadoFardosPeriodo}</strong> / {dept.maxFardosMensual} fardos
                        </span>
                      </div>
                      <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
                        <div
                          className="bg-cyan-500 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              dept.maxFardosMensual > 0 ? (dept.entregadoFardosPeriodo / dept.maxFardosMensual) * 100 : 0
                            )}%`
                          }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-right">
                        Disponible en cuota: {restanteFardos} fardos
                      </p>
                    </div>

                    {/* Botellones Consumption Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-300 font-semibold flex items-center gap-1">
                          <Droplet className="w-3.5 h-3.5 text-blue-400" /> Botellones:
                        </span>
                        <span className="font-mono text-white">
                          <strong className="text-blue-400">{dept.entregadoBotellonesPeriodo}</strong> / {dept.maxBotellonesMensual} bot.
                        </span>
                      </div>
                      <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              dept.maxBotellonesMensual > 0
                                ? (dept.entregadoBotellonesPeriodo / dept.maxBotellonesMensual) * 100
                                : 0
                            )}%`
                          }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-right">
                        Disponible en cuota: {restanteBotellones} botellones
                      </p>
                    </div>

                    {/* Daily Delivery Checkbox Footer */}
                    <div className="border-t border-gray-800/80 pt-3 flex items-center justify-between">
                      {dept.entregadoHoy ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleOffEntregaHoy(dept)}
                              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer text-xs font-bold"
                            >
                              <CheckSquare className="w-4 h-4" /> Agua Entregada Hoy
                            </button>
                          </div>
                          <span className="text-[10px] text-emerald-400/80 font-mono">
                            {dept.entregadoHoyDetalle?.fardos || 0} fardos / {dept.entregadoHoyDetalle?.botellones || 0} bot.
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenEntregaModal(dept)}
                          className="text-gray-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer text-xs font-semibold group/btn"
                        >
                          <Square className="w-4 h-4 text-gray-500 group-hover/btn:text-cyan-400" />
                          Marcar "Agua entregada hoy"
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ENTREGAS DEL DÍA */}
      {activeTab === 'entregas_dia' && (
        <div className="space-y-4">
          <div className="bg-gray-950 border border-gray-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" /> Resumen de Entregas de Agua del Día
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Departamentos registrados con suministros entregados hoy.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-500" /> Fecha:
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {entregasHoyList.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 italic bg-gray-950 rounded-2xl border border-gray-800 flex flex-col items-center justify-center gap-2">
              <Droplet className="w-8 h-8 text-gray-600" />
              No hay entregas registradas hoy todavía. Haz clic en "Marcar Agua entregada hoy" en el listado de departamentos.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950 custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-gray-400 border-b border-gray-800 uppercase font-mono text-[10px]">
                    <th className="p-3">Departamento</th>
                    <th className="p-3">Hora Entrega</th>
                    <th className="p-3">Fardos</th>
                    <th className="p-3">Botellones</th>
                    <th className="p-3">Recibido por</th>
                    <th className="p-3">Entregado por</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {entregasHoyList.map((dept) => (
                    <tr key={dept.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        {dept.nombre}
                      </td>
                      <td className="p-3 text-gray-300 font-mono">
                        {dept.entregadoHoyDetalle?.hora || 'Hoy'}
                      </td>
                      <td className="p-3 font-bold text-cyan-400 font-mono">
                        {dept.entregadoHoyDetalle?.fardos || 0} fardos
                      </td>
                      <td className="p-3 font-bold text-blue-400 font-mono">
                        {dept.entregadoHoyDetalle?.botellones || 0} bot.
                      </td>
                      <td className="p-3 text-gray-300">
                        {dept.entregadoHoyDetalle?.receptor || 'Personal Autorizado'}
                      </td>
                      <td className="p-3 text-gray-400">
                        {dept.entregadoHoyDetalle?.usuario || usuarioNombre}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleOffEntregaHoy(dept)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Desmarcar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORIAL DE ENTREGAS */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" /> Historial de Entregas Registradas ({historial.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onSolicitarDestino('Comprobante e Informe de Historial de Agua', (destData) => {
                    generarPDFHistorialAgua(historial, destData);
                    generarDOCXHistorialAgua(historial, destData);
                    onShowToast('success', 'Historial Exportado', 'Se descargó el informe en PDF y Word (.docx).');
                  });
                }}
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Historial PDF / Word
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950 custom-scrollbar max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 border-b border-gray-800 uppercase font-mono text-[10px] sticky top-0">
                  <th className="p-3"># Reg</th>
                  <th className="p-3">Fecha / Hora</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3 text-center">Cantidad</th>
                  <th className="p-3">Entrega / Recibe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {historial.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-400">#{item.idConsecutivo}</td>
                    <td className="p-3 text-gray-400 whitespace-nowrap">
                      {item.fecha} <span className="text-[10px] text-gray-500">{item.hora}</span>
                    </td>
                    <td className="p-3 font-bold text-white">{item.departamento}</td>
                    <td className="p-3 text-gray-300">{item.producto}</td>
                    <td className="p-3 text-center font-bold text-emerald-400 font-mono">{item.cantidad} u.</td>
                    <td className="p-3 text-gray-400">
                      {item.responsable} <span className="text-gray-600">→</span> {item.receptor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: MARCAR AGUA ENTREGADA HOY */}
      {showEntregaHoyModal && selectedDept && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" /> Registrar Entrega del Día
              </h3>
              <button onClick={() => setShowEntregaHoyModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Departamento: <strong className="text-white">{selectedDept.nombre}</strong>
            </p>

            <form onSubmit={handleConfirmEntregaHoy} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-cyan-400 mb-1">Fardos a Entregar</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={entregaFardos}
                    onChange={(e) => setEntregaFardos(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-blue-400 mb-1">Botellones a Entregar</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={entregaBotellones}
                    onChange={(e) => setEntregaBotellones(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Persona que Recibe / Cargo *</label>
                <input
                  type="text"
                  required
                  value={entregaReceptor}
                  onChange={(e) => setEntregaReceptor(e.target.value)}
                  placeholder="Ej: Lic. María Pérez (Enfermería)"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={entregaObservaciones}
                  onChange={(e) => setEntregaObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="bg-cyan-950/40 border border-cyan-800/40 p-2.5 rounded-xl text-[11px] text-cyan-300 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-cyan-400 shrink-0" />
                Se descontará automáticamente del stock físico de almacén.
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEntregaHoyModal(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Confirmar Entrega y Descontar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AJUSTAR STOCK FÍSICO GENERAL */}
      {showInventarioModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-cyan-400" /> Ajustar Stock Físico General en Almacén
              </h3>
              <button onClick={() => setShowInventarioModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInventarioGeneral} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-cyan-400 mb-1">Total Fardos Disponibles en Almacén</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editStockFardos}
                  onChange={(e) => setEditStockFardos(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono text-base"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-blue-400 mb-1">Total Botellones Disponibles en Almacén</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editStockBotellones}
                  onChange={(e) => setEditStockBotellones(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono text-base"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInventarioModal(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Guardar Stock en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AGREGAR NUEVO DEPARTAMENTO */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" /> Configurar Límite de Departamento
              </h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDept} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Nombre del Departamento *</label>
                <input
                  type="text"
                  required
                  value={newDeptNombre}
                  onChange={(e) => setNewDeptNombre(e.target.value)}
                  placeholder="Ej: Radiología, Odontología, Mantenimiento"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-cyan-400 mb-1">Límite Fardos (Mensual)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMaxFardos}
                    onChange={(e) => setNewMaxFardos(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-blue-400 mb-1">Límite Botellones (Mensual)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMaxBotellones}
                    onChange={(e) => setNewMaxBotellones(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Frecuencia de Reposición</label>
                <select
                  value={newFrecuencia}
                  onChange={(e) => setNewFrecuencia(e.target.value as any)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                >
                  <option value="Semanal">Semanal</option>
                  <option value="Quincenal">Quincenal</option>
                  <option value="Mensual">Mensual</option>
                  <option value="Personalizada">Personalizada</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Guardar Departamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDITAR LÍMITES DE DEPARTAMENTO */}
      {showEditDeptModal && editingDept && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-cyan-400" /> Editar Límites del Departamento
              </h3>
              <button onClick={() => setShowEditDeptModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDept} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingDept.nombre}
                  onChange={(e) => setEditingDept({ ...editingDept, nombre: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-cyan-400 mb-1">Límite Fardos</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingDept.maxFardosMensual}
                    onChange={(e) => setEditingDept({ ...editingDept, maxFardosMensual: parseInt(e.target.value) || 1 })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-blue-400 mb-1">Límite Botellones</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingDept.maxBotellonesMensual}
                    onChange={(e) => setEditingDept({ ...editingDept, maxBotellonesMensual: parseInt(e.target.value) || 1 })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Frecuencia de Reposición</label>
                <select
                  value={editingDept.frecuencia}
                  onChange={(e) => setEditingDept({ ...editingDept, frecuencia: e.target.value as any })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                >
                  <option value="Semanal">Semanal</option>
                  <option value="Quincenal">Quincenal</option>
                  <option value="Mensual">Mensual</option>
                  <option value="Personalizada">Personalizada</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditDeptModal(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Actualizar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODALS FOR DELETION */}
      {deptAEliminar && (
        <ConfirmModal
          isOpen={true}
          title="Eliminar Departamento"
          message={`¿Estás seguro de que deseas eliminar el departamento "${deptAEliminar.nombre}"?`}
          confirmText="Sí, Eliminar"
          isDanger={true}
          loading={deleting}
          onConfirm={handleConfirmDeleteDept}
          onClose={() => setDeptAEliminar(null)}
        />
      )}
    </div>
  );
};
