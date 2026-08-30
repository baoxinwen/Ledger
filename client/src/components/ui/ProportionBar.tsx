// 比例条：预算/占比共用。
// ratio 可大于 1（超支）：填充封顶 100%，超支时整条变超支深红；
// >=80% 进入琥珀警示，正常态用墨色。配合旁边的大百分比数字表达超额幅度。
import { Box, useTheme } from '@mui/material';
import { getTokens } from '../../theme';
import { budgetHealth } from '../../utils/budgetHealth';

interface ProportionBarProps {
  /** 已用比例，可 >1（超支） */
  ratio: number;
  height?: number;
}

export default function ProportionBar({ ratio, height = 8 }: ProportionBarProps) {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode);
  const health = budgetHealth(ratio);

  const color = health === 'over'
    ? tokens.overBudget
    : health === 'caution'
      ? tokens.warning
      : tokens.ink;

  const clamped = Math.min(Math.max(ratio, 0), 1);

  return (
    <Box
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      sx={{
        position: 'relative',
        width: '100%',
        height,
        bgcolor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          width: `${clamped * 100}%`,
          bgcolor: color,
          transition: `width 300ms cubic-bezier(0.23, 1, 0.32, 1)`,
        }}
      />
    </Box>
  );
}
