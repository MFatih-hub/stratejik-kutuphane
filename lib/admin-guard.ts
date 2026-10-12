// lib/admin-guard.ts — route handler'larda "giriş yapmış yönetici mi?" denetimi.
import { createClient } from './supabase-server';

export async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}
