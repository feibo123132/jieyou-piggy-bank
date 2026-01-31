import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-2xl font-rounded font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              JIEYOU
            </span>
          </div>
          <div className="flex space-x-1 sm:space-x-4 items-center">
            <NavLinkItem to="/" icon={<LayoutDashboard size={20} />} label="首页" />
            <NavLinkItem to="/calendar" icon={<Calendar size={20} />} label="日历" />
            <NavLinkItem to="/settings" icon={<Settings size={20} />} label="设置" />
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
