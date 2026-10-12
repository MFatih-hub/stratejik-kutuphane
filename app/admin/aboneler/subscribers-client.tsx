'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Sub = { id: number; email: string; confirmed_at: string | null; unsubscribed_at: string | null; created_at: string };

export default function SubscribersClient({ initial }: { initial: Sub[] }) {
  const supabase = createClient();
  const [list, setList] = useState(initial);

  function csv() {
    const rows = [['e-posta', 'durum', 'kayıt', 'onay'], ...list.map((s) => [s.email, s.unsubscribed_at ? 'ayrıldı' : s.confirmed_at ? 'onaylı' : 'bekliyor', s.created_at.slice(0, 10), s.confirmed_at?.slice(0, 10) || ''])];
    const blob = new Blob(['﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aboneler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  async function remove(s: Sub) {
    if (!confirm(`${s.email} listeden tamamen silinsin mi?`)) return;
    const { error } = await supabase.from('subscribers').delete().eq('id', s.id);
    if (!error) setList((l) => l.filter((x) => x.id !== s.id));
  }

  if (!list.length) return <p className="form-hint" style={{ marginTop: 16 }}>Henüz abone yok.</p>;
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p className="section-title" style={{ margin: 0 }}>Liste</p>
        <button type="button" className="btn btn-sm" onClick={csv}>CSV indir</button>
      </div>
      <table className="ozet-table subs-table">
        <thead><tr><th>E-posta</th><th>Durum</th><th>Kayıt</th><th></th></tr></thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id}>
              <td>{s.email}</td>
              <td>{s.unsubscribed_at ? 'ayrıldı' : s.confirmed_at ? 'onaylı' : 'onay bekliyor'}</td>
              <td>{new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
              <td><button type="button" className="btn btn-sm btn-danger" onClick={() => remove(s)}>Sil</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
