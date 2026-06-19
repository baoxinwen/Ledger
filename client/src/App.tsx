import { lazy, Suspense, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lightTheme, darkTheme } from './theme';
import MainLayout from './components/Layout/MainLayout';
import GlobalSnackbar from './components/GlobalSnackbar';
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
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <GlobalSnackbar />
      <BrowserRouter>
        <MainLayout isDarkMode={isDarkMode} onThemeToggle={() => setIsDarkMode(!isDarkMode)}>
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
