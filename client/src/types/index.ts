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
  import_batch_id: number | null;
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
  /** 引用该标签的交易数（标签管理页展示使用次数） */
  usage_count?: number;
}

export interface TransactionWithDetails extends Transaction {
  category: Category;
  tags: Tag[];
}

export interface ImportBatchSummary {
  id: number;
  filename: string;
  source: string;
  status: 'completed' | 'failed' | 'undone';
  createdAt: string;
  completedAt: string | null;
  undoneAt: string | null;
}

export interface TransactionDetail extends TransactionWithDetails {
  importBatch: ImportBatchSummary | null;
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
  transactionCount: number;
  days: number;
  dailyAverages: { income: number; expense: number };
  previousPeriod: {
    startDate: string;
    endDate: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
    days: number;
  } | null;
  changes: {
    income: number | null;
    expense: number | null;
    transactionCount: number | null;
    balance: number | null;
  };
  tagStats: {
    income: Array<{ id: number; name: string; total: number; count: number; percentage: number }>;
    expense: Array<{ id: number; name: string; total: number; count: number; percentage: number }>;
  };
  categoryStats: { name: string; icon: string; color: string; type: 'income' | 'expense'; total: number }[];
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

export interface AuthUser {
  username: string;
}

// 后端 /api/auth/me 的返回结构：前端据此区分“需要初始化 / 未登录 / 已登录”。
export interface AuthStatus {
  authenticated: boolean;
  needsSetup: boolean;
  user: AuthUser | null;
}

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

export interface ImportPreview {
  previewId: string;
  expiresAt: string;
  source: Exclude<ImportFileSource, 'auto'>;
  filename: string;
  counts: {
    total: number;
    ready: number;
    hardDuplicates: number;
    contentDuplicates: number;
    skipped: number;
    failed: number;
  };
  income: number;
  expense: number;
  categoryMappings: Array<{
    source: string;
    target: string;
    type: 'income' | 'expense';
    willCreate: boolean;
    count: number;
  }>;
  rows: {
    items: Array<{
      rowKey: string;
      row: number;
      type: 'income' | 'expense' | null;
      amount: number | null;
      date: string | null;
      category: string | null;
      note: string | null;
      tags: string[];
      outcome: 'ready' | 'hard_duplicate' | 'content_duplicate' | 'skipped' | 'failed';
      reason?: string;
      selectable: boolean;
      selected: boolean;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    selection: { count: number; income: number; expense: number };
  };
  selection: { count: number; income: number; expense: number };
  diagnostics: ImportDiagnostic[];
}

export type ImportPreviewOutcome = ImportPreview['rows']['items'][number]['outcome'];
export type ImportPreviewType = 'income' | 'expense';

export interface ImportPreviewFilter {
  outcome?: ImportPreviewOutcome;
  type?: ImportPreviewType;
}

export interface ImportPreviewRows extends Omit<ImportPreview['rows'], 'items'> {
  items: ImportPreview['rows']['items'];
}

export interface ImportSelectionSummary {
  count: number;
  income: number;
  expense: number;
}

export interface ImportPreviewSelectionUpdate {
  action: 'select' | 'deselect';
  rowKeys?: string[];
  filter?: ImportPreviewFilter;
}

/*
  The fields above intentionally mirror the server preview session. Keep the
  source row data separate from the diagnostics list so pagination can load all
  records without returning raw order identifiers.
*/
/*
  Legacy row shape removed in v3:
  rows: Array<{
    row: number;
    type: 'income' | 'expense';
    amount: number;
    date: string;
    category: string;
    note: string | null;
    tags: string[];
    outcome: 'ready' | 'hard_duplicate' | 'content_duplicate' | 'failed';
    reason?: string;
  }>;
*/

export interface ImportBatch {
  id: number;
  filename: string;
  source: string;
  status: 'completed' | 'failed' | 'undone';
  totalCount: number;
  readyCount: number;
  successCount: number;
  skippedCount: number;
  duplicateCount: number;
  failedCount: number;
  excludedCount: number;
  income: number;
  expense: number;
  diagnostics: ImportDiagnostic[];
  createdAt: string;
  completedAt: string | null;
  undoneAt: string | null;
  undoneCount: number;
}

export interface ImportHistory {
  items: ImportBatch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BackupRecord {
  id: string;
  type: 'manual' | 'automatic' | 'pre_restore';
  formatVersion: number;
  schemaVersion: number;
  createdAt: string;
  size: number;
}
