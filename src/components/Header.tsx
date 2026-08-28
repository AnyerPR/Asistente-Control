import React from 'react';
import { Layers, Calendar, Users, HelpCircle, LogOut, PackageCheck } from 'lucide-react';
import { Usuario } from '../types';

interface HeaderProps {
  usuario: Usuario | null;
  onOpenDestinatarios: () => void;
  onOpenAyuda: () => void;
  onOpenDespachoGlobal: () => void;
  onCerrarSesion: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  usuario,
  onOpenDestinatarios,
  onOpenAyuda,
  onOpenDespachoGlobal,
  onCerrarSesion,
}) => {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40 px-6 py-3.5 flex flex-wrap justify-between items-center gap-3">
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Layers className="text-cyan-500 w-6 h-6" />
          HOSPITAL SUPPLY MANAGER
          <span className="text-xs bg-cyan-500/10 text-cyan-400 font-mono px-2 py-0.5 rounded-full border border-cyan-500/20">
            v3.1 Firestore
          </span>
        </h1>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span className="capitalize">{currentDate}</span>
          <span className="text-gray-600">|</span>
          <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Firestore Realtime Sync
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {usuario && (
          <span className="text-xs font-mono text-gray-300 bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="font-semibold text-white">{usuario.nombreMostrar}</span>
            <span className="text-[10px] text-gray-500 uppercase bg-gray-800 px-1.5 py-0.5 rounded">
              {usuario.rol}
            </span>
          </span>
        )}

        <button
          onClick={onOpenDespachoGlobal}
          className="bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
        >
          <PackageCheck className="w-4 h-4 text-cyan-400" /> Despacho Global
        </button>

        <button
          onClick={onOpenDestinatarios}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <Users className="w-4 h-4 text-amber-400" /> Destinatarios
        </button>

        <button
          onClick={onOpenAyuda}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm relative group"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" /> Ayuda
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full animate-ping"></span>
        </button>

        <button
          onClick={onCerrarSesion}
          className="bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4 text-red-400" /> Salir
        </button>
      </div>
    </header>
  );
};
