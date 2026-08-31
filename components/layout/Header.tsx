'use client';
import React, { useState } from 'react';
import {
  Plane,
  Download,
  Sun,
  Moon,
  Eye,
  EyeOff,
  LogOut,
  UploadCloud,
  TrendingUp,
} from 'lucide-react';
import { RatesData } from '@/types';

interface HeaderProps {
  modoViaje: boolean;
  setModoViaje: (val: boolean) => void;
  registrosViajeCount: number;
  onSincronizarViaje: () => void;
  onExportar: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  ocultarMontos: boolean;
  toggleOcultarMontos: () => void;
  onLogout: () => void;
  rates: RatesData;
}

export function Header({
  modoViaje,
  setModoViaje,
  registrosViajeCount,
  onSincronizarViaje,
  onExportar,
  darkMode,
  toggleDarkMode,
  ocultarMontos,
  toggleOcultarMontos,
  onLogout,
  rates,
}: HeaderProps) {
  const [mostrarRates, setMostrarRates] = useState(false);

  const cardBg = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-300'
    : 'bg-white border-slate-200 text-slate-600';

  return (
    <header className="mb-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
        {/* Título & Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
              {modoViaje ? '✈️ Modo Viaje' : 'Mis Finanzas'}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Gestión personal y control de gastos
            </p>
          </div>

          {/* Dólar Ticker en Desktop */}
          {rates.blue && (
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                <TrendingUp size={13} />
                Blue: ${rates.blue.venta.toLocaleString('es-AR')}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-sky-500 font-bold">
                MEP: ${rates.mep?.venta.toLocaleString('es-AR') || '-'}
              </span>
            </div>
          )}

          {/* Dólar Badge en Mobile */}
          {rates.blue && (
            <button
              onClick={() => setMostrarRates(!mostrarRates)}
              className="md:hidden flex items-center gap-1 text-xs text-emerald-500 font-bold hover:underline"
            >
              <TrendingUp size={13} />
              Dólar: ${rates.blue.venta.toLocaleString('es-AR')}
            </button>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
          {/* Sincronizar Modo Viaje si hay datos guardados */}
          {!modoViaje && registrosViajeCount > 0 && (
            <button
              onClick={onSincronizarViaje}
              title={`Sincronizar ${registrosViajeCount} gastos de viaje a Supabase`}
              className="p-2 sm:px-3 sm:py-2 border rounded-xl shadow-sm transition-all active:scale-95 bg-sky-500 hover:bg-sky-600 text-white border-sky-400 animate-pulse flex items-center gap-1.5 text-xs font-bold"
            >
              <UploadCloud size={17} />
              <span className="hidden sm:inline">Sincronizar Viaje ({registrosViajeCount})</span>
            </button>
          )}

          {/* Botón Modo Viaje */}
          <button
            onClick={() => setModoViaje(!modoViaje)}
            title={modoViaje ? 'Desactivar Modo Viaje' : 'Activar Modo Viaje (Sin Conexión)'}
            className={`p-2 sm:px-3 sm:py-2 border rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold ${
              modoViaje
                ? 'bg-sky-500 border-sky-400 text-white animate-pulse'
                : cardBg
            }`}
            aria-label="Modo Viaje"
          >
            <Plane size={17} />
            <span className="hidden lg:inline">{modoViaje ? 'En Viaje' : 'Modo Viaje'}</span>
          </button>

          {/* Exportar CSV */}
          <button
            onClick={onExportar}
            title="Exportar a Excel (CSV)"
            className={`p-2 sm:px-3 sm:py-2 border rounded-xl shadow-sm transition-all active:scale-95 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-bold ${cardBg}`}
            aria-label="Exportar"
          >
            <Download size={17} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Tema Oscuro / Claro */}
          <button
            onClick={toggleDarkMode}
            title="Cambiar tema"
            className={`p-2 sm:p-2.5 border rounded-xl shadow-sm transition-all active:scale-95 ${
              darkMode ? 'text-yellow-400' : 'text-slate-600'
            } ${cardBg}`}
            aria-label="Cambiar tema"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Ocultar / Mostrar montos */}
          <button
            onClick={toggleOcultarMontos}
            title={ocultarMontos ? 'Mostrar montos' : 'Ocultar montos'}
            className={`p-2 sm:p-2.5 border rounded-xl shadow-sm active:scale-95 transition-all ${cardBg}`}
            aria-label="Privacidad"
          >
            {ocultarMontos ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>

          {/* Cerrar Sesión */}
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className={`p-2 sm:p-2.5 border rounded-xl shadow-sm active:scale-95 transition-all hover:text-rose-500 ${cardBg}`}
            aria-label="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>

      {/* Tarjeta Desplegable en Mobile para Cotizaciones */}
      {mostrarRates && (
        <div className={`md:hidden mt-3 p-3 rounded-2xl border shadow-sm text-xs grid grid-cols-3 gap-2 animate-in fade-in duration-150 ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-semibold block">Dólar Blue</span>
            <span className="font-bold text-emerald-500">${rates.blue?.venta || '-'}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-semibold block">Dólar MEP</span>
            <span className="font-bold text-sky-500">${rates.mep?.venta || '-'}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-semibold block">Dólar Oficial</span>
            <span className="font-bold text-slate-500">${rates.oficial?.venta || '-'}</span>
          </div>
        </div>
      )}
    </header>
  );
}
