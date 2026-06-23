// 后端共享类型集中在这里，路由、服务和测试都通过这些接口保持数据结构一致。
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

export interface Budget {
  id: number;
  category_id: number | null;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
}

export interface AppSettings {
  time_zone: string;
  theme_mode: 'system' | 'light' | 'dark';
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

export interface ImportMetadata {
  source?: 'standard' | 'alipay' | 'wechat';
  source_transaction_id?: string;
  source_merchant_order_id?: string;
  source_category?: string;
  source_time?: string;
  payment_method?: string;
  source_status?: string;
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

export interface ImportableTransaction extends ImportMetadata {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string | null;
  date: string;
  tags?: string[];
  // 下面三个字段只服务于导入诊断，不会写入 transactions 表。
  import_row?: number;
  source_row?: number;
  source_raw?: Record<string, unknown>;
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
