// 页头：compact 模式为单行布局（eyebrow+标题同排、描述跟在右侧、action 靠右），
// 为内容让出首屏；完整模式保留大标题排版（登录后低频页面可用）。
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { FONT_SERIF } from '../../theme';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
  /** 紧凑单行模式（默认 true——重构后所有业务页都用紧凑页头） */
  compact?: boolean;
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
  meta,
  compact = true,
}: PageHeaderProps) {
  if (compact) {
    return (
      <Box
        sx={{
          mb: { xs: 2.5, md: 3 },
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          columnGap: 1.5,
          rowGap: 1,
        }}
      >
        {eyebrow && (
          <Typography
            variant="caption"
            sx={{ color: 'secondary.main', letterSpacing: '0.08em' }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography
          component="h1"
          variant="h4"
          sx={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.15 }}
        >
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mr: 'auto' }}>
            {description}
          </Typography>
        )}
        {meta && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mr: 'auto' }}>
            {meta}
          </Typography>
        )}
        {action && <Box sx={{ ml: 'auto', alignSelf: 'center' }}>{action}</Box>}
      </Box>
    );
  }

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
            fontFamily: FONT_SERIF,
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
