// 状态徽章：正常 / 接近上限 / 超支 三级阶梯色。
// 替代预算页「超支 chip + 超支预警」双红色元素的重复表达。
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { budgetHealth } from '../../utils/budgetHealth';

interface StatusChipProps {
  ratio: number;
  /** 超支时显示的超支额文案；正常/警戒时显示剩余额文案 */
  label: string;
  size?: 'small' | 'medium';
}

export default function StatusChip({ ratio, label, size = 'small' }: StatusChipProps) {
  const theme = useTheme();
  const health = budgetHealth(ratio);

  const color = health === 'over'
    ? theme.palette.error.main
    : health === 'caution'
      ? theme.palette.warning.main
      : theme.palette.success.main;

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        height: size === 'small' ? 22 : 26,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        fontWeight: 600,
        color,
        bgcolor: `${color}1f`,
        border: `1px solid ${color}55`,
        borderRadius: 1,
      }}
    />
  );
}
