import React, { useState } from 'react';
import { BookOpen, X, Search, PackageCheck, Truck, Droplet, FileText, RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';

interface AyudaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AyudaModal: React.FC<AyudaModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'despacho' | 'salidas' | 'agua' | 'realtime'>('general');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-3xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] transition-all transform scale-100">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Manual y Guía Interactiva del Sistema</h3>
              <p className="text-xs text-gray-400">Paso a paso para el uso de todos los módulos de almacén</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs navigation */}
        <div className="flex gap-2 border-b border-gray-800 pb-3 mb-4 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'general' ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Visión General
          </button>
          <button
            onClick={() => setActiveTab('despacho')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'despacho' ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <PackageCheck className="w-4 h-4" /> Despacho Global & PDF
          </button>
          <button
            onClick={() => setActiveTab('salidas')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'salidas' ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" /> Salidas de Almacén
          </button>
          <button
            onClick={() => setActiveTab('agua')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'agua' ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Droplet className="w-4 h-4" /> Control de Agua
          </button>
          <button
            onClick={() => setActiveTab('realtime')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'realtime' ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" /> Tiempo Real & Firebase
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs text-gray-300 custom-scrollbar">
          
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2">
                <h4 className="font-bold text-white text-sm text-cyan-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> ¿Qué es Hospital Supply Manager?
                </h4>
                <p className="leading-relaxed">
                  Es la plataforma de control de almacén e insumos del Hospital Infantil Dr. José M. Rodríguez Jiménez.
                  Permite administrar el inventario de agua purificada (faldos y botellones), despachos de medicamentos a pacientes,
                  registro de salidas de bienes, entradas de mercancía de proveedores y emisión de cartas de correspondencia.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-1.5">
                  <h5 className="font-bold text-white flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-amber-400" /> Búsqueda y Filtros
                  </h5>
                  <p className="text-gray-400 leading-relaxed">
                    Todos los módulos cuentan con barras de búsqueda en vivo. Puedes filtrar despachos por paciente o número,
                    salidas por tipo o categoría, y filtrar por fechas específicas.
                  </p>
                </div>

                <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-1.5">
                  <h5 className="font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" /> Edición y Eliminación
                  </h5>
                  <p className="text-gray-400 leading-relaxed">
                    Puedes actualizar el estado de los despachos a "Completado" o "Pendiente", modificar cuotas de agua o eliminar registros no deseados con confirmación segura.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'despacho' && (
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm text-cyan-400">Guía de Despacho Global de Medicamentos</h4>
              
              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">1. Registrar un Despacho:</p>
                <p className="text-gray-400">
                  Haz clic en el botón <strong className="text-cyan-400">"Despacho Global"</strong> en la barra superior o en su tarjeta. Selecciona <strong className="text-emerald-400">"+ Nuevo Despacho"</strong>. Completa el número de despacho, nombre del paciente, departamento solicitante, responsable y agrega la lista de medicamentos con sus cantidades y precios.
                </p>
              </div>

              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">2. Filtrar y Buscar:</p>
                <p className="text-gray-400">
                  Utiliza las pestañas "Pendientes" y "Completados", o escribe en la barra de búsqueda para localizar despachos por paciente, número de folio o departamento.
                </p>
              </div>

              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">3. Imprimir PDF Profesional:</p>
                <p className="text-gray-400">
                  Haz clic en el botón <strong className="text-cyan-400">"PDF / Imprimir"</strong> junto a cualquier despacho. El sistema generará automáticamente un documento PDF formateado con el membrete oficial del hospital, desglose de ítems, totales, badges de estado y líneas de firma para entrega y recepción.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'salidas' && (
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm text-cyan-400">Módulo de Correspondencia y Oficios — Salidas de Almacén</h4>
              
              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">1. Acceso a Salidas:</p>
                <p className="text-gray-400">
                  Abre la sección <strong className="text-blue-400">Correspondencia y Oficios</strong> y selecciona la pestaña <strong className="text-cyan-400">"Salidas de Almacén"</strong>.
                </p>
              </div>

              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">2. Registro de Salida de Bienes:</p>
                <p className="text-gray-400">
                  Haz clic en <strong className="text-emerald-400">"+ Registrar Salida"</strong>. Indica el tipo (Transferencia, Préstamo, Consumo Interno, Urgencia, Bautizo/Donación o Merma), la categoría (Medicamentos, Material Médico, Equipos u Otros Bienes), el ítem, cantidad, unidad, persona que recibe, persona que entrega, departamento solicitante y observaciones.
                </p>
              </div>

              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">3. Exportación y Comprobantes:</p>
                <p className="text-gray-400">
                  Cada registro se guarda en tiempo real en Firestore y permite descargar un comprobante PDF individual para firma física de recepción.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'agua' && (
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm text-cyan-400">Control de Agua Purificada (Faldos y Botellones)</h4>
              
              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">● Independencia de Cuotas:</p>
                <p className="text-gray-400">
                  Los Faldos y Botellones tienen cuotas y frecuencias (Semanal, Quincenal, Mensual) independientes.
                </p>
              </div>

              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">● Entrega Parcial y Constancias:</p>
                <p className="text-gray-400">
                  Selecciona un departamento de la tabla y haz clic en "Registrar Entrega". Al ingresar la cantidad entregada, el sistema genera la constancia numerada en tiempo real y descuenta el saldo pendiente.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'realtime' && (
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm text-cyan-400">Sincronización en Tiempo Real con Firebase Firestore</h4>
              
              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">● ¿Cómo funciona el tiempo real?</p>
                <p className="text-gray-400 leading-relaxed">
                  Todos los módulos están conectados a Google Firebase Firestore mediante listeners de suscripción (<code className="text-cyan-400 font-mono">onSnapshot</code>). 
                  Cuando cualquier usuario registra un despacho, agua o salida desde otra computadora o dispositivo, los cambios se reflejan inmediatamente en tu pantalla sin necesidad de recargar la página (<code className="text-cyan-400 font-mono">F5</code>).
                </p>
              </div>

              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <p className="font-bold text-white">● Seguridad y Respaldos:</p>
                <p className="text-gray-400 leading-relaxed">
                  Toda la información queda resguardada de manera persistente en la nube institucional en la base de datos Firestore.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 pt-4 mt-4 flex justify-between items-center text-xs">
          <span className="text-gray-500 font-mono">Hospital Supply Manager — v3.1</span>
          <button
            onClick={onClose}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-5 py-2 rounded-xl transition-all cursor-pointer shadow-md"
          >
            Entendido, Cerrar Ayuda
          </button>
        </div>

      </div>
    </div>
  );
};
