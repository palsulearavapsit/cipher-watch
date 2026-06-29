import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AlertPanel } from './AlertPanel';
import { useAlerts } from '../hooks/useAlerts';

export const Layout: React.FC = () => {
  const { alerts, dismissAlert } = useAlerts();

  return (
    <div className="flex h-screen bg-[#06080d] text-slate-200 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <AlertPanel alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
};
