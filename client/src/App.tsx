// 应用路由层：按页面懒加载业务模块，减少首次打开时的资源体积。
import { lazy, Suspense, useEffect } from 'react';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lightTheme, darkTheme } from './theme';
import MainLayout from './components/Layout/MainLayout';
import GlobalSnackbar from './components/GlobalSnackbar';
import { useSettingsStore } from './stores/settingsStore';
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

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
        <MainLayout isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle}>
          <Routes>
            <Route path="/" element={<Suspense fallback={<DashboardSkeleton />}><HomePage /></Suspense>} />
            <Route path="/transactions" element={<Suspense fallback={<TransactionListSkeleton />}><TransactionsPage /></Suspense>} />
            <Route path="/statistics" element={<Suspense fallback={<ChartSkeleton />}><StatisticsPage /></Suspense>} />
            <Route path="/budgets" element={<Suspense fallback={<BudgetSkeleton />}><BudgetsPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<SettingsSkeleton />}><SettingsPage /></Suspense>} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
