import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings, Transaction, PiggyBankState } from '@/types';
import { initCloudBase, loginAnonymous, addTransactionToCloud } from '@/lib/cloudbase';

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
  cloudEnvId: '',
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

      addTransaction: (transaction) => set((state) => {
        // Optimistic update locally
        const newTransactions = [...state.transactions, transaction];
        
        // Try to sync to cloud if envId is set
        if (state.settings.cloudEnvId) {
          // Ensure cloudbase is initialized
          const app = initCloudBase(state.settings.cloudEnvId);
          if (app) {
             loginAnonymous().then(() => {
                addTransactionToCloud(transaction);
             }).catch(console.error);
          }
        }

        return { transactions: newTransactions };
      }),

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
