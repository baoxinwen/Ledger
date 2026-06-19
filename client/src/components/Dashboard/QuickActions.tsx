import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { calculatePercentage } from '../../utils/format';
import { ROUTES } from '../../constants/routes';

interface QuickActionsProps {
  totalIncome: number;
  totalExpense: number;
}

export default function QuickActions({ totalIncome, totalExpense }: QuickActionsProps) {
  const navigate = useNavigate();
  const budgetUsed = calculatePercentage(totalExpense, totalIncome);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Expense Ratio */}
      <Card>
        <CardContent>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
            支出占比
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="h4"
              sx={{
                fontFamily: '"Playfair Display", serif',
                color: budgetUsed > 80 ? 'error.main' : 'text.primary',
              }}
            >
              {budgetUsed.toFixed(1)}%
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              支出占收入比例
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(budgetUsed, 100)}
            sx={{
              height: 6,
              bgcolor: 'divider',
              '& .MuiLinearProgress-bar': {
                bgcolor: budgetUsed > 80 ? 'error.main' : 'secondary.main',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
            快捷操作
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => navigate(ROUTES.TRANSACTIONS)}
              sx={{ justifyContent: 'flex-start', pl: 2.5 }}
            >
              记一笔
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<ReceiptIcon />}
              onClick={() => navigate(ROUTES.TRANSACTIONS)}
              sx={{ justifyContent: 'flex-start', pl: 2.5 }}
            >
              查看账单
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
