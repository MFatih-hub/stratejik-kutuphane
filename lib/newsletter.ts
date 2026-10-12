// lib/newsletter.ts — abonelik e-postaları (sade, sitenin sakin diliyle). SADECE sunucuda.
import { getPostUrl, stripHtml } from './helpers';
import { absolutizeLinks, renderPost } from './render-post';
import { SITE_URL, AUTHOR_NAME, postKicker } from './export';

const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shell(inner: string, footer: string) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#eef1f3;padding:28px 12px;font-family:Georgia,'Times New Roman',serif;color:#222b31">
<div style="max-width:620px;margin:0 auto;background:#fbfcfc;border:1px solid #dde3e6;border-radius:10px;padding:34px 34px 26px">
<p style="margin:0 0 26px;font-family:-apple-system,Segoe UI,sans-serif;font-size:13px;letter-spacing:.06em;color:#6b7a85">ZİHİN HARİTASI</p>
${inner}
<hr style="border:none;border-top:1px solid #dde3e6;margin:30px 0 14px">
<p style="margin:0;font-family:-apple-system,Segoe UI,sans-serif;font-size:12px;line-height:1.6;color:#8a969e">${footer}</p>
</div></body></html>`;
}

export function confirmEmail(token: string) {
  const link = `${SITE_URL}/api/abone/onay?t=${token}`;
  return {
    subject: 'Aboneliğini onayla — Zihin Haritası',
    html: shell(
      `<h1 style="font-weight:500;font-size:24px;margin:0 0 14px">Bir adım kaldı</h1>
<p style="font-size:16px;line-height:1.7">Zihin Haritası'na abone olmak için bu e-posta adresi girildi. Onaylarsan yeni yazılar ve kitap tahlilleri yayımlandığında sana e-postayla gelir.</p>
<p style="margin:26px 0"><a href="${link}" style="background:#2c5d7c;color:#fff;text-decoration:none;padding:11px 20px;border-radius:7px;font-family:-apple-system,Segoe UI,sans-serif;font-size:15px">Aboneliği onayla</a></p>
<p style="font-size:14px;line-height:1.6;color:#6b7a85">Bunu sen istemediysen hiçbir şey yapmana gerek yok; onaylanmayan adreslere e-posta gönderilmez.</p>`,
      `${AUTHOR_NAME} · <a href="${SITE_URL}" style="color:#8a969e">zihinharitasi.org</a>`
    ),
    text: `Zihin Haritası aboneliğini onaylamak için: ${link}\n\nBunu sen istemediysen bu e-postayı yok sayabilirsin.`,
  };
}

/** Bir yazının e-posta hâli. {{UNSUB}} her alıcı için ayrılma bağlantısıyla değiştirilir. */
export function postEmail(post: any) {
  const url = `${SITE_URL}${getPostUrl(post)}`;
  const r = renderPost(post, { wiki: true, hashtags: false });
  let body = absolutizeLinks(r.html, SITE_URL)
    .replace(/<a href=/g, '<a style="color:#2c5d7c" href=')
    .replace(/<p>/g, '<p style="font-size:17px;line-height:1.75;margin:0 0 18px">')
    .replace(/<blockquote>/g, '<blockquote style="margin:0 0 18px;padding:2px 0 2px 16px;border-left:2px solid #b8c4cc;color:#4a5862;font-style:italic">')
    .replace(/<h([1-3])([^>]*)>/g, '<h$1$2 style="font-weight:500;font-size:21px;margin:30px 0 12px">')
    .replace(/<img /g, '<img style="max-width:100%;height:auto;border-radius:6px" ')
    .replace(/<a href="#fn-\d+"[^>]*>(\d+)<\/a>/g, '$1');
  if (r.footnotes.length) {
    body += `<div style="margin-top:26px;font-size:14px;line-height:1.6;color:#4a5862"><p style="font-size:13px;letter-spacing:.05em;color:#6b7a85;margin:0 0 6px">DİPNOTLAR</p><ol style="padding-left:20px;margin:0">${r.footnotes.map((f) => `<li style="margin-bottom:4px">${absolutizeLinks(f, SITE_URL)}</li>`).join('')}</ol></div>`;
  }
  const kicker = postKicker(post);
  const html = shell(
    `<p style="margin:0 0 8px;font-family:-apple-system,Segoe UI,sans-serif;font-size:12px;letter-spacing:.08em;color:#6b7a85;text-transform:uppercase">${esc(kicker)}</p>
<h1 style="font-weight:500;font-size:28px;line-height:1.25;margin:0 0 10px"><a href="${url}" style="color:#17232b;text-decoration:none">${esc(post.title)}</a></h1>
${post.subtitle ? `<p style="font-size:18px;font-style:italic;color:#4a5862;margin:0 0 24px">${esc(post.subtitle)}</p>` : '<div style="height:12px"></div>'}
${body}
<p style="margin:26px 0 0"><a href="${url}" style="color:#2c5d7c;font-family:-apple-system,Segoe UI,sans-serif;font-size:14px">Sitede oku →</a></p>`,
    `Bu e-postayı Zihin Haritası'na abone olduğun için aldın. <a href="{{UNSUB}}" style="color:#8a969e">Abonelikten ayrıl</a>`
  );
  const text = `${post.title}\n\n${stripHtml(r.html).slice(0, 1200)}…\n\nDevamı: ${url}\n\nAbonelikten ayrılmak için: {{UNSUB}}`;
  return { subject: post.title, html, text, url };
}
