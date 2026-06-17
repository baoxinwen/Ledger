import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  TablePagination,
  Box,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { TransactionWithDetails } from '../types';

interface TransactionListProps {
  transactions: TransactionWithDetails[];
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (transaction: TransactionWithDetails) => void;
  onDelete: (id: number) => void;
}

export default function TransactionList({
  transactions,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>日期</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>标签</TableCell>
              <TableCell align="right">金额</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.date}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ mr: 1 }}>{transaction.category.icon}</Typography>
                    {transaction.category.name}
                  </Box>
                </TableCell>
                <TableCell>{transaction.note || '-'}</TableCell>
                <TableCell>
                  {transaction.tags.map((tag) => (
                    <Chip key={tag.id} label={tag.name} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    color={transaction.type === 'expense' ? 'error' : 'success'}
                    fontWeight="bold"
                  >
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatAmount(transaction.amount)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => onEdit(transaction)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(transaction.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    暂无记录
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="每页条数"
      />
    </Paper>
  );
}
