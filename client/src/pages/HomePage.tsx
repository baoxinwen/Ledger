import { useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as BalanceIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/transactionStore';

export default function HomePage() {
  const navigate = useNavigate();
  const { transactions, stats, fetchTransactions, fetchStats } = useTransactionStore();

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;

    fetchStats({ start_date: startDate, end_date: endDate });
    fetchTransactions({ page: 1, limit: 5, sort: 'date', order: 'desc' });
  }, [fetchStats, fetchTransactions]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        本月概览
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <IncomeIcon color="success" sx={{ mr: 1 }} />
                <Typography color="text.secondary">本月收入</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {stats ? formatAmount(stats.totalIncome) : '¥0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ExpenseIcon color="error" sx={{ mr: 1 }} />
                <Typography color="text.secondary">本月支出</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {stats ? formatAmount(stats.totalExpense) : '¥0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BalanceIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary">本月结余</Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                {stats ? formatAmount(stats.balance) : '¥0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">最近记录</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/transactions')}
        >
          快速记账
        </Button>
      </Box>

      <Card>
        <List>
          {transactions.map((transaction) => (
            <ListItem key={transaction.id} divider>
              <ListItemIcon>
                <Typography>{transaction.category.icon}</Typography>
              </ListItemIcon>
              <ListItemText
                primary={transaction.note || transaction.category.name}
                secondary={transaction.date}
              />
              <Chip
                label={`${transaction.type === 'expense' ? '-' : '+'}${formatAmount(transaction.amount)}`}
                color={transaction.type === 'expense' ? 'error' : 'success'}
                variant="outlined"
              />
            </ListItem>
          ))}
          {transactions.length === 0 && (
            <ListItem>
              <ListItemText primary="暂无记录" secondary="点击上方按钮开始记账" />
            </ListItem>
          )}
        </List>
      </Card>
    </Box>
  );
}
