import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types';

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('registros')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error cargando transacciones de Supabase:', error.message);
    return [];
  }

  return (data || []) as Transaction[];
}

export async function insertTransaction(
  t: Omit<Transaction, 'id'>
): Promise<{ data: Transaction[] | null; error: string | null }> {
  try {
    // Si tiene cuotas > 1, generamos los N registros distribuidos mes a mes
    if (t.cuotas && t.cuotas > 1 && t.tipo === 'gasto') {
      const recordsToInsert: Omit<Transaction, 'id'>[] = [];
      const fechaBase = new Date(t.fecha + 'T00:00:00');
      const montoPorCuota = parseFloat((t.monto / t.cuotas).toFixed(2));

      for (let i = 1; i <= t.cuotas; i++) {
        const fechaCuota = new Date(fechaBase);
        fechaCuota.setMonth(fechaBase.getMonth() + (i - 1));
        const fechaIso = fechaCuota.toISOString().split('T')[0];

        recordsToInsert.push({
          tipo: t.tipo,
          monto: montoPorCuota,
          moneda: t.moneda,
          categoria: t.categoria,
          cuenta: t.cuenta,
          descripcion: `${t.descripcion ? t.descripcion + ' ' : ''}(Cuota ${i}/${t.cuotas})`,
          fecha: fechaIso,
          cuotas: t.cuotas,
          cuotaActual: i,
          esRecurrente: t.esRecurrente,
        });
      }

      const { data, error } = await supabase.from('registros').insert(recordsToInsert).select();
      if (error) throw error;
      return { data: (data || []) as Transaction[], error: null };
    }

    // Registro estándar o transferencia
    const { data, error } = await supabase
      .from('registros')
      .insert([
        {
          tipo: t.tipo,
          monto: t.monto,
          moneda: t.moneda,
          categoria: t.categoria,
          cuenta: t.cuenta,
          cuentaDestino: t.cuentaDestino || null,
          descripcion: t.descripcion || null,
          fecha: t.fecha,
          esRecurrente: !!t.esRecurrente,
        },
      ])
      .select();

    if (error) throw error;
    return { data: (data || []) as Transaction[], error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error guardando registro';
    return { data: null, error: errorMsg };
  }
}

export async function updateTransaction(
  t: Transaction
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('registros')
      .update({
        tipo: t.tipo,
        monto: t.monto,
        moneda: t.moneda,
        categoria: t.categoria,
        cuenta: t.cuenta,
        cuentaDestino: t.cuentaDestino || null,
        descripcion: t.descripcion || null,
        fecha: t.fecha,
        esRecurrente: !!t.esRecurrente,
      })
      .eq('id', t.id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error actualizando registro';
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
