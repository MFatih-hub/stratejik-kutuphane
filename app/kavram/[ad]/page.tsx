import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { conceptHref, conceptKey } from '@/lib/concepts';
import { conceptNotes, conceptPosts } from '@/lib/concepts-server';
import { getPostUrl } from '@/lib/helpers';
import { NOTE_KINDS } from '@/lib/reading';
import NoteBody from '@/components/note-body';
import { Horizon } from '@/components/calm';

export const revalidate = 300;

function keyOf(ad: string) {
  try { return conceptKey(decodeURIComponent(ad)); } catch { return conceptKey(ad); }
}

export async function generateMetadata({ params }: { params: { ad: string } }): Promise<Metadata> {
  const k = keyOf(params.ad);
  return { title: `#${k} — Kavramlar`, description: `“${k}” kavramına değinen yazılar ve kitap tahlilleri.` };
}

export default async function KavramPage({ params }: { params: { ad: string } }) {
  const key = keyOf(params.ad);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user;
  const [allPosts, allNotes] = await Promise.all([conceptPosts(supabase, isAdmin), isAdmin ? conceptNotes(supabase) : Promise.resolve([])]);
  const posts = allPosts.filter((p) => p.concepts.includes(key))
    .sort((a, b) => (a.post_type === b.post_type ? (a.reading_order ?? 1e9) - (b.reading_order ?? 1e9) : a.post_type === 'yazi' ? -1 : 1));
  const notes = allNotes.filter((n) => n.concepts.includes(key));

  // Fişler esere göre gruplanır, eserler okuma sırasına göre
  const groups = new Map<number, { book: any; notes: typeof notes }>();
  for (const n of notes) {
    if (!groups.has(n.post_id)) groups.set(n.post_id, { book: n.book, notes: [] });
    groups.get(n.post_id)!.notes.push(n);
  }
  const grouped = Array.from(groups.values()).sort((a, b) => (a.book?.reading_order ?? 1e9) - (b.book?.reading_order ?? 1e9));

  // Birlikte anılan kavramlar
  const co = new Map<string, number>();
  [...posts, ...notes].forEach((x) => x.concepts.forEach((k) => { if (k !== key) co.set(k, (co.get(k) || 0) + 1); }));
  const related = Array.from(co.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const kindLabel = (k: string) => NOTE_KINDS.find((x) => x.value === k)?.label || 'Not';
  const empty = posts.length === 0 && notes.length === 0;

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Ana sayfa</Link><span className="breadcrumb-sep">›</span>
        <Link href="/kavram">Kavramlar</Link><span className="breadcrumb-sep">›</span>
        <span>#{key}</span>
      </nav>
      <section className="blog-hero">
        <div className="hero-eyebrow"><span className="hero-dot"></span>KAVRAM</div>
        <h1 className="blog-hero-title">#{key}</h1>
        {!empty && (
          <p className="blog-hero-sub">
            {posts.length > 0 && `${posts.length} yazı ve tahlil`}{posts.length > 0 && notes.length > 0 && ' · '}
            {notes.length > 0 && `${notes.length} fiş, ${grouped.length} eserde`}
          </p>
        )}
      </section>

      {related.length > 0 && (
        <div className="concept-related">
          <span className="concept-related-label">Birlikte anılanlar</span>
          {related.map(([k]) => <Link key={k} href={conceptHref(k)} className="post-tag">#{k}</Link>)}
        </div>
      )}

      {empty ? (
        <div className="empty-state"><Horizon /><p className="empty-state-text">Bu kavrama henüz değinilmedi.</p></div>
      ) : (
        <>
          {posts.length > 0 && (
            <section className="concept-section">
              <p className="section-title">Yazılar ve tahliller</p>
              <ul className="concept-posts">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Link href={getPostUrl(p)} className="concept-post-title">
                      {p.reading_order != null && <span className="today-no">#{p.reading_order}</span>} {p.title}
                    </Link>
                    <span className="concept-post-meta">
                      {p.post_type === 'kitap_tahlili' ? 'Kitap tahlili' : 'Yazı'}{p.book_author ? ` · ${p.book_author}` : ''}{!p.is_published ? ' · taslak' : ''}
                    </span>
                    {p.excerpt && <p className="concept-post-excerpt">{p.excerpt}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {grouped.length > 0 && (
            <section className="concept-section">
              <p className="section-title">Fişlerin <span className="concept-private">yalnızca sen görüyorsun</span></p>
              {grouped.map((g, gi) => (
                <div key={gi} className="concept-book">
                  <p className="concept-book-title">
                    {g.book ? <Link href={`/kitap-tahlilleri/${g.book.slug}`}>{g.book.reading_order != null && <span className="today-no">#{g.book.reading_order}</span>} {g.book.title}</Link> : 'Eser'}
                    {g.book?.book_author && <span className="book-author"> · {g.book.book_author}</span>}
                  </p>
                  <ul className="concept-notes">
                    {g.notes.map((n) => (
                      <li key={n.id} className={`note note-${n.kind}`}>
                        <span className="note-kind">{kindLabel(n.kind)}{n.page ? ` · s. ${n.page}` : ''}</span>
                        <NoteBody text={n.body} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}
