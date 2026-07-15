// lib/visitor.ts — anonim, kalıcı ziyaretçi kimliği (görüntülenme sayacı için)
//
// Kişisel veri (IP, isim, e-posta vb.) İÇERMEZ — sadece tarayıcıda rastgele
// üretilip çerezde saklanan bir UUID'dir. Amaç: aynı ziyaretçinin bir yazıyı
// art arda yenilemesiyle görüntülenme sayısının şişmesini engellemek ve
// admin panelindeki "şu an okunuyor" akışını mümkün kılmak.

const COOKIE_NAME = 'zh_vid';
const COOKIE_DAYS = 400; // tarayıcıların izin verdiği azami çerez ömrüne yakın

function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Tarayıcıda kalıcı, anonim bir ziyaretçi kimliği döndürür. Sadece client'ta çalışır. */
export function getVisitorId(): string {
  if (typeof document === 'undefined') return '';
  let id = readCookie(COOKIE_NAME);
  if (!id) {
    id = generateUuidV4();
    writeCookie(COOKIE_NAME, id, COOKIE_DAYS);
  }
  return id;
}
