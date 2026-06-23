import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        px: 2,
        py: { xs: 4, md: 5 },
        textAlign: 'center',
      }}
    >
      {icon && (
        <Box sx={{ color: 'text.secondary', mb: 1.5, display: 'inline-flex' }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" sx={{ color: 'text.primary', mb: description ? 0.75 : 0 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: action ? 2.5 : 0 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}
