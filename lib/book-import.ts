// lib/book-import.ts — Kitap Tahlilleri toplu ekleme için metin ayrıştırıcı.
//
// İki giriş biçimi kabul edilir:
//   1) Excel/Google Sheets'ten doğrudan kopyalanan hücreler (sekmeyle ayrılmış
//      satırlar). İlk satır başlıksa (Sıra / Yazar / Metin / Kategori) sütunlar
//      başlığa göre eşlenir; değilse sıra: Sıra, Yazar, Metin, [Kategori].
//   2) Okuma Bülteni toplu eklemesiyle aynı mantıkta etiketli bloklar:
//        Sıra: 1
//        Yazar: Platon
//        Metin: Apology (Sokrates'in Savunması)
//        Kategori: Felsefe
//      (bloklar boş satırla ayrılır).

import { turkishLower } from './helpers';

export type RawBook = {
  order: number | null;
  author: string;
  title: string;
  category: string;
};

type Field = keyof RawBook;

const HEADER_ALIASES: Record<string, Field> = {
  'sıra': 'order', 'sira': 'order', 'no': 'order', 'no.': 'order', '#': 'order', 'sıra no': 'order', 'order': 'order',
  'yazar': 'author', 'yazarlar': 'author', 'author': 'author', 'authors': 'author',
  'metin': 'title', 'eser': 'title', 'kitap': 'title', 'başlık': 'title', 'baslik': 'title', 'title': 'title',
  'eser adı': 'title', 'eser adi': 'title', 'kitap adı': 'title', 'kitap adi': 'title',
  'kategori': 'category', 'category': 'category', 'alan': 'category',
};

function headerField(label: string): Field | undefined {
  return HEADER_ALIASES[turkishLower(label.trim()).replace(/:$/, '')];
}

function parseOrder(value: string): number | null {
  const m = /\d+/.exec(value || '');
  return m ? parseInt(m[0], 10) : null;
}

/** Başlık "(12) Eser adı" biçimindeyse numarayı ayıklar. */
function splitNumberedTitle(title: string): { order: number | null; title: string } {
  const m = /^\s*\((\d+)\)\s*(.+)$/.exec(title);
  return m ? { order: parseInt(m[1], 10), title: m[2].trim() } : { order: null, title: title.trim() };
}

/**
 * Excel'in panoya yazdığı sekmeli metni ayrıştırır. Excel, içinde tırnak,
 * sekme ya da satır sonu bulunan hücreleri çift tırnağa alır ve içteki
 * tırnakları ikiler ("""The Absurd""" gibi) — bunu doğru çözmek gerekiyor.
 */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let atFieldStart = true;

  while (i < text.length) {
    const ch = text[i];
    if (atFieldStart && ch === '"') {
      // Tırnaklı hücre
      i++;
      let closed = false;
      while (i < text.length) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          i++; closed = true; break;
        }
        field += text[i++];
      }
      if (!closed) { /* kapanmamış tırnak: elde ne varsa al */ }
      atFieldStart = false;
      continue;
    }
    if (ch === '\t') { row.push(field); field = ''; atFieldStart = true; i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; atFieldStart = true; i++; continue; }
    field += ch;
    atFieldStart = false;
    i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  return rows
    .map((r) => r.map((c) => c.replace(/\s+/g, ' ').trim()))
    .filter((r) => r.some((c) => c !== ''));
}

function fromTsv(text: string): RawBook[] {
  const rows = parseTsv(text);
  if (rows.length === 0) return [];

  // Başlık satırı var mı?
  let mapping: (Field | undefined)[] = [];
  const headerHits = rows[0].map(headerField);
  let start = 0;
  if (headerHits.filter(Boolean).length >= 2 || (headerHits.includes('title') && rows[0].length === 1)) {
    mapping = headerHits;
    start = 1;
  } else {
    // Başlıksız: ilk sütun sayıysa Sıra, Yazar, Metin, Kategori; değilse Yazar, Metin, Kategori
    const firstIsNumber = /^\d+\.?$/.test(rows[0][0] || '');
    mapping = firstIsNumber ? ['order', 'author', 'title', 'category'] : ['author', 'title', 'category'];
  }

  const out: RawBook[] = [];
  for (let r = start; r < rows.length; r++) {
    const cells = rows[r];
    const book: RawBook = { order: null, author: '', title: '', category: '' };
    cells.forEach((cell, idx) => {
      const f = mapping[idx];
      if (!f) return;
      if (f === 'order') book.order = parseOrder(cell);
      else book[f] = cell;
    });
    out.push(book);
  }
  return out;
}

function fromLabeledBlocks(text: string): RawBook[] {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block) => {
    const book: RawBook = { order: null, author: '', title: '', category: '' };
    let last: Field | null = null;
    for (const rawLine of block.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      const m = /^([^:]{1,20}):\s*(.*)$/.exec(line);
      const f = m ? headerField(m[1]) : undefined;
      if (m && f) {
        if (f === 'order') book.order = parseOrder(m[2]);
        else book[f] = book[f] ? `${book[f]} ${m[2].trim()}` : m[2].trim();
        last = f;
        continue;
      }
      // Etiketsiz satır: son alanın devamı
      if (last && last !== 'order') book[last] = `${book[last]} ${line}`.trim();
    }
    return book;
  });
}

/** Yapıştırılan metni (Excel ya da etiketli bloklar) eser listesine çevirir. */
export function parseBookInput(input: string): RawBook[] {
  const text = input.replace(/\r\n?/g, '\n');
  const raw = text.includes('\t') ? fromTsv(text) : fromLabeledBlocks(text);
  return raw
    .map((b) => {
      const numbered = splitNumberedTitle(b.title);
      return {
        ...b,
        title: numbered.title,
        order: b.order ?? numbered.order,
        author: b.author.trim(),
        category: b.category.trim(),
      };
    })
    .filter((b) => b.title || b.author);
}

/** Mükerrer kontrolü için eser anahtarı (sıra + normalize başlık). */
export function bookKey(order: number | null, title: string): string {
  return `${order ?? ''}|${turkishLower(title).replace(/[\s"'`’“”.,:;!?()\[\]{}*\-–—_/]+/g, '')}`;
}
