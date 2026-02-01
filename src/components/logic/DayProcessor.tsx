import React, { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { differenceInCalendarDays, addDays, format, getDaysInMonth } from 'date-fns';

export const DayProcessor: React.FC = () => {
  const { 
    settings, 
    transactions, 
    piggyBank, 
    lastProcessedDate, 
    updatePiggyBank, 
    setLastProcessedDate 
  } = useAppStore();

  useEffect(() => {
    if (!settings.isOnboarded) return;

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const lastProcessed = new Date(lastProcessedDate);

    // If last processed date is today or yesterday (meaning no full past days to process), do nothing
    if (differenceInCalendarDays(today, lastProcessed) <= 1) return;

    // Process all missing days from lastProcessed + 1 to yesterday
    let currentAmount = piggyBank.currentAmount;
    let capacity = piggyBank.capacityLevel;
    let history = piggyBank.totalSavedHistory;
    
    // We start processing from the NEXT day after last processed
    let processingDate = addDays(lastProcessed, 1);
    
    // While processingDate < today (so up to yesterday)
    while (differenceInCalendarDays(today, processingDate) > 0) {
      const dateStr = format(processingDate, 'yyyy-MM-dd');
      
      // Calculate Daily Budget for that month
      const daysInMonth = getDaysInMonth(processingDate);
      const fixedTotal = settings.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
      const dailyBudget = Math.max(0, (settings.monthlyBudget - fixedTotal) / daysInMonth);
      
      // Calculate Expenses for that day
      // Exclude 'fixed' expenses from daily budget consumption
      const dayExpenses = transactions
        .filter(t => t.date === dateStr && !t.tags.includes('fixed'))
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate Savings
      const savings = Math.max(0, dailyBudget - dayExpenses);
      
      // Add to Piggy Bank
      currentAmount += savings;
      
      // Check for Upgrade
      // Levels: 30, 50, 100, 200, 500, 1000...
      const LEVELS = [30, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
      
      while (currentAmount >= capacity) {
        // Explode!
        history += capacity;
        currentAmount -= capacity;
        
        // Find next level
        const currentIdx = LEVELS.indexOf(capacity);
        if (currentIdx < LEVELS.length - 1) {
          capacity = LEVELS[currentIdx + 1];
        }
      }

      processingDate = addDays(processingDate, 1);
    }

    // Update Store
    updatePiggyBank({
      currentAmount,
      capacityLevel: capacity,
      totalSavedHistory: history,
    });
    setLastProcessedDate(format(addDays(today, -1), 'yyyy-MM-dd')); // Set to yesterday

  }, [settings, transactions, piggyBank, lastProcessedDate, updatePiggyBank, setLastProcessedDate]);

  return null; // Logic only
};
