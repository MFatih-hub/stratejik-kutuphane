'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { NOTE_KINDS, istanbulDay, markReadingDay } from '@/lib/reading';
import NoteBody from '@/components/note-body';
import { Glint } from '@/components/calm';

type Book = {
  id: number; slug: string; title: string; book_author: string | null; reading_order: number | null;
  reading_module: string | null; current_page: string | null; started_at: string | null; reading_status: string | null;
};
type Note = { id: number; post_id: number | null; kind: string; body: string; page: string | null; created_at: string; posts?: any };
type QueuedNote = { post_id: number; kind: string; body: string; page: string | null; ts: number };

const QUEUE_KEY = 'zh-note-queue';
const MILESTONES = [1, 10, 50, 100, 250, 500, 1000, 2000, 3650];
const KIND_LABEL: Record<string, string> = { not: 'Not', alinti: 'Alıntı', soru: 'Soru' };

function readQueue(): QueuedNote[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function writeQueue(q: QueuedNote[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* yer yok */ }
}

/** Fiş metnini [[bağlantılar]] tıklanabilir olacak şekilde basar. */
export { NoteBody };

function formatWhen(iso: string, today: string): string {
  const d = new Date(iso);
  const day = istanbulDay(d);
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
  if (day === today) return `bugün ${time}`;
  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })} ${time}`;
}

function longDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 9)).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
}

export default function BugunClient(props: {
  schemaReady: boolean; today: string; current: Book[]; suggestion: Book | null; notes: Note[]; waiting: any[];
  days: string[]; stats: { total: number; finished: number; finished30: number; todayNotes: number }; recall: Note | null;
  durakPrompts?: string[];
}) {
  const { schemaReady, today, current, suggestion, waiting, days, stats, recall } = props;
  const durakPrompts = props.durakPrompts || [];
  const supabase = createClient();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(props.notes);
  const [queued, setQueued] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [readToday, setReadToday] = useState(days.includes(today));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function say(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }

  // Çevrimdışı alınmış fişleri gönder
  const flushQueue = useCallback(async () => {
    const q = readQueue();
    if (!q.length || !navigator.onLine) { setQueued(q.length); return; }
    const rest: QueuedNote[] = [];
    for (const item of q) {
      const { ts, ...row } = item;
      const { data, error } = await supabase.from('notes').insert(row).select().single();
      if (error) rest.push(item);
      else setNotes((prev) => [data as Note, ...prev]);
    }
    writeQueue(rest);
    setQueued(rest.length);
    if (q.length > rest.length) {
      await markReadingDay(supabase);
      say(`${q.length - rest.length} bekleyen fiş gönderildi`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    flushQueue();
    window.addEventListener('online', flushQueue);
    return () => window.removeEventListener('online', flushQueue);
  }, [flushQueue]);

  async function setStatus(book: Book, status: 'okunuyor' | 'okundu' | null) {
    setBusy(true);
    const patch: any = { reading_status: status };
    if (status === 'okunuyor' && !book.started_at) patch.started_at = new Date().toISOString();
    if (status === 'okundu') patch.finished_at = new Date().toISOString();
    const { error } = await supabase.from('posts').update(patch).eq('id', book.id);
    setBusy(false);
    if (error) { say('Hata: ' + error.message); return; }
    await markReadingDay(supabase);
    say(status === 'okunuyor' ? 'Yolculuk başladı' : status === 'okundu' ? 'Bitti — tahlil seni bekliyor' : 'Sıraya geri kondu');
    router.refresh();
  }

  async function savePage(book: Book, page: string) {
    if ((book.current_page || '') === page) return;
    const { error } = await supabase.from('posts').update({ current_page: page || null }).eq('id', book.id);
    if (!error) { book.current_page = page; say('Kaldığın yer kaydedildi'); }
  }

  async function addNote(postId: number, kind: string, body: string, page: string): Promise<boolean> {
    const row = { post_id: postId, kind, body: body.trim(), page: page.trim() || null };
    if (!row.body) return false;
    const enqueue = () => {
      const q = readQueue(); q.push({ ...row, ts: Date.now() }); writeQueue(q); setQueued(q.length);
      say('Çevrimdışısın — fiş saklandı, bağlantı gelince gönderilecek');
    };
    if (!navigator.onLine) { enqueue(); return true; }
    const { data, error } = await supabase.from('notes').insert(row).select().single();
    if (error) {
      if (/fetch|network/i.test(error.message)) { enqueue(); return true; }
      say('Hata: ' + error.message);
      return false;
    }
    setNotes((prev) => [data as Note, ...prev]);
    if (!readToday) { await markReadingDay(supabase); setReadToday(true); }
    return true;
  }

  async function deleteNote(id: number) {
    if (!confirm('Bu fiş silinsin mi?')) return;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { say('Hata: ' + error.message); return; }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function updateNote(id: number, body: string) {
    const { error } = await supabase.from('notes').update({ body }).eq('id', id);
    if (error) { say('Hata: ' + error.message); return false; }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, body } : n)));
    return true;
  }

  async function markToday() {
    await markReadingDay(supabase);
    setReadToday(true);
    say('Bugün işaretlendi');
  }

  async function startByOrder(order: string) {
    const n = parseInt(order.replace(/\D+/g, ''), 10);
    if (!Number.isFinite(n)) return;
    const { data } = await supabase.from('posts').select('id, started_at').eq('post_type', 'kitap_tahlili').eq('reading_order', n).limit(1);
    const row = (data || [])[0];
    if (!row) { say(`#${n} bulunamadı`); return; }
    await setStatus({ id: row.id, started_at: row.started_at } as Book, 'okunuyor');
  }

  // Tempo
  const pace = stats.finished30 / 30; // eser / gün
  const remaining = Math.max(0, stats.total - stats.finished);
  const nextMilestone = MILESTONES.find((m) => m > stats.finished && m <= Math.max(stats.total, 1));
  const eta = (count: number) => {
    if (pace <= 0) return null;
    const d = new Date(Date.now() + (count / pace) * 86400_000);
    return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  };

  const dayDots = useMemo(() => {
    const set = new Set(days);
    if (readToday) set.add(today);
    const out: { day: string; on: boolean }[] = [];
    for (let i = 119; i >= 0; i--) {
      const d = istanbulDay(new Date(Date.now() - i * 86400_000));
      out.push({ day: d, on: set.has(d) });
    }
    return out;
  }, [days, readToday, today]);
  const streak = useMemo(() => {
    let s = 0;
    for (let i = dayDots.length - 1; i >= 0; i--) {
      if (dayDots[i].on) s++;
      else if (i === dayDots.length - 1) continue; // bugün henüz okunmadıysa seriyi bozmasın
      else break;
    }
    return s;
  }, [dayDots]);
  const read30 = dayDots.slice(-30).filter((d) => d.on).length;
  const initialIds = useMemo(() => new Set(props.notes.map((n) => n.id)), [props.notes]);
  const todayCount = stats.todayNotes + notes.filter((n) => !initialIds.has(n.id) && istanbulDay(new Date(n.created_at)) === today).length;

  return (
    <div className="today">
      <header className="today-head">
        <div>
          <p className="today-date">{longDate(today)}</p>
          <h1 className="today-title">Bugün</h1>
          <p className="today-sub">
            {todayCount} fiş bugün
            {' · '}son 30 günde {read30} gün okudun{streak > 1 ? ` · ${streak} gündür kesintisiz` : ''}
          </p>
        </div>
        <form action="/admin/notlar" className="today-search">
          <input name="q" className="input" placeholder="Fişlerinde ara…" />
        </form>
      </header>

      {!schemaReady && (
        <div className="today-banner">
          Okuma durumu ve fişler için veritabanının güncellenmesi gerekiyor: Supabase'de <code>SUPABASE-MIGRATION-v5.sql</code> dosyasını bir kez çalıştır.
        </div>
      )}
      {queued > 0 && <div className="today-banner">{queued} fiş çevrimdışı bekliyor; bağlantı gelince kendiliğinden gönderilecek.</div>}

      <div className="today-grid">
        <section className="today-main">
          {current.map((book) => (
            <CurrentBook
              key={book.id}
              book={book}
              today={today}
              notes={notes.filter((n) => n.post_id === book.id)}
              busy={busy}
              onAdd={addNote}
              onDelete={deleteNote}
              onUpdate={updateNote}
              onPage={savePage}
              onFinish={() => setStatus(book, 'okundu')}
              onBack={() => setStatus(book, null)}
            />
          ))}

          {current.length === 0 && schemaReady && (
            <div className="today-card today-empty">
              <Glint className="today-empty-glint" />
              {suggestion ? (
                <>
                  <p className="today-kicker">Sıradaki eser</p>
                  <h2 className="today-book-title">
                    {suggestion.reading_order != null && <span className="today-no">#{suggestion.reading_order}</span>} {suggestion.title}
                  </h2>
                  {suggestion.book_author && <p className="today-author">{suggestion.book_author}</p>}
                  {suggestion.reading_module && <p className="today-module">{suggestion.reading_module}</p>}
                  <button className="btn btn-primary" disabled={busy} onClick={() => setStatus(suggestion, 'okunuyor')}>Okumaya başla</button>
                </>
              ) : (
                <p className="today-note">Okuma listesindeki her şey ya okundu ya da yolda. Sakin bir gün.</p>
              )}
            </div>
          )}

          {schemaReady && <StartOther onStart={startByOrder} hasCurrent={current.length > 0} />}
        </section>

        <aside className="today-side">
          {recall && (
            <div className="today-card recall">
              <p className="today-kicker">Bugün hatırla</p>
              <NoteBody text={recall.body} />
              <p className="note-meta">
                {KIND_LABEL[recall.kind] || 'Not'}
                {recall.page && <> · s. {recall.page}</>}
                {recall.posts && (
                  <> · <Link href={`/kitap-tahlilleri/${recall.posts.slug}`}>{recall.posts.title}</Link></>
                )}
                {' · '}{formatWhen(recall.created_at, today)}
              </p>
            </div>
          )}

          <div className="today-card">
            <p className="today-kicker">Tempo</p>
            <p className="tempo-big">{stats.finished}<span> / {stats.total} eser okundu</span></p>
            <p className="tempo-line">Son 30 günde <strong>{stats.finished30}</strong> eser{pace > 0 ? ` · ayda ~${Math.round(pace * 30)}` : ''}</p>
            {nextMilestone && (
              <p className="tempo-line">
                Sıradaki eşik <strong>{nextMilestone}</strong>
                {eta(nextMilestone - stats.finished) ? <> · bu tempoyla {eta(nextMilestone - stats.finished)}</> : <> · {nextMilestone - stats.finished} eser kaldı</>}
              </p>
            )}
            {remaining > 0 && eta(remaining) && <p className="tempo-line tempo-far">Listenin sonu: {eta(remaining)}</p>}

            <div className="days" aria-label="Son 120 günde okuduğun günler">
              <span className="days-line" />
              {dayDots.map((d) => (
                <span key={d.day} className={`day-dot${d.on ? ' is-on' : ''}${d.day === today ? ' is-today' : ''}`} title={`${d.day}${d.on ? ' · okundu' : ''}`} />
              ))}
            </div>
            <p className="days-cap">son 120 gün</p>
            {!readToday && <button className="btn btn-sm" onClick={markToday}>Bugün okudum</button>}
          </div>

          {durakPrompts.map((d) => (
            <div key={d} className="today-card durak-prompt">
              <p className="today-kicker">Durak tamamlandı</p>
              <p className="durak-prompt-name"><Link href={`/durak/${encodeURIComponent(d)}`}>{d}</Link></p>
              <p className="form-hint">Bu durağın bütün eserlerini bitirdin. Onları bir arada düşünen bir değerlendirme yazmak ister misin?</p>
              <Link href={`/admin/yazi/yeni?durak=${encodeURIComponent(d)}`} className="btn btn-sm btn-primary" style={{ marginTop: 8 }}>Değerlendirmeyi yaz</Link>
            </div>
          ))}

          {waiting.length > 0 && (
            <div className="today-card">
              <p className="today-kicker">Tahlil bekleyenler</p>
              <ul className="waiting-list">
                {waiting.map((w: any) => (
                  <li key={w.id}>
                    <Link href={`/admin/yazi/${w.id}/duzenle`}>
                      <span className="today-no">#{w.reading_order}</span> {w.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="today-links">
            <Link href="/admin/notlar">Tüm fişler</Link>
            <Link href="/admin/harita">Zihin haritası</Link>
            <Link href="/kavram">Kavramlar</Link>
            <Link href="/admin/ozet">Okuma özeti</Link>
            <Link href="/kitap-tahlilleri">Okuma yolculuğu</Link>
            <Link href="/admin">İçerik</Link>
          </div>
        </aside>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function CurrentBook({ book, today, notes, busy, onAdd, onDelete, onUpdate, onPage, onFinish, onBack }: {
  book: Book; today: string; notes: Note[]; busy: boolean;
  onAdd: (postId: number, kind: string, body: string, page: string) => Promise<boolean>;
  onDelete: (id: number) => void; onUpdate: (id: number, body: string) => Promise<boolean>;
  onPage: (book: Book, page: string) => void; onFinish: () => void; onBack: () => void;
}) {
  const [kind, setKind] = useState('not');
  const [body, setBody] = useState('');
  const [page, setPage] = useState(book.current_page || '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  async function submit() {
    if (!body.trim()) return;
    setSaving(true);
    const ok = await onAdd(book.id, kind, body, page);
    setSaving(false);
    if (ok) { setBody(''); onPage(book, page); }
  }

  return (
    <article className="today-card current">
      <div className="current-head">
        <div>
          <p className="today-kicker"><Glint still className="kicker-glint" /> Şu an okuyorsun</p>
          <h2 className="today-book-title">
            {book.reading_order != null && <span className="today-no">#{book.reading_order}</span>} {book.title}
          </h2>
          {book.book_author && <p className="today-author">{book.book_author}</p>}
          {book.reading_module && <p className="today-module">{book.reading_module}</p>}
        </div>
        <label className="page-field">
          <span>Kaldığın yer</span>
          <input
            className="input"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            onBlur={() => onPage(book, page)}
            placeholder="s. 42"
          />
        </label>
      </div>

      <div className="note-form">
        <div className="kind-switch" role="radiogroup" aria-label="Fiş türü">
          {NOTE_KINDS.map((k) => (
            <button key={k.value} type="button" role="radio" aria-checked={kind === k.value}
              className={`kind-btn${kind === k.value ? ' is-on' : ''}`} onClick={() => setKind(k.value)}>
              {k.label}
            </button>
          ))}
        </div>
        <textarea
          className="textarea note-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder={kind === 'alinti' ? 'Altını çizdiğin cümle…' : kind === 'soru' ? 'Aklına takılan soru…' : 'Bir düşünce… başka bir esere bağlamak için [[Etika]] ya da [[#247]] yaz'}
          rows={3}
        />
        <div className="note-form-row">
          <span className="form-hint" style={{ margin: 0 }}>Ctrl + Enter ile kaydet</span>
          <button className="btn btn-primary btn-sm" disabled={saving || !body.trim()} onClick={submit}>
            {saving ? 'Kaydediliyor…' : 'Fişi kaydet'}
          </button>
        </div>
      </div>

      {notes.length > 0 && (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id} className={`note note-${n.kind}`}>
              {editing === n.id ? (
                <div className="note-edit">
                  <textarea className="textarea" value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                  <div className="note-form-row">
                    <button className="btn btn-sm" onClick={() => setEditing(null)}>Vazgeç</button>
                    <button className="btn btn-sm btn-primary" onClick={async () => { if (await onUpdate(n.id, editText)) setEditing(null); }}>Kaydet</button>
                  </div>
                </div>
              ) : (
                <>
                  <NoteBody text={n.body} />
                  <p className="note-meta">
                    <span className={`note-kind note-kind-${n.kind}`}>{KIND_LABEL[n.kind] || 'Not'}</span>
                    {n.page && <> · s. {n.page}</>}
                    {' · '}{formatWhen(n.created_at, today)}
                    <span className="note-actions">
                      <button onClick={() => { setEditing(n.id); setEditText(n.body); }}>düzenle</button>
                      <button onClick={() => onDelete(n.id)}>sil</button>
                    </span>
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="current-actions">
        <button className="btn btn-sm" disabled={busy} onClick={onFinish}>Bitirdim</button>
        <Link href={`/admin/yazi/${book.id}/duzenle`} className="btn btn-sm">Tahlili yaz →</Link>
        <Link href={`/kitap-tahlilleri/${book.slug}`} className="btn btn-sm">Eser sayfası</Link>
        <button className="btn btn-sm btn-quiet" disabled={busy} onClick={onBack}>Sıraya geri koy</button>
      </div>
    </article>
  );
}

function StartOther({ onStart, hasCurrent }: { onStart: (order: string) => void; hasCurrent: boolean }) {
  const [v, setV] = useState('');
  return (
    <form className="start-other" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onStart(v); setV(''); }}>
      <span>{hasCurrent ? 'Aynı anda başka bir esere başla:' : 'Ya da listeden bir esere başla:'}</span>
      <input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder="#sıra" inputMode="numeric" />
      <button className="btn btn-sm" type="submit">Başla</button>
    </form>
  );
}
