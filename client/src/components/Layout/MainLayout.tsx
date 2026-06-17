import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Brightness4, Brightness7, Home, Receipt, BarChart, AccountBalanceWallet, Settings } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;

const navItems = [
  { text: '首页', icon: <Home />, path: '/' },
  { text: '账单', icon: <Receipt />, path: '/transactions' },
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

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            个人记账本
          </Typography>
          <IconButton color="inherit" onClick={onThemeToggle}>
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
