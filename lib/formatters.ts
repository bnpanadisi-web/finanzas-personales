import { Currency } from '@/types';
import { MESES_NOMBRES } from './constants';

/**
 * Formatea un número como moneda (ARS o USD) respetando la configuración de privacidad.
 */
export function formatCurrency(
  valor: number,
  moneda: Currency = 'ARS',
  ocultar: boolean = false
): string {
  if (ocultar) return '••••••';
  const simbolo = moneda === 'USD' ? 'US$\u00A0' : '$\u00A0';
  return (
    simbolo +
    new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)
  );
}

/**
 * Convierte un string de input formateado (ej. "15.000,50") a número float limpio.
 */
export function parseCurrencyInput(input: string): number {
  if (!input) return 0;
  const limpio = input.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(limpio);
  return isNaN(num) ? 0 : num;
}

/**
 * Formatea un valor mientras el usuario escribe en un campo de texto con separador de miles.
 */
export function formatInputNumber(raw: string): string {
  const limpio = raw.replace(/[^0-9,]/g, '');
  const partes = limpio.split(',');
  if (partes.length > 2) return partes[0] + ',' + partes[1];

  let parteEntera = partes[0].replace(/\D/g, '');
  if (parteEntera) {
    parteEntera = new Intl.NumberFormat('es-AR').format(parseInt(parteEntera, 10));
  }

  const parteDecimal = partes[1] !== undefined ? ',' + partes[1].slice(0, 2) : '';
  return parteEntera + parteDecimal;
}

/**
 * Formatea un número estándar para cargarlo en el campo de texto cuando se edita.
 */
export function numberToInputString(valor: number): string {
  const partes = valor.toFixed(2).split('.');
  const parteEntera = new Intl.NumberFormat('es-AR').format(parseInt(partes[0], 10));
  return `${parteEntera},${partes[1]}`;
}

/**
 * Formatea una fecha YYYY-MM-DD a formato amigable DD/MM/AAAA.
 */
export function formatDate(fechaIso: string): string {
  if (!fechaIso) return '';
  const [anio, mes, dia] = fechaIso.split('-');
  if (!dia) return fechaIso;
  return `${dia}/${mes}/${anio}`;
}

/**
 * Devuelve el nombre del mes y año legible (ej. "Agosto 2026").
 */
export function formatMonthYear(mes: number, anio: number): string {
  const nombreMes = MESES_NOMBRES[mes - 1] || `Mes ${mes}`;
  return `${nombreMes} ${anio}`;
}

/**
 * Obtiene mes y año actuales.
 */
export function getCurrentDateInfo() {
  const hoy = new Date();
  return {
    dia: hoy.getDate(),
    mes: hoy.getMonth() + 1,
    anio: hoy.getFullYear(),
    isoString: hoy.toISOString().split('T')[0],
  };
}
