I will fix the white screen crash caused by undefined `settings` during cloud data pull.

### The Problem
When `pullFromCloud` retrieves data from CloudBase, it might return an object that doesn't fully match the expected `AppState` structure (e.g., missing `settings`). The current code blindly sets the state:
```typescript
set({
  settings: cloudData.settings, // If cloudData.settings is undefined...
  // ...
});
```
If `cloudData.settings` is `undefined`, the store's `settings` becomes `undefined`. Subsequently, `App.tsx` tries to access `settings.username` and crashes with `Cannot read properties of undefined`.

### The Solution

1.  **Modify `src/store/useAppStore.ts`**:
    *   In `pullFromCloud` action, add a validation/merge step.
    *   Ensure `cloudData.settings` exists before setting it.
    *   Even better, merge `cloudData.settings` with `DEFAULT_SETTINGS` to guarantee all fields exist.
    *   Apply similar safety checks for `transactions` and `piggyBank`.

2.  **Modify `src/App.tsx`**:
    *   Add a safety check: `if (!settings) return <LoginOverlay />;` (or a loading spinner) to handle transient states gracefully, though the store fix should prevent `settings` from ever being undefined.

### Detailed Fix for `useAppStore.ts`
```typescript
pullFromCloud: async () => {
  // ...
  if (cloudData) {
    set({
      settings: cloudData.settings || DEFAULT_SETTINGS, // Fallback
      transactions: cloudData.transactions || [],
      piggyBank: cloudData.piggyBank || DEFAULT_PIGGY_BANK,
      lastProcessedDate: cloudData.lastProcessedDate || new Date().toISOString().split('T')[0],
    });
  }
  // ...
}
```

This ensures that even if the cloud data is corrupt or empty, the app will recover with valid default states instead of crashing.