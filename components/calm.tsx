// components/calm.tsx — "durgun deniz" görsel dili:
// metalik ufuk, hiçlik içinde tek bir küçük ışıltı.
// Hareket sadece ışıltının çok yavaş nefes alması (prefers-reduced-motion'da durur).

/** Tek bir küçük ışık noktası. `still` ise nefes almaz (sayfada tek ışıltı canlı kalsın diye). */
export function Glint({ still = false, className = '' }: { still?: boolean; className?: string }) {
  return <span className={`glint${still ? ' glint-still' : ''} ${className}`} aria-hidden="true" />;
}

/** Logo: metalik bir disk, ortasından geçen ufuk çizgisi ve üstünde minik bir ışık. */
export function BrandMark() {
  return (
    <svg className="brand-mark-svg" viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
      <defs>
        <linearGradient id="bm-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--metal-1)" />
          <stop offset="0.42" stopColor="var(--metal-2)" />
          <stop offset="0.55" stopColor="var(--metal-3)" />
          <stop offset="1" stopColor="var(--metal-4)" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="17" fill="url(#bm-metal)" />
      <path d="M5 21.5h26" className="brand-mark-horizon" />
      <path d="M10 25h16M14 28h8" className="brand-mark-ripple" />
      <circle cx="23" cy="13" r="1.6" className="brand-mark-glint" />
    </svg>
  );
}

/** Boş sayfalar ve 404 için: ince bir ufuk çizgisi ve üstünde sönük bir ışık. */
export function Horizon({ width = 160 }: { width?: number }) {
  return (
    <div className="horizon" style={{ width }} aria-hidden="true">
      <span className="horizon-line" />
      <Glint still className="horizon-glint" />
    </div>
  );
}

/** Ana sayfa hero'su: durgun deniz. Ufuk, sudaki ince yansımalar ve tek bir ışıltı. */
export function SeaHorizon() {
  return (
    <div className="sea" aria-hidden="true">
      <svg viewBox="0 0 400 220" preserveAspectRatio="none" className="sea-svg">
        <defs>
          <linearGradient id="sea-fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="0">
            <stop offset="0" stopColor="var(--sea-line)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--sea-line)" stopOpacity="1" />
            <stop offset="1" stopColor="var(--sea-line)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sea-reflect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--glint-core)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--glint-core)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 120H400" stroke="url(#sea-fade)" strokeWidth="1" />
        <path d="M70 140H330" stroke="url(#sea-fade)" strokeWidth="0.6" opacity="0.55" />
        <path d="M120 158H280" stroke="url(#sea-fade)" strokeWidth="0.5" opacity="0.4" />
        <path d="M160 176H240" stroke="url(#sea-fade)" strokeWidth="0.5" opacity="0.28" />
        <path d="M185 192H215" stroke="url(#sea-fade)" strokeWidth="0.5" opacity="0.18" />
        <rect className="sea-reflection" x="263.6" y="122" width="1.4" height="46" fill="url(#sea-reflect)" />
      </svg>
      <Glint className="sea-glint" />
    </div>
  );
}

/** Tema düğmesi için ince çizgi ikonları. */
export function ThemeIcon({ name }: { name: 'moon' | 'sea' | 'sun' }) {
  const d =
    name === 'moon' ? 'M15.5 3.5a7.5 7.5 0 1 0 5 13 6 6 0 0 1-5-13z'
    : name === 'sea' ? 'M3 10h18M5 14h14M8 18h8M12 3.5v2'
    : 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4';
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="theme-icon" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
