// 表单记忆 store：保留用户最近一次录入偏好，减少连续记账时的重复填写。
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_TIME_ZONE, getTodayInTimeZone } from '../utils/format';

interface TransactionFormData {
  type: 'income' | 'expense';
  category_id: number | null;
  date: string;
}

interface FormMemoryState {
  transactionForm: TransactionFormData;
  setTransactionForm: (data: Partial<TransactionFormData>) => void;
  resetTransactionForm: (defaultDate?: string) => void;
}

const defaultFormData: TransactionFormData = {
  type: 'expense',
  category_id: null,
  date: getTodayInTimeZone(DEFAULT_TIME_ZONE),
};

export const useFormMemoryStore = create<FormMemoryState>()(
  persist(
    (set) => ({
      transactionForm: { ...defaultFormData },

      setTransactionForm: (data: Partial<TransactionFormData>) => {
        set((state) => ({
          transactionForm: { ...state.transactionForm, ...data },
        }));
      },

      resetTransactionForm: (defaultDate?: string) => {
        set({ transactionForm: { ...defaultFormData, date: defaultDate || getTodayInTimeZone(DEFAULT_TIME_ZONE) } });
      },
    }),
    {
      name: 'ledger-form-memory',
    }
  )
);
