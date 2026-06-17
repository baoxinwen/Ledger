import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { BudgetStatus, Category } from '../types';

interface BudgetCardProps {
  budgetStatus: BudgetStatus;
  categories: Category[];
  onEdit: (budget: BudgetStatus['budget']) => void;
  onDelete: (id: number) => void;
}

export default function BudgetCard({ budgetStatus, categories, onEdit, onDelete }: BudgetCardProps) {
  const { budget, spent, remaining } = budgetStatus;
  const percentage = Math.min((spent / budget.amount) * 100, 100);
  const isOverBudget = spent > budget.amount;

  const category = categories.find((c) => c.id === budget.category_id);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6">
              {category ? `${category.icon} ${category.name}` : '总预算'}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {budget.period === 'monthly' ? '月度预算' : '年度预算'}
            </Typography>
          </Box>
          <Box>
            <IconButton size="small" onClick={() => onEdit(budget)}>
              <EditIcon />
            </IconButton>
            <IconButton size="small" onClick={() => onDelete(budget.id)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              已花费: {formatAmount(spent)}
            </Typography>
            <Typography variant="body2">
              预算: {formatAmount(budget.amount)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percentage}
            color={isOverBudget ? 'error' : 'primary'}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography
            variant="body2"
            color={isOverBudget ? 'error' : 'success'}
          >
            {isOverBudget ? '超支' : '剩余'}: {formatAmount(Math.abs(remaining))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {percentage.toFixed(1)}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
