import { createClient } from '@supabase/supabase-js';

// Si la variable de Vercel no está presente o viene vacía, usamos las credenciales de respaldo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pbijesdqbfniqulnbfen.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiaWplc2RxYmZuaXF1bG5iZmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzOTY3ODksImV4cCI6MjEwMTk3Mjc4OX0.oOdCTCK2FX0xaL5bzhrbzbQ_LANyBypLsgWFtZ-LC-U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);