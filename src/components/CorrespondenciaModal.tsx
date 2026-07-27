import React, { useState } from 'react';
import { Mail, X, FileText, Send, Award, Truck } from 'lucide-react';
import { SalidasAlmacenSection } from './SalidasAlmacenSection';
import { ExportDestinoData, OficioCorrespondenciaData } from '../types';
import {
  generarPDFOficioCorrespondencia,
  generarDOCXOficioCorrespondencia
} from '../utils/documentExporter';

interface CorrespondenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'Informes' | 'Solicitud' | 'Certificación' | 'Salidas';
  usuarioNombre: string;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onSolicitarDestino: (titulo: string, callbackFn: (dest: ExportDestinoData) => void) => void;
}

export const CorrespondenciaModal: React.FC<CorrespondenciaModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'Salidas',
  usuarioNombre,
  onShowToast,
  onSolicitarDestino,
}) => {
  const [activeTab, setActiveTab] = useState<'Informes' | 'Solicitud' | 'Certificación' | 'Salidas'>(initialTab);

  // Form states for general letters
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [solicitudArticulo, setSolicitudArticulo] = useState('');
  const [solicitudCantidad, setSolicitudCantidad] = useState(1);

  if (!isOpen) return null;

  const handleGenerarCarta = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'Informes' && !asunto.trim()) {
      onShowToast('error', 'Campo Incompleto', 'Ingresa el asunto del informe.');
      return;
    }
    if (activeTab === 'Solicitud' && !solicitudArticulo.trim()) {
      onShowToast('error', 'Campo Incompleto', 'Ingresa el artículo solicitado.');
      return;
    }

    const oficioData: OficioCorrespondenciaData = {
      tipo: activeTab,
      asunto: asunto.trim() || `Oficio: ${activeTab}`,
      cuerpo: cuerpo.trim(),
      solicitudArticulo: solicitudArticulo.trim(),
      solicitudCantidad: solicitudCantidad,
      usuarioNombre
    };

    onSolicitarDestino(`Oficio: ${activeTab}`, async (destData: ExportDestinoData) => {
      try {
        // Generar y descargar el documento PDF oficial
        generarPDFOficioCorrespondencia(oficioData, destData);

        // Generar y descargar el documento Word (.docx) oficial
        await generarDOCXOficioCorrespondencia(oficioData, destData);

        onShowToast('success', 'Documentos Generados', `Se generó y descargó la carta en PDF y Word para ${destData.nombre}.`);
        onClose();

        // Reset form
        setAsunto('');
        setCuerpo('');
        setSolicitudArticulo('');
        setSolicitudCantidad(1);
      } catch (err) {
        console.error('Error al generar oficio de correspondencia:', err);
        onShowToast('error', 'Error al Generar', 'Ocurrió un error al generar el documento PDF.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-4xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Correspondencia, Oficios y Salidas de Almacén</h3>
              <p className="text-xs text-gray-400">Emisión de documentos oficiales y trazabilidad de salidas físicas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs navigation */}
        <div className="flex gap-2 border-b border-gray-800 pb-3 mb-4 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('Salidas')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'Salidas' ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-950 text-gray-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4 text-cyan-300" /> Salidas de Almacén
          </button>
          <button
            onClick={() => setActiveTab('Informes')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'Informes' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-950 text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-300" /> Informes Oficiales
          </button>
          <button
            onClick={() => setActiveTab('Solicitud')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'Solicitud' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-950 text-gray-400 hover:text-white'
            }`}
          >
            <Send className="w-4 h-4 text-purple-300" /> Solicitudes de Insumos
          </button>
          <button
            onClick={() => setActiveTab('Certificación')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'Certificación' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-950 text-gray-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-300" /> Certificaciones
          </button>
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {activeTab === 'Salidas' ? (
            <SalidasAlmacenSection
              usuarioNombre={usuarioNombre}
              onShowToast={onShowToast}
              onSolicitarDestino={onSolicitarDestino}
            />
          ) : (
            <form onSubmit={handleGenerarCarta} className="space-y-4 max-w-xl mx-auto py-2">
              {activeTab === 'Informes' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Asunto del Informe *</label>
                    <input
                      type="text"
                      required
                      value={asunto}
                      onChange={(e) => setAsunto(e.target.value)}
                      placeholder="Ej: Remisión de reporte trimestral de insumos"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Cuerpo / Desarrollo del Informe *</label>
                    <textarea
                      rows={6}
                      required
                      value={cuerpo}
                      onChange={(e) => setCuerpo(e.target.value)}
                      placeholder="Escribe el desarrollo formal del informe..."
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
                    ></textarea>
                  </div>
                </>
              )}

              {activeTab === 'Solicitud' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Insumo o Artículo Solicitado *</label>
                    <input
                      type="text"
                      required
                      value={solicitudArticulo}
                      onChange={(e) => setSolicitudArticulo(e.target.value)}
                      placeholder="Ej: Guantes de nitrilo, Reactivos de laboratorio"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Cantidad Requerida *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={solicitudCantidad}
                      onChange={(e) => setSolicitudCantidad(parseInt(e.target.value) || 1)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              {activeTab === 'Certificación' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Detalles de la Certificación *</label>
                  <textarea
                    rows={6}
                    required
                    value={cuerpo}
                    onChange={(e) => setCuerpo(e.target.value)}
                    placeholder="Certificamos por medio de la presente que..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 resize-none"
                  ></textarea>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-800 text-gray-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Continuar y Seleccionar Destinatario →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
