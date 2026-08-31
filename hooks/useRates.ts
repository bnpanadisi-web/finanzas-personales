'use client';
import { useState, useEffect } from 'react';
import { RatesData } from '@/types';
import { fetchDolarRates } from '@/services/rates';

export function useRates() {
  const [rates, setRates] = useState<RatesData>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let montado = true;
    fetchDolarRates().then(data => {
      if (montado) {
        setRates(data);
        setCargando(false);
      }
    });

    return () => {
      montado = false;
    };
  }, []);

  return { rates, cargando };
}
