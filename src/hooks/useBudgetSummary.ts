import { useAppStore } from '@/store/useAppStore';
import { format, isSameMonth } from 'date-fns';
import { getFixedExpensesForMonth } from '@/lib/fixedExpenses';

export const useBudgetSummary = () => {
  const { settings, transactions } = useAppStore();
  
  const today = new Date();
  const currentMonthTransactions = transactions.filter(t => 
    isSameMonth(new Date(t.date), today) && !t.deletedAt
  );
  const currentMonthKey = format(today, 'yyyy-MM');

  // Real-time Remaining
  const totalSettingsFixed = getFixedExpensesForMonth(
    settings.fixedExpensesByMonth,
    currentMonthKey,
    settings.fixedExpenses,
  ).reduce((sum, e) => sum + e.amount, 0);
  
  // Expenses that eat into the "Discretionary Budget"
  // In Mode A, Fixed Expenses are pre-deducted from the Monthly Budget.
  // So we only count Non-Fixed transactions here when calculating remaining "discretionary" or "total available".
  // HOWEVER, for "Real-time Remaining" (Money Left in Pocket), we should calculate:
  // MonthlyBudget - PlannedFixed - ActualVariableSpent
  const totalVariableSpent = currentMonthTransactions
    .filter(t => !t.tags.includes('fixed'))
    .reduce((sum, t) => sum + t.amount, 0);

  // Real-time Remaining
  const monthlyRemaining = settings.monthlyBudget - totalSettingsFixed - totalVariableSpent;

  return {
    monthlyRemaining,
    totalSettingsFixed,
    totalVariableSpent
  };
};
