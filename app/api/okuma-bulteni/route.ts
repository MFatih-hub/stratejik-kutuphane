import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, resolveCategorySlug, slugify } from '@/lib/helpers';

export const runtime = 'nodejs';

/**
 * "Zihin Haritası Okuma Bülteni" scheduled task'ının siteye otomatik yazması
 * için dar-yetkili uç nokta. Kimlik doğrulama Supabase login'i DEĞİL, tek
 * amaçlı bir paylaşılan sır (BULLETIN_API_SECRET header'ı) ile yapılır —
 * scheduled task'a asla Supabase servis anahtarı verilmez, sadece bu sır.
 * Servis anahtarı (RLS'i atlayan, tam yetkili anahtar) sadece bu route'un
 * sunucu tarafında, Vercel ortam değişkeni olarak yaşar.
 *
 * Body: JSON dizisi (ya da {items: [...]}) — her eleman:
 *   { title, source, url, category, summary }
 * En fazla 60 öğe / istek. Aynı source_url'e sahip bir kayıt zaten varsa
 * atlanır (idempotent — aynı liste iki kez gönderilse bile tekrar oluşturmaz).
 */

type IncomingItem = {
  title?: string;
  source?: string;
  url?: string;
  category?: string;
  summary?: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.BULLETIN_API_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Sunucu yapılandırılmamış (BULLETIN_API_SECRET eksik).' }, { status: 500 });
  }
  const providedSecret = request.headers.get('x-bulletin-secret');
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Sunucu yapılandırılmamış (SUPABASE_SERVICE_ROLE_KEY eksik).' }, { status: 500 });
  }

  let items: IncomingItem[] = [];
  try {
    const body = await request.json();
    items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON gövdesi.' }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: 'Boş liste.' }, { status: 400 });
  }
  if (items.length > 60) {
    return NextResponse.json({ error: 'Tek istekte en fazla 60 öğe kabul edilir.' }, { status: 400 });
  }

  const results: Array<{ title: string; url: string; status: 'created' | 'duplicate' | 'skipped' | 'error'; reason?: string }> = [];

  for (const raw of items) {
    const title = (raw.title || '').trim();
    const url = (raw.url || '').trim();
    const source = (raw.source || '').trim();
    const summary = (raw.summary || '').trim();
    const categorySlug = resolveCategorySlug(raw.category || '') || CATEGORIES[0].slug;

    if (!title || !url) {
      results.push({ title, url, status: 'skipped', reason: 'Başlık veya URL eksik' });
      continue;
    }

    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('post_type', 'okuma_bulteni')
      .eq('source_url', url)
      .limit(1);

    if (existing && existing.length > 0) {
      results.push({ title, url, status: 'duplicate' });
      continue;
    }

    const baseSlug = slugify(title) || `paylasim-${Date.now()}`;
    let inserted = false;
    let lastError = '';
    for (let attempt = 0; attempt < 6 && !inserted; attempt++) {
      const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const { error } = await supabase.from('posts').insert({
        slug: candidateSlug,
        title,
        subtitle: null,
        content: '',
        content_format: 'html',
        excerpt: summary.slice(0, 180),
        cover_image_url: null,
        category: categorySlug,
        tags: [],
        reading_minutes: 1,
        is_published: true,
        published_at: new Date().toISOString(),
        post_type: 'okuma_bulteni',
        source_name: source || null,
        source_url: url,
        source_summary: summary || null,
      });
      if (!error) {
        inserted = true;
      } else if (error.code === '23505') {
        continue; // slug çakışması, bir sonraki numarayı dene
      } else {
        lastError = error.message;
        break;
      }
    }

    results.push(
      inserted
        ? { title, url, status: 'created' }
        : { title, url, status: 'error', reason: lastError || 'Bilinmeyen hata' }
    );
  }

  return NextResponse.json({
    created: results.filter((r) => r.status === 'created').length,
    duplicate: results.filter((r) => r.status === 'duplicate').length,
    skipped: results.filter((r) => r.status === 'skipped' || r.status === 'error').length,
    results,
  });
}
