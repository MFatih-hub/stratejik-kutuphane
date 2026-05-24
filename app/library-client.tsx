'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TYPE_LOOKUP, SUBJECT_LOOKUP, RESOURCE_TYPES, SUBJECT_GROUPS, LANGUAGES } from '@/lib/helpers';
import FilterSidebar from '@/components/filter-sidebar';

interface Resource {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  year: number | null;
  type: string;
  language: string | null;
  primary_subject: string | null;
  subjects: string[] | null;
  pdf_url: string | null;
  tags: string[] | null;
}

interface LibraryClientProps {
  resources: Resource[];
  counts: any;
  totalCount: number;
  currentSort: string;
  currentFilters: any;
}

function getFirstLetter(title: string): string {
  if (!title) return '#';
  const first = title.trim()[0].toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  // Türkçe karakterler
  const map: Record<string, string> = { 'Ç': 'Ç', 'Ğ': 'G', 'İ': 'İ', 'Ö': 'Ö', 'Ş': 'Ş', 'Ü': 'Ü' };
  return map[first] || first;
}

export default function LibraryClient({ resources, counts, totalCount, currentSort, currentFilters }: LibraryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Alfabetik grupla (sadece alfabe sıralamasındaysa)
  const groupedByLetter: Record<string, Resource[]> = {};
  if (currentSort === 'alfabe') {
    resources.forEach((r) => {
      const letter = getFirstLetter(r.title);
      if (!groupedByLetter[letter]) groupedByLetter[letter] = [];
      groupedByLetter[letter].push(r);
    });
  }

  const letters = Object.keys(groupedByLetter).sort((a, b) => a.localeCompare(b, 'tr'));

  function changeSort(newSort: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newSort === 'alfabe') params.delete('sirala');
    else params.set('sirala', newSort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // Aktif filtre chip'leri
  const activeFilters = [];
  if (currentFilters.alan) {
    const s = SUBJECT_LOOKUP[currentFilters.alan];
    if (s) activeFilters.push({ key: 'alan', label: s.name });
  }
  if (currentFilters.grup) {
    const g = SUBJECT_GROUPS.find((g) => g.slug === currentFilters.grup);
    if (g) activeFilters.push({ key: 'grup', label: g.name });
  }
  if (currentFilters.tur) {
    const t = TYPE_LOOKUP[currentFilters.tur];
    if (t) activeFilters.push({ key: 'tur', label: t.name });
  }
  if (currentFilters.dil) {
    const l = LANGUAGES.find((l) => l.code === currentFilters.dil);
    if (l) activeFilters.push({ key: 'dil', label: l.name });
  }

  return (
    <div className="library-layout">
      <FilterSidebar counts={counts} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main>
        <button
          className="btn mobile-filter-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <i className="ti ti-filter" style={{ fontSize: 14 }}></i>
          Filtreler
        </button>

        <div className="content-head">
          <div>
            <h2 className="content-title">Kütüphane</h2>
            <p className="content-meta" style={{ marginTop: 4 }}>
              {resources.length === totalCount
                ? `${totalCount} kaynak`
                : `${resources.length} / ${totalCount} kaynak`}
            </p>
          </div>
          <select className="sort-select" value={currentSort} onChange={(e) => changeSort(e.target.value)}>
            <option value="alfabe">A → Z</option>
            <option value="yeni">En yeni eklenen</option>
            <option value="yil">Yayın yılı (yeni → eski)</option>
          </select>
        </div>

        {activeFilters.length > 0 && (
          <div className="active-filters">
            {activeFilters.map((f) => (
              <span key={f.key} className="active-filter-chip">
                {f.label}
                <button onClick={() => clearFilter(f.key)} aria-label="Kaldır">
                  <i className="ti ti-x" style={{ fontSize: 12 }}></i>
                </button>
              </span>
            ))}
          </div>
        )}

        {resources.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-books-off empty-state-icon"></i>
            <p className="empty-state-text">
              {totalCount === 0
                ? 'Henüz kütüphaneye kaynak eklenmedi.'
                : 'Bu filtre kombinasyonu için kaynak bulunamadı.'}
            </p>
          </div>
        ) : currentSort === 'alfabe' ? (
          letters.map((letter) => (
            <section key={letter} className="letter-section">
              <div className="letter-label">{letter}</div>
              <div className="resource-list">
                {groupedByLetter[letter].map((r) => (
                  <ResourceRow key={r.id} resource={r} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="resource-list">
            {resources.map((r) => (
              <ResourceRow key={r.id} resource={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ResourceRow({ resource }: { resource: Resource }) {
  const t = TYPE_LOOKUP[resource.type] || TYPE_LOOKUP.book;
  const subject = resource.primary_subject ? SUBJECT_LOOKUP[resource.primary_subject] : null;

  return (
    <Link href={`/kaynak/${resource.slug}`} className="resource-row">
      <div className="resource-left">
        <div className="resource-icon" style={{ background: t.color.bg, color: t.color.fg }}>
          <i className={`ti ${t.icon}`}></i>
        </div>
        <div className="resource-info">
          <p className="resource-title">{resource.title}</p>
          <p className="resource-author">
            {resource.author}
            {resource.year ? <span className="resource-author-meta"> · {resource.year}</span> : null}
            {subject ? <span className="resource-author-meta"> · {subject.name}</span> : null}
          </p>
        </div>
      </div>
      <div className="resource-right">
        {resource.language && (
          <span className="pill pill-need" style={{ background: 'var(--bg-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            {resource.language}
          </span>
        )}
        {resource.pdf_url ? (
          <span className="pill pill-have">PDF</span>
        ) : (
          <span className="pill pill-need">Yok</span>
        )}
        <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--text-tertiary)' }}></i>
      </div>
    </Link>
  );
}
