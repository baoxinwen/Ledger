import { Box, Card, CardContent, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  contentSx?: SxProps<Theme>;
  cardSx?: SxProps<Theme>;
  testId?: string;
}

export default function SectionCard({ title, subtitle, action, children, contentSx, cardSx, testId }: SectionCardProps) {
  const hasHeader = title || subtitle || action;

  return (
    <Card data-testid={testId} sx={{ height: '100%', ...cardSx }}>
      <CardContent sx={{ height: '100%', ...contentSx }}>
        {hasHeader && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              {title && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
          </Box>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
