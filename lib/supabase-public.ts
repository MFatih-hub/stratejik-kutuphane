// lib/supabase-public.ts — herkese açık sayfalar için çerezsiz Supabase istemcisi.
//
// Çerez okumadığı için bu istemciyi kullanan sayfalar statik üretilir ve
// Vercel'in CDN'inden sunulur: ziyaretçi başına sunucu fonksiyonu çalışmaz,
// veritabanına gidilmez. Sayfalar yönetim panelinde bir şey kaydedildiğinde
// (bkz. app/api/admin/yenile), ayrıca günde bir kendiliğinden yenilenir.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Bu istemcinin bütün sorguları bu etiketle önbelleğe girer; yenileme tek etiketle yapılır. */
export const CONTENT_TAG = 'icerik';

let client: SupabaseClient | null = null;

export function publicClient(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, next: { tags: [CONTENT_TAG] } } as RequestInit),
      },
    });
  }
  return client;
}
