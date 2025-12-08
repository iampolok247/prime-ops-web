import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Download, RefreshCw, TrendingUp } from 'lucide-react';

function toISODate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toISOString().slice(0, 10);
  } catch {
    return '';
  }
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
  const isAdmission = user?.role === 'Admission';
  const canDownload = isAdmin || isAdmission;

  useEffect(() => {
    if (isAdmin) {
      api.listAdmissionUsers().then(r => {
        setAdmissionUsers(r?.users || []);
      }).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchMetrics();
  }, [period, from, to, selectedUser]);

  function computeRange() {
    const now = new Date();
    
    // Custom range
    if (period === 'custom') {
      if (from && to) return { from: toISODate(from), to: toISODate(to) };
      return { from: null, to: null };
    }
    
    // Today: 00:00 to 23:59:59 of today
    if (period === 'daily') {
      const f = new Date(now);
      f.setHours(0, 0, 0, 0);
      const t = new Date(now);
      t.setHours(23, 59, 59, 999);
      return { from: toISODate(f), to: toISODate(t) };
    }
    
    // Yesterday: 00:00 to 23:59:59 of yesterday
    if (period === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const t = new Date(yesterday);
      t.setHours(23, 59, 59, 999);
      return { from: toISODate(yesterday), to: toISODate(t) };
    }
    
    // Weekly: last 7 days from today
    if (period === 'weekly') {
      const f = new Date(now);
      f.setDate(now.getDate() - 7);
      f.setHours(0, 0, 0, 0);
      const t = new Date(now);
      t.setHours(23, 59, 59, 999);
      return { from: toISODate(f), to: toISODate(t) };
    }
    
    // Monthly: last 30 days from today
    if (period === 'monthly') {
      const f = new Date(now);
      f.setDate(now.getDate() - 30);
      f.setHours(0, 0, 0, 0);
      const t = new Date(now);
      t.setHours(23, 59, 59, 999);
      return { from: toISODate(f), to: toISODate(t) };
    }
    
    return { from: null, to: null };
  }

  async function fetchMetrics() {
    setLoading(true);
    try {
      const range = computeRange();
      const userId = isAdmin ? (selectedUser === 'me' ? user._id : (selectedUser === 'all' ? undefined : selectedUser)) : user._id;

      const metricsResp = await api.getAdmissionMetrics(userId, range.from, range.to).catch(err => {
        console.warn('getAdmissionMetrics failed', err);
        return null;
      });

      setMetrics(metricsResp);
    } catch (e) {
      console.error('Failed to load metrics', e);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  // Extract metrics data
  const display = {
    newCalls: 0,
    followUpCalls: 0,
    totalCalls: 0,
    admitted: 0,
    notAdmitted: 0,
  };

  if (metrics) {
    if (Array.isArray(metrics.metrics)) {
      // Team view - sum all metrics
      display.newCalls = metrics.metrics.reduce((sum, m) => sum + (m.counselingCount || 0), 0);
      display.followUpCalls = metrics.metrics.reduce((sum, m) => sum + (m.followUpCount || 0), 0);
      display.totalCalls = metrics.metrics.reduce((sum, m) => sum + (m.totalCalls || 0), 0);
      display.admitted = metrics.metrics.reduce((sum, m) => sum + (m.admittedCount || 0), 0);
      display.notAdmitted = metrics.metrics.reduce((sum, m) => sum + (m.notAdmittedCount || 0), 0);
    } else {
      // Individual user view
      display.newCalls = metrics.counselingCount || 0;
      display.followUpCalls = metrics.followUpCount || 0;
      display.totalCalls = metrics.totalCalls || 0;
      display.admitted = metrics.admittedCount || 0;
      display.notAdmitted = metrics.notAdmittedCount || 0;
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const range = computeRange();
      const namePart = isAdmin
        ? selectedUser === 'all'
          ? 'all'
          : selectedUser === 'me'
            ? user.name
            : admissionUsers.find((u) => u._id === selectedUser)?.name || 'user'
        : user.name;

      const rows = [];
      rows.push(['Report For', namePart]);
      rows.push(['Period', period === 'custom' && from && to ? `${from} to ${to}` : period]);
      rows.push([]);
      rows.push(['Metric', 'Value']);
      rows.push(['New Calls (Counseling)', display.newCalls]);
      rows.push(['Follow-up Calls', display.followUpCalls]);
      rows.push(['Total Calls', display.totalCalls]);
      rows.push(['Admitted', display.admitted]);
  rows.push(['Not Interested', display.notAdmitted]);

      const csvContent = rows.map((r) => r.map((c) => `"${String(c ?? '')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileName = `admission-metrics-${namePart.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
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

  // Helper to render metric card
  const MetricCard = ({ label, value, icon: Icon, bgColor, textColor }) => (
    <div className={`${bgColor} rounded-lg p-6 shadow-md border border-opacity-20`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${textColor}`}>{label}</p>
          <p className="text-4xl font-bold mt-3 text-gray-900">{loading ? '—' : value}</p>
        </div>
        {Icon && <Icon className={`w-10 h-10 ${textColor} opacity-30`} />}
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admission Metrics</h1>
        <p className="text-gray-600 mt-1">Track counseling calls, follow-ups, and admissions</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Period selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* User selector for Admin */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Member</label>
              <select
                value={selectedUser || 'all'}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Team Members</option>
                <option value="me">My Metrics</option>
                {admissionUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          {canDownload && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download CSV'}
            </button>
          )}
        </div>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Calls = New Calls + Follow-up Calls */}
        <MetricCard
          label="Total Calls"
          value={display.totalCalls}
          icon={TrendingUp}
          bgColor="bg-gradient-to-br from-indigo-50 to-indigo-100"
          textColor="text-indigo-600"
        />

        {/* New Calls = Click Start Counseling */}
        <MetricCard
          label="New Calls (Counseling)"
          value={display.newCalls}
          icon={TrendingUp}
          bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
          textColor="text-blue-600"
        />

        {/* Follow-up Calls = Click Follow-up Again */}
        <MetricCard
          label="Follow-up Calls"
          value={display.followUpCalls}
          icon={TrendingUp}
          bgColor="bg-gradient-to-br from-orange-50 to-orange-100"
          textColor="text-orange-600"
        />

        {/* Admitted */}
        <MetricCard
          label="Admitted"
          value={display.admitted}
          icon={TrendingUp}
          bgColor="bg-gradient-to-br from-green-50 to-green-100"
          textColor="text-green-600"
        />

  {/* Not Interested (aggregates Not Admitted + Not Interested) */}
        <MetricCard
          label="Not Interested"
          value={display.notAdmitted}
          icon={TrendingUp}
          bgColor="bg-gradient-to-br from-red-50 to-red-100"
          textColor="text-red-600"
        />
      </div>

      {/* Team Breakdown Table (when viewing all) */}
      {selectedUser === 'all' && metrics?.metrics && Array.isArray(metrics.metrics) && metrics.metrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Team Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Team Member</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">New Calls</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Follow-up Calls</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Total</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Admitted</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Not Interested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.metrics.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{m.userName || 'Unknown'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold text-xs">
                        {m.counselingCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold text-xs">
                        {m.followUpCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-xs">
                        {m.totalCalls || 0}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold text-xs">
                        {m.admittedCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold text-xs">
                        {m.notAdmittedCount || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && metrics && (!Array.isArray(metrics.metrics) || metrics.metrics.length === 0) && selectedUser === 'all' && (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <p className="text-gray-600">No metrics data available for the selected period.</p>
        </div>
      )}
    </div>
  );
}
