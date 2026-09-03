import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useBudgetSummary } from '@/hooks/useBudgetSummary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TransactionTag } from '@/types';
import { getFixedExpensesForMonth } from '@/lib/fixedExpenses';
import {
  getDefaultTransactionTags,
  toggleTransactionTag,
} from '@/lib/transactionTags';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, transactions, addTransaction } = useAppStore();
  const { monthlyRemaining } = useBudgetSummary();
  const [showAdd, setShowAdd] = useState(false);

  // Transaction Form State
  const [amount, setAmount] = useState('');
  const [selectedTags, setSelectedTags] = useState<TransactionTag[]>(getDefaultTransactionTags());
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Calculations
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentMonthKey = format(today, 'yyyy-MM');
  const fixedExpensesForMonth = getFixedExpensesForMonth(
    settings.fixedExpensesByMonth,
    currentMonthKey,
    settings.fixedExpenses,
  );
  const currentMonthFixedTotal = fixedExpensesForMonth.reduce((sum, e) => sum + e.amount, 0);

  // Use manual daily budget if set, otherwise fallback to calculated
  // Calculated fallback: (Monthly - Fixed) / 30
  const calculatedDaily = Math.max(0, (settings.monthlyBudget - currentMonthFixedTotal) / 30);
  const dailyBudget = settings.dailyBudget && settings.dailyBudget > 0
    ? settings.dailyBudget
    : calculatedDaily;

  const todayTransactions = transactions.filter(t => t.date === todayStr && !t.deletedAt);
  // Filter out fixed expenses for daily budget consumption
  const todayConsumed = todayTransactions
    .filter(t => !t.tags.includes('fixed'))
    .reduce((sum, t) => sum + t.amount, 0);

  const todayRemaining = dailyBudget - todayConsumed;

  // Monthly breakdown by category
  const monthTransactions = transactions.filter(t =>
    t.date.startsWith(currentMonthKey) && !t.deletedAt,
  );
  // 「非固定支出」卡片（统计口径）= 本月所有不包含 fixed 标签的交易合计
  // （与 CalendarPage 的"本月非固定支出" widget 口径一致，自动归集，无需手动打 tag）
  // 注意：这与手动 tag「偶发支出」(unfixed) 不同——后者仅统计用户主动标记偶发的交易
  const unfixedSpent = monthTransactions
    .filter(t => !t.tags.includes('fixed'))
    .reduce((sum, t) => sum + t.amount, 0);
  const monthUnfixedCount = monthTransactions.filter(t => !t.tags.includes('fixed')).length;

  // 自然且必要 = 本月带 necessary 标签的交易 + 月度固定支出里分类为「必要」的合计
  // （固定支出本身是计划内的"自然且必要"消费，纳入此桶整体看待）
  const necessaryFixedTotal = fixedExpensesForMonth
    .filter(e => (e.category ?? 'necessary') === 'necessary')
    .reduce((sum, e) => sum + e.amount, 0);
  const optionalFixedTotal = fixedExpensesForMonth
    .filter(e => e.category === 'optional')
    .reduce((sum, e) => sum + e.amount, 0);
  const unnaturalFixedTotal = fixedExpensesForMonth
    .filter(e => e.category === 'unnatural')
    .reduce((sum, e) => sum + e.amount, 0);

  const necessarySpent = monthTransactions
    .filter(t => t.tags.includes('necessary'))
    .reduce((sum, t) => sum + t.amount, 0) + necessaryFixedTotal;
  const monthNecessaryCount = monthTransactions.filter(t => t.tags.includes('necessary')).length
    + fixedExpensesForMonth.filter(e => (e.category ?? 'necessary') === 'necessary').length;

  const optionalSpent = monthTransactions
    .filter(t => t.tags.includes('optional'))
    .reduce((sum, t) => sum + t.amount, 0) + optionalFixedTotal;
  const monthOptionalCount = monthTransactions.filter(t => t.tags.includes('optional')).length
    + fixedExpensesForMonth.filter(e => e.category === 'optional').length;

  const unnaturalSpent = monthTransactions
    .filter(t => t.tags.includes('unnatural'))
    .reduce((sum, t) => sum + t.amount, 0) + unnaturalFixedTotal;
  const monthUnnaturalCount = monthTransactions.filter(t => t.tags.includes('unnatural')).length
    + fixedExpensesForMonth.filter(e => e.category === 'unnatural').length;

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
    setSelectedTags(getDefaultTransactionTags());
    setNote('');
    // Reset date to today for next time, or keep it? User might add multiple past records. 
    // Usually resetting to today is safer to avoid accidental wrong dates.
    setDate(format(new Date(), 'yyyy-MM-dd')); 
    setShowAdd(false);
  };

  const toggleTag = (tag: TransactionTag) => {
    setSelectedTags((currentTags) => toggleTransactionTag(currentTags, tag));
  };

  const formatCurrency = (amount: number) => {
    return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1);
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
          <p className="text-sm text-gray-500">在幸福和健康的前提下，人每月需要花多少钱</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">今日预算</p>
          <p className="text-lg font-bold text-primary">¥{formatCurrency(dailyBudget)}</p>
        </div>
      </div>

      {/* Budget Card */}
      <Card className="bg-gradient-to-br from-primary to-orange-400 text-white border-none shadow-orange-200 shadow-xl">
        <div className="flex justify-between items-end mb-2">
          <span className="text-orange-100 font-medium">今日剩余</span>
          <span className="text-xs text-orange-100 opacity-80">
            已用 ¥{formatCurrency(todayConsumed)}
          </span>
        </div>
        <div className="text-4xl font-bold font-rounded mb-4">
          ¥{formatCurrency(todayRemaining)}
        </div>
        
        <div className="flex justify-between items-center text-xs text-orange-100 mb-1">
           <span>今日进度</span>
           <span>本月剩余: ¥{formatCurrency(monthlyRemaining)}</span>
        </div>
        <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-white/90 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (todayConsumed / dailyBudget) * 100)}%` }}
          />
        </div>
      </Card>

      {/* Monthly Expense Categories */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-lg font-bold text-gray-800">本月支出分布</h2>
          <span className="text-xs text-gray-400">{format(today, 'yyyy 年 MM 月')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Fixed Expense Card */}
          <Card className="bg-purple-50 border-purple-100">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <span className="text-sm font-bold">固</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-700 truncate">固定支出</h3>
                <p className="text-[10px] text-gray-400 leading-tight">计划内 · 按月固定</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ¥{formatCurrency(currentMonthFixedTotal)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {fixedExpensesForMonth.length} 个条目
            </p>
          </Card>

          {/* Unfixed Expense Card */}
          <Card className="bg-indigo-50 border-indigo-100">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <span className="text-sm font-bold">非固</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-700 truncate">非固定支出</h3>
                <p className="text-[10px] text-gray-400 leading-tight">计划外 · 浮动</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ¥{formatCurrency(unfixedSpent)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {monthUnfixedCount} 笔记录
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Necessary Expense Card */}
          <Card className="bg-blue-50 border-blue-100">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <span className="text-sm font-bold">必</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-700 truncate">自然且必要</h3>
                <p className="text-[10px] text-gray-400 leading-tight">生活刚需</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ¥{formatCurrency(necessarySpent)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {monthNecessaryCount} 笔记录
            </p>
          </Card>

          {/* Optional Expense Card */}
          <Card className="bg-orange-50 border-orange-100">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <span className="text-sm font-bold">非</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-700 truncate">自然非必要</h3>
                <p className="text-[10px] text-gray-400 leading-tight">弹性消费</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ¥{formatCurrency(optionalSpent)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {monthOptionalCount} 笔记录
            </p>
          </Card>

          {/* Unnatural & Unnecessary Expense Card */}
          <Card className="bg-rose-50 border-rose-100">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <span className="text-sm font-bold">毒</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-700 truncate">不自然且不必要</h3>
                <p className="text-[10px] text-gray-400 leading-tight">毒素消耗</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ¥{formatCurrency(unnaturalSpent)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {monthUnnaturalCount} 笔记录
            </p>
          </Card>
        </div>
      </section>

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
                  <div className="grid grid-cols-6 gap-3">
                    {/* Row 1: 三档必要性互斥选择 */}
                    <TagButton
                      label="自然且必要"
                      active={selectedTags.includes('necessary')}
                      onClick={() => toggleTag('necessary')}
                      icon={<span className="text-lg">🍚</span>}
                      className="col-span-2"
                    />
                    <TagButton
                      label="自然非必要"
                      active={selectedTags.includes('optional')}
                      onClick={() => toggleTag('optional')}
                      icon={<span className="text-lg">🍷</span>}
                      className="col-span-2"
                    />
                    <TagButton
                      label="不自然且不必要"
                      active={selectedTags.includes('unnatural')}
                      onClick={() => toggleTag('unnatural')}
                      icon={<span className="text-lg">👑</span>}
                      className="col-span-2"
                    />
                    {/* Row 2: 其它独立标签（左对齐，保持与 Row 1 等宽） */}
                    <TagButton
                      label="偶发支出"
                      active={selectedTags.includes('unfixed')}
                      onClick={() => toggleTag('unfixed')}
                      icon={<span className="text-lg">💸</span>}
                      className="col-span-2 col-start-1"
                    />
                    <TagButton
                      label="Idea"
                      active={selectedTags.includes('idea')}
                      onClick={() => toggleTag('idea')}
                      icon={<span className="text-lg">💡</span>}
                      className="col-span-2"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2 ml-1">* 最多可同时选择 3 个标签</p>
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

const TagButton: React.FC<{ label: string; active: boolean; onClick: () => void; icon: React.ReactNode; className?: string }> = ({ label, active, onClick, icon, className }) => (
  <button
    onClick={onClick}
    className={`w-full py-3 rounded-xl flex items-center justify-center space-x-2 transition-all ${
      active
        ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 scale-105'
        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
    } ${className ?? ''}`}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default DashboardPage;
