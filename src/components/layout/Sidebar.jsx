import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  History,
  Truck,
  Users, 
  Receipt,
  BarChart3, 
  Database,
  Settings as SettingsIcon,
  Shirt
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Sidebar() {
  const { isDbConnected } = useApp();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'New Sale (POS)', path: '/pos', icon: ShoppingCart, highlight: true },
    { name: 'Sales History', path: '/sales-history', icon: History },
    { name: 'Inventory & Products', path: '/inventory', icon: Package },
    { name: 'Purchases & Suppliers', path: '/purchases', icon: Truck },
    { name: 'Customer Khata', path: '/khata', icon: Users },
    { name: 'Shop Expenses', path: '/expenses', icon: Receipt },
    { name: 'Reports & CA Export', path: '/reports', icon: BarChart3 },
    { name: 'Backup & Restore', path: '/backup', icon: Database },
    { name: 'Store Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 select-none flex-shrink-0">
      {/* Shop Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 flex-shrink-0">
          <Shirt className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-white text-base tracking-tight leading-none truncate">JAGDAMBA</h1>
          <p className="text-[11px] text-brand-400 font-medium tracking-wide mt-1 truncate">Unstitched Clothing ERP</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : item.highlight
                    ? 'bg-brand-950/60 text-brand-300 hover:bg-brand-900 hover:text-white border border-brand-800/40'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Offline Desktop Status Badge */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        {isDbConnected ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="truncate">Offline SQLite Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/60 border border-red-800/40 text-red-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="truncate">DB Unavailable</span>
          </div>
        )}
      </div>
    </aside>
  );
}
