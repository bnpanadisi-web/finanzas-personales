'use client';
import { useState, useCallback, useMemo } from 'react';
import { SavingsGoal } from '@/types';
import { useToast } from '@/components/ui/Toast';

const SAVINGS_STORAGE_KEY = 'finanzas_savings_goals';

const METAS_INICIALES: SavingsGoal[] = [
  {
    id: 'res-1',
    nombre: 'Fondo de Emergencia',
    montoObjetivo: 1500000,
    montoActual: 450000,
    moneda: 'ARS',
    icono: '🛡️',
    color: 'emerald',
    creadoEn: '2026-08-01',
    historial: [
      { id: 'h-1', fecha: '2026-08-01', monto: 450000, tipo: 'deposito', nota: 'Aporte inicial' },
    ],
  },
  {
    id: 'res-2',
    nombre: 'Vacaciones / Viaje',
    montoObjetivo: 1200,
    montoActual: 500,
    moneda: 'USD',
    icono: '✈️',
    color: 'sky',
    creadoEn: '2026-08-05',
    historial: [
      { id: 'h-2', fecha: '2026-08-05', monto: 500, tipo: 'deposito', nota: 'Reserva inicial en USD' },
    ],
  },
];

export function useSavings() {
  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SAVINGS_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error cargando metas de ahorro:', e);
      }
    }
    return METAS_INICIALES;
  });

  const { success, error, info } = useToast();

  const persistGoals = useCallback((updated: SavingsGoal[]) => {
    setGoals(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVINGS_STORAGE_KEY, JSON.stringify(updated));
    }
  }, []);

  const crearMeta = useCallback(
    (meta: Omit<SavingsGoal, 'id' | 'creadoEn' | 'historial'>) => {
      const id = 'res-' + Date.now();
      const nueva: SavingsGoal = {
        ...meta,
        id,
        creadoEn: new Date().toISOString().split('T')[0],
        historial:
          meta.montoActual > 0
            ? [
                {
                  id: 'h-' + Date.now(),
                  fecha: new Date().toISOString().split('T')[0],
                  monto: meta.montoActual,
                  tipo: 'deposito',
                  nota: 'Saldo inicial',
                },
              ]
            : [],
      };
      const updated = [...goals, nueva];
      persistGoals(updated);
      success(`Reserva "${meta.nombre}" creada con éxito`);
      return id;
    },
    [goals, persistGoals, success]
  );

  const editarMeta = useCallback(
    (id: string, updates: Partial<SavingsGoal>) => {
      const updated = goals.map(g => (g.id === id ? { ...g, ...updates } : g));
      persistGoals(updated);
      success('Reserva actualizada');
    },
    [goals, persistGoals, success]
  );

  const eliminarMeta = useCallback(
    (id: string) => {
      const target = goals.find(g => g.id === id);
      const updated = goals.filter(g => g.id !== id);
      persistGoals(updated);
      info(`Reserva "${target?.nombre || ''}" eliminada`);
    },
    [goals, persistGoals, info]
  );

  const depositarEnMeta = useCallback(
    (id: string, monto: number, nota?: string): boolean => {
      if (!monto || monto <= 0) return false;
      const target = goals.find(g => g.id === id);
      if (!target) return false;

      const nuevoMonto = target.montoActual + monto;
      const nuevoHistorial = [
        ...(target.historial || []),
        {
          id: 'h-' + Date.now(),
          fecha: new Date().toISOString().split('T')[0],
          monto,
          tipo: 'deposito' as const,
          nota: nota || 'Aporte a reserva',
        },
      ];

      const updated = goals.map(g =>
        g.id === id ? { ...g, montoActual: nuevoMonto, historial: nuevoHistorial } : g
      );
      persistGoals(updated);
      success(`Se sumaron ${target.moneda === 'USD' ? 'US$' : '$'}${monto.toLocaleString('es-AR')} a "${target.nombre}"`);
      return true;
    },
    [goals, persistGoals, success]
  );

  const retirarDeMeta = useCallback(
    (id: string, monto: number, nota?: string): boolean => {
      if (!monto || monto <= 0) return false;
      const target = goals.find(g => g.id === id);
      if (!target) return false;

      if (monto > target.montoActual) {
        error(`El monto supera el saldo actual disponible (${target.moneda === 'USD' ? 'US$' : '$'}${target.montoActual.toLocaleString('es-AR')})`);
        return false;
      }

      const nuevoMonto = Math.max(0, target.montoActual - monto);
      const nuevoHistorial = [
        ...(target.historial || []),
        {
          id: 'h-' + Date.now(),
          fecha: new Date().toISOString().split('T')[0],
          monto,
          tipo: 'retiro' as const,
          nota: nota || 'Retiro de fondos',
        },
      ];

      const updated = goals.map(g =>
        g.id === id ? { ...g, montoActual: nuevoMonto, historial: nuevoHistorial } : g
      );
      persistGoals(updated);
      info(`Se retiraron ${target.moneda === 'USD' ? 'US$' : '$'}${monto.toLocaleString('es-AR')} de "${target.nombre}"`);
      return true;
    },
    [goals, persistGoals, error, info]
  );

  const ajustarMontoMeta = useCallback(
    (id: string, nuevoMonto: number) => {
      const target = goals.find(g => g.id === id);
      if (!target) return;
      const updated = goals.map(g => (g.id === id ? { ...g, montoActual: nuevoMonto } : g));
      persistGoals(updated);
      success(`Saldo de "${target.nombre}" ajustado a ${target.moneda === 'USD' ? 'US$' : '$'}${nuevoMonto.toLocaleString('es-AR')}`);
    },
    [goals, persistGoals, success]
  );

  // Totales Calculados
  const totalAhorradoARS = useMemo(() => {
    return goals.filter(g => g.moneda === 'ARS').reduce((sum, g) => sum + g.montoActual, 0);
  }, [goals]);

  const totalObjetivoARS = useMemo(() => {
    return goals.filter(g => g.moneda === 'ARS').reduce((sum, g) => sum + g.montoObjetivo, 0);
  }, [goals]);

  const totalAhorradoUSD = useMemo(() => {
    return goals.filter(g => g.moneda === 'USD').reduce((sum, g) => sum + g.montoActual, 0);
  }, [goals]);

  const totalObjetivoUSD = useMemo(() => {
    return goals.filter(g => g.moneda === 'USD').reduce((sum, g) => sum + g.montoObjetivo, 0);
  }, [goals]);

  return {
    goals,
    crearMeta,
    editarMeta,
    eliminarMeta,
    depositarEnMeta,
    retirarDeMeta,
    ajustarMontoMeta,
    totalAhorradoARS,
    totalObjetivoARS,
    totalAhorradoUSD,
    totalObjetivoUSD,
  };
}
