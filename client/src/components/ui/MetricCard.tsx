import { Box, Card, CardContent, Typography, alpha, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

type MetricTone = 'neutral' | 'income' | 'expense' | 'gold' | 'warning';

interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  tone?: MetricTone;
  testId?: string;
}

const toneColor = (tone: MetricTone, theme: Theme) => {
  if (tone === 'income') return theme.palette.success.main;
  if (tone === 'expense') return theme.palette.error.main;
  if (tone === 'gold') return theme.palette.secondary.main;
  if (tone === 'warning') return theme.palette.warning.main;
  return theme.palette.text.primary;
};

export default function MetricCard({ label, value, helper, icon, tone = 'neutral', testId }: MetricCardProps) {
  const theme = useTheme<Theme>();
  const color = toneColor(tone, theme);

  return (
    <Card data-testid={testId} sx={{ height: '100%' }}>
      <CardContent
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          position: 'relative',
          overflow: 'hidden',
          '&:last-child': { pb: 3 },
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
                width: 38,
                height: 38,
                display: 'grid',
                placeItems: 'center',
                color,
                bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.16 : 0.1),
                border: '1px solid',
                borderColor: alpha(color, theme.palette.mode === 'dark' ? 0.28 : 0.2),
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
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 700,
              lineHeight: 1.1,
              color,
              wordBreak: 'break-word',
            }}
          >
            {value}
          </Typography>
          {helper && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              {helper}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
