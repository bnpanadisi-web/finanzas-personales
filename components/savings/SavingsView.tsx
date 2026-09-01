'use client';
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  X,
  Check,
} from 'lucide-react';
import { Currency, SavingsGoal } from '@/types';
import { PiggyBankIcon } from '@/components/ui/PiggyBankIcon';
import { formatCurrency, formatInputNumber, parseCurrencyInput } from '@/lib/formatters';

interface SavingsViewProps {
  goals: SavingsGoal[];
  onCrearMeta: (meta: Omit<SavingsGoal, 'id' | 'creadoEn' | 'historial'>) => string;
  onEditarMeta: (id: string, updates: Partial<SavingsGoal>) => void;
  onEliminarMeta: (id: string) => void;
  onDepositar: (id: string, monto: number, nota?: string) => boolean;
  onRetirar: (id: string, monto: number, nota?: string) => boolean;
  totalAhorradoARS: number;
  totalObjetivoARS: number;
  totalAhorradoUSD: number;
  totalObjetivoUSD: number;
  ocultarMontos: boolean;
  darkMode: boolean;
}

const EMOJIS_PRESET = ['🐷', '🏖️', '✈️', '🚗', '🏠', '🛡️', '💻', '📱', '🎓', '💍', '🎁', '🚀', '🎸', '👟'];

export function SavingsView({
  goals,
  onCrearMeta,
  onEditarMeta,
  onEliminarMeta,
  onDepositar,
  onRetirar,
  totalAhorradoARS,
  totalObjetivoARS,
  totalAhorradoUSD,
  totalObjetivoUSD,
  ocultarMontos,
  darkMode,
}: SavingsViewProps) {
  // Filtro de moneda
  const [filtroMoneda, setFiltroMoneda] = useState<'todas' | 'ARS' | 'USD'>('todas');

  // Modales
  const [modalMetaAbierto, setModalMetaAbierto] = useState(false);
  const [metaEditando, setMetaEditando] = useState<SavingsGoal | null>(null);

  // Formulario Meta
  const [nombreInput, setNombreInput] = useState('');
  const [objetivoInput, setObjetivoInput] = useState('');
  const [actualInput, setActualInput] = useState('');
  const [monedaInput, setMonedaInput] = useState<Currency>('ARS');
  const [iconoInput, setIconoInput] = useState('🐷');

  // Modal Aporte / Retiro rápido
  const [modalMovimientoAbierto, setModalMovimientoAbierto] = useState(false);
  const [metaMovimiento, setMetaMovimiento] = useState<SavingsGoal | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<'deposito' | 'retiro'>('deposito');
  const [montoMovimientoInput, setMontoMovimientoInput] = useState('');
  const [notaMovimiento, setNotaMovimiento] = useState('');

  // Metas filtradas
  const metasFiltradas = useMemo(() => {
    if (filtroMoneda === 'todas') return goals;
    return goals.filter(g => g.moneda === filtroMoneda);
  }, [goals, filtroMoneda]);

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs';
  const inputBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

  // Abrir Modal de Creación
  const abrirCrearMeta = () => {
    setMetaEditando(null);
    setNombreInput('');
    setObjetivoInput('');
    setActualInput('');
    setMonedaInput('ARS');
    setIconoInput('🐷');
    setModalMetaAbierto(true);
  };

  // Abrir Modal de Edición
  const abrirEditarMeta = (meta: SavingsGoal) => {
    setMetaEditando(meta);
    setNombreInput(meta.nombre);
    setObjetivoInput(meta.montoObjetivo.toLocaleString('es-AR'));
    setActualInput(meta.montoActual.toLocaleString('es-AR'));
    setMonedaInput(meta.moneda);
    setIconoInput(meta.icono || '🐷');
    setModalMetaAbierto(true);
  };

  // Guardar Meta (Crear o Editar)
  const handleGuardarMeta = (e: React.FormEvent) => {
    e.preventDefault();
    const objetivo = parseCurrencyInput(objetivoInput);
    const actual = actualInput ? parseCurrencyInput(actualInput) : 0;
    if (!nombreInput.trim() || objetivo <= 0) return;

    if (metaEditando) {
      onEditarMeta(metaEditando.id, {
        nombre: nombreInput.trim(),
        montoObjetivo: objetivo,
        montoActual: actual,
        moneda: monedaInput,
        icono: iconoInput,
      });
    } else {
      onCrearMeta({
        nombre: nombreInput.trim(),
        montoObjetivo: objetivo,
        montoActual: actual,
        moneda: monedaInput,
        icono: iconoInput,
      });
    }

    setModalMetaAbierto(false);
  };

  // Abrir Modal de Depósito o Retiro Rápido
  const abrirModalMovimiento = (meta: SavingsGoal, tipo: 'deposito' | 'retiro') => {
    setMetaMovimiento(meta);
    setTipoMovimiento(tipo);
    setMontoMovimientoInput('');
    setNotaMovimiento('');
    setModalMovimientoAbierto(true);
  };

  // Ejecutar Depósito o Retiro Rápido
  const handleEjecutarMovimiento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaMovimiento) return;
    const monto = parseCurrencyInput(montoMovimientoInput);
    if (!monto || monto <= 0) return;

    if (tipoMovimiento === 'deposito') {
      onDepositar(metaMovimiento.id, monto, notaMovimiento.trim() || undefined);
    } else {
      onRetirar(metaMovimiento.id, monto, notaMovimiento.trim() || undefined);
    }

    setModalMovimientoAbierto(false);
  };

  return (
    <div className="space-y-4 w-full box-border animate-in fade-in duration-200">
      {/* 1. Panel de Resumen Global de Reservas */}
      <div className={`${cardBg} p-4 sm:p-5 rounded-2xl border text-slate-800 dark:text-slate-100`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <PiggyBankIcon size={24} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight flex items-center gap-1.5">
                <span>Mis Reservas & Metas de Ahorro</span>
              </h2>
              <p className="text-xs text-slate-400">Fondos reservados y seguimiento de objetivos</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Filtro Moneda */}
            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFiltroMoneda('todas')}
                className={`py-1 px-2.5 rounded-lg transition-all ${
                  filtroMoneda === 'todas'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFiltroMoneda('ARS')}
                className={`py-1 px-2.5 rounded-lg transition-all ${
                  filtroMoneda === 'ARS'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                ARS ($)
              </button>
              <button
                type="button"
                onClick={() => setFiltroMoneda('USD')}
                className={`py-1 px-2.5 rounded-lg transition-all ${
                  filtroMoneda === 'USD'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                USD (US$)
              </button>
            </div>

            <button
              onClick={abrirCrearMeta}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Nueva Reserva</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Totales Acumulados */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Reservado (ARS)</span>
            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(totalAhorradoARS, 'ARS', ocultarMontos)}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">
              Meta: {formatCurrency(totalObjetivoARS, 'ARS', ocultarMontos)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Reservado (USD)</span>
            <p className="text-base sm:text-lg font-black text-sky-600 dark:text-sky-400 tracking-tight">
              {formatCurrency(totalAhorradoUSD, 'USD', ocultarMontos)}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">
              Meta: {formatCurrency(totalObjetivoUSD, 'USD', ocultarMontos)}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between sm:flex-col sm:items-start sm:justify-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Metas Activas</span>
              <p className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                {goals.length} {goals.length === 1 ? 'objetivo' : 'objetivos'}
              </p>
            </div>
            <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
              <Sparkles size={14} />
              <span>Ahorro Activo</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Lista de Metas / Reservas */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Metas de Ahorro ({metasFiltradas.length})
          </h3>
        </div>

        {metasFiltradas.length === 0 ? (
          <div className={`${cardBg} p-8 rounded-2xl border text-center space-y-3`}>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
              <PiggyBankIcon size={24} />
            </div>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              No tienes ninguna reserva configurada en esta vista.
            </p>
            <button
              onClick={abrirCrearMeta}
              className="py-2 px-4 rounded-xl text-xs font-black bg-amber-500 text-white shadow-sm hover:bg-amber-600 transition-all cursor-pointer"
            >
              Crear mi primera Reserva
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metasFiltradas.map(goal => {
              const porcentaje = goal.montoObjetivo > 0 ? (goal.montoActual / goal.montoObjetivo) * 100 : 0;
              const completada = goal.montoActual >= goal.montoObjetivo;
              const restante = Math.max(0, goal.montoObjetivo - goal.montoActual);

              let barColor = 'bg-amber-500';
              if (completada) barColor = 'bg-emerald-500';
              else if (porcentaje >= 70) barColor = 'bg-sky-500';

              return (
                <div
                  key={goal.id}
                  className={`${cardBg} p-4 sm:p-5 rounded-2xl border flex flex-col justify-between space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all`}
                >
                  {/* Cabecera de la Tarjeta */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
                        {goal.icono || '🐷'}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 leading-tight">
                          {goal.nombre}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Meta en {goal.moneda}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirEditarMeta(goal)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Editar reserva"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onEliminarMeta(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Eliminar reserva"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Montos y Progreso */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400 font-bold">Acumulado:</span>
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(goal.montoActual, goal.moneda, ocultarMontos)}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 ml-1">
                          / {formatCurrency(goal.montoObjetivo, goal.moneda, ocultarMontos)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 shadow-xs ${barColor}`}
                        style={{ width: `${Math.min(100, Math.max(2, porcentaje))}%` }}
                      />
                    </div>

                    {/* Estado y Porcentaje */}
                    <div className="flex justify-between items-center text-[11px] font-bold pt-0.5">
                      <span className="text-slate-500 dark:text-slate-400">
                        {porcentaje.toFixed(1)}% completado
                      </span>
                      {completada ? (
                        <span className="text-emerald-500 flex items-center gap-1 font-black">
                          <CheckCircle2 size={13} /> ¡Meta alcanzada!
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          Faltan {formatCurrency(restante, goal.moneda, ocultarMontos)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones Rápidas (+ Aporte / - Retiro) */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => abrirModalMovimiento(goal, 'deposito')}
                      className="py-2 px-2.5 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      <ArrowUpRight size={14} className="shrink-0" />
                      <span>+ Aportar</span>
                    </button>
                    <button
                      onClick={() => abrirModalMovimiento(goal, 'retiro')}
                      className="py-2 px-2.5 rounded-xl text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      <ArrowDownRight size={14} className="shrink-0" />
                      <span>- Retirar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Modal de Creación / Edición de Reserva */}
      {modalMetaAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form
            onSubmit={handleGuardarMeta}
            className={`${cardBg} p-5 sm:p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl border text-slate-800 dark:text-slate-100`}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <PiggyBankIcon size={20} />
                </div>
                <h3 className="font-black text-base">
                  {metaEditando ? 'Editar Reserva' : 'Nueva Reserva de Ahorro'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalMetaAbierto(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Motivo / Nombre */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                Motivo / Nombre del Ahorro:
              </label>
              <input
                type="text"
                placeholder="Ej. Vacaciones, Auto nuevo, Fondo de Emergencia"
                value={nombreInput}
                onChange={e => setNombreInput(e.target.value)}
                required
                className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
              />
            </div>

            {/* Selector de Icono / Emoji */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                Icono Distintivo:
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {EMOJIS_PRESET.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIconoInput(emoji)}
                    className={`p-2 rounded-xl text-lg transition-all ${
                      iconoInput === emoji
                        ? 'bg-amber-500/20 border-2 border-amber-500 scale-110'
                        : 'bg-slate-100 dark:bg-slate-800 border border-transparent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Moneda & Monto Objetivo */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                  Moneda:
                </label>
                <select
                  value={monedaInput}
                  onChange={e => setMonedaInput(e.target.value as Currency)}
                  className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
                >
                  <option value="ARS">Pesos (ARS)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                  Monto Objetivo:
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej. 1.000.000"
                  value={objetivoInput}
                  onChange={e => setObjetivoInput(formatInputNumber(e.target.value))}
                  required
                  className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
                />
              </div>
            </div>

            {/* Saldo Inicial / Actual */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                {metaEditando ? 'Monto Ahorrado Actual:' : 'Monto Inicial (opcional):'}
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={actualInput}
                onChange={e => setActualInput(formatInputNumber(e.target.value))}
                className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalMetaAbierto(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check size={16} />
                <span>{metaEditando ? 'Guardar Cambios' : 'Crear Reserva'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Modal de Aporte / Retiro Rápido */}
      {modalMovimientoAbierto && metaMovimiento && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form
            onSubmit={handleEjecutarMovimiento}
            className={`${cardBg} p-5 sm:p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl border text-slate-800 dark:text-slate-100`}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{metaMovimiento.icono || '🐷'}</span>
                <div>
                  <h3 className="font-black text-sm">
                    {tipoMovimiento === 'deposito' ? 'Sumar Aporte a Reserva' : 'Retirar Fondos de Reserva'}
                  </h3>
                  <p className="text-[11px] text-slate-400">{metaMovimiento.nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMovimientoAbierto(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                Monto a {tipoMovimiento === 'deposito' ? 'Aportar' : 'Retirar'} ({metaMovimiento.moneda}):
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={montoMovimientoInput}
                onChange={e => setMontoMovimientoInput(formatInputNumber(e.target.value))}
                required
                autoFocus
                className={`w-full p-3 border rounded-xl text-base font-black text-center outline-none ${inputBg}`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                Nota / Motivo del movimiento (opcional):
              </label>
              <input
                type="text"
                placeholder={tipoMovimiento === 'deposito' ? 'Ej. Aporte mensual sueldo' : 'Ej. Compra de pasajes'}
                value={notaMovimiento}
                onChange={e => setNotaMovimiento(e.target.value)}
                className={`w-full p-2.5 border rounded-xl text-xs font-medium outline-none ${inputBg}`}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalMovimientoAbierto(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipoMovimiento === 'deposito'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                <Check size={16} />
                <span>{tipoMovimiento === 'deposito' ? 'Confirmar Aporte' : 'Confirmar Retiro'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
