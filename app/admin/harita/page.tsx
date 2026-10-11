import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { fetchJourney } from '@/lib/reading-journey';
import { extractWikiLinks, resolveWikiTarget } from '@/lib/reading';
import { Horizon, Glint } from '@/components/calm';

export const revalidate = 0;
export const metadata: Metadata = { title: 'Zihin haritası', robots: { index: false, follow: false } };

const W = 1000;
const BASE = 300;

// Eserler ufuk çizgisi üzerinde okuma sırasıyla dizilir; notlarında ve
// tahlillerinde [[...]] ile kurduğun her bağ, iki eser arasında suyun
// üstünde bir yay olarak çizilir.
export default async function MapPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const [journey, notesRes, postsRes] = await Promise.all([
    fetchJourney(supabase),
    supabase.from('notes').select('id, post_id, body').ilike('body', '%[[%').limit(5000),
    supabase.from('posts').select('id, content').eq('post_type', 'kitap_tahlili').ilike('content', '%[[%').limit(2000),
  ]);

  const items = journey.items.map((i) => ({ ...i, author: i.author }));
  const byId = new Map(items.map((i) => [i.id, i]));
  const maxOrder = Math.max(1, ...items.map((i) => i.order || 0));

  type Edge = { from: number; to: number; weight: number; via: string[] };
  const edges = new Map<string, Edge>();
  const unresolved = new Set<string>();
  const add = (from: number | null, raw: string, via: string) => {
    if (!from) return;
    const t = resolveWikiTarget(raw, items);
    if (!t) { unresolved.add(raw); return; }
    if (t.id === from) return;
    const key = from < t.id ? `${from}-${t.id}` : `${t.id}-${from}`;
    const e = edges.get(key) || { from, to: t.id, weight: 0, via: [] };
    e.weight++;
    if (e.via.length < 3) e.via.push(via);
    edges.set(key, e);
  };
  (notesRes.data || []).forEach((n: any) => extractWikiLinks(n.body).forEach((l) => add(n.post_id, l, 'fiş')));
  (postsRes.data || []).forEach((p: any) => extractWikiLinks((p.content || '').replace(/<[^>]+>/g, ' ')).forEach((l) => add(p.id, l, 'tahlil')));

  const list = Array.from(edges.values()).filter((e) => byId.has(e.from) && byId.has(e.to));
  const nodeIds = new Set<number>();
  list.forEach((e) => { nodeIds.add(e.from); nodeIds.add(e.to); });
  const degree = new Map<number, number>();
  list.forEach((e) => { degree.set(e.from, (degree.get(e.from) || 0) + e.weight); degree.set(e.to, (degree.get(e.to) || 0) + e.weight); });
  const x = (id: number) => 20 + (((byId.get(id)?.order || 0) - 1) / Math.max(1, maxOrder - 1)) * (W - 40);
  const nodes = Array.from(nodeIds).map((id) => byId.get(id)!).sort((a, b) => (a.order || 0) - (b.order || 0));
  const hubs = [...nodes].sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0)).slice(0, 8);

  return (
    <div className="map-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Zihin haritası</h1>
          <p className="admin-sub">Fişlerinde ve tahlillerinde <code>[[eser]]</code> ile kurduğun bağlar. Eserler ufukta okuma sırasıyla durur.</p>
        </div>
        <Link href="/admin/bugun" className="btn btn-sm">← Bugün</Link>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <Horizon width={220} />
          <p className="empty-state-text">Henüz bağ yok. Bir fişte ya da tahlilde <code>[[Etika]]</code>, <code>[[Spinoza, Etika]]</code> veya <code>[[#247]]</code> yazdığında burada bir yay belirir.</p>
        </div>
      ) : (
        <>
          <div className="map-wrap">
            <svg viewBox={`0 0 ${W} ${BASE + 40}`} className="map-svg" role="img" aria-label="Eserler arası bağlar">
              <defs>
                <linearGradient id="map-line" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="0">
                  <stop offset="0" stopColor="var(--sea-line)" stopOpacity="0" />
                  <stop offset="0.5" stopColor="var(--sea-line)" stopOpacity="1" />
                  <stop offset="1" stopColor="var(--sea-line)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {journey.modules.map((m) => m.firstOrder != null && (
                <line key={m.name} x1={x(items.find((i) => i.order === m.firstOrder)?.id || 0)} x2={x(items.find((i) => i.order === m.firstOrder)?.id || 0)}
                  y1={BASE - 3} y2={BASE + 3} className="map-tick"><title>{m.name}</title></line>
              ))}
              <path d={`M0 ${BASE}H${W}`} stroke="url(#map-line)" strokeWidth="1" />
              {list.map((e) => {
                const x1 = x(e.from), x2 = x(e.to);
                const h = Math.min(BASE - 20, 18 + Math.abs(x2 - x1) * 0.45);
                const a = byId.get(e.from)!, b = byId.get(e.to)!;
                return (
                  <path key={`${e.from}-${e.to}`} className="map-arc" strokeWidth={Math.min(3, 0.6 + e.weight * 0.4)}
                    d={`M${x1} ${BASE} C ${x1} ${BASE - h}, ${x2} ${BASE - h}, ${x2} ${BASE}`}>
                    <title>{`#${a.order} ${a.title}  ↔  #${b.order} ${b.title} (${e.weight})`}</title>
                  </path>
                );
              })}
              {nodes.map((n) => (
                <a key={n.id} href={`/kitap-tahlilleri/${n.slug}`}>
                  <circle cx={x(n.id)} cy={BASE} r={2 + Math.min(4, (degree.get(n.id) || 0) * 0.6)} className={`map-node${n.written ? ' is-written' : ''}`}>
                    <title>{`#${n.order} ${n.title}${n.author ? ' — ' + n.author : ''}`}</title>
                  </circle>
                </a>
              ))}
            </svg>
          </div>
          <p className="map-legend"><Glint still /> {nodes.length} eser · {list.length} bağ{unresolved.size > 0 ? ` · ${unresolved.size} bağlantı bir esere eşleşmedi` : ''}</p>

          <div className="map-cols">
            <section>
              <h2 className="section-title">En çok bağ kuran eserler</h2>
              <ol className="map-hubs">
                {hubs.map((h) => (
                  <li key={h.id}><Link href={`/kitap-tahlilleri/${h.slug}`}><span className="today-no">#{h.order}</span> {h.title}</Link> <span className="map-deg">{degree.get(h.id)}</span></li>
                ))}
              </ol>
            </section>
            <section>
              <h2 className="section-title">Bütün bağlar</h2>
              <ul className="map-edges">
                {list.sort((p, q) => q.weight - p.weight).slice(0, 200).map((e) => {
                  const a = byId.get(e.from)!, b = byId.get(e.to)!;
                  return (
                    <li key={`${e.from}-${e.to}`}>
                      <Link href={`/kitap-tahlilleri/${a.slug}`}>#{a.order} {a.title}</Link>
                      <span className="map-arrow"> ↔ </span>
                      <Link href={`/kitap-tahlilleri/${b.slug}`}>#{b.order} {b.title}</Link>
                      <span className="map-deg"> · {e.via.join(', ')}{e.weight > 1 ? ` ×${e.weight}` : ''}</span>
                    </li>
                  );
                })}
              </ul>
              {unresolved.size > 0 && (
                <p className="form-hint">Eşleşmeyen: {Array.from(unresolved).slice(0, 12).map((u) => `[[${u}]]`).join(', ')}</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
