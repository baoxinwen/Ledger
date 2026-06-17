import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lightTheme, darkTheme } from './theme';
import MainLayout from './components/Layout/MainLayout';
import HomePage from './pages/HomePage';
import TransactionsPage from './pages/TransactionsPage';
import StatisticsPage from './pages/StatisticsPage';
import BudgetsPage from './pages/BudgetsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <BrowserRouter>
        <MainLayout isDarkMode={isDarkMode} onThemeToggle={() => setIsDarkMode(!isDarkMode)}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
