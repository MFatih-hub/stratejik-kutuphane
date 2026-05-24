'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { SUBJECT_GROUPS, RESOURCE_TYPES, LANGUAGES } from '@/lib/helpers';

interface FilterSidebarProps {
  counts: {
    bySubject: Record<string, number>;
    byGroup: Record<string, number>;
    byType: Record<string, number>;
    byLang: Record<string, number>;
  };
  open: boolean;
  onClose: () => void;
}

export default function FilterSidebar({ counts, open, onClose }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeSubject = searchParams.get('alan');
  const activeGroup = searchParams.get('grup');
  const activeType = searchParams.get('tur');
  const activeLang = searchParams.get('dil');

  // Hangi gruplar açık? Aktif filtre içerenler otomatik açık
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeGroup) initial.add(activeGroup);
    if (activeSubject) {
      const group = SUBJECT_GROUPS.find((g) => g.subjects.some((s) => s.slug === activeSubject));
      if (group) initial.add(group.slug);
    }
    return initial;
  });

  function toggleGroup(slug: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
      // Eğer alan seçildiyse grup filtresi temizlensin
      if (key === 'alan') params.delete('group');
      // Eğer grup seçildiyse alan filtresi temizlensin
      if (key === 'grup') params.delete('scope');
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    router.push(pathname);
  }

  const hasAnyFilter = activeSubject || activeGroup || activeType || activeLang;

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      {/* Alan filtresi */}
      <div className="filter-section">
        <div className="filter-title">scope</div>
        {SUBJECT_GROUPS.map((group) => {
          const isOpen = openGroups.has(group.slug);
          const isActive = activeGroup === group.slug;
          const groupCount = counts.byGroup[group.slug] || 0;
          return (
            <div key={group.slug} className={`filter-group ${isOpen ? 'open' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  className="filter-group-head"
                  onClick={() => toggleGroup(group.slug)}
                  style={{ flex: 1 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-chevron-right"></i>
                    <span>{group.name}</span>
                  </span>
                  <span className="filter-link-count">{groupCount}</span>
                </button>
              </div>
              <div className="filter-group-children">
                <button
                  className={`filter-link ${isActive ? 'active' : ''}`}
                  onClick={() => setFilter('grup', group.slug)}
                  style={{ fontWeight: 500, fontStyle: 'italic' }}
                >
                  <span>All groups</span>
                  <span className="filter-link-count">{groupCount}</span>
                </button>
                {group.subjects.map((subj) => {
                  const count = counts.bySubject[subj.slug] || 0;
                  return (
                    <button
                      key={subj.slug}
                      className={`filter-link ${activeSubject === subj.slug ? 'active' : ''}`}
                      onClick={() => setFilter('alan', subj.slug)}
                    >
                      <span>{subj.name}</span>
                      <span className="filter-link-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tür filtresi */}
      <div className="filter-section">
        <div className="filter-title">Type</div>
        {RESOURCE_TYPES.map((type) => {
          const count = counts.byType[type.slug] || 0;
          return (
            <button
              key={type.slug}
              className={`filter-link ${activeType === type.slug ? 'active' : ''}`}
              onClick={() => setFilter('tur', type.slug)}
            >
              <span>{type.name}</span>
              <span className="filter-link-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Dil filtresi */}
      <div className="filter-section">
        <div className="filter-title">Dil</div>
        {LANGUAGES.map((lang) => {
          const count = counts.byLang[lang.code] || 0;
          if (count === 0) return null;
          return (
            <button
              key={lang.code}
              className={`filter-link ${activeLang === lang.code ? 'active' : ''}`}
              onClick={() => setFilter('dil', lang.code)}
            >
              <span>{lang.name}</span>
              <span className="filter-link-count">{count}</span>
            </button>
          );
        })}
      </div>

      {hasAnyFilter && (
        <button onClick={clearAll} className="filter-clear">
          <i className="ti ti-x" style={{ fontSize: 12, verticalAlign: -1, marginRight: 3 }}></i>
          Tüm filtreleri temizle
        </button>
      )}
    </aside>
  );
}
