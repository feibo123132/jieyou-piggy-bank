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
  it('uses optional as the default tag', () => {
    expect(getDefaultTransactionTags()).toEqual<TransactionTag[]>(['optional']);
  });

  it('switches optional to necessary when necessary is selected', () => {
    expect(toggleTransactionTag(['optional'], 'necessary')).toEqual<TransactionTag[]>(['necessary']);
  });

  it('switches necessary to optional when optional is selected', () => {
    expect(toggleTransactionTag(['necessary', 'fixed'], 'optional')).toEqual<TransactionTag[]>(['fixed', 'optional']);
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
    expect(toggleTransactionTag(['optional'], 'optional')).toEqual<TransactionTag[]>(['optional']);
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
