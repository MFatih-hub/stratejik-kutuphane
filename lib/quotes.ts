// lib/quotes.ts — sayfa altında her gün değişen kısa söz.
// Kaynağı belli, kısa sözler; Türkçe ifadeler serbest çeviridir.

export const QUOTES: { text: string; who: string }[] = [
  { text: 'Hayret, felsefenin başlangıcıdır.', who: 'Platon, Theaetetus' },
  { text: 'Sorgulanmamış bir hayat yaşanmaya değmez.', who: 'Sokrates, Savunma' },
  { text: 'Aynı nehre iki kez girilmez.', who: 'Herakleitos' },
  { text: 'Az zamanımız yok; çoğunu boşa harcıyoruz.', who: 'Seneca, Hayatın Kısalığı Üzerine' },
  { text: 'İnsanı üzen şeyler değil, şeyler hakkındaki yargılarıdır.', who: 'Epiktetos, Enchiridion' },
  { text: 'Ruh, düşüncelerinin rengine boyanır.', who: 'Marcus Aurelius, Kendime Düşünceler' },
  { text: 'Bin fersahlık yolculuk ayağının altındaki adımla başlar.', who: 'Laozi, Daodejing' },
  { text: 'Öğrenip düşünmemek boşuna; düşünüp öğrenmemek tehlikelidir.', who: 'Konfüçyüs, Analektler' },
  { text: 'İlim ilim bilmektir, ilim kendin bilmektir.', who: 'Yunus Emre' },
  { text: "Minerva'nın baykuşu ancak alacakaranlıkta kanatlarını açar.", who: 'Hegel, Hukuk Felsefesi' },
  { text: 'Okurken bizim yerimize bir başkası düşünür.', who: 'Schopenhauer' },
  { text: 'Bütün insanlar doğaları gereği bilmek ister.', who: 'Aristoteles, Metafizik' },
  { text: 'Düşünüyorum, öyleyse varım.', who: 'Descartes' },
  { text: 'Kalbin, aklın bilmediği sebepleri vardır.', who: 'Pascal, Düşünceler' },
  { text: 'Ne biliyorum?', who: 'Montaigne' },
  { text: 'Her yüce şey, nadir olduğu kadar zordur.', who: 'Spinoza, Etika' },
  { text: 'Cesaret et, kendi aklını kullan!', who: 'Kant, Aydınlanma Nedir?' },
  { text: 'Dilimin sınırları, dünyamın sınırlarıdır.', who: 'Wittgenstein, Tractatus' },
];

/** Günün sözü (İstanbul saatine göre, her gün bir sonraki). */
export function quoteOfTheDay(date = new Date()) {
  const day = Math.floor((date.getTime() + 3 * 3600_000) / 86_400_000);
  return QUOTES[day % QUOTES.length];
}
