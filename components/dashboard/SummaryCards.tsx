'use client';
import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Scale } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface SummaryCardsProps {
  ingresosARS: number;
  ingresosUSD: number;
  gastosARS: number;
  gastosUSD: number;
  ocultarMontos: boolean;
  darkMode: boolean;
}

export function SummaryCards({
  ingresosARS,
  ingresosUSD,
  gastosARS,
  gastosUSD,
  ocultarMontos,
  darkMode,
}: SummaryCardsProps) {
  const balanceARS = ingresosARS - gastosARS;
  const balanceUSD = ingresosUSD - gastosUSD;

  const cardBg = darkMode
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-100 shadow-xs';

  return (
    <div className="grid grid-cols-3 gap-2 mb-4 text-center w-full box-border">
      {/* Ingresos */}
      <div className={`${cardBg} p-3 rounded-2xl border flex flex-col justify-center`}>
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-semibold mb-0.5">
          <ArrowUpCircle size={12} className="text-emerald-500" />
          <span>Ingresos</span>
        </div>
        <p className="font-bold text-emerald-500 text-xs sm:text-sm tracking-tight">
          {formatCurrency(ingresosARS, 'ARS', ocultarMontos)}
        </p>
        {ingresosUSD > 0 && (
          <p className="font-bold text-emerald-400 text-[10px] sm:text-xs">
            {formatCurrency(ingresosUSD, 'USD', ocultarMontos)}
          </p>
        )}
      </div>

      {/* Gastos */}
      <div className={`${cardBg} p-3 rounded-2xl border flex flex-col justify-center`}>
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-semibold mb-0.5">
          <ArrowDownCircle size={12} className="text-rose-500" />
          <span>Gastos</span>
        </div>
        <p className="font-bold text-rose-500 text-xs sm:text-sm tracking-tight">
          {formatCurrency(gastosARS, 'ARS', ocultarMontos)}
        </p>
        {gastosUSD > 0 && (
          <p className="font-bold text-rose-400 text-[10px] sm:text-xs">
            {formatCurrency(gastosUSD, 'USD', ocultarMontos)}
          </p>
        )}
      </div>

      {/* Balance */}
      <div className={`${cardBg} p-3 rounded-2xl border flex flex-col justify-center`}>
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-semibold mb-0.5">
          <Scale size={12} className="text-slate-400" />
          <span>Balance</span>
        </div>
        <p
          className={`font-bold text-xs sm:text-sm tracking-tight ${
            balanceARS >= 0
              ? darkMode
                ? 'text-slate-100'
                : 'text-slate-800'
              : 'text-rose-500'
          }`}
        >
          {formatCurrency(balanceARS, 'ARS', ocultarMontos)}
        </p>
        {(ingresosUSD > 0 || gastosUSD > 0) && (
          <p
            className={`font-bold text-[10px] sm:text-xs ${
              balanceUSD >= 0
                ? darkMode
                  ? 'text-slate-300'
                  : 'text-slate-600'
                : 'text-rose-400'
            }`}
          >
            {formatCurrency(balanceUSD, 'USD', ocultarMontos)}
          </p>
        )}
      </div>
    </div>
  );
}
