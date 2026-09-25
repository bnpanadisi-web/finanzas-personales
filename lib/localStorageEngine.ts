import { Capacitor } from '@capacitor/core';
import { Category, Transaction, Budget, SavingsGoal } from '@/types';
import { CATEGORIAS_POR_DEFECTO } from '@/services/categories';
import { CUENTAS_INICIALES } from '@/hooks/useAccounts';

const KEY_REGISTROS = 'finanzas_local_registros';
const KEY_CATEGORIAS = 'finanzas_local_categorias';
const KEY_CUENTAS = 'finanzas_local_cuentas';

// Determina si debemos usar modo local:
// 1. En la app nativa instalada en el celular (Capacitor Android): 100% LOCAL y OFFLINE.
// 2. En la versión web personal (Vercel / navegador): conecta a Supabase con tus datos reales (Julio, Agosto, Septiembre).
export function isLocalOnlyMode(): boolean {
  if (typeof window !== 'undefined') {
    // Si corre como app nativa empaquetada en Android/iOS
    if (Capacitor.isNativePlatform()) {
      return true;
    }
  }
  // Si explícitamente se construye con BUILD_MOBILE=true
  if (process.env.BUILD_MOBILE === 'true') {
    return true;
  }
  // En la web (Vercel / navegador de escritorio o móvil vía link): usa Supabase
  return false;
}

// ----------------------------------------------------
// TRANSACCIONES LOCALES (100% en el celular)
// ----------------------------------------------------
export function getLocalTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_REGISTROS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error leyendo registros locales:', e);
  }
  return [];
}

export function saveLocalTransactions(records: Transaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_REGISTROS, JSON.stringify(records));
  } catch (e) {
    console.error('Error guardando registros locales:', e);
  }
}

export function insertLocalTransaction(
  t: Omit<Transaction, 'id'>
): Transaction[] {
  const current = getLocalTransactions();
  const createdNow = new Date().toISOString();

  // Si tiene cuotas > 1 en gasto
  if (t.cuotas && t.cuotas > 1 && t.tipo === 'gasto') {
    const newItems: Transaction[] = [];
    const fechaBase = new Date(t.fecha + 'T00:00:00');
    const montoPorCuota = parseFloat((t.monto / t.cuotas).toFixed(2));

    for (let i = 1; i <= t.cuotas; i++) {
      const fechaCuota = new Date(fechaBase);
      fechaCuota.setMonth(fechaBase.getMonth() + (i - 1));
      const fechaIso = fechaCuota.toISOString().split('T')[0];

      const item: Transaction = {
        ...t,
        id: 'loc_' + Date.now() + '_' + i,
        monto: montoPorCuota,
        descripcion: `${t.descripcion ? t.descripcion + ' ' : ''}(Cuota ${i}/${t.cuotas})`,
        fecha: fechaIso,
        cuotaActual: i,
        creadoEn: createdNow,
      };
      newItems.push(item);
    }

    const updated = [...newItems, ...current];
    saveLocalTransactions(updated);
    return newItems;
  }

  const singleItem: Transaction = {
    ...t,
    id: 'loc_' + Date.now(),
    creadoEn: createdNow,
  };

  const updated = [singleItem, ...current];
  saveLocalTransactions(updated);
  return [singleItem];
}

export function updateLocalTransaction(t: Transaction): boolean {
  const current = getLocalTransactions();
  const updated = current.map(item => (item.id === t.id ? t : item));
  saveLocalTransactions(updated);
  return true;
}

export function deleteLocalTransaction(id: number | string): boolean {
  const current = getLocalTransactions();
  const updated = current.filter(item => item.id !== id);
  saveLocalTransactions(updated);
  return true;
}

// ----------------------------------------------------
// CATEGORÍAS LOCALES
// ----------------------------------------------------
export function getLocalCategories(): Category[] {
  if (typeof window === 'undefined') return CATEGORIAS_POR_DEFECTO;
  try {
    const raw = localStorage.getItem(KEY_CATEGORIAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error leyendo categorías locales:', e);
  }
  return CATEGORIAS_POR_DEFECTO;
}

export function saveLocalCategories(cats: Category[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_CATEGORIAS, JSON.stringify(cats));
  } catch (e) {
    console.error('Error guardando categorías locales:', e);
  }
}

export function createLocalCategory(
  nombre: string,
  tipo: 'ingreso' | 'gasto',
  icono: string
): Category {
  const current = getLocalCategories();
  const newCat: Category = {
    id: Date.now(),
    nombre: nombre.trim(),
    tipo,
    icono,
  };
  const updated = [...current, newCat];
  saveLocalCategories(updated);
  return newCat;
}

export function updateLocalCategory(
  id: number,
  updates: { nombre: string; tipo: 'ingreso' | 'gasto'; icono: string },
  anteriorNombre?: string
): Category {
  const current = getLocalCategories();
  const updated = current.map(c =>
    c.id === id ? { ...c, ...updates, nombre: updates.nombre.trim() } : c
  );
  saveLocalCategories(updated);

  if (anteriorNombre && anteriorNombre.trim() !== updates.nombre.trim()) {
    const trans = getLocalTransactions();
    const transUpdated = trans.map(t =>
      t.categoria === anteriorNombre.trim()
        ? { ...t, categoria: updates.nombre.trim() }
        : t
    );
    saveLocalTransactions(transUpdated);
  }

  return { id, ...updates, nombre: updates.nombre.trim() };
}

export function deleteLocalCategory(id: number): boolean {
  const current = getLocalCategories();
  const updated = current.filter(c => c.id !== id);
  saveLocalCategories(updated);
  return true;
}

// ----------------------------------------------------
// CUENTAS LOCALES
// ----------------------------------------------------
export function getLocalAccounts(): string[] {
  if (typeof window === 'undefined') return CUENTAS_INICIALES;
  try {
    const raw = localStorage.getItem(KEY_CUENTAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error leyendo cuentas locales:', e);
  }
  return CUENTAS_INICIALES;
}

export function saveLocalAccounts(cuentas: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_CUENTAS, JSON.stringify(cuentas));
  } catch (e) {
    console.error('Error guardando cuentas locales:', e);
  }
}

// ----------------------------------------------------
// COPIA DE SEGURIDAD GENERAL (PARA GOOGLE DRIVE / ARCHIVO)
// ----------------------------------------------------
export interface AppBackupData {
  version: number;
  exportedAt: string;
  app: string;
  data: {
    transactions: Transaction[];
    categories: Category[];
    accounts: string[];
    budgets: Budget[];
    savingsGoals: SavingsGoal[];
    settings?: {
      darkMode?: boolean;
      ocultarMontos?: boolean;
      customPin?: string | null;
      pinDisabled?: boolean;
    };
  };
}

const KEY_LAST_BACKUP = 'finanzas_last_backup_time';

export function getLastBackupTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_LAST_BACKUP);
}

export function setLastBackupTime(timeIso: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_LAST_BACKUP, timeIso);
}

export function exportAllAppData(currentTransactions?: Transaction[]): AppBackupData {
  if (typeof window === 'undefined') {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      app: 'Finanzas Personales',
      data: {
        transactions: [],
        categories: [],
        accounts: [],
        budgets: [],
        savingsGoals: [],
      },
    };
  }

  // 1. Transacciones (usa las activas en pantalla o las locales)
  const transactions = currentTransactions && currentTransactions.length > 0
    ? currentTransactions
    : getLocalTransactions();

  // 2. Categorías
  const categories = getLocalCategories();

  // 3. Cuentas
  let accounts = getLocalAccounts();
  try {
    const rawAcc = localStorage.getItem('finanzas_accounts');
    if (rawAcc) {
      const parsedAcc = JSON.parse(rawAcc);
      if (Array.isArray(parsedAcc) && parsedAcc.length > 0) {
        accounts = parsedAcc;
      }
    }
  } catch (e) {
    console.warn('Error leyendo finanzas_accounts:', e);
  }

  // 4. Presupuestos
  let budgets: Budget[] = [];
  try {
    const rawBudgets = localStorage.getItem('finanzas_budgets_list');
    if (rawBudgets) budgets = JSON.parse(rawBudgets);
  } catch (e) {
    console.warn('Error leyendo presupuestos:', e);
  }

  // 5. Metas de ahorro / Reservas
  let savingsGoals: SavingsGoal[] = [];
  try {
    const rawSavings = localStorage.getItem('finanzas_savings_goals');
    if (rawSavings) savingsGoals = JSON.parse(rawSavings);
  } catch (e) {
    console.warn('Error leyendo metas de ahorro:', e);
  }

  // 6. Preferencias
  const settings = {
    darkMode: localStorage.getItem('finanzas_dark') === 'true',
    ocultarMontos: localStorage.getItem('finanzas_privacidad') === 'true',
    customPin: localStorage.getItem('finanzas_custom_pin'),
    pinDisabled: localStorage.getItem('finanzas_pin_disabled') === 'true',
  };

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    app: 'Finanzas Personales',
    data: {
      transactions,
      categories,
      accounts,
      budgets,
      savingsGoals,
      settings,
    },
  };
}

export function restoreAllAppData(backup: AppBackupData): {
  success: boolean;
  counts: {
    transactions: number;
    categories: number;
    accounts: number;
    budgets: number;
    savingsGoals: number;
  };
  error?: string;
} {
  if (typeof window === 'undefined') {
    return {
      success: false,
      counts: { transactions: 0, categories: 0, accounts: 0, budgets: 0, savingsGoals: 0 },
      error: 'No se puede restaurar fuera del navegador',
    };
  }

  try {
    if (!backup || !backup.data) {
      throw new Error('Estructura de archivo de respaldo no válida.');
    }

    const { data } = backup;

    // Restaurar transacciones
    if (Array.isArray(data.transactions)) {
      saveLocalTransactions(data.transactions);
    }

    // Restaurar categorías
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      saveLocalCategories(data.categories);
    }

    // Restaurar cuentas
    if (Array.isArray(data.accounts) && data.accounts.length > 0) {
      saveLocalAccounts(data.accounts);
      localStorage.setItem('finanzas_accounts', JSON.stringify(data.accounts));
    }

    // Restaurar presupuestos
    if (Array.isArray(data.budgets)) {
      localStorage.setItem('finanzas_budgets_list', JSON.stringify(data.budgets));
    }

    // Restaurar metas de ahorro
    if (Array.isArray(data.savingsGoals)) {
      localStorage.setItem('finanzas_savings_goals', JSON.stringify(data.savingsGoals));
    }

    // Restaurar ajustes opcionales
    if (data.settings) {
      if (typeof data.settings.darkMode === 'boolean') {
        localStorage.setItem('finanzas_dark', String(data.settings.darkMode));
      }
      if (typeof data.settings.ocultarMontos === 'boolean') {
        localStorage.setItem('finanzas_privacidad', String(data.settings.ocultarMontos));
      }
      if (data.settings.customPin) {
        localStorage.setItem('finanzas_custom_pin', data.settings.customPin);
      }
      if (data.settings.pinDisabled) {
        localStorage.setItem('finanzas_pin_disabled', 'true');
      }
    }

    setLastBackupTime(new Date().toISOString());

    return {
      success: true,
      counts: {
        transactions: Array.isArray(data.transactions) ? data.transactions.length : 0,
        categories: Array.isArray(data.categories) ? data.categories.length : 0,
        accounts: Array.isArray(data.accounts) ? data.accounts.length : 0,
        budgets: Array.isArray(data.budgets) ? data.budgets.length : 0,
        savingsGoals: Array.isArray(data.savingsGoals) ? data.savingsGoals.length : 0,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido al restaurar datos';
    return {
      success: false,
      counts: { transactions: 0, categories: 0, accounts: 0, budgets: 0, savingsGoals: 0 },
      error: errorMsg,
    };
  }
}
