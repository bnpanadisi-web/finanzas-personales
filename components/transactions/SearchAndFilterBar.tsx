'use client';
import React from 'react';
import { Search, X } from 'lucide-react';
import { Category } from '@/types';
import { DEFAULT_ACCOUNTS, MESES_NOMBRES } from '@/lib/constants';

interface SearchAndFilterBarProps {
  busqueda: string;
  setBusqueda: (val: string) => void;
  tipoFiltro: string;
  setTipoFiltro: (val: string) => void;
  cuentaFiltro: string;
  setCuentaFiltro: (val: string) => void;
  monedaFiltro: string;
  setMonedaFiltro: (val: string) => void;
  mesFiltro?: number;
  setMesFiltro?: (val: number) => void;
  anioFiltro?: number;
  setAnioFiltro?: (val: number) => void;
  mostrarFiltroFecha?: boolean;
  categorias: Category[];
  darkMode: boolean;
}

export function SearchAndFilterBar({
  busqueda,
  setBusqueda,
  tipoFiltro,
  setTipoFiltro,
  cuentaFiltro,
  setCuentaFiltro,
  monedaFiltro,
  setMonedaFiltro,
  mesFiltro,
  setMesFiltro,
  anioFiltro,
  setAnioFiltro,
  mostrarFiltroFecha = false,
  darkMode,
}: SearchAndFilterBarProps) {
  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xs';
  const inputBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

  const hayFiltrosActivos =
    busqueda.trim() !== '' ||
    tipoFiltro !== 'todos' ||
    cuentaFiltro !== 'todas' ||
    monedaFiltro !== 'todas';

  const limpiarFiltros = () => {
    setBusqueda('');
    setTipoFiltro('todos');
    setCuentaFiltro('todas');
    setMonedaFiltro('todas');
  };

  return (
    <div className={`${cardBg} p-3 rounded-2xl mb-4 border w-full box-border space-y-2.5 transition-all`}>
      {/* Selector de Mes y Año si es Historial */}
      {mostrarFiltroFecha && setMesFiltro && setAnioFiltro && (
        <div className="flex gap-2">
          <select
            value={mesFiltro}
            onChange={e => setMesFiltro(Number(e.target.value))}
            className={`flex-1 p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
          >
            {MESES_NOMBRES.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={anioFiltro}
            onChange={e => setAnioFiltro(Number(e.target.value))}
            className={`w-24 p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
          >
            {[2024, 2025, 2026, 2027, 2028].map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Barra de Búsqueda por Texto */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Buscar por descripción, categoría..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className={`w-full pl-9 pr-8 py-2.5 border rounded-xl text-xs outline-none focus:ring-1 ${inputBg}`}
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filtros en Píldoras */}
      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
        {/* Filtro Tipo */}
        <select
          value={tipoFiltro}
          onChange={e => setTipoFiltro(e.target.value)}
          className={`p-2 border rounded-xl text-[11px] font-bold outline-none ${inputBg}`}
        >
          <option value="todos">Todos los Tipos</option>
          <option value="gasto">Solo Gastos</option>
          <option value="ingreso">Solo Ingresos</option>
          <option value="transferencia">Transferencias</option>
        </select>

        {/* Filtro Cuenta */}
        <select
          value={cuentaFiltro}
          onChange={e => setCuentaFiltro(e.target.value)}
          className={`p-2 border rounded-xl text-[11px] font-bold outline-none ${inputBg}`}
        >
          <option value="todas">Todas las Cuentas</option>
          {DEFAULT_ACCOUNTS.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Filtro Moneda */}
        <select
          value={monedaFiltro}
          onChange={e => setMonedaFiltro(e.target.value)}
          className={`p-2 border rounded-xl text-[11px] font-bold outline-none ${inputBg}`}
        >
          <option value="todas">ARS y USD</option>
          <option value="ARS">Solo ARS ($)</option>
          <option value="USD">Solo USD (US$)</option>
        </select>
      </div>

      {hayFiltrosActivos && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-[11px] text-rose-500 hover:underline font-bold flex items-center gap-1"
          >
            <X size={12} /> Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
