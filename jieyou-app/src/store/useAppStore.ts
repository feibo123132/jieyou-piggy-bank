import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings, Transaction, PiggyBankState } from '@/types';

interface AppState {
  settings: UserSettings;
  transactions: Transaction[];
  piggyBank: PiggyBankState;
  lastProcessedDate: string;

  setSettings: (settings: UserSettings) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  addTransaction: (transaction: Transaction) => void;
  updatePiggyBank: (updates: Partial<PiggyBankState>) => void;
  setLastProcessedDate: (date: string) => void;
  resetApp: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  monthlyBudget: 0,
  fixedExpenses: [],
  isOnboarded: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_PIGGY_BANK: PiggyBankState = {
  currentAmount: 0,
  capacityLevel: 30,
  totalSavedHistory: 0,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      transactions: [],
      piggyBank: DEFAULT_PIGGY_BANK,
      lastProcessedDate: new Date().toISOString().split('T')[0],

      setSettings: (settings) => set({ settings }),
      
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates, updatedAt: new Date().toISOString() }
      })),

      addTransaction: (transaction) => set((state) => ({
        transactions: [...state.transactions, transaction]
      })),

      updatePiggyBank: (updates) => set((state) => ({
        piggyBank: { ...state.piggyBank, ...updates }
      })),

      setLastProcessedDate: (date) => set({ lastProcessedDate: date }),

      resetApp: () => set({
        settings: DEFAULT_SETTINGS,
        transactions: [],
        piggyBank: DEFAULT_PIGGY_BANK,
        lastProcessedDate: new Date().toISOString().split('T')[0],
      }),
    }),
    {
      name: 'jieyou-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
