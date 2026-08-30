// 分类图标块：emoji + 分类色底。兜底色/白字逻辑收拢在这里，
// 替代 TransactionList、StatsCharts、RecentTransactions 各自的手写实现。
import { Box, useTheme } from '@mui/material';
import type { Category } from '../../types';
import { FONT_SANS, fallbackCategoryColor, getTokens } from '../../theme';

interface CategoryAvatarProps {
  category: Pick<Category, 'icon' | 'color' | 'type'> | null | undefined;
  /** 块尺寸，默认 40（列表）/ 32（表格行） */
  size?: number;
  iconSize?: number;
}

export default function CategoryAvatar({ category, size = 40, iconSize }: CategoryAvatarProps) {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);

  const type = category?.type ?? 'expense';
  const bgColor = category?.color || fallbackCategoryColor(tokens, type);
  const icon = category?.icon || (type === 'income' ? '💰' : '📦');

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: bgColor,
        borderRadius: 1,
        fontSize: iconSize ?? Math.round(size * 0.5),
        lineHeight: 1,
        fontFamily: FONT_SANS,
        userSelect: 'none',
      }}
    >
      {icon}
    </Box>
  );
}
