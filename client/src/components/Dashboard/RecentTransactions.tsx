// 最近交易组件：首页右栏，按日分组、行可点击进入详情、金额语义色。
import { useMemo } from 'react';
import {
  Typography,
  Box,
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
import { formatRelativeDay } from '../../utils/format';
import { Amount, CategoryAvatar, DayHeader, EmptyState, SectionCard, TagChip } from '../ui';
import { useQuickAddStore } from '../../stores/quickAddStore';

interface RecentTransactionsProps {
  transactions: TransactionWithDetails[];
  /** 业务时区下的今天（YYYY-MM-DD），用于"今天/昨天"分组 */
  today?: string;
}

export default function RecentTransactions({ transactions, today }: RecentTransactionsProps) {
  const navigate = useNavigate();
  const openQuickAdd = useQuickAddStore((state) => state.openQuickAdd);

  // 按日期分组（接口已按日期倒序，保持组顺序即可）
  const groups = useMemo(() => {
    const map = new Map<string, TransactionWithDetails[]>();
    for (const transaction of transactions) {
      const list = map.get(transaction.date) ?? [];
      list.push(transaction);
      map.set(transaction.date, list);
    }
    return [...map.entries()];
  }, [transactions]);

  return (
    <SectionCard
      title="最近记录"
      action={(
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
      )}
    >
      {groups.map(([date, items], groupIndex) => (
        <Box key={date}>
          {groupIndex > 0 && <Divider />}
          <DayHeader
            label={formatRelativeDay(date, today)}
            expenseTotal={items
              .filter((item) => item.type === 'expense')
              .reduce((sum, item) => sum + item.amount, 0)}
            incomeTotal={items
              .filter((item) => item.type === 'income')
              .reduce((sum, item) => sum + item.amount, 0)}
          />
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {items.map((transaction) => (
              <Box
                key={transaction.id}
                component="li"
                className="hover-actions-host"
                tabIndex={0}
                role="button"
                aria-label={`查看 ${transaction.note || transaction.category.name} 详情`}
                onClick={() => navigate(`/transactions/${transaction.id}`, { state: { detailFromList: true } })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/transactions/${transaction.id}`, { state: { detailFromList: true } });
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 0.75,
                  py: 1.25,
                  borderRadius: 1,
                  cursor: 'pointer',
                  transition: 'background-color 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main', outlineOffset: -2 },
                }}
              >
                <CategoryAvatar category={transaction.category} size={36} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {transaction.note || transaction.category.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {transaction.category.name}
                    </Typography>
                    {transaction.tags.slice(0, 2).map((tag) => (
                      <TagChip key={tag.id} label={tag.name} />
                    ))}
                    {transaction.tags.length > 2 && (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        +{transaction.tags.length - 2}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Amount
                  value={transaction.amount}
                  tone={transaction.type}
                  compact
                  variant="body1"
                  sx={{ fontWeight: 700, flexShrink: 0 }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      ))}

      {transactions.length === 0 && (
        <EmptyState
          icon={<ReceiptIcon sx={{ fontSize: 44 }} />}
          title="暂无记录"
          description="记下第一笔收支，开始了解你的财务状况"
          action={(
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={openQuickAdd}
            >
              开始记账
            </Button>
          )}
        />
      )}
    </SectionCard>
  );
}
