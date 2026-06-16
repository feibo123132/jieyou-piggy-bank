import type { Transaction } from '@/types';

export type SnapshotMeta = {
  updatedAtMs: number;
  transactionCount: number;
  maxTransactionDate: string;
  transactionFingerprint: string;
};

const toMillis = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const maxDateFromTransactions = (transactions: Transaction[] = []) => {
  let max = '';
  for (const tx of transactions) {
    const date = tx?.date || '';
    if (date && date > max) {
      max = date;
    }
  }
  return max;
};

export const buildSnapshotMeta = (input: { updatedAt?: string; transactions?: Transaction[] }): SnapshotMeta => {
  const txs = Array.isArray(input.transactions) ? input.transactions : [];
  return {
    updatedAtMs: toMillis(input.updatedAt),
    transactionCount: txs.length,
    maxTransactionDate: maxDateFromTransactions(txs),
    transactionFingerprint: buildTransactionFingerprint(txs),
  };
};

export const isCloudClearlyNewer = (localMeta: SnapshotMeta, cloudMeta: SnapshotMeta) => {
  if (localMeta.transactionFingerprint === cloudMeta.transactionFingerprint) {
    return false;
  }
  if (cloudMeta.maxTransactionDate && localMeta.maxTransactionDate && cloudMeta.maxTransactionDate > localMeta.maxTransactionDate) {
    return true;
  }
  if (cloudMeta.transactionCount > localMeta.transactionCount && cloudMeta.updatedAtMs >= localMeta.updatedAtMs) {
    return true;
  }
  return false;
};

export const shouldPreferLocalSnapshot = (localMeta: SnapshotMeta, cloudMeta: SnapshotMeta) => {
  if (localMeta.transactionFingerprint === cloudMeta.transactionFingerprint) {
    return false;
  }
  if (localMeta.maxTransactionDate && cloudMeta.maxTransactionDate && localMeta.maxTransactionDate < cloudMeta.maxTransactionDate) {
    return false;
  }
  if (localMeta.maxTransactionDate && cloudMeta.maxTransactionDate && localMeta.maxTransactionDate > cloudMeta.maxTransactionDate) {
    return true;
  }
  if (localMeta.updatedAtMs > cloudMeta.updatedAtMs && localMeta.transactionCount >= cloudMeta.transactionCount) {
    return true;
  }
  return false;
};

export const getSnapshotUpdatedAtMs = toMillis;

const buildTransactionFingerprint = (transactions: Transaction[]) =>
  transactions
    .map((tx) => [
      tx.id,
      tx.date,
      tx.amount,
      [...(tx.tags || [])].sort().join(','),
      tx.note || '',
      tx.createdAt || '',
      tx.deletedAt || '',
    ].join('\u001f'))
    .sort()
    .join('\u001e');
