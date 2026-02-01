I will fix the critical data loss issue by correcting the `pullFromCloud` logic in `src/store/useAppStore.ts`.

### The Problem
You reported that even Browser A (which had data) now shows empty data (Fig 1), and there are no console errors.
This strongly suggests that `pullFromCloud` executed, found **no data** in the cloud (or failed to fetch it correctly), and then **overwrote** the local state with `DEFAULT_SETTINGS` (empty data).

**Why did Browser A lose data?**
1.  Browser A started up.
2.  `useEffect` triggered `pullFromCloud`.
3.  `pullFromCloud` called `loadUserState(username)`.
4.  If `loadUserState` returned `null` (e.g., network glitch, or maybe the cloud document was accidentally deleted or empty), the code executed:
    ```typescript
    } else if (targetUsername) {
        // New user path...
        set({ settings: { ...state.settings, username: targetUsername }, isInitialized: true });
        triggerSync(get()); // <--- DANGER!
    }
    ```
5.  It treated Browser A as a "New User" because the cloud fetch returned nothing.
6.  It reset the local state (effectively) and then **IMMEDIATELY PUSHED (triggerSync)** this empty state back to the cloud.
7.  Now the cloud is empty. Browser B pulls the empty cloud data. Everyone has 0.

### The Solution

1.  **Stop the "New User" overwrite**:
    *   If `loadUserState` returns `null` (data not found), we should **NOT** blindly assume it's a new user and overwrite local data if we *already have* local data.
    *   **Logic Change**:
        *   If Cloud has data -> Use Cloud data (Sync).
        *   If Cloud has NO data ->
            *   Check if Local has data (e.g., `transactions.length > 0` or `monthlyBudget > 0`).
            *   If Local has data -> **Push Local to Cloud** (This is the "First Sync" / "Recovery" scenario).
            *   If Local has NO data -> Only *then* treat as a truly new user (keep defaults).

2.  **Fix `pullFromCloud` implementation**:
    *   Current logic:
        ```typescript
        if (cloudData) {
            // Set local from cloud
        } else if (targetUsername) {
           // Set local to default AND sync
        }
        ```
    *   New Logic:
        ```typescript
        if (cloudData) {
            // Set local from cloud
        } else {
            // Cloud is empty.
            // Do we have local data worth saving?
            const current = get();
            if (current.transactions.length > 0 || current.settings.monthlyBudget > 0) {
                 // We have local data, but cloud is empty. Push our data to cloud!
                 triggerSync(current);
            } else {
                 // We are truly empty. Just init.
            }
        }
        ```

### Implementation Plan
1.  **Modify `src/store/useAppStore.ts`**:
    *   Update `pullFromCloud` to handle the "Cloud Empty / Local Full" scenario.
    *   Ensure `isInitialized` is set to true in all paths.

This ensures that if you are the first one to sync (Browser A), your data uploads instead of being wiped out.