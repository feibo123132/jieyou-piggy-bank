import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useBudgetSummary } from '@/hooks/useBudgetSummary';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { FixedExpense } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { isSameMonth } from 'date-fns';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSettings, transactions } = useAppStore();
  const { totalVariableSpent } = useBudgetSummary();
  
  const [monthlyBudget, setMonthlyBudget] = useState(settings.monthlyBudget.toString());
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(settings.fixedExpenses);
  
  // New expense form state
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  useEffect(() => {
    setMonthlyBudget(settings.monthlyBudget.toString());
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

  const handleSave = () => {
    updateSettings({
      monthlyBudget: parseFloat(monthlyBudget) || 0,
      fixedExpenses,
      isOnboarded: true,
    });
    navigate('/');
  };

  const totalFixed = fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const dailyBudget = Math.max(0, (parseFloat(monthlyBudget) - totalFixed) / 30).toFixed(0);

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
        <Input
          label="月度总预算"
          type="number"
          value={monthlyBudget}
          onChange={(e) => setMonthlyBudget(e.target.value)}
          placeholder="例如：3000"
          className="text-lg"
        />
        <p className="text-sm text-gray-500 mt-2">
          除去固定支出后，日均可用：<span className="text-primary font-bold">¥{dailyBudget}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          本月实时剩余：<span className="text-green-600 font-bold">¥{monthlyRemaining.toFixed(0)}</span>
        </p>
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
            <AnimatePresence>
              {fixedExpenses.map((expense) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex justify-between items-center bg-gray-50 p-3 rounded-xl"
                >
                  <span className="font-medium text-gray-700">{expense.label}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-900">¥{expense.amount}</span>
                    <button 
                      onClick={() => handleRemoveExpense(expense.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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
        >
          <Save size={20} className="mr-2" />
          保存设置
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
