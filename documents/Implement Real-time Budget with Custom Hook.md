# Real-time Budget Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correctly implement the "Real-time Budget" (Monthly Remaining) feature and fix the `ReferenceError: monthlyRemaining is not defined` bug.

**Architecture:**
- Create a new custom hook `useBudgetSummary` to centralize the calculation logic for budgets (daily, monthly, remaining).
- This ensures consistency across `DashboardPage` and `SettingsPage`.
- The logic will be: `Monthly Remaining = Monthly Budget - Fixed Expenses (if applicable/or if tracked) - Total Daily Expenses (All tags)`.
- *Correction on Logic*: The user defined logic is `月度总预算 - 所有固定支出 - 本月至今的所有日常记账`. Note that "Fixed Expenses" in Settings are usually auto-deducted from the "Daily Budget" calculation. If we want "Real-time Remaining", we should subtract the fixed expenses *once* (either as a lump sum or if they are recorded as transactions).
- *Assumption*: "Fixed Expenses" in Settings are a plan. The user might not have recorded them as transactions yet. To be safe and "real-time", we should probably subtract the *planned* fixed expenses from the total budget, and then subtract any *actual* non-fixed transactions. Or, if we strictly follow "Monthly Budget - All Expenses", we subtract the planned fixed expenses + all recorded transactions.
- Let's stick to the user's specific formula request if possible, but refined: `RealTimeRemaining = MonthlyBudget - Sum(FixedExpensesSettings) - Sum(AllTransactionsThisMonth)`. Wait, if I add a "Fixed Expense" transaction, I shouldn't double count it against the Settings Fixed Expense.
- *Refined Logic*:
    - `TotalPlannedFixed` = Sum of items in Settings > Fixed Expenses.
    - `RealTimeRemaining` = `MonthlyBudget` - `TotalPlannedFixed` - `Sum(All Non-Fixed Transactions)`.
    - *Wait*, if the user records a "Fixed" transaction, it means they paid it. If we subtract `TotalPlannedFixed` upfront, we shouldn't subtract the *recorded* fixed transaction again?
    - Actually, the simplest interpretation for "Remaining Money in Pocket":
        - Start with `MonthlyBudget`.
        - Subtract `TotalPlannedFixed` (assuming these *will* be spent).
        - Subtract `TotalVariableSpent` (actual spending on food, etc.).
        - This equals "Available for Variable Spending".
    - But the user asked for "Real-time Budget (Monthly Remaining)".
    - Let's use the standard "Safe" formula:
        - `MonthlyRemaining` = `MonthlyBudget` - `TotalSpentSoFar`.
        - Where `TotalSpentSoFar` = `Sum(All Transactions in Current Month)`.
        - *But* the user mentioned "because I started late... many days empty".
        - If we just use `MonthlyBudget - TotalSpent`, it ignores the "Planned Fixed Expenses" that haven't happened yet?
        - The user's prompt says: "公式应为：月度总预算 - 所有固定支出 - 本月至今的所有日常记账".
        - Okay, I will implement exactly this: `MonthlyBudget - Sum(FixedExpensesList) - Sum(AllTransactionsThisMonth)`.
        - *Self-Correction*: If I record a transaction and tag it "Fixed", and I also have it in "FixedExpensesList", this formula subtracts it twice!
        - *Compromise*: I will assume "AllTransactionsThisMonth" refers to *Daily/Variable* transactions (as per the "Strict Quota" logic where Fixed are separate).
        - So: `Remaining = MonthlyBudget - TotalSettingsFixed - TotalTransactions(excluding 'fixed' tag)`.
        - If a user records a 'fixed' tag transaction, it's just for record keeping, but the budget was already deducted by the Settings.
        - *Final Logic*: `RealTimeRemaining = MonthlyBudget - TotalSettingsFixed - TotalTransactions(excluding 'fixed' tag)`.

**Tech Stack:** React, TypeScript, Zustand (existing store).

---

### Task 1: Create `useBudgetSummary` Hook

**Files:**
- Create: `c:\Users\刘存安\Desktop\AIGC时代\😎🤓😋图像\素材\0829 Banana＆seedream\1204  全栈设计师\9、JIEYOU存钱罐\jieyou-app\src\hooks\useBudgetSummary.ts`

**Step 1: Create the hook file**
Implement the logic:
```typescript
import { useAppStore } from '@/store/useAppStore';
import { isSameMonth } from 'date-fns';

export const useBudgetSummary = () => {
  const { settings, transactions } = useAppStore();
  
  const today = new Date();
  const currentMonthTransactions = transactions.filter(t => 
    isSameMonth(new Date(t.date), today)
  );

  const totalSettingsFixed = settings.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Expenses that eat into the "Discretionary Budget"
  // In Mode A, Fixed Expenses are pre-deducted.
  // So we only count Non-Fixed transactions here.
  const totalVariableSpent = currentMonthTransactions
    .filter(t => !t.tags.includes('fixed'))
    .reduce((sum, t) => sum + t.amount, 0);

  // Real-time Remaining
  // Formula: (MonthlyBudget - PlannedFixed) - ActualVariableSpent
  const monthlyRemaining = Math.max(0, settings.monthlyBudget - totalSettingsFixed - totalVariableSpent);

  return {
    monthlyRemaining,
    totalSettingsFixed,
    totalVariableSpent
  };
};
```

### Task 2: Integrate into `DashboardPage.tsx`

**Files:**
- Modify: `c:\Users\刘存安\Desktop\AIGC时代\😎🤓😋图像\素材\0829 Banana＆seedream\1204  全栈设计师\9、JIEYOU存钱罐\jieyou-app\src\pages\DashboardPage.tsx`

**Step 1: Use the hook**
- Import `useBudgetSummary`.
- Remove the inline calculation that caused the error.
- Use `monthlyRemaining` from the hook.

### Task 3: Integrate into `SettingsPage.tsx`

**Files:**
- Modify: `c:\Users\刘存安\Desktop\AIGC时代\😎🤓😋图像\素材\0829 Banana＆seedream\1204  全栈设计师\9、JIEYOU存钱罐\jieyou-app\src\pages\SettingsPage.tsx`

**Step 1: Use the hook**
- Import `useBudgetSummary`.
- Replace the inline calculation.
- Note: SettingsPage has local state for `monthlyBudget`. The hook uses global store state.
- For the *preview* in SettingsPage (while user is editing), we might need to calculate it locally using the *input* value, OR just show the current store value.
- User request: "在“月度总预算”...下方增加一项...用于灵活展示我目前的预算".
- If they are editing the budget, they probably want to see how it affects the remaining.
- I will adapt the logic in SettingsPage to use the *local input* `monthlyBudget` but the *store* expenses data, to give a live preview.

