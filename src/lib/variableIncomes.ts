import type { VariableIncome } from '../types/index.ts';

export const getVariableIncomesForMonth = (
  incomes: VariableIncome[],
  month: string,
): VariableIncome[] => incomes.filter((income) => income.month === month);

export const replaceVariableIncomesForMonth = (
  incomes: VariableIncome[],
  month: string,
  replacement: VariableIncome[],
): VariableIncome[] => [
  ...incomes.filter((income) => income.month !== month),
  ...replacement,
];
