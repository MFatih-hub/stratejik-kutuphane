'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CloseIcon, SearchIcon } from './icons';
import { turkishLower } from '@/lib/helpers';

// Arama dizini statik bir dosyadır (/ara.json, CDN'den gelir): arama
// veritabanına ya da sunucuya hiç gitmez. İlk açılışta bir kez indirilir.
type Entry = { t: string; s?: string | null; u: string };
type Indexed = Entry & { nt: string; ns: string };

let loaded: Promise<Indexed[]> | null = null;

function norm(s: string) {
  return turkishLower(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function load(): Promise<Indexed[]> {
  if (!loaded) {
    loaded = fetch('/ara.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Entry[]) => rows.map((e) => ({ ...e, nt: norm(e.t), ns: norm(e.s || '') })))
      .catch(() => { loaded = null; return []; });
  }
  return loaded;
}

function find(index: Indexed[], query: string): Indexed[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { e: Indexed; score: number }[] = [];
  for (const e of index) {
    const hay = `${e.nt} ${e.ns}`;
    if (!words.every((w) => hay.includes(w))) continue;
    const q = words.join(' ');
    const score = e.nt.startsWith(q) ? 0 : e.nt.includes(q) ? 1 : words.every((w) => e.nt.includes(w)) ? 2 : 3;
    scored.push({ e, score });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, 12).map((x) => x.e);
}

export default function SiteSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<Indexed[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    load().then(setIndex);
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const results = useMemo(() => find(index || [], query), [index, query]);
  useEffect(() => setActive(0), [query]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  function go(url: string) {
    close();
    router.push(url);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active].u); }
  }

  return (
    <>
      <button type="button" className="nav-icon" aria-label="Ara" title="Ara" onClick={() => setOpen(true)}>
        <SearchIcon />
      </button>
      {/* Üst şeritteki bulanıklık, içindeki sabit konumlu öğeleri şeride hapseder:
          arama paneli bu yüzden doğrudan <body>'ye çizilir. */}
      {open && createPortal(
        <div className="search" role="dialog" aria-modal="true" aria-label="Ara">
          <div className="search-scrim" onClick={close} />
          <div className="search-sheet">
            <div className="search-field">
              <SearchIcon />
              <input
                ref={inputRef}
                type="search"
                className="search-input"
                placeholder="Ara"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                spellCheck={false}
                aria-label="Ara"
              />
              <button type="button" className="nav-icon" aria-label="Kapat" onClick={close}>
                <CloseIcon />
              </button>
            </div>
            {query.trim() !== '' && index && (
              results.length ? (
                <ul className="search-results">
                  {results.map((r, i) => (
                    <li key={r.u}>
                      <a
                        href={r.u}
                        className={`search-hit${i === active ? ' is-active' : ''}`}
                        onClick={(e) => { e.preventDefault(); go(r.u); }}
                        onMouseEnter={() => setActive(i)}
                      >
                        <span className="search-hit-title">{r.t}</span>
                        {r.s && <span className="search-hit-sub">{r.s}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="search-empty">Sonuç yok</p>
              )
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
