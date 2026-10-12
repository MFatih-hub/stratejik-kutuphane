import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { conceptHref } from '@/lib/concepts';
import { conceptNotes, conceptPosts } from '@/lib/concepts-server';
import { Horizon } from '@/components/calm';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Kavramlar',
  description: 'Yazılarda ve kitap tahlillerinde geçen kavramlar: her kavramın, farklı eserlerde nasıl ele alındığı bir arada.',
};

export default async function KavramlarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user;
  const [posts, notes] = await Promise.all([conceptPosts(supabase, isAdmin), isAdmin ? conceptNotes(supabase) : Promise.resolve([])]);

  const map = new Map<string, { posts: number; notes: number; books: Set<number> }>();
  const bump = (k: string) => { if (!map.has(k)) map.set(k, { posts: 0, notes: 0, books: new Set() }); return map.get(k)!; };
  posts.forEach((p) => p.concepts.forEach((k) => { const e = bump(k); e.posts++; e.books.add(p.id); }));
  notes.forEach((n) => n.concepts.forEach((k) => { const e = bump(k); e.notes++; e.books.add(n.post_id); }));
  const list = Array.from(map.entries()).map(([k, v]) => ({ k, ...v, weight: v.posts * 2 + v.notes, spread: v.books.size }));
  const top = list.slice().sort((a, b) => b.weight - a.weight || a.k.localeCompare(b.k, 'tr')).slice(0, 12);
  const alpha = list.slice().sort((a, b) => a.k.localeCompare(b.k, 'tr'));
  const max = Math.max(1, ...list.map((x) => x.weight));

  return (
    <>
      <section className="blog-hero">
        <div className="hero-eyebrow"><span className="hero-dot"></span>KAVRAMLAR</div>
        <h1 className="blog-hero-title">Kavramlar</h1>
        <p className="blog-hero-sub">
          Farklı eserlerde aynı kavrama dönen düşünceler. Her kavramın sayfasında, ona değinen yazılar ve tahliller bir arada.
          {isAdmin && <> Yalnızca senin gördüğün: fişlerindeki <code>#kavram</code>lar da burada sayılır.</>}
        </p>
      </section>

      {list.length === 0 ? (
        <div className="empty-state">
          <Horizon />
          <p className="empty-state-text">
            Henüz kavram yok. {isAdmin ? <>Fişlerine ya da yazılarına <code>#adalet</code> gibi kavramlar ekledikçe burada belirecekler.</> : 'Yakında.'}
          </p>
        </div>
      ) : (
        <>
          <section className="concept-top" aria-label="En çok dönülen kavramlar">
            <p className="section-title">En çok dönülenler</p>
            <div className="concept-cloud">
              {top.map((c) => (
                <Link key={c.k} href={conceptHref(c.k)} className="concept-chip" style={{ ['--w' as any]: (0.35 + 0.65 * (c.weight / max)).toFixed(2) }}>
                  #{c.k}<span className="concept-count">{c.spread} eser</span>
                </Link>
              ))}
            </div>
          </section>
          <section className="concept-all" aria-label="Tüm kavramlar">
            <p className="section-title">Tümü · {list.length}</p>
            <ul className="concept-list">
              {alpha.map((c) => (
                <li key={c.k}>
                  <Link href={conceptHref(c.k)}>#{c.k}</Link>
                  <span className="concept-count">
                    {c.posts > 0 && `${c.posts} yazı`}{c.posts > 0 && c.notes > 0 && ' · '}{c.notes > 0 && `${c.notes} fiş`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
