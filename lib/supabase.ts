import { createClient } from '@supabase/supabase-js';

// Valores dummy seguros para modo local / offline
const DUMMY_URL = 'https://local-finanzas-placeholder.supabase.co';
const DUMMY_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24ifQ.placeholder-key';

function getValidSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl;
  }
  return DUMMY_URL;
}

function getValidSupabaseKey(): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (envKey && envKey.length > 20) {
    return envKey;
  }
  return DUMMY_KEY;
}

export const supabase = createClient(getValidSupabaseUrl(), getValidSupabaseKey());