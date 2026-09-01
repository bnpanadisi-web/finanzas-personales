'use client';
import { useState, useEffect, useCallback } from 'react';
import { Category } from '@/types';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/services/categories';
import { useToast } from '@/components/ui/Toast';

export function useCategories() {
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [cargando, setCargando] = useState(true);
  const { success, error, info } = useToast();

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

  const editarCategoria = async (
    id: number,
    updates: { nombre: string; tipo: 'ingreso' | 'gasto'; icono: string },
    anteriorNombre?: string
  ): Promise<boolean> => {
    const nombreLimpio = updates.nombre.trim();
    if (!nombreLimpio) return false;

    const yaExiste = categorias.some(
      c => c.id !== id && c.nombre.toLowerCase() === nombreLimpio.toLowerCase() && c.tipo === updates.tipo
    );

    if (yaExiste) {
      error(`Ya existe otra categoría llamada "${nombreLimpio}".`);
      return false;
    }

    const res = await updateCategory(id, { ...updates, nombre: nombreLimpio }, anteriorNombre);
    if (res.error) {
      error(res.error);
      return false;
    }

    if (res.data) {
      setCategorias(prev => prev.map(c => (c.id === id ? res.data! : c)));
      success(`Categoría "${nombreLimpio}" actualizada`);
      return true;
    }

    await cargarCategorias();
    return true;
  };

  const eliminarCategoria = async (id: number): Promise<boolean> => {
    const target = categorias.find(c => c.id === id);
    const res = await deleteCategory(id);
    if (res.error) {
      error(res.error);
      return false;
    }

    setCategorias(prev => prev.filter(c => c.id !== id));
    info(`Categoría "${target?.nombre || ''}" eliminada`);
    return true;
  };

  return {
    categorias,
    cargando,
    recargarCategorias: cargarCategorias,
    agregarCategoria,
    editarCategoria,
    eliminarCategoria,
  };
}
