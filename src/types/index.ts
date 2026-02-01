export interface FixedExpense {
  id: string;
  amount: number;
  label: string;
}

export interface UserSettings {
  monthlyBudget: number;
  fixedExpenses: FixedExpense[];
  isOnboarded: boolean; // Flag to check if user has completed initial setup
  createdAt: string;
  updatedAt: string;
}

export type TransactionTag = 'necessary' | 'fixed' | 'optional';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  tags: TransactionTag[];
  note?: string;
  createdAt: string;
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
