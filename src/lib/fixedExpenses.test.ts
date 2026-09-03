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

  // 新增：category 字段透传
  it('passes through the optional `category` field on each fixed expense', () => {
    const mixed: FixedExpense[] = [
      { id: 'rent', label: '房租', amount: 700, category: 'necessary' },
      { id: 'netflix', label: 'Netflix', amount: 78, category: 'optional' },
      { id: 'luxury', label: '爱马仕', amount: 9999, category: 'unnatural' },
      { id: 'legacy', label: '老格式', amount: 120 }, // 无 category
    ];
    const snapshots: MonthlyFixedExpenseSnapshot[] = [
      { month: '2026-06', expenses: mixed },
    ];

    // getFixedExpensesForMonth：category 完整保留（不影响后续断言）
    expect(getFixedExpensesForMonth(snapshots, '2026-06', legacyFixed)).toEqual(mixed);

    // 即使源没传 category，老数据也不应丢失（向后兼容）
    expect(getFixedExpensesForMonth(snapshots, '2026-06', legacyFixed)[3].category).toBeUndefined();

    // saveFixedExpensesForMonth：保存快照后从快照重新读出来仍是同一份（且 category 透传）
    const saved = saveFixedExpensesForMonth([], '2026-06', mixed, false);
    expect(getFixedExpensesForMonth(saved, '2026-06', legacyFixed)).toEqual(mixed);
  });
});
