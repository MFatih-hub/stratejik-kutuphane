'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { TYPE_LOOKUP, SUBJECT_LOOKUP } from '@/lib/helpers';

interface SearchResult {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  type: string;
  primary_subject: string | null;
  tags: string[] | null;
}

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('resources')
      .select('id, slug, title, author, type, primary_subject, tags')
      .or(`title.ilike.%${q}%,author.ilike.%${q}%,description.ilike.%${q}%,notes.ilike.%${q}%`)
      .limit(15);
    setResults((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) {
        router.push(`/kaynak/${r.slug}`);
        setOpen(false);
      }
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="icon-btn" aria-label="Ara">
        <i className="ti ti-search" style={{ fontSize: 14 }}></i>
        <span className="nav-text">Ara</span>
        <span className="kbd nav-text">⌘K</span>
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-input-wrap">
              <i className="ti ti-search"></i>
              <input
                ref={inputRef}
                className="search-input"
                placeholder="Kitap, yazar, etiket, not içeriği..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
              />
              <span className="kbd">esc</span>
            </div>

            <div className="search-results">
              {loading && <div className="search-empty">Aranıyor...</div>}
              {!loading && query.length >= 2 && results.length === 0 && (
                <div className="search-empty">Bu sorguya uygun kaynak bulunamadı.</div>
              )}
              {!loading && query.length < 2 && (
                <div className="search-empty">En az 2 karakter yaz.</div>
              )}
              {results.map((r, i) => {
                const t = TYPE_LOOKUP[r.type];
                const s = r.primary_subject ? SUBJECT_LOOKUP[r.primary_subject] : null;
                return (
                  <a
                    key={r.id}
                    href={`/kaynak/${r.slug}`}
                    className={`search-result ${i === activeIndex ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => setOpen(false)}
                  >
                    <p className="search-result-title">{r.title}</p>
                    <p className="search-result-author">{r.author}</p>
                    <p className="search-result-tag">
                      {t?.name}
                      {s ? ` · ${s.name}` : ''}
                      {r.tags && r.tags.length > 0 && ` · ${r.tags.slice(0, 3).join(', ')}`}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
