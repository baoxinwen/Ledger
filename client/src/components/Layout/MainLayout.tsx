// 主布局组件：统一侧边导航、顶部栏、暗色模式切换和页面容器。
import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  Home,
  Receipt,
  BarChart,
  AccountBalanceWallet,
  Settings,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';

const DRAWER_WIDTH = 260;

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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentTab = navItems.findIndex((item) => item.path === location.pathname);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    navigate(navItems[newValue].path);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const currentPage = navItems.find((item) => item.path === location.pathname);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        position: 'relative',
        // Subtle grain texture overlay
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
          zIndex: theme.zIndex.drawer - 1,
        },
      }}
    >
      {/* Top Navigation Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(20px)',
          backgroundColor: isDarkMode
            ? 'rgba(18, 18, 26, 0.85)'
            : 'rgba(250, 249, 247, 0.85)',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, gap: 1 }}>
          {/* Mobile menu button */}
          {isMobile && (
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Box
            sx={{
              mr: { xs: 1, md: 4 },
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onClick={() => navigate('/')}
          >
            <Logo compact={isMobile} isDarkMode={isDarkMode} />
          </Box>

          {/* Desktop Navigation Tabs */}
          {!isMobile && (
            <Tabs
              value={currentTab >= 0 ? currentTab : 0}
              onChange={handleTabChange}
              sx={{
                flex: 1,
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '0.8rem',
                  minWidth: 'auto',
                  px: 2.5,
                },
              }}
            >
              {navItems.map((item) => (
                <Tab
                  key={item.path}
                  label={item.text}
                  icon={item.icon}
                  iconPosition="start"
                />
              ))}
            </Tabs>
          )}

          {/* Mobile current page name */}
          {isMobile && currentPage && (
            <Typography
              variant="h6"
              sx={{
                flex: 1,
                textAlign: 'center',
                fontFamily: '"Playfair Display", serif',
              }}
            >
              {currentPage.text}
            </Typography>
          )}

          {/* Theme toggle */}
          <IconButton
            onClick={onThemeToggle}
            sx={{
              ml: 'auto',
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
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: 'none',
            bgcolor: 'background.paper',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ mb: 4 }}>
            <Logo isDarkMode={isDarkMode} />
          </Box>

          <Divider sx={{ mb: 2 }} />

          <List sx={{ px: 0 }}>
            {navItems.map((item) => {
              const isSelected = location.pathname === item.path;
              return (
                <ListItemButton
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  selected={isSelected}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isSelected ? 'secondary.main' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? 'text.primary' : 'text.secondary',
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 3, md: 4 },
          width: '100%',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: theme.zIndex.appBar,
          }}
        >
          <Tabs
            value={currentTab >= 0 ? currentTab : 0}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 60,
                minWidth: 'auto',
                p: 0,
              },
            }}
          >
            {navItems.map((item) => (
              <Tab
                key={item.path}
                icon={item.icon}
                aria-label={item.text}
                sx={{
                  '&.Mui-selected': {
                    color: 'secondary.main',
                  },
                }}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Mobile bottom nav spacer */}
      {isMobile && <Box sx={{ height: 60 }} />}
    </Box>
  );
}
