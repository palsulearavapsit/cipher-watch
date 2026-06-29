import React from 'react';
import { useWalletActivity } from '../hooks/useWalletActivity';
import { WalletActivity } from '../types';

export const BlockchainMonitor: React.FC = () => {
  const { activity, loading } = useWalletActivity();

  const truncateWallet = (wallet: string) => {
    if (wallet.length <= 12) return wallet;
    return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
  };

  const getStatusPill = (status: WalletActivity['status']) => {
    switch (status) {
      case 'flagged': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'review': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      case 'normal': return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Blockchain Monitor</h2>
          <p className="text-slate-400 text-sm">Real-time tracking of suspicious wallet activities and transactions.</p>
        </div>
      </header>

      <div className="bg-[#0a0e17] rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Wallet Address</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount (ETH)</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">Loading wallet activity...</td></tr>
              ) : activity.map((act, index) => (
                <tr key={index} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-4 px-6 font-mono text-sm text-cyan-400">
                    {truncateWallet(act.wallet)}
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-200">
                    {act.amount.toFixed(4)}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusPill(act.status)}`}>
                      {act.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-xs text-slate-400 hover:text-cyan-400 transition-colors underline underline-offset-2">
                      View Source
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
