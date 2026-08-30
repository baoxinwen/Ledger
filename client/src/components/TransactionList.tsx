// 交易列表：桌面端紧凑表格（悬浮操作、类型徽章），移动端卡片布局。
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  TablePagination,
  Box,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import type { TransactionWithDetails } from '../types';
import { formatRelativeDay } from '../utils/format';
import { Amount, CategoryAvatar, EmptyState, HoverActions, TagChip, TypeBadge } from './ui';

interface TransactionListProps {
  transactions: TransactionWithDetails[];
  total: number;
  page: number;
  rowsPerPage: number;
  /** 业务时区今天（YYYY-MM-DD），用于日期相对化显示 */
  today?: string;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (transaction: TransactionWithDetails) => void;
  onDelete: (transaction: TransactionWithDetails) => void;
  onView: (transaction: TransactionWithDetails) => void;
}

export default function TransactionList({
  transactions,
  total,
  page,
  rowsPerPage,
  today,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onView,
}: TransactionListProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const getTransactionLabel = (transaction: TransactionWithDetails) =>
    transaction.note || transaction.category.name;

  const rowActions = (transaction: TransactionWithDetails) => (
    <HoverActions>
      <IconButton
        size="small"
        onClick={(event) => { event.stopPropagation(); onEdit(transaction); }}
        aria-label={`编辑${getTransactionLabel(transaction)}`}
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={(event) => { event.stopPropagation(); onDelete(transaction); }}
        aria-label={`删除${getTransactionLabel(transaction)}`}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </HoverActions>
  );

  // Mobile card layout
  if (isMobile) {
    return (
      <Box>
        {transactions.map((transaction) => (
          <Card
            key={transaction.id}
            role="button"
            tabIndex={0}
            className="hover-actions-host"
            onClick={() => onView(transaction)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onView(transaction);
            }}
            sx={{ mb: 1.5, cursor: 'pointer' }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                  <CategoryAvatar category={transaction.category} size={40} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                      {transaction.category.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {formatRelativeDay(transaction.date, today)}
                    </Typography>
                  </Box>
                </Box>
                <Amount
                  value={transaction.amount}
                  tone={transaction.type}
                  variant="body1"
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
                />
              </Box>

              {(transaction.note || transaction.tags.length > 0) && (
                <Box sx={{ mb: 1.5 }}>
                  {transaction.note && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      {transaction.note}
                    </Typography>
                  )}
                  {transaction.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {transaction.tags.map((tag) => (
                        <TagChip key={tag.id} label={tag.name} />
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TypeBadge type={transaction.type} />
                {rowActions(transaction)}
              </Box>
            </CardContent>
          </Card>
        ))}

        {transactions.length === 0 && (
          <EmptyState
            icon={<ReceiptIcon sx={{ fontSize: 44 }} />}
            title="暂无记录"
            description="调整筛选条件或记一笔新账"
          />
        )}

        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={(_, newPage) => onPageChange(newPage + 1)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页"
          sx={{
            '.MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: 'center',
            },
          }}
        />
      </Box>
    );
  }

  // Desktop table layout：紧凑行高 + 类型徽章 + 悬浮操作
  return (
    <Card>
      <TableContainer>
        <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: 760 }}>
          <colgroup>
            <col style={{ width: 108 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 168 }} />
            <col />
            <col style={{ width: 148 }} />
            <col style={{ width: 128 }} />
            <col style={{ width: 84 }} />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell>日期</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>标签</TableCell>
              <TableCell align="right">金额</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                tabIndex={0}
                className="hover-actions-host"
                onClick={() => onView(transaction)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onView(transaction);
                }}
                sx={{
                  cursor: 'pointer',
                  '& td': { py: 1.25 },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {formatRelativeDay(transaction.date, today)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {transaction.date}
                  </Typography>
                </TableCell>
                <TableCell>
                  <TypeBadge type={transaction.type} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <CategoryAvatar category={transaction.category} size={30} />
                    <Typography variant="body2" noWrap>
                      {transaction.category.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    title={transaction.note || undefined}
                    sx={{
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                  >
                    {transaction.note || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {transaction.tags.map((tag) => (
                      <TagChip key={tag.id} label={tag.name} />
                    ))}
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Amount
                    value={transaction.amount}
                    tone={transaction.type}
                    variant="body2"
                    sx={{ fontWeight: 700 }}
                  />
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  {rowActions(transaction)}
                </TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 0 }}>
                  <Box sx={{ py: 4 }}>
                    <EmptyState
                      icon={<ReceiptIcon sx={{ fontSize: 44 }} />}
                      title="暂无记录"
                      description="调整筛选条件或记一笔新账"
                    />
                  </Box>
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
    </Card>
  );
}
