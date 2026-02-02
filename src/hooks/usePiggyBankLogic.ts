import { useAppStore } from '@/store/useAppStore';
import { eachDayOfInterval, startOfMonth, endOfMonth, isFuture, format } from 'date-fns';

export const usePiggyBankLogic = () => {
  const { transactions, settings, piggyBank } = useAppStore();

  const calculateTotalSavings = () => {
    // If we have no budget set, savings are 0
    if (!settings.monthlyBudget) return 0;

    const today = new Date();
    // Start from when the user created the account or a fixed reasonable start date
    // For now, let's calculate based on the current month's performance as per the "Total Saved" logic
    // OR, if "Piggy Bank" represents ALL-TIME savings, we need to iterate differently.
    // Based on user request: "本月共省" (Total Saved This Month) should be the piggy bank amount.
    // So we align it with the CalendarPage logic.
    
    const startCalcDate = startOfMonth(today);
    const endCalcDate = endOfMonth(today); // We'll filter out future days
    
    // Calculate fixed expenses total
    const fixedTotal = settings.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
    
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

    // Piggy bank should accumulate savings, but typically we don't subtract overspending from the "bank" 
    // unless the logic implies "debt". 
    // However, "Total Saved This Month" usually implies Net Savings.
    // If the user wants "Total Saved" to be the piggy bank amount, we return the Net.
    // But if it's negative, the piggy bank is empty (0), not in debt.
    return Math.max(0, totalSavings); 
  };

  const currentAmount = calculateTotalSavings();
  
  // Calculate percentage for visual
  // Capacity Level is an arbitrary goal (e.g. 100, 500, 1000)
  // If capacity is not set or 0, default to 100 to avoid division by zero
  const capacity = piggyBank.capacityLevel || 100;
  const percentage = Math.min(100, Math.max(0, (currentAmount / capacity) * 100));

  return {
    currentAmount,
    percentage,
    capacity
  };
};