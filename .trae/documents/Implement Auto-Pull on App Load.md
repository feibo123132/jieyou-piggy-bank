I will implement the "Startup Sync & Circuit Breaker" mechanism as requested.

### Strategy
We need to ensure that the app *never* overwrites cloud data with an empty local state just because it hasn't finished loading yet. We will introduce an `isInitialized` flag that acts as a gatekeeper: no data is pushed to the cloud until we have successfully attempted to pull from it at least once.

### Implementation Steps

1.  **Modify `src/store/useAppStore.ts`**:
    *   **Add State**: Add `isInitialized: boolean` (default `false`) to `AppState` and `DEFAULT_SETTINGS` (or as a separate store property, likely separate to avoid persisting it as `false` forever). *Correction*: The instruction says "Add to Store state", but `persist` might save it. I should exclude `isInitialized` from persistence OR handle it carefully. Given the requirement "default false", it implies every app reload starts as uninitialized until verified. I will add it to the store interface but use `partialize` in `persist` options to *exclude* it from localStorage, ensuring it's always `false` on reload.
    *   **Update `pullFromCloud`**:
        *   Set `isInitialized = true` after a successful pull (whether data was found or confirmed new user).
    *   **Update `triggerSync` (Circuit Breaker)**:
        *   Add check: `if (!state.isInitialized) return;`
        *   This prevents any auto-save logic from firing before the initial pull is complete.

2.  **Modify `src/App.tsx`**:
    *   **Add Startup Sync**:
        *   Use `useEffect`.
        *   Condition: `if (settings.username && !isInitialized)`.
        *   Action: Call `pullFromCloud()`.

### Technical Details
*   **Persistence Exclusion**: I will modify the `persist` configuration in `useAppStore.ts` to exclude `isInitialized`. This is crucial because if we persist `isInitialized: true`, a fresh reload might think it's ready and push empty data before fetching.
*   **Type Update**: Update `AppState` interface to include `isInitialized`.

### Verification
*   **Scenario 1 (Fresh Load)**: App starts -> `isInitialized` is false -> `triggerSync` blocked -> `useEffect` calls `pull` -> Data loads -> `isInitialized` becomes true -> Normal operation.
*   **Scenario 2 (Browser B)**: Opens -> Pulls latest data -> Shows correct balance instead of 0.

This directly addresses the data loss risk and the synchronization failure.