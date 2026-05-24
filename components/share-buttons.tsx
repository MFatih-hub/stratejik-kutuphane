'use client';

import { useState } from 'react';

interface ShareButtonsProps {
  title: string;
  author: string | null;
}

export default function ShareButtons({ title, author }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  function getUrl() {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  function shareText() {
    return `${title}${author ? ' — ' + author : ''}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function shareOn(platform: 'twitter' | 'linkedin' | 'whatsapp') {
    const url = encodeURIComponent(getUrl());
    const text = encodeURIComponent(shareText());
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    };
    window.open(urls[platform], '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  return (
    <div className="share-row">
      <button onClick={copyLink} className="btn btn-sm">
        <i className={`ti ${copied ? 'ti-check' : 'ti-link'}`} style={{ fontSize: 13 }}></i>
        {copied ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
      </button>
      <button onClick={() => shareOn('twitter')} className="btn btn-sm">
        <i className="ti ti-brand-x" style={{ fontSize: 13 }}></i>
        X
      </button>
      <button onClick={() => shareOn('linkedin')} className="btn btn-sm">
        <i className="ti ti-brand-linkedin" style={{ fontSize: 13 }}></i>
        LinkedIn
      </button>
      <button onClick={() => shareOn('whatsapp')} className="btn btn-sm">
        <i className="ti ti-brand-whatsapp" style={{ fontSize: 13 }}></i>
        WhatsApp
      </button>
    </div>
  );
}
