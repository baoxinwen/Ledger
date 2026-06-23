// 分类颜色工具：前端负责兜底显示，保证统计图里每个分类都有稳定且不重复的颜色。
import type { Category } from '../types';

type ColorScope = 'income' | 'expense' | 'chart';

interface ColorItem {
  name: string;
  color?: string | null;
}

export const EDITORIAL_CATEGORY_PALETTE = [
  '#5F6F52',
  '#4F6F6B',
  '#5C6478',
  '#8A5A61',
  '#9A7B4F',
  '#6D597A',
  '#6B7A8F',
  '#7C6F55',
  '#4F5D75',
  '#7A8450',
  '#8B6F71',
  '#5D737E',
  '#A06A4B',
  '#6D8A74',
  '#8B7D63',
  '#536271',
  '#7F5F72',
  '#466A66',
  '#9A8A4E',
  '#6E6658',
  '#59656F',
  '#8A6F47',
  '#6F7D64',
  '#766A8A',
];

const OLD_AUTO_COLORS = new Set([
  '#BDC3C7',
  '#2ECC71',
  '#1976D2',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#95A5A6',
  '#27AE60',
  '#16A085',
  '#1ABC9C',
  '#D94F45',
  '#2A9D8F',
  '#457B9D',
  '#E9A227',
  '#8E5CF7',
  '#D45087',
  '#3A86FF',
  '#6A994E',
  '#F77F00',
  '#9B5DE5',
  '#00A6A6',
  '#C44536',
  '#4D908E',
  '#577590',
  '#BC6C25',
  '#6D597A',
  '#118AB2',
  '#A7C957',
  '#EF476F',
  '#4361EE',
  '#7209B7',
  '#F9844A',
  '#43AA8B',
  '#F9C74F',
]);

export function normalizeHexColor(color: string | null | undefined): string | undefined {
  const value = String(color ?? '').trim();
  const shortHex = value.match(/^#?([0-9a-fA-F]{3})$/);
  if (shortHex) {
    return `#${shortHex[1].split('').map((char) => char + char).join('').toUpperCase()}`;
  }

  const longHex = value.match(/^#?([0-9a-fA-F]{6})$/);
  return longHex ? `#${longHex[1].toUpperCase()}` : undefined;
}

export function resolveCategoryDisplayColors<T extends ColorItem>(items: T[]): Array<T & { color: string }> {
  const usedColors = new Set<string>();

  return items.map((item) => {
    const storedColor = normalizeHexColor(item.color);
    if (storedColor && !OLD_AUTO_COLORS.has(storedColor) && !usedColors.has(storedColor)) {
      usedColors.add(storedColor);
      return { ...item, color: storedColor };
    }

    const color = pickCategoryColor('chart', item.name, usedColors);
    usedColors.add(color);
    return { ...item, color };
  });
}

export function suggestCategoryFormColor(type: 'income' | 'expense', name: string, categories: Category[]): string {
  const usedColors = categories
    .filter((category) => category.type === type)
    .reduce((colors, category) => {
      const color = normalizeHexColor(category.color);
      if (color && !OLD_AUTO_COLORS.has(color)) colors.add(color);
      return colors;
    }, new Set<string>());

  return pickCategoryColor(type, name || '新分类', usedColors);
}

function pickCategoryColor(scope: ColorScope, name: string, usedColors: Set<string>): string {
  const seed = hashString(`${scope}:${name || '未命名分类'}`);
  for (let offset = 0; offset < EDITORIAL_CATEGORY_PALETTE.length; offset++) {
    const color = EDITORIAL_CATEGORY_PALETTE[(seed + offset) % EDITORIAL_CATEGORY_PALETTE.length];
    if (!usedColors.has(color)) return color;
  }

  for (let attempt = 0; attempt < 720; attempt++) {
    const hue = (seed * 137 + attempt * 47) % 360;
    const saturation = 28 + ((seed + attempt) % 16);
    const lightness = 38 + ((seed + attempt * 3) % 12);
    const color = hslToHex(hue, saturation, lightness);
    if (!usedColors.has(color)) return color;
  }

  return hslToHex(seed % 360, 62, 48);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][Math.floor(segment) % 6];
  const m = l - chroma / 2;
  return `#${match.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
