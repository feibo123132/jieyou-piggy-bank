export type FixedExpenseCategory = 'necessary' | 'optional' | 'unnatural';

export interface FixedExpense {
  id: string;
  amount: number;
  label: string;
  /**
   * 必要性分桶（与交易 tag 的 EXCLUSIVE_GROUPS 同口径，固定支出也参与分桶）。
   * 可选：未填时默认 'necessary'，保持向后兼容老数据。
   */
  category?: FixedExpenseCategory;
}

export interface MonthlyFixedExpenseSnapshot {
  month: string; // YYYY-MM
  expenses: FixedExpense[];
}

export interface VariableIncome {
  id: string;
  amount: number;
  label: string;
  month: string; // YYYY-MM
  createdAt: string;
}

export interface UserSettings {
  monthlyBudget: number;
  dailyBudget: number; // Manually set daily limit
  fixedExpenses: FixedExpense[];
  fixedExpensesByMonth?: MonthlyFixedExpenseSnapshot[];
  variableIncomes?: VariableIncome[]; // Monthly non-fixed incomes
  isOnboarded: boolean; // Flag to check if user has completed initial setup
  createdAt: string;
  updatedAt: string;
  username?: string; // For multi-device sync
  passwordHash?: string; // SHA-256 hash for authentication
}

export type TransactionTag =
  | 'necessary'
  | 'fixed'
  | 'unfixed'
  | 'optional'
  | 'idea'
  | 'unnatural';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  tags: TransactionTag[];
  note?: string;
  createdAt: string;
  deletedAt?: string; // ISO string for soft delete
}

export interface PiggyBankState {
  currentAmount: number;
  capacityLevel: number; // 30, 50, 100, etc.
  totalSavedHistory: number;
  lastUpgradedAt?: string;
}

export interface DailyStats {
  date: string;
  budget: number;
  expenses: number;
  savings: number;
  isPositive: boolean;
}
