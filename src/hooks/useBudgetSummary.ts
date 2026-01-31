import { useAppStore } from '@/store/useAppStore';
import { isSameMonth } from 'date-fns';

export const useBudgetSummary = () => {
  const { settings, transactions } = useAppStore();
  
  const today = new Date();
  const currentMonthTransactions = transactions.filter(t => 
    isSameMonth(new Date(t.date), today)
  );

  // Real-time Remaining
  const totalSettingsFixed = settings.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Expenses that eat into the "Discretionary Budget"
  // In Mode A, Fixed Expenses are pre-deducted from the Monthly Budget.
  // So we only count Non-Fixed transactions here when calculating remaining "discretionary" or "total available".
  // HOWEVER, for "Real-time Remaining" (Money Left in Pocket), we should calculate:
  // MonthlyBudget - PlannedFixed - ActualVariableSpent
  const totalVariableSpent = currentMonthTransactions
    .filter(t => !t.tags.includes('fixed'))
    .reduce((sum, t) => sum + t.amount, 0);

  // Real-time Remaining
  const monthlyRemaining = Math.max(0, settings.monthlyBudget - totalSettingsFixed - totalVariableSpent);

  return {
    monthlyRemaining,
    totalSettingsFixed,
    totalVariableSpent
  };
};
