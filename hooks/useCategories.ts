'use client';
import { useState, useEffect, useCallback } from 'react';
import { Category } from '@/types';
import { getCategories, createCategory } from '@/services/categories';
import { useToast } from '@/components/ui/Toast';

export function useCategories() {
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [cargando, setCargando] = useState(true);
  const { success, error } = useToast();

  const cargarCategorias = useCallback(async () => {
    setCargando(true);
    const data = await getCategories();
    setCategorias(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    let activo = true;
    getCategories().then(data => {
      if (activo) {
        setCategorias(data);
        setCargando(false);
      }
    });

    return () => {
      activo = false;
    };
  }, []);

  const agregarCategoria = async (
    nombre: string,
    tipo: 'ingreso' | 'gasto',
    icono: string
  ): Promise<boolean> => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return false;

    const yaExiste = categorias.some(
      c => c.nombre.toLowerCase() === nombreLimpio.toLowerCase() && c.tipo === tipo
    );

    if (yaExiste) {
      error(`La categoría "${nombreLimpio}" ya existe.`);
      return false;
    }

    const res = await createCategory(nombreLimpio, tipo, icono);
    if (res.error) {
      error(res.error);
      return false;
    }

    if (res.data) {
      setCategorias(prev => [...prev, res.data!]);
      success(`Categoría "${nombreLimpio}" creada con éxito`);
      return true;
    }

    await cargarCategorias();
    return true;
  };

  return {
    categorias,
    cargando,
    recargarCategorias: cargarCategorias,
    agregarCategoria,
  };
}
