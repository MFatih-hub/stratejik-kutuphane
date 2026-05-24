'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

interface NotesEditorProps {
  resourceId: number;
  initialNotes: string | null;
  isAdmin: boolean;
}

export default function NotesEditor({ resourceId, initialNotes, isAdmin }: NotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const router = useRouter();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('resources')
      .update({ notes: notes || null })
      .eq('id', resourceId);

    if (error) {
      showToast('Kaydetme hatası: ' + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    showToast('Notlar kaydedildi');
    router.refresh();
  }

  function handleCancel() {
    setNotes(initialNotes || '');
    setEditing(false);
  }

  if (!isAdmin && !initialNotes) return null;

  if (!isAdmin) {
    return (
      <>
        <div className="section-label">Okuma Notları</div>
        <div className="notes-box">{initialNotes}</div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 12px' }}>
        <span className="section-label" style={{ margin: 0 }}>Okuma Notları</span>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-sm">
            <i className="ti ti-edit" style={{ fontSize: 13 }}></i>
            {initialNotes ? 'Düzenle' : 'Not Ekle'}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Okurken aldığın notlar, alıntılar, düşünceler... Bu metin sitenin tüm ziyaretçilerine açıktır."
            style={{ minHeight: 220 }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={handleCancel} className="btn" disabled={saving}>İptal</button>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
              Notlar herkese açık olarak yayınlanır
            </span>
          </div>
        </div>
      ) : initialNotes ? (
        <div className="notes-box">{initialNotes}</div>
      ) : (
        <div className="notes-empty">
          Henüz not eklenmedi. "Not Ekle" butonuna basarak başlayabilirsin.
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
