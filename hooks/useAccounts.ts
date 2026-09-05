'use client';
import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';

export const CUENTAS_INICIALES = [
  'Efectivo',
  'Cuenta Bancaria',
  'Billetera Virtual',
  'Tarjeta de Crédito',
];

const STORAGE_KEY = 'finanzas_accounts';

export function useAccounts() {
  const [cuentas, setCuentas] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error('Error cargando cuentas:', e);
      }
    }
    return CUENTAS_INICIALES;
  });

  const { success, error, info } = useToast();

  const persistCuentas = useCallback((nuevas: string[]) => {
    setCuentas(nuevas);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevas));
    }
  }, []);

  const agregarCuenta = useCallback(
    (nombre: string): boolean => {
      const limpio = nombre.trim();
      if (!limpio) return false;

      if (cuentas.some(c => c.toLowerCase() === limpio.toLowerCase())) {
        error(`La cuenta "${limpio}" ya existe.`);
        return false;
      }

      const updated = [...cuentas, limpio];
      persistCuentas(updated);
      success(`Cuenta "${limpio}" agregada`);
      return true;
    },
    [cuentas, persistCuentas, success, error]
  );

  const editarCuenta = useCallback(
    (nombreViejo: string, nombreNuevo: string): boolean => {
      const limpio = nombreNuevo.trim();
      if (!limpio) return false;

      if (
        limpio.toLowerCase() !== nombreViejo.toLowerCase() &&
        cuentas.some(c => c.toLowerCase() === limpio.toLowerCase())
      ) {
        error(`Ya existe una cuenta llamada "${limpio}".`);
        return false;
      }

      const updated = cuentas.map(c => (c === nombreViejo ? limpio : c));
      persistCuentas(updated);
      success(`Cuenta renombrada a "${limpio}"`);
      return true;
    },
    [cuentas, persistCuentas, success, error]
  );

  const eliminarCuenta = useCallback(
    (nombre: string): boolean => {
      if (cuentas.length <= 1) {
        error('Debes conservar al menos una cuenta.');
        return false;
      }

      const updated = cuentas.filter(c => c !== nombre);
      persistCuentas(updated);
      info(`Cuenta "${nombre}" eliminada`);
      return true;
    },
    [cuentas, persistCuentas, info, error]
  );

  return {
    cuentas,
    agregarCuenta,
    editarCuenta,
    eliminarCuenta,
  };
}
