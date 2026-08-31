export type TransactionType = 'gasto' | 'ingreso' | 'transferencia';
export type Currency = 'ARS' | 'USD';

export interface Category {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  icono: string;
  color?: string;
}

export interface Transaction {
  id: number | string;
  tipo: TransactionType;
  monto: number;
  moneda: Currency;
  categoria: string;
  cuenta: string;
  cuentaDestino?: string; // Para transferencias entre cuentas
  descripcion?: string;
  fecha: string;
  // Campos avanzados
  cuotas?: number; // Total de cuotas (ej. 3, 6, 12)
  cuotaActual?: number; // Cuota número X
  esRecurrente?: boolean; // Suscripción / Gasto fijo
  etiquetas?: string[];
  creadoEn?: string;
}

export interface AccountBalance {
  nombre: string;
  icono?: string;
  totalARS: number;
  totalUSD: number;
}

export interface Budget {
  categoria: string;
  limiteARS: number;
  limiteUSD?: number;
}

export interface DolarRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export interface RatesData {
  blue?: DolarRate;
  oficial?: DolarRate;
  mep?: DolarRate;
  ccl?: DolarRate;
  tarjeta?: DolarRate;
  ultimaActualizacion?: string;
}

export interface FilterOptions {
  busqueda: string;
  tipo: 'todos' | 'gasto' | 'ingreso' | 'transferencia';
  categoria: string;
  cuenta: string;
  moneda: 'todas' | 'ARS' | 'USD';
  mes: number;
  anio: number;
}

export type TabType = 'actual' | 'historial' | 'presupuestos' | 'analiticas';
