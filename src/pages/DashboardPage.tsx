import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, getDaysInMonth } from 'date-fns';
import { Plus, Check, Wallet, Coffee, Zap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useBudgetSummary } from '@/hooks/useBudgetSummary';
import { PiggyBankVisual } from '@/components/PiggyBankVisual';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TransactionTag } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, transactions, piggyBank, addTransaction } = useAppStore();
  const { monthlyRemaining } = useBudgetSummary();
  const [showAdd, setShowAdd] = useState(false);
  
  // Transaction Form State
  const [amount, setAmount] = useState('');
  const [selectedTags, setSelectedTags] = useState<TransactionTag[]>(['optional']);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Calculations
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const daysInMonth = getDaysInMonth(today);
  const fixedTotal = settings.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  // Use constant 30 days for calculation to match SettingsPage logic, or update SettingsPage to use getDaysInMonth(new Date())
  // User requested consistency. SettingsPage currently uses hardcoded 30.
  // To be consistent, let's use 30 here as well, OR update SettingsPage to use real days.
  // Given "monthly budget", usually people think of 30 days or real days.
  // Let's standardise on 30 for simplicity across the app as seen in SettingsPage, 
  // OR better, standardise on "daysInMonth" (Real days) for accuracy.
  // User asked for consistency. Let's make Dashboard use 30 to match Settings (which showed 24 vs 25 maybe due to 30 vs 31 days).
  // Actually, wait, February has 28 days. 1500 / 30 = 50. 1500 / 28 = 53.
  // If user saw 24 vs 25, maybe it was 750/30=25 vs 750/31=24.
  // Let's use 30 for both to be safe and consistent visually.
  const dailyBudget = Math.max(0, (settings.monthlyBudget - fixedTotal) / 30);
  
  const todayTransactions = transactions.filter(t => t.date === todayStr);
  // Filter out fixed expenses for daily budget consumption
  const todayConsumed = todayTransactions
    .filter(t => !t.tags.includes('fixed'))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const todayRemaining = dailyBudget - todayConsumed;
  const todayPotentialSavings = Math.max(0, todayRemaining);
  
  // Monthly Remaining Calculation
  // We use the hook value now
  // const currentMonthTransactions = transactions.filter(t => t.date.startsWith(format(today, 'yyyy-MM')));
  // const totalSpentThisMonth = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  // const monthlyRemaining = Math.max(0, settings.monthlyBudget - totalSpentThisMonth);

  // Total display in Piggy Bank (Confirmed Only to avoid user confusion)
  // We do NOT include todayPotentialSavings visually until it is processed the next day
  const piggyDisplayAmount = piggyBank.currentAmount;
  const isOverCapacity = piggyDisplayAmount >= piggyBank.capacityLevel;

  const handleAddTransaction = () => {
    if (!amount) return;
    
    addTransaction({
      id: Date.now().toString(),
      date: date,
      amount: parseFloat(amount),
      tags: selectedTags,
      note,
      createdAt: new Date().toISOString(),
    });
    
    setAmount('');
    setNote('');
    // Reset date to today for next time, or keep it? User might add multiple past records. 
    // Usually resetting to today is safer to avoid accidental wrong dates.
    setDate(format(new Date(), 'yyyy-MM-dd')); 
    setShowAdd(false);
  };

  const toggleTag = (tag: TransactionTag) => {
    let newTags = [...selectedTags];
    
    if (newTags.includes(tag)) {
      // Prevent removing the last tag if desired, or allow empty. 
      // Existing logic prevented empty. Keeping it for now.
      if (newTags.length > 1) {
        newTags = newTags.filter(t => t !== tag);
      }
    } else {
      newTags.push(tag);
      
      // Mutually exclusive logic
      if (tag === 'necessary') {
        newTags = newTags.filter(t => t !== 'optional');
      }
      if (tag === 'optional') {
        newTags = newTags.filter(t => t !== 'necessary');
      }
    }
    
    setSelectedTags(newTags);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Onboarding Banner - Only show if not onboarded */}
      {!settings.isOnboarded && (
        <Card className="bg-primary/10 border-primary/20 mb-6 relative overflow-hidden">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="font-bold text-gray-800 text-lg mb-1">👋 欢迎来到 JIEYOU!</h3>
              <p className="text-sm text-gray-600">设置月度预算，开始体验存钱的乐趣。</p>
            </div>
            <Button size="sm" onClick={() => navigate('/settings')} className="whitespace-nowrap ml-4">
              去设置
            </Button>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/40 to-transparent pointer-events-none" />
        </Card>
      )}

      {/* Date Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-rounded">
            {format(today, 'MM月dd日')}
          </h1>
          <p className="text-sm text-gray-500">小金库又存了一笔，美得很！</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">今日预算</p>
          <p className="text-lg font-bold text-primary">¥{dailyBudget.toFixed(0)}</p>
        </div>
      </div>

      {/* Budget Card */}
      <Card className="bg-gradient-to-br from-primary to-orange-400 text-white border-none shadow-orange-200 shadow-xl">
        <div className="flex justify-between items-end mb-2">
          <span className="text-orange-100 font-medium">今日剩余</span>
          <span className="text-xs text-orange-100 opacity-80">
            已用 ¥{todayConsumed.toFixed(0)}
          </span>
        </div>
        <div className="text-4xl font-bold font-rounded mb-4">
          ¥{todayRemaining.toFixed(0)}
        </div>
        
        <div className="flex justify-between items-center text-xs text-orange-100 mb-1">
           <span>今日进度</span>
           <span>本月剩余: ¥{monthlyRemaining.toFixed(0)}</span>
        </div>
        <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-white/90 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (todayConsumed / dailyBudget) * 100)}%` }}
          />
        </div>
      </Card>

      {/* Piggy Bank Visual */}
      <section className="py-4 relative">
        <div className="text-center mb-2">
          <p className="text-sm text-gray-500">当前存钱罐 (等级 {piggyBank.capacityLevel})</p>
          {isOverCapacity && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-secondary font-bold text-sm"
            >
              🎉 已满！明日自动升级！
            </motion.p>
          )}
        </div>
        <PiggyBankVisual 
          currentAmount={piggyDisplayAmount} 
          capacity={piggyBank.capacityLevel} 
        />
      </section>

      {/* Add Transaction Button */}
      <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center z-40 md:relative md:bottom-auto md:px-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdd(true)}
          className="bg-gray-900 text-white rounded-full p-4 shadow-lg shadow-gray-400 flex items-center space-x-2 px-6"
        >
          <Plus size={24} />
          <span className="font-semibold">记一笔</span>
        </motion.button>
      </div>

      {/* Add Transaction Modal/Sheet */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-4xl md:mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">记一笔支出</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400">取消</button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">金额</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-900">¥</span>
                    <input
                      type="number"
                      autoFocus
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl py-4 pl-10 pr-4 text-4xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-2 block">日期</label>
                  <div className="relative">
                     <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        style={{ position: 'relative' }}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-2 block">标签</label>
                  <div className="flex space-x-3">
                    <TagButton 
                      label="必要支出" 
                      active={selectedTags.includes('necessary')} 
                      onClick={() => toggleTag('necessary')}
                      icon={<span className="text-lg">🍚</span>}
                    />
                    <TagButton 
                      label="固定支出" 
                      active={selectedTags.includes('fixed')} 
                      onClick={() => toggleTag('fixed')}
                      icon={<Zap size={16} />}
                    />
                    <TagButton 
                      label="非必要支出" 
                      active={selectedTags.includes('optional')} 
                      onClick={() => toggleTag('optional')}
                      icon={<span className="text-lg">🍔</span>}
                    />
                  </div>
                  {selectedTags.includes('fixed') && (
                    <p className="text-xs text-gray-400 mt-2 ml-1">
                      * 固定支出不计入今日预算消耗
                    </p>
                  )}
                </div>

                <div>
                   <label className="text-sm text-gray-500 mb-2 block">消费详情</label>
                   <div className="relative">
                     <textarea
                       value={note}
                       onChange={(e) => {
                         if (e.target.value.length <= 100) {
                           setNote(e.target.value);
                         }
                       }}
                       placeholder="今天的旅途，你又遇到了哪些想要记录的事或情绪？(可选)"
                       className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-none text-sm placeholder:text-gray-400"
                     />
                     <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                       {note.length}/100
                     </div>
                   </div>
                </div>

                <Button fullWidth size="lg" onClick={handleAddTransaction}>
                  <Check size={20} className="mr-2" />
                  确认
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const TagButton: React.FC<{ label: string; active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3 rounded-xl flex items-center justify-center space-x-2 transition-all ${
      active 
        ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 scale-105' 
        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
    }`}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default DashboardPage;
