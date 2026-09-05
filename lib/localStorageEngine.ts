import { Category, Transaction } from '@/types';
import { CATEGORIAS_POR_DEFECTO } from '@/services/categories';
import { CUENTAS_INICIALES } from '@/hooks/useAccounts';

const KEY_REGISTROS = 'finanzas_local_registros';
const KEY_CATEGORIAS = 'finanzas_local_categorias';
const KEY_CUENTAS = 'finanzas_local_cuentas';

// Determina si debemos usar modo local (por defecto para Play Store / Offline)
export function isLocalOnlyMode(): boolean {
  if (typeof window === 'undefined') return true;
  // Si explícitamente se configuró Supabase y está activo en el entorno
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  return !useSupabase;
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

  // Cascada en transacciones locales si cambió el nombre
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
