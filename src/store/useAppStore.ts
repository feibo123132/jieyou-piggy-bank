import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings, Transaction, PiggyBankState } from '@/types';
import { loginAnonymous, getDb } from '@/lib/cloudbase';

interface AppState {
  settings: UserSettings;
  transactions: Transaction[];
  piggyBank: PiggyBankState;
  lastProcessedDate: string;

  setSettings: (settings: UserSettings) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  restoreTransaction: (id: string) => void;
  permanentlyDeleteTransaction: (id: string) => void;
  cleanupTrash: () => void;
  updatePiggyBank: (updates: Partial<PiggyBankState>) => void;
  setLastProcessedDate: (date: string) => void;
  resetApp: () => void;
  
  // Cloud Sync Actions
  // Modified to return a status instead of just void
  pullFromCloud: (username?: string) => Promise<{ status: 'success' | 'auth_required' | 'not_found' | 'error', data?: any }>;
  verifyAndLoadData: (password: string, pendingData: any) => Promise<boolean>;
  saveUserState: () => Promise<void>;
  
  // State Flags
  isInitialized: boolean;
  isLocked: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  monthlyBudget: 0,
  dailyBudget: 0, // Default to 0, means "not set" or "use fallback if any"
  fixedExpenses: [],
  isOnboarded: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  username: '',
  passwordHash: '',
};

const DEFAULT_PIGGY_BANK: PiggyBankState = {
  currentAmount: 0,
  capacityLevel: 30,
  totalSavedHistory: 0,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      transactions: [],
      piggyBank: DEFAULT_PIGGY_BANK,
      lastProcessedDate: new Date().toISOString().split('T')[0],
      isInitialized: false,
      isLocked: true, // Default to locked

      setSettings: (settings) => {
        set({ settings });
        get().saveUserState();
      },
      
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates, updatedAt: new Date().toISOString() }
        }));
        get().saveUserState();
      },

      addTransaction: (transaction) => {
        set((state) => {
          const newTransactions = [...state.transactions, transaction];
          return { transactions: newTransactions };
        });
        get().saveUserState();
      },

      updateTransaction: (transaction) => {
        set((state) => ({
          transactions: state.transactions.map(t => 
            t.id === transaction.id ? transaction : t
          )
        }));
        get().saveUserState();
      },

      removeTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.map(t => 
            t.id === id ? { ...t, deletedAt: new Date().toISOString() } : t
          )
        }));
        get().saveUserState();
      },

      restoreTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.map(t => 
            t.id === id ? { ...t, deletedAt: undefined } : t
          )
        }));
        get().saveUserState();
      },

      permanentlyDeleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter(t => t.id !== id)
        }));
        get().saveUserState();
      },

      cleanupTrash: () => {
        set((state) => {
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          return {
            transactions: state.transactions.filter(t => {
              if (!t.deletedAt) return true;
              return new Date(t.deletedAt) > sevenDaysAgo;
            })
          };
        });
      },

      updatePiggyBank: (updates) => {
        set((state) => ({
           piggyBank: { ...state.piggyBank, ...updates }
        }));
      },

      setLastProcessedDate: (date) => {
         set({ lastProcessedDate: date });
      },

      resetApp: () => set({
        settings: DEFAULT_SETTINGS,
        transactions: [],
        piggyBank: DEFAULT_PIGGY_BANK,
        lastProcessedDate: new Date().toISOString().split('T')[0],
        isInitialized: false,
        isLocked: true,
      }),

      saveUserState: async () => {
        const state = get();
        const { username } = state.settings;
        const { isInitialized } = state;

        // Construct full state explicitly, excluding helper functions
        const fullState = {
           settings: state.settings,
           transactions: state.transactions,
           piggyBank: state.piggyBank,
           lastProcessedDate: state.lastProcessedDate,
           updatedAt: new Date().toISOString() // Explicitly set save time
        };

        if (!username || !isInitialized) {
          console.error('[SAVE REJECTED] 拒绝保存：未登录或未初始化。', { username, isInitialized });
          return;
        }
        console.log('[SAVE STARTING] 准备将以下数据推送到云端...', { username, fullState });
        
        try {
          const db = getDb();
          const collection = db.collection('transactions');
          await collection.doc(username).set(fullState);
          console.log('[SAVE SUCCESS] ✅ 数据已成功保存到云端！');
        } catch (error) {
          console.error('[SAVE FAILED] ❌ 保存到云端失败！', error);
        }
      },

      // Helper to hash password
      // Note: In a real app, use a proper library or robust implementation.
      // Here we use a simple SHA-256 via Web Crypto API.
      
      pullFromCloud: async (targetUsername?: string) => {
        const username = targetUsername || get().settings.username;
        if (!username) {
             console.warn('[PULL SKIPPED] 无用户名，跳过拉取');
             return { status: 'error' };
        }

        console.log(`[PULL STARTING] 开始为用户 ${username} 拉取云端数据...`);
        try {
          await loginAnonymous();
          const db = getDb();
          const cloudDoc = await db.collection('transactions').doc(username).get();
          const cloudData = (cloudDoc.data && cloudDoc.data.length > 0) ? cloudDoc.data[0] : null;

          if (cloudData) {
            console.log('[PULL FOUND] ☁️ 在云端找到数据');
            
            // Check if password protection is enabled
            if (cloudData.settings && cloudData.settings.passwordHash) {
               console.log('[AUTH REQUIRED] 🔒 账号受密码保护，等待验证...');
               // Return the data to the caller (UI) to handle verification
               // Do NOT set state yet
               return { status: 'auth_required', data: cloudData };
            } else {
               // Legacy account or no password - load immediately
               console.log('[AUTH SKIP] 🔓 无密码，直接加载...');
               set({ 
                  settings: cloudData.settings,
                  transactions: cloudData.transactions,
                  piggyBank: cloudData.piggyBank,
                  lastProcessedDate: cloudData.lastProcessedDate,
                  isInitialized: true,
                  isLocked: false 
               });
               return { status: 'success' };
            }
          } else {
            console.log('[PULL EMPTY] ☁️ 云端无数据，准备新注册...');
            return { status: 'not_found' };
          }
        } catch (error) {
          console.error('[PULL FAILED] ❌ 从云端拉取数据失败！', error);
          // 失败时也要初始化，防止应用卡死，并允许用户离线使用
          set({ isInitialized: true, isLocked: false }); // Allow offline access if sync fails? Or lock? 
          // For now, let's assume offline access is okay but warn user.
          
          if (targetUsername) {
             set((state) => ({
              settings: { ...state.settings, username: targetUsername },
            }));
          }
          return { status: 'error' };
        }
      },

      verifyAndLoadData: async (password: string, pendingData: any) => {
        if (!pendingData || !pendingData.settings || !pendingData.settings.passwordHash) {
           return false;
        }

        // Hash the input password
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex === pendingData.settings.passwordHash) {
           console.log('[AUTH SUCCESS] 🔓 密码验证通过，加载数据...');
           set({ 
              settings: pendingData.settings,
              transactions: pendingData.transactions,
              piggyBank: pendingData.piggyBank,
              lastProcessedDate: pendingData.lastProcessedDate,
              isInitialized: true,
              isLocked: false
           });
           return true;
        } else {
           console.warn('[AUTH FAILED] 🔒 密码错误！');
           return false;
        }
      }
    }),
    {
      name: 'jieyou-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ...state,
        isInitialized: false, 
      } as any),
    }
  )
);
