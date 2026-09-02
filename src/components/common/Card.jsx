import React from 'react';

export function Card({ children, className = '', title, subtitle, action, footer }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            {title && <h3 className="font-bold text-slate-800 text-sm sm:text-base tracking-tight truncate">{title}</h3>}
            {subtitle && <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-3.5 sm:p-5 md:p-6">{children}</div>
      {footer && <div className="px-3.5 sm:px-6 py-3 bg-slate-50/50 border-t border-slate-100">{footer}</div>}
    </div>
  );
}
