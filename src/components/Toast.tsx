import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface SingleToastProps {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<SingleToastProps> = ({ type, title, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200',
    error: 'bg-red-950/95 border-red-500/50 text-red-200',
    info: 'bg-cyan-950/95 border-cyan-500/50 text-cyan-200'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full px-4 animate-bounce">
      <div className={`flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-2xl ${bgColors[type]}`}>
        {icons[type]}
        <div className="flex-1 text-xs">
          <h4 className="font-bold text-white mb-0.5">{title}</h4>
          <p className="opacity-90 leading-relaxed">{message}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => onClose(toast.id)} />
        </div>
      ))}
    </div>
  );
};
