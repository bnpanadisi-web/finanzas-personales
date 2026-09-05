'use client';
import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, WalletCards } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuentas: string[];
  onAgregarCuenta: (nombre: string) => boolean;
  onEditarCuenta: (nombreViejo: string, nombreNuevo: string) => boolean;
  onEliminarCuenta: (nombre: string) => boolean;
  darkMode: boolean;
}

export function AccountModal({
  isOpen,
  onClose,
  cuentas,
  onAgregarCuenta,
  onEditarCuenta,
  onEliminarCuenta,
  darkMode,
}: AccountModalProps) {
  const [nuevaCuenta, setNuevaCuenta] = useState('');
  const [cuentaEditando, setCuentaEditando] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [cuentaEliminando, setCuentaEliminando] = useState<string | null>(null);

  if (!isOpen) return null;

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCuenta.trim()) return;
    const ok = onAgregarCuenta(nuevaCuenta.trim());
    if (ok) setNuevaCuenta('');
  };

  const handleIniciarEdicion = (cuenta: string) => {
    setCuentaEditando(cuenta);
    setNombreEditado(cuenta);
  };

  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaEditando || !nombreEditado.trim()) return;
    const ok = onEditarCuenta(cuentaEditando, nombreEditado.trim());
    if (ok) {
      setCuentaEditando(null);
      setNombreEditado('');
    }
  };

  const handleConfirmarEliminar = (cuenta: string) => {
    onEliminarCuenta(cuenta);
    setCuentaEliminando(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        className={`${cardBg} p-5 sm:p-6 rounded-3xl w-full max-w-sm shadow-2xl border text-slate-800 dark:text-slate-100 flex flex-col max-h-[85vh]`}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <WalletCards size={20} />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Cuentas y Billeteras</h3>
              <p className="text-[11px] text-slate-400">Administra tus métodos de pago</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario Agregar */}
        <form onSubmit={handleAgregar} className="pt-3 pb-2 flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="Nueva cuenta (ej. Ualá, Efectivo USD...)"
            value={nuevaCuenta}
            onChange={e => setNuevaCuenta(e.target.value)}
            className={`flex-1 p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
          />
          <button
            type="submit"
            className="py-2.5 px-3 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus size={14} />
            <span>Agregar</span>
          </button>
        </form>

        {/* Lista de Cuentas */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-1 max-h-60">
          {cuentas.map(cta => {
            const isEditing = cuentaEditando === cta;

            if (isEditing) {
              return (
                <form
                  key={cta}
                  onSubmit={handleGuardarEdicion}
                  className="flex items-center gap-1.5 p-2 rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50/40 dark:bg-sky-950/20"
                >
                  <input
                    type="text"
                    value={nombreEditado}
                    onChange={e => setNombreEditado(e.target.value)}
                    autoFocus
                    className={`flex-1 p-1.5 border rounded-lg text-xs font-bold outline-none ${inputBg}`}
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                    title="Guardar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCuentaEditando(null)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200"
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </form>
              );
            }

            return (
              <div
                key={cta}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm">💳</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {cta}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleIniciarEdicion(cta)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    title="Editar nombre"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCuentaEliminando(cta)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Eliminar cuenta"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Diálogo de confirmación para eliminar */}
        {cuentaEliminando && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 space-y-2 mt-2 shrink-0 animate-in fade-in duration-150">
            <p className="text-xs font-bold">
              ¿Eliminar la cuenta &quot;{cuentaEliminando}&quot;?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCuentaEliminando(null)}
                className="py-1 px-2.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmarEliminar(cuentaEliminando)}
                className="py-1 px-2.5 rounded-lg text-xs font-bold bg-rose-600 text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
