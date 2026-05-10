import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function mixColors(hex1: string | undefined, hex2: string | undefined, weight: number = 0.5): string {
  const d2h = (d: number) => d.toString(16).padStart(2, '0');
  const h2d = (h: string) => parseInt(h, 16);

  if (!hex1 && !hex2) return '#18181b'; // Default zinc-900
  if (!hex1) return hex2!;
  if (!hex2) return hex1!;

  const r1 = h2d(hex1.replace('#', '').substring(0, 2));
  const g1 = h2d(hex1.replace('#', '').substring(2, 4));
  const b1 = h2d(hex1.replace('#', '').substring(4, 6));

  const r2 = h2d(hex2.replace('#', '').substring(0, 2));
  const g2 = h2d(hex2.replace('#', '').substring(2, 4));
  const b2 = h2d(hex2.replace('#', '').substring(4, 6));

  const r = Math.round(r1 * (1 - weight) + r2 * weight);
  const g = Math.round(g1 * (1 - weight) + g2 * weight);
  const b = Math.round(b1 * (1 - weight) + b2 * weight);

  return `#${d2h(r)}${d2h(g)}${d2h(b)}`;
}
