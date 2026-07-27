import React, { useState } from 'react';
import {
  Package,
  Droplets,
  Truck,
  ArrowDownToLine,
  FileSpreadsheet,
  Users,
  HelpCircle,
  Clock,
  CheckCircle,
  FileText,
  Building,
  Activity,
  ChevronRight,
  ShieldAlert,
  Search
} from 'lucide-react';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { AyudaModal } from './components/AyudaModal';
import { LoginModal } from './components/LoginModal';
import { ControlAguaSection } from './components/ControlAguaSection';
import { DespachoGlobalModal } from './components/DespachoGlobalModal';
import { CorrespondenciaModal } from './components/CorrespondenciaModal';
import { EntradasMercanciaModal } from './components/EntradasMercanciaModal';
import { AnalizadorExcelModal } from './components/AnalizadorExcelModal';
import { DestinatariosModal } from './components/DestinatariosModal';
import { Usuario, ExportDestinoData } from './types';

export default function App() {
  // Current user state (default loaded for immediate usability)
  const [usuario, setUsuario] = useState<Usuario>({
    id: 'usr_01',
    usuario: 'almacen01',
    nombreMostrar: 'Almacén Central',
    rol: 'Encargado de Almacén'
  });

  // Toast notifications state
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({ type, title, message });
  };

  // Modals visibility state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAyudaModal, setShowAyudaModal] = useState(false);
  const [showDespachoModal, setShowDespachoModal] = useState(false);
  const [showCorrespondenciaModal, setShowCorrespondenciaModal] = useState(false);
  const [correspondenciaInitialTab, setCorrespondenciaInitialTab] = useState<
    'Informes' | 'Solicitud' | 'Certificación' | 'Salidas'
  >('Salidas');
  const [showEntradasModal, setShowEntradasModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showDestinatariosModal, setShowDestinatariosModal] = useState(false);

  // Recipient selection callback modal state
  const [destinatarioPickerState, setDestinatarioPickerState] = useState<{
    isOpen: boolean;
    title: string;
    callbackFn?: (dest: ExportDestinoData) => void;
  }>({
    isOpen: false,
    title: 'Selecciona el Destinatario del Documento'
  });

  const handleSolicitarDestino = (titulo: string, callbackFn: (dest: ExportDestinoData) => void) => {
    setDestinatarioPickerState({
      isOpen: true,
      title: titulo,
      callbackFn
    });
  };

  const handleLoginSuccess = (loggedUser: Usuario) => {
    setUsuario(loggedUser);
    setShowLoginModal(false);
    showToast('success', 'Sesión Iniciada', `Bienvenido al sistema, ${loggedUser.nombreMostrar}.`);
  };

  const handleLogout = () => {
    setUsuario({
      id: 'usr_guest',
      usuario: 'invitado',
      nombreMostrar: 'Operador Invitado',
      rol: 'Consulta'
    });
    showToast('info', 'Sesión Cerrada', 'Has salido del sistema.');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Navigation Header */}
      <Header
        usuario={usuario}
        onOpenDespachoModal={() => setShowDespachoModal(true)}
        onOpenCorrespondenciaModal={(tab) => {
          setCorrespondenciaInitialTab(tab);
          setShowCorrespondenciaModal(true);
        }}
        onOpenEntradasModal={() => setShowEntradasModal(true)}
        onOpenExcelModal={() => setShowExcelModal(true)}
        onOpenDestinatariosModal={() => setShowDestinatariosModal(true)}
        onOpenAyudaModal={() => setShowAyudaModal(true)}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner Quick Actions Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <button
            onClick={() => setShowDespachoModal(true)}
            className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-cyan-500/50 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group transition-all cursor-pointer shadow-lg"
          >
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
              Despacho Global
            </span>
          </button>

          <button
            onClick={() => {
              setCorrespondenciaInitialTab('Salidas');
              setShowCorrespondenciaModal(true);
            }}
            className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-cyan-500/50 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group transition-all cursor-pointer shadow-lg"
          >
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
              Salidas Almacén
            </span>
          </button>

          <button
            onClick={() => setShowEntradasModal(true)}
            className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-emerald-500/50 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group transition-all cursor-pointer shadow-lg"
          >
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
              Entrada Mercancía
            </span>
          </button>

          <button
            onClick={() => {
              setCorrespondenciaInitialTab('Informes');
              setShowCorrespondenciaModal(true);
            }}
            className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-blue-500/50 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group transition-all cursor-pointer shadow-lg"
          >
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
              Correspondencia
            </span>
          </button>

          <button
            onClick={() => setShowExcelModal(true)}
            className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-amber-500/50 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group transition-all cursor-pointer shadow-lg"
          >
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
              Analizador Excel
            </span>
          </button>

          <button
            onClick={() => setShowDestinatariosModal(true)}
            className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-purple-500/50 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group transition-all cursor-pointer shadow-lg"
          >
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
              Destinatarios
            </span>
          </button>
        </div>

        {/* Primary Module: Control de Agua Purificada */}
        <ControlAguaSection
          usuarioNombre={usuario.nombreMostrar}
          onShowToast={showToast}
          onSolicitarDestino={handleSolicitarDestino}
        />
      </main>

      {/* Footer System Status */}
      <footer className="border-t border-gray-900 bg-gray-950 py-4 px-6 text-center text-xs text-gray-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2025 Hospital Infantil Dr. José M. Rodríguez J. — Sistema de Almacén e Insumos</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-400 text-[11px]">Firestore Online: named-amphora-q54g5</span>
          </div>
        </div>
      </footer>

      {/* Active System Modals */}
      <LoginModal isOpen={showLoginModal} onLoginSuccess={handleLoginSuccess} />

      <AyudaModal isOpen={showAyudaModal} onClose={() => setShowAyudaModal(false)} />

      <DespachoGlobalModal
        isOpen={showDespachoModal}
        onClose={() => setShowDespachoModal(false)}
        usuarioNombre={usuario.nombreMostrar}
        onShowToast={showToast}
        onSolicitarDestino={handleSolicitarDestino}
      />

      <CorrespondenciaModal
        isOpen={showCorrespondenciaModal}
        onClose={() => setShowCorrespondenciaModal(false)}
        initialTab={correspondenciaInitialTab}
        usuarioNombre={usuario.nombreMostrar}
        onShowToast={showToast}
        onSolicitarDestino={handleSolicitarDestino}
      />

      <EntradasMercanciaModal
        isOpen={showEntradasModal}
        onClose={() => setShowEntradasModal(false)}
        onShowToast={showToast}
        onSolicitarDestino={handleSolicitarDestino}
      />

      <AnalizadorExcelModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        areaNombre="Almacén Central"
        onShowToast={showToast}
        onSolicitarDestino={handleSolicitarDestino}
      />

      <DestinatariosModal
        isOpen={showDestinatariosModal}
        onClose={() => setShowDestinatariosModal(false)}
        mode="manage"
        onShowToast={showToast}
      />

      {/* Picker Modal for PDF recipient selection */}
      <DestinatariosModal
        isOpen={destinatarioPickerState.isOpen}
        onClose={() => setDestinatarioPickerState({ isOpen: false, title: '' })}
        mode="select"
        selectionTitle={destinatarioPickerState.title}
        onSelectDestinatario={(destData) => {
          if (destinatarioPickerState.callbackFn) {
            destinatarioPickerState.callbackFn(destData);
          }
        }}
        onShowToast={showToast}
      />
    </div>
  );
}
