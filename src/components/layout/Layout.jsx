import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../common/Toast';

export function Layout() {
  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 w-full overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 bg-slate-50/50 max-w-full">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
