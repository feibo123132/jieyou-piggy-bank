I will implement a mandatory "Login / Sync" modal at the app's entry point, blocking access until a username is provided.

### Architecture Change
We will introduce a `AuthGuard` or `LoginOverlay` component in `App.tsx`. If `username` is missing in the store, this overlay will be shown instead of the main app content.

### Implementation Steps

1.  **Create Login Component (`src/components/auth/LoginOverlay.tsx`)**:
    *   **UI**: A centered card/modal matching the style of "Figure 1".
        *   Title: "登录 / 同步" (Login / Sync)
        *   Subtitle: "输入任意ID以标识您的身份（无需注册）"
        *   Input: "用户名 / 身份ID" (Username / ID)
        *   Button: "登录" (Login)
    *   **Logic**:
        *   On submit, save `username` to `useAppStore`.
        *   Trigger `pullFromCloud()` immediately.
        *   Once `username` is set, the overlay disappears (handled by parent conditional).

2.  **Modify App Entry (`src/App.tsx`)**:
    *   Import `useAppStore`.
    *   Check `settings.username`.
    *   If `!username`, render `<LoginOverlay />`.
    *   If `username`, render the existing `<Layout>` and routes.
    *   *Note*: This ensures no data is shown until login.

3.  **Cleanup Settings Page (`src/pages/SettingsPage.tsx`)**:
    *   Remove the "Username" input and "Pull from Cloud" button from the Settings page, as this is now handled at startup.
    *   (Optional) Keep a "Logout" or "Change User" button in Settings if needed, but for now, I'll focus on the entry requirement.

4.  **Verification**:
    *   Open App -> See Login Modal (cant see dashboard).
    *   Enter "zhangsan" -> Click Login -> Dashboard loads with data.
    *   Refresh -> Still logged in (persisted state).

### User Experience
This matches your request: "Clicking the APP immediately pops up a login window... display data after logging in."