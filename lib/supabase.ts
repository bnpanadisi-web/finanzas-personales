import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://pbijesdqbfniqulnbfen.supabase.co';
const DEFAULT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiaWplc2RxYmZuaXF1bG5iZmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzOTY3ODksImV4cCI6MjEwMTk3Mjc4OX0.oOdCTCK2FX0xaL5bzhrbzbQ_LANyBypLsgWFtZ-LC-U';

function getValidSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl;
  }
  return DEFAULT_URL;
}

function getValidSupabaseKey(): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (envKey && envKey.length > 20) {
    return envKey;
  }
  return DEFAULT_KEY;
}

export const supabase = createClient(getValidSupabaseUrl(), getValidSupabaseKey());