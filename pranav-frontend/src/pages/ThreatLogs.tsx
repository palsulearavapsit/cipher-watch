import React, { useState } from 'react';
import { useThreats } from '../hooks/useThreats';
import { Threat } from '../types';

export const ThreatLogs: React.FC = () => {
  const { threats, loading } = useThreats();
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (score >= 50) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  const getStatusPill = (status: Threat['status']) => {
    switch (status) {
      case 'active': return 'bg-rose-500/10 text-rose-400';
      case 'investigating': return 'bg-amber-500/10 text-amber-400';
      case 'resolved': return 'bg-emerald-500/10 text-emerald-400';
    }
  };

  const sortedThreats = [...threats].sort((a, b) => {
    return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
  });

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Threat Logs</h2>
          <p className="text-slate-400 text-sm">Detailed view of all detected security events.</p>
        </div>
      </header>

      <div className="bg-[#0a0e17] rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Threat Type</th>
                <th 
                  className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors flex items-center"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  Score {sortOrder === 'desc' ? '↓' : '↑'}
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Timestamp</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">Loading threats...</td></tr>
              ) : sortedThreats.map((threat) => (
                <tr key={threat.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-4 px-6 font-mono text-sm text-cyan-400">{threat.id}</td>
                  <td className="py-4 px-6 font-medium text-slate-200">{threat.type}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded border text-xs font-mono font-bold ${getScoreBadge(threat.score)}`}>
                      {threat.score}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-400">{formatDate(threat.timestamp)}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusPill(threat.status)}`}>
                      {threat.status}
                    </span>
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
