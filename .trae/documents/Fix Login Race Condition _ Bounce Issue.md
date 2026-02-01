I will fix the "login bounce" issue caused by a race condition in state updates.

### The Problem
1.  User clicks "Login".
2.  `updateSettings` is called -> sets `settings.username` locally -> triggers `triggerSync`.
3.  `pullFromCloud` is called immediately after.
4.  **Race Condition**: `triggerSync` (push) and `pullFromCloud` (pull) run almost simultaneously.
5.  If `pullFromCloud` finishes *after* `updateSettings` but fetches *old/empty* data (or fails), it might overwrite the local store with data that has an empty `username` (or `undefined` settings, as fixed previously).
6.  The `App.tsx` checks `!settings.username` and renders `LoginOverlay` again, causing the bounce.

### The Solution

1.  **Modify `LoginOverlay.tsx`**:
    *   Do NOT call `updateSettings` first.
    *   Call `pullFromCloud(inputUsername)` directly. Pass the username to the function.
    *   Inside `pullFromCloud`:
        *   Fetch data.
        *   If data exists: Merge it and set state (including the username from cloud).
        *   If data does NOT exist (new user): Set state with `DEFAULT_SETTINGS` but **inject the new username**.
    *   This ensures `settings.username` is only set ONCE, when we are sure about the data state.

2.  **Refactor `useAppStore.ts`**:
    *   Update `pullFromCloud` to accept an optional `username` argument.
    *   If `username` is provided, use it to fetch.
    *   Logic update:
        *   Fetch Cloud Data.
        *   If found -> `set({ ...cloudData, settings: { ...cloudData.settings, username } })`
        *   If NOT found -> `set({ settings: { ...DEFAULT_SETTINGS, username } })` (Initialize new user)

### Detailed Steps

1.  **Update `useAppStore.ts`**:
    *   Change signature: `pullFromCloud: (username?: string) => Promise<void>`
    *   Handle the "New User" case explicitly by setting the username in the store even if cloud return is null.

2.  **Update `LoginOverlay.tsx`**:
    *   Remove `updateSettings({ username })` call.
    *   Call `await pullFromCloud(inputUsername)`.

This linearizes the flow: Fetch/Check -> Set State (with Username). No race, no bounce.