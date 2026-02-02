import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Settings, Menu, X, LogOut, Box, Trash2, Volume2, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';

import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  
  const { updateSettings } = useAppStore();

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
