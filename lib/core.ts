// lib/core.ts — Çekirdek yol: okuma listesinden önce okunacak eserler (★).
// data/cekirdek.json okuma listesindeki sıra numaralarını tutar; her duraktan
// yaklaşık beşte biri seçildi. Liste uzadıkça ya da değişince burası güncellenir.
import data from '@/data/cekirdek.json';

const CORE = new Set<number>(data as number[]);

export const CORE_TOTAL = CORE.size;

export function isCore(order: number | null | undefined): boolean {
  return order != null && CORE.has(order);
}
