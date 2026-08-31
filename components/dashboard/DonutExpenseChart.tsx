'use client';
import React, { useState } from 'react';
import { PieChart as PieIcon, Tag } from 'lucide-react';
import { Category, Currency, Transaction } from '@/types';
import { COLORES_GRAFICO, ICONOS_DISPONIBLES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';

interface DonutExpenseChartProps {
  transacciones: Transaction[];
  categorias: Category[];
  ocultarMontos: boolean;
  darkMode: boolean;
  periodoNombre: string;
}

export function DonutExpenseChart({
  transacciones,
  categorias,
  ocultarMontos,
  darkMode,
  periodoNombre,
}: DonutExpenseChartProps) {
  const [monedaSeleccionada, setMonedaSeleccionada] = useState<Currency>('ARS');
  const [categoriaHover, setCategoriaHover] = useState<string | null>(null);

  // Filtrar solo gastos del período y de la moneda seleccionada
  const gastosPeriodo = transacciones.filter(
    r => r.tipo === 'gasto' && (r.moneda || 'ARS') === monedaSeleccionada
  );

  // Total gastado en la moneda
  const totalGastado = gastosPeriodo.reduce((acc, r) => acc + Number(r.monto), 0);

  // Agrupar por categoría
  const agrupadoPorCategoria = gastosPeriodo.reduce((acc: Record<string, number>, r) => {
    acc[r.categoria] = (acc[r.categoria] || 0) + Number(r.monto);
    return acc;
  }, {});

  // Ordenar de mayor a menor gasto
  const categoriasOrdenadas = Object.entries(agrupadoPorCategoria).sort(
    (a, b) => b[1] - a[1]
  );

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xs';

  return (
    <div className={`${cardBg} p-4 sm:p-5 rounded-2xl border w-full box-border transition-all`}>
      {/* Header del gráfico con selector de moneda */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <PieIcon size={18} className="text-slate-400 shrink-0" />
          <h2 className="font-bold text-sm tracking-tight">Distribución de Gastos</h2>
        </div>

        {/* Selector ARS / USD para el gráfico */}
        <div className="flex p-0.5 rounded-xl border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => setMonedaSeleccionada('ARS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              monedaSeleccionada === 'ARS'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            ARS
          </button>
          <button
            type="button"
            onClick={() => setMonedaSeleccionada('USD')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              monedaSeleccionada === 'USD'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mb-4 font-medium">Período: {periodoNombre}</p>

      {categoriasOrdenadas.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs text-slate-400 font-medium">
            No hay gastos registrados en {monedaSeleccionada} para este período
          </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Gráfico Donut SVG */}
          <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              {(() => {
                let currentAngle = 0;
                return categoriasOrdenadas.map(([cat, monto], index) => {
                  const porcentaje = totalGastado > 0 ? (monto / totalGastado) * 100 : 0;
                  const strokeDasharray = `${porcentaje} ${100 - porcentaje}`;
                  const strokeDashoffset = -currentAngle;
                  currentAngle += porcentaje;
                  const color = COLORES_GRAFICO[index % COLORES_GRAFICO.length];
                  const isSelected = categoriaHover === cat;

                  return (
                    <circle
                      key={cat}
                      cx="18"
                      cy="18"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke={color}
                      strokeWidth={isSelected ? '4.8' : '3.8'}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setCategoriaHover(cat)}
                      onMouseLeave={() => setCategoriaHover(null)}
                    />
                  );
                });
              })()}
            </svg>

            {/* Centro del Donut */}
            <div className="absolute text-center px-2 pointer-events-none">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate max-w-[100px] mx-auto">
                {categoriaHover || 'TOTAL GASTOS'}
              </p>
              <p
                className={`text-xs sm:text-sm font-black tracking-tight whitespace-nowrap ${
                  darkMode ? 'text-slate-100' : 'text-slate-800'
                }`}
              >
                {formatCurrency(
                  categoriaHover ? agrupadoPorCategoria[categoriaHover] : totalGastado,
                  monedaSeleccionada,
                  ocultarMontos
                )}
              </p>
            </div>
          </div>

          {/* Lista de Categorías con Scroll Limpio y Porcentajes Sin Wrap */}
          <div className="flex-1 w-full space-y-1.5 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
            {categoriasOrdenadas.map(([cat, monto], index) => {
              const catObj = categorias.find(c => c.nombre === cat);
              const color = COLORES_GRAFICO[index % COLORES_GRAFICO.length];
              const IconComp = (catObj?.icono && ICONOS_DISPONIBLES[catObj.icono]) || Tag;
              const porcentaje = ((monto / totalGastado) * 100).toFixed(1);
              const isSelected = categoriaHover === cat;

              return (
                <div
                  key={cat}
                  onMouseEnter={() => setCategoriaHover(cat)}
                  onMouseLeave={() => setCategoriaHover(null)}
                  className={`flex justify-between items-center text-xs p-2 rounded-xl transition-all ${
                    isSelected
                      ? darkMode
                        ? 'bg-slate-800/90'
                        : 'bg-slate-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Nombre y Icono */}
                  <div className="flex items-center gap-2 font-semibold min-w-0 flex-1 mr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <IconComp size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate text-xs text-slate-800 dark:text-slate-200">
                      {cat}
                    </span>
                  </div>

                  {/* Porcentaje y Monto (Sin saltos de línea) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md tabular-nums">
                      {porcentaje}%
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap tabular-nums text-right text-xs">
                      {formatCurrency(monto, monedaSeleccionada, ocultarMontos)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
