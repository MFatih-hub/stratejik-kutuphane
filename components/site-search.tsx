'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { turkishLower, getCategoryName, formatDate, getPostUrl, getPostTypeInfo } from '@/lib/helpers';

interface SearchPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[] | null;
  category: string;
  published_at: string | null;
  post_type: string | null;
}

// Basit tarayıcı-içi önbellek: aynı sayfa yüklemesi boyunca tekrar sorgu atmasın.
let cachedPosts: SearchPost[] | null = null;

async function loadPosts(): Promise<SearchPost[]> {
  if (cachedPosts) return cachedPosts;
  const supabase = createClient();
  // PostgREST tek istekte en fazla 1000 satır döndürür → sayfa sayfa çek.
  // Tahlil notu henüz yazılmamış kitap kayıtları aramada çıkmaz
  // (onlar Kitap Tahlilleri sayfasının kendi aramasında bulunur).
  const all: SearchPost[] = [];
  for (let page = 0; page < 20; page++) {
    const from = page * 1000;
    const { data, error } = await supabase
      .from('posts')
      .select('id, slug, title, excerpt, tags, category, published_at, post_type')
      .eq('is_published', true)
      .neq('post_type', 'okuma_bulteni')
      .or('post_type.neq.kitap_tahlili,content.neq.""')
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + 999);
    if (error || !data || data.length === 0) break;
    all.push(...(data as SearchPost[]));
    if (data.length < 1000) break;
  }
  cachedPosts = all;
  return cachedPosts;
}

function filterPosts(posts: SearchPost[], query: string): SearchPost[] {
  const q = turkishLower(query.trim());
  if (!q) return [];
  return posts
    .filter((p) =>
      turkishLower([p.title, p.excerpt || '', getCategoryName(p.category), ...(p.tags || [])].join(' ')).includes(q)
    )
    .slice(0, 8);
}

function ResultsList({ results, onNavigate }: { results: SearchPost[]; onNavigate: () => void }) {
  if (results.length === 0) return <p className="search-empty">Sonuç bulunamadı.</p>;
  return (
    <ul className="search-results">
      {results.map((p) => (
        <li key={p.id}>
          <Link href={getPostUrl({ slug: p.slug, post_type: p.post_type })} onClick={onNavigate} className="search-result-item">
            <span className="search-result-category">
              {getCategoryName(p.category)}
              {p.post_type && p.post_type !== 'yazi' ? ` · ${getPostTypeInfo(p.post_type).label}` : ''}
            </span>
            <span className="search-result-title">{p.title}</span>
            {p.published_at && <span className="search-result-date">{formatDate(p.published_at)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Ana sayfa hero'sunda gösterilen, odaklanınca açılan basit arama kutusu. */
export function InlineSiteSearch() {
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPosts().then(setPosts);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => filterPosts(posts, query), [posts, query]);

  return (
    <div className="site-search-inline" ref={wrapRef}>
      <input
        type="search"
        className="input search-inline-input"
        placeholder="🔍 Yazılarda ara…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
      />
      {focused && query.trim() && (
        <div className="search-dropdown">
          <ResultsList results={results} onNavigate={() => setFocused(false)} />
        </div>
      )}
    </div>
  );
}

/** Site başlığında her sayfadan erişilebilen arama ikonu + modal. */
export function HeaderSiteSearch() {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) loadPosts().then(setPosts);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 10);
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const results = useMemo(() => filterPosts(posts, query), [posts, query]);

  return (
    <>
      <button className="icon-btn" aria-label="Yazılarda ara" title="Ara" onClick={() => setOpen(true)}>
        🔍
      </button>
      {open && (
        <div className="search-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="search"
              className="input search-modal-input"
              placeholder="Başlık, özet veya etiketlerde ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="search-modal-results">
              {query.trim() === '' ? (
                <p className="search-empty">Yazmaya başla…</p>
              ) : (
                <ResultsList results={results} onNavigate={() => setOpen(false)} />
              )}
            </div>
            <button className="btn btn-sm search-modal-close" onClick={() => setOpen(false)}>
              Kapat (Esc)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
