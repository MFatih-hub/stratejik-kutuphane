import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase-server';
import { getCategoryName, getCategoryColor } from '@/lib/helpers';

export const runtime = 'edge';
export const alt = 'Zihin Haritası';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('title, subtitle, category, excerpt')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single();

  const title = post?.title || 'Zihin Haritası';
  const subtitle = post?.subtitle || '';
  const categoryName = post?.category ? getCategoryName(post.category) : '';
  const categoryColor = post?.category ? getCategoryColor(post.category) : '#8b2a16';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 70px',
          background: 'linear-gradient(135deg, #faf8f3 0%, #f3efe5 100%)',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Üst: Marka */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: '#8b2a16',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 500,
            }}
          >
            Z
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 22, color: '#1a1814', fontWeight: 500 }}>Zihin Haritası</div>
            <div style={{ fontSize: 14, color: '#8a847b', fontStyle: 'italic' }}>
              Muhammet Fatih Işık
            </div>
          </div>
        </div>

        {/* Orta: Kategori + Başlık */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1060 }}>
          {categoryName && (
            <div
              style={{
                display: 'flex',
                padding: '6px 16px',
                background: `${categoryColor}20`,
                color: categoryColor,
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 500,
                alignSelf: 'flex-start',
              }}
            >
              {categoryName}
            </div>
          )}
          <div
            style={{
              fontSize: title.length > 60 ? 56 : 68,
              fontWeight: 500,
              color: '#1a1814',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              fontFamily: 'Georgia, serif',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 26,
                color: '#4a4540',
                fontStyle: 'italic',
                fontFamily: 'Georgia, serif',
                lineHeight: 1.3,
                marginTop: 8,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Alt: URL */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 24,
            borderTop: '1px solid rgba(26, 24, 20, 0.08)',
          }}
        >
          <div style={{ fontSize: 18, color: '#8a847b' }}>
            zihinharitasi
          </div>
          <div style={{ fontSize: 14, color: '#8a847b', letterSpacing: 1, textTransform: 'uppercase' }}>
            Bir Düşünce Sitesi
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
