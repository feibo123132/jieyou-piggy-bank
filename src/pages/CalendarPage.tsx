import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  getDay, 
  getDaysInMonth
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Trash2, Check, Zap, ChevronDown, Wallet } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { TransactionTag, Transaction } from '@/types';

const CalendarPage: React.FC = () => {
  const { transactions, settings, removeTransaction, updateTransaction } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewingDate, setViewingDate] = useState<Date | null>(null);
  
  // Edit Modal State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTags, setEditTags] = useState<TransactionTag[]>([]);
  const [editNote, setEditNote] = useState('');

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  
  // Grid padding
  const startDay = getDay(firstDayOfMonth); // 0 (Sun) to 6 (Sat)
  const emptyDays = Array(startDay).fill(null);

  // Stats for the month
  const monthTransactions = transactions.filter(t => isSameMonth(new Date(t.date), currentDate) && !t.deletedAt);
  const totalVariableSpent = monthTransactions
    .filter(t => !t.tags.includes('fixed'))
    .reduce((sum, t) => sum + t.amount, 0);
  const currentMonthKey = format(currentDate, 'yyyy-MM');
  const totalVariableIncome = (settings.variableIncomes || [])
    .filter(income => income.month === currentMonthKey)
    .reduce((sum, income) => sum + income.amount, 0);
  
  const fixedTotal = settings.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const calculatedDaily = Math.max(0, (settings.monthlyBudget - fixedTotal) / 30);
  const dailyBudget = settings.dailyBudget && settings.dailyBudget > 0 
    ? settings.dailyBudget 
    : calculatedDaily;

  const calculateDailyStats = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTransactions = transactions.filter(t => t.date === dateStr && !t.deletedAt);
    
    // Check if future
    if (date > new Date()) return { status: 'future', savings: 0 };

    const dayConsumed = dayTransactions
      .filter(t => !t.tags.includes('fixed'))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const savings = dailyBudget - dayConsumed;
    
    let status = 'neutral';
    if (savings > 0) status = 'saved';
    if (savings < 0) status = 'overspent';
    
    return { status, savings };
  };

  const getDayStatus = (date: Date) => {
    return calculateDailyStats(date).status;
  };

  // Calculate Total Saved This Month
  // Sum of savings for all past days in the current month (excluding today if needed, but usually includes today)
  // Logic: Iterate through days from start of month up to today (or end of month if in past)
  // Accumulate (DailyBudget - DailyConsumed)
  const calculateMonthlySavings = () => {
    const today = new Date();
    const endCalcDate = today < lastDayOfMonth ? today : lastDayOfMonth;
    
    const daysToCalc = eachDayOfInterval({ start: firstDayOfMonth, end: endCalcDate });
    
    let totalSavings = 0;
    daysToCalc.forEach(day => {
      // Skip future days just in case (though endCalcDate handles most)
      if (day > new Date()) return;
      
      const { savings } = calculateDailyStats(day);
      totalSavings += savings;
    });
    
    return totalSavings;
  };

  const totalSaved = calculateMonthlySavings();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening edit modal
    if (window.confirm('确定要删除这条记录吗？')) {
      removeTransaction(id);
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setViewingDate(null); // Close the day details modal if open
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditDate(transaction.date);
    setEditTags(transaction.tags);
    setEditNote(transaction.note || '');
  };

  const handleUpdate = () => {
    if (!editingTransaction || !editAmount) return;

    updateTransaction({
      ...editingTransaction,
      amount: parseFloat(editAmount),
      date: editDate,
      tags: editTags,
      note: editNote,
    });

    setEditingTransaction(null);
  };

  const toggleEditTag = (tag: TransactionTag) => {
    let newTags = [...editTags];
    
    if (newTags.includes(tag)) {
      if (newTags.length > 1) {
        newTags = newTags.filter(t => t !== tag);
      }
    } else {
      newTags.push(tag);
      if (tag === 'necessary') {
        newTags = newTags.filter(t => t !== 'optional');
      }
      if (tag === 'optional') {
        newTags = newTags.filter(t => t !== 'necessary');
      }
    }
    setEditTags(newTags);
  };

  const groupTransactionsByDate = () => {
    const grouped: { [key: string]: Transaction[] } = {};
    monthTransactions.forEach(t => {
      if (!grouped[t.date]) {
        grouped[t.date] = [];
      }
      grouped[t.date].push(t);
    });
    
    // Sort transactions within each day by creation time desc
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return grouped;
  };

  const groupedTransactions = groupTransactionsByDate();
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const formatCurrency = (amount: number) => {
    return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-rounded font-bold text-gray-800">
          历史足迹
        </h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-gray-700 py-2">
            {format(currentDate, 'yyyy年 MM月')}
          </span>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-3 bg-orange-50 border-orange-100 flex flex-col justify-between">
          <div className="flex items-center space-x-1.5 text-orange-600 mb-1">
            <TrendingUp size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">本月非固定支出</span>
          </div>
          <p className="text-xl font-bold text-gray-900">¥{formatCurrency(totalVariableSpent)}</p>
        </Card>

        <Card className="p-3 bg-sky-50 border-sky-100 flex flex-col justify-between">
          <div className="flex items-center space-x-1.5 text-sky-600 mb-1">
            <Wallet size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">本月非固定收入</span>
          </div>
          <p className="text-xl font-bold text-gray-900">¥{formatCurrency(totalVariableIncome)}</p>
        </Card>

        <Card className={`p-3 border-opacity-50 flex flex-col justify-between ${
          totalSaved >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
        }`}>
          <div className={`flex items-center space-x-1.5 mb-1 ${
            totalSaved >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="text-lg">💰</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">本月共省</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {totalSaved > 0 ? '+' : ''}¥{formatCurrency(totalSaved)}
          </p>
        </Card>

        <Card className="p-3 bg-teal-50 border-teal-100 flex flex-col justify-between">
          <div className="flex items-center space-x-1.5 text-teal-600 mb-1">
            <TrendingDown size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">日均限额</span>
          </div>
          <p className="text-xl font-bold text-gray-900">¥{formatCurrency(dailyBudget)}</p>
        </Card>
      </div>

      {/* Calendar Grid */}
      <Card>
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs text-gray-400 font-medium">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {daysInMonth.map((date) => {
            const { status, savings } = calculateDailyStats(date);
            const isTodayDate = isToday(date);
            
            return (
              <motion.div
                key={date.toString()}
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewingDate(date)}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium relative cursor-pointer
                  ${isTodayDate ? 'ring-2 ring-gray-900 ring-offset-2' : ''}
                  ${status === 'saved' ? 'bg-secondary/20 text-secondary' : ''}
                  ${status === 'overspent' ? 'bg-primary/20 text-primary' : ''}
                  ${status === 'neutral' ? 'bg-gray-100 text-gray-500' : ''}
                  ${status === 'future' ? 'bg-transparent text-gray-300' : ''}
                `}
              >
                <span>{format(date, 'd')}</span>
                {status !== 'future' && status !== 'neutral' && (
                  <span className="text-[10px] font-bold leading-none mt-0.5">
                    {status === 'saved' ? '+' : ''}{formatCurrency(savings)}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-center space-x-4 mt-6 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span>省钱了</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>超支了</span>
          </div>
        </div>
      </Card>

      {/* Recent Transactions Grouped */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800 px-1">本月记录</h2>
        {sortedDates.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-sm">本月暂无记录</p>
        ) : (
          sortedDates.map((date, index) => {
            const dailyTransactions = groupedTransactions[date];
            const dailyTotal = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);
            
            return (
              <div key={date} className="relative">
                {/* Header */}
                <div className="flex justify-between items-center px-1 mb-2 text-xs text-gray-400 font-medium">
                  <span>{format(new Date(date), 'MM月dd日 EEEE', { locale: zhCN })}</span>
                  <span>支出: {formatCurrency(dailyTotal)}</span>
                </div>
                
                {/* List */}
                <div className="space-y-3">
                  {dailyTransactions.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => openEditModal(t)}
                      className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100 group cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          t.tags.includes('fixed') ? 'bg-purple-100 text-purple-600' : 
                          t.tags.includes('necessary') ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {t.tags.includes('fixed') ? '固' : t.tags.includes('necessary') ? '必' : '非'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">
                            {t.note || (t.tags.includes('fixed') ? '固定支出' : '日常消费')}
                          </p>
                          <p className="text-xs text-gray-400 hidden">{format(new Date(t.date), 'MM-dd')}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-900">-¥{formatCurrency(t.amount)}</span>
                        <button 
                          onClick={(e) => handleDelete(t.id, e)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Fine line separator between days, but not after the last one */}
                {index < sortedDates.length - 1 && (
                   <div className="h-px bg-gray-100 mt-4 mb-2" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Day Details Modal */}
      <AnimatePresence>
        {viewingDate && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingDate(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-4xl md:mx-auto max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {format(viewingDate, 'MM月dd日 EEEE', { locale: zhCN })}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    当日支出: ¥{formatCurrency(
                      transactions
                        .filter(t => t.date === format(viewingDate, 'yyyy-MM-dd') && !t.deletedAt)
                        .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                </div>
                <button onClick={() => setViewingDate(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                  <ChevronDown size={20} />
                </button>
              </div>
              
              <div className="space-y-3 overflow-y-auto pb-8">
                {transactions.filter(t => t.date === format(viewingDate, 'yyyy-MM-dd') && !t.deletedAt).length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p>当日无消费记录</p>
                  </div>
                ) : (
                  transactions
                    .filter(t => t.date === format(viewingDate, 'yyyy-MM-dd') && !t.deletedAt)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((t) => (
                      <div 
                        key={t.id} 
                        onClick={() => openEditModal(t)}
                        className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100 group cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            t.tags.includes('fixed') ? 'bg-purple-100 text-purple-600' : 
                            t.tags.includes('necessary') ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            {t.tags.includes('fixed') ? '固' : t.tags.includes('necessary') ? '必' : '非'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">
                              {t.note || (t.tags.includes('fixed') ? '固定支出' : '日常消费')}
                            </p>
                            <p className="text-xs text-gray-400">{format(new Date(t.date), 'HH:mm')}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-gray-900">-¥{formatCurrency(t.amount)}</span>
                          <button 
                            onClick={(e) => handleDelete(t.id, e)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            aria-label="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Transaction Modal */}
      <AnimatePresence>
        {editingTransaction && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTransaction(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 md:max-w-4xl md:mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">编辑支出</h2>
                <button onClick={() => setEditingTransaction(null)} className="text-gray-400">取消</button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">金额</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-900">¥</span>
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl py-4 pl-10 pr-4 text-4xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-2 block">日期</label>
                  <div className="relative">
                     <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-2 block">标签</label>
                  <div className="flex space-x-3">
                    <TagButton 
                      label="必要支出" 
                      active={editTags.includes('necessary')} 
                      onClick={() => toggleEditTag('necessary')}
                      icon={<span className="text-lg">🍚</span>}
                    />
                    <TagButton 
                      label="固定支出" 
                      active={editTags.includes('fixed')} 
                      onClick={() => toggleEditTag('fixed')}
                      icon={<Zap size={16} />}
                    />
                    <TagButton 
                      label="非必要支出" 
                      active={editTags.includes('optional')} 
                      onClick={() => toggleEditTag('optional')}
                      icon={<span className="text-lg">🍔</span>}
                    />
                  </div>
                </div>

                <div>
                   <label className="text-sm text-gray-500 mb-2 block">消费详情</label>
                   <div className="relative">
                     <textarea
                       value={editNote}
                       onChange={(e) => {
                         if (e.target.value.length <= 100) {
                           setEditNote(e.target.value);
                         }
                       }}
                       placeholder="写点什么..."
                       className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-none text-sm placeholder:text-gray-400"
                     />
                     <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                       {editNote.length}/100
                     </div>
                   </div>
                </div>

                <Button fullWidth size="lg" onClick={handleUpdate}>
                  <Check size={20} className="mr-2" />
                  保存修改
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

export default CalendarPage;
