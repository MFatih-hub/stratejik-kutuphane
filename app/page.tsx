import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { SUBJECT_GROUPS, SUBJECT_LOOKUP, TYPE_LOOKUP, RESOURCE_TYPES } from '@/lib/helpers';
import LibraryClient from './library-client';

export const revalidate = 0;

interface PageProps {
  searchParams: {
    alan?: string;
    grup?: string;
    tur?: string;
    dil?: string;
    sirala?: string;
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const supabase = createClient();

  // Tüm kaynakları çek (filtreleme client tarafında değil, server tarafında SQL ile)
  let query = supabase.from('resources').select('*');

  if (searchParams.alan) {
    // Alan filtresi: primary_subject veya subjects array
    query = query.or(`primary_subject.eq.${searchParams.alan},subjects.cs.{${searchParams.alan}}`);
  } else if (searchParams.grup) {
    // Grup filtresi: o gruba ait alanlardan herhangi biri
    const group = SUBJECT_GROUPS.find((g) => g.slug === searchParams.grup);
    if (group) {
      const subjectSlugs = group.subjects.map((s) => s.slug);
      const conditions = subjectSlugs.map((s) => `primary_subject.eq.${s}`).join(',');
      query = query.or(conditions);
    }
  }

  if (searchParams.tur) {
    query = query.eq('type', searchParams.tur);
  }

  if (searchParams.dil) {
    query = query.eq('language', searchParams.dil);
  }

  // Varsayılan: başlığa göre alfabetik
  const sortField = searchParams.sirala === 'yil' ? 'year' :
                    searchParams.sirala === 'yeni' ? 'created_at' : 'title';
  const sortAsc = searchParams.sirala !== 'yeni' && searchParams.sirala !== 'yil';

  query = query.order(sortField, { ascending: sortAsc, nullsFirst: false });

  const { data: resources } = await query;

  // Tüm kaynaklar (filtresiz - sayım için)
  const { data: allResources } = await supabase.from('resources').select('primary_subject, subjects, type, language');

  // Sayımları hesapla
  const counts = {
    bySubject: {} as Record<string, number>,
    byGroup: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    byLang: {} as Record<string, number>,
  };

  (allResources || []).forEach((r: any) => {
    if (r.primary_subject) {
      counts.bySubject[r.primary_subject] = (counts.bySubject[r.primary_subject] || 0) + 1;
      const groupInfo = SUBJECT_LOOKUP[r.primary_subject];
      if (groupInfo) {
        counts.byGroup[groupInfo.groupSlug] = (counts.byGroup[groupInfo.groupSlug] || 0) + 1;
      }
    }
    if (r.type) counts.byType[r.type] = (counts.byType[r.type] || 0) + 1;
    if (r.language) counts.byLang[r.language] = (counts.byLang[r.language] || 0) + 1;
  });

  const totalCount = allResources?.length || 0;

  return (
    <>
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="hero-dot"></span>
          <span>KİŞİSEL KÜTÜPHANE</span>
        </div>
        <h1>Zihin Haritası</h1>
        <p>
          Akademik metinlerin, kitapların ve referans çalışmalarının kişisel kütüphanesi —
          alan, tür ve dil filtreleriyle organize edilmiş bir okuma günlüğü.
        </p>
      </section>

      <LibraryClient
        resources={resources || []}
        counts={counts}
        totalCount={totalCount}
        currentSort={searchParams.sirala || 'alfabe'}
        currentFilters={searchParams}
      />
    </>
  );
}
