// lib/admin-identity.ts — sitenin tek yöneticisi kim?
//
// Depo herkese açık olduğu için e-posta adresinin kendisi burada yazmaz;
// yalnızca küçük harfe çevrilmiş adresin SHA-256 özeti tutulur. Aynı özet
// veritabanındaki public.is_admin() fonksiyonunda da var (SUPABASE-MIGRATION-v7.sql):
// başka biri hesap açsa bile ne yönetim sayfalarına ne de verilere erişebilir.
// Hem Edge (middleware) hem Node (route handler) içinde çalışır.

const ADMIN_EMAIL_SHA256 = '697475100bc035613b0d398a7192dd51f52928efa9f5419b2f6d2defaab68db6';

export async function isAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return hex === ADMIN_EMAIL_SHA256;
}
