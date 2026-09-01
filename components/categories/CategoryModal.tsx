'use client';
import React, { useState } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Search,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Category } from '@/types';
import {
  ICONOS_DISPONIBLES,
  EMOJIS_CATEGORIAS,
  getCategoryEmoji,
} from '@/lib/constants';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categorias: Category[];
  onCrearCategoria: (nombre: string, tipo: 'ingreso' | 'gasto', icono: string) => Promise<boolean>;
  onEditarCategoria: (
    id: number,
    updates: { nombre: string; tipo: 'ingreso' | 'gasto'; icono: string },
    anteriorNombre?: string
  ) => Promise<boolean>;
  onEliminarCategoria: (id: number) => Promise<boolean>;
  tipoPorDefecto?: 'ingreso' | 'gasto';
  darkMode: boolean;
}

export function CategoryModal({
  isOpen,
  onClose,
  categorias,
  onCrearCategoria,
  onEditarCategoria,
  onEliminarCategoria,
  tipoPorDefecto = 'gasto',
  darkMode,
}: CategoryModalProps) {
  // Pestaña tipo: gasto o ingreso
  const [tipoFiltro, setTipoFiltro] = useState<'ingreso' | 'gasto'>(tipoPorDefecto);
  const [busquedaCat, setBusquedaCat] = useState('');

  // Vista actual: 'lista' o 'formulario'
  const [vista, setVista] = useState<'lista' | 'formulario'>('lista');
  const [categoriaEditando, setCategoriaEditando] = useState<Category | null>(null);

  // Estados del Formulario
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>(tipoPorDefecto);
  const [iconoSeleccionado, setIconoSeleccionado] = useState('ShoppingCart');
  const [subpestanaIconos, setSubpestanaIconos] = useState<'emojis' | 'vectoriales'>('emojis');
  const [guardando, setGuardando] = useState(false);

  // Diálogo de confirmación para eliminar
  const [idEliminando, setIdEliminando] = useState<number | null>(null);

  if (!isOpen) return null;

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

  // Abrir formulario para NUEVA categoría
  const abrirCrear = () => {
    setCategoriaEditando(null);
    setNombre('');
    setTipo(tipoFiltro);
    setIconoSeleccionado(tipoFiltro === 'ingreso' ? '💰' : '🛒');
    setVista('formulario');
  };

  // Abrir formulario para EDITAR categoría existente
  const abrirEditar = (cat: Category) => {
    setCategoriaEditando(cat);
    setNombre(cat.nombre);
    setTipo(cat.tipo);
    setIconoSeleccionado(cat.icono);
    setVista('formulario');
  };

  // Guardar (Crear o Editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setGuardando(true);
    let ok = false;

    if (categoriaEditando) {
      ok = await onEditarCategoria(
        categoriaEditando.id,
        {
          nombre: nombre.trim(),
          tipo,
          icono: iconoSeleccionado,
        },
        categoriaEditando.nombre
      );
    } else {
      ok = await onCrearCategoria(nombre.trim(), tipo, iconoSeleccionado);
    }

    setGuardando(false);
    if (ok) {
      setVista('lista');
    }
  };

  // Confirmar eliminación
  const handleEliminar = async (id: number) => {
    await onEliminarCategoria(id);
    setIdEliminando(null);
  };

  // Categorías filtradas por tipo y búsqueda
  const categoriasFiltradas = categorias
    .filter(c => c.tipo === tipoFiltro)
    .filter(c => c.nombre.toLowerCase().includes(busquedaCat.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        className={`${cardBg} p-5 sm:p-6 rounded-3xl w-full max-w-md shadow-2xl border text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]`}
      >
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            {vista === 'formulario' ? (
              <button
                type="button"
                onClick={() => setVista('lista')}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Volver a la lista"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Sparkles size={18} />
              </div>
            )}
            <div>
              <h3 className="font-black text-base leading-tight">
                {vista === 'formulario'
                  ? categoriaEditando
                    ? 'Editar Categoría'
                    : 'Nueva Categoría'
                  : 'Gestionar Categorías'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {vista === 'formulario'
                  ? 'Personaliza el nombre y elige el icono'
                  : 'Edita, personaliza o crea tus categorías'}
              </p>
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

        {/* CONTENIDO SEGÚN LA VISTA */}
        {vista === 'lista' ? (
          <div className="flex flex-col flex-1 overflow-hidden pt-3 space-y-3">
            {/* Selector Tipo: Gastos / Ingresos */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setTipoFiltro('gasto')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tipoFiltro === 'gasto'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Gastos
              </button>
              <button
                type="button"
                onClick={() => setTipoFiltro('ingreso')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tipoFiltro === 'ingreso'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Ingresos
              </button>
            </div>

            {/* Barra de Búsqueda y Botón Nueva Categoría */}
            <div className="flex gap-2 shrink-0">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={busquedaCat}
                  onChange={e => setBusquedaCat(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 border rounded-xl text-xs outline-none ${inputBg}`}
                />
              </div>

              <button
                type="button"
                onClick={abrirCrear}
                className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center gap-1 shrink-0 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Nueva</span>
              </button>
            </div>

            {/* Lista de Categorías con Scroll */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-72">
              {categoriasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No se encontraron categorías.
                </div>
              ) : (
                categoriasFiltradas.map(cat => {
                  const IconComp = ICONOS_DISPONIBLES[cat.icono];
                  const emoji = getCategoryEmoji(cat.icono);

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                          {IconComp ? (
                            <IconComp size={16} className="text-slate-700 dark:text-slate-200" />
                          ) : (
                            <span className="text-base leading-none">{emoji}</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {cat.nombre}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Cambiar nombre o icono"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdEliminando(cat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Eliminar categoría"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Alerta de confirmación para eliminar */}
            {idEliminando && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 space-y-2 shrink-0 animate-in fade-in duration-150">
                <p className="text-xs font-bold">
                  ¿Seguro que deseas eliminar esta categoría?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIdEliminando(null)}
                    className="py-1 px-2.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEliminar(idEliminando)}
                    className="py-1 px-2.5 rounded-lg text-xs font-bold bg-rose-600 text-white"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VISTA: FORMULARIO DE CREACIÓN / EDICIÓN */
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-hidden pt-3 space-y-3.5"
          >
            {/* Selector Tipo (Gasto / Ingreso) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
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

            {/* Input Nombre */}
            <div className="space-y-1 shrink-0">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                Nombre de la categoría:
              </label>
              <input
                type="text"
                placeholder="Ej. Gimnasio, Uber, Streaming..."
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
                required
                autoFocus
              />
            </div>

            {/* Previsualización de la Categoría */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 font-bold">Vista previa:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
                {ICONOS_DISPONIBLES[iconoSeleccionado] ? (
                  React.createElement(ICONOS_DISPONIBLES[iconoSeleccionado], {
                    size: 15,
                    className: 'text-slate-700 dark:text-slate-200',
                  })
                ) : (
                  <span className="text-base leading-none">
                    {getCategoryEmoji(iconoSeleccionado)}
                  </span>
                )}
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                  {nombre.trim() || 'Nombre de categoría'}
                </span>
              </div>
            </div>

            {/* Catálogo de Iconos y Emojis */}
            <div className="flex flex-col flex-1 overflow-hidden space-y-1.5">
              <div className="flex justify-between items-center shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Elige un icono o emoji:
                </span>
                {/* Switcher Emojis vs Vectoriales */}
                <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSubpestanaIconos('emojis')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      subpestanaIconos === 'emojis'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Emojis
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubpestanaIconos('vectoriales')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      subpestanaIconos === 'vectoriales'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Iconos
                  </button>
                </div>
              </div>

              {/* Grid de Emojis */}
              {subpestanaIconos === 'emojis' && (
                <div
                  className={`grid grid-cols-8 sm:grid-cols-10 gap-1.5 overflow-y-auto p-2 border rounded-2xl flex-1 max-h-48 ${
                    darkMode
                      ? 'border-slate-800 bg-slate-950/40'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  {EMOJIS_CATEGORIAS.map(emoji => {
                    const isSelected = iconoSeleccionado === emoji;
                    return (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setIconoSeleccionado(emoji)}
                        className={`p-1.5 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-2 border-amber-500 scale-110 shadow-xs'
                            : 'hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Grid de Iconos Vectoriales */}
              {subpestanaIconos === 'vectoriales' && (
                <div
                  className={`grid grid-cols-5 sm:grid-cols-6 gap-2 overflow-y-auto p-2 border rounded-2xl flex-1 max-h-48 ${
                    darkMode
                      ? 'border-slate-800 bg-slate-950/40'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  {Object.keys(ICONOS_DISPONIBLES).map(nombreIcono => {
                    const IconComp = ICONOS_DISPONIBLES[nombreIcono];
                    const isSelected = iconoSeleccionado === nombreIcono;

                    return (
                      <button
                        type="button"
                        key={nombreIcono}
                        onClick={() => setIconoSeleccionado(nombreIcono)}
                        className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
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
              )}
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2 pt-2 shrink-0 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setVista('lista')}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Check size={16} />
                <span>
                  {guardando
                    ? 'Guardando...'
                    : categoriaEditando
                    ? 'Guardar Cambios'
                    : 'Crear Categoría'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
