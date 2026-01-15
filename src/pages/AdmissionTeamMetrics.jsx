import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Download, RefreshCw, TrendingUp, Users, Phone, UserCheck, UserX } from 'lucide-react';

function toISODate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export default function AdmissionTeamMetrics() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [admissionUsers, setAdmissionUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [downloading, setDownloading] = useState(false);

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'HeadOfCreative';

  // Fetch admission team members
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
    
    // Today - same date for both from and to
    if (period === 'daily') {
      const today = toISODate(now);
      return { from: today, to: today };
    }
    
    // Last 7 Days
    if (period === 'weekly') {
      const f = new Date(now);
      f.setDate(now.getDate() - 7);
      return { from: toISODate(f), to: toISODate(now) };
    }
    
    // Monthly: 1st of current month to today
    if (period === 'monthly') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toISODate(f), to: toISODate(now) };
    }
    
    return { from: null, to: null };
  }

  async function fetchMetrics() {
    setLoading(true);
    try {
      const range = computeRange();
      const userId = selectedUser === 'all' ? undefined : selectedUser;

      const metricsResp = await api.getAdmissionMetrics(userId, range.from, range.to).catch(err => {
        console.error('Failed to fetch metrics:', err);
        return null;
      });

      if (!metricsResp) {
        setMetrics(null);
        return;
      }

      // Handle different response formats
      if (userId) {
        // Single user metrics - response has counselingCount, followUpCount, admittedCount, notAdmittedCount
        setMetrics({
          newCalls: metricsResp.counselingCount || 0,
          followUpCalls: metricsResp.followUpCount || 0,
          admitted: metricsResp.admittedCount || 0,
          notAdmitted: metricsResp.notAdmittedCount || 0
        });
      } else {
        // All team members - response has array in 'metrics' field
        const teamMetrics = metricsResp.metrics || [];
        
        // Sum up all team members' metrics
        const combined = teamMetrics.reduce((acc, member) => ({
          newCalls: acc.newCalls + (member.counselingCount || 0),
          followUpCalls: acc.followUpCalls + (member.followUpCount || 0),
          admitted: acc.admitted + (member.admittedCount || 0),
          notAdmitted: acc.notAdmitted + (member.notAdmittedCount || 0)
        }), { newCalls: 0, followUpCalls: 0, admitted: 0, notAdmitted: 0 });

        setMetrics(combined);
      }
    } catch (e) {
      console.error('Error fetching metrics:', e);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  async function downloadCSV() {
    if (!metrics) return;
    setDownloading(true);
    try {
      const display = {
        newCalls: metrics.newCalls || 0,
        followUpCalls: metrics.followUpCalls || 0,
        totalCalls: (metrics.newCalls || 0) + (metrics.followUpCalls || 0),
        admitted: metrics.admitted || 0,
        notAdmitted: metrics.notAdmitted || 0
      };

      const namePart = selectedUser === 'all' 
        ? 'All-Team-Members'
        : admissionUsers.find((u) => u._id === selectedUser)?.name || 'Team';

      const rows = [];
      rows.push(['Admission Team Metrics Report']);
      rows.push(['Report For', namePart]);
      rows.push(['Period', period === 'custom' && from && to ? `${from} to ${to}` : period]);
      rows.push(['Generated On', new Date().toLocaleString()]);
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
      const fileName = `admission-team-metrics-${namePart.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
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

  const display = metrics ? {
    newCalls: metrics.newCalls || 0,
    followUpCalls: metrics.followUpCalls || 0,
    totalCalls: (metrics.newCalls || 0) + (metrics.followUpCalls || 0),
    admitted: metrics.admitted || 0,
    notAdmitted: metrics.notAdmitted || 0
  } : { newCalls: 0, followUpCalls: 0, totalCalls: 0, admitted: 0, notAdmitted: 0 };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admission Team Metrics</h1>
        <p className="text-gray-600 mt-1">Track team counseling calls, follow-ups, and admissions</p>
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
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">Monthly (Current Month)</option>
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

          {/* Team Member selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Team Member</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Team Members (Combined)</option>
              {admissionUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
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

          <button
            onClick={downloadCSV}
            disabled={downloading || !metrics}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Downloading...' : 'Download CSV'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Calls */}
        <MetricCard
          label="Total Calls"
          value={display.totalCalls}
          icon={Phone}
          bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
          textColor="text-blue-600"
        />

        {/* New Calls */}
        <MetricCard
          label="New Calls (Counseling)"
          value={display.newCalls}
          icon={Phone}
          bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
          textColor="text-purple-600"
        />

        {/* Follow-up Calls */}
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
          icon={UserCheck}
          bgColor="bg-gradient-to-br from-green-50 to-green-100"
          textColor="text-green-600"
        />

        {/* Not Interested */}
        <MetricCard
          label="Not Interested"
          value={display.notAdmitted}
          icon={UserX}
          bgColor="bg-gradient-to-br from-red-50 to-red-100"
          textColor="text-red-600"
        />
      </div>

      {/* Info message if viewing all team members */}
      {selectedUser === 'all' && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Viewing Combined Team Metrics:</span> This shows the total metrics from all admission team members for the selected period.
            </p>
          </div>
        </div>
      )}

      {/* Individual member view */}
      {selectedUser !== 'all' && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <p className="text-sm text-gray-800">
              <span className="font-semibold">Viewing Individual Metrics:</span> {admissionUsers.find(u => u._id === selectedUser)?.name || 'Team Member'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
