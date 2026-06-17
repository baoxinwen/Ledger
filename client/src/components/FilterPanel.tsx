import {
  Box,
  TextField,
  MenuItem,
  Grid,
  Button,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import type { TransactionFilter, Category, Tag } from '../types';

interface FilterPanelProps {
  filter: TransactionFilter;
  categories: Category[];
  tags: Tag[];
  onFilterChange: (filter: TransactionFilter) => void;
  onClear: () => void;
}

export default function FilterPanel({ filter, categories, tags, onFilterChange, onClear }: FilterPanelProps) {
  const handleChange = (field: keyof TransactionFilter, value: any) => {
    onFilterChange({ ...filter, [field]: value, page: 1 });
  };

  const hasFilters = filter.type || filter.category_id || filter.tag_id || filter.start_date || filter.end_date || filter.keyword;

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            select
            fullWidth
            label="类型"
            value={filter.type || ''}
            onChange={(e) => handleChange('type', e.target.value || undefined)}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="income">收入</MenuItem>
            <MenuItem value="expense">支出</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            select
            fullWidth
            label="分类"
            value={filter.category_id || ''}
            onChange={(e) => handleChange('category_id', e.target.value ? Number(e.target.value) : undefined)}
          >
            <MenuItem value="">全部</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            select
            fullWidth
            label="标签"
            value={filter.tag_id || ''}
            onChange={(e) => handleChange('tag_id', e.target.value ? Number(e.target.value) : undefined)}
          >
            <MenuItem value="">全部</MenuItem>
            {tags.map((tag) => (
              <MenuItem key={tag.id} value={tag.id}>
                {tag.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            label="关键字搜索"
            value={filter.keyword || ''}
            onChange={(e) => handleChange('keyword', e.target.value || undefined)}
            placeholder="搜索备注"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            type="date"
            label="开始日期"
            value={filter.start_date || ''}
            onChange={(e) => handleChange('start_date', e.target.value || undefined)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            type="date"
            label="结束日期"
            value={filter.end_date || ''}
            onChange={(e) => handleChange('end_date', e.target.value || undefined)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            type="number"
            label="最小金额"
            value={filter.min_amount || ''}
            onChange={(e) => handleChange('min_amount', e.target.value ? Number(e.target.value) : undefined)}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            type="number"
            label="最大金额"
            value={filter.max_amount || ''}
            onChange={(e) => handleChange('max_amount', e.target.value ? Number(e.target.value) : undefined)}
          />
        </Grid>

        {hasFilters && (
          <Grid size={{ xs: 12 }}>
            <Button
              startIcon={<ClearIcon />}
              onClick={onClear}
              color="secondary"
            >
              清除筛选
            </Button>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
