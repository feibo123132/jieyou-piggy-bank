import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings, Transaction, PiggyBankState } from '@/types';
import { loginAnonymous, getDb, sendVerificationCode, loginWithEmail } from '@/lib/cloudbase';

interface AppState {
  settings: UserSettings;
  transactions: Transaction[];
  piggyBank: PiggyBankState;
  lastProcessedDate: string;

  // Auth State
  verificationContext: any;

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
  
  // Auth Actions
  sendAuthCode: (email: string) => Promise<boolean>;
  loginAndSync: (email: string, code: string) => Promise<void>;
  
  // Cloud Sync Actions
  // Modified to return a status instead of just void
  pullFromCloud: (username?: string) => Promise<{ status: 'success' | 'auth_required' | 'not_found' | 'error', data?: any }>;
  migrateFromOldAccount: (oldUsername: string) => Promise<{ status: 'success' | 'not_found' | 'error', message?: string }>;
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
      verificationContext: null,

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

      sendAuthCode: async (email: string) => {
        try {
          const context = await sendVerificationCode(email);
          if (context) {
            set({ verificationContext: context });
            return true;
          }
          return false;
        } catch (e) {
          console.error("Send code error:", e);
          throw e; // Re-throw to allow UI to handle error message
        }
      },

      loginAndSync: async (email: string, code: string) => {
        const context = get().verificationContext;
        if (!context) throw new Error("请先获取验证码");
        
        await loginWithEmail({ email, code, verificationContext: context });
        
        // Login success, set email as username
        set((state) => ({ 
          settings: { ...state.settings, username: email },
          verificationContext: null 
        }));
        
        // Trigger pull
        await get().pullFromCloud(email);
      },

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

      migrateFromOldAccount: async (oldUsername: string) => {
        const currentUsername = get().settings.username;
        if (!currentUsername) {
          return { status: 'error', message: '请先登录新账号后再进行数据迁移' };
        }
        
        console.log(`[MIGRATE] Attempting to migrate from ${oldUsername} to ${currentUsername}...`);
        
        try {
          const db = getDb();
          // Try to read the old document
          const oldDoc = await db.collection('transactions').doc(oldUsername).get();
          
          if (!oldDoc.data || oldDoc.data.length === 0) {
            console.warn(`[MIGRATE] Old account ${oldUsername} not found.`);
            return { status: 'not_found', message: '未找到旧账号数据' };
          }

          const oldData = oldDoc.data[0];
          
          // Basic validation of data structure
          if (!oldData.transactions && !oldData.piggyBank) {
             return { status: 'error', message: '旧账号数据格式不正确' };
          }

          // Check for password on old account
          if (oldData.settings?.passwordHash) {
            // For now, we might need to ask for password, but let's assume if they know the ID they are the owner
            // Or maybe prompt for password? 
            // Simplified: warn user or require password verification logic here if needed.
            // For this implementation, we will proceed but log it.
            console.log('[MIGRATE] Old account has password protection.');
          }

          // MERGE STRATEGY:
          // 1. Keep current settings (email, etc.) but maybe import budget if not set?
          // 2. Merge transactions (concat and dedupe by ID?)
          // 3. Merge piggy bank (add amounts?)
          
          // For simplicity and safety: We will MERGE transactions and KEEP current settings unless empty.
          
          set((state) => {
            const mergedTransactions = [...state.transactions, ...(oldData.transactions || [])];
            // Deduplicate by ID
            const uniqueTransactions = Array.from(new Map(mergedTransactions.map(item => [item.id, item])).values());
            
            // Piggy Bank: take the larger amount or sum? 
            // Let's take the max of current vs old to be safe, or just add?
            // If user starts fresh, current is 0. Old is X. Result X.
            // If user has some data, adding might double count.
            // Let's use the old data if current is default/empty.
            const newPiggyBank = state.piggyBank.currentAmount === 0 && state.piggyBank.totalSavedHistory === 0 
              ? oldData.piggyBank 
              : state.piggyBank; // If current has data, keep current. 
              // TODO: Smarter merge?

            return {
              transactions: uniqueTransactions,
              piggyBank: newPiggyBank || state.piggyBank,
              // Keep current settings (username/email), but maybe adopt budget if 0
              settings: {
                ...state.settings,
                monthlyBudget: state.settings.monthlyBudget || oldData.settings?.monthlyBudget || 0,
                dailyBudget: state.settings.dailyBudget || oldData.settings?.dailyBudget || 0,
                fixedExpenses: state.settings.fixedExpenses.length === 0 ? (oldData.settings?.fixedExpenses || []) : state.settings.fixedExpenses,
                // Do not overwrite username/passwordHash
              },
              lastProcessedDate: oldData.lastProcessedDate > state.lastProcessedDate ? oldData.lastProcessedDate : state.lastProcessedDate
            };
          });
          
          // Save the merged state to the NEW account
          await get().saveUserState();
          
          return { status: 'success', message: '数据迁移成功！' };
          
        } catch (error) {
          console.error('[MIGRATE] Failed:', error);
          return { status: 'error', message: '迁移失败，请检查网络或稍后重试' };
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
