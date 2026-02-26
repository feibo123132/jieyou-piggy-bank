import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, GripVertical, Pencil, Check, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useBudgetSummary } from '@/hooks/useBudgetSummary';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { FixedExpense } from '@/types';
import { Reorder, AnimatePresence } from 'framer-motion';
import { isSameMonth, getDaysInMonth } from 'date-fns';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSettings, transactions, saveUserState } = useAppStore();
  const { totalVariableSpent } = useBudgetSummary();
  
  const [monthlyBudget, setMonthlyBudget] = useState(settings.monthlyBudget.toString());
  const [dailyBudgetInput, setDailyBudgetInput] = useState((settings.dailyBudget || 0).toString());
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(settings.fixedExpenses);
  const [username, setUsername] = useState(settings.username || '');
  const [isSaved, setIsSaved] = useState(false);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAmount, setEditAmount] = useState('');

  // New expense form state
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  useEffect(() => {
    setMonthlyBudget(settings.monthlyBudget.toString());
    setDailyBudgetInput((settings.dailyBudget || 0).toString());
    setFixedExpenses(settings.fixedExpenses);
  }, [settings]);

  const handleAddExpense = () => {
    if (!newExpenseLabel || !newExpenseAmount) return;
    
    const newExpense: FixedExpense = {
      id: Date.now().toString(),
      label: newExpenseLabel,
      amount: parseFloat(newExpenseAmount),
    };
    
    setFixedExpenses([...fixedExpenses, newExpense]);
    setNewExpenseLabel('');
    setNewExpenseAmount('');
  };

  const handleRemoveExpense = (id: string) => {
    setFixedExpenses(fixedExpenses.filter(e => e.id !== id));
  };

  const handleStartEditing = (expense: FixedExpense) => {
    setEditingId(expense.id);
    setEditLabel(expense.label);
    setEditAmount(expense.amount.toString());
  };

  const handleSaveEditing = () => {
    if (!editingId || !editLabel || !editAmount) return;
    
    setFixedExpenses(fixedExpenses.map(e => 
      e.id === editingId 
        ? { ...e, label: editLabel, amount: parseFloat(editAmount) }
        : e
    ));
    setEditingId(null);
    setEditLabel('');
    setEditAmount('');
  };

  const handleCancelEditing = () => {
    setEditingId(null);
    setEditLabel('');
    setEditAmount('');
  };

  const handleSave = async () => {
    let finalFixedExpenses = [...fixedExpenses];

    // "Vacuum Cleaner" Logic: Capture unsaved input
    if (newExpenseLabel && newExpenseAmount) {
      const vacuumedExpense: FixedExpense = {
        id: Date.now().toString(),
        label: newExpenseLabel,
        amount: parseFloat(newExpenseAmount),
      };
      finalFixedExpenses = [...finalFixedExpenses, vacuumedExpense];
      
      // Clear inputs
      setNewExpenseLabel('');
      setNewExpenseAmount('');
      setFixedExpenses(finalFixedExpenses); // Update local state view
    }

    updateSettings({
      monthlyBudget: parseFloat(monthlyBudget) || 0,
      dailyBudget: parseFloat(dailyBudgetInput) || 0,
      fixedExpenses: finalFixedExpenses,
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
  
  const formatCurrency = (amount: number) => {
    return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1);
  };

  // Calculate recommended daily budget (just for reference) based on real days in current month
  const daysInCurrentMonth = getDaysInMonth(new Date());
  const recommendedDaily = Math.max(0, ((parseFloat(monthlyBudget) || 0) - totalFixed) / daysInCurrentMonth);

  // Calculate Real-time Monthly Remaining (Preview based on input)
  // We use the local input 'monthlyBudget' minus local 'fixedExpenses' sum
  // minus the 'totalVariableSpent' from our hook (actual spending).
  const monthlyRemaining = Math.max(0, parseFloat(monthlyBudget) - totalFixed - totalVariableSpent);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center space-x-4 mb-6">
        {settings.isOnboarded && (
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
        )}
        <h1 className="text-2xl font-rounded font-bold text-gray-800">
          {settings.isOnboarded ? '设置' : '欢迎来到 JIEYOU'}
        </h1>
      </div>

      <Card>
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
            本月实时剩余：<span className="text-green-600 font-bold">¥{formatCurrency(monthlyRemaining)}</span>
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">每月固定支出</h2>
        <div className="space-y-4">
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
                    ) : (
                      // View Mode
                      <>
                        <div className="flex items-center space-x-3">
                           <div className="cursor-grab active:cursor-grabbing text-gray-400">
                             <GripVertical size={18} />
                           </div>
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
              <p className="text-center text-gray-400 py-4 text-sm">暂无固定支出</p>
            )}
          </div>
          
          {fixedExpenses.length > 0 && (
             <div className="pt-4 border-t border-gray-100 flex justify-between text-sm font-medium">
               <span>总固定支出</span>
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
