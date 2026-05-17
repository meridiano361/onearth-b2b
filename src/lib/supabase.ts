import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  // Accetta sia SUPABASE_URL che NEXT_PUBLIC_SUPABASE_URL per compatibilità
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url!, key!, { auth: { persistSession: false } });
}
