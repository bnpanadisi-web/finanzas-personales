'use client';
import React from 'react';
import { Category, Transaction } from '@/types';
import { TransactionItem } from './TransactionItem';

interface TransactionListProps {
  transacciones: Transaction[];
  categorias: Category[];
  ocultarMontos: boolean;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number | string) => void;
  darkMode: boolean;
  titulo?: string;
}

export function TransactionList({
  transacciones,
  categorias,
  ocultarMontos,
  onEdit,
  onDelete,
  darkMode,
  titulo,
}: TransactionListProps) {
  return (
    <div className="w-full box-border">
      {titulo && (
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            {titulo}
          </h2>
          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {transacciones.length}
          </span>
        </div>
      )}

      <div className="space-y-2 w-full box-border">
        {transacciones.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 font-medium">
              No hay movimientos registrados en este período
            </p>
          </div>
        ) : (
          transacciones.map(r => {
            const catObj = categorias.find(c => c.nombre === r.categoria);
            return (
              <TransactionItem
                key={r.id}
                registro={r}
                categoriaObj={catObj}
                ocultarMontos={ocultarMontos}
                onEdit={onEdit}
                onDelete={onDelete}
                darkMode={darkMode}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
