// 行内悬浮操作容器：默认隐藏，宿主元素（加 className="hover-actions-host"）
// hover / focus-within 时显现。显隐规则定义在 theme 的全局 CssBaseline 中
// （CSS 无法在子元素上根据祖先状态选择自身，必须在祖先层级写选择器）。
// 触屏设备（hover: none）始终可见，避免移动端无法操作。
import { Box } from '@mui/material';
import type { ReactNode } from 'react';

interface HoverActionsProps {
  children: ReactNode;
}

export default function HoverActions({ children }: HoverActionsProps) {
  return (
    <Box className="hover-actions" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {children}
    </Box>
  );
}
