import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Wifi, WifiOff, Building2, Calendar, Clock, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Header() {
  const { shopSettings, isDbConnected } = useApp();
  const [time, setTime] = useState(new Date());
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between select-none flex-shrink-0">
      {/* Shop Info & Mode Status */}
      <div className="flex items-center gap-3 md:gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <Building2 className="w-4 h-4 text-brand-600" />
          <span className="truncate max-w-[200px] md:max-w-none">{shopSettings.shop_name || 'Jagdamba Cloth House'}</span>
        </div>
        <span className="text-slate-300 hidden sm:inline">|</span>
        
        {isElectron ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
            <WifiOff className="w-3.5 h-3.5 text-brand-600" />
            <span>Desktop ERP</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium border border-brand-200/60">
            <Globe className="w-3.5 h-3.5 text-brand-600" />
            <span>Cloud Web ERP</span>
          </div>
        )}

        {isDbConnected ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live SQLite Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Connecting to DB...
          </span>
        )}
      </div>

      {/* Date, Time & Window Controls */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-700 font-semibold">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>{time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>

        {/* Electron Window Controls (Only rendered inside Electron App) */}
        {isElectron && (
          <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
            <button
              onClick={handleMinimize}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Maximize"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-red-600 rounded-md transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
