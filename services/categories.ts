import { supabase } from '@/lib/supabase';
import { Category } from '@/types';

export const CATEGORIAS_POR_DEFECTO: Category[] = [
  // Gastos
  { id: 1, nombre: 'Supermercado', tipo: 'gasto', icono: 'ShoppingCart' },
  { id: 2, nombre: 'Comida / Salidas', tipo: 'gasto', icono: 'Utensils' },
  { id: 3, nombre: 'Servicios e Impuestos', tipo: 'gasto', icono: 'Zap' },
  { id: 4, nombre: 'Vivienda / Alquiler', tipo: 'gasto', icono: 'HouseIcon' },
  { id: 5, nombre: 'Transporte / Auto', tipo: 'gasto', icono: 'Car' },
  { id: 6, nombre: 'Salud y Farmacia', tipo: 'gasto', icono: 'HeartPulse' },
  { id: 7, nombre: 'Gimnasio y Deporte', tipo: 'gasto', icono: 'Dumbbell' },
  { id: 8, nombre: 'Entretenimiento', tipo: 'gasto', icono: 'Film' },
  { id: 9, nombre: 'Educación', tipo: 'gasto', icono: 'GraduationCap' },
  { id: 10, nombre: 'Viajes', tipo: 'gasto', icono: 'Plane' },
  { id: 11, nombre: 'Compras y Ropa', tipo: 'gasto', icono: 'Tag' },
  { id: 12, nombre: 'Suscripciones', tipo: 'gasto', icono: 'Tv' },
  // Ingresos
  { id: 101, nombre: 'Sueldo / Salario', tipo: 'ingreso', icono: 'Briefcase' },
  { id: 102, nombre: 'Inversiones / Rendimientos', tipo: 'ingreso', icono: 'TrendingUp' },
  { id: 103, nombre: 'Freelance / Ventas', tipo: 'ingreso', icono: 'DollarSign' },
  { id: 104, nombre: 'Regalos / Otros', tipo: 'ingreso', icono: 'Gift' },
];

export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) return data as Category[];
  } catch (error) {
    console.error('Error al cargar categorías de Supabase:', error);
  }

  // Fallback
  return CATEGORIAS_POR_DEFECTO;
}

export async function createCategory(
  nombre: string,
  tipo: 'ingreso' | 'gasto',
  icono: string
): Promise<{ data: Category | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .insert([{ nombre: nombre.trim(), tipo, icono }])
      .select()
      .single();

    if (error) throw error;
    return { data: data as Category, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al crear la categoría';
    return { data: null, error: errorMsg };
  }
}

export async function updateCategory(
  id: number,
  updates: { nombre: string; tipo: 'ingreso' | 'gasto'; icono: string },
  anteriorNombre?: string
): Promise<{ data: Category | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .update({
        nombre: updates.nombre.trim(),
        tipo: updates.tipo,
        icono: updates.icono,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Si el nombre cambió, actualizamos también en cascada los registros históricos
    if (anteriorNombre && anteriorNombre.trim() !== updates.nombre.trim()) {
      try {
        await supabase
          .from('registros')
          .update({ categoria: updates.nombre.trim() })
          .eq('categoria', anteriorNombre.trim());
      } catch (cascadeErr) {
        console.warn('Advertencia actualizando registros vinculados:', cascadeErr);
      }
    }

    return { data: data as Category, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al actualizar la categoría';
    return { data: null, error: errorMsg };
  }
}

export async function deleteCategory(
  id: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al eliminar la categoría';
    return { success: false, error: errorMsg };
  }
}
