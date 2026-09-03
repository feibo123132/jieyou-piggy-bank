import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Settings, Menu, X, LogOut, Trash2, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { isSameMonth, format, subMonths, addMonths } from 'date-fns';

import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [isUnfixedModalOpen, setIsUnfixedModalOpen] = useState(false);
  const [unfixedModalDate, setUnfixedModalDate] = useState(new Date());
  
  const menuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  
  const { updateSettings, settings, transactions } = useAppStore();

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close desktop menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target as Node)) {
        setIsDesktopMenuOpen(false);
      }
    };

    if (isDesktopMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDesktopMenuOpen]);

  // Close menu on route change (optional, but good UX)
  const handleLinkClick = () => setIsOpen(false);

  const handleLogout = () => {
      if (window.confirm('确定要退出当前账号吗？本地数据将保留，但需重新登录才能访问。')) {
          updateSettings({ username: '' });
          setIsDesktopMenuOpen(false);
      }
  };

  const unfixedTransactions = transactions
    .filter(t => isSameMonth(new Date(t.date), unfixedModalDate) && !t.deletedAt && t.tags.includes('unfixed'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
  const totalUnfixed = unfixedTransactions.reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amount: number) => {
    return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1);
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center relative">
          <div className="flex items-center">
            <span className="text-2xl font-rounded font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              JIEYOU
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex space-x-1 mr-2">
                <NavLinkItem to="/" icon={<LayoutDashboard size={20} />} label="首页" />
                <NavLinkItem to="/calendar" icon={<Calendar size={20} />} label="日历" />
                <NavLinkItem to="/settings" icon={<Settings size={20} />} label="设置" />
            </div>

            {/* Desktop More Menu */}
            <div className="relative" ref={desktopMenuRef}>
                <button
                  onClick={() => setIsDesktopMenuOpen(!isDesktopMenuOpen)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700 border border-transparent hover:border-gray-200"
                >
                  <Menu size={24} />
                </button>
                
                <AnimatePresence>
                    {isDesktopMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-14 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2 z-50"
                        >
                           <div className="px-4 py-3 border-b border-gray-100 mb-1">
                             <div className="flex items-center space-x-2 text-gray-500 mb-1">
                               <User size={14} />
                               <span className="text-xs">当前账号</span>
                             </div>
                             <p className="font-bold text-gray-800 truncate">{settings.username || '未登录'}</p>
                           </div>

                           <button 
                               onClick={() => {
                                 setIsUnfixedModalOpen(true);
                                 setIsDesktopMenuOpen(false);
                               }}
                               className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                           >
                               <span className="text-lg leading-none w-[18px] text-center">💸</span>
                               <span>偶发支出</span>
                           </button>

                           <button 
                               onClick={() => {
                                 navigate('/trash');
                                 setIsDesktopMenuOpen(false);
                               }}
                               className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                           >
                               <Trash2 size={18} />
                               <span>垃圾桶</span>
                           </button>

                           <div className="h-px bg-gray-100 my-1" />

                           <button 
                               onClick={handleLogout}
                               className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                           >
                               <LogOut size={18} />
                               <span>退出登录</span>
                           </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden" ref={menuRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Dropdown Menu */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-16 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2"
                >
                  <div className="flex flex-col">
                    <MobileNavLinkItem to="/" icon={<LayoutDashboard size={20} />} label="首页" onClick={handleLinkClick} />
                    <MobileNavLinkItem to="/calendar" icon={<Calendar size={20} />} label="日历" onClick={handleLinkClick} />
                    <MobileNavLinkItem to="/settings" icon={<Settings size={20} />} label="设置" onClick={handleLinkClick} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* Unfixed Expenses Modal */}
      <AnimatePresence>
        {isUnfixedModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUnfixedModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-[70] max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="text-2xl mr-2">💸</span>
                    偶发支出
                  </h2>
                </div>
                <button 
                  onClick={() => setIsUnfixedModalOpen(false)}
                  className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex justify-between items-center bg-gray-50 rounded-xl p-2 mb-4">
                <button 
                  onClick={() => setUnfixedModalDate(prev => subMonths(prev, 1))}
                  className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-600 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-medium text-gray-800 text-sm">
                  {format(unfixedModalDate, 'yyyy年 MM月')}
                </span>
                <button 
                  onClick={() => setUnfixedModalDate(prev => addMonths(prev, 1))}
                  className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-600 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-3 pb-2">
                {/* Total Unfixed Spending Display */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-2xl flex justify-between items-center text-white mb-2 shadow-md">
                  <div>
                    <p className="text-sm text-gray-300 font-medium">本月总支出</p>
                  </div>
                  <span className="font-bold text-xl">¥{formatCurrency(totalUnfixed)}</span>
                </div>

                {unfixedTransactions.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p>{format(unfixedModalDate, 'MM月')}暂无偶发支出记录</p>
                  </div>
                ) : (
                  unfixedTransactions.map(t => (
                    <div key={t.id} className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-800">{t.note || '偶发支出'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{format(new Date(t.date), 'MM-dd')}</p>
                      </div>
                      <span className="font-bold text-gray-900">-¥{formatCurrency(t.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

const NavLinkItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => clsx(
        "flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <span className="mr-1.5">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
};

const MobileNavLinkItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick: () => void }> = ({ to, icon, label, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => clsx(
        "flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200",
        isActive
          ? "bg-primary/5 text-primary border-l-4 border-primary"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
      )}
    >
      <span className="mr-3">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
        >
            <span className="text-gray-500">{icon}</span>
            <span>{label}</span>
        </button>
    );
};
