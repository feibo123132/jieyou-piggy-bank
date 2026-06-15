import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings, Transaction, PiggyBankState } from '@/types';
import { loginAnonymous, getDb, sendVerificationCode, loginWithEmail, hasAuthenticatedSession } from '@/lib/cloudbase';

const nowIso = () => new Date().toISOString();
const toMillis = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const SYNC_BACKUP_KEY_PREFIX = 'jieyou-storage-backup:';
const MAX_SYNC_BACKUPS = 12;

type SnapshotMeta = {
  updatedAtMs: number;
  transactionCount: number;
  maxTransactionDate: string;
};

type CloudSnapshot = {
  settings: UserSettings;
  transactions: Transaction[];
  piggyBank: PiggyBankState;
  lastProcessedDate: string;
  updatedAt?: string;
};

type SyncConflict = {
  username: string;
  reason: 'pull_conflict' | 'save_blocked';
  createdAt: string;
  localMeta: SnapshotMeta;
  cloudMeta: SnapshotMeta;
  cloudSnapshot: CloudSnapshot;
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

const buildSnapshotMeta = (input: { updatedAt?: string; transactions?: Transaction[] }): SnapshotMeta => {
  const txs = Array.isArray(input.transactions) ? input.transactions : [];
  return {
    updatedAtMs: toMillis(input.updatedAt),
    transactionCount: txs.length,
    maxTransactionDate: maxDateFromTransactions(txs),
  };
};

const isCloudClearlyNewer = (localMeta: SnapshotMeta, cloudMeta: SnapshotMeta) => {
  if (cloudMeta.maxTransactionDate && localMeta.maxTransactionDate && cloudMeta.maxTransactionDate > localMeta.maxTransactionDate) {
    return true;
  }
  if (cloudMeta.transactionCount > localMeta.transactionCount && cloudMeta.updatedAtMs >= localMeta.updatedAtMs) {
    return true;
  }
  return false;
};

const shouldPreferLocalSnapshot = (localMeta: SnapshotMeta, cloudMeta: SnapshotMeta) => {
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

const buildLocalSnapshotBackupPayload = (state: Pick<AppState, 'settings' | 'transactions' | 'piggyBank' | 'lastProcessedDate' | 'lastLocalUpdateAt'>) => ({
  settings: state.settings,
  transactions: state.transactions,
  piggyBank: state.piggyBank,
  lastProcessedDate: state.lastProcessedDate,
  updatedAt: state.lastLocalUpdateAt || nowIso(),
});

const saveSafetyBackup = (label: string, payload: unknown) => {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = `${SYNC_BACKUP_KEY_PREFIX}${nowIso()}:${label}`;
    localStorage.setItem(key, JSON.stringify(payload));
    const backupKeys = Object.keys(localStorage)
      .filter((k) => k.startsWith(SYNC_BACKUP_KEY_PREFIX))
      .sort();
    while (backupKeys.length > MAX_SYNC_BACKUPS) {
      const oldest = backupKeys.shift();
      if (!oldest) break;
      localStorage.removeItem(oldest);
    }
  } catch (error) {
    console.warn('[SYNC BACKUP] Failed to save local safety backup.', error);
  }
};

let cloudSaveQueue: Promise<void> = Promise.resolve();

interface AppState {
  settings: UserSettings;
  transactions: Transaction[];
  piggyBank: PiggyBankState;
  lastProcessedDate: string;
  lastLocalUpdateAt: string;
  hasUnsyncedChanges: boolean;
  syncWarning: string | null;
  pendingSyncConflict: SyncConflict | null;

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
  saveUserState: (options?: { force?: boolean; reason?: string }) => Promise<void>;
  clearSyncWarning: () => void;
  forcePushLocalToCloud: () => Promise<void>;
  useCloudSnapshotFromConflict: () => Promise<void>;
  clearPendingSyncConflict: () => void;
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
      syncWarning: null,
      pendingSyncConflict: null,
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
        syncWarning: null,
        pendingSyncConflict: null,
        isInitialized: false,
        isLocked: true,
      }),

      clearSyncWarning: () => set({ syncWarning: null }),
      clearPendingSyncConflict: () => set({ pendingSyncConflict: null }),

      forcePushLocalToCloud: async () => {
        await get().saveUserState({ force: true, reason: 'manual_force_push_local' });
        const current = get();
        if (!current.hasUnsyncedChanges) {
          set({ pendingSyncConflict: null, syncWarning: null });
        }
      },

      useCloudSnapshotFromConflict: async () => {
        const conflict = get().pendingSyncConflict;
        if (!conflict) return;

        const current = get();
        saveSafetyBackup(
          `manual-use-cloud-${conflict.username}`,
          buildLocalSnapshotBackupPayload(current),
        );

        const cloudSnapshot = conflict.cloudSnapshot;
        set({
          settings: cloudSnapshot.settings,
          transactions: cloudSnapshot.transactions,
          piggyBank: cloudSnapshot.piggyBank,
          lastProcessedDate: cloudSnapshot.lastProcessedDate,
          lastLocalUpdateAt: cloudSnapshot.updatedAt || nowIso(),
          hasUnsyncedChanges: false,
          syncWarning: null,
          pendingSyncConflict: null,
          isInitialized: true,
          isLocked: false,
        });
      },

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

      saveUserState: async (options) => {
        cloudSaveQueue = cloudSaveQueue
          .catch(() => undefined)
          .then(async () => {
            const state = get();
            const safeUsername = state.settings.username?.trim();
            const forceSave = options?.force === true;

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
            const localMeta = buildSnapshotMeta({
              updatedAt: snapshotUpdatedAt,
              transactions: state.transactions,
            });

            console.log('[SAVE STARTING] Uploading queued snapshot...', { username: safeUsername, updatedAt: snapshotUpdatedAt });

            try {
              const hasSession = await hasAuthenticatedSession(safeUsername);
              if (!hasSession) {
                console.warn('[SAVE REJECTED] Authenticated session is missing. Login is required before cloud sync.', {
                  username: safeUsername,
                });
                set({ hasUnsyncedChanges: true });
                get().requireLogin();
                return;
              }

              const db = getDb();
              const cloudDoc = await db.collection('transactions').doc(safeUsername).get();
              const cloudRawData = cloudDoc?.data;
              const cloudData = Array.isArray(cloudRawData)
                ? (cloudRawData.length > 0 ? cloudRawData[0] : null)
                : (cloudRawData || null);

              if (!forceSave && cloudData) {
                const cloudMeta = buildSnapshotMeta({
                  updatedAt: cloudData.updatedAt || cloudData.settings?.updatedAt,
                  transactions: cloudData.transactions,
                });

                if (isCloudClearlyNewer(localMeta, cloudMeta)) {
                  saveSafetyBackup(`save-blocked-${safeUsername}`, buildLocalSnapshotBackupPayload(state));
                  set({
                    hasUnsyncedChanges: true,
                    syncWarning: '检测到云端数据比本地更新，已阻止自动覆盖。请先确认再同步。',
                    pendingSyncConflict: {
                      username: safeUsername,
                      reason: 'save_blocked',
                      createdAt: nowIso(),
                      localMeta,
                      cloudMeta,
                      cloudSnapshot: {
                        settings: cloudData.settings || DEFAULT_SETTINGS,
                        transactions: Array.isArray(cloudData.transactions) ? cloudData.transactions : [],
                        piggyBank: cloudData.piggyBank || DEFAULT_PIGGY_BANK,
                        lastProcessedDate: cloudData.lastProcessedDate || new Date().toISOString().split('T')[0],
                        updatedAt: cloudData.updatedAt || cloudData.settings?.updatedAt,
                      },
                    },
                  });
                  console.warn('[SAVE BLOCKED] Cloud snapshot appears newer; auto-upload aborted.', {
                    username: safeUsername,
                    localMeta,
                    cloudMeta,
                  });
                  return;
                }
              }

              await db.collection('transactions').doc(safeUsername).set(fullState);

              set((current) => {
                // Newer local edits appeared while this request was in flight.
                if (toMillis(current.lastLocalUpdateAt) > snapshotUpdatedAtMs) {
                  return {};
                }
                return { hasUnsyncedChanges: false, syncWarning: null, pendingSyncConflict: null };
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
               const localMeta = buildSnapshotMeta({
                 updatedAt: currentState.lastLocalUpdateAt || currentState.settings.updatedAt,
                 transactions: currentState.transactions,
               });
               const cloudMeta = buildSnapshotMeta({
                 updatedAt: cloudUpdatedAt,
                 transactions: cloudData.transactions,
               });
               const shouldPreferLocal = currentState.hasUnsyncedChanges
                 && hasLocalData
                 && localUpdatedAtMs >= cloudUpdatedAtMs
                 && shouldPreferLocalSnapshot(localMeta, cloudMeta);

               const applyCloudToLocal = (reason: string) => {
                 if (hasLocalData) {
                   saveSafetyBackup(`pre-pull-${reason}-${username}`, buildLocalSnapshotBackupPayload(currentState));
                 }
                 set({
                   settings: cloudData.settings,
                   transactions: cloudData.transactions,
                   piggyBank: cloudData.piggyBank,
                   lastProcessedDate: cloudData.lastProcessedDate,
                   lastLocalUpdateAt: cloudUpdatedAt || nowIso(),
                   hasUnsyncedChanges: false,
                   syncWarning: reason === 'cloud_newer'
                     ? '已优先使用云端较新的数据，并保留了一份本地安全备份。'
                     : null,
                   pendingSyncConflict: null,
                   isInitialized: true,
                   isLocked: false
                 });
               };

               if (shouldPreferLocal) {
                 console.warn('[PULL MERGE] Local snapshot appears newer. Keep local without auto-pushing cloud overwrite.', {
                   username,
                   localMeta,
                   cloudMeta,
                 });
                 set({
                   settings: { ...currentState.settings, username },
                   hasUnsyncedChanges: true,
                   syncWarning: '检测到本地与云端存在差异，已保留本地并暂停自动回写，请确认后再手动同步。',
                   pendingSyncConflict: {
                     username,
                     reason: 'pull_conflict',
                     createdAt: nowIso(),
                     localMeta,
                     cloudMeta,
                     cloudSnapshot: {
                       settings: cloudData.settings || DEFAULT_SETTINGS,
                       transactions: Array.isArray(cloudData.transactions) ? cloudData.transactions : [],
                       piggyBank: cloudData.piggyBank || DEFAULT_PIGGY_BANK,
                       lastProcessedDate: cloudData.lastProcessedDate || new Date().toISOString().split('T')[0],
                       updatedAt: cloudUpdatedAt,
                     },
                   },
                   isInitialized: true,
                   isLocked: false
                 });
                 return { status: 'success' };
               }

               // Cloud snapshot is newer or safer; load it and keep local backup for recovery.
               applyCloudToLocal(isCloudClearlyNewer(localMeta, cloudMeta) ? 'cloud_newer' : 'cloud_preferred');
               return { status: 'success' };
            }
          } else {
            console.log('[PULL EMPTY] No cloud data found.');
            // Critical: mark initialized here, otherwise all later saves stay blocked.
            set((state) => ({
              settings: { ...state.settings, username },
              syncWarning: null,
              pendingSyncConflict: null,
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
        set({ isLocked: true, isInitialized: false, syncWarning: null, pendingSyncConflict: null });
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
              syncWarning: null,
              pendingSyncConflict: null,
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
