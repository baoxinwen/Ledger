// 分类颜色工具（前端兜底显示）：纯色逻辑统一复用服务端 utils/categoryColor.ts，
// 避免前后端两份调色板/取色逻辑漂移。这里只保留前端特有的展示聚合逻辑。
import { normalizeHexColor, isLegacyDefaultCategoryColor, pickCategoryColor } from '../../../server/src/utils/categoryColor';
import type { Category } from '../types';

interface ColorItem {
  name: string;
  color?: string | null;
}

// 图表用色：优先保留存储色，否则按“chart”作用域稳定取色并保证同图不重复。
export function resolveCategoryDisplayColors<T extends ColorItem>(items: T[]): Array<T & { color: string }> {
  const usedColors = new Set<string>();

  return items.map((item) => {
    const storedColor = normalizeHexColor(item.color);
    if (storedColor && !isLegacyDefaultCategoryColor(storedColor) && !usedColors.has(storedColor)) {
      usedColors.add(storedColor);
      return { ...item, color: storedColor };
    }

    const color = pickCategoryColor('chart', item.name, usedColors);
    usedColors.add(color);
    return { ...item, color };
  });
}

// 新建分类表单的默认色：按“income/expense”作用域稳定取色，避开已用色。
export function suggestCategoryFormColor(type: 'income' | 'expense', name: string, categories: Category[]): string {
  const usedColors = categories
    .filter((category) => category.type === type)
    .reduce((colors, category) => {
      const color = normalizeHexColor(category.color);
      if (color && !isLegacyDefaultCategoryColor(color)) colors.add(color);
      return colors;
    }, new Set<string>());

  return pickCategoryColor(type, name || '新分类', usedColors);
}
