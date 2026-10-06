import { supabase } from '@/lib/supabase';
import { SavingsGoal } from '@/types';
import { saveLocalSavingsGoals } from '@/lib/localStorageEngine';

const SYNC_TIPO = 'sync';
const SYNC_CATEGORIA = '__SAVINGS_SYNC__';

interface CloudSavingsPayload {
  version: number;
  goals: SavingsGoal[];
  updatedAt: string;
}

/**
 * Obtiene las metas de ahorro / reservas almacenadas en la nube (Supabase).
 */
export async function fetchCloudSavings(): Promise<{
  goals: SavingsGoal[];
  updatedAt?: string;
  rowId?: number | string;
} | null> {
  try {
    const { data, error } = await supabase
      .from('registros')
      .select('id, descripcion')
      .eq('tipo', SYNC_TIPO)
      .eq('categoria', SYNC_CATEGORIA)
      .limit(1);

    if (error) {
      console.warn('No se pudo consultar Supabase para reservas:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return { goals: [] };
    }

    const row = data[0];
    if (!row.descripcion) {
      return { goals: [], rowId: row.id };
    }

    const parsed: CloudSavingsPayload = JSON.parse(row.descripcion);
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      updatedAt: parsed.updatedAt,
      rowId: row.id,
    };
  } catch (err) {
    console.warn('Error leyendo reservas desde la nube:', err);
    return null;
  }
}

/**
 * Guarda las metas de ahorro / reservas en Supabase.
 */
export async function saveCloudSavings(goals: SavingsGoal[]): Promise<boolean> {
  try {
    const payloadJson = JSON.stringify({
      version: 1,
      goals,
      updatedAt: new Date().toISOString(),
    });

    const { data: existing } = await supabase
      .from('registros')
      .select('id')
      .eq('tipo', SYNC_TIPO)
      .eq('categoria', SYNC_CATEGORIA)
      .limit(1);

    if (existing && existing.length > 0) {
      const rowId = existing[0].id;
      const { error: updErr } = await supabase
        .from('registros')
        .update({
          descripcion: payloadJson,
          fecha: new Date().toISOString().split('T')[0],
        })
        .eq('id', rowId);

      if (updErr) {
        console.warn('Error actualizando reservas en la nube:', updErr.message);
        return false;
      }
      return true;
    } else {
      const { error: insErr } = await supabase.from('registros').insert([
        {
          tipo: SYNC_TIPO,
          categoria: SYNC_CATEGORIA,
          cuenta: 'SISTEMA',
          fecha: '1970-01-01',
          monto: 0,
          moneda: 'ARS',
          descripcion: payloadJson,
        },
      ]);

      if (insErr) {
        console.warn('Error creando registro de reservas en la nube:', insErr.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.warn('Excepción guardando reservas en la nube:', err);
    return false;
  }
}

/**
 * Sincronización inteligente de reservas respetando el celular como fuente original:
 * - Si el celular ya tiene reservas creadas/editadas y la nube está vacía, sube las del celular.
 * - Si el dispositivo local no tiene reservas (ej: abriendo en Vercel en la PC por primera vez),
 *   descarga las de la nube y las guarda en el almacenamiento local.
 * - Si ambos tienen reservas, combina por ID con prioridad local (la fuente original manda).
 */
export async function syncSavingsWithCloud(localGoals: SavingsGoal[]): Promise<{
  goals: SavingsGoal[];
  huboCambios: boolean;
}> {
  const cloudData = await fetchCloudSavings();

  // Si falló la conexión (offline), preservar reservas locales intactas
  if (!cloudData) {
    return { goals: localGoals, huboCambios: false };
  }

  const { goals: cloudGoals } = cloudData;

  const localHasData = localGoals.length > 0;
  const cloudHasData = cloudGoals.length > 0;

  // CASO 1: Local tiene datos pero la nube está vacía (primer inicio desde celular como fuente de la verdad)
  if (localHasData && !cloudHasData) {
    await saveCloudSavings(localGoals);
    return { goals: localGoals, huboCambios: false };
  }

  // CASO 2: Local no tiene datos pero la nube sí (ej: abriendo Vercel en la PC)
  if (!localHasData && cloudHasData) {
    saveLocalSavingsGoals(cloudGoals);
    return { goals: cloudGoals, huboCambios: true };
  }

  // CASO 3: Ambos tienen datos -> Combinar por ID con prioridad en los datos locales (celular manda)
  if (localHasData && cloudHasData) {
    const localIds = new Set(localGoals.map(g => g.id));
    const merged = [...localGoals];

    for (const cg of cloudGoals) {
      if (!localIds.has(cg.id)) {
        merged.push(cg);
      }
    }

    // Persistir resultado combinado
    saveLocalSavingsGoals(merged);
    await saveCloudSavings(merged);

    const cambio = merged.length !== localGoals.length;
    return { goals: merged, huboCambios: cambio };
  }

  return { goals: localGoals, huboCambios: false };
}
