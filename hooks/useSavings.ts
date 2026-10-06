'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { SavingsGoal } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { scheduleAutoBackup } from '@/services/googleBackup';
import { getLocalSavingsGoals, saveLocalSavingsGoals } from '@/lib/localStorageEngine';
import { syncSavingsWithCloud, saveCloudSavings } from '@/services/savingsSync';

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
    const local = getLocalSavingsGoals();
    return local.length > 0 ? local : METAS_INICIALES;
  });
  const [sincronizandoNube, setSincronizandoNube] = useState(false);

  const { success, error, info } = useToast();

  // Sincronizar automáticamente con Supabase tomando el celular como fuente original
  useEffect(() => {
    let activo = true;
    const initial = getLocalSavingsGoals();
    const goalsToSync = initial.length > 0 ? initial : METAS_INICIALES;
    syncSavingsWithCloud(goalsToSync).then(res => {
      if (!activo) return;
      if (res.huboCambios) {
        setGoals(res.goals);
      }
    });

    return () => {
      activo = false;
    };
  }, []);

  // Escuchar si se restaura backup o eventos externos
  useEffect(() => {
    const handleBackupUpdated = () => {
      const updated = getLocalSavingsGoals();
      if (updated.length > 0) setGoals(updated);
    };

    window.addEventListener('finanzas_backup_updated', handleBackupUpdated);
    return () => {
      window.removeEventListener('finanzas_backup_updated', handleBackupUpdated);
    };
  }, []);

  const persistGoals = useCallback((updated: SavingsGoal[]) => {
    setGoals(updated);
    saveLocalSavingsGoals(updated);
    saveCloudSavings(updated);
    scheduleAutoBackup();
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

  const sincronizarConNube = useCallback(async () => {
    setSincronizandoNube(true);
    try {
      const res = await syncSavingsWithCloud(goals);
      if (res.huboCambios) {
        setGoals(res.goals);
      }
    } finally {
      setSincronizandoNube(false);
    }
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
    sincronizarConNube,
    sincronizandoNube,
  };
}
