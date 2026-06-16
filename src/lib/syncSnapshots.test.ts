// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Transaction } from '@/types';
import {
  buildSnapshotMeta,
  isCloudClearlyNewer,
  shouldPreferLocalSnapshot,
} from './syncSnapshots';

describe('sync snapshot conflict detection', () => {
  it('treats snapshots with the same transaction count but newer cloud date as different', () => {
    const localMeta = buildSnapshotMeta({
      updatedAt: '2026-06-16T08:00:00.000Z',
      transactions: makeTransactions(['2026-06-15']),
    });
    const cloudMeta = buildSnapshotMeta({
      updatedAt: '2026-06-16T08:00:00.000Z',
      transactions: makeTransactions(['2026-06-16']),
    });

    expect(localMeta.transactionCount).toBe(cloudMeta.transactionCount);
    expect(isCloudClearlyNewer(localMeta, cloudMeta)).toBe(true);
    expect(shouldPreferLocalSnapshot(localMeta, cloudMeta)).toBe(false);
  });

  it('prefers local only when local is at least as complete as cloud', () => {
    const localMeta = buildSnapshotMeta({
      updatedAt: '2026-06-16T09:00:00.000Z',
      transactions: makeTransactions(['2026-06-16']),
    });
    const cloudMeta = buildSnapshotMeta({
      updatedAt: '2026-06-16T08:00:00.000Z',
      transactions: makeTransactions(['2026-06-15']),
    });

    expect(shouldPreferLocalSnapshot(localMeta, cloudMeta)).toBe(true);
  });

  it('does not create a conflict from timestamp drift when transaction contents match', () => {
    const transactions = makeTransactions(['2026-06-15', '2026-06-15']);
    const localMeta = buildSnapshotMeta({
      updatedAt: '2026-06-16T09:00:00.000Z',
      transactions,
    });
    const cloudMeta = buildSnapshotMeta({
      updatedAt: '2026-06-16T08:00:00.000Z',
      transactions: [...transactions],
    });

    expect(localMeta.transactionCount).toBe(cloudMeta.transactionCount);
    expect(localMeta.maxTransactionDate).toBe(cloudMeta.maxTransactionDate);
    expect(shouldPreferLocalSnapshot(localMeta, cloudMeta)).toBe(false);
    expect(isCloudClearlyNewer(localMeta, cloudMeta)).toBe(false);
  });
});

const makeTransactions = (dates: string[]): Transaction[] =>
  dates.map((date, index) => ({
    id: `tx-${index}`,
    date,
    amount: 1,
    tags: ['unfixed'],
    createdAt: `${date}T00:00:00.000Z`,
  }));
