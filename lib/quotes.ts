// lib/quotes.ts — sayfa altında her gün değişen kısa söz.
// Kaynağı belli, kısa sözler; Türkçe ifadeler serbest çeviridir.

export type Quote = {
  text: string;
  who: string;
  /** Ayet/beyit gibi çok parçalı metinler: Arapça asıl ve meal, numarasıyla */
  verses?: { n: number; ar: string; tr: string }[];
};

// Bakara Sûresi 30–34: Âdem'in halife kılınması, meleklerin sorusu, isimlerin
// öğretilmesi ve secde. Arapça: Uthmani hattı; meal: Diyanet İşleri Başkanlığı.
// (Kaynak: api.alquran.cloud, quran-uthmani ve tr.diyanet sürümleri — birebir.)
const BAKARA_30_34: Quote['verses'] = [
  {
    "n": 30,
    "ar": "وَإِذْ قَالَ رَبُّكَ لِلْمَلَٰٓئِكَةِ إِنِّى جَاعِلٌۭ فِى ٱلْأَرْضِ خَلِيفَةًۭ ۖ قَالُوٓا۟ أَتَجْعَلُ فِيهَا مَن يُفْسِدُ فِيهَا وَيَسْفِكُ ٱلدِّمَآءَ وَنَحْنُ نُسَبِّحُ بِحَمْدِكَ وَنُقَدِّسُ لَكَ ۖ قَالَ إِنِّىٓ أَعْلَمُ مَا لَا تَعْلَمُونَ",
    "tr": "Rabbin meleklere \"Ben yeryüzünde bir halife var edeceğim\" demişti; melekler, \"Orada bozgunculuk yapacak, kanlar akıtacak birini mi var edeceksin? Oysa biz Seni överek yüceltiyor ve Seni devamlı takdis ediyoruz\" dediler; Allah \"Ben şüphesiz sizin bilmediklerinizi bilirim\" dedi."
  },
  {
    "n": 31,
    "ar": "وَعَلَّمَ ءَادَمَ ٱلْأَسْمَآءَ كُلَّهَا ثُمَّ عَرَضَهُمْ عَلَى ٱلْمَلَٰٓئِكَةِ فَقَالَ أَنۢبِـُٔونِى بِأَسْمَآءِ هَٰٓؤُلَآءِ إِن كُنتُمْ صَٰدِقِينَ",
    "tr": "Ve Adem'e bütün isimleri öğretti, sonra eşyayı meleklere gösterdi. \"Eğer sözünüzde samimi iseniz bunların isimlerini bana söyleyin\" dedi."
  },
  {
    "n": 32,
    "ar": "قَالُوا۟ سُبْحَٰنَكَ لَا عِلْمَ لَنَآ إِلَّا مَا عَلَّمْتَنَآ ۖ إِنَّكَ أَنتَ ٱلْعَلِيمُ ٱلْحَكِيمُ",
    "tr": "Cevap verdiler: \"Sen münezzehsin, öğrettiğinden başka bizim bir bilgimiz yoktur. Şüphesiz Sen hem bilensin, hem Hakim'sin\"."
  },
  {
    "n": 33,
    "ar": "قَالَ يَٰٓـَٔادَمُ أَنۢبِئْهُم بِأَسْمَآئِهِمْ ۖ فَلَمَّآ أَنۢبَأَهُم بِأَسْمَآئِهِمْ قَالَ أَلَمْ أَقُل لَّكُمْ إِنِّىٓ أَعْلَمُ غَيْبَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ وَأَعْلَمُ مَا تُبْدُونَ وَمَا كُنتُمْ تَكْتُمُونَ",
    "tr": "Allah \"Ey Adem onlara isimlerini söyle\" dedi. Adem isimlerini söyleyince, Allah \"Ben gökler ve yerde görünmeyeni biliyorum, sizin açıkladığınızı ve gizlemekte olduğunuzu da bilirim, diye size söylememiş miydim?\" dedi."
  },
  {
    "n": 34,
    "ar": "وَإِذْ قُلْنَا لِلْمَلَٰٓئِكَةِ ٱسْجُدُوا۟ لِءَادَمَ فَسَجَدُوٓا۟ إِلَّآ إِبْلِيسَ أَبَىٰ وَٱسْتَكْبَرَ وَكَانَ مِنَ ٱلْكَٰفِرِينَ",
    "tr": "Meleklere, \"Adem'e secde edin\" demiştik, İblis müstesna hepsi secde ettiler, o ise kaçındı, büyüklük tasladı ve inkar edenlerden oldu."
  }
];

export const QUOTES: Quote[] = [
  { text: 'Hayret, felsefenin başlangıcıdır.', who: 'Platon, Theaetetus' },
  { text: 'Ve Âdem\'e bütün isimleri öğretti.', who: 'Bakara Sûresi, 30–34 · Diyanet meali', verses: BAKARA_30_34 },
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
