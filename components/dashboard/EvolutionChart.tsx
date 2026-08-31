'use client';
import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Currency, Transaction } from '@/types';
import { MESES_NOMBRES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';

interface EvolutionChartProps {
  transacciones: Transaction[];
  ocultarMontos: boolean;
  darkMode: boolean;
}

export function EvolutionChart({
  transacciones,
  ocultarMontos,
  darkMode,
}: EvolutionChartProps) {
  const [moneda, setMoneda] = useState<Currency>('ARS');

  // Obtener los últimos 6 meses cronológicos
  const hoy = new Date();
  const ultimosMeses: { mes: number; anio: number; label: string }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const mes = d.getMonth() + 1;
    const anio = d.getFullYear();
    ultimosMeses.push({
      mes,
      anio,
      label: `${MESES_NOMBRES[mes - 1].slice(0, 3)} ${String(anio).slice(2)}`,
    });
  }

  // Calcular ingresos y gastos para cada mes
  const datosEvolucion = ultimosMeses.map(({ mes, anio, label }) => {
    const movimientosMes = transacciones.filter(r => {
      const f = new Date(r.fecha + 'T00:00:00');
      return (
        f.getMonth() + 1 === mes &&
        f.getFullYear() === anio &&
        (r.moneda || 'ARS') === moneda
      );
    });

    const ingresos = movimientosMes
      .filter(r => r.tipo === 'ingreso')
      .reduce((sum, r) => sum + Number(r.monto), 0);

    const gastos = movimientosMes
      .filter(r => r.tipo === 'gasto')
      .reduce((sum, r) => sum + Number(r.monto), 0);

    const ahorro = ingresos - gastos;

    return {
      mes,
      anio,
      label,
      ingresos,
      gastos,
      ahorro,
    };
  });

  // Encontrar el valor máximo para escalar la altura de las barras
  const maxMonto = Math.max(
    ...datosEvolucion.map(d => Math.max(d.ingresos, d.gastos)),
    1000
  );

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xs';

  return (
    <div className={`${cardBg} p-4 rounded-2xl mb-6 border w-full box-border transition-all`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-slate-400" />
          <h2 className="font-bold text-sm">Evolución (Últimos 6 meses)</h2>
        </div>

        <div className="flex p-0.5 rounded-xl border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setMoneda('ARS')}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
              moneda === 'ARS'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            ARS
          </button>
          <button
            type="button"
            onClick={() => setMoneda('USD')}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
              moneda === 'USD'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-400 mb-6">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>Ingresos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
          <span>Gastos</span>
        </div>
      </div>

      {/* Gráfico de Barras */}
      <div className="grid grid-cols-6 gap-2 items-end h-44 pb-2 border-b border-slate-200 dark:border-slate-800">
        {datosEvolucion.map(d => {
          const altoIngreso = (d.ingresos / maxMonto) * 100;
          const altoGasto = (d.gastos / maxMonto) * 100;

          return (
            <div key={d.label} className="flex flex-col items-center h-full justify-end group">
              <div className="flex items-end gap-1 w-full justify-center h-32">
                {/* Barra Ingreso */}
                <div
                  style={{ height: `${Math.max(altoIngreso, 4)}%` }}
                  className="w-3 sm:w-4 bg-emerald-500 rounded-t-md transition-all duration-300 group-hover:brightness-110 relative"
                  title={`Ingresos: ${formatCurrency(d.ingresos, moneda, ocultarMontos)}`}
                />
                {/* Barra Gasto */}
                <div
                  style={{ height: `${Math.max(altoGasto, 4)}%` }}
                  className="w-3 sm:w-4 bg-rose-500 rounded-t-md transition-all duration-300 group-hover:brightness-110 relative"
                  title={`Gastos: ${formatCurrency(d.gastos, moneda, ocultarMontos)}`}
                />
              </div>

              {/* Etiqueta Mes */}
              <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Resumen Promedios */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 font-semibold">Promedio Ingreso Mensual</p>
          <p className="font-bold text-emerald-500 mt-0.5">
            {formatCurrency(
              datosEvolucion.reduce((acc, d) => acc + d.ingresos, 0) / 6,
              moneda,
              ocultarMontos
            )}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 font-semibold">Promedio Gasto Mensual</p>
          <p className="font-bold text-rose-500 mt-0.5">
            {formatCurrency(
              datosEvolucion.reduce((acc, d) => acc + d.gastos, 0) / 6,
              moneda,
              ocultarMontos
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
