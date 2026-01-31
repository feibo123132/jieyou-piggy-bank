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
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { motion } from 'framer-motion';

const CalendarPage: React.FC = () => {
  const { transactions, settings } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  
  // Grid padding
  const startDay = getDay(firstDayOfMonth); // 0 (Sun) to 6 (Sat)
  const emptyDays = Array(startDay).fill(null);

  // Stats for the month
  const monthTransactions = transactions.filter(t => isSameMonth(new Date(t.date), currentDate));
  const totalSpent = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const fixedTotal = settings.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const dailyBudget = Math.max(0, (settings.monthlyBudget - fixedTotal) / getDaysInMonth(currentDate));

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTransactions = transactions.filter(t => t.date === dateStr);
    
    // Check if future
    if (date > new Date()) return 'future';

    // Check if no data
    // If past and no transactions, assumed saved full budget (Mode A logic)
    // But for UI, maybe just show gray if no interaction? 
    // Let's assume if day is past, we calculate.
    
    const dayConsumed = dayTransactions
      .filter(t => !t.tags.includes('fixed'))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const savings = dailyBudget - dayConsumed;
    
    if (savings > 0) return 'saved';
    if (savings < 0) return 'overspent';
    return 'neutral'; // Exactly 0 or no budget
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
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-orange-50 border-orange-100">
          <div className="flex items-center space-x-2 text-orange-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-bold">本月支出</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">¥{totalSpent.toFixed(0)}</p>
        </Card>
        <Card className="p-4 bg-teal-50 border-teal-100">
          <div className="flex items-center space-x-2 text-teal-600 mb-1">
            <TrendingDown size={16} />
            <span className="text-xs font-bold">日均限额</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">¥{dailyBudget.toFixed(0)}</p>
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
            const status = getDayStatus(date);
            const isTodayDate = isToday(date);
            
            return (
              <motion.div
                key={date.toString()}
                whileTap={{ scale: 0.9 }}
                className={`
                  aspect-square rounded-xl flex items-center justify-center text-sm font-medium relative
                  ${isTodayDate ? 'ring-2 ring-gray-900 ring-offset-2' : ''}
                  ${status === 'saved' ? 'bg-secondary/20 text-secondary' : ''}
                  ${status === 'overspent' ? 'bg-primary/20 text-primary' : ''}
                  ${status === 'neutral' ? 'bg-gray-100 text-gray-500' : ''}
                  ${status === 'future' ? 'bg-transparent text-gray-300' : ''}
                `}
              >
                {format(date, 'd')}
                {status === 'saved' && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-secondary" />
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

      {/* Recent Transactions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-800 px-1">最近记录</h2>
        {monthTransactions.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-sm">本月暂无记录</p>
        ) : (
          monthTransactions
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
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
                    <p className="text-xs text-gray-400">{format(new Date(t.date), 'MM-dd')}</p>
                  </div>
                </div>
                <span className="font-bold text-gray-900">-¥{t.amount}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
