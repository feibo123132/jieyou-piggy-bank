I will fix the 400 Bad Request error by enforcing a valid Document ID format for the username.

### The Problem
The error "Failed to load resource: the server responded with a status of 400" in Figure 5 strongly suggests an invalid request to the CloudBase database. Since we are using `username` as the Document ID in `collection.doc(username)`, and CloudBase/MongoDB has strict rules for Document IDs (e.g., cannot be empty, cannot contain certain special characters, byte limit), an invalid username string is the most likely culprit.

### Analysis of the Screenshots
*   **Working (Fig 2)**: `jieyou2421415030` - This is alphanumeric, safe.
*   **Failing (Fig 4)**: The screenshot shows "当前账号" (Current Account) but the username field is partially obscured or empty in the UI context, or perhaps it's a specific string that violates rules.
*   **Hypothesis**: The user might have entered a username with spaces, special characters, or it's empty/undefined when the call is made, causing the API to reject the `doc(id)` lookup.

### The Solution

1.  **Sanitize Username (`src/lib/cloudbase.ts`)**:
    *   In `loadUserState` and `saveUserState`, validate the `username` before making the API call.
    *   Ensure `username` is a non-empty string.
    *   (Optional but recommended) Encode the username (e.g., `encodeURIComponent`) or strip invalid characters if we want to support special inputs, but for now, strict validation is safer.

2.  **Enhance Error Handling**:
    *   Log the exact `username` being requested when the error occurs to help debugging.

3.  **UI Validation (`src/components/auth/LoginOverlay.tsx`)**:
    *   Prevent users from logging in with empty or whitespace-only usernames.

### Implementation Plan

1.  **Modify `src/lib/cloudbase.ts`**:
    *   Add a check: `if (!username || typeof username !== 'string' || username.trim() === '') return;` inside `save` and `load` functions.
    *   Wrap the `doc(username)` call to catch potential ID format errors specifically.

2.  **Modify `src/components/auth/LoginOverlay.tsx`**:
    *   Ensure the input validation is strict about trimming whitespace.

This will prevent the app from sending malformed requests to CloudBase, eliminating the 400 error.