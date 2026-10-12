import { WIKILINK_RE, wikiHref } from '@/lib/reading';
import { HASHTAG_RE, conceptHref } from '@/lib/concepts';

/** Fiş metni: [[eser]] ve #kavram bağlantıları tıklanır. */
export default function NoteBody({ text }: { text: string }) {
  type Hit = { i: number; len: number; node: (k: number) => React.ReactNode };
  const hits: Hit[] = [];
  for (const m of text.matchAll(WIKILINK_RE)) {
    const label = m[1].trim();
    hits.push({ i: m.index ?? 0, len: m[0].length, node: (k) => <a key={k} href={wikiHref(label)} className="wikilink">{label}</a> });
  }
  for (const m of text.matchAll(HASHTAG_RE)) {
    const pre = m[1] || '';
    const i = (m.index ?? 0) + pre.length;
    const word = m[2];
    if (hits.some((h) => i >= h.i && i < h.i + h.len)) continue;
    hits.push({ i, len: word.length + 1, node: (k) => <a key={k} href={conceptHref(word)} className="concept-link">#{word}</a> });
  }
  hits.sort((a, b) => a.i - b.i);
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const h of hits) {
    if (h.i < last) continue;
    if (h.i > last) parts.push(text.slice(last, h.i));
    parts.push(h.node(h.i));
    last = h.i + h.len;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <p className="note-body">{parts}</p>;
}
