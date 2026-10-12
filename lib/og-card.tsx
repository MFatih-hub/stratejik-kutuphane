// lib/og-card.tsx — paylaşım görseli (WhatsApp, X, LinkedIn önizlemesi).
// Sitenin "durgun deniz" dili: koyu metalik gece denizi, ince ufuk çizgisi,
// tek bir küçük ışıltı. Türkçe harfler için EB Garamond (latin + latin-ext).
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

async function fonts() {
  // Yollar sabit yazılmalı: paketleyici yalnızca böyle görünen dosyaları ekler.
  // Her kalınlık tek dosya (latin + latin-ext birleştirildi): Türkçe harfler eksiksiz.
  const load = (u: URL) => fetch(u).then((r) => r.arrayBuffer());
  const [w4, w5] = await Promise.all([
    load(new URL('./fonts/eb-garamond-400.woff', import.meta.url)),
    load(new URL('./fonts/eb-garamond-500.woff', import.meta.url)),
  ]);
  return [
    { name: 'Garamond', data: w4, weight: 400 as const, style: 'normal' as const },
    { name: 'Garamond', data: w5, weight: 500 as const, style: 'normal' as const },
  ];
}

export async function ogCard({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  const len = title.length;
  const size = len > 90 ? 50 : len > 60 ? 58 : len > 34 ? 68 : 80;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '64px 76px 58px', fontFamily: 'Garamond',
          background: 'linear-gradient(180deg, #0d151b 0%, #121d25 54%, #16232c 54.2%, #0f191f 100%)',
          color: '#e6ecef', position: 'relative',
        }}
      >
        {/* ufuk ve sudaki yansıma çizgileri */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 340, height: 1, display: 'flex', background: 'linear-gradient(90deg, rgba(160,184,198,0) 0%, rgba(160,184,198,0.55) 50%, rgba(160,184,198,0) 100%)' }} />
        <div style={{ position: 'absolute', left: 300, right: 300, top: 372, height: 1, display: 'flex', background: 'linear-gradient(90deg, rgba(160,184,198,0) 0%, rgba(160,184,198,0.28) 50%, rgba(160,184,198,0) 100%)' }} />
        <div style={{ position: 'absolute', left: 450, right: 450, top: 398, height: 1, display: 'flex', background: 'linear-gradient(90deg, rgba(160,184,198,0) 0%, rgba(160,184,198,0.18) 50%, rgba(160,184,198,0) 100%)' }} />
        {/* tek ışıltı */}
        <div style={{ position: 'absolute', left: 838, top: 326, width: 28, height: 28, borderRadius: 14, display: 'flex', background: 'radial-gradient(circle, rgba(255,250,235,0.95) 0%, rgba(255,246,220,0.35) 35%, rgba(255,246,220,0) 70%)' }} />
        <div style={{ position: 'absolute', left: 851, top: 345, width: 2, height: 60, display: 'flex', background: 'linear-gradient(180deg, rgba(255,246,220,0.45) 0%, rgba(255,246,220,0) 100%)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, color: '#a9b8c1', letterSpacing: 1 }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, display: 'flex', background: 'linear-gradient(135deg, #c9d3d9 0%, #7f919c 55%, #46545d 100%)' }} />
          Zihin Haritası
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1040, marginBottom: 12 }}>
          {kicker && <div style={{ fontSize: 26, color: '#9fb2bd', letterSpacing: 3, marginBottom: 18, display: 'flex' }}>{kicker.toLocaleUpperCase('tr-TR')}</div>}
          <div style={{ fontSize: size, lineHeight: 1.08, fontWeight: 500, color: '#f1f4f5', display: 'flex' }}>{title}</div>
          {sub && <div style={{ fontSize: 30, color: '#a9b8c1', marginTop: 20, display: 'flex' }}>{sub}</div>}
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: '#7f919c' }}>Muhammet Fatih Işık · zihinharitasi.org</div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() }
  );
}
