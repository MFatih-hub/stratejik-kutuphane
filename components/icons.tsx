// components/icons.tsx — birkaç ince çizgi ikon (SF Symbols ölçülerinde).

export function Chevron({ dir = 'right' }: { dir?: 'right' | 'left' }) {
  return (
    <svg className="chev" width="7" height="12" viewBox="0 0 7 12" aria-hidden="true" focusable="false">
      <path d={dir === 'right' ? 'M1 1l5 5-5 5' : 'M6 1L1 6l5 5'} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.75 12.75L17.5 17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AppearanceIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 2.75a7.25 7.25 0 0 0 0 14.5z" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
