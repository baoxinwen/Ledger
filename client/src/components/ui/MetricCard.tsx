// 指标卡：左色条 + 图标块 + 大数字（衬线）+ 环比 delta + 可选迷你趋势。
// tone 决定色条/图标/数值颜色；delta 颜色由「涨是好事还是坏事」决定语义。
import { Box, Card, CardContent, Typography, alpha, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { ArrowDropUp, ArrowDropDown, ArrowRightAlt } from '@mui/icons-material';
import type { ReactNode } from 'react';
import { FONT_SERIF, NUMERIC_TEXT } from '../../theme';
import { formatPercentChange } from '../../utils/format';

export type MetricTone = 'neutral' | 'income' | 'expense' | 'gold' | 'warning';

interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  tone?: MetricTone;
  testId?: string;
  /** 环比变化率（null = 无上期数据，显示 —） */
  delta?: number | null;
  /** 涨为好事（收入）/涨为坏事（支出）——决定 delta 颜色 */
  deltaPositiveIsGood?: boolean;
  /** delta 旁的媒体插槽（Sparkline 等） */
  media?: ReactNode;
}

const toneColor = (tone: MetricTone, theme: Theme) => {
  if (tone === 'income') return theme.palette.success.main;
  if (tone === 'expense') return theme.palette.error.main;
  if (tone === 'gold') return theme.palette.secondary.main;
  if (tone === 'warning') return theme.palette.warning.main;
  return theme.palette.text.primary;
};

function DeltaBadge({ delta, positiveIsGood }: { delta: number | null; positiveIsGood: boolean }) {
  if (delta === null) {
    return (
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        较上期 —
      </Typography>
    );
  }
  const isUp = delta > 0;
  const isFlat = Math.abs(delta) < 0.05;
  const good = isFlat ? null : isUp === positiveIsGood;
  const color = good === null ? 'text.secondary' : good ? 'success.main' : 'error.main';
  const Icon = isFlat ? ArrowRightAlt : isUp ? ArrowDropUp : ArrowDropDown;

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
      <Icon sx={{ fontSize: 16, color }} />
      <Typography
        component="span"
        variant="caption"
        sx={{ ...NUMERIC_TEXT, color, fontWeight: 600 }}
      >
        较上期 {formatPercentChange(delta)}
      </Typography>
    </Box>
  );
}

export default function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = 'neutral',
  testId,
  delta,
  deltaPositiveIsGood = true,
  media,
}: MetricCardProps) {
  const theme = useTheme<Theme>();
  const color = toneColor(tone, theme);
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card data-testid={testId} sx={{ height: '100%' }}>
      <CardContent
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          position: 'relative',
          overflow: 'hidden',
          '&:last-child': { pb: 2.5 },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: 4,
            bgcolor: color,
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, pl: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {label}
          </Typography>
          {icon && (
            <Box
              sx={{
                width: 36,
                height: 36,
                display: 'grid',
                placeItems: 'center',
                color,
                bgcolor: alpha(color, isDark ? 0.16 : 0.1),
                border: '1px solid',
                borderColor: alpha(color, isDark ? 0.28 : 0.2),
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        <Box sx={{ pl: 0.5 }}>
          <Typography
            variant="h4"
            sx={{
              fontFamily: FONT_SERIF,
              fontWeight: 700,
              lineHeight: 1.1,
              color,
              wordBreak: 'break-word',
              ...NUMERIC_TEXT,
            }}
          >
            {value}
          </Typography>
          {(delta !== undefined || media) && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 0.75 }}>
              {delta !== undefined ? <DeltaBadge delta={delta} positiveIsGood={deltaPositiveIsGood} /> : <span />}
              {media}
            </Box>
          )}
          {helper && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: delta !== undefined || media ? 0.25 : 1 }}>
              {helper}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
