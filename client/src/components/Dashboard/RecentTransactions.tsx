// 最近交易组件：首页展示最新几条收支，帮助快速确认数据是否已更新。
import {
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  ArrowForward as ArrowIcon,
  Receipt as ReceiptIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { TransactionWithDetails } from '../../types';
import { formatCompactAmount } from '../../utils/format';

interface RecentTransactionsProps {
  transactions: TransactionWithDetails[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const navigate = useNavigate();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            最近记录
          </Typography>
          <Button
            endIcon={<ArrowIcon />}
            onClick={() => navigate('/transactions')}
            sx={{
              color: 'secondary.main',
              fontWeight: 600,
              fontSize: '0.8rem',
              '&:hover': { bgcolor: 'transparent' },
            }}
          >
            查看全部
          </Button>
        </Box>

        <List disablePadding>
          {transactions.map((transaction, index) => (
            <Box key={transaction.id}>
              {index > 0 && <Divider sx={{ my: 0 }} />}
              <ListItem
                sx={{
                  px: 0,
                  py: 2,
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background-color 0.2s',
                }}
              >
                <ListItemIcon sx={{ minWidth: 56 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: transaction.type === 'expense' ? 'error.light' : 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      fontSize: '1.2rem',
                    }}
                  >
                    {transaction.category.icon || transaction.category.name.charAt(0)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {transaction.note || transaction.category.name}
                    </Typography>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {transaction.date}
                      </Typography>
                      <Chip
                        label={transaction.category.name}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </Box>
                  }
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      fontFamily: '"DM Sans", sans-serif',
                      color: transaction.type === 'expense' ? 'error.main' : 'success.main',
                    }}
                  >
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatCompactAmount(transaction.amount)}
                  </Typography>
                </Box>
              </ListItem>
            </Box>
          ))}

          {transactions.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ReceiptIcon sx={{ fontSize: 48, color: 'divider', mb: 2 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                暂无记录
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/transactions')}
              >
                开始记账
              </Button>
            </Box>
          )}
        </List>
      </CardContent>
    </Card>
  );
}
