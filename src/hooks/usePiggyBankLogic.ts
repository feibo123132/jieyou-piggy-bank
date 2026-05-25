import { useAppStore } from '@/store/useAppStore';
import { eachDayOfInterval, startOfMonth, endOfMonth, isFuture, format } from 'date-fns';
import { getFixedExpensesForMonth } from '@/lib/fixedExpenses';

const PIGGY_LEVELS = [30, 50, 100, 200, 500] as const;

export const usePiggyBankLogic = () => {
  const { transactions, settings } = useAppStore();

  const calculateTotalSavings = () => {
    // If we have no budget set, savings are 0
    if (!settings.monthlyBudget) return 0;

    const today = new Date();
    const currentMonthKey = format(today, 'yyyy-MM');
    // Start from when the user created the account or a fixed reasonable start date
    // For now, let's calculate based on the current month's performance as per the "Total Saved" logic
    // OR, if "Piggy Bank" represents ALL-TIME savings, we need to iterate differently.
    // Based on user request: "本月共省" (Total Saved This Month) should be the piggy bank amount.
    // So we align it with the CalendarPage logic.
    
    const startCalcDate = startOfMonth(today);
    const endCalcDate = endOfMonth(today); // We'll filter out future days
    
    // Calculate fixed expenses total
    const fixedTotal = getFixedExpensesForMonth(
      settings.fixedExpensesByMonth,
      currentMonthKey,
      settings.fixedExpenses,
    ).reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate Daily Budget
    // (Monthly - Fixed) / DaysInMonth
    // Note: We need to use the number of days in the SPECIFIC month of the calculation
    // But for "This Month", it's constant.
    const daysInMonth = eachDayOfInterval({ start: startCalcDate, end: endCalcDate }).length;
    const calculatedDaily = Math.max(0, (settings.monthlyBudget - fixedTotal) / daysInMonth);
    const dailyBudget = settings.dailyBudget && settings.dailyBudget > 0 
      ? settings.dailyBudget 
      : calculatedDaily;

    // Iterate through days up to today
    const daysToCalc = eachDayOfInterval({ start: startCalcDate, end: endCalcDate });
    
    let totalSavings = 0;
    
    daysToCalc.forEach(day => {
      if (isFuture(day)) return;

      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTransactions = transactions.filter(t => t.date === dateStr && !t.deletedAt);
      
      const dayConsumed = dayTransactions
        .filter(t => !t.tags.includes('fixed'))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const dailySavings = dailyBudget - dayConsumed;
      totalSavings += dailySavings;
    });

    // Monthly non-fixed incomes are also deposited into the piggy bank.
    const totalVariableIncome = (settings.variableIncomes || [])
      .filter(income => income.month === currentMonthKey)
      .reduce((sum, income) => sum + Math.max(0, income.amount || 0), 0);

    totalSavings += totalVariableIncome;

    // Piggy bank should accumulate savings, but typically we don't subtract overspending from the "bank" 
    // unless the logic implies "debt". 
    // However, "Total Saved This Month" usually implies Net Savings.
    // If the user wants "Total Saved" to be the piggy bank amount, we return the Net.
    // But if it's negative, the piggy bank is empty (0), not in debt.
    return Math.max(0, totalSavings); 
  };

  const totalSavedThisMonth = calculateTotalSavings();

  // Determine the current piggy bank level from this month's savings.
  // Upgrade is always sequential: 30 -> 50 -> 100 -> 200 -> 500.
  let capacity: number = PIGGY_LEVELS[0];
  let currentAmount: number = totalSavedThisMonth;

  for (let i = 0; i < PIGGY_LEVELS.length; i++) {
    const level = PIGGY_LEVELS[i];
    const isLastLevel = i === PIGGY_LEVELS.length - 1;

    capacity = level;

    if (currentAmount < level) {
      break;
    }

    if (isLastLevel) {
      currentAmount = level;
      break;
    }

    currentAmount -= level;
  }

  const percentage = Math.min(100, Math.max(0, (currentAmount / capacity) * 100));

  return {
    currentAmount,
    percentage,
    capacity,
    totalSavedThisMonth,
  };
};
