'use client';

// lib/admin-client.ts — statik sayfalarda yönetici araçları için tarayıcı yardımcıları.
//
// Herkese açık sayfalar sunucuda çerez okumaz (statik kalsınlar diye). Yöneticiye
// özel düğmeler bu yüzden tarayıcıda, Supabase oturum çerezinin varlığına bakılarak
// gösterilir. Bu yalnızca görünürlük içindir: yazma işlemlerini Supabase'in satır
// düzeyi güvenliği (RLS) ve /api/admin/* rotalarındaki oturum denetimi korur.
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const AUTH_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;

export function hasAdminCookie(): boolean {
  return typeof document !== 'undefined' && AUTH_COOKIE.test(document.cookie);
}

/** Her sayfa geçişinde yeniden bakar: giriş/çıkıştan sonra üst şerit de güncellenir. */
export function useIsAdmin(): boolean {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(false);
  useEffect(() => setAdmin(hasAdminCookie()), [pathname]);
  return admin;
}

// İçerik değişince statik sayfaları yeniletir. Art arda gelen çağrılar tek
// isteğe iner; sayfadan ayrılırken bekleyen istek hemen gönderilir.
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function send() {
  if (timer) { clearTimeout(timer); timer = null; }
  fetch('/api/admin/yenile', { method: 'POST', keepalive: true }).catch(() => {});
}

export function refreshSite() {
  if (typeof window === 'undefined') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(send, 1200);
  if (!listening) {
    listening = true;
    window.addEventListener('pagehide', () => { if (timer) send(); });
  }
}
