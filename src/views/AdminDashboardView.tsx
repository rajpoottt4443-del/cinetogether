import React, { useState, useEffect } from 'react';
import { Shield, Users, Radio, AlertTriangle, Lock, Unlock, Activity, Server, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import { AdminMetrics, AuditLog } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AdminDashboardViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [lockedUsers, setLockedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const res = await api.getAdminMetrics();
      setMetrics(res.metrics);
      setAuditLogs(res.auditLogs);
      setLockedUsers(res.lockedUsers);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUnlockUser = async (email: string) => {
    try {
      await api.unlockUser(email);
      setActionMessage(`Account ${email} manually unlocked.`);
      fetchAdminData();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to unlock user.');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-20 p-8 glass-panel rounded-2xl text-center space-y-4">
        <Shield className="w-10 h-10 text-cyan-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Administrator Access Required</h3>
        <p className="text-xs text-slate-300">You must be signed in with an administrative account to access this console.</p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="glass-button-primary px-5 py-2 rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-black py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Top Header */}
      <div className="max-w-7xl mx-auto border-b border-[#B5D5ED]/10 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              CineTogether Security & Infrastructure Operations
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time monitoring of 5-attempt brute force lockouts, WebRTC SFU cluster, and audit logs.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="glass-button-secondary px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#B5D5ED]" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {actionMessage && (
        <div className="max-w-7xl mx-auto p-3 rounded-xl bg-[#071426] border border-[#397CB8] text-white text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#B5D5ED]" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="glass-panel rounded-2xl p-5 border border-[#B5D5ED]/15 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Registered</span>
            <Users className="w-4 h-4 text-[#B5D5ED]" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono tabular-nums">
            {metrics?.totalUsers ?? '...'}
          </p>
          <span className="text-[11px] text-[#B5D5ED]">
            {metrics?.activeUsersOnline ?? 0} active now
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-[#B5D5ED]/15 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Party Rooms</span>
            <Radio className="w-4 h-4 text-[#B5D5ED]" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono tabular-nums">
            {metrics?.activeRooms ?? 0}
          </p>
          <span className="text-[11px] text-cyan-300">Synchronized Playback</span>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-[#B5D5ED]/15 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Failed Auth Attempts</span>
            <AlertTriangle className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono tabular-nums">
            {metrics?.totalFailedLogins ?? 0}
          </p>
          <span className="text-[11px] text-slate-400">5-Attempt Rule Enforced</span>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-[#B5D5ED]/15 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Currently Locked</span>
            <Lock className="w-4 h-4 text-cyan-300" />
          </div>
          <p className="text-2xl font-extrabold text-cyan-300 font-mono tabular-nums">
            {metrics?.currentlyLockedAccounts ?? 0}
          </p>
          <span className="text-[11px] text-slate-400">15m Security Cooldown</span>
        </div>

      </div>

      {/* Locked Accounts Monitor Section */}
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-4">
        <div className="flex items-center justify-between border-b border-[#B5D5ED]/10 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Locked Accounts & Security Cooldowns (Max 5 Consecutive Failures)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Automated brute-force shielding
          </span>
        </div>

        {lockedUsers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No accounts are currently in lockout status. All authentication channels are nominal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#B5D5ED]/10 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5">User / Email</th>
                  <th className="py-2.5">Permanent User ID</th>
                  <th className="py-2.5">Failed Count</th>
                  <th className="py-2.5">Cooldown Remaining</th>
                  <th className="py-2.5 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B5D5ED]/5">
                {lockedUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-3 font-semibold text-white">{u.email}</td>
                    <td className="py-3 font-mono text-[#B5D5ED]">{u.userId}</td>
                    <td className="py-3 text-cyan-300 font-bold">{u.failedAttempts} / 5</td>
                    <td className="py-3 font-mono text-slate-300">~{u.remainingMinutes} min remaining</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleUnlockUser(u.email)}
                        className="glass-button-primary px-3 py-1 rounded text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>Unlock Account</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Real-Time Security Audit Logs */}
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-4">
        <div className="flex items-center justify-between border-b border-[#B5D5ED]/10 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#B5D5ED]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Security Audit Stream (OWASP Compliance)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live Ingest Active</span>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#B5D5ED]/10 text-slate-400 uppercase tracking-wider text-[10px] sticky top-0 bg-[#071426]">
              <tr>
                <th className="py-2">Timestamp</th>
                <th className="py-2">Action</th>
                <th className="py-2">User / Target</th>
                <th className="py-2">IP Origin</th>
                <th className="py-2">Status</th>
                <th className="py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B5D5ED]/5 font-mono text-[11px]">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/5">
                  <td className="py-2 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2 text-white font-semibold">{log.action}</td>
                  <td className="py-2 text-[#B5D5ED]">{log.userEmail || 'Anonymous'}</td>
                  <td className="py-2 text-slate-400">{log.ip}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'success' ? 'bg-[#102D55] text-cyan-300' :
                      log.status === 'failure' ? 'bg-[#071426] text-cyan-200 border border-cyan-400/30' : 'text-slate-300'
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 text-slate-300 font-sans text-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
