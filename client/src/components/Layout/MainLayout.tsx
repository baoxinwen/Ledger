// 主布局：桌面端固定侧边栏（Logo + 导航 + 主题/账户），移动端顶部精简条 + 底部导航 + 记账 FAB。
// 退出登录收进头像菜单；grain 纹理保留为全站底纹。
import { useState } from 'react';
import {
  Box,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Typography,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  Home,
  Receipt,
  BarChart,
  AccountBalanceWallet,
  Settings,
  Logout,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { useAuthStore } from '../../stores/authStore';
import { useSnackbarStore } from '../../stores/snackbarStore';
import { useQuickAddStore } from '../../stores/quickAddStore';
import { SIDEBAR_WIDTH, MOBILE_BOTTOM_NAV_HEIGHT } from '../../theme';

const navItems = [
  { text: '首页', icon: <Home />, path: '/' },
  { text: '记账', icon: <Receipt />, path: '/transactions' },
  { text: '统计', icon: <BarChart />, path: '/statistics' },
  { text: '预算', icon: <AccountBalanceWallet />, path: '/budgets' },
  { text: '设置', icon: <Settings />, path: '/settings' },
];

interface MainLayoutProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

export default function MainLayout({ children, isDarkMode, onThemeToggle }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const openQuickAdd = useQuickAddStore((state) => state.openQuickAdd);

  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // 前缀匹配：/transactions/ 这类带尾斜杠或嵌套路径也应高亮对应项；首页只在精确命中时高亮。
  const currentPath = navItems.findIndex((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    try {
      await logout();
      navigate('/');
    } catch {
      showSnackbar('退出登录失败，请检查网络', 'error');
    }
  };

  const themeToggle = (
    <Tooltip title={isDarkMode ? '切换为浅色模式' : '切换为深色模式'}>
      <IconButton
        aria-label="切换主题"
        onClick={onThemeToggle}
        size="small"
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 1,
        }}
      >
        {isDarkMode ? (
          <Brightness7 sx={{ fontSize: 18, color: 'secondary.main' }} />
        ) : (
          <Brightness4 sx={{ fontSize: 18 }} />
        )}
      </IconButton>
    </Tooltip>
  );

  const navList = (
    <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1.5 }}>
      {navItems.map((item) => {
        const selected = navItems[currentPath]?.path === item.path;
        return (
          <ListItemButton
            key={item.path}
            selected={selected}
            onClick={() => handleNavClick(item.path)}
            sx={{
              borderRadius: 1,
              minHeight: 44,
              px: 2,
              position: 'relative',
              '&.Mui-selected': {
                bgcolor: 'secondary.main',
                color: isDarkMode ? 'rgba(10, 10, 15, 0.92)' : 'rgba(10, 10, 15, 0.92)',
                '&:hover': { bgcolor: 'secondary.light' },
                '& .MuiListItemIcon-root': { color: 'inherit' },
                // 激活态金色左条
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  bgcolor: 'secondary.dark',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: selected ? 'inherit' : 'text.secondary' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{ fontWeight: selected ? 700 : 500, fontSize: '0.875rem' }}
            />
          </ListItemButton>
        );
      })}
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        position: 'relative',
        // 全站 grain 纹理底
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: isDarkMode ? 0.03 : 0.02,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 1,
        },
      }}
    >
      {/* ── 桌面侧边栏 ── */}
      {!isMobile && (
        <Box
          component="aside"
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: SIDEBAR_WIDTH,
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            zIndex: theme.zIndex.appBar,
          }}
        >
          <Box
            sx={{ px: 3, py: 3, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <Logo isDarkMode={isDarkMode} />
          </Box>

          {navList}

          <Box sx={{ flex: 1 }} />

          <Box
            sx={{
              px: 2,
              py: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Tooltip title="账户">
              <IconButton
                aria-label="账户菜单"
                onClick={(event) => setUserMenuAnchor(event.currentTarget)}
                sx={{ p: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'secondary.main',
                    color: '#0a0a0f',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    fontFamily: '"Playfair Display", Georgia, serif',
                  }}
                >
                  {(user?.username || '用')[0].toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.username}
            </Typography>
            {themeToggle}
          </Box>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <MenuItem onClick={handleLogout} sx={{ minWidth: 140 }}>
              <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
              退出登录
            </MenuItem>
          </Menu>
        </Box>
      )}

      {/* ── 移动端顶栏（只留 Logo + 主题） ── */}
      {isMobile && (
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: theme.zIndex.appBar,
            bgcolor: 'overlayBar',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.25,
          }}
        >
          <Box sx={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <Logo compact isDarkMode={isDarkMode} />
          </Box>
          {themeToggle}
        </Box>
      )}

      {/* ── 主内容 ── */}
      <Box
        component="main"
        sx={{
          position: 'relative',
          zIndex: 2,
          ml: { md: `${SIDEBAR_WIDTH}px` },
          maxWidth: 1440,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 2.5, md: 3.5 },
          pb: { xs: `${MOBILE_BOTTOM_NAV_HEIGHT + 76}px`, md: 5 },
          width: { md: 'calc(100% - ' + SIDEBAR_WIDTH + 'px)' },
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>

      {/* ── 移动端底部导航 ── */}
      {isMobile && (
        <Box
          component="nav"
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: theme.zIndex.appBar,
            display: 'flex',
            height: MOBILE_BOTTOM_NAV_HEIGHT,
          }}
        >
          {navItems.map((item, index) => {
            const selected = index === currentPath;
            return (
              <Box
                key={item.path}
                component="button"
                aria-label={item.text}
                aria-current={selected ? 'page' : undefined}
                onClick={() => handleNavClick(item.path)}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.25,
                  bgcolor: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  color: selected ? 'secondary.main' : 'text.secondary',
                  '& .icon': { fontSize: 22, lineHeight: 1 },
                  '& .label': {
                    fontSize: '0.6rem',
                    fontWeight: selected ? 700 : 500,
                    letterSpacing: '0.02em',
                  },
                }}
              >
                <Box component="span" className="icon" sx={{ display: 'inline-flex' }}>
                  {item.icon}
                </Box>
                <Box component="span" className="label">{item.text}</Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── 移动端记账 FAB ── */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="记一笔"
          onClick={openQuickAdd}
          sx={{
            position: 'fixed',
            right: 16,
            bottom: MOBILE_BOTTOM_NAV_HEIGHT + 16,
            zIndex: theme.zIndex.appBar + 1,
            bgcolor: 'secondary.main',
            color: '#0a0a0f',
            '&:hover': { bgcolor: 'secondary.light' },
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
}
