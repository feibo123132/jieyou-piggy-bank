---
name: tencent-cloudbase-sync
description: "Guides the implementation of cross-platform (Mobile/PC/Web) data synchronization using Tencent CloudBase. Invoke when user wants to set up cloud storage, backend sync, or resolve 'zombie data' issues."
---

# Tencent CloudBase Data Synchronization

This skill provides a proven pattern for syncing data across multiple devices (Mobile, PC, Browsers) using Tencent CloudBase (TCB) as the serverless backend.

## 🚀 Core Architecture

1.  **Frontend**: React/Vue/Vanilla JS using `@cloudbase/js-sdk`.
2.  **Backend**: Tencent CloudBase (Database + Auth).
3.  **Strategy**: "Cloud as Source of Truth" with local optimistic updates.

## 🛠️ Implementation Steps

### 1. SDK Initialization (Singleton Pattern)
Avoid multiple instances. Create a single `cloudbase.ts` or `lib/cloudbase.ts` file.

```typescript
import cloudbase from '@cloudbase/js-sdk';

export const app = cloudbase.init({
  env: 'your-env-id-here', // Get from TCB Console
  region: 'ap-shanghai'    // e.g., ap-shanghai
});

export const auth = app.auth();
export const db = app.database();
```

### 2. Authentication (Crucial for Data Isolation)
Even for public apps, use **Anonymous Login** to generate a unique `uid` for each user. This ensures users only sync their own data.

```typescript
async function initAuth() {
  const loginState = await auth.getLoginState();
  if (!loginState) {
    await auth.anonymousAuthProvider().signIn();
  }
  return auth.currentUser;
}
```

### 3. Data Synchronization Logic (The "Zombie Data" Fix)
**Problem**: If you delete data locally but the cloud sync simply "fetches all", deleted items might reappear if the cloud doesn't know they are deleted.
**Solution**: Use a `deletedAt` flag (Soft Delete) or explicitly handle deletions during sync.

**Robust Sync Pattern**:
1.  **Fetch**: Get all records from Cloud where `_openid` matches current user.
2.  **Merge**:
    *   Map cloud records to local state.
    *   **CRITICAL**: Check for `deletedAt` field. If `record.deletedAt` exists, filter it out from the UI, but ensure local storage also marks it as deleted.
    *   Do NOT blindly append cloud data to local data.

```typescript
// Example: Syncing Mood Records
const syncFromCloud = async () => {
  const res = await db.collection('mood_records').where({
    _openid: '{openid}' // TCB auto-injects this for security
  }).get();
  
  const validRecords = res.data
    .map(item => ({
        ...item,
        // Ensure dates are parsed correctly
        timestamp: new Date(item.timestamp).toISOString()
    }))
    .filter(item => !item.deletedAt); // HIDE deleted items

  // Update local store
  set({ records: validRecords });
};
```

### 4. Trigger Sync on State Changes (The "Auto-Upload" Lesson)
**Lesson Learned**: It is not enough to just have a sync function. You must explicitly hook it into your data modification actions (Add/Update/Delete).

**Implementation Pattern**:
Inside your Store or State Management (e.g., Zustand, Redux), whenever you update local state, immediately try to sync that specific change to the cloud.

```typescript
// Zustand Store Example
addTransaction: (transaction) => set((state) => {
  // 1. Optimistic Update (Immediate UI feedback)
  const newTransactions = [...state.transactions, transaction];
  
  // 2. Trigger Cloud Sync (Fire and Forget)
  if (state.settings.cloudEnvId) {
    const app = initCloudBase(state.settings.cloudEnvId);
    if (app) {
       // Ensure auth before write
       loginAnonymous().then(() => {
          // Actual Cloud Write
          addTransactionToCloud(transaction);
       }).catch(console.error);
    }
  }

  return { transactions: newTransactions };
}),
```

### 5. Cross-Platform Compatibility
*   **Audio/Media**: Mobile browsers (iOS Safari/Android) block auto-playing media. Use "User Interaction Triggers" (play on click) rather than `useEffect` auto-play.
*   **Layout**: Use responsive units (Tailwind `sm:`, `md:`) to handle PC vs Mobile UI differences.

## ⚠️ Common Pitfalls
*   **Missing Auth**: Forgetting to login before querying DB results in "Permission Denied".
*   **Timezones**: Always store dates as ISO Strings or Timestamps in the cloud. Convert to local time only when rendering.
*   **Zombie Data**: Deleting locally but failing to push the "delete" action to the cloud. Always sync the `delete` operation immediately.
*   **Missing Triggers**: Forgetting to call the sync/upload function when data changes in the UI/Store.
