import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, GripVertical, Pencil, Check, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useBudgetSummary } from '@/hooks/useBudgetSummary';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { FixedExpense, FixedExpenseCategory, VariableIncome } from '@/types';
import {
  getFixedExpensesForMonth,
  normalizeFixedExpenseSnapshots,
  saveFixedExpensesForMonth,
} from '@/lib/fixedExpenses';
import { getVariableIncomesForMonth, replaceVariableIncomesForMonth } from '@/lib/variableIncomes';
import { Reorder, AnimatePresence } from 'framer-motion';
import { format, getDaysInMonth } from 'date-fns';

// 固定支出项的"必要性分类"——与交易 tag 的 EXCLUSIVE_GROUPS 同口径
const FIXED_CATEGORY_META: Record<
  FixedExpenseCategory,
  { label: string; icon: string; toneClassName: string; ringClassName: string }
> = {
  necessary: { label: '自然且必要', icon: '🍚', toneClassName: 'bg-blue-100 text-blue-600', ringClassName: 'ring-blue-400' },
  optional:  { label: '自然非必要', icon: '🍷', toneClassName: 'bg-orange-100 text-orange-600', ringClassName: 'ring-orange-400' },
  unnatural: { label: '不自然且不必要', icon: '👑', toneClassName: 'bg-rose-100 text-rose-600', ringClassName: 'ring-rose-400' },
};

// 列表色点用纯色 Tailwind 类
const FIXED_CATEGORY_DOT: Record<FixedExpenseCategory, string> = {
  necessary: 'bg-blue-500',
  optional: 'bg-orange-500',
  unnatural: 'bg-rose-500',
};

// 「必要性分类」3 chip 选择器（新增/编辑复用）
const FixedCategoryChips: React.FC<{
  value: FixedExpenseCategory;
  onChange: (next: FixedExpenseCategory) => void;
}> = ({ value, onChange }) => (
  <div className="inline-flex rounded-lg overflow-hidden border border-gray-200">
    {(['necessary', 'optional', 'unnatural'] as FixedExpenseCategory[]).map((c) => {
      const meta = FIXED_CATEGORY_META[c];
      const active = value === c;
      return (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={meta.label}
          className={`h-9 w-9 flex items-center justify-center transition-colors ${
            active
              ? `${meta.toneClassName} ring-2 ring-inset ${meta.ringClassName}`
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          <span className="text-base leading-none">{meta.icon}</span>
        </button>
      );
    })}
  </div>
);

const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    saveUserState,
    syncWarning,
    clearSyncWarning,
    pendingSyncConflict,
    forcePushLocalToCloud,
    useCloudSnapshotFromConflict,
    clearPendingSyncConflict,
  } = useAppStore();
  const { totalVariableSpent } = useBudgetSummary();
  const currentMonthKey = format(new Date(), 'yyyy-MM');

  const [monthlyBudget, setMonthlyBudget] = useState(settings.monthlyBudget.toString());
  const [dailyBudgetInput, setDailyBudgetInput] = useState((settings.dailyBudget || 0).toString());
  const [selectedFixedMonth, setSelectedFixedMonth] = useState(currentMonthKey);
  const [applyFixedChangesFromMonth, setApplyFixedChangesFromMonth] = useState(true);
  const [fixedExpenseSnapshots, setFixedExpenseSnapshots] = useState(
    normalizeFixedExpenseSnapshots(settings.fixedExpensesByMonth),
  );
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(
    getFixedExpensesForMonth(settings.fixedExpensesByMonth, currentMonthKey, settings.fixedExpenses),
  );
  const [selectedIncomeMonth, setSelectedIncomeMonth] = useState(currentMonthKey);
  const [allVariableIncomes, setAllVariableIncomes] = useState<VariableIncome[]>(settings.variableIncomes || []);
  const [username] = useState(settings.username || '');
  const [isSaved, setIsSaved] = useState(false);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<FixedExpenseCategory>('necessary');
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editIncomeLabel, setEditIncomeLabel] = useState('');
  const [editIncomeAmount, setEditIncomeAmount] = useState('');

  // New expense form state
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<FixedExpenseCategory>('necessary');
  const [newIncomeLabel, setNewIncomeLabel] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const variableIncomes = getVariableIncomesForMonth(allVariableIncomes, selectedIncomeMonth);
  const selectedIncomeMonthLabel = `${selectedIncomeMonth.replace('-', '年')}月`;
  const selectedFixedMonthLabel = `${selectedFixedMonth.replace('-', '年')}月`;

  useEffect(() => {
    setMonthlyBudget(settings.monthlyBudget.toString());
    setDailyBudgetInput((settings.dailyBudget || 0).toString());
    const normalizedSnapshots = normalizeFixedExpenseSnapshots(settings.fixedExpensesByMonth);
    setFixedExpenseSnapshots(normalizedSnapshots);
    setFixedExpenses(getFixedExpensesForMonth(normalizedSnapshots, selectedFixedMonth, settings.fixedExpenses));
    setAllVariableIncomes(settings.variableIncomes || []);
  }, [settings, selectedFixedMonth]);

  useEffect(() => {
    setFixedExpenses(getFixedExpensesForMonth(fixedExpenseSnapshots, selectedFixedMonth, settings.fixedExpenses));
  }, [fixedExpenseSnapshots, selectedFixedMonth, settings.fixedExpenses]);

  const handleAddExpense = () => {
    if (!newExpenseLabel || !newExpenseAmount) return;

    const newExpense: FixedExpense = {
      id: Date.now().toString(),
      label: newExpenseLabel,
      amount: parseFloat(newExpenseAmount),
      category: newExpenseCategory,
    };

    setFixedExpenses([...fixedExpenses, newExpense]);
    setNewExpenseLabel('');
    setNewExpenseAmount('');
    setNewExpenseCategory('necessary');
  };

  const handleAddIncome = () => {
    if (!newIncomeLabel || !newIncomeAmount) return;

    const newIncome: VariableIncome = {
      id: `${Date.now()}-income`,
      label: newIncomeLabel,
      amount: parseFloat(newIncomeAmount),
      month: selectedIncomeMonth,
      createdAt: new Date().toISOString(),
    };

    setAllVariableIncomes(currentIncomes =>
      replaceVariableIncomesForMonth(currentIncomes, selectedIncomeMonth, [
        ...getVariableIncomesForMonth(currentIncomes, selectedIncomeMonth),
        newIncome,
      ]),
    );
    setNewIncomeLabel('');
    setNewIncomeAmount('');
  };

  const handleRemoveExpense = (id: string) => {
    setFixedExpenses(fixedExpenses.filter(e => e.id !== id));
  };

  const handleRemoveIncome = (id: string) => {
    setAllVariableIncomes(currentIncomes =>
      replaceVariableIncomesForMonth(
        currentIncomes,
        selectedIncomeMonth,
        getVariableIncomesForMonth(currentIncomes, selectedIncomeMonth).filter(income => income.id !== id),
      ),
    );
  };

  const handleStartEditingIncome = (income: VariableIncome) => {
    setEditingIncomeId(income.id);
    setEditIncomeLabel(income.label);
    setEditIncomeAmount(income.amount.toString());
  };

  const handleSaveEditingIncome = () => {
    if (!editingIncomeId || !editIncomeLabel || !editIncomeAmount) return;

    setAllVariableIncomes(currentIncomes =>
      replaceVariableIncomesForMonth(
        currentIncomes,
        selectedIncomeMonth,
        getVariableIncomesForMonth(currentIncomes, selectedIncomeMonth).map(income =>
          income.id === editingIncomeId
            ? { ...income, label: editIncomeLabel, amount: parseFloat(editIncomeAmount) }
            : income
        ),
      ),
    );
    setEditingIncomeId(null);
    setEditIncomeLabel('');
    setEditIncomeAmount('');
  };

  const handleCancelEditingIncome = () => {
    setEditingIncomeId(null);
    setEditIncomeLabel('');
    setEditIncomeAmount('');
  };

  const handleStartEditing = (expense: FixedExpense) => {
    setEditingId(expense.id);
    setEditLabel(expense.label);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category ?? 'necessary');
  };

  const handleSaveEditing = () => {
    if (!editingId || !editLabel || !editAmount) return;

    setFixedExpenses(fixedExpenses.map(e =>
      e.id === editingId
        ? { ...e, label: editLabel, amount: parseFloat(editAmount), category: editCategory }
        : e
    ));
    setEditingId(null);
    setEditLabel('');
    setEditAmount('');
    setEditCategory('necessary');
  };

  const handleCancelEditing = () => {
    setEditingId(null);
    setEditLabel('');
    setEditAmount('');
    setEditCategory('necessary');
  };

  const handleSave = async () => {
    let finalFixedExpenses = [...fixedExpenses];
    let finalVariableIncomes = [...allVariableIncomes];
    let finalFixedSnapshots = [...fixedExpenseSnapshots];

    // "Vacuum Cleaner" Logic: Capture unsaved input
    if (newExpenseLabel && newExpenseAmount) {
      const vacuumedExpense: FixedExpense = {
        id: Date.now().toString(),
        label: newExpenseLabel,
        amount: parseFloat(newExpenseAmount),
        category: newExpenseCategory,
      };
      finalFixedExpenses = [...finalFixedExpenses, vacuumedExpense];

      // Clear inputs
      setNewExpenseLabel('');
      setNewExpenseAmount('');
      setNewExpenseCategory('necessary');
      setFixedExpenses(finalFixedExpenses); // Update local state view
    }

    // Capture unsaved monthly income input
    if (newIncomeLabel && newIncomeAmount) {
      const vacuumedIncome: VariableIncome = {
        id: `${Date.now()}-income`,
        label: newIncomeLabel,
        amount: parseFloat(newIncomeAmount),
        month: selectedIncomeMonth,
        createdAt: new Date().toISOString(),
      };
      finalVariableIncomes = replaceVariableIncomesForMonth(
        finalVariableIncomes,
        selectedIncomeMonth,
        [...getVariableIncomesForMonth(finalVariableIncomes, selectedIncomeMonth), vacuumedIncome],
      );
      setNewIncomeLabel('');
      setNewIncomeAmount('');
      setAllVariableIncomes(finalVariableIncomes);
    }

    finalFixedSnapshots = saveFixedExpensesForMonth(
      finalFixedSnapshots,
      selectedFixedMonth,
      finalFixedExpenses,
      applyFixedChangesFromMonth,
    );
    setFixedExpenseSnapshots(finalFixedSnapshots);

    updateSettings({
      monthlyBudget: parseFloat(monthlyBudget) || 0,
      dailyBudget: parseFloat(dailyBudgetInput) || 0,
      fixedExpenses: settings.fixedExpenses.length > 0 ? settings.fixedExpenses : finalFixedExpenses,
      fixedExpensesByMonth: finalFixedSnapshots,
      variableIncomes: finalVariableIncomes,
      isOnboarded: true,
      username,
    });
    
    // Explicitly save to cloud
    await saveUserState();
    
    // Visual Feedback
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const totalFixed = fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalVariableIncome = variableIncomes.reduce((sum, item) => sum + item.amount, 0);
  
  const formatCurrency = (amount: number) => {
    return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1);
  };

  // Calculate recommended daily budget (just for reference) based on real days in current month
  const daysInCurrentMonth = getDaysInMonth(new Date());
  const recommendedDaily = Math.max(0, ((parseFloat(monthlyBudget) || 0) - totalFixed) / daysInCurrentMonth);

  // Calculate Real-time Monthly Remaining (Preview based on input)
  // We use the local input 'monthlyBudget' minus local 'fixedExpenses' sum
  // minus the 'totalVariableSpent' from our hook (actual spending).
  const currentMonthFixedTotal = getFixedExpensesForMonth(
    fixedExpenseSnapshots,
    currentMonthKey,
    settings.fixedExpenses,
  ).reduce((sum, item) => sum + item.amount, 0);
  const monthlyRemaining = parseFloat(monthlyBudget) - currentMonthFixedTotal - totalVariableSpent;

  return (
    <div className="space-y-6 pb-20">
      <Card>
        {syncWarning && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <div className="flex items-start justify-between gap-3">
              <span>{syncWarning}</span>
              <button
                type="button"
                onClick={clearSyncWarning}
                className="shrink-0 text-xs text-amber-700 underline hover:text-amber-900"
              >
                知道了
              </button>
            </div>
          </div>
        )}
        {pendingSyncConflict && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
            <p className="font-medium">检测到同步冲突，请手动确认：</p>
            <p className="mt-1 text-xs text-red-800">
              本地：{pendingSyncConflict.localMeta.maxTransactionDate || '无'} / {pendingSyncConflict.localMeta.transactionCount} 条
              ，云端：{pendingSyncConflict.cloudMeta.maxTransactionDate || '无'} / {pendingSyncConflict.cloudMeta.transactionCount} 条
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={forcePushLocalToCloud}
              >
                以本地为准覆盖云端
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={useCloudSnapshotFromConflict}
              >
                以云端为准覆盖本地
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearPendingSyncConflict}
              >
                稍后再处理
              </Button>
            </div>
          </div>
        )}
        <h2 className="text-lg font-semibold mb-4 text-gray-700">预算设置</h2>
        <div className="space-y-4">
          <Input
            label="月度总预算"
            type="number"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder="例如：3000"
            className="text-lg"
          />
          
          <div className="pt-2">
            <Input
              label="日均可用限额 (人工设置)"
              type="number"
              value={dailyBudgetInput}
              onChange={(e) => setDailyBudgetInput(e.target.value)}
              placeholder={`推荐值：${formatCurrency(recommendedDaily)}`}
              className="text-lg"
            />
            <p className="text-sm text-gray-400 mt-2">
              * 系统参考建议：基于月预算除去固定支出后，日均约 <span className="text-gray-600 font-bold">¥{formatCurrency(recommendedDaily)}</span>
            </p>
          </div>

          <p className="text-sm text-gray-500 mt-1 border-t border-gray-100 pt-3">
            本月实时剩余：
            <span className={`${monthlyRemaining >= 0 ? 'text-green-600' : 'text-red-500'} font-bold`}>
              ¥{formatCurrency(monthlyRemaining)}
            </span>
          </p>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">月度不固定收入</h2>
            <p className="mt-1 text-sm text-gray-400">切换月份后，可分别维护每个月的收入记录。</p>
          </div>
          <div className="w-full sm:w-48">
            <Input
              label="查看月份"
              type="month"
              value={selectedIncomeMonth}
              onChange={(e) => setSelectedIncomeMonth(e.target.value || currentMonthKey)}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="收入来源（如：兼职、红包）"
              value={newIncomeLabel}
              onChange={(e) => setNewIncomeLabel(e.target.value)}
            />
            <Input
              type="number"
              placeholder="金额"
              value={newIncomeAmount}
              onChange={(e) => setNewIncomeAmount(e.target.value)}
            />
            <Button onClick={handleAddIncome} variant="secondary" className="px-3">
              <Plus size={20} />
            </Button>
          </div>

          <div className="space-y-2 mt-4">
            {variableIncomes.map((income) => (
              <div
                key={income.id}
                className="flex justify-between items-center bg-gray-50 p-3 rounded-xl"
              >
                {editingIncomeId === income.id ? (
                  <div className="flex w-full space-x-2 items-center">
                    <Input
                      value={editIncomeLabel}
                      onChange={(e) => setEditIncomeLabel(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Input
                      type="number"
                      value={editIncomeAmount}
                      onChange={(e) => setEditIncomeAmount(e.target.value)}
                      className="h-8 w-24 text-sm"
                    />
                    <div className="flex space-x-1">
                      <button onClick={handleSaveEditingIncome} className="p-1 text-green-600 hover:bg-green-100 rounded">
                        <Check size={16} />
                      </button>
                      <button onClick={handleCancelEditingIncome} className="p-1 text-red-500 hover:bg-red-100 rounded">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-700">{income.label}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-900">¥{formatCurrency(income.amount)}</span>
                      <button
                        onClick={() => handleStartEditingIncome(income)}
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveIncome(income.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {variableIncomes.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">{selectedIncomeMonthLabel}暂无不固定收入</p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between text-sm font-medium">
            <span>{selectedIncomeMonthLabel}非固定收入合计</span>
            <span>¥{formatCurrency(totalVariableIncome)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">月度固定支出</h2>
            <p className="mt-1 text-sm text-gray-400">可单独维护每个月，并支持从当前月起同步到未来月份。</p>
          </div>
          <div className="w-full sm:w-48">
            <Input
              label="查看月份"
              type="month"
              value={selectedFixedMonth}
              onChange={(e) => setSelectedFixedMonth(e.target.value || currentMonthKey)}
            />
          </div>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
            <input
              type="checkbox"
              checked={applyFixedChangesFromMonth}
              onChange={(e) => setApplyFixedChangesFromMonth(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            本次保存从{selectedFixedMonthLabel}起生效（覆盖未来已创建月份）
          </label>

          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="项目（如：房租）"
                value={newExpenseLabel}
                onChange={(e) => setNewExpenseLabel(e.target.value)}
              />
              <Input
                type="number"
                placeholder="金额"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
              />
              <Button onClick={handleAddExpense} variant="secondary" className="px-3">
                <Plus size={20} />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 shrink-0">必要性分类</span>
              <FixedCategoryChips value={newExpenseCategory} onChange={setNewExpenseCategory} />
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <Reorder.Group axis="y" values={fixedExpenses} onReorder={setFixedExpenses} className="space-y-2">
              <AnimatePresence>
                {fixedExpenses.map((expense) => (
                  <Reorder.Item
                    key={expense.id}
                    value={expense}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-center bg-gray-50 p-3 rounded-xl touch-none"
                  >
                    {editingId === expense.id ? (
                      // Editing Mode
                      <div className="flex w-full flex-col gap-2">
                        <div className="flex w-full space-x-2 items-center">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="h-8 w-24 text-sm"
                          />
                          <div className="flex space-x-1">
                            <button onClick={handleSaveEditing} className="p-1 text-green-600 hover:bg-green-100 rounded">
                              <Check size={16} />
                            </button>
                            <button onClick={handleCancelEditing} className="p-1 text-red-500 hover:bg-red-100 rounded">
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 shrink-0">必要性分类</span>
                          <FixedCategoryChips value={editCategory} onChange={setEditCategory} />
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex items-center space-x-3">
                           <div className="cursor-grab active:cursor-grabbing text-gray-400">
                             <GripVertical size={18} />
                           </div>
                           <span
                             className={`shrink-0 inline-block w-2.5 h-2.5 rounded-full ${
                               FIXED_CATEGORY_DOT[expense.category ?? 'necessary']
                             }`}
                             title={FIXED_CATEGORY_META[expense.category ?? 'necessary'].label}
                           />
                           <span className="font-medium text-gray-700">{expense.label}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-900">¥{expense.amount}</span>
                          <button
                            onClick={() => handleStartEditing(expense)}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveExpense(expense.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
            {fixedExpenses.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">{selectedFixedMonthLabel}暂无固定支出</p>
            )}
          </div>
          
          {fixedExpenses.length > 0 && (
             <div className="pt-4 border-t border-gray-100 flex justify-between text-sm font-medium">
               <span>{selectedFixedMonthLabel}总固定支出</span>
               <span>¥{totalFixed}</span>
             </div>
          )}
        </div>
      </Card>

      <div className="fixed bottom-8 left-0 right-0 px-4 md:relative md:bottom-auto md:px-0">
        <Button 
          fullWidth 
          size="lg" 
          onClick={handleSave}
          disabled={!monthlyBudget}
          className={`transition-all duration-300 ${isSaved ? 'bg-green-500 hover:bg-green-600' : ''}`}
        >
          {isSaved ? (
            <div className="flex items-center">
              <Check size={20} className="mr-2" />
              已保存！
            </div>
          ) : (
            <>
              <Save size={20} className="mr-2" />
              保存设置
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
