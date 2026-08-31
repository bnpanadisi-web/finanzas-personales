import { DolarRate, RatesData } from '@/types';

const RATES_CACHE_KEY = 'finanzas_dolar_rates_cache';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

export async function fetchDolarRates(): Promise<RatesData> {
  // 1. Revisar caché local primero
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(RATES_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          return data;
        }
      }
    } catch {
      // Continuar si falla el parseo
    }
  }

  // 2. Fetch a la API pública de cotizaciones
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error('Error al consultar DolarApi');

    const rawList: DolarRate[] = await res.json();
    const rates: RatesData = {
      blue: rawList.find(d => d.casa.toLowerCase() === 'blue'),
      oficial: rawList.find(d => d.casa.toLowerCase() === 'oficial'),
      mep: rawList.find(d => d.casa.toLowerCase() === 'bolsa' || d.casa.toLowerCase() === 'mep'),
      ccl: rawList.find(d => d.casa.toLowerCase() === 'contadoconliqui' || d.casa.toLowerCase() === 'ccl'),
      tarjeta: rawList.find(d => d.casa.toLowerCase() === 'tarjeta'),
      ultimaActualizacion: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        RATES_CACHE_KEY,
        JSON.stringify({ data: rates, timestamp: Date.now() })
      );
    }

    return rates;
  } catch (error) {
    console.warn('No se pudo actualizar la cotización del dólar en vivo:', error);
    // Retornar caché anterior si existe aunque haya expirado
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(RATES_CACHE_KEY);
        if (cached) return JSON.parse(cached).data;
      } catch {}
    }
    return {};
  }
}
