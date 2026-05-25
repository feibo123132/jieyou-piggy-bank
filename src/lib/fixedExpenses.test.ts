// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { FixedExpense, MonthlyFixedExpenseSnapshot } from '@/types';
import {
  getFixedExpensesForMonth,
  normalizeFixedExpenseSnapshots,
  saveFixedExpensesForMonth,
} from './fixedExpenses';

const legacyFixed: FixedExpense[] = [{ id: 'rent', label: '房租', amount: 700 }];

const juneSnapshot: MonthlyFixedExpenseSnapshot = {
  month: '2026-06',
  expenses: [{ id: 'rent', label: '房租', amount: 650 }],
};

const julySnapshot: MonthlyFixedExpenseSnapshot = {
  month: '2026-07',
  expenses: [{ id: 'rent', label: '房租', amount: 660 }],
};

describe('fixed expense helpers', () => {
  it('falls back to legacy fixed expenses before first snapshot month', () => {
    expect(getFixedExpensesForMonth([juneSnapshot], '2026-05', legacyFixed)).toEqual(legacyFixed);
  });

  it('inherits from the nearest previous snapshot when a month has no snapshot', () => {
    expect(getFixedExpensesForMonth([juneSnapshot], '2026-08', legacyFixed)).toEqual(juneSnapshot.expenses);
  });

  it('applies from selected month onward when requested', () => {
    const updatedJune = [{ id: 'rent', label: '房租', amount: 640 }];
    expect(saveFixedExpensesForMonth([juneSnapshot, julySnapshot], '2026-06', updatedJune, true)).toEqual([
      { month: '2026-06', expenses: updatedJune },
      { month: '2026-07', expenses: updatedJune },
    ]);
  });

  it('deduplicates snapshots by keeping the latest copy for each month', () => {
    const normalized = normalizeFixedExpenseSnapshots([
      juneSnapshot,
      { month: '2026-06', expenses: [{ id: 'rent', label: '房租', amount: 630 }] },
    ]);
    expect(normalized).toEqual([{ month: '2026-06', expenses: [{ id: 'rent', label: '房租', amount: 630 }] }]);
  });
});
