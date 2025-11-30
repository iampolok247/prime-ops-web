import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Download, Calendar } from 'lucide-react';

function toISODate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function card(title, value, subtitle) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold text-gray-800 mt-2">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

export default function AdmissionMetrics() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [admissionUsers, setAdmissionUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(user?._id || 'me');
  const [downloading, setDownloading] = useState(false);

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  useEffect(() => {
    // load admission users if admin
    if (isAdmin) {
      api.listAdmissionUsers().then(r => {
        const users = r?.users || [];
        setAdmissionUsers(users);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [period, from, to, selectedUser]);

  function computeRange() {
    if (period === 'custom') {
      if (from && to) {
        return { from: toISODate(from), to: toISODate(to) };
      }
      return { from: null, to: null };
    }

    const now = new Date();
    if (period === 'daily') {
      const f = new Date(now);
      f.setHours(0,0,0,0);
      const t = new Date(now);
      t.setHours(23,59,59,999);
      return { from: toISODate(f), to: toISODate(t) };
    }
    if (period === 'weekly') {
      const f = new Date(now);
      f.setDate(now.getDate() - 7);
      f.setHours(0,0,0,0);
      return { from: toISODate(f), to: toISODate(now) };
    }
    if (period === 'monthly') {
      const f = new Date(now);
      f.setMonth(now.getMonth() - 1);
      f.setHours(0,0,0,0);
      return { from: toISODate(f), to: toISODate(now) };
    }
    // lifetime
    return { from: null, to: null };
  }

  async function fetchMetrics() {
    setLoading(true);
    try {
      const { from: f, to: t } = computeRange();
      const userId = isAdmin ? (selectedUser === 'me' ? user._id : (selectedUser === 'all' ? undefined : selectedUser)) : user._id;
      const data = await api.getAdmissionMetrics(userId, f, t);
      // expected shape: { user:..., reports:..., counts? or single stats }
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load metrics', e);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const { from: f, to: t } = computeRange();
      const userId = isAdmin ? (selectedUser === 'me' ? user._id : (selectedUser === 'all' ? undefined : selectedUser)) : user._id;
      const blob = await api.downloadAdmissionMetricsCSV(userId, f, t);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const namePart = isAdmin ? (selectedUser === 'all' ? 'all' : (selectedUser === 'me' ? user.name : (admissionUsers.find(u=>u._id===selectedUser)?.name || 'user'))) : user.name;
      const fileName = `admission-metrics-${namePart}-${new Date().toISOString().slice(0,10)}.csv`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
      alert(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  // derive display values
  let display = {
    counselingCount: 0,
    followUpCount: 0,
  };
  // backend may return { stats: { counseling, followUp } } for single user
  if (metrics) {
    if (metrics.stats) {
      display.counselingCount = metrics.stats.counseling || 0;
      display.followUpCount = metrics.stats.followUps || metrics.stats.followUpCount || metrics.stats.followUp || 0;
    } else if (metrics.counselingCount !== undefined || metrics.followUpCount !== undefined) {
      display.counselingCount = metrics.counselingCount || 0;
      display.followUpCount = metrics.followUpCount || 0;
    } else if (Array.isArray(metrics.reports)) {
      // aggregate across reports
      const agg = metrics.reports.reduce((acc, r) => {
        acc.counseling += (r.stats?.counseling || 0);
        acc.followUps += (r.stats?.followUps || r.stats?.followUp || 0);
        return acc;
      }, { counseling: 0, followUps: 0 });
      display.counselingCount = agg.counseling;
      display.followUpCount = agg.followUps;
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Admission Metrics</h2>
          <p className="text-sm text-gray-500">Counseling and Follow-up counts (today / weekly / monthly / custom)</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e=>setPeriod(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
            <option value="daily">Today</option>
            <option value="weekly">Last 7 days</option>
            <option value="monthly">Last 30 days</option>
            <option value="lifetime">Lifetime</option>
            <option value="custom">Custom</option>
          </select>
          {period === 'custom' && (
            <>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-2 border rounded-lg bg-white" />
              <span className="text-sm text-gray-500">to</span>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="px-3 py-2 border rounded-lg bg-white" />
            </>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="mb-4 flex items-center gap-3">
          <select value={selectedUser || 'all'} onChange={e=>setSelectedUser(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
            <option value="all">Overall Team</option>
            <option value="me">My Metrics</option>
            {admissionUsers.map(u=> (
              <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg">
            <Download className="w-4 h-4" /> {downloading ? 'Downloading...' : 'Download CSV'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Counseling Count</div>
              <div className="text-3xl font-bold mt-2">{loading ? '—' : (display.counselingCount ?? 0)}</div>
              <div className="text-xs text-gray-400 mt-1">Number of counseling events in selected period</div>
            </div>
            <div className="text-gray-300">
              <Calendar className="w-10 h-10" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Follow-up Count</div>
              <div className="text-3xl font-bold mt-2">{loading ? '—' : (display.followUpCount ?? 0)}</div>
              <div className="text-xs text-gray-400 mt-1">Number of follow-up events (notes) in selected period</div>
            </div>
            <div className="text-gray-300">
              <Calendar className="w-10 h-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Raw payload preview for debug / deeper insights */}
      <div className="bg-white rounded-lg p-4 border border-gray-100">
        <h4 className="font-semibold text-gray-700 mb-2">Raw Data</h4>
        <pre className="text-xs text-gray-600 max-h-60 overflow-auto">{loading ? 'Loading...' : (metrics ? JSON.stringify(metrics, null, 2) : 'No data')}</pre>
      </div>
    </div>
  );
}
