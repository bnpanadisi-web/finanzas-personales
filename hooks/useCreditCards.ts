'use client';
import { useState, useEffect, useCallback } from 'react';
import { CreditCard, InstallmentPurchase } from '@/types';
import {
  getLocalCreditCards,
  saveLocalCreditCards,
  getLocalInstallmentPurchases,
  saveLocalInstallmentPurchases,
} from '@/lib/localStorageEngine';
import { scheduleAutoBackup } from '@/services/googleBackup';

export function useCreditCards() {
  const [tarjetas, setTarjetas] = useState<CreditCard[]>(() => getLocalCreditCards());
  const [compras, setCompras] = useState<InstallmentPurchase[]>(() => getLocalInstallmentPurchases());
  const [rawSelectedId, setRawSelectedId] = useState<string | null>(null);

  const tarjetaSeleccionadaId = useMemo(() => {
    if (rawSelectedId && tarjetas.some(t => t.id === rawSelectedId)) {
      return rawSelectedId;
    }
    return tarjetas.length > 0 ? tarjetas[0].id : null;
  }, [rawSelectedId, tarjetas]);

  const setTarjetaSeleccionadaId = useCallback((id: string | null) => {
    setRawSelectedId(id);
  }, []);

  // Sincronizar si se restaura backup o eventos externos
  useEffect(() => {
    const handleBackupUpdated = () => {
      setTarjetas(getLocalCreditCards());
      setCompras(getLocalInstallmentPurchases());
    };

    window.addEventListener('finanzas_backup_updated', handleBackupUpdated);
    return () => {
      window.removeEventListener('finanzas_backup_updated', handleBackupUpdated);
    };
  }, []);

  // AGREGAR TARJETA
  const agregarTarjeta = useCallback(
    (nueva: Omit<CreditCard, 'id' | 'creadaEn'>): CreditCard => {
      const card: CreditCard = {
        ...nueva,
        id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        creadaEn: new Date().toISOString(),
      };
      const updated = [...tarjetas, card];
      setTarjetas(updated);
      saveLocalCreditCards(updated);
      setTarjetaSeleccionadaId(card.id);
      scheduleAutoBackup();
      return card;
    },
    [tarjetas, setTarjetaSeleccionadaId]
  );

  // EDITAR TARJETA
  const editarTarjeta = useCallback(
    (id: string, updates: Partial<CreditCard>): boolean => {
      const updated = tarjetas.map(t => (t.id === id ? { ...t, ...updates } : t));
      setTarjetas(updated);
      saveLocalCreditCards(updated);
      scheduleAutoBackup();
      return true;
    },
    [tarjetas]
  );

  // ELIMINAR TARJETA (Y sus compras asociadas)
  const eliminarTarjeta = useCallback(
    (id: string): boolean => {
      const updatedTarjetas = tarjetas.filter(t => t.id !== id);
      const updatedCompras = compras.filter(c => c.tarjetaId !== id);

      setTarjetas(updatedTarjetas);
      saveLocalCreditCards(updatedTarjetas);

      setCompras(updatedCompras);
      saveLocalInstallmentPurchases(updatedCompras);

      if (rawSelectedId === id) {
        setRawSelectedId(null);
      }

      scheduleAutoBackup();
      return true;
    },
    [tarjetas, compras, rawSelectedId]
  );

  // AGREGAR COMPRA EN CUOTAS
  const agregarCompra = useCallback(
    (nueva: Omit<InstallmentPurchase, 'id' | 'creadaEn'>): InstallmentPurchase => {
      const purchase: InstallmentPurchase = {
        ...nueva,
        id: 'compra_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        creadaEn: new Date().toISOString(),
      };
      const updated = [purchase, ...compras];
      setCompras(updated);
      saveLocalInstallmentPurchases(updated);
      scheduleAutoBackup();
      return purchase;
    },
    [compras]
  );

  // EDITAR COMPRA
  const editarCompra = useCallback(
    (id: string, updates: Partial<InstallmentPurchase>): boolean => {
      const updated = compras.map(c => (c.id === id ? { ...c, ...updates } : c));
      setCompras(updated);
      saveLocalInstallmentPurchases(updated);
      scheduleAutoBackup();
      return true;
    },
    [compras]
  );

  // ELIMINAR COMPRA
  const eliminarCompra = useCallback(
    (id: string): boolean => {
      const updated = compras.filter(c => c.id !== id);
      setCompras(updated);
      saveLocalInstallmentPurchases(updated);
      scheduleAutoBackup();
      return true;
    },
    [compras]
  );

  // MARCAR O CAMBIAR CUOTAS PAGADAS
  const ajustarCuotasPagas = useCallback(
    (compraId: string, cantidadPagas: number): boolean => {
      const compra = compras.find(c => c.id === compraId);
      if (!compra) return false;

      const clamped = Math.max(0, Math.min(compra.cuotasTotales, cantidadPagas));
      const estado = clamped >= compra.cuotasTotales ? 'finalizada' : 'activa';

      const updated = compras.map(c =>
        c.id === compraId ? { ...c, cuotasPagasManuales: clamped, estado } : c
      );

      setCompras(updated);
      saveLocalInstallmentPurchases(updated);
      scheduleAutoBackup();
      return true;
    },
    [compras]
  );

  return {
    tarjetas,
    compras,
    tarjetaSeleccionadaId,
    setTarjetaSeleccionadaId,
    agregarTarjeta,
    editarTarjeta,
    eliminarTarjeta,
    agregarCompra,
    editarCompra,
    eliminarCompra,
    ajustarCuotasPagas,
  };
}

// ----------------------------------------------------------------------
// HELPERS MATEMÁTICOS Y DE FECHAS PARA SEGUIMIENTO MES A MES
// ----------------------------------------------------------------------

export interface PurchaseCalculatedInfo {
  montoPorCuota: number;
  cuotasPagas: number;
  cuotaActualMes: number; // Número de cuota correspondiente al mes consultado (1 a N, o 0 si aún no empieza, o > N si terminó)
  saldoRestante: number;
  esVigenteEsteMes: boolean;
  finalizada: boolean;
  textoUltimaPaga: string;
  textoProximaPagar: string;
  mesProximaPagar: string; // YYYY-MM
  porcentajeProgreso: number;
}

/**
 * Calcula en detalle la situación de una compra para un mes y año específicos (por defecto, el mes actual).
 */
export function calculateInstallmentInfo(
  compra: InstallmentPurchase,
  targetYear?: number,
  targetMonth?: number
): PurchaseCalculatedInfo {
  const hoy = new Date();
  const anio = targetYear ?? hoy.getFullYear();
  const mes = targetMonth ?? hoy.getMonth() + 1; // 1-12

  const montoPorCuota = compra.cuotasTotales > 0 ? compra.montoTotal / compra.cuotasTotales : 0;

  // Extraer año y mes de inicio (mesPrimerCuota YYYY-MM)
  let startYear = anio;
  let startMonth = mes;
  if (compra.mesPrimerCuota) {
    const [y, m] = compra.mesPrimerCuota.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      startYear = y;
      startMonth = m;
    }
  } else if (compra.fechaCompra) {
    const [y, m] = compra.fechaCompra.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      startYear = y;
      startMonth = m;
    }
  }

  // Diferencia de meses desde el inicio hasta el mes objetivo
  const diffMonths = (anio - startYear) * 12 + (mes - startMonth);
  // La cuota del mes objetivo: si diffMonths == 0 => cuota 1
  const cuotaMesObjetivo = diffMonths + 1;

  // Cuántas cuotas pagadas considerar
  // Si el usuario especificó cuotasPagasManuales, tiene prioridad.
  // De lo contrario, consideramos pagadas las cuotas de meses previos al mes actual.
  let cuotasPagas = 0;
  if (typeof compra.cuotasPagasManuales === 'number') {
    cuotasPagas = compra.cuotasPagasManuales;
  } else {
    // Automático: si el mes ya pasó respecto a hoy
    const hoyYear = hoy.getFullYear();
    const hoyMonth = hoy.getMonth() + 1;
    const diffToCurrent = (hoyYear - startYear) * 12 + (hoyMonth - startMonth);
    // Cuotas completadas en meses anteriores al actual
    cuotasPagas = Math.max(0, Math.min(compra.cuotasTotales, diffToCurrent));
  }

  const finalizada = cuotasPagas >= compra.cuotasTotales || compra.estado === 'finalizada';
  const saldoRestante = Math.max(0, (compra.cuotasTotales - cuotasPagas) * montoPorCuota);

  // ¿Entra una cuota a pagar este mes específico?
  const esVigenteEsteMes = cuotaMesObjetivo >= 1 && cuotaMesObjetivo <= compra.cuotasTotales;

  // Texto: Última cuota paga
  let textoUltimaPaga = 'Ninguna cuota paga aún';
  if (cuotasPagas > 0) {
    const lastPaidMonthDate = new Date(startYear, startMonth - 1 + (cuotasPagas - 1), 1);
    const nombreMes = lastPaidMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    textoUltimaPaga = `Cuota ${cuotasPagas} de ${compra.cuotasTotales} (${capitalizar(nombreMes)})`;
  }

  // Texto: Próxima cuota a pagar
  let textoProximaPagar = '¡Todas las cuotas pagadas!';
  let mesProximaPagar = '';
  if (cuotasPagas < compra.cuotasTotales) {
    const nextPayMonthDate = new Date(startYear, startMonth - 1 + cuotasPagas, 1);
    const nombreMes = nextPayMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    textoProximaPagar = `Cuota ${cuotasPagas + 1} de ${compra.cuotasTotales} (${capitalizar(nombreMes)})`;
    mesProximaPagar = `${nextPayMonthDate.getFullYear()}-${String(nextPayMonthDate.getMonth() + 1).padStart(2, '0')}`;
  }

  const porcentajeProgreso = Math.round((cuotasPagas / compra.cuotasTotales) * 100);

  return {
    montoPorCuota,
    cuotasPagas,
    cuotaActualMes: cuotaMesObjetivo,
    saldoRestante,
    esVigenteEsteMes,
    finalizada,
    textoUltimaPaga,
    textoProximaPagar,
    mesProximaPagar,
    porcentajeProgreso,
  };
}

/**
 * Calcula los totales para una tarjeta de crédito en el mes actual.
 */
export function calculateCardSummary(card: CreditCard, compras: InstallmentPurchase[]) {
  const comprasDeTarjeta = compras.filter(c => c.tarjetaId === card.id);

  let totalMesActualARS = 0;
  let totalMesActualUSD = 0;
  let totalPendienteARS = 0;
  let totalPendienteUSD = 0;
  let comprasActivas = 0;

  for (const c of comprasDeTarjeta) {
    const info = calculateInstallmentInfo(c);
    if (!info.finalizada) {
      comprasActivas++;
      if (c.moneda === 'USD') {
        totalPendienteUSD += info.saldoRestante;
      } else {
        totalPendienteARS += info.saldoRestante;
      }
    }

    if (info.esVigenteEsteMes && !info.finalizada) {
      if (c.moneda === 'USD') {
        totalMesActualUSD += info.montoPorCuota;
      } else {
        totalMesActualARS += info.montoPorCuota;
      }
    }
  }

  // Estado del vencimiento del resumen para recordatorio
  const hoy = new Date();
  const diaHoy = hoy.getDate();
  let diasHastaVencimiento: number | null = null;
  let textoVencimiento = '';
  let estadoVencimiento: 'normal' | 'proximo' | 'urgente' = 'normal';

  if (card.diaVencimiento && card.diaVencimiento >= 1 && card.diaVencimiento <= 31) {
    const dv = card.diaVencimiento;
    if (dv >= diaHoy) {
      diasHastaVencimiento = dv - diaHoy;
    } else {
      // Vence el próximo mes
      const diasEnEsteMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
      diasHastaVencimiento = diasEnEsteMes - diaHoy + dv;
    }

    if (diasHastaVencimiento === 0) {
      textoVencimiento = '¡Vence hoy!';
      estadoVencimiento = 'urgente';
    } else if (diasHastaVencimiento === 1) {
      textoVencimiento = 'Vence mañana';
      estadoVencimiento = 'urgente';
    } else if (diasHastaVencimiento <= 5) {
      textoVencimiento = `Vence en ${diasHastaVencimiento} días (Día ${dv})`;
      estadoVencimiento = 'proximo';
    } else {
      textoVencimiento = `Vence el día ${dv}`;
      estadoVencimiento = 'normal';
    }
  }

  return {
    totalMesActualARS,
    totalMesActualUSD,
    totalPendienteARS,
    totalPendienteUSD,
    comprasActivas,
    totalCompras: comprasDeTarjeta.length,
    diasHastaVencimiento,
    textoVencimiento,
    estadoVencimiento,
  };
}

function capitalizar(texto: string): string {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
