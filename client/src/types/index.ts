// 前端共享类型需要与后端 API 返回结构保持一致，避免页面和 store 各自猜字段。
export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category_id: number;
  note: string | null;
  date: string;
  source: string | null;
  source_transaction_id: string | null;
  source_merchant_order_id: string | null;
  source_category: string | null;
  source_time: string | null;
  payment_method: string | null;
  source_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  is_preset: number;
  sort_order: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface TransactionWithDetails extends Transaction {
  category: Category;
  tags: Tag[];
}

export interface TransactionFilter {
  type?: 'income' | 'expense';
  category_id?: number;
  tag_id?: number;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  keyword?: string;
  page?: number;
  limit?: number;
  sort?: 'date' | 'amount';
  order?: 'asc' | 'desc';
}

export interface StatsData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryStats: { name: string; icon: string; color: string; total: number }[];
  dailyStats: { date: string; type: string; total: number }[];
}

export interface Budget {
  id: number;
  category_id: number | null;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppSettings {
  time_zone: string;
  theme_mode: ThemeMode;
}

export type ImportFileSource = 'auto' | 'standard' | 'alipay' | 'wechat';

export interface ImportDiagnostic {
  level: 'info' | 'warning' | 'error';
  outcome: 'skipped' | 'duplicate' | 'failed';
  row?: number;
  import_row?: number;
  reason: string;
  source?: 'standard' | 'alipay' | 'wechat';
  source_transaction_id?: string;
  source_merchant_order_id?: string;
  source_category?: string;
  source_time?: string;
  payment_method?: string;
  raw?: Record<string, unknown>;
}

export interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  duplicates: number;
  createdCategories: number;
  errors: string[];
  diagnostics: ImportDiagnostic[];
}
