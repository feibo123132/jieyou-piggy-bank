I will strictly implement the "Final Protocol" as requested: disable auto-sync, implement manual forced sync with extreme logging, and refactor the data flow.

**Plan:**

1.  **Refactor `src/store/useAppStore.ts`**:
    *   **Disable Auto-Save**: I will remove the `triggerSync` function and delete all calls to it from `setSettings`, `updateSettings`, `addTransaction`, `updatePiggyBank`, and `setLastProcessedDate`.
    *   **Implement `saveUserState`**: I will add `saveUserState` directly to the store interface and implementation. It will use the exact logic and "Extreme Logging" you provided (`[SAVE STARTING]`, `[SAVE SUCCESS]`, etc.), ensuring it only runs when `username` and `isInitialized` are valid.
    *   **Rewrite `pullFromCloud`**: I will replace the current logic with your requested "Genesis" logic + logging version (`[PULL STARTING]`, `[PULL FOUND]`, `[PULL EMPTY]`).
    *   **Dependencies**: I will import `getDb` from `@/lib/cloudbase` to ensure database access.

2.  **Update `src/pages/SettingsPage.tsx`**:
    *   **Connect Manual Trigger**: I will update the `handleSave` function for the "Save Settings" button.
    *   **Explicit Call**: It will now explicitly call `await saveUserState()` after updating the local settings, ensuring a forced sync happens only when the user intends it.

This approach eliminates the silent failures of auto-sync and provides full visibility into the sync process via the console logs.