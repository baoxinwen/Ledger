import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, action, meta }: PageHeaderProps) {
  return (
    <Box
      sx={{
        mb: { xs: 3, md: 4 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: action ? 'minmax(0, 1fr) auto' : '1fr' },
        alignItems: 'end',
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography variant="caption" sx={{ color: 'secondary.main', mb: 1, display: 'block' }}>
            {eyebrow}
          </Typography>
        )}
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '2.5rem' },
            lineHeight: 1.08,
            mb: description ? 1 : 0,
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 560 }}>
            {description}
          </Typography>
        )}
        {meta && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
            {meta}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ justifySelf: { xs: 'stretch', sm: 'end' } }}>{action}</Box>}
    </Box>
  );
}
