// Editörde öneri listeleri: duraklar ve mevcut dizi adları (sunucuda çağrılır).
export async function fetchEditorLists(supabase: any): Promise<{ modules: string[]; series: string[] }> {
  const modules = new Set<string>();
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await supabase.from('posts').select('reading_module').eq('post_type', 'kitap_tahlili')
      .not('reading_module', 'is', null).order('reading_order', { ascending: true }).range(from, from + 999);
    if (error || !data) break;
    data.forEach((r: any) => r.reading_module && modules.add(r.reading_module));
    if (data.length < 1000) break;
  }
  const series = new Set<string>();
  const { data: s, error } = await supabase.from('posts').select('series').not('series', 'is', null).limit(1000);
  if (!error) (s || []).forEach((r: any) => r.series && series.add(r.series));
  return { modules: Array.from(modules), series: Array.from(series).sort((a, b) => a.localeCompare(b, 'tr')) };
}
