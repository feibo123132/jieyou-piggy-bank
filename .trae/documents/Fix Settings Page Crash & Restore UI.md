# Settings Page Crash Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the "White Screen of Death" on the Settings Page caused by `ReferenceError: totalVariableSpent is not defined`.

**Analysis:**
- The error `Uncaught ReferenceError: totalVariableSpent is not defined` occurs at `SettingsPage.tsx:62`.
- I checked `SettingsPage.tsx` and found line 62:
  ```typescript
  const monthlyRemaining = Math.max(0, parseFloat(monthlyBudget) - totalFixed - totalVariableSpent);
  ```
- However, looking at the imports and variable declarations in the file:
  ```typescript
  import { useBudgetSummary } from '@/hooks/useBudgetSummary';
  // ...
  const SettingsPage: React.FC = () => {
    // ...
    const { settings, updateSettings, transactions } = useAppStore();
    
    // MISSING DESTRUCTURING HERE!
    // I previously planned to add: const { totalVariableSpent } = useBudgetSummary();
    // But in the current file content read above, this line is MISSING.
    
    const [monthlyBudget, setMonthlyBudget] = useState(settings.monthlyBudget.toString());
    // ...
  ```
- **Root Cause:** The variable `totalVariableSpent` is being used in the calculation but was never defined or extracted from the `useBudgetSummary` hook in the component body. I must have missed adding it or it got lost during a previous edit.

**Fix Strategy:**
- Add `const { totalVariableSpent } = useBudgetSummary();` inside the component.

**Tech Stack:** React, TypeScript.

---

### Task 1: Fix Variable Declaration in SettingsPage

**Files:**
- Modify: `c:\Users\刘存安\Desktop\AIGC时代\😎🤓😋图像\素材\0829 Banana＆seedream\1204  全栈设计师\9、JIEYOU存钱罐\jieyou-app\src\pages\SettingsPage.tsx`

**Step 1: Add missing hook destructuring**
Insert the following line at the beginning of the component (around line 16):
```typescript
  const { totalVariableSpent } = useBudgetSummary();
```

**Step 2: Verify**
- Open the Settings page in the browser.
- Ensure no white screen and no console errors.
- Check if the "Real-time Monthly Remaining" calculation works (although currently it's just calculated, I should probably display it too as per previous requirements, but the priority now is fixing the crash).
- *Self-Correction*: The previous requirement was "Add 'Real-time Budget' display below 'Monthly Budget' input".
- Looking at the current code, I see:
  ```typescript
  <p className="text-sm text-gray-500 mt-2">
    除去固定支出后，日均可用：<span className="text-primary font-bold">¥{dailyBudget}</span>
  </p>
  ```
- It seems I *also* forgot to add the UI to display `monthlyRemaining` in `SettingsPage.tsx`!
- So I will fix the crash AND add the missing display line.

**Step 3: Add UI for Real-time Remaining**
Add a display line below the "Daily Budget" display:
```typescript
  <p className="text-sm text-gray-500 mt-1">
    本月实时剩余：<span className="text-green-600 font-bold">¥{monthlyRemaining.toFixed(0)}</span>
  </p>
```

