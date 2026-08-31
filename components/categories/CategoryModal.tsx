'use client';
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ICONOS_DISPONIBLES } from '@/lib/constants';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrearCategoria: (nombre: string, tipo: 'ingreso' | 'gasto', icono: string) => Promise<boolean>;
  tipoPorDefecto: 'ingreso' | 'gasto';
  darkMode: boolean;
}

export function CategoryModal({
  isOpen,
  onClose,
  onCrearCategoria,
  tipoPorDefecto = 'gasto',
  darkMode,
}: CategoryModalProps) {
  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>(tipoPorDefecto);
  const [nombre, setNombre] = useState('');
  const [iconoSeleccionado, setIconoSeleccionado] = useState('ShoppingCart');
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setGuardando(true);
    const ok = await onCrearCategoria(nombre.trim(), tipo, iconoSeleccionado);
    setGuardando(false);

    if (ok) {
      setNombre('');
      onClose();
    }
  };

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className={`${cardBg} p-5 rounded-3xl w-full max-w-xs space-y-4 shadow-2xl border text-slate-800 dark:text-slate-100`}
      >
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-base">Nueva Categoría</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selector Tipo */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTipo('gasto')}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
              tipo === 'gasto'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Gasto
          </button>
          <button
            type="button"
            onClick={() => setTipo('ingreso')}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
              tipo === 'ingreso'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Ingreso
          </button>
        </div>

        {/* Nombre */}
        <input
          type="text"
          placeholder="Nombre de categoría"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
          required
          autoFocus
        />

        {/* Catálogo de Íconos */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
            Selecciona un Ícono:
          </p>
          <div className={`grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1.5 border rounded-2xl ${
            darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
          }`}>
            {Object.keys(ICONOS_DISPONIBLES).map(nombreIcono => {
              const IconComp = ICONOS_DISPONIBLES[nombreIcono];
              const isSelected = iconoSeleccionado === nombreIcono;

              return (
                <button
                  type="button"
                  key={nombreIcono}
                  onClick={() => setIconoSeleccionado(nombreIcono)}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                    isSelected
                      ? darkMode
                        ? 'bg-slate-100 text-slate-900 border-white scale-105 shadow-sm'
                        : 'bg-slate-900 text-white border-slate-900 scale-105 shadow-sm'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={nombreIcono}
                >
                  <IconComp size={18} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
