import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno para Supabase');
}

// Patrón Singleton para evitar clientes duplicados en Hot Reload
global.supabaseClient = global.supabaseClient || createClient(supabaseUrl, supabaseAnonKey);

export const supabase = global.supabaseClient;