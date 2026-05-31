'use client';

import { useState } from 'react';

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="share-row">
      <button onClick={copyLink} className="btn btn-sm">
        {copied ? '✓ Kopyalandı' : '🔗 Bağlantıyı kopyala'}
      </button>
      <a href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
         target="_blank" rel="noopener noreferrer" className="btn btn-sm">
        X (Twitter)
      </a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
         target="_blank" rel="noopener noreferrer" className="btn btn-sm">
        LinkedIn
      </a>
      <a href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
         target="_blank" rel="noopener noreferrer" className="btn btn-sm">
        WhatsApp
      </a>
    </div>
  );
}
