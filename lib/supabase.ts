import { createClient } from '@supabase/supabase-js';

// Extrae las variables de entorno de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

// Inicializa y exporta el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);