'use client';

import { useEffect, useState } from 'react';

// Bir durak tamamlandığında, sayfayı o günden sonra ilk açışında ışıltı bir
// kez yumuşakça parlar ve durağın adı belirip kaybolur. Bir daha tekrarlamaz.
const KEY = 'zh-done-modules';

export default function DurakFlare({ completed }: { completed: string[] }) {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let seen: string[] | null = null;
    try { seen = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { seen = null; }
    try { localStorage.setItem(KEY, JSON.stringify(completed)); } catch { /* yok */ }
    if (!seen) return; // ilk ziyaret: sadece hatırla
    const fresh = completed.filter((c) => !seen!.includes(c));
    if (!fresh.length) return;
    const glints = document.querySelectorAll('.journey .glint, .journey .journey-cell.is-next');
    glints.forEach((g) => g.classList.add('flare'));
    setMsg(fresh.length === 1 ? `“${fresh[0]}” durağı tamamlandı` : `${fresh.length} durak tamamlandı`);
    const t = setTimeout(() => { glints.forEach((g) => g.classList.remove('flare')); setMsg(''); }, 6000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return msg ? <p className="durak-flare-msg" role="status">{msg}</p> : null;
}
