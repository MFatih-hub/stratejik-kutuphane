// lib/theme.ts — görünüm: Otomatik (gün batımından sonra koyu), Sis, Gece Denizi, Metalik Deniz.

export type ThemeMode = 'auto' | 'light' | 'dark' | 'blue';

export const THEME_NAMES: Record<ThemeMode, string> = {
  auto: 'Otomatik',
  light: 'Sis',
  dark: 'Gece Denizi',
  blue: 'Metalik Deniz',
};

export const NEXT_THEME: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'blue', blue: 'auto' };

// İstanbul için ayın ortasında yaklaşık gün doğumu / batımı (gece yarısından dakika)
const SUN: [number, number][] = [
  [505, 1025], [480, 1065], [435, 1100], [390, 1185], [355, 1220], [330, 1240],
  [340, 1235], [370, 1205], [400, 1155], [435, 1110], [470, 1020], [500, 1005],
];

export function resolveTheme(mode: ThemeMode, d = new Date()): 'light' | 'dark' | 'blue' {
  if (mode !== 'auto') return mode;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', month: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(d);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
    const mins = get('hour') * 60 + get('minute');
    const [rise, set] = SUN[get('month') - 1];
    return mins < rise || mins >= set ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Sayfa boyanmadan önce <head> içinde çalışır: tema yanıp sönmesin. */
export const THEME_SCRIPT = `(function(){var m='auto';try{m=localStorage.getItem('theme')||'auto'}catch(e){}if(!/^(light|dark|blue)$/.test(m)){m='light';try{var S=${JSON.stringify(SUN)},p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',month:'numeric',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(new Date()),g=function(t){for(var i=0;i<p.length;i++)if(p[i].type===t)return +p[i].value;return 0},n=g('hour')*60+g('minute'),s=S[g('month')-1];if(n<s[0]||n>=s[1])m='dark'}catch(e){}}document.documentElement.setAttribute('data-theme',m)})();`;
