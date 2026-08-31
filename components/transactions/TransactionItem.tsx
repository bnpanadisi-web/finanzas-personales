'use client';
import React from 'react';
import {
  Edit2,
  Trash2,
  ArrowRightLeft,
  Repeat,
  CreditCard,
  Tag,
} from 'lucide-react';
import { Category, Transaction } from '@/types';
import { ICONOS_DISPONIBLES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface TransactionItemProps {
  registro: Transaction;
  categoriaObj?: Category;
  ocultarMontos: boolean;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number | string) => void;
  darkMode: boolean;
}

export function TransactionItem({
  registro,
  categoriaObj,
  ocultarMontos,
  onEdit,
  onDelete,
  darkMode,
}: TransactionItemProps) {
  const IconComp =
    registro.tipo === 'transferencia'
      ? ArrowRightLeft
      : (categoriaObj?.icono && ICONOS_DISPONIBLES[categoriaObj.icono]) || Tag;

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xs';

  let iconBadgeBg = darkMode
    ? 'bg-rose-950/60 text-rose-400'
    : 'bg-rose-50 text-rose-600';
  let montoColor = 'text-rose-500';
  let signo = '-';

  if (registro.tipo === 'ingreso') {
    iconBadgeBg = darkMode
      ? 'bg-emerald-950/60 text-emerald-400'
      : 'bg-emerald-50 text-emerald-600';
    montoColor = 'text-emerald-500';
    signo = '+';
  } else if (registro.tipo === 'transferencia') {
    iconBadgeBg = darkMode
      ? 'bg-sky-950/60 text-sky-400'
      : 'bg-sky-50 text-sky-600';
    montoColor = 'text-sky-500';
    signo = '⇄ ';
  }

  return (
    <div
      className={`${cardBg} p-3 rounded-2xl flex justify-between items-center border w-full box-border transition-all hover:border-slate-300 dark:hover:border-slate-700`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Icono */}
        <div className={`p-2.5 rounded-xl shrink-0 ${iconBadgeBg}`}>
          <IconComp size={18} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-xs sm:text-sm truncate">
              {registro.tipo === 'transferencia'
                ? `Transferencia`
                : registro.categoria}
            </p>
            {registro.descripcion && (
              <span className="text-xs text-slate-400 truncate max-w-[140px]">
                • {registro.descripcion}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-400 font-medium">
            <span>📅 {formatDate(registro.fecha)}</span>

            {/* Cuenta o Transferencia */}
            {registro.tipo === 'transferencia' && registro.cuentaDestino ? (
              <span className="bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-md font-semibold">
                {registro.cuenta} → {registro.cuentaDestino}
              </span>
            ) : (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-semibold">
                💳 {registro.cuenta}
              </span>
            )}

            {/* Badge de Cuotas */}
            {registro.cuotas && registro.cuotas > 1 && (
              <span className="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-md font-semibold flex items-center gap-0.5">
                <CreditCard size={10} />
                {registro.cuotaActual
                  ? `Cuota ${registro.cuotaActual}/${registro.cuotas}`
                  : `${registro.cuotas} cuotas`}
              </span>
            )}

            {/* Badge Recurrente */}
            {registro.esRecurrente && (
              <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-semibold flex items-center gap-0.5">
                <Repeat size={10} /> Fijo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Monto y Acciones */}
      <div className="flex items-center gap-2.5 shrink-0 ml-2">
        <span className={`font-black text-xs sm:text-sm tracking-tight ${montoColor}`}>
          {signo}
          {formatCurrency(Number(registro.monto), registro.moneda || 'ARS', ocultarMontos)}
        </span>

        <div className="flex gap-0.5">
          <button
            onClick={() => onEdit(registro)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Editar"
            aria-label="Editar movimiento"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(registro.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Eliminar"
            aria-label="Eliminar movimiento"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
