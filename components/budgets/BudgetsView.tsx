'use client';
import React, { useState } from 'react';
import { Target, Plus, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { Category, Transaction } from '@/types';
import { useBudgets } from '@/hooks/useBudgets';
import { formatCurrency, formatInputNumber, parseCurrencyInput } from '@/lib/formatters';

interface BudgetsViewProps {
  categorias: Category[];
  transaccionesMesActual: Transaction[];
  ocultarMontos: boolean;
  darkMode: boolean;
}

export function BudgetsView({
  categorias,
  transaccionesMesActual,
  ocultarMontos,
  darkMode,
}: BudgetsViewProps) {
  const { presupuestos, guardarPresupuesto, eliminarPresupuesto, calcularProgresoPresupuestos } =
    useBudgets();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(
    categorias.filter(c => c.tipo === 'gasto')[0]?.nombre || 'Supermercado'
  );
  const [montoInput, setMontoInput] = useState('');

  const categoriasGasto = categorias.filter(c => c.tipo === 'gasto');
  const progresos = calcularProgresoPresupuestos(transaccionesMesActual);

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseCurrencyInput(montoInput);
    if (!monto || monto <= 0) return;

    guardarPresupuesto(categoriaSeleccionada, monto);
    setMontoInput('');
    setModalAbierto(false);
  };

  const abrirEdicion = (cat: string, limite: number) => {
    setCategoriaSeleccionada(cat);
    setMontoInput(new Intl.NumberFormat('es-AR').format(limite));
    setModalAbierto(true);
  };

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xs';
  const inputBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

  const totalPresupuestado = presupuestos.reduce((sum, p) => sum + p.limiteARS, 0);
  const totalGastadoPresupuestos = progresos.reduce((sum, p) => sum + p.gastadoARS, 0);

  return (
    <div className="space-y-4 w-full box-border">
      {/* Resumen Global de Presupuestos */}
      <div className={`${cardBg} p-4 rounded-2xl border text-center relative`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Presupuesto Mensual
          </span>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl hover:bg-emerald-100 transition-all"
          >
            <Plus size={13} />
            Definir Límite
          </button>
        </div>

        <div className="flex justify-around items-center pt-1">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">TOTAL LÍMITE</span>
            <p className="text-base font-black text-slate-800 dark:text-slate-100">
              {formatCurrency(totalPresupuestado, 'ARS', ocultarMontos)}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">GASTADO REAL</span>
            <p
              className={`text-base font-black ${
                totalGastadoPresupuestos > totalPresupuestado ? 'text-rose-500' : 'text-emerald-500'
              }`}
            >
              {formatCurrency(totalGastadoPresupuestos, 'ARS', ocultarMontos)}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Presupuestos por Categoría */}
      <div className="space-y-3">
        <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400">
          Progreso por Categoría (Mes Actual)
        </h2>

        {progresos.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 font-medium">
              No tienes presupuestos configurados aún.
            </p>
            <button
              onClick={() => setModalAbierto(true)}
              className="mt-2 text-xs font-bold text-emerald-500 underline"
            >
              Crear mi primer presupuesto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {progresos.map(p => {
              let barColor = 'bg-emerald-500';
              if (p.excedido) barColor = 'bg-rose-500';
              else if (p.cercaDelLimite) barColor = 'bg-amber-500';

              return (
                <div key={p.categoria} className={`${cardBg} p-4 rounded-2xl border space-y-2.5 flex flex-col justify-between`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {p.categoria}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {formatCurrency(p.gastadoARS, 'ARS', ocultarMontos)} /{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(p.limiteARS, 'ARS', ocultarMontos)}
                      </span>
                    </span>
                    <button
                      onClick={() => abrirEdicion(p.categoria, p.limiteARS)}
                      className="p-1 text-slate-400 hover:text-slate-200"
                      title="Editar límite"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => eliminarPresupuesto(p.categoria)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.min(p.porcentajeARS, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>{p.porcentajeARS.toFixed(0)}% Utilizado</span>
                  {p.excedido && (
                    <span className="text-rose-500 flex items-center gap-1">
                      <AlertCircle size={11} /> ¡Presupuesto superado!
                    </span>
                  )}
                  {p.cercaDelLimite && (
                    <span className="text-amber-500 flex items-center gap-1">
                      <AlertCircle size={11} /> Cerca del límite
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Modal para Definir/Editar Presupuesto */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleGuardar}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 p-5 rounded-2xl w-full max-w-xs shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2">
              <Target size={20} className="text-emerald-500" />
              <h3 className="font-bold text-base">Definir Presupuesto Mensual</h3>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">Categoría:</label>
              <select
                value={categoriaSeleccionada}
                onChange={e => setCategoriaSeleccionada(e.target.value)}
                className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
              >
                {categoriasGasto.map(c => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">Límite mensual en ARS ($):</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ej. 150.000"
                value={montoInput}
                onChange={e => setMontoInput(formatInputNumber(e.target.value))}
                className={`w-full p-2.5 border rounded-xl text-sm font-bold outline-none ${inputBg}`}
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
