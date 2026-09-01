import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types';

// Helper para empaquetar metadata en el campo descripcion sin alterar el schema de Supabase
function formatRegistroDescripcion(
  desc: string | undefined,
  options?: {
    cuentaDestino?: string;
    cuotaText?: string;
    esRecurrente?: boolean;
  }
): string {
  const parts: string[] = [];
  if (desc && desc.trim()) {
    parts.push(desc.trim());
  }
  if (options?.cuotaText) {
    parts.push(options.cuotaText);
  }
  if (options?.cuentaDestino) {
    parts.push(`[Destino: ${options.cuentaDestino}]`);
  }
  if (options?.esRecurrente) {
    parts.push('[Recurrente]');
  }
  return parts.join(' ').trim();
}

interface RawSupabaseRegistro {
  id: number | string;
  created_at?: string;
  tipo: string;
  monto: number;
  categoria: string;
  cuenta: string;
  descripcion?: string | null;
  fecha: string;
  moneda?: string | null;
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('registros')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error cargando transacciones de Supabase:', error.message);
    return [];
  }

  const rawList = (data || []) as RawSupabaseRegistro[];

  return rawList.map(row => {
    let cuentaDestino: string | undefined = undefined;
    let cuotas: number | undefined = undefined;
    let cuotaActual: number | undefined = undefined;
    let esRecurrente = false;
    let desc = (row.descripcion || '').trim();

    // Extraer [Destino: NombreCuenta]
    const matchDestino = desc.match(/\[Destino:\s*([^\]]+)\]/i);
    if (matchDestino) {
      cuentaDestino = matchDestino[1].trim();
      desc = desc.replace(matchDestino[0], '').trim();
    }

    // Extraer (Cuota X/Y)
    const matchCuota = desc.match(/\(Cuota\s*(\d+)\/(\d+)\)/i);
    if (matchCuota) {
      cuotaActual = parseInt(matchCuota[1], 10);
      cuotas = parseInt(matchCuota[2], 10);
    }

    // Extraer [Recurrente]
    if (desc.includes('[Recurrente]')) {
      esRecurrente = true;
      desc = desc.replace('[Recurrente]', '').trim();
    }

    return {
      id: row.id,
      tipo: row.tipo as Transaction['tipo'],
      monto: Number(row.monto),
      moneda: (row.moneda as Transaction['moneda']) || 'ARS',
      categoria: row.categoria,
      cuenta: row.cuenta,
      cuentaDestino,
      descripcion: desc,
      fecha: row.fecha,
      cuotas,
      cuotaActual,
      esRecurrente,
      creadoEn: row.created_at,
    };
  });
}

export async function insertTransaction(
  t: Omit<Transaction, 'id'>
): Promise<{ data: Transaction[] | null; error: string | null }> {
  try {
    // Si tiene cuotas > 1, generamos los N registros distribuidos mes a mes
    if (t.cuotas && t.cuotas > 1 && t.tipo === 'gasto') {
      const recordsToInsert = [];
      const fechaBase = new Date(t.fecha + 'T00:00:00');
      const montoPorCuota = parseFloat((t.monto / t.cuotas).toFixed(2));

      for (let i = 1; i <= t.cuotas; i++) {
        const fechaCuota = new Date(fechaBase);
        fechaCuota.setMonth(fechaBase.getMonth() + (i - 1));
        const fechaIso = fechaCuota.toISOString().split('T')[0];

        const descFinal = formatRegistroDescripcion(t.descripcion, {
          cuotaText: `(Cuota ${i}/${t.cuotas})`,
          esRecurrente: t.esRecurrente,
        });

        recordsToInsert.push({
          tipo: t.tipo,
          monto: montoPorCuota,
          moneda: t.moneda || 'ARS',
          categoria: t.categoria,
          cuenta: t.cuenta,
          descripcion: descFinal,
          fecha: fechaIso,
        });
      }

      const { data, error } = await supabase.from('registros').insert(recordsToInsert).select();
      if (error) throw error;
      return { data: (data || []) as Transaction[], error: null };
    }

    // Registro estándar o transferencia (solo enviamos columnas existentes en Supabase)
    const descFinal = formatRegistroDescripcion(t.descripcion, {
      cuentaDestino: t.tipo === 'transferencia' ? t.cuentaDestino : undefined,
      esRecurrente: t.esRecurrente,
    });

    const payload = {
      tipo: t.tipo,
      monto: t.monto,
      moneda: t.moneda || 'ARS',
      categoria: t.categoria,
      cuenta: t.cuenta,
      descripcion: descFinal,
      fecha: t.fecha,
    };

    const { data, error } = await supabase
      .from('registros')
      .insert([payload])
      .select();

    if (error) throw error;
    return { data: (data || []) as Transaction[], error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error guardando registro';
    console.error('Error insertando registro en Supabase:', err);
    return { data: null, error: errorMsg };
  }
}

export async function updateTransaction(
  t: Transaction
): Promise<{ success: boolean; error: string | null }> {
  try {
    const descFinal = formatRegistroDescripcion(t.descripcion, {
      cuentaDestino: t.tipo === 'transferencia' ? t.cuentaDestino : undefined,
      cuotaText: t.cuotas && t.cuotas > 1 ? `(Cuota ${t.cuotaActual || 1}/${t.cuotas})` : undefined,
      esRecurrente: t.esRecurrente,
    });

    const payload = {
      tipo: t.tipo,
      monto: t.monto,
      moneda: t.moneda || 'ARS',
      categoria: t.categoria,
      cuenta: t.cuenta,
      descripcion: descFinal,
      fecha: t.fecha,
    };

    const { error } = await supabase
      .from('registros')
      .update(payload)
      .eq('id', t.id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error actualizando registro';
    console.error('Error actualizando registro en Supabase:', err);
    return { success: false, error: errorMsg };
  }
}

export async function deleteTransaction(
  id: number | string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('registros').delete().eq('id', id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error eliminando registro';
    return { success: false, error: errorMsg };
  }
}

export async function importBatchTransactions(
  transactions: Transaction[]
): Promise<{ count: number; error: string | null }> {
  if (!transactions.length) return { count: 0, error: null };
  try {
    const payload = transactions.map(t => ({
      tipo: t.tipo,
      monto: t.monto,
      moneda: t.moneda || 'ARS',
      categoria: t.categoria,
      cuenta: t.cuenta,
      descripcion: t.descripcion ? `${t.descripcion} (Importado Modo Viaje)` : '(Importado Modo Viaje)',
      fecha: t.fecha,
    }));

    const { error } = await supabase.from('registros').insert(payload);
    if (error) throw error;
    return { count: payload.length, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error importando registros a Supabase';
    return { count: 0, error: errorMsg };
  }
}

export function exportToCSV(transactions: Transaction[], filenamePrefix: string = 'mis_finanzas') {
  if (transactions.length === 0) return false;

  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // BOM para compatibilidad con acentos en Excel
  csvContent += 'ID,Tipo,Monto,Moneda,Categoria,Cuenta,Cuenta Destino,Fecha,Descripcion,Es Recurrente\n';

  transactions.forEach(r => {
    const desc = r.descripcion ? `"${r.descripcion.replace(/"/g, '""')}"` : '""';
    const cDestino = r.cuentaDestino ? `"${r.cuentaDestino}"` : '""';
    csvContent += `${r.id},${r.tipo},${r.monto},${r.moneda || 'ARS'},"${r.categoria}","${r.cuenta}",${cDestino},${r.fecha},${desc},${r.esRecurrente ? 'SI' : 'NO'}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const hoy = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${filenamePrefix}_${hoy}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
