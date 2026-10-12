// lib/export-docx.ts — HTML'den gerçek bir Word (.docx) belgesi üretir.
// SADECE sunucuda kullan. Başlıklar Word'ün kendi başlık stilleriyle gelir
// (Word'de gezinti bölmesi ve otomatik içindekiler çalışır), dipnotlar
// Word'ün gerçek dipnotlarıdır, görseller belgeye gömülür, Arapça satırlar
// sağdan sola dizilir.
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, FootnoteReferenceRun,
  HeadingLevel, ImageRun, LevelFormat, LineRuleType, Packer, PageNumber, Paragraph, ShadingType, TextRun,
} from 'docx';
import { parseDocument } from 'htmlparser2';
import type { ChildNode, Element } from 'domhandler';
import sizeOf from 'image-size';

type Inline = TextRun | ExternalHyperlink | FootnoteReferenceRun | ImageRun;
type Style = { bold?: boolean; italics?: boolean; underline?: boolean; strike?: boolean; code?: boolean; sup?: boolean; link?: boolean };
type Img = { data: Buffer; type: 'png' | 'jpg' | 'gif' | 'bmp'; width: number; height: number };
type Ctx = { siteUrl: string; images: Map<string, Img>; olInstance: number; quote: boolean };

export type DocxSection =
  | { kind: 'html'; html: string }
  | { kind: 'heading'; text: string; level?: 1 | 2 | 3 }
  | { kind: 'para'; text: string; italic?: boolean; small?: boolean; muted?: boolean }
  | { kind: 'list'; items: string[]; ordered?: boolean; htmlItems?: boolean };

export type DocxInput = {
  title: string;
  subtitle?: string | null;
  kicker?: string | null; // "Kitap Tahlili · Platon" gibi üst satır
  meta?: string | null; // "Muhammet Fatih Işık · 12 Ekim 2026"
  sections: DocxSection[];
  footnotes?: string[]; // HTML
  footerText?: string;
  siteUrl: string;
};

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
function isMostlyArabic(text: string): boolean {
  const letters = text.replace(/[\s\d.,;:!?'"()\[\]\-–—«»“”‘’…]/g, '');
  if (!letters) return false;
  const ar = (text.match(ARABIC) || []).length;
  return ar / letters.length > 0.5;
}

function textOf(node: ChildNode): string {
  if (node.type === 'text') return (node as any).data || '';
  const ch = (node as Element).children || [];
  return ch.map(textOf).join('');
}

const isEl = (n: ChildNode): n is Element => n.type === 'tag' || n.type === 'script' || n.type === 'style';
const BLOCK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr', 'div', 'section', 'table', 'figure']);

function abs(href: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href;
  if (href.startsWith('/')) return siteUrl.replace(/\/$/, '') + href;
  return href;
}

function run(text: string, st: Style, rtl = false): TextRun {
  return new TextRun({
    text,
    bold: st.bold,
    italics: st.italics,
    underline: st.underline || st.link ? {} : undefined,
    strike: st.strike,
    superScript: st.sup,
    font: st.code ? 'Consolas' : undefined,
    color: st.link ? '2C5D7C' : undefined,
    rightToLeft: rtl || undefined,
  });
}

function imageRun(img: Img, maxW = 600): ImageRun {
  const scale = Math.min(1, maxW / img.width);
  return new ImageRun({
    type: img.type,
    data: img.data,
    transformation: { width: Math.round(img.width * scale), height: Math.round(img.height * scale) },
  } as any);
}

function inlines(nodes: ChildNode[], st: Style, ctx: Ctx, rtl: boolean): Inline[] {
  const out: Inline[] = [];
  for (const n of nodes) {
    if (n.type === 'text') {
      const t = ((n as any).data as string).replace(/\s+/g, ' ');
      if (t) out.push(run(t, st, rtl));
      continue;
    }
    if (!isEl(n)) continue;
    const name = n.name.toLowerCase();
    const kids = n.children || [];
    if (name === 'br') { out.push(new TextRun({ text: '', break: 1 })); continue; }
    if (name === 'img') {
      const src = n.attribs?.src || '';
      const img = ctx.images.get(src);
      if (img) out.push(imageRun(img));
      else if (src) out.push(run(`[Görsel: ${abs(src, ctx.siteUrl)}]`, { ...st, italics: true }, rtl));
      continue;
    }
    if (name === 'sup' && /\bfn-ref\b/.test(n.attribs?.class || '')) {
      const num = parseInt(textOf(n), 10);
      if (num > 0) { out.push(new FootnoteReferenceRun(num)); continue; }
    }
    if (name === 'a') {
      const href = n.attribs?.href || '';
      if (!href || href.startsWith('#')) { out.push(...inlines(kids, st, ctx, rtl)); continue; }
      const children = inlines(kids, { ...st, link: true }, ctx, rtl).filter((c) => c instanceof TextRun || c instanceof ImageRun) as (TextRun | ImageRun)[];
      if (children.length) out.push(new ExternalHyperlink({ link: abs(href, ctx.siteUrl), children }));
      continue;
    }
    const next: Style = { ...st };
    if (name === 'strong' || name === 'b') next.bold = true;
    else if (name === 'em' || name === 'i') next.italics = true;
    else if (name === 'u') next.underline = true;
    else if (name === 's' || name === 'del' || name === 'strike') next.strike = true;
    else if (name === 'code') next.code = true;
    else if (name === 'sup') next.sup = true;
    out.push(...inlines(kids, next, ctx, rtl));
  }
  return out;
}

function alignmentOf(el: Element) {
  const style = el.attribs?.style || '';
  if (/text-align:\s*center/i.test(style)) return AlignmentType.CENTER;
  if (/text-align:\s*right/i.test(style)) return AlignmentType.RIGHT;
  if (/text-align:\s*justify/i.test(style)) return AlignmentType.JUSTIFIED;
  return undefined;
}

function para(children: Inline[], text: string, ctx: Ctx, extra: Record<string, any> = {}): Paragraph {
  const rtl = isMostlyArabic(text);
  const quote = ctx.quote
    ? {
        indent: { left: 567 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'B8C4CC', space: 12 } },
      }
    : {};
  return new Paragraph({
    children,
    bidirectional: rtl || undefined,
    alignment: rtl ? AlignmentType.RIGHT : undefined,
    ...quote,
    ...extra,
  });
}

function blocks(nodes: ChildNode[], ctx: Ctx, level = 0): Paragraph[] {
  const out: Paragraph[] = [];
  let loose: ChildNode[] = [];
  const flush = () => {
    const text = loose.map(textOf).join('');
    if (text.trim() || loose.some((n) => isEl(n) && n.name === 'img')) {
      out.push(para(inlines(loose, { italics: ctx.quote || undefined }, ctx, isMostlyArabic(text)), text, ctx));
    }
    loose = [];
  };
  for (const n of nodes) {
    if (!isEl(n) || !BLOCK.has(n.name.toLowerCase())) { loose.push(n); continue; }
    flush();
    const name = n.name.toLowerCase();
    const kids = n.children || [];
    const text = textOf(n);
    const rtl = isMostlyArabic(text);
    if (name === 'p') {
      out.push(para(inlines(kids, { italics: ctx.quote || undefined }, ctx, rtl), text, ctx, alignmentOf(n) ? { alignment: alignmentOf(n) } : {}));
    } else if (/^h[1-6]$/.test(name)) {
      const lv = Math.min(3, parseInt(name[1], 10));
      const heading = lv === 1 ? HeadingLevel.HEADING_1 : lv === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      out.push(new Paragraph({ heading, children: inlines(kids, {}, ctx, rtl), bidirectional: rtl || undefined }));
    } else if (name === 'ul' || name === 'ol') {
      const instance = ++ctx.olInstance;
      for (const li of kids) {
        if (!isEl(li) || li.name.toLowerCase() !== 'li') continue;
        const inner = li.children || [];
        const inlineNodes: ChildNode[] = [];
        const nested: Element[] = [];
        for (const c of inner) {
          if (isEl(c) && (c.name === 'ul' || c.name === 'ol')) nested.push(c);
          else if (isEl(c) && c.name === 'p') {
            if (inlineNodes.length) inlineNodes.push({ type: 'tag', name: 'br', attribs: {}, children: [] } as any);
            inlineNodes.push(...(c.children || []));
          } else inlineNodes.push(c);
        }
        const t = inlineNodes.map(textOf).join('');
        const children = inlines(inlineNodes, {}, ctx, isMostlyArabic(t));
        out.push(new Paragraph({
          children,
          ...(name === 'ol'
            ? { numbering: { reference: 'zh-ol', level: Math.min(level, 2), instance } }
            : { bullet: { level: Math.min(level, 2) } }),
        }));
        for (const sub of nested) out.push(...blocks([sub], ctx, level + 1));
      }
    } else if (name === 'blockquote') {
      out.push(...blocks(kids, { ...ctx, quote: true }, level));
    } else if (name === 'pre') {
      const lines = text.replace(/\n$/, '').split('\n');
      lines.forEach((line, i) => out.push(new Paragraph({
        children: [new TextRun({ text: line || ' ', font: 'Consolas', size: 19 })],
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F4F5' },
        spacing: { after: i === lines.length - 1 ? 160 : 0, line: 260 },
      })));
    } else if (name === 'hr') {
      out.push(new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C7CED3', space: 1 } }, spacing: { after: 240 } }));
    } else {
      out.push(...blocks(kids, ctx, level));
    }
  }
  flush();
  return out;
}

async function loadImages(htmls: string[], siteUrl: string): Promise<Map<string, Img>> {
  const map = new Map<string, Img>();
  const srcs = new Set<string>();
  for (const h of htmls) for (const m of h.matchAll(/<img[^>]+src="([^"]+)"/gi)) srcs.add(m[1]);
  const list = Array.from(srcs).slice(0, 25);
  await Promise.all(list.map(async (src) => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(abs(src, siteUrl), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return;
      const data = Buffer.from(await res.arrayBuffer());
      if (data.length > 8 * 1024 * 1024) return;
      const dim = sizeOf(data);
      const t = (dim.type || '').toLowerCase();
      const type = t === 'jpeg' || t === 'jpg' ? 'jpg' : t === 'png' ? 'png' : t === 'gif' ? 'gif' : t === 'bmp' ? 'bmp' : null;
      if (!type || !dim.width || !dim.height) return; // webp/svg Word'e gömülemez → bağlantı olarak kalır
      map.set(src, { data, type, width: dim.width, height: dim.height });
    } catch { /* görsel alınamadı: bağlantı olarak kalır */ }
  }));
  return map;
}

function htmlToParagraphs(html: string, ctx: Ctx): Paragraph[] {
  const doc = parseDocument(html || '', { decodeEntities: true });
  return blocks(doc.children as ChildNode[], ctx);
}

export async function buildDocx(input: DocxInput): Promise<Buffer> {
  const htmls = input.sections.filter((s) => s.kind === 'html').map((s: any) => s.html as string);
  const images = await loadImages(htmls, input.siteUrl);
  const ctx: Ctx = { siteUrl: input.siteUrl, images, olInstance: 0, quote: false };

  const children: Paragraph[] = [];
  if (input.kicker) {
    children.push(new Paragraph({ children: [new TextRun({ text: input.kicker.toLocaleUpperCase('tr-TR'), size: 17, color: '6B7A85', characterSpacing: 40 })], spacing: { after: 120 } }));
  }
  children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(input.title)] }));
  if (input.subtitle) children.push(new Paragraph({ children: [new TextRun({ text: input.subtitle, italics: true, size: 26, color: '4A5862' })], spacing: { after: 160 } }));
  if (input.meta) children.push(new Paragraph({ children: [new TextRun({ text: input.meta, size: 19, color: '6B7A85' })], spacing: { after: 360 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D5DBDF', space: 10 } } }));

  for (const s of input.sections) {
    if (s.kind === 'html') children.push(...htmlToParagraphs(s.html, ctx));
    else if (s.kind === 'heading') {
      const heading = s.level === 3 ? HeadingLevel.HEADING_3 : s.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
      children.push(new Paragraph({ heading, children: [new TextRun(s.text)] }));
    } else if (s.kind === 'para') {
      children.push(new Paragraph({
        children: [new TextRun({ text: s.text, italics: s.italic, size: s.small ? 18 : undefined, color: s.muted ? '6B7A85' : undefined, rightToLeft: isMostlyArabic(s.text) || undefined })],
        bidirectional: isMostlyArabic(s.text) || undefined,
      }));
    } else if (s.kind === 'list') {
      const instance = ++ctx.olInstance;
      for (const item of s.items) {
        const runs = s.htmlItems ? inlines(parseDocument(item).children as ChildNode[], {}, ctx, false) : [new TextRun(item)];
        children.push(new Paragraph({
          children: runs,
          ...(s.ordered ? { numbering: { reference: 'zh-ol', level: 0, instance } } : { bullet: { level: 0 } }),
        }));
      }
    }
  }

  const footnotes: Record<number, { children: Paragraph[] }> = {};
  (input.footnotes || []).forEach((html, i) => {
    const nodes = parseDocument(html, { decodeEntities: true }).children as ChildNode[];
    footnotes[i + 1] = { children: [new Paragraph({ children: inlines(nodes, {}, ctx, false) })] };
  });

  const doc = new Document({
    creator: 'Muhammet Fatih Işık',
    title: input.title,
    description: 'Zihin Haritası',
    styles: {
      default: {
        document: { run: { font: 'Georgia', size: 22, color: '222B31' }, paragraph: { spacing: { line: 336, lineRule: LineRuleType.AUTO, after: 160 } } },
        title: { run: { font: 'Georgia', size: 46, color: '17232B' }, paragraph: { spacing: { after: 140, line: 288, lineRule: LineRuleType.AUTO } } },
        heading1: { run: { font: 'Georgia', size: 34, color: '17232B' }, paragraph: { spacing: { before: 420, after: 160, line: 300, lineRule: LineRuleType.AUTO } } },
        heading2: { run: { font: 'Georgia', size: 29, color: '17232B' }, paragraph: { spacing: { before: 360, after: 140, line: 300, lineRule: LineRuleType.AUTO } } },
        heading3: { run: { font: 'Georgia', size: 24, bold: true, color: '2B3A44' }, paragraph: { spacing: { before: 280, after: 120, line: 300, lineRule: LineRuleType.AUTO } } },
        hyperlink: { run: { color: '2C5D7C', underline: {} } },
      } as any,
    },
    numbering: {
      config: [{
        reference: 'zh-ol',
        levels: [0, 1, 2].map((lv) => ({
          level: lv,
          format: lv === 1 ? LevelFormat.LOWER_LETTER : LevelFormat.DECIMAL,
          text: `%${lv + 1}.`,
          alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 567 * (lv + 1), hanging: 340 } } },
        })),
      }],
    },
    footnotes,
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1361, right: 1361 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: input.footerText ? `${input.footerText}  ·  ` : '', size: 16, color: '8A969E' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '8A969E' }),
            ],
          })],
        }),
      },
      children,
    }],
  });
  return Packer.toBuffer(doc);
}
