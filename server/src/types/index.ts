export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category_id: number;
  note: string | null;
  date: string;
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

export interface TransactionTag {
  transaction_id: number;
  tag_id: number;
}

export interface Budget {
  id: number;
  category_id: number | null;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
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

export interface StatsQuery {
  start_date?: string;
  end_date?: string;
  type?: 'income' | 'expense';
}
