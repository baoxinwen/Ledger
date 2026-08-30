// 日期分组头：最近记录/交易列表按日分组时的分隔行（今天 / 昨天 / 8月28日）。
import { Box, Typography } from '@mui/material';
import { formatWan } from '../../utils/format';

interface DayHeaderProps {
  label: string;
  /** 可选：当日合计（支出为负数时自动带色） */
  expenseTotal?: number;
  incomeTotal?: number;
}

export default function DayHeader({ label, expenseTotal, incomeTotal }: DayHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 2,
        px: 0.5,
        pt: 1.5,
        pb: 0.75,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}
      >
        {label}
      </Typography>
      {(expenseTotal !== undefined || incomeTotal !== undefined) && (
        <Box sx={{ display: 'flex', gap: 1.5, typography: 'caption', fontVariantNumeric: 'tabular-nums' }}>
          {incomeTotal !== undefined && incomeTotal > 0 && (
            <Box component="span" sx={{ color: 'success.main' }}>+{formatWan(incomeTotal)}</Box>
          )}
          {expenseTotal !== undefined && expenseTotal > 0 && (
            <Box component="span" sx={{ color: 'text.secondary' }}>-{formatWan(expenseTotal)}</Box>
          )}
        </Box>
      )}
    </Box>
  );
}
