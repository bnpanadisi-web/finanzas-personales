import { supabase } from '@/lib/supabase';
import { CreditCard, InstallmentPurchase } from '@/types';
import {
  saveLocalCreditCards,
  saveLocalInstallmentPurchases,
} from '@/lib/localStorageEngine';

const SYNC_TIPO = 'sync';
const SYNC_CATEGORIA = '__CARDS_SYNC__';

interface CloudCardsPayload {
  version: number;
  cards: CreditCard[];
  purchases: InstallmentPurchase[];
  updatedAt: string;
}

/**
 * Obtiene las tarjetas y consumos almacenados en Supabase.
 */
export async function fetchCloudCards(): Promise<{
  cards: CreditCard[];
  purchases: InstallmentPurchase[];
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
      console.warn('No se pudo consultar Supabase para tarjetas:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return { cards: [], purchases: [] };
    }

    const row = data[0];
    if (!row.descripcion) {
      return { cards: [], purchases: [], rowId: row.id };
    }

    const parsed: CloudCardsPayload = JSON.parse(row.descripcion);
    return {
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      updatedAt: parsed.updatedAt,
      rowId: row.id,
    };
  } catch (err) {
    console.warn('Error leyendo tarjetas desde la nube:', err);
    return null;
  }
}

/**
 * Guarda las tarjetas y compras en Supabase.
 */
export async function saveCloudCards(
  cards: CreditCard[],
  purchases: InstallmentPurchase[]
): Promise<boolean> {
  try {
    const payloadJson = JSON.stringify({
      version: 1,
      cards,
      purchases,
      updatedAt: new Date().toISOString(),
    });

    // Verificar si ya existe el registro de sincronización
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
        console.warn('Error actualizando tarjetas en la nube:', updErr.message);
        return false;
      }
      return true;
    } else {
      // Insertar nuevo registro
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
        console.warn('Error creando registro de tarjetas en la nube:', insErr.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.warn('Excepción guardando tarjetas en la nube:', err);
    return false;
  }
}

/**
 * Sincronización inteligente de tarjetas respetando el celular como fuente original:
 * - Si el dispositivo local (celular) tiene tarjetas cargadas y la nube está vacía,
 *   sube las del celular inmediatamente a Supabase.
 * - Si ambos tienen datos, combina por ID (preservando siempre los datos locales).
 * - Si el dispositivo local no tiene tarjetas (ej: abriendo Vercel en la PC),
 *   descarga las de la nube y las guarda localmente.
 */
export async function syncCardsWithCloud(
  localCards: CreditCard[],
  localPurchases: InstallmentPurchase[]
): Promise<{
  cards: CreditCard[];
  purchases: InstallmentPurchase[];
  huboCambios: boolean;
}> {
  const cloudData = await fetchCloudCards();

  // Si falló la conexión con Supabase (offline), mantener datos locales intactos
  if (!cloudData) {
    return { cards: localCards, purchases: localPurchases, huboCambios: false };
  }

  const { cards: cloudCards, purchases: cloudPurchases } = cloudData;

  // CASO 1: El celular tiene tarjetas y la nube está vacía -> Subir a la nube como fuente original
  if (localCards.length > 0 && cloudCards.length === 0) {
    await saveCloudCards(localCards, localPurchases);
    return { cards: localCards, purchases: localPurchases, huboCambios: false };
  }

  // CASO 2: El dispositivo local está vacío (ej. Vercel) y la nube tiene tarjetas -> Descargar de la nube
  if (localCards.length === 0 && cloudCards.length > 0) {
    saveLocalCreditCards(cloudCards);
    saveLocalInstallmentPurchases(cloudPurchases);
    return { cards: cloudCards, purchases: cloudPurchases, huboCambios: true };
  }

  // CASO 3: Ambos tienen tarjetas -> Merge inteligente preservando datos del celular
  if (localCards.length > 0 && cloudCards.length > 0) {
    // Tarjetas: mantener locales y agregar las de la nube que no estén localmente
    const cardMap = new Map<string, CreditCard>();
    cloudCards.forEach(c => cardMap.set(c.id, c));
    // Las locales tienen prioridad sobre las de la nube
    localCards.forEach(c => cardMap.set(c.id, c));
    const mergedCards = Array.from(cardMap.values());

    // Compras: mantener locales y agregar las de la nube que no estén localmente
    const purchaseMap = new Map<string, InstallmentPurchase>();
    cloudPurchases.forEach(p => purchaseMap.set(p.id, p));
    localPurchases.forEach(p => purchaseMap.set(p.id, p));
    const mergedPurchases = Array.from(purchaseMap.values());

    // Guardar tanto localmente como en la nube
    saveLocalCreditCards(mergedCards);
    saveLocalInstallmentPurchases(mergedPurchases);
    await saveCloudCards(mergedCards, mergedPurchases);

    const huboCambios =
      mergedCards.length !== localCards.length ||
      mergedPurchases.length !== localPurchases.length;

    return { cards: mergedCards, purchases: mergedPurchases, huboCambios };
  }

  // CASO 4: Ambos vacíos
  return { cards: [], purchases: [], huboCambios: false };
}
