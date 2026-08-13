// 应用路由层：按登录状态渲染登录页或业务模块，并按页面懒加载业务模块减少首屏体积。
import { lazy, Suspense, useEffect } from 'react';
import { ThemeProvider, CssBaseline, useMediaQuery, Box, CircularProgress } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lightTheme, darkTheme } from './theme';
import MainLayout from './components/Layout/MainLayout';
import GlobalSnackbar from './components/GlobalSnackbar';
import AuthPage from './pages/AuthPage';
import { useSettingsStore } from './stores/settingsStore';
import { useAuthStore } from './stores/authStore';
import {
  DashboardSkeleton,
  TransactionListSkeleton,
  ChartSkeleton,
  BudgetSkeleton,
  SettingsSkeleton,
} from './components/Skeletons';

const HomePage = lazy(() => import('./pages/HomePage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const settings = useSettingsStore((state) => state.settings);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const authStatus = useAuthStore((state) => state.status);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 仅在已登录后拉取设置；未登录时 /api/settings 受保护会返回 401，
  // 此时直接使用本地兜底的主题偏好，避免无意义的 401 报错。
  useEffect(() => {
    if (authStatus === 'authed') {
      fetchSettings();
    }
  }, [authStatus, fetchSettings]);

  const isDarkMode = settings.theme_mode === 'system'
    ? prefersDarkMode
    : settings.theme_mode === 'dark';

  const handleThemeToggle = () => {
    updateSettings({ theme_mode: isDarkMode ? 'light' : 'dark' }).catch((error) => {
      console.error('切换主题失败:', error);
    });
  };

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <GlobalSnackbar />
      <BrowserRouter>
        {authStatus === 'checking' ? (
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : authStatus === 'authed' ? (
          <MainLayout isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle}>
            <Routes>
              <Route path="/" element={<Suspense fallback={<DashboardSkeleton />}><HomePage /></Suspense>} />
              <Route path="/transactions" element={<Suspense fallback={<TransactionListSkeleton />}><TransactionsPage /></Suspense>} />
              <Route path="/statistics" element={<Suspense fallback={<ChartSkeleton />}><StatisticsPage /></Suspense>} />
              <Route path="/budgets" element={<Suspense fallback={<BudgetSkeleton />}><BudgetsPage /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<SettingsSkeleton />}><SettingsPage /></Suspense>} />
            </Routes>
          </MainLayout>
        ) : (
          <AuthPage isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} />
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
