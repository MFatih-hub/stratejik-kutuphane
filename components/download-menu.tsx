/** Yazıyı indirme bağlantıları: PDF (yazdırma sayfası), Word, Markdown. */
export default function DownloadMenu({ id, label = 'İndir' }: { id: number; label?: string }) {
  return (
    <div className="download-row" aria-label="Yazıyı indir">
      <span className="download-label">{label}</span>
      <a href={`/yazdir/${id}`} target="_blank" rel="noopener" className="download-chip" title="Yazdırma penceresinden PDF olarak kaydet">PDF</a>
      <a href={`/api/indir?id=${id}&bicim=docx`} className="download-chip" title="Word belgesi (.docx)">Word</a>
      <a href={`/api/indir?id=${id}&bicim=md`} className="download-chip" title="Markdown (.md) — Obsidian, Notion vb.">Markdown</a>
    </div>
  );
}
