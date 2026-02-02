---
name: "cloud-sync-manual-genesis"
description: "Implements reliable cloud sync using Manual Trigger + Genesis Push pattern. Invoke when user faces sync conflicts, data loss on refresh, or needs multi-device synchronization logic."
---

# Cloud Sync: Manual Trigger & Genesis Push Pattern

This skill implements a robust data synchronization strategy for cross-platform apps (Web/Mobile/PC), specifically designed to prevent "silent data loss" and "zombie data" issues.

## 🌟 Core Philosophy
1.  **Manual Over Auto**: Critical data saves (Settings, Global Config) should be triggered MANUALLY by the user, not by `useEffect` auto-hooks.
2.  **Genesis Push**: If the cloud is empty, NEVER overwrite local data with empty cloud data. Instead, assume this is a "Genesis" event and push local data to the cloud.
3.  **Extreme Logging**: Every sync action must log its lifecycle (`STARTING`, `SUCCESS`, `FAILED`) to the console for easier debugging.

## � Hall of Failures (Anti-Patterns)
*Lessons learned from real-world debugging sessions.*

### 1. The "Login Bounce" (Race Condition)
*   **Failure**: Setting local state (`username`) -> triggering auto-sync (Push) -> simultaneously pulling cloud data (Pull). The Pull overwrites the local username with empty data before the Push completes.
*   **Symptom**: User logs in, sees a flash of the app, then immediately bounces back to the login screen.
*   **Solution**: **Atomic Login**. Do not set local state first. Pass the username directly to the Pull function. Only update local state *after* the Pull logic decides whether to load cloud data or initialize as a new user.

### 2. The "Silent Wipe" (Data Overwrite)
*   **Failure**: Browser B opens -> Local state is empty -> Auto-sync triggers -> Pushes empty state to Cloud -> Cloud data is wiped.
*   **Symptom**: User opens the app on a second device, and suddenly all data on the first device disappears.
*   **Solution**: **Circuit Breaker (`isInitialized`)**. Never allow a Push (Save) operation until a Pull (Load) has successfully completed and verified the cloud state.

### 3. The "Stale Start" (Missing Sync)
*   **Failure**: Browser B opens -> No auto-pull -> Shows empty local data instead of existing cloud data.
*   **Symptom**: User sees "Current Account: UserA" but 0 budget/expenses, even though CloudBase has data.
*   **Solution**: **Startup Sync**. Use `useEffect` on app mount to force a Pull if a username exists but the app isn't initialized.

### 4. The "400 Bad Request" (Invalid ID)
*   **Failure**: Using raw user input as Document ID. Spaces or empty strings cause API crashes.
*   **Symptom**: Console shows "Failed to load resource: status of 400".
*   **Solution**: **Strict Validation**. Always `trim()` and validate inputs before attempting any cloud API call.

## 🛡️ The Holy Trinity of Sync Safety

To guarantee data integrity, every app must implement these three mechanisms:

### 1. Atomic Login (No Race Conditions)
Don't rely on `useEffect` to react to username changes for the initial load. Make the login button trigger the pull directly.

```typescript
// LoginOverlay.tsx
const handleLogin = async () => {
  const safeUsername = input.trim();
  if (!safeUsername) return;
  
  // DIRECT call, passing username explicitly
  await pullFromCloud(safeUsername); 
};
```

### 2. Circuit Breaker (No Blind Overwrites)
Prevent the app from saving data until it knows what's in the cloud.

```typescript
// useAppStore.ts
interface AppState {
  isInitialized: boolean; // Default: false
}

const triggerSync = (state) => {
  // 🛑 BLOCKER: Stop if we haven't pulled yet
  if (!state.isInitialized) return; 
  
  saveUserState(state.username, state);
};

pullFromCloud: async (username) => {
  const data = await fetch(username);
  set({ 
    ...data, 
    isInitialized: true // ✅ UNBLOCK: Now we can save
  }); 
}
```

### 3. Startup Sync (Always Fresh)
Ensure the app is up-to-date when the user opens it or refreshes the page.

```typescript
// App.tsx
useEffect(() => {
  // If we have a user but haven't verified cloud state...
  if (settings.username && !isInitialized) {
    pullFromCloud(); // Force a pull
  }
}, [settings.username, isInitialized]);
```

## �🛠️ Implementation Steps

### 1. Store Logic (Zustand Example)
Modify your store (e.g., `useAppStore.ts`) to include explicit `save` and `pull` actions with logging.

```typescript
interface AppState {
  // ... state properties
  saveUserState: () => Promise<void>;
  pullFromCloud: (username?: string) => Promise<void>;
}

// ... inside create()
saveUserState: async () => {
  const state = get();
  if (!state.username) return;

  console.log('[SAVE STARTING] Pushing data to cloud...', state);
  try {
    await db.collection('data').doc(state.username).set(state);
    console.log('[SAVE SUCCESS] ✅ Data saved!');
  } catch (e) {
    console.error('[SAVE FAILED] ❌', e);
  }
},

pullFromCloud: async (username) => {
  console.log(`[PULL STARTING] Fetching for ${username}...`);
  try {
    const cloudData = await db.collection('data').doc(username).get();
    
    if (cloudData.exists) {
      console.log('[PULL FOUND] ☁️ Syncing Cloud -> Local');
      set({ ...cloudData.data(), isInitialized: true });
    } else {
      // GENESIS LOGIC: Cloud is empty, so we push Local -> Cloud
      console.log('[PULL EMPTY] ☁️ Genesis Push: Local -> Cloud');
      await get().saveUserState(); 
      set({ isInitialized: true });
    }
  } catch (e) {
    console.error('[PULL FAILED]', e);
    // Always initialize to unblock the app
    set({ isInitialized: true });
  }
}
```

### 2. Disable Auto-Sync Hooks
Remove any `useEffect` that listens to state changes and auto-saves.
**Why?** Auto-saves often trigger before data is fully loaded, causing empty state to overwrite cloud data.

### 3. Connect Manual Trigger
In your Settings or Save button component:

```typescript
const handleSave = async () => {
  // 1. Update local state
  updateSettings({ ...newSettings });
  
  // 2. Explicitly call the sync function
  await saveUserState();
  
  // 3. Show feedback
  toast.success('Settings saved & synced!');
};
```

## ✅ Checklist for Success
- [ ] Auto-save hooks removed?
- [ ] `saveUserState` logs "STARTING" and "SUCCESS"?
- [ ] `pullFromCloud` handles the "Empty Cloud" case by pushing local data?
- [ ] UI provides clear feedback (e.g., "Saving..." spinner) during manual sync?
