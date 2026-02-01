I will rewrite the `pullFromCloud` function in `src/store/useAppStore.ts` to implement the "Genesis" logic as requested.

**Plan:**

1.  **Locate `pullFromCloud`**: I will modify the `pullFromCloud` method within the `useAppStore` definition in `src/store/useAppStore.ts`.
2.  **Implement Logic**:
    *   **Resolve Username**: Determine the username to use (either passed as an argument or retrieved from the current store settings).
    *   **Cloud Check**: Call `loadUserState(username)` to check if data exists in the cloud.
    *   **Case 1: Cloud Data Exists**:
        *   Update the local store state (settings, transactions, piggyBank, lastProcessedDate) using the data retrieved from the cloud.
        *   Set `isInitialized` to `true`.
        *   Log a success message.
    *   **Case 2: No Cloud Data (Genesis)**:
        *   Log that "Genesis" push is starting.
        *   Get the *current* local state using `get()`.
        *   Call `saveUserState(username, currentState)` to push the current local state to the cloud as the initial record.
        *   Set `isInitialized` to `true`.
3.  **Error Handling**: Wrap the logic in a `try/catch` block to handle any errors during login or data fetching/saving.

This change ensures that new accounts (or accounts with cleared data) immediately sync their local state to the cloud, preventing data loss and ensuring consistent state management.