import type { FixedExpense, MonthlyFixedExpenseSnapshot } from '@/types';

const isValidMonth = (value: string): boolean => /^\d{4}-\d{2}$/.test(value);

const compareMonth = (a: string, b: string): number => {
  if (a === b) return 0;
  return a > b ? 1 : -1;
};

const cloneExpenses = (expenses: FixedExpense[]): FixedExpense[] =>
  expenses.map((expense) => ({ ...expense }));

export const normalizeFixedExpenseSnapshots = (
  snapshots: MonthlyFixedExpenseSnapshot[] | undefined,
): MonthlyFixedExpenseSnapshot[] => {
  if (!snapshots || snapshots.length === 0) return [];

  const latestByMonth = new Map<string, FixedExpense[]>();
  snapshots.forEach((snapshot) => {
    if (!snapshot || !isValidMonth(snapshot.month) || !Array.isArray(snapshot.expenses)) return;
    latestByMonth.set(snapshot.month, cloneExpenses(snapshot.expenses));
  });

  return [...latestByMonth.entries()]
    .sort(([monthA], [monthB]) => compareMonth(monthA, monthB))
    .map(([month, expenses]) => ({
      month,
      expenses,
    }));
};

export const getFixedExpensesForMonth = (
  snapshots: MonthlyFixedExpenseSnapshot[] | undefined,
  month: string,
  legacyFixedExpenses: FixedExpense[],
): FixedExpense[] => {
  const normalized = normalizeFixedExpenseSnapshots(snapshots);
  if (!isValidMonth(month)) return cloneExpenses(legacyFixedExpenses || []);

  const exactMatch = normalized.find((snapshot) => snapshot.month === month);
  if (exactMatch) return cloneExpenses(exactMatch.expenses);

  const inherited = [...normalized]
    .reverse()
    .find((snapshot) => compareMonth(snapshot.month, month) < 0);

  if (inherited) return cloneExpenses(inherited.expenses);
  return cloneExpenses(legacyFixedExpenses || []);
};

export const saveFixedExpensesForMonth = (
  snapshots: MonthlyFixedExpenseSnapshot[] | undefined,
  month: string,
  expenses: FixedExpense[],
  applyFromMonth: boolean,
): MonthlyFixedExpenseSnapshot[] => {
  const normalized = normalizeFixedExpenseSnapshots(snapshots);
  if (!isValidMonth(month)) return normalized;

  const next = [...normalized];
  const index = next.findIndex((snapshot) => snapshot.month === month);
  const nextExpenses = cloneExpenses(expenses);

  if (index >= 0) {
    next[index] = { month, expenses: nextExpenses };
  } else {
    next.push({ month, expenses: nextExpenses });
  }

  const sorted = next.sort((a, b) => compareMonth(a.month, b.month));
  if (!applyFromMonth) return sorted;

  return sorted.map((snapshot) => {
    if (compareMonth(snapshot.month, month) < 0) return snapshot;
    return {
      month: snapshot.month,
      expenses: cloneExpenses(expenses),
    };
  });
};
