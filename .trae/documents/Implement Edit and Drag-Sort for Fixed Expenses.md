I will implement the edit and drag-and-drop sort functionality for the "Fixed Expenses" list in `SettingsPage.tsx`.

### Implementation Steps:

1.  **Import Dependencies**:
    *   Import `Reorder` from `framer-motion` for drag-and-drop capabilities.
    *   Import `GripVertical`, `Pencil`, `Check`, `X` from `lucide-react` for the UI icons.

2.  **Add State for Editing**:
    *   Add `editingId` to track which expense is currently being edited.
    *   Add `editLabel` and `editAmount` to temporarily store the values during editing.

3.  **Implement Editing Logic**:
    *   `startEditing(expense)`: Set `editingId` and populate temporary state.
    *   `saveEditing()`: Update the `fixedExpenses` array with new values and clear edit state.
    *   `cancelEditing()`: Clear edit state without saving.

4.  **Refactor List for Drag-and-Drop**:
    *   Replace the container `div` (or `AnimatePresence` list wrapper) with `<Reorder.Group axis="y" values={fixedExpenses} onReorder={setFixedExpenses}>`.
    *   Replace individual item `motion.div` with `<Reorder.Item value={expense}>`.
    *   **Note**: `Reorder` handles animations, so we'll integrate it with the existing layout.

5.  **Update UI Structure**:
    *   Add a drag handle icon (`GripVertical`) to the left of each item.
    *   Add an "Edit" button next to the "Delete" button.
    *   When in **Edit Mode**, replace the text display with input fields and show "Save/Cancel" buttons.

6.  **Verify**:
    *   Check if items can be reordered by dragging.
    *   Check if items can be renamed and amounts changed.
    *   Ensure deletions still work.

I will modify `src/pages/SettingsPage.tsx` directly to apply these changes.