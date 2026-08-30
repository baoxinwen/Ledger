// 收/支类型徽章：让表格行不再只靠金额颜色区分收支（色弱可读）。
import { Box } from '@mui/material';
import { SouthWest, NorthEast } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface TypeBadgeProps {
  type: 'income' | 'expense';
}

const LABELS = { income: '收', expense: '支' } as const;

export default function TypeBadge({ type }: TypeBadgeProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const color = type === 'income' ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        height: 20,
        px: 0.75,
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color,
        bgcolor: type === 'income'
          ? (isDark ? 'rgba(82, 183, 136, 0.14)' : 'rgba(45, 106, 79, 0.10)')
          : (isDark ? 'rgba(229, 56, 59, 0.14)' : 'rgba(155, 34, 38, 0.08)'),
        border: '1px solid',
        borderColor: `${color}40`,
        whiteSpace: 'nowrap',
      }}
    >
      {type === 'income' ? (
        <SouthWest sx={{ fontSize: 12 }} />
      ) : (
        <NorthEast sx={{ fontSize: 12 }} />
      )}
      {LABELS[type]}
    </Box>
  );
}
