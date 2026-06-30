// Phase 6 — Lead Analytics
// Admin/DM: full KPI dashboard with date range + per-counsellor breakdown
// Admission (counsellor): minimal, auto-scoped to themselves, no admin controls
import { useEffect, useState, useCallback } from 'react';
import { BarChart2, TrendingUp, Flame, Snowflake, UserCheck, XCircle, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';

const RANGE_PRESETS = [
  { label: 'Last 30 Days',  days: 30 },
  { label: 'This Month',    thisMonth: true },
  { label: 'Last 6 Months', days: 182 },
];

function getRangeDates(preset) {
  const to = new Date().toISOString().slice(0, 10);
  if (preset.thisMonth) {
    const d = new Date();
    const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    return { from, to };
  }
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - preset.days);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

const KPI_CARDS = [
  { key: 'totalAssigned',  label: 'Total Assigned', icon: BarChart2, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { key: 'hot',            label: 'Hot Leads',      icon: Flame,     color: 'bg-red-50 border-red-200 text-red-700' },
  { key: 'warm',           label: 'Warm Leads',     icon: TrendingUp,color: 'bg-orange-50 border-orange-200 text-orange-600' },
  { key: 'cold',           label: 'Cold Leads',     icon: Snowflake, color: 'bg-sky-50 border-sky-200 text-sky-700' },
  { key: 'admitted',       label: 'Admitted',       icon: UserCheck, color: 'bg-green-50 border-green-200 text-green-700' },
  { key: 'notInterested',  label: 'Not Interested', icon: XCircle,   color: 'bg-gray-50 border-gray-200 text-gray-500' },
];

export default function MetaLeadsAnalytics() {
  const { user } = useAuth();
  const isAdmin = ['DigitalMarketing', 'Admin', 'SuperAdmin', 'ITAdmin'].includes(user?.role);

  const [preset, setPreset]     = useState(RANGE_PRESETS[0]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getRangeDates(preset);
      const res = await api.getMetaLeadTeamStats(from, to);
      setStats(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 size={20} className="text-[#253985]" />
          <h1 className="text-xl font-bold text-[#253985]">
            {isAdmin ? 'Lead Analytics' : 'My Performance'}
          </h1>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {RANGE_PRESETS.map(p => (
            <button key={p.label} onClick={() => setPreset(p)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition
                ${preset.label === p.label ? 'bg-white shadow text-[#253985]' : 'text-gray-500 hover:text-gray-700'}`}>
              <Calendar size={11} /> {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : !stats ? (
        <div className="text-center py-16 text-gray-400 text-sm">No data</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {KPI_CARDS.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className={`rounded-xl border p-3 ${color}`}>
                <Icon size={16} className="mb-1.5 opacity-70" />
                <p className="text-2xl font-bold">{stats[key] ?? 0}</p>
                <p className="text-xs mt-0.5 opacity-80">{label}</p>
              </div>
            ))}
          </div>

          {/* Conversion rate banner */}
          <div className="bg-gradient-to-r from-[#253985] to-blue-600 rounded-2xl p-5 text-white flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wide">Conversion Rate</p>
              <p className="text-3xl font-bold mt-1">{stats.conversionRate}%</p>
              <p className="text-xs opacity-70 mt-1">{stats.admitted} admitted out of {stats.totalAssigned} assigned</p>
            </div>
            <TrendingUp size={36} className="opacity-30" />
          </div>

          {/* Per-counsellor breakdown — Admin/DM only */}
          {isAdmin && stats.perUserStats && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Counsellor</th>
                    <th className="px-4 py-3 text-left">Total Assigned</th>
                    <th className="px-4 py-3 text-left">Hot</th>
                    <th className="px-4 py-3 text-left">Warm</th>
                    <th className="px-4 py-3 text-left">Cold</th>
                    <th className="px-4 py-3 text-left">Admitted</th>
                    <th className="px-4 py-3 text-left">Not Interested</th>
                    <th className="px-4 py-3 text-left">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.perUserStats.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">No assignments in this period</td></tr>
                  ) : stats.perUserStats.map(u => (
                    <tr key={u.userId} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{u.userName}</td>
                      <td className="px-4 py-2.5 text-gray-600">{u.totalAssigned}</td>
                      <td className="px-4 py-2.5 text-red-600 font-medium">{u.hot}</td>
                      <td className="px-4 py-2.5 text-orange-500 font-medium">{u.warm}</td>
                      <td className="px-4 py-2.5 text-blue-500 font-medium">{u.cold}</td>
                      <td className="px-4 py-2.5 text-green-600 font-medium">{u.admitted}</td>
                      <td className="px-4 py-2.5 text-gray-500">{u.notInterested}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] px-2 py-0.5 bg-[#253985]/10 text-[#253985] rounded-full font-semibold">
                          {u.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
