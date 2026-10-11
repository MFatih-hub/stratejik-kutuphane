// Okuma yolculuğu rozetleri — pasaport damgası gibi; kazanılanlar renkli,
// sıradaki "x kaldı" der, gerisi kesik çizgili bekler.

const STEPS: { n: number; label: string }[] = [
  { n: 1, label: 'İlk adım' },
  { n: 10, label: 'On tahlil' },
  { n: 50, label: 'Elli' },
  { n: 100, label: 'Yüzler kulübü' },
  { n: 250, label: 'Çeyrek bin' },
  { n: 500, label: 'Yarım bin' },
  { n: 1000, label: 'Bin' },
  { n: 2000, label: 'İki bin' },
  { n: 3650, label: 'Yolun sonu' },
];

export default function Milestones({ written, total }: { written: number; total: number }) {
  const steps = STEPS.filter((s) => s.n <= Math.max(total, 1));
  if (steps.length === 0) return null;
  const nextIdx = steps.findIndex((s) => written < s.n);

  return (
    <div className="stamps" aria-label="Rozetler">
      {steps.map((s, i) => {
        const got = written >= s.n;
        const isNext = i === nextIdx;
        return (
          <div
            key={s.n}
            className={`stamp${got ? ' is-got' : ''}${isNext ? ' is-next' : ''}`}
            style={{ ['--tilt' as any]: `${((i * 37) % 11) - 5}deg` }}
            title={got ? `${s.label}: kazanıldı` : `${s.label}: ${s.n - written} tahlil kaldı`}
          >
            <span className="stamp-n">{s.n >= 1000 ? `${s.n / 1000}K`.replace('.', ',') : s.n}</span>
            <span className="stamp-label">{s.label}</span>
            {isNext && <span className="stamp-left">{s.n - written} kaldı</span>}
          </div>
        );
      })}
    </div>
  );
}
