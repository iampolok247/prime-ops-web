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

export default function AdmissionMetrics() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [metrics, setMetrics] = useState(null); // { metricsResp, reportsResp }
  const [loading, setLoading] = useState(false);
  const [admissionUsers, setAdmissionUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(user?._id || 'me');
  const [downloading, setDownloading] = useState(false);

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const isAdmission = user?.role === 'Admission';
  const canDownload = isAdmin || isAdmission;
  const [showRaw, setShowRaw] = useState(false);

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
    if (period === 'custom') {
      if (from && to) return { from: toISODate(from), to: toISODate(to) };
      return { from: null, to: null };
    }
    const now = new Date();
    if (period === 'daily') {
      const f = new Date(now); f.setHours(0,0,0,0);
      const t = new Date(now); t.setHours(23,59,59,999);
      return { from: toISODate(f), to: toISODate(t) };
    }
    if (period === 'weekly') {
      const f = new Date(now); f.setDate(now.getDate() - 7); f.setHours(0,0,0,0);
      return { from: toISODate(f), to: toISODate(now) };
    }
    if (period === 'monthly') {
      const f = new Date(now); f.setMonth(now.getMonth() - 1); f.setHours(0,0,0,0);
      return { from: toISODate(f), to: toISODate(now) };
    }
    return { from: null, to: null };
  }

  async function fetchMetrics() {
    setLoading(true);
    try {
      const range = computeRange();
      const userId = isAdmin ? (selectedUser === 'me' ? user._id : (selectedUser === 'all' ? undefined : selectedUser)) : user._id;

      const metricsPromise = api.getAdmissionMetrics(userId, range.from, range.to).catch(err => { console.warn('getAdmissionMetrics failed', err); return null; });
      const reportsPromise = api.getAdmissionReports(userId, range.from, range.to).catch(err => { console.warn('getAdmissionReports failed', err); return null; });

      const [metricsResp, reportsResp] = await Promise.all([metricsPromise, reportsPromise]);
      setMetrics({ metricsResp, reportsResp });
    } catch (e) {
      console.error('Failed to load metrics', e);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  // derive display values (the five items user requested)
  const display = {
    counselingCount: 0,
    followUpCount: 0,
    admittedCount: 0,
    interestedCount: 0,
    notInterestedCount: 0,
  };

  if (metrics) {
    const { metricsResp, reportsResp } = metrics;
    if (metricsResp) {
      if (metricsResp.stats) {
        // Old format (stats object)
        display.counselingCount = metricsResp.stats.counseling || 0;
        display.followUpCount = metricsResp.stats.followUps || metricsResp.stats.followUp || 0;
      } else if (metricsResp.metrics && Array.isArray(metricsResp.metrics)) {
        // Team format: metrics is an array of user metrics (when Admin selects 'all')
        // Sum all counseling and follow-up counts from all team members
        display.counselingCount = metricsResp.metrics.reduce((sum, m) => sum + (m.counselingCount || 0), 0);
        display.followUpCount = metricsResp.metrics.reduce((sum, m) => sum + (m.followUpCount || 0), 0);
      } else {
        // Single user format (individual Admission staff like Sajrin)
        display.counselingCount = metricsResp.counselingCount || metricsResp.counseling || 0;
        display.followUpCount = metricsResp.followUpCount || metricsResp.followUps || 0;
      }
    }

    if (reportsResp) {
      const stats = reportsResp.stats || {};
      display.admittedCount = stats.admitted || 0;

      // compile leads array
      let leads = [];
      if (Array.isArray(reportsResp.leads)) leads = reportsResp.leads;
      else if (Array.isArray(reportsResp.reports)) leads = [].concat(...reportsResp.reports.map(r=>r.leads||[]));

      const interestedSet = new Set(['Very Interested','Interested','Few Interested']);
      let interested = 0, notInterested = 0;
      leads.forEach(l => {
        const p = l.priority;
        if (p && interestedSet.has(p)) interested++;
        else if (p === 'Not Interested') notInterested++;
      });

      if (interested + notInterested === 0) {
        if (stats.interested !== undefined || stats.notInterested !== undefined) {
          interested = stats.interested || 0;
          notInterested = stats.notInterested || 0;
        }
      }

      display.interestedCount = interested;
      display.notInterestedCount = notInterested;
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const range = computeRange();
      const namePart = isAdmin ? (selectedUser === 'all' ? 'all' : (selectedUser === 'me' ? user.name : (admissionUsers.find(u=>u._id===selectedUser)?.name || 'user'))) : user.name;

      const rows = [];
      rows.push(['Report For', namePart]);
      rows.push(['Period', period === 'custom' && from && to ? `${from} to ${to}` : period]);
      rows.push([]);
      rows.push(['Metric','Value']);
      rows.push(['Total Counseling Calls', display.counselingCount]);
      rows.push(['Total Follow-up Calls', display.followUpCount]);
      rows.push(['Total Admitted', display.admittedCount]);
      rows.push(['Total Interested', display.interestedCount]);
      rows.push(['Total Not Interested', display.notInterestedCount]);

      const csvContent = rows.map(r => r.map(c => `"${String(c ?? '')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileName = `admission-brief-${namePart.replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.csv`;
      a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
      alert(e.message || 'Download failed');
    } finally {
      setDownloading(false);
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

      {canDownload && (
        <div className="mb-4 flex items-center gap-3">
          {isAdmin && (
            <select value={selectedUser || 'all'} onChange={e=>setSelectedUser(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
              <option value="all">Overall Team</option>
              <option value="me">My Metrics</option>
              {admissionUsers.map(u=> (
                <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
              ))}
            </select>
          )}

          <button onClick={fetchMetrics} disabled={loading} className="px-3 py-2 border rounded-lg bg-white">Refresh</button>

          <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg">
            <Download className="w-4 h-4" /> {downloading ? 'Downloading...' : 'Download CSV'}
          </button>

          <label className="ml-2 text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={showRaw} onChange={e=>setShowRaw(e.target.checked)} /> Show raw data</label>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Counseling (New Calls)</div>
              <div className="text-3xl font-bold mt-2">{loading ? '—' : (display.counselingCount ?? 0)}</div>
              <div className="text-xs text-gray-400 mt-1">New counseling calls in selected period</div>
            </div>
            <div className="text-gray-300"><Calendar className="w-10 h-10" /></div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Follow-up Calls</div>
              <div className="text-3xl font-bold mt-2">{loading ? '—' : (display.followUpCount ?? 0)}</div>
              <div className="text-xs text-gray-400 mt-1">Follow-up events (notes) in selected period</div>
            </div>
            <div className="text-gray-300"><Calendar className="w-10 h-10" /></div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Admitted</div>
              <div className="text-3xl font-bold mt-2">{loading ? '—' : (display.admittedCount ?? 0)}</div>
              <div className="text-xs text-gray-400 mt-1">Total admitted in period</div>
            </div>
            <div className="text-gray-300"><Calendar className="w-10 h-10" /></div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Interested</div>
              <div className="text-3xl font-bold mt-2">{loading ? '—' : (display.interestedCount ?? 0)}</div>
              <div className="text-xs text-gray-400 mt-1">Leads marked interested in period</div>
            </div>
            <div className="text-gray-300"><Calendar className="w-10 h-10" /></div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Not Interested</div>
              <div className="text-3xl font-bold mt-2">{loading ? '—' : (display.notInterestedCount ?? 0)}</div>
              <div className="text-xs text-gray-400 mt-1">Leads marked not interested in period</div>
            </div>
            <div className="text-gray-300"><Calendar className="w-10 h-10" /></div>
          </div>
        </div>
      </div>

      {/* Team Breakdown Table (when viewing all) */}
      {selectedUser === 'all' && metrics?.metricsResp?.metrics && Array.isArray(metrics.metricsResp.metrics) && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Team Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Team Member</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Counseling Calls</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Follow-up Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.metricsResp.metrics.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{m.userName || 'Unknown'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                        {m.counselingCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold">
                        {m.followUpCount || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showRaw && (
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <h4 className="font-semibold text-gray-700 mb-2">Raw Data (debug)</h4>
          <pre className="text-xs text-gray-600 max-h-60 overflow-auto">{loading ? 'Loading...' : (metrics ? JSON.stringify(metrics, null, 2) : 'No data')}</pre>
        </div>
      )}

      {/* If reports failed to load, show a small note */}
      {metrics && !metrics.reportsResp && (
        <div className="mt-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-100 rounded p-3">
          Detailed report data is not available for this request. The summary metrics above are shown from aggregated data. If you expect non-zero values, try adjusting the date range or click Refresh.
        </div>
      )}
    </div>
  );
}
