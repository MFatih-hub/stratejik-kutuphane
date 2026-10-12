import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { formatDate } from '@/lib/helpers';
import { NOTE_KINDS, STATUS_LABELS } from '@/lib/reading';
import { sortNotes, AUTHOR_NAME } from '@/lib/export';
import PrintDoc from '@/components/print-doc';
import PrintTools from '@/components/print-tools';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Okuma notları', robots: { index: false, follow: false } };

export default async function PrintNotesPage({ searchParams }: { searchParams: { post?: string; otomatik?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');
  const id = Number(searchParams?.post);
  const [{ data: book }, { data: notes }] = await Promise.all([
    supabase.from('posts').select('*').eq('id', id).single(),
    supabase.from('notes').select('id, kind, body, page, created_at').eq('post_id', id).limit(5000),
  ]);
  if (!book) notFound();
  const sorted = sortNotes((notes || []) as any);
  const status = book.reading_status ? STATUS_LABELS[book.reading_status as keyof typeof STATUS_LABELS] : null;
  const meta = [book.book_author, book.reading_order != null ? `#${book.reading_order}` : null, status, `${sorted.length} fiş`].filter(Boolean).join(' · ');

  const groups = NOTE_KINDS.map((k) => ({ k, list: sorted.filter((n) => n.kind === k.value) })).filter((g) => g.list.length);
  return (
    <>
      <PrintTools backHref={`/admin/yazi/${id}/duzenle`} auto={searchParams?.otomatik !== '0'} />
      <PrintDoc
        kicker="Okuma notları"
        title={book.title}
        meta={`${meta} · ${AUTHOR_NAME}`}
        extra={
          <div className="post-content print-body">
            {groups.length === 0 && <p><em>Bu eser için henüz fiş yok.</em></p>}
            {groups.map(({ k, list }) => (
              <section key={k.value}>
                <h2>{k.value === 'not' ? 'Notlar' : k.value === 'alinti' ? 'Alıntılar' : 'Sorular'}</h2>
                {list.map((n) => (
                  <div key={n.id} className="print-note">
                    <p className="print-note-head">{[n.page ? `s. ${n.page}` : null, formatDate(n.created_at)].filter(Boolean).join(' · ')}</p>
                    {n.kind === 'alinti'
                      ? <blockquote>{n.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</blockquote>
                      : n.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                ))}
              </section>
            ))}
          </div>
        }
      />
    </>
  );
}
