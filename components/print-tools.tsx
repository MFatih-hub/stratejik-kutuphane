'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

/**
 * Yazdırma / PDF sayfası için: sitenin üst ve alt kısmını gizler, yazı tipleri
 * ve görseller yüklenince tarayıcının yazdırma penceresini bir kez açar.
 * Pencerede "Hedef: PDF olarak kaydet" seçilince sayfa PDF olarak iner.
 */
export default function PrintTools({ backHref, auto = true }: { backHref: string; auto?: boolean }) {
  const done = useRef(false);
  useEffect(() => {
    document.body.classList.add('print-page');
    if (auto && !done.current) {
      done.current = true;
      const imgs = Array.from(document.images).filter((i) => !i.complete);
      Promise.all([
        (document as any).fonts?.ready ?? Promise.resolve(),
        ...imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; })),
      ]).then(() => setTimeout(() => window.print(), 350));
    }
    return () => document.body.classList.remove('print-page');
  }, [auto]);

  return (
    <div className="print-bar">
      <Link href={backHref} className="btn btn-sm">← Geri</Link>
      <span className="print-bar-hint">
        Açılan pencerede <strong>Hedef</strong> olarak <strong>“PDF olarak kaydet”</strong>i seç.
      </span>
      <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}>PDF olarak kaydet / Yazdır</button>
    </div>
  );
}
