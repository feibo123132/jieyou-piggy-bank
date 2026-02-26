---
name: "github-pages-deploy-flow"
description: "Automates the setup and troubleshooting of GitHub Actions for deploying web apps to GitHub Pages. Invoke when user wants to deploy to GitHub or fix 'Action failed' errors."
---

# GitHub Pages Deployment Flow (Modern & Classic)

This skill guides the setup of automated deployments to GitHub Pages using GitHub Actions, combining "Modern Mode" (Artifacts) best practices with common troubleshooting for React/Vite/Vue apps.

## 🎯 Use Case
- **Setup**: User wants to deploy a React/Vite/Vue app to GitHub Pages.
- **Fix**: Deployment failed with "Process completed with exit code 1" or 404 errors.
- **Optimize**: User wants to automate the build-and-publish process using modern standards.

## 🛑 Hall of Failures (Common Pitfalls)

### 1. The "Nested Root" Trap (Critical)
*   **Symptom**: Build fails because `package.json` cannot be found, or Action tries to run `npm install` in the wrong directory.
*   **Cause**: The project code is buried inside a subfolder (e.g., `repo-name/project-name/package.json`) instead of the repository root.
*   **Fix**: **Flatten the Directory Structure**. Move all files from the subfolder to the root so `package.json` is at the top level.
    *   *Anti-Pattern*: `working-directory: ./jieyou-app` (Prone to errors)
    *   *Best Practice*: Move files to `./` and remove the subfolder.

### 2. The "White Screen" of Death (Path Issues)
*   **Symptom**: Deployment succeeds, but the site is blank. Console shows "Failed to load resource" for JS/CSS files.
*   **Cause**: `index.html` references absolute paths `/`, but GitHub Pages hosts at `username.github.io/repo-name/`.
*   **Fix**: Set `base` path in `vite.config.ts`.
    ```typescript
    export default defineConfig({
      // Must match repo name exactly, slashes mandatory!
      base: '/repo-name/', 
      plugins: [react()],
    });
    ```

### 3. The "Refresh 404" Trap (Router Mode)
*   **Symptom**: Homepage works, but refreshing or clicking links leads to GitHub's 404 page.
*   **Cause**: `BrowserRouter` relies on server-side history API support, which static GitHub Pages lacks.
*   **Fix**: Switch to `HashRouter`.
    ```tsx
    // src/App.tsx
    import { HashRouter } from 'react-router-dom';
    // Wrap your Routes with HashRouter
    ```

## 🛠️ Implementation Steps (Modern Best Practices)

### Step 1: Directory & Config Audit
1.  Ensure `package.json` is in the root.
2.  Ensure `vite.config.ts` has `base` set to `/<repo-name>/`.
3.  Ensure SPA apps use `HashRouter`.

### Step 2: Configure Workflow (Modern Mode)
Create `.github/workflows/deploy.yml`. This modern approach uses Artifacts and does not pollute your repo with a `gh-pages` branch.

```yaml
name: Deploy static content to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

# Core Permissions (Required for OIDC & Pages)
permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm' # or npm/yarn

      - name: Install Dependencies
        run: pnpm install # or npm ci

      - name: Build
        run: pnpm run build # or npm run build

      # Key Step 1: Upload Artifact
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist' # Verify your build output dir

      # Key Step 2: Deploy to Pages
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 3: Configure Repository (Critical!)
Remind the user to:
1. Go to GitHub Repo -> **Settings** -> **Pages**.
2. Under "Build and deployment", select **Source**:
    *   **Modern Mode (Recommended)**: Select **GitHub Actions**.
    *   *Classic Mode (Legacy)*: Select "Deploy from a branch".

### Step 4: Commit and Push
Execute the following commands to trigger the first deployment.

**Important**: Check if the git repository is initialized first!

```bash
# Check if .git directory exists
if [ ! -d ".git" ]; then
  echo "Initializing new Git repository..."
  git init
  git branch -M main
  # Remember to add remote origin if not set
  # git remote add origin https://github.com/username/repo.git
fi

# Add the workflow file and config changes
git add .github/workflows/deploy.yml vite.config.ts

# Commit with a clear message
git commit -m "feat: add github pages deployment workflow"

# Push to main branch to trigger the Action
git push -u origin main
```

## ✅ Success Criteria
- [ ] `package.json` is at the root.
- [ ] `vite.config.ts` has correct `base` path.
- [ ] App uses `HashRouter`.
- [ ] Workflow file includes `pages: write` permissions.
- [ ] GitHub Pages Source setting is "GitHub Actions".
