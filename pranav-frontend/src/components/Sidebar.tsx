import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  Activity,
  Network,
  Settings,
  AlertTriangle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: Shield
    },
    {
      name: 'Threat Logs',
      path: '/logs',
      icon: Activity
    },
    {
      name: 'Blockchain Monitor',
      path: '/blockchain',
      icon: Network
    },
    {
      name: 'Threat Simulator',
      path: '/simulator',
      icon: AlertTriangle
    }
  ];

  return (
    <aside className="w-64 bg-[#0a0e17] border-r border-slate-800 flex flex-col h-full shrink-0">

      <div className="p-6 flex items-center space-x-3 text-cyan-400">
        <Shield className="w-8 h-8" />
        <h1 className="font-bold text-lg leading-tight tracking-wider">
          RTMTS
          <br />
          <span className="text-xs font-normal text-slate-400 uppercase">
            Scanner
          </span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-900/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="flex items-center space-x-3 px-4 py-3 w-full text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 rounded-md transition-colors text-sm font-medium">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>

    </aside>
  );
};