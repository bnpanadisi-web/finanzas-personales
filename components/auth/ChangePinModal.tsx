'use client';
import React, { useState } from 'react';
import { X, KeyRound, Check, AlertCircle } from 'lucide-react';
import { verifyPin, saveCustomPin } from '@/lib/security';
import { useToast } from '@/components/ui/Toast';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export function ChangePinModal({
  isOpen,
  onClose,
  darkMode,
}: ChangePinModalProps) {
  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirmar, setPinConfirmar] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { success, error } = useToast();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Validar PIN actual
    if (!verifyPin(pinActual)) {
      setErrorMsg('El PIN actual no es correcto.');
      error('El PIN actual no es correcto');
      return;
    }

    // 2. Validar nuevo PIN
    if (!/^\d{4,6}$/.test(pinNuevo)) {
      setErrorMsg('El nuevo PIN debe tener entre 4 y 6 dígitos numéricos.');
      return;
    }

    // 3. Validar coincidencia
    if (pinNuevo !== pinConfirmar) {
      setErrorMsg('El nuevo PIN y su confirmación no coinciden.');
      return;
    }

    // 4. Guardar
    const guardado = saveCustomPin(pinNuevo);
    if (guardado) {
      success('PIN de seguridad actualizado con éxito');
      setPinActual('');
      setPinNuevo('');
      setPinConfirmar('');
      setErrorMsg('');
      onClose();
    } else {
      setErrorMsg('No se pudo guardar el nuevo PIN.');
    }
  };

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        className={`${cardBg} p-5 sm:p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl border text-slate-800 dark:text-slate-100`}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Cambiar PIN</h3>
              <p className="text-[11px] text-slate-400">Protege tu acceso personal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2 font-medium">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              PIN Actual:
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Ingresa tu PIN actual"
              value={pinActual}
              onChange={e => setPinActual(e.target.value.replace(/\D/g, ''))}
              required
              className={`w-full p-2.5 border rounded-xl text-sm font-bold tracking-widest outline-none transition-all ${inputBg}`}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              Nuevo PIN (4 a 6 dígitos):
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pinNuevo}
              onChange={e => setPinNuevo(e.target.value.replace(/\D/g, ''))}
              required
              className={`w-full p-2.5 border rounded-xl text-sm font-bold tracking-widest outline-none transition-all ${inputBg}`}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              Confirmar Nuevo PIN:
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pinConfirmar}
              onChange={e => setPinConfirmar(e.target.value.replace(/\D/g, ''))}
              required
              className={`w-full p-2.5 border rounded-xl text-sm font-bold tracking-widest outline-none transition-all ${inputBg}`}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check size={16} />
              <span>Guardar PIN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
