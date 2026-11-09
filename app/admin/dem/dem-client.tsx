'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { NOTE_KINDS, istanbulDay, markReadingDay } from '@/lib/reading';
import { refreshSite } from '@/lib/admin-client';
import NoteBody from '@/components/note-body';

type Book = {
  id: number; slug: string; title: string; book_author: string | null; reading_order: number | null;
  reading_module: string | null; current_page: string | null; started_at: string | null; reading_status: string | null;
};
type Note = { id: number; post_id: number | null; kind: string; body: string; page: string | null; created_at: string; posts?: any };
type QueuedNote = { post_id: number; kind: string; body: string; page: string | null; ts: number };

const QUEUE_KEY = 'zh-note-queue';
const SESSION_KEY = 'zh-oturum';
type Session = { postId: number; startedAt: number };
type TimeStats = { ready: boolean; week: number; today: number; avg4: number; goal: number | null };

/** 95 → "1 sa 35 dk", 40 → "40 dk", 120 → "2 sa" */
function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  if (h === 0) return `${r} dk`;
  return r ? `${h} sa ${r} dk` : `${h} sa`;
}

/** Geçen süre: 754 sn → "12:34", 3754 sn → "1:02:34" */
function fmtClock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function readSession(): Session | null {
  try {
    const v = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return v && typeof v.postId === 'number' && typeof v.startedAt === 'number' ? v : null;
  } catch { return null; }
}
function writeSession(v: Session | null) {
  try {
    if (v) localStorage.setItem(SESSION_KEY, JSON.stringify(v));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* özel pencere */ }
}
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

export default function DemClient(props: {
  schemaReady: boolean; today: string; current: Book[]; suggestion: Book | null; notes: Note[]; waiting: any[];
  days: string[]; stats: { total: number; finished: number; finished30: number; todayNotes: number }; recall: Note | null;
  durakPrompts?: string[];
  time?: TimeStats;
  pace?: { finished90: number };
  durakLeft?: { name: string; left: number } | null;
}) {
  const { schemaReady, today, current, suggestion, waiting, days, stats, recall } = props;
  const time: TimeStats = props.time || { ready: false, week: 0, today: 0, avg4: 0, goal: null };
  const durakPrompts = props.durakPrompts || [];
  const supabase = createClient();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(props.notes);
  const [queued, setQueued] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [readToday, setReadToday] = useState(days.includes(today));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [weekMin, setWeekMin] = useState(time.week);
  const [todayMin, setTodayMin] = useState(time.today);
  const [goal, setGoal] = useState<number | null>(time.goal);
  const [goalEdit, setGoalEdit] = useState(false);
  const [goalText, setGoalText] = useState(time.goal ? String(Math.round((time.goal / 60) * 10) / 10) : '5');

  // Açık kalan oturum (sayfa kapansa da sürer)
  useEffect(() => { setSession(readSession()); }, []);
  useEffect(() => {
    if (!session) return;
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session]);

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

  function startSession(book: Book) {
    const v = { postId: book.id, startedAt: Date.now() };
    writeSession(v);
    setSession(v);
  }

  function cancelSession() {
    writeSession(null);
    setSession(null);
  }

  /** Oturumu kaydeder: süre + kaldığın sayfa. Başarılıysa true. */
  async function saveSession(book: Book, minutes: number, page: string): Promise<boolean> {
    if (!session) return false;
    const m = Math.min(720, Math.max(1, Math.round(minutes)));
    const row = {
      post_id: book.id,
      day: istanbulDay(new Date(session.startedAt)),
      started_at: new Date(session.startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      minutes: m,
      page: page.trim() || null,
    };
    const { error } = await supabase.from('reading_sessions').insert(row);
    if (error) { say('Hata: ' + error.message); return false; }
    await savePage(book, page.trim());
    if (!readToday) { await markReadingDay(supabase); setReadToday(true); }
    setWeekMin((w) => w + m);
    if (row.day === today) setTodayMin((t) => t + m);
    cancelSession();
    say(`${fmtMin(m)} kaydedildi`);
    return true;
  }

  async function saveGoal() {
    const hours = parseFloat(goalText.replace(',', '.'));
    if (!Number.isFinite(hours) || hours <= 0 || hours > 100) { say('Saat olarak yaz (ör. 5)'); return; }
    const minutes = Math.round(hours * 60);
    const { error } = await supabase.from('settings').upsert({ key: 'haftalik_hedef_dk', value: minutes, updated_at: new Date().toISOString() });
    if (error) { say('Hata: ' + error.message); return; }
    setGoal(minutes);
    setGoalEdit(false);
  }

  async function setStatus(book: Book, status: 'okunuyor' | 'okundu' | null) {
    setBusy(true);
    const patch: any = { reading_status: status };
    if (status === 'okunuyor' && !book.started_at) patch.started_at = new Date().toISOString();
    if (status === 'okundu') patch.finished_at = new Date().toISOString();
    const { error } = await supabase.from('posts').update(patch).eq('id', book.id);
    setBusy(false);
    if (error) { say('Hata: ' + error.message); return; }
    await markReadingDay(supabase);
    refreshSite();
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

  // Tempo: son 90 günde biten eserlere göre (eser / gün)
  const pace = (props.pace?.finished90 ?? stats.finished30 * 3) / 90;
  const durakLeft = props.durakLeft || null;
  const remaining = Math.max(0, stats.total - stats.finished);
  const listYear = pace > 0 ? new Date(Date.now() + (remaining / pace) * 86400_000).getFullYear() : null;
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
          <h1 className="today-title">Dem</h1>
        </div>
        <form action="/admin/notlar" className="today-search">
          <input name="q" className="input" placeholder="Ara" />
        </form>
      </header>

      {!schemaReady && (
        <div className="today-banner">
          Okuma durumu ve fişler için veritabanının güncellenmesi gerekiyor: Supabase'de <code>SUPABASE-MIGRATION-v5.sql</code> dosyasını bir kez çalıştır.
        </div>
      )}
      {schemaReady && !time.ready && (
        <div className="today-banner">
          Okuma süresi ve güvenlik kuralları için Supabase'de <code>SUPABASE-MIGRATION-v7.sql</code> dosyasını bir kez çalıştır.
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
              timing={time.ready ? {
                running: session?.postId === book.id ? Math.max(0, Math.floor((nowMs - session.startedAt) / 1000)) : null,
                otherRunning: !!session && session.postId !== book.id,
                onStart: () => startSession(book),
                onCancel: cancelSession,
                onSave: (minutes: number, page: string) => saveSession(book, minutes, page),
              } : null}
            />
          ))}

          {current.length === 0 && schemaReady && (
            <div className="today-card today-empty">
              {suggestion ? (
                <>
                  <p className="today-kicker">Sıradaki</p>
                  <h2 className="today-book-title">
                    {suggestion.reading_order != null && <span className="today-no">#{suggestion.reading_order}</span>} {suggestion.title}
                  </h2>
                  {suggestion.book_author && <p className="today-author">{suggestion.book_author}</p>}
                  <button className="btn btn-primary" disabled={busy} onClick={() => setStatus(suggestion, 'okunuyor')}>Başla</button>
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
              <p className="today-kicker">Hatırla</p>
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

          {time.ready && (
            <div className="today-card">
              <p className="today-kicker">Bu hafta</p>
              <p className="tempo-big">
                {fmtMin(weekMin)}
                {goal ? <span> / {fmtMin(goal)}</span> : null}
              </p>
              {goal ? (
                <div className="goal-bar" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, Math.round((weekMin / goal) * 100))}%` }} />
                </div>
              ) : null}
              <p className="tempo-line">
                Bugün {fmtMin(todayMin)}
                {time.avg4 > 0 && <> · 4 haftalık ortalama {fmtMin(time.avg4)}</>}
              </p>
              {goalEdit ? (
                <form className="goal-form" onSubmit={(e) => { e.preventDefault(); saveGoal(); }}>
                  <label>
                    Haftalık hedef
                    <input className="input" value={goalText} onChange={(e) => setGoalText(e.target.value)} inputMode="decimal" aria-label="Haftalık hedef (saat)" />
                    saat
                  </label>
                  <button className="btn btn-sm btn-primary" type="submit">Kaydet</button>
                </form>
              ) : (
                <button type="button" className="link-btn" onClick={() => setGoalEdit(true)}>{goal ? 'Hedefi değiştir' : 'Haftalık hedef koy'}</button>
              )}
            </div>
          )}

          <div className="today-card">
            <p className="today-kicker">Tempo</p>
            <p className="tempo-big">{stats.finished}<span> / {stats.total}</span></p>
            <p className="tempo-line">Son 30 günde {stats.finished30} eser</p>
            {pace > 0 && (
              <p className="tempo-line">
                Bu hızla{durakLeft && durakLeft.left > 0 && <> {durakLeft.name} ~{eta(durakLeft.left)}</>}
                {listYear && <>{durakLeft && durakLeft.left > 0 ? ' · ' : ' '}tüm liste ~{listYear}</>}
              </p>
            )}

            <div className="days" aria-label="Son 120 günde okuduğun günler">
              <span className="days-line" />
              {dayDots.map((d) => (
                <span key={d.day} className={`day-dot${d.on ? ' is-on' : ''}${d.day === today ? ' is-today' : ''}`} title={`${d.day}${d.on ? ' · okundu' : ''}`} />
              ))}
            </div>
            {!readToday && <button className="btn btn-sm" onClick={markToday}>Bugün okudum</button>}
          </div>

          {durakPrompts.map((d) => (
            <div key={d} className="today-card durak-prompt">
              <p className="today-kicker">Durak tamamlandı</p>
              <p className="durak-prompt-name"><Link href={`/durak/${encodeURIComponent(d)}`}>{d}</Link></p>
              <Link href={`/admin/yazi/yeni?durak=${encodeURIComponent(d)}`} className="btn btn-sm btn-primary" style={{ marginTop: 8 }}>Değerlendirme yaz</Link>
            </div>
          ))}

          <div className="today-links">
            <Link href="/admin/notlar">Fişler</Link>
            <Link href="/admin/harita">Harita</Link>
            <Link href="/admin/ozet">Özet</Link>
          </div>
        </aside>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

type Timing = {
  running: number | null; // geçen saniye; oturum yoksa null
  otherRunning: boolean;
  onStart: () => void;
  onCancel: () => void;
  onSave: (minutes: number, page: string) => Promise<boolean>;
};

function CurrentBook({ book, today, notes, busy, onAdd, onDelete, onUpdate, onPage, onFinish, onBack, timing }: {
  book: Book; today: string; notes: Note[]; busy: boolean;
  onAdd: (postId: number, kind: string, body: string, page: string) => Promise<boolean>;
  onDelete: (id: number) => void; onUpdate: (id: number, body: string) => Promise<boolean>;
  onPage: (book: Book, page: string) => void; onFinish: () => void; onBack: () => void;
  timing: Timing | null;
}) {
  const [kind, setKind] = useState('not');
  const [body, setBody] = useState('');
  const [page, setPage] = useState(book.current_page || '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  // Oturum bitirilirken: süre (dk) ve kaldığın sayfa
  const [stopping, setStopping] = useState(false);
  const [stopMin, setStopMin] = useState('');
  const [stopPage, setStopPage] = useState('');
  const [savingSession, setSavingSession] = useState(false);

  function stop() {
    if (!timing || timing.running == null) return;
    setStopMin(String(Math.max(1, Math.round(timing.running / 60))));
    setStopPage(page);
    setStopping(true);
  }

  async function saveStop() {
    if (!timing) return;
    const m = parseInt(stopMin, 10);
    if (!Number.isFinite(m) || m < 1) { timing.onCancel(); setStopping(false); return; }
    setSavingSession(true);
    const ok = await timing.onSave(m, stopPage);
    setSavingSession(false);
    if (ok) { setPage(stopPage); setStopping(false); }
  }

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
          <h2 className="today-book-title">
            <Link href={`/kitap-tahlilleri/${book.slug}`}>
              {book.reading_order != null && <span className="today-no">#{book.reading_order}</span>} {book.title}
            </Link>
          </h2>
          {book.book_author && <p className="today-author">{book.book_author}</p>}
        </div>
        <label className="page-field" aria-label="Kaldığın sayfa">
          <input
            className="input"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            onBlur={() => onPage(book, page)}
            placeholder="Sayfa"
          />
        </label>
      </div>

      {timing && (
        <div className="session">
          {timing.running == null ? (
            <button className="btn btn-primary" disabled={timing.otherRunning} onClick={timing.onStart}>Okumaya başla</button>
          ) : stopping ? (
            <form className="session-form" onSubmit={(e) => { e.preventDefault(); saveStop(); }}>
              <label>Süre <input className="input" value={stopMin} onChange={(e) => setStopMin(e.target.value.replace(/\D+/g, ''))} inputMode="numeric" aria-label="Süre (dakika)" /> dk</label>
              <label>Sayfa <input className="input" value={stopPage} onChange={(e) => setStopPage(e.target.value)} aria-label="Kaldığın sayfa" /></label>
              <button className="btn btn-sm btn-primary" type="submit" disabled={savingSession}>{savingSession ? 'Kaydediliyor' : 'Kaydet'}</button>
              <button className="btn btn-sm btn-quiet" type="button" onClick={() => setStopping(false)}>Devam et</button>
              <button className="btn btn-sm btn-quiet" type="button" onClick={() => { timing.onCancel(); setStopping(false); }}>Sil</button>
            </form>
          ) : (
            <>
              <span className="session-dot" aria-hidden="true" />
              <span className="session-time" aria-live="off">{fmtClock(timing.running)}</span>
              <button className="btn btn-sm btn-primary" onClick={stop}>Durdur</button>
            </>
          )}
        </div>
      )}

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
          placeholder={kind === 'alinti' ? 'Alıntı' : kind === 'soru' ? 'Soru' : 'Not'}
          rows={3}
        />
        <div className="note-form-row">
          <span />
          <button className="btn btn-primary btn-sm" disabled={saving || !body.trim()} onClick={submit}>
            {saving ? 'Kaydediliyor' : 'Kaydet'}
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
        <button className="btn btn-sm btn-primary" disabled={busy} onClick={onFinish}>Bitirdim</button>
        <Link href={`/admin/yazi/${book.id}/duzenle`} className="btn btn-sm">Tahlil yaz</Link>
        <button className="btn btn-sm btn-quiet" disabled={busy} onClick={onBack}>Bırak</button>
      </div>
    </article>
  );
}

function StartOther({ onStart, hasCurrent }: { onStart: (order: string) => void; hasCurrent: boolean }) {
  const [v, setV] = useState('');
  return (
    <form className="start-other" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onStart(v); setV(''); }}>
      <input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder={hasCurrent ? 'Başka bir eser, sıra no' : 'Sıra no'} inputMode="numeric" aria-label="Sıra numarasıyla başla" />
      <button className="btn btn-sm" type="submit">Başla</button>
    </form>
  );
}
