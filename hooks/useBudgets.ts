'use client';
import { useState, useCallback } from 'react';
import { Budget, Transaction } from '@/types';
import { useToast } from '@/components/ui/Toast';

const BUDGETS_STORAGE_KEY = 'finanzas_budgets_list';

const DEFAULT_BUDGETS: Budget[] = [
  { categoria: 'Supermercado', limiteARS: 250000 },
  { categoria: 'Comida / Salidas', limiteARS: 120000 },
  { categoria: 'Servicios e Impuestos', limiteARS: 80000 },
  { categoria: 'Transporte / Auto', limiteARS: 70000 },
];

export function useBudgets() {
  const [presupuestos, setPresupuestos] = useState<Budget[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(BUDGETS_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
        localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(DEFAULT_BUDGETS));
      } catch (err) {
        console.error('Error cargando presupuestos:', err);
      }
    }
    return DEFAULT_BUDGETS;
  });
  const { success } = useToast();

  const guardarPresupuesto = useCallback(
    (categoria: string, limiteARS: number, limiteUSD?: number) => {
      setPresupuestos(prev => {
        const index = prev.findIndex(p => p.categoria === categoria);
        let actualizados: Budget[];
        if (index >= 0) {
          actualizados = [...prev];
          actualizados[index] = { categoria, limiteARS, limiteUSD };
        } else {
          actualizados = [...prev, { categoria, limiteARS, limiteUSD }];
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(actualizados));
        }
        return actualizados;
      });
      success(`Presupuesto para "${categoria}" guardado`);
    },
    [success]
  );

  const eliminarPresupuesto = useCallback(
    (categoria: string) => {
      setPresupuestos(prev => {
        const actualizados = prev.filter(p => p.categoria !== categoria);
        if (typeof window !== 'undefined') {
          localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(actualizados));
        }
        return actualizados;
      });
      success(`Presupuesto de "${categoria}" eliminado`);
    },
    [success]
  );

  /**
   * Calcula el estado de cumplimiento del presupuesto según los gastos del mes.
   */
  const calcularProgresoPresupuestos = useCallback(
    (gastosMes: Transaction[]) => {
      return presupuestos.map(p => {
        const gastadoARS = gastosMes
          .filter(g => g.tipo === 'gasto' && g.categoria === p.categoria && (g.moneda || 'ARS') === 'ARS')
          .reduce((sum, g) => sum + Number(g.monto), 0);

        const porcentajeARS = p.limiteARS > 0 ? (gastadoARS / p.limiteARS) * 100 : 0;

        return {
          ...p,
          gastadoARS,
          porcentajeARS,
          excedido: gastadoARS > p.limiteARS,
          cercaDelLimite: porcentajeARS >= 80 && porcentajeARS < 100,
        };
      });
    },
    [presupuestos]
  );

  return {
    presupuestos,
    guardarPresupuesto,
    eliminarPresupuesto,
    calcularProgresoPresupuestos,
  };
}
