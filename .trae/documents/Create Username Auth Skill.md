I will create a new skill named `username-auth-cloud-sync` that encapsulates the "Username Login" pattern we successfully implemented.

### Skill Design: `username-auth-cloud-sync`

This skill will serve as a blueprint for implementing a lightweight, passwordless authentication system backed by CloudBase (or similar DBs), specifically designed for "Anonymous + ID" login flows.

**Content to include:**
1.  **Core Concept**: The "Login Overlay" pattern (blocking UI until ID is provided).
2.  **State Management**: How to use `isInitialized` and `pullFromCloud` to manage login state safely.
3.  **Race Condition Prevention**: The "Atomic Login" logic (Fetch -> Set State).
4.  **UI Components**: A template for the `LoginOverlay.tsx` component.
5.  **Store Logic**: The `pullFromCloud` implementation with "New User" detection.

### Steps
1.  **Create Directory**: `.trae/skills/username-auth-cloud-sync/`
2.  **Create SKILL.md**:
    *   **Name**: `username-auth-cloud-sync`
    *   **Description**: "Implements a lightweight 'Username-only' login system with immediate cloud data sync. Invoke when user needs a simple ID-based auth flow without passwords."
    *   **Body**: Detailed templates for `LoginOverlay`, `useAppStore`, and `App.tsx` integration.

I will proceed to create this file structure.