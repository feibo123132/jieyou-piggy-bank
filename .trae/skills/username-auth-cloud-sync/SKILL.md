---
name: "username-auth-cloud-sync"
description: "Implements a lightweight 'Username-only' login system with immediate cloud data sync. Invoke when user needs a simple ID-based auth flow without passwords."
---

# Username Auth & Cloud Sync Pattern

This skill provides a complete blueprint for implementing a "Passwordless, Username-Only" authentication system backed by CloudBase (or similar DBs). It is designed to be lightweight, user-friendly, and robust against common sync issues.

## 🎯 Use Case
Use this pattern when:
- You want users to start using the app immediately (no registration friction).
- You need data to persist across devices using a simple "ID" or "Username".
- You want to avoid the complexity of full OAuth/Email-Password flows.

## 🏗️ Architecture Components

### 1. The "Login Overlay" (UI)
A modal that blocks the main app view until a valid ID is provided.

**Key Features:**
- **Blocking**: Users cannot interact with the app until logged in.
- **Auto-Trim**: Automatically removes whitespace to prevent "400 Bad Request" errors.
- **Direct Pull**: Triggers the data fetch immediately upon submission.

```tsx
// src/components/auth/LoginOverlay.tsx
import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export const LoginOverlay = () => {
  const { pullFromCloud } = useAppStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 1. Sanitize Input
    const safeUsername = input.trim();
    if (!safeUsername) return;

    setLoading(true);
    
    // 2. Atomic Login: Fetch Data & Set State in one go
    // Do NOT set local state before this line to avoid race conditions
    await pullFromCloud(safeUsername);
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-xl">
        <h1>Login / Sync</h1>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Enter your ID (e.g. user123)"
        />
        <button onClick={handleLogin} disabled={loading}>
          {loading ? 'Syncing...' : 'Enter'}
        </button>
      </div>
    </div>
  );
};
```

### 2. The Store Logic (State Management)
Manages the `isInitialized` flag and handles the critical `pullFromCloud` logic.

**Key Features:**
- **isInitialized**: A circuit breaker that prevents auto-saving until the cloud state is verified.
- **New User Handling**: If no data exists in the cloud, it initializes a fresh state with the provided username.
- **Persistence Exclusion**: `isInitialized` is NEVER saved to local storage, forcing a re-verification on every app reload.

```typescript
// src/store/useAppStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  settings: { username: string; /* ...other settings */ };
  isInitialized: boolean;
  pullFromCloud: (username?: string) => Promise<void>;
  // ... other actions
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: { username: '' },
      isInitialized: false, // Default to blocked

      pullFromCloud: async (targetUsername?: string) => {
        // Use provided username (login) or fallback to store (refresh)
        const username = targetUsername || get().settings.username;
        if (!username) return;

        try {
          const cloudData = await fetchCloudData(username); // Your API call

          if (cloudData) {
            // ✅ Case A: Existing User
            set({
              ...cloudData,
              isInitialized: true // Unblock saving
            });
          } else if (targetUsername) {
            // ✅ Case B: New User (First Login)
            set((state) => ({
              settings: { ...state.settings, username: targetUsername },
              isInitialized: true // Unblock saving
            }));
            // Optional: Trigger initial save here
          }
        } catch (e) {
          console.error("Sync failed", e);
          // Optional: Allow offline mode if needed, or keep blocked
        }
      },
      
      triggerSync: () => {
        const state = get();
        // 🛑 CIRCUIT BREAKER: Stop if not initialized
        if (!state.isInitialized) return;
        saveToCloud(state);
      }
    }),
    {
      name: 'app-storage',
      // CRITICAL: Do not persist isInitialized
      partialize: (state) => ({ ...state, isInitialized: false } as any),
    }
  )
);
```

### 3. The App Entry (Integration)
Connects the overlay and the startup sync logic.

**Key Features:**
- **Startup Sync**: Automatically pulls data on mount if a user was previously logged in.
- **Conditional Rendering**: Shows `LoginOverlay` if no user is logged in.

```tsx
// src/App.tsx
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { LoginOverlay } from '@/components/auth/LoginOverlay';

function App() {
  const { settings, isInitialized, pullFromCloud } = useAppStore();

  // 1. Startup Sync: Re-verify cloud state on reload
  useEffect(() => {
    if (settings.username && !isInitialized) {
      pullFromCloud();
    }
  }, [settings.username, isInitialized]);

  // 2. Auth Guard: Block access if not logged in
  if (!settings.username) {
    return <LoginOverlay />;
  }

  // 3. Main App Content
  return <MainLayout />;
}
```

## 🛡️ "Hall of Failures" Avoidance
*This pattern specifically prevents:*
1.  **Login Bounce**: By using atomic `pullFromCloud(username)`, we avoid race conditions between setting local state and fetching cloud data.
2.  **Silent Wipe**: The `isInitialized` flag prevents the app from pushing empty local data to the cloud before it has confirmed the cloud state.
3.  **400 Errors**: Input sanitization in the UI layer prevents invalid IDs from reaching the API.
