import { UserSettings, Transaction, PiggyBankState } from '@/types';

const STORAGE_KEYS = {
  USER_SETTINGS: 'jieyou_user_settings',
  TRANSACTIONS: 'jieyou_transactions',
  PIGGY_BANK_STATE: 'jieyou_piggy_bank_state',
};

// Default Initial States
const DEFAULT_SETTINGS: UserSettings = {
  monthlyBudget: 0,
  fixedExpenses: [],
  isOnboarded: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_PIGGY_BANK: PiggyBankState = {
  currentAmount: 0,
  capacityLevel: 30, // Start with 30
  totalSavedHistory: 0,
};

// Generic Storage Helper
function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage`, error);
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage`, error);
  }
}

// Specific Data Accessors
export const storage = {
  getSettings: () => getStorage<UserSettings>(STORAGE_KEYS.USER_SETTINGS, DEFAULT_SETTINGS),
  setSettings: (settings: UserSettings) => setStorage(STORAGE_KEYS.USER_SETTINGS, settings),

  getTransactions: () => getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []),
  setTransactions: (transactions: Transaction[]) => setStorage(STORAGE_KEYS.TRANSACTIONS, transactions),
  addTransaction: (transaction: Transaction) => {
    const transactions = storage.getTransactions();
    storage.setTransactions([...transactions, transaction]);
  },

  getPiggyBank: () => getStorage<PiggyBankState>(STORAGE_KEYS.PIGGY_BANK_STATE, DEFAULT_PIGGY_BANK),
  setPiggyBank: (state: PiggyBankState) => setStorage(STORAGE_KEYS.PIGGY_BANK_STATE, state),
  
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEYS.USER_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.PIGGY_BANK_STATE);
  }
};
