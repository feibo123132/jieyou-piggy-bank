// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  MAX_TRANSACTION_TAGS,
  getDefaultTransactionTags,
  getPrimaryTransactionTag,
  hasIdeaTag,
  toggleTransactionTag,
} from './transactionTags';
import { TransactionTag } from '@/types';

describe('transaction tag helpers', () => {
  it('uses necessary as the default tag (new spendings default to 自然且必要)', () => {
    expect(getDefaultTransactionTags()).toEqual<TransactionTag[]>(['necessary']);
  });

  it('switches necessary to optional when optional is selected', () => {
    expect(toggleTransactionTag(['necessary'], 'optional')).toEqual<TransactionTag[]>(['optional']);
  });

  it('switches necessary to unnatural when unnatural is selected', () => {
    expect(toggleTransactionTag(['necessary'], 'unnatural')).toEqual<TransactionTag[]>(['unnatural']);
  });

  it('treats the three necessity tiers as mutually exclusive', () => {
    // necessary + optional → toggle off the optional (leaves necessary)
    expect(toggleTransactionTag(['necessary', 'optional'], 'optional')).toEqual<TransactionTag[]>(['necessary']);
    // unnatural → optional removes unnatural, keeps fixed
    expect(toggleTransactionTag(['unnatural', 'fixed'], 'optional')).toEqual<TransactionTag[]>(['fixed', 'optional']);
    // necessary → unnatural removes necessary, keeps idea
    expect(toggleTransactionTag(['necessary', 'idea'], 'unnatural')).toEqual<TransactionTag[]>(['idea', 'unnatural']);
  });

  it('keeps the selection within the 3-tag limit when swapping in optional', () => {
    expect(toggleTransactionTag(['necessary', 'fixed', 'idea'], 'optional')).toHaveLength(MAX_TRANSACTION_TAGS);
    expect(toggleTransactionTag(['necessary', 'fixed', 'idea'], 'optional')).toEqual<TransactionTag[]>([
      'fixed',
      'idea',
      'optional',
    ]);
  });

  it('does not remove the last remaining tag', () => {
    expect(toggleTransactionTag(['necessary'], 'necessary')).toEqual<TransactionTag[]>(['necessary']);
  });

  it('detects whether a day should show the idea marker', () => {
    expect(hasIdeaTag(['idea'])).toBe(true);
    expect(hasIdeaTag(['optional', 'fixed'])).toBe(false);
  });

  it('keeps the spending category as the primary display tag when idea is also selected', () => {
    expect(getPrimaryTransactionTag(['idea', 'fixed'])).toBe('fixed');
    expect(getPrimaryTransactionTag(['idea', 'necessary'])).toBe('necessary');
    expect(getPrimaryTransactionTag(['idea'])).toBe('idea');
  });
});
