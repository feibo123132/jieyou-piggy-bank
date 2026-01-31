import { renderHook } from '@testing-library/react';
import { useBudgetSummary } from './useBudgetSummary';
import { useAppStore } from '@/store/useAppStore';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock useAppStore
vi.mock('@/store/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

describe('useBudgetSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly calculates monthlyRemaining', () => {
    // Setup mock return value
    const mockSettings = {
      monthlyBudget: 2000,
      fixedExpenses: [{ id: '1', amount: 500, label: '房租' }],
    };
    
    // Create transactions with dates in current month
    const today = new Date();
    // Ensure format is YYYY-MM-DD
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    
    const mockTransactions = [
      { id: '1', amount: 100, tags: [], date: `${yyyy}-${mm}-01` },
      { id: '2', amount: 50, tags: [], date: `${yyyy}-${mm}-02` },
      { id: '3', amount: 500, tags: ['fixed'], date: `${yyyy}-${mm}-03` },
    ];

    (useAppStore as any).mockReturnValue({
      settings: mockSettings,
      transactions: mockTransactions,
    });

    const { result } = renderHook(() => useBudgetSummary());

    expect(result.current.totalSettingsFixed).toBe(500);
    expect(result.current.totalVariableSpent).toBe(150); // 100 + 50
    expect(result.current.monthlyRemaining).toBe(1350); // 2000 - 500 - 150
  });
});
