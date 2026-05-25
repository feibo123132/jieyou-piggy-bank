import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings, Transaction, PiggyBankState } from '@/types';
import { loginAnonymous, getDb, sendVerificationCode, loginWithEmail } from '@/lib/cloudbase';

const nowIso = () => new Date().toISOString();
const toMillis = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

let cloudSaveQueue: Promise<void> = Promise.resolve();

interface AppState {
  settings: UserSettings;
  transactions: Transaction[];
  piggyBank: PiggyBankState;
  lastProcessedDate: string;
  lastLocalUpdateAt: string;
  hasUnsyncedChanges: boolean;

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
  verifyAndLoadData: (password: string, pendingData: any) => Promise<boolean>;
  saveUserState: () => Promise<void>;
  requireLogin: () => void;
  
  // State Flags
  isInitialized: boolean;
  isLocked: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  monthlyBudget: 0,
  dailyBudget: 0, // Default to 0, means "not set" or "use fallback if any"
  fixedExpenses: [],
  fixedExpensesByMonth: [],
  variableIncomes: [],
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
      lastLocalUpdateAt: nowIso(),
      hasUnsyncedChanges: false,
      isInitialized: false,
      isLocked: true, // Default to locked
      verificationContext: null,

      setSettings: (settings) => {
        set({ settings, lastLocalUpdateAt: nowIso(), hasUnsyncedChanges: true });
        get().saveUserState();
      },
      
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates, updatedAt: nowIso() },
          lastLocalUpdateAt: nowIso(),
          hasUnsyncedChanges: true
        }));
        get().saveUserState();
      },

      addTransaction: (transaction) => {
        set((state) => {
          const newTransactions = [...state.transactions, transaction];
          return {
            transactions: newTransactions,
            lastLocalUpdateAt: nowIso(),
            hasUnsyncedChanges: true
          };
        });
        get().saveUserState();
      },

      updateTransaction: (transaction) => {
        set((state) => ({
          transactions: state.transactions.map(t => 
            t.id === transaction.id ? transaction : t
          ),
          lastLocalUpdateAt: nowIso(),
          hasUnsyncedChanges: true
        }));
        get().saveUserState();
      },

      removeTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.map(t => 
            t.id === id ? { ...t, deletedAt: new Date().toISOString() } : t
          ),
          lastLocalUpdateAt: nowIso(),
          hasUnsyncedChanges: true
        }));
        get().saveUserState();
      },

      restoreTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.map(t => 
            t.id === id ? { ...t, deletedAt: undefined } : t
          ),
          lastLocalUpdateAt: nowIso(),
          hasUnsyncedChanges: true
        }));
        get().saveUserState();
      },

      permanentlyDeleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter(t => t.id !== id),
          lastLocalUpdateAt: nowIso(),
          hasUnsyncedChanges: true
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
            }),
            lastLocalUpdateAt: nowIso(),
            hasUnsyncedChanges: true
          };
        });
        get().saveUserState();
      },

      updatePiggyBank: (updates) => {
        set((state) => ({
           piggyBank: { ...state.piggyBank, ...updates },
           lastLocalUpdateAt: nowIso(),
           hasUnsyncedChanges: true
        }));
        get().saveUserState();
      },

      setLastProcessedDate: (date) => {
         set({ lastProcessedDate: date, lastLocalUpdateAt: nowIso(), hasUnsyncedChanges: true });
         get().saveUserState();
      },

      resetApp: () => set({
        settings: DEFAULT_SETTINGS,
        transactions: [],
        piggyBank: DEFAULT_PIGGY_BANK,
        lastProcessedDate: new Date().toISOString().split('T')[0],
        lastLocalUpdateAt: nowIso(),
        hasUnsyncedChanges: false,
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
        if (!context) throw new Error('Please request a verification code first.');
        
        await loginWithEmail({ email, code, verificationContext: context });
        
        // Login success, set email as username
        const normalizedEmail = email.trim();
        set((state) => ({ 
          settings: { ...state.settings, username: normalizedEmail },
          verificationContext: null 
        }));
        
        // Trigger pull
        const pullResult = await get().pullFromCloud(normalizedEmail);
        if (pullResult.status === 'not_found') {
          // First-time cloud user: unlock local usage and create an initial cloud snapshot
          set({ isInitialized: true, isLocked: false });
          await get().saveUserState();
        }
      },

      saveUserState: async () => {
        cloudSaveQueue = cloudSaveQueue
          .catch(() => undefined)
          .then(async () => {
            const state = get();
            const safeUsername = state.settings.username?.trim();

            if (!safeUsername || !state.isInitialized) {
              console.error('[SAVE REJECTED] Missing username or app not initialized.', {
                username: state.settings.username,
                isInitialized: state.isInitialized
              });
              return;
            }

            const snapshotUpdatedAt = state.lastLocalUpdateAt || nowIso();
            const snapshotUpdatedAtMs = toMillis(snapshotUpdatedAt);
            const fullState = {
              settings: state.settings,
              transactions: state.transactions,
              piggyBank: state.piggyBank,
              lastProcessedDate: state.lastProcessedDate,
              updatedAt: snapshotUpdatedAt
            };

            console.log('[SAVE STARTING] Uploading queued snapshot...', { username: safeUsername, updatedAt: snapshotUpdatedAt });

            try {
              const db = getDb();
              await db.collection('transactions').doc(safeUsername).set(fullState);

              set((current) => {
                // Newer local edits appeared while this request was in flight.
                if (toMillis(current.lastLocalUpdateAt) > snapshotUpdatedAtMs) {
                  return {};
                }
                return { hasUnsyncedChanges: false };
              });

              console.log('[SAVE SUCCESS] Snapshot saved to cloud.');
            } catch (error) {
              set({ hasUnsyncedChanges: true });
              console.error('[SAVE FAILED] Failed to save snapshot to cloud.', error);
            }
          });

        return cloudSaveQueue;
      },

      // Helper to hash password
      // Note: In a real app, use a proper library or robust implementation.
      // Here we use a simple SHA-256 via Web Crypto API.
      
      pullFromCloud: async (targetUsername?: string) => {
        const username = (targetUsername || get().settings.username || '').trim();
        if (!username) {
             console.warn('[PULL SKIPPED] Missing username.');
             return { status: 'error' };
        }

        console.log(`[PULL STARTING] Pulling data for ${username}...`);
        try {
          await loginAnonymous();
          const db = getDb();
          const cloudDoc = await db.collection('transactions').doc(username).get();
          const rawData = cloudDoc?.data;
          const cloudData = Array.isArray(rawData)
            ? (rawData.length > 0 ? rawData[0] : null)
            : (rawData || null);

          if (cloudData) {
            console.log('[PULL FOUND] Cloud document exists.');
            
            // Check if password protection is enabled
            if (cloudData.settings && cloudData.settings.passwordHash) {
               console.log('[AUTH REQUIRED] Password verification required.');
               // Return the data to the caller (UI) to handle verification
               // Do NOT set state yet
               return { status: 'auth_required', data: cloudData };
            } else {
               const currentState = get();
               const localUpdatedAtMs = toMillis(currentState.lastLocalUpdateAt || currentState.settings.updatedAt);
               const cloudUpdatedAt = cloudData.updatedAt || cloudData.settings?.updatedAt;
               const cloudUpdatedAtMs = toMillis(cloudUpdatedAt);
               const hasLocalData = currentState.transactions.length > 0 || currentState.settings.isOnboarded;
               const shouldKeepLocal = currentState.hasUnsyncedChanges && hasLocalData && localUpdatedAtMs >= cloudUpdatedAtMs;

               if (shouldKeepLocal) {
                 console.warn('[PULL MERGE] Local unsynced data is newer. Keep local and push to cloud.');
                 set({
                   settings: { ...currentState.settings, username },
                   isInitialized: true,
                   isLocked: false
                 });
                 await get().saveUserState();
                 return { status: 'success' };
               }

               // Cloud data is newer/equal, safe to load.
               set({
                 settings: cloudData.settings,
                 transactions: cloudData.transactions,
                 piggyBank: cloudData.piggyBank,
                 lastProcessedDate: cloudData.lastProcessedDate,
                 lastLocalUpdateAt: cloudUpdatedAt || nowIso(),
                 hasUnsyncedChanges: false,
                 isInitialized: true,
                 isLocked: false
               });
               return { status: 'success' };
            }
          } else {
            console.log('[PULL EMPTY] No cloud data found.');
            // Critical: mark initialized here, otherwise all later saves stay blocked.
            set((state) => ({
              settings: { ...state.settings, username },
              isInitialized: true,
              isLocked: false
            }));
            return { status: 'not_found' };
          }
        } catch (error) {
          console.error('[PULL FAILED] Failed to pull cloud data.', error);
          // Keep locked on failure so the app does not continue writing offline data silently.
          set({ isInitialized: false, isLocked: true });
          
          if (targetUsername) {
             set((state) => ({
              settings: { ...state.settings, username: targetUsername },
            }));
          }
          return { status: 'error' };
        }
      },

      requireLogin: () => {
        set({ isLocked: true, isInitialized: false });
      },

      verifyAndLoadData: async (password: string, pendingData: any) => {
        if (!pendingData || !pendingData.settings || !pendingData.settings.passwordHash) {
           return false;
        }

        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex === pendingData.settings.passwordHash) {
           console.log('[AUTH SUCCESS] Password verified, loading cloud data.');
           set({
              settings: pendingData.settings,
              transactions: pendingData.transactions,
              piggyBank: pendingData.piggyBank,
              lastProcessedDate: pendingData.lastProcessedDate,
              lastLocalUpdateAt: pendingData.updatedAt || pendingData.settings?.updatedAt || nowIso(),
              hasUnsyncedChanges: false,
              isInitialized: true,
              isLocked: false
           });
           return true;
        } else {
           console.warn('[AUTH FAILED] Invalid password.');
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
        isLocked: true,
      } as any),
    }
  )
);


