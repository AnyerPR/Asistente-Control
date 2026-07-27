import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirmar Eliminación',
  message,
  itemName,
  confirmText = 'Sí, Eliminar',
  cancelText = 'Cancelar',
  onConfirm,
  onClose,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-gray-900 border border-red-500/30 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 relative text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-red-950/80 border border-red-800/50 rounded-2xl text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
            <p className="text-xs text-red-300/80 mt-0.5">Esta acción es irreversible y eliminará los datos de Firestore.</p>
          </div>
        </div>

        <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-3.5 mb-5 text-sm text-gray-300">
          <p>{message}</p>
          {itemName && (
            <p className="mt-2 text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 p-2 rounded-lg break-words">
              "{itemName}"
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> {loading ? 'Eliminando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
