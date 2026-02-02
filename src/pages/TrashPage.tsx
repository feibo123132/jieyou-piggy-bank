import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Trash2, RotateCcw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const TrashPage: React.FC = () => {
  const { transactions, restoreTransaction, permanentlyDeleteTransaction, cleanupTrash } = useAppStore();
  const navigate = useNavigate();
  const [deletedTransactions, setDeletedTransactions] = useState(
    transactions.filter(t => t.deletedAt).sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime())
  );

  useEffect(() => {
    // Auto cleanup on mount only
    cleanupTrash();
  }, [cleanupTrash]);

  useEffect(() => {
    // Update local state when transactions change
    setDeletedTransactions(
      transactions.filter(t => t.deletedAt).sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime())
    );
  }, [transactions]);

  const handleRestore = (id: string) => {
    if (window.confirm('确定要恢复这条记录吗？')) {
      restoreTransaction(id);
    }
  };

  const handlePermanentDelete = (id: string) => {
    if (window.confirm('彻底删除后无法找回，确定要删除吗？')) {
      permanentlyDeleteTransaction(id);
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deleteDate = new Date(deletedAt);
    const expireDate = new Date(deleteDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const days = differenceInDays(expireDate, today);
    return Math.max(0, days);
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Trash2 className="mr-2 text-gray-500" /> 垃圾桶
        </h1>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start space-x-3 mb-6">
        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-yellow-700">
          项目在删除 7 天后将被自动永久清除。请及时恢复误删的数据。
        </p>
      </div>

      {deletedTransactions.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Trash2 size={48} className="mx-auto mb-4 opacity-20" />
          <p>垃圾桶是空的</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deletedTransactions.map((t) => (
            <Card key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    t.tags.includes('fixed') ? 'bg-purple-100 text-purple-600' : 
                    t.tags.includes('necessary') ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {t.tags.includes('fixed') ? '固' : t.tags.includes('necessary') ? '必' : '非'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                     <span className="font-bold text-gray-900 text-lg">¥{t.amount}</span>
                     <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                       {getDaysRemaining(t.deletedAt!)}天后清除
                     </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                    {t.note || (t.tags.includes('fixed') ? '固定支出' : '日常消费')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    删除于: {format(new Date(t.deletedAt!), 'yyyy-MM-dd HH:mm')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center">
                <button
                  onClick={() => handleRestore(t.id)}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <RotateCcw size={16} className="mr-1.5" />
                  恢复
                </button>
                <button
                  onClick={() => handlePermanentDelete(t.id)}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 size={16} className="mr-1.5" />
                  彻底删除
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrashPage;