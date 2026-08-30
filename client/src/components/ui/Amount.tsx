// 金额组件：全站金额渲染唯一出口。
// 统一等宽数字、收支语义色、正负号与紧凑格式，替代各组件手写的 formatAmount + 颜色逻辑。
import { Typography, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { formatAmount, formatCompactAmount } from '../../utils/format';
import { FONT_SANS, NUMERIC_TEXT } from '../../theme';

export type AmountTone = 'income' | 'expense' | 'neutral';

interface AmountProps {
  value: number;
  /** 语义类型，决定颜色与符号（expense 默认带 - 号） */
  tone?: AmountTone;
  /** 是否着语义色；false 时用正文色 */
  colorize?: boolean;
  /** 无小数位（KPI 卡、紧凑列表用） */
  compact?: boolean;
  variant?: 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'subtitle1';
  sx?: SxProps<Theme>;
}

export default function Amount({
  value,
  tone = 'neutral',
  colorize = true,
  compact = false,
  variant = 'body1',
  sx,
}: AmountProps) {
  const theme = useTheme<Theme>();
  const text = compact ? formatCompactAmount(value) : formatAmount(value);
  // expense 显式带负号；income 的 + 号只在 colorize（列表语义）时出现，KPI 大数字不加。
  const signedText = tone === 'expense' ? (value > 0 ? `-${text}` : text) : text;
  const color = colorize && tone === 'income'
    ? theme.palette.success.main
    : colorize && tone === 'expense'
      ? theme.palette.error.main
      : 'text.primary';

  return (
    <Typography
      variant={variant}
      component="span"
      sx={{ fontFamily: FONT_SANS, ...NUMERIC_TEXT, color, ...sx }}
    >
      {signedText}
    </Typography>
  );
}
