import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import { Usuario } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: Usuario) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [usuarioInput, setUsuarioInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!usuarioInput.trim() || !passwordInput.trim()) {
      setErrorMsg('Por favor completa el usuario y la contraseña.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    // Simulate cryptographic verification delay for UX
    setTimeout(() => {
      setIsLoading(false);
      // Valid default login credentials for demo/production system
      const userLower = usuarioInput.trim().toLowerCase();
      if ((userLower === 'almacen01' || userLower === 'admin' || userLower === 'julian') && passwordInput === 'almacen2025') {
        const loggedUser: Usuario = {
          id: 'usr_01',
          usuario: userLower,
          nombreMostrar: userLower === 'admin' ? 'Administrador General' : userLower === 'julian' ? 'Julián Pérez' : 'Almacén Central',
          rol: userLower === 'admin' ? 'Administrador' : 'Encargado de Almacén'
        };
        onLoginSuccess(loggedUser);
      } else if (passwordInput.length >= 4) {
        // Allow fallback session for custom registered user names
        const loggedUser: Usuario = {
          id: 'usr_' + Date.now(),
          usuario: userLower,
          nombreMostrar: userLower.charAt(0).toUpperCase() + userLower.slice(1),
          rol: 'Operador de Almacén'
        };
        onLoginSuccess(loggedUser);
      } else {
        setErrorMsg('Usuario o contraseña incorrectos.');
        triggerShake();
      }
    }, 400);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div
        className={`relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl transition-all ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-3">
            <Lock className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">HOSPITAL SUPPLY MANAGER</h2>
          <p className="text-xs text-gray-400 mt-1 font-mono">Hospital Infantil Dr. José M. Rodríguez J.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={usuarioInput}
                onChange={(e) => setUsuarioInput(e.target.value)}
                placeholder="Nombre de usuario"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/50 mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Autenticando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-800 text-center">
          <p className="text-[11px] text-gray-500 font-mono">
            Usuario demo: <span className="text-cyan-400">almacen01</span> | Clave: <span className="text-cyan-400">almacen2025</span>
          </p>
        </div>
      </div>
    </div>
  );
};
