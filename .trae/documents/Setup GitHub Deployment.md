# GitHub Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configure the project for GitHub deployment (GitHub Pages) via GitHub Actions.

**Architecture:**
- Use `vite` for building the static assets.
- Configure `vite.config.ts` with the correct `base` path (assuming repo name `jieyou-piggy-bank`).
- Create a GitHub Action workflow `.github/workflows/deploy.yml` to automate the build and deploy process.

**Tech Stack:** GitHub Actions, Vite, Node.js.

---

### Task 1: Configure Vite Base Path

**Files:**
- Modify: `c:\Users\刘存安\Desktop\AIGC时代\😎🤓😋图像\素材\0829 Banana＆seedream\1204  全栈设计师\9、JIEYOU存钱罐\jieyou-app\vite.config.ts`

**Step 1: Set base path**
Modify `vite.config.ts` to add `base: '/jieyou-piggy-bank/',` (assuming this will be the repo name).

### Task 2: Create GitHub Action Workflow

**Files:**
- Create: `c:\Users\刘存安\Desktop\AIGC时代\😎🤓😋图像\素材\0829 Banana＆seedream\1204  全栈设计师\9、JIEYOU存钱罐\jieyou-app\.github\workflows\deploy.yml`

**Step 1: Create workflow file**
Content:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```
*Note: I need to verify if `jieyou-app` is the root of the repo or if the repo root is the parent folder. The user's current workspace seems to be `.../9、JIEYOU存钱罐`, but the react app is in `jieyou-app`. If the user initializes the git repo at `.../9、JIEYOU存钱罐`, then the workflow needs to change directory to `jieyou-app` before running npm commands, and upload artifact path should be `jieyou-app/dist`.*
*Wait, looking at the paths:*
`c:\Users\刘存安\Desktop\AIGC时代\😎🤓😋图像\素材\0829 Banana＆seedream\1204  全栈设计师\9、JIEYOU存钱罐` contains `jieyou-app`.
Usually users want the react app to be the repo root.
I will assume the user will initialize the git repo *inside* `jieyou-app` folder for simplicity, OR I will configure the workflow to handle the subfolder.
*Decision*: I will configure the workflow assuming the user initializes git in `jieyou-app` folder, as that's the standard for single-project repos. If they init in the parent, I'll advise them to init in `jieyou-app` or adjust the workflow.
Actually, let's just ask the user or provide instructions for initializing in `jieyou-app`. The file creation path I used above puts `.github` inside `jieyou-app`, so it assumes `jieyou-app` is the root.

### Task 3: Provide Instructions

**Step 1: Write instructions**
Tell the user:
1.  Initialize git in `jieyou-app`.
2.  Create repo `jieyou-piggy-bank` on GitHub.
3.  Push code.
4.  Enable GitHub Pages in repo settings (Source: GitHub Actions).

