// lib/admin-guard.ts — route handler'larda "giriş yapan, sitenin yöneticisi mi?" denetimi.
import { createClient } from './supabase-server';
import { isAdminEmail } from './admin-identity';

/** Yöneticinin oturumu varsa kullanıcıyı, yoksa (ya da başka bir hesapsa) null döndürür. */
export async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = user && (await isAdminEmail(user.email)) ? user : null;
  return { supabase, user: admin };
}
