'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, AccountBalance } from '@/types';
import {
  getTransactions,
  insertTransaction,
  updateTransaction,
  deleteTransaction,
  importBatchTransactions,
  exportToCSV,
} from '@/services/transactions';
import { useToast } from '@/components/ui/Toast';
import { DEFAULT_ACCOUNTS } from '@/lib/constants';

const VIAJE_STORAGE_KEY = 'finanzas_registros_viaje';

export function useTransactions(autenticado: boolean, modoViaje: boolean) {
  const [registros, setRegistros] = useState<Transaction[]>([]);
  const [registrosViaje, setRegistrosViaje] = useState<Transaction[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(VIAJE_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error parseando registros de viaje:', e);
      }
    }
    return [];
  });
  const [cargando, setCargando] = useState(false);
  const { success, error, info } = useToast();

  const cargarTransacciones = useCallback(async () => {
    if (!autenticado || modoViaje) return;
    setCargando(true);
    const data = await getTransactions();
    setRegistros(data);
    setCargando(false);
  }, [autenticado, modoViaje]);

  // Cargar datos de Supabase si está autenticado
  useEffect(() => {
    if (!autenticado || modoViaje) return;
    let activo = true;
    getTransactions().then(data => {
      if (activo) {
        setRegistros(data);
        setCargando(false);
      }
    });

    return () => {
      activo = false;
    };
  }, [autenticado, modoViaje]);

  // Lista activa según el modo
  const transaccionesActivas = useMemo(() => {
    return modoViaje ? registrosViaje : registros;
  }, [modoViaje, registrosViaje, registros]);

  // Agregar nuevo movimiento
  const agregarMovimiento = async (
    t: Omit<Transaction, 'id'>
  ): Promise<boolean> => {
    if (modoViaje) {
      const nuevo: Transaction = {
        ...t,
        id: 'viaje_' + Date.now(),
      };
      const nuevaLista = [nuevo, ...registrosViaje];
      setRegistrosViaje(nuevaLista);
      if (typeof window !== 'undefined') {
        localStorage.setItem(VIAJE_STORAGE_KEY, JSON.stringify(nuevaLista));
      }
      success('Gasto de viaje guardado en el dispositivo');
      return true;
    }

    // Modo Normal (Supabase) con Optimistic UI
    const tempId = 'temp_' + Date.now();
    const tempItem: Transaction = { ...t, id: tempId };
    setRegistros(prev => [tempItem, ...prev]);

    const res = await insertTransaction(t);
    if (res.error) {
      error(res.error);
      setRegistros(prev => prev.filter(item => item.id !== tempId));
      return false;
    }

    if (res.data && res.data.length > 0) {
      setRegistros(prev => [
        ...res.data!,
        ...prev.filter(item => item.id !== tempId),
      ]);
    } else {
      await cargarTransacciones();
    }

    const mensaje =
      t.tipo === 'transferencia'
        ? `Transferencia de ${t.cuenta} a ${t.cuentaDestino} registrada`
        : `${t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} registrado correctamente`;

    success(mensaje);
    return true;
  };

  // Editar movimiento existente
  const editarMovimiento = async (t: Transaction): Promise<boolean> => {
    if (modoViaje) {
      const actualizados = registrosViaje.map(r => (r.id === t.id ? t : r));
      setRegistrosViaje(actualizados);
      if (typeof window !== 'undefined') {
        localStorage.setItem(VIAJE_STORAGE_KEY, JSON.stringify(actualizados));
      }
      success('Registro de viaje actualizado');
      return true;
    }

    // Optimistic update
    const previous = [...registros];
    setRegistros(prev => prev.map(r => (r.id === t.id ? t : r)));

    const res = await updateTransaction(t);
    if (!res.success) {
      error(res.error || 'Error al actualizar');
      setRegistros(previous);
      return false;
    }

    success('Registro actualizado exitosamente');
    return true;
  };

  // Eliminar movimiento
  const eliminarMovimiento = async (id: number | string): Promise<boolean> => {
    if (modoViaje) {
      const filtrados = registrosViaje.filter(r => r.id !== id);
      setRegistrosViaje(filtrados);
      if (typeof window !== 'undefined') {
        localStorage.setItem(VIAJE_STORAGE_KEY, JSON.stringify(filtrados));
      }
      success('Registro eliminado');
      return true;
    }

    // Optimistic delete
    const previous = [...registros];
    setRegistros(prev => prev.filter(r => r.id !== id));

    const res = await deleteTransaction(id);
    if (!res.success) {
      error(res.error || 'Error al eliminar');
      setRegistros(previous);
      return false;
    }

    success('Registro eliminado exitosamente');
    return true;
  };

  // Sincronizar e importar gastos de viaje a Supabase
  const sincronizarViajeASupabase = async (): Promise<boolean> => {
    if (registrosViaje.length === 0) {
      info('No hay gastos de viaje para sincronizar');
      return false;
    }

    const res = await importBatchTransactions(registrosViaje);
    if (res.error) {
      error(res.error);
      return false;
    }

    success(`Se importaron ${res.count} movimientos a tu historial general`);
    setRegistrosViaje([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(VIAJE_STORAGE_KEY);
    }
    await cargarTransacciones();
    return true;
  };

  // Exportar datos a CSV
  const exportarDatos = () => {
    const ok = exportToCSV(transaccionesActivas, modoViaje ? 'gastos_viaje' : 'mis_finanzas');
    if (ok) {
      success('Archivo CSV descargado con éxito');
    } else {
      info('No hay transacciones para exportar');
    }
  };

  // Calcular balances por cuenta
  const balancesPorCuenta: AccountBalance[] = useMemo(() => {
    const cuentasMap: Record<string, { totalARS: number; totalUSD: number }> = {};

    DEFAULT_ACCOUNTS.forEach(c => {
      cuentasMap[c] = { totalARS: 0, totalUSD: 0 };
    });

    registros.forEach(r => {
      const moneda = r.moneda || 'ARS';
      const monto = Number(r.monto);

      if (!cuentasMap[r.cuenta]) {
        cuentasMap[r.cuenta] = { totalARS: 0, totalUSD: 0 };
      }

      if (r.tipo === 'ingreso') {
        if (moneda === 'USD') cuentasMap[r.cuenta].totalUSD += monto;
        else cuentasMap[r.cuenta].totalARS += monto;
      } else if (r.tipo === 'gasto') {
        if (moneda === 'USD') cuentasMap[r.cuenta].totalUSD -= monto;
        else cuentasMap[r.cuenta].totalARS -= monto;
      } else if (r.tipo === 'transferencia' && r.cuentaDestino) {
        // Resta de origen
        if (moneda === 'USD') cuentasMap[r.cuenta].totalUSD -= monto;
        else cuentasMap[r.cuenta].totalARS -= monto;

        // Suma a destino
        if (!cuentasMap[r.cuentaDestino]) {
          cuentasMap[r.cuentaDestino] = { totalARS: 0, totalUSD: 0 };
        }
        if (moneda === 'USD') cuentasMap[r.cuentaDestino].totalUSD += monto;
        else cuentasMap[r.cuentaDestino].totalARS += monto;
      }
    });

    return Object.entries(cuentasMap).map(([nombre, saldos]) => ({
      nombre,
      totalARS: saldos.totalARS,
      totalUSD: saldos.totalUSD,
    }));
  }, [registros]);

  return {
    transacciones: transaccionesActivas,
    todasLasTransacciones: registros,
    registrosViaje,
    cargando,
    recargar: cargarTransacciones,
    agregarMovimiento,
    editarMovimiento,
    eliminarMovimiento,
    sincronizarViajeASupabase,
    exportarDatos,
    balancesPorCuenta,
  };
}
