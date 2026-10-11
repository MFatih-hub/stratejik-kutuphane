import Link from 'next/link';
import type { Journey, JourneyItem } from '@/lib/reading-journey';
import { Glint } from './calm';
import Milestones from './milestones';
import DurakFlare from './durak-flare';

// Kitap Tahlilleri sayfasının başındaki "okuma yolculuğu" görünümü:
// her eser bir kare; tahlili yazılanlar dolu, sıradaki eser işaretli.
// Modül (durak) bilgisi varsa kareler duraklara ayrılır.

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 1000) / 10 : 0;
}

function label(it: JourneyItem) {
  const t = it.title.length > 70 ? `${it.title.slice(0, 68)}…` : it.title;
  return `${it.order != null ? `#${it.order} ` : ''}${t}${it.author ? ` — ${it.author}` : ''}${it.written ? ' ✓' : ''}`;
}

function Cells({ items, nextId }: { items: JourneyItem[]; nextId: number | null }) {
  return (
    <div className="journey-grid" role="list">
      {items.map((it) => {
        const isNext = it.id === nextId;
        const cls = `journey-cell${it.written ? ' is-written' : ''}${isNext ? ' is-next' : ''}`;
        return it.written || isNext ? (
          <Link key={it.id} href={`/kitap-tahlilleri/${it.slug}`} className={cls} title={label(it)} role="listitem" aria-label={label(it)} />
        ) : (
          <span key={it.id} className={cls} title={label(it)} role="listitem" />
        );
      })}
    </div>
  );
}

// Durak sayısı bunu aşarsa her durağın karelerini göstermek sayfayı çok
// uzatır: o zaman sadece içinde bulunulan durak kareleriyle, diğerleri
// ilerleme şeridi + açılır liste olarak gösterilir.
const COMPACT_AFTER = 16;

function CompactModules({ journey, moduleHref }: { journey: Journey; moduleHref: (name: string) => string }) {
  const { items, next, modules } = journey;
  const nextId = next?.id ?? null;
  const activeIdx = Math.max(0, modules.findIndex((m) => m.name === next?.module));
  const active = modules[activeIdx];
  const activeItems = items.filter((i) => i.module === active.name);
  const doneModules = modules.filter((m) => m.total > 0 && m.written === m.total).length;

  return (
    <div className="journey-compact">
      <div className="journey-current">
        <div className="journey-module-head">
          <Link href={moduleHref(active.name)} className="journey-module-name">
            <span className="journey-module-idx">Durak {activeIdx + 1} / {modules.length}</span> {active.name}
          </Link>
          <span className="journey-module-meta">
            {active.firstOrder != null && `#${active.firstOrder}–${active.lastOrder} · `}{active.written}/{active.total}
          </span>
        </div>
        <div className="journey-bar"><div className="journey-bar-fill" style={{ width: `${pct(active.written, active.total)}%` }} /></div>
        <Cells items={activeItems} nextId={nextId} />
      </div>

      <div className="journey-track-head">
        <span>Yolculuğun tamamı</span>
        <span>{doneModules} / {modules.length} durak tamamlandı</span>
      </div>
      <div className="journey-track" role="list" aria-label="Duraklar">
        {modules.map((m, idx) => (
          <Link
            key={m.name}
            href={moduleHref(m.name)}
            role="listitem"
            className={`journey-seg${idx === activeIdx ? ' is-active' : ''}${m.written === m.total && m.total > 0 ? ' is-done' : ''}`}
            style={{ flexGrow: m.total }}
            title={`${String(idx + 1).padStart(2, '0')} · ${m.name} · ${m.written}/${m.total}`}
            aria-label={`${m.name}: ${m.written}/${m.total}`}
          >
            <span className="journey-seg-fill" style={{ height: `${pct(m.written, m.total)}%` }} />
          </Link>
        ))}
      </div>

      <details className="journey-all">
        <summary>Tüm durakları göster ({modules.length})</summary>
        <ol className="journey-all-list">
          {modules.map((m, idx) => (
            <li key={m.name} className={idx === activeIdx ? 'is-active' : ''}>
              <Link href={moduleHref(m.name)} className="journey-all-item">
                <span className="journey-module-idx">{String(idx + 1).padStart(2, '0')}</span>
                <span className="journey-all-name">{m.name}</span>
                <span className="journey-module-meta">{m.firstOrder != null && `#${m.firstOrder} · `}{m.written}/{m.total}</span>
                <span className="journey-bar journey-all-bar"><span className="journey-bar-fill" style={{ width: `${pct(m.written, m.total)}%`, display: 'block' }} /></span>
              </Link>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

export default function ReadingJourney({ journey, moduleHref }: { journey: Journey; moduleHref: (name: string) => string }) {
  const { items, total, written, next, lastWritten, modules } = journey;
  if (total === 0) return null;
  const nextId = next?.id ?? null;

  return (
    <section
      className="journey"
      aria-label="Okuma yolculuğu"
      // Işıltı, tahlil sayısıyla birlikte çok yavaş güçlenir
      style={{ ['--glint-boost' as any]: Math.min(1, Math.sqrt(written / Math.max(1, total))).toFixed(3) }}
    >
      <DurakFlare completed={modules.filter((m) => m.total > 0 && m.written === m.total).map((m) => m.name)} />
      <div className="journey-head">
        <div className="journey-stat">
          <span className="journey-stat-value">{written}<span className="journey-stat-of"> / {total}</span></span>
          <span className="journey-stat-label">eserin tahlili yazıldı · %{pct(written, total)}</span>
        </div>
        {next && (
          <Link href={`/kitap-tahlilleri/${next.slug}`} className="journey-here">
            <Glint still className="journey-here-pin" />
            <span className="journey-here-text">
              <span className="journey-here-label">Şu an buradayım</span>
              <span className="journey-here-title">
                {next.order != null && <span className="journey-here-no">#{next.order}</span>} {next.title}
              </span>
              {next.author && <span className="journey-here-author">{next.author}</span>}
            </span>
          </Link>
        )}
        {lastWritten && (
          <Link href={`/kitap-tahlilleri/${lastWritten.slug}`} className="journey-last">
            <span className="journey-here-label">En son tamamlanan</span>
            <span className="journey-here-title">
              {lastWritten.order != null && <span className="journey-here-no">#{lastWritten.order}</span>} {lastWritten.title}
            </span>
            {lastWritten.author && <span className="journey-here-author">{lastWritten.author}</span>}
          </Link>
        )}
      </div>

      <Milestones written={written} total={total} />

      {modules.length > COMPACT_AFTER ? (
        <CompactModules journey={journey} moduleHref={moduleHref} />
      ) : modules.length > 0 ? (
        <div className="journey-modules">
          {modules.map((m, idx) => {
            const modItems = items.filter((i) => i.module === m.name);
            const active = next?.module === m.name;
            return (
              <div key={m.name} className={`journey-module${active ? ' is-active' : ''}`}>
                <div className="journey-module-head">
                  <Link href={moduleHref(m.name)} className="journey-module-name">
                    <span className="journey-module-idx">{String(idx + 1).padStart(2, '0')}</span> {m.name}
                  </Link>
                  <span className="journey-module-meta">
                    {m.firstOrder != null && `#${m.firstOrder}–${m.lastOrder} · `}{m.written}/{m.total}
                  </span>
                </div>
                <div className="journey-bar"><div className="journey-bar-fill" style={{ width: `${pct(m.written, m.total)}%` }} /></div>
                <Cells items={modItems} nextId={nextId} />
              </div>
            );
          })}
          {items.some((i) => !i.module) && (
            <div className="journey-module">
              <div className="journey-module-head"><span className="journey-module-name">Durağı belirtilmemiş</span></div>
              <Cells items={items.filter((i) => !i.module)} nextId={nextId} />
            </div>
          )}
        </div>
      ) : (
        <Cells items={items} nextId={nextId} />
      )}

      <div className="journey-legend" aria-hidden="true">
        <span><i className="journey-cell is-written" /> Tahlili yazıldı</span>
        <span><i className="journey-cell is-next" /> Sıradaki</span>
        <span><i className="journey-cell" /> Sırada bekliyor</span>
        <span className="journey-legend-hint">Her kare bir eser · üstüne gelince adı görünür</span>
      </div>
    </section>
  );
}
