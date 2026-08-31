'use client';
import React, { useState } from 'react';
import {
  Wallet,
  Landmark,
  CreditCard,
  PiggyBank,
  ArrowRightLeft,
} from 'lucide-react';
import { AccountBalance, Transaction } from '@/types';
import { formatCurrency } from '@/lib/formatters';

interface AccountsViewProps {
  balances: AccountBalance[];
  transacciones: Transaction[];
  ocultarMontos: boolean;
  darkMode: boolean;
  onOpenTransferModal: () => void;
}

export function AccountsView({
  balances,
  transacciones,
  ocultarMontos,
  darkMode,
  onOpenTransferModal,
}: AccountsViewProps) {
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string | null>(null);

  const getAccountIcon = (nombre: string) => {
    if (nombre.toLowerCase().includes('banco') || nombre.toLowerCase().includes('bancaria')) {
      return <Landmark size={20} className="text-sky-500" />;
    }
    if (nombre.toLowerCase().includes('tarjeta')) {
      return <CreditCard size={20} className="text-violet-500" />;
    }
    if (nombre.toLowerCase().includes('efectivo')) {
      return <PiggyBank size={20} className="text-emerald-500" />;
    }
    return <Wallet size={20} className="text-blue-500" />;
  };

  const totalPatrimonioARS = balances.reduce((sum, b) => sum + b.totalARS, 0);
  const totalPatrimonioUSD = balances.reduce((sum, b) => sum + b.totalUSD, 0);

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xs';

  return (
    <div className="space-y-4 w-full box-border">
      {/* Tarjeta de Patrimonio Consolidado */}
      <div className={`${cardBg} p-5 rounded-2xl border text-center relative overflow-hidden`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total en Cuentas
          </span>
          <button
            onClick={onOpenTransferModal}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-500 bg-sky-50 dark:bg-sky-950/60 px-3 py-1.5 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all shadow-xs"
          >
            <ArrowRightLeft size={14} />
            Nueva Transferencia
          </button>
        </div>

        <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
          {formatCurrency(totalPatrimonioARS, 'ARS', ocultarMontos)}
        </p>
        {totalPatrimonioUSD > 0 && (
          <p className="text-sm font-bold text-emerald-500 mt-1">
            + {formatCurrency(totalPatrimonioUSD, 'USD', ocultarMontos)}
          </p>
        )}
      </div>

      {/* Grid de Cuentas */}
      <div>
        <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
          Mis Billeteras y Cuentas ({balances.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {balances.map(b => {
            const isSelected = cuentaSeleccionada === b.nombre;
            return (
              <div
                key={b.nombre}
                onClick={() => setCuentaSeleccionada(isSelected ? null : b.nombre)}
                className={`${cardBg} p-4 rounded-2xl border transition-all cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between ${
                  isSelected ? 'ring-2 ring-sky-500/50 shadow-md' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getAccountIcon(b.nombre)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {b.nombre}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {isSelected ? 'Ocultar movimientos' : 'Ver movimientos'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`font-black text-sm whitespace-nowrap ${
                        b.totalARS >= 0
                          ? darkMode
                            ? 'text-slate-100'
                            : 'text-slate-800'
                          : 'text-rose-500'
                      }`}
                    >
                      {formatCurrency(b.totalARS, 'ARS', ocultarMontos)}
                    </p>
                    {b.totalUSD !== 0 && (
                      <p className="font-bold text-xs text-emerald-500 whitespace-nowrap">
                        {formatCurrency(b.totalUSD, 'USD', ocultarMontos)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Movimientos recientes de esta cuenta si está desplegada */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in duration-150">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      ÚLTIMOS MOVIMIENTOS:
                    </span>
                    {transacciones
                      .filter(
                        t => t.cuenta === b.nombre || t.cuentaDestino === b.nombre
                      )
                      .slice(0, 5)
                      .map(m => (
                        <div
                          key={m.id}
                          className="flex justify-between items-center text-xs py-0.5 text-slate-600 dark:text-slate-300"
                        >
                          <span className="truncate max-w-[150px] text-[11px]">
                            {m.tipo === 'transferencia'
                              ? m.cuenta === b.nombre
                                ? `A ${m.cuentaDestino}`
                                : `De ${m.cuenta}`
                              : m.categoria}
                          </span>
                          <span
                            className={`font-bold whitespace-nowrap text-[11px] ${
                              m.tipo === 'ingreso' || (m.tipo === 'transferencia' && m.cuentaDestino === b.nombre)
                                ? 'text-emerald-500'
                                : 'text-rose-500'
                            }`}
                          >
                            {m.tipo === 'ingreso' || (m.tipo === 'transferencia' && m.cuentaDestino === b.nombre)
                              ? '+'
                              : '-'}
                            {formatCurrency(Number(m.monto), m.moneda || 'ARS', ocultarMontos)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
