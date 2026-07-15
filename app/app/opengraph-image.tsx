import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Zihin Haritası — Muhammet Fatih Işık';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          background: 'linear-gradient(135deg, #faf8f3 0%, #f3efe5 100%)',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 12,
            background: '#8b2a16',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            fontWeight: 500,
            marginBottom: 32,
          }}
        >
          Z
        </div>
        <div style={{ fontSize: 96, fontWeight: 500, color: '#1a1814', letterSpacing: '-0.02em', textAlign: 'center' }}>
          Zihin Haritası
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#4a4540',
            fontStyle: 'italic',
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Muhammet Fatih Işık
        </div>
        <div
          style={{
            fontSize: 22,
            color: '#8a847b',
            marginTop: 32,
            maxWidth: 800,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Teknoloji, jeopolitik, bilim ve düşünce üzerine yazılar
        </div>
      </div>
    ),
    { ...size }
  );
}
