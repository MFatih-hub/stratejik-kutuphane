// lib/server-env.ts — sunucu tarafı gizli ayarlar ve "service role" istemcisi.
// SADECE sunucuda (route handler / server component) kullan; tarayıcıya
// giden hiçbir dosya bunu import etmemeli.
import { createClient as createSupabase, type SupabaseClient } from '@supabase/supabase-js';

/** Satır düzeyi güvenliği (RLS) aşan yönetici istemcisi; anahtar yoksa null. */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabase(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const RESEND_BASE = (process.env.RESEND_API_BASE || 'https://api.resend.com').replace(/\/$/, '');

export const mailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
export const newsletterEnabled = () => mailConfigured() && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: { filename: string; content: string /* base64 */ }[];
};

/** Resend ile tek e-posta. */
export async function sendMail(m: Mail): Promise<{ ok: boolean; error?: string }> {
  if (!mailConfigured()) return { ok: false, error: 'E-posta ayarları yapılmamış (RESEND_API_KEY, MAIL_FROM).' };
  const res = await fetch(`${RESEND_BASE}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, ...m }),
  });
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
  return { ok: true };
}

/** Resend toplu gönderim (en fazla 100'erli). */
export async function sendBatch(mails: Mail[]): Promise<{ sent: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100).map((m) => ({ from: process.env.MAIL_FROM, ...m }));
    const res = await fetch(`${RESEND_BASE}/emails/batch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (res.ok) sent += chunk.length;
    else errors.push(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return { sent, errors };
}
