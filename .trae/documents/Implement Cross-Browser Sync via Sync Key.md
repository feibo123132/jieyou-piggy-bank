I will implement the "Username-based Full State Sync" as requested by the Chief Architect.

### Architecture Change
Instead of syncing individual transactions, we will sync the **entire application state** (Settings + Transactions + PiggyBank) as a single document in the `transactions` collection, using the `username` as the Document ID.

### Implementation Steps

1.  **Update Data Types (`src/types/index.ts`)**:
    *   Add `username?: string` to `UserSettings`.

2.  **Upgrade Cloud Logic (`src/lib/cloudbase.ts`)**:
    *   Implement `saveUserState(username, fullState)`: Uses `db.collection('transactions').doc(username).set(fullState)`.
    *   Implement `loadUserState(username)`: Uses `db.collection('transactions').doc(username).get()`.
    *   *Note*: This replaces the previous single-record sync logic.

3.  **Enhance Store (`src/store/useAppStore.ts`)**:
    *   Add `username` to default settings.
    *   Implement a **Global Sync Trigger**: Whenever `transactions`, `settings`, or `piggyBank` changes, check if `username` exists. If yes, trigger `saveUserState` (with debounce to prevent spamming).
    *   Add `pullFromCloud` action: To manually or automatically load data when a username is set.

4.  **Update Settings UI (`src/pages/SettingsPage.tsx`)**:
    *   Add "Username (for multi-device sync)" input field.
    *   Add logic: When username is saved, immediately attempt to `pullFromCloud` to restore user's data.

### Verification
*   User enters "zhangsan" in Browser A -> Data saved to doc "zhangsan".
*   User enters "zhangsan" in Browser B -> Data loaded from doc "zhangsan".
*   **Prerequisite**: You must ensure database permissions are open (as you confirmed).