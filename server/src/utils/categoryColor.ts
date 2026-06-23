// 分类颜色工具：统一生成稳定、可区分的分类颜色，避免导入分类全部落到同一个默认色。
export type CategoryColorType = 'income' | 'expense';

export interface CategoryColorInput {
  id?: number;
  name: string;
  type: CategoryColorType;
  color?: string | null;
  is_preset?: number | boolean | null;
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

const PRESET_CATEGORY_COLORS = new Map<string, string>([
  ['expense:餐饮', '#8A5A61'],
  ['expense:交通', '#5D737E'],
  ['expense:购物', '#6B7A8F'],
  ['expense:娱乐', '#6D597A'],
  ['expense:居住', '#9A7B4F'],
  ['expense:医疗', '#7F5F72'],
  ['expense:教育', '#4F5D75'],
  ['expense:通讯', '#4F6F6B'],
  ['expense:其他', '#6E6658'],
  ['income:工资', '#5F6F52'],
  ['income:奖金', '#7A8450'],
  ['income:投资', '#466A66'],
  ['income:兼职', '#536271'],
  ['income:其他', '#6E6658'],
]);

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

export function isLegacyDefaultCategoryColor(color: string | null | undefined): boolean {
  const normalized = normalizeHexColor(color);
  return normalized ? OLD_AUTO_COLORS.has(normalized) : false;
}

export function pickCategoryColor(type: CategoryColorType, name: string, usedColors: Set<string>): string {
  const seed = hashString(`${type}:${name || '未命名分类'}`);
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

export function suggestCategoryColor(
  type: CategoryColorType,
  name: string,
  existingCategories: CategoryColorInput[]
): string {
  const usedColors = collectUsableColors(existingCategories.filter((category) => category.type === type));
  return pickCategoryColor(type, name, usedColors);
}

export function repairCategoryColors(categories: CategoryColorInput[]): Map<number, string> {
  const updates = new Map<number, string>();
  const usedByType = new Map<CategoryColorType, Set<string>>([
    ['income', new Set<string>()],
    ['expense', new Set<string>()],
  ]);

  categories.forEach((category) => {
    const presetColor = getPresetCategoryColor(category);
    const color = presetColor || normalizeHexColor(category.color);
    const usedColors = usedByType.get(category.type)!;
    if (presetColor) {
      usedColors.add(presetColor);
      return;
    }
    if (color && !shouldRepairStoredColor(category)) usedColors.add(color);
  });

  categories.forEach((category) => {
    if (!category.id) return;

    const presetColor = getPresetCategoryColor(category);
    if (presetColor) {
      if (normalizeHexColor(category.color) !== presetColor) {
        updates.set(category.id, presetColor);
      }
      return;
    }

    if (!shouldRepairStoredColor(category)) return;

    const usedColors = usedByType.get(category.type)!;
    const color = pickCategoryColor(category.type, category.name, usedColors);
    usedColors.add(color);
    updates.set(category.id, color);
  });

  return updates;
}

export function shouldRepairStoredColor(category: CategoryColorInput): boolean {
  if (Boolean(category.is_preset)) return Boolean(getPresetCategoryColor(category));
  const color = normalizeHexColor(category.color);
  return !color || isLegacyDefaultCategoryColor(color);
}

function collectUsableColors(categories: CategoryColorInput[]): Set<string> {
  return categories.reduce((colors, category) => {
    const color = normalizeHexColor(category.color);
    if (color && !isLegacyDefaultCategoryColor(color)) colors.add(color);
    return colors;
  }, new Set<string>());
}

function getPresetCategoryColor(category: CategoryColorInput): string | undefined {
  if (!Boolean(category.is_preset)) return undefined;
  return PRESET_CATEGORY_COLORS.get(`${category.type}:${category.name}`);
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
