# Mobile Auth Compatibility Fix Plan

> **For Trae:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the "Identity Source Not Enabled" or compatibility issues preventing email verification login on mobile browsers (Xiaomi/QQ Browser).

**Architecture:** The issue likely stems from CloudBase SDK's persistence mechanism (`local` vs `session`) or cross-domain cookie restrictions on mobile browsers. We will force the persistence mode to `local` and add robust error handling for mobile environments.

**Tech Stack:** React, TypeScript, Tencent CloudBase SDK

---

### Task 1: Force Persistence Mode & Mobile Error Handling

**Files:**
- Modify: `src/lib/cloudbase.ts`

**Step 1: Update SDK Initialization**

Explicitly set persistence to `local` during initialization to ensure compatibility across mobile webviews.

```typescript
// src/lib/cloudbase.ts

// ... existing imports

export const app = tcb.init({
  env: import.meta.env.VITE_TCB_ENV_ID,
  persistence: 'local' // FORCE local storage persistence
});

// ... existing code
```

**Step 2: Add Detailed Error Logging**

Enhance `sendVerificationCode` to log the specific error code and message, which helps diagnose if it's a domain whitelist issue or auth method disabled issue.

```typescript
// src/lib/cloudbase.ts

export const sendVerificationCode = async (email: string) => {
  if (!auth) return null;
  try {
    const response = await auth.getVerification({ email });
    return response;
  } catch (error: any) {
    // Enhanced logging for mobile debugging
    console.error('Failed to send verification code:', {
      code: error.code,
      message: error.message,
      requestId: error.requestId
    });
    throw error; // Re-throw to let UI handle alert
  }
};
```

### Task 2: UI Feedback Enhancement

**Files:**
- Modify: `src/components/auth/LoginOverlay.tsx`

**Step 1: Improve Alert Messages**

Update the `alert` in `handleSendCode` to show the actual error message from the SDK, giving the user (and us) more clues.

```tsx
// src/components/auth/LoginOverlay.tsx

// ... inside handleSendCode catch block
} catch (e: any) {
  console.error("Send code error:", e);
  // Show specific error if available, otherwise generic
  alert(`验证码发送失败: ${e.message || "请稍后重试"}`);
  return false;
}
```

### Task 3: CloudBase Console Check (Manual)

**Action:**
Remind user to check "Web Safe Domains" in CloudBase Console.
- Mobile browsers/WebViews might be sending a different Referer or Origin.
- Ensure `feibo123132.github.io` is whitelisted.
