'use client';

import { useState } from 'react';

/** Tek düğme: telefonda sistemin paylaşım sayfası, masaüstünde bağlantıyı kopyalar. */
export default function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* vazgeçildi */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* izin yok */ }
  }

  return (
    <button type="button" className="btn btn-sm" onClick={share}>
      {copied ? 'Bağlantı kopyalandı' : 'Paylaş'}
    </button>
  );
}
