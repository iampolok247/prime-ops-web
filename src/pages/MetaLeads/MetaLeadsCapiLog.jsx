// Dedicated tracking table for Meta Conversions API (CAPI) sends.
// Every Lead / ViewContent / CompleteRegistration attempt — success or
// failure — is logged here so DM/Admin can verify Meta is actually
// receiving conversion data without digging through server logs.
import { useEffect, useState, useCallback } from 'react';
import { Send, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle, Filter } from 'lucide-react';
import api from '../../lib/api.js';

const EVENT_PILL = {
  Lead:                 'bg-blue-100 text-blue-700',
  ViewContent:          'bg-orange-100 text-orange-700',
  CompleteRegistration: 'bg-green-100 text-green-700',
};

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
  : '—';

export default function MetaLeadsCapiLog() {
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState(''); // '', 'true', 'false'
  const [eventFilter, setEventFilter]   = useState('');

  const load = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 50 };
      if (statusFilter) params.success = statusFilter;
      if (eventFilter)  params.event   = eventFilter;
      const res = await api.getMetaLeadCapiLog(params);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setSuccessCount(res.successCount || 0);
      setFailCount(res.failCount || 0);
      setTotalPages(res.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, eventFilter]);

  useEffect(() => { setPage(1); load(1); }, [statusFilter, eventFilter, load]);
  useEffect(() => { load(page); }, [page]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Send size={20} className="text-[#253985]" />
          <h1 className="text-xl font-bold text-[#253985]">Meta CAPI Tracking</h1>
        </div>
        <button onClick={() => load(page)} disabled={loading}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-gray-50 border-gray-200 p-3">
          <p className="text-2xl font-bold text-gray-700">{total}</p>
          <p className="text-xs mt-0.5 text-gray-500">Total Attempts</p>
        </div>
        <div className="rounded-xl border bg-green-50 border-green-200 p-3">
          <p className="text-2xl font-bold text-green-700">{successCount}</p>
          <p className="text-xs mt-0.5 text-green-600">Successful</p>
        </div>
        <div className="rounded-xl border bg-red-50 border-red-200 p-3">
          <p className="text-2xl font-bold text-red-700">{failCount}</p>
          <p className="text-xs mt-0.5 text-red-600">Failed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter size={14} className="text-gray-400" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none">
          <option value="">All Status</option>
          <option value="true">✅ Success Only</option>
          <option value="false">❌ Failed Only</option>
        </select>
        <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none">
          <option value="">All Events</option>
          <option value="Lead">Lead</option>
          <option value="ViewContent">ViewContent</option>
          <option value="CompleteRegistration">CompleteRegistration</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Sent At</th>
              <th className="px-4 py-3 text-left">Lead</th>
              <th className="px-4 py-3 text-left">Lead Status</th>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-center">Result</th>
              <th className="px-4 py-3 text-left">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No CAPI events found</td></tr>
            ) : logs.map(log => (
              <tr key={log._id} className="hover:bg-gray-50/50 transition">
                <td className="px-4 py-2.5 text-gray-500">{fmtDateTime(log.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-[#253985] font-medium text-[11px]">{log.leadDisplayId}</span>
                  <p className="text-[10px] text-gray-400">{log.leadName}</p>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{log.status}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${EVENT_PILL[log.event] || 'bg-gray-100 text-gray-600'}`}>
                    {log.event}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {log.success
                    ? <CheckCircle size={14} className="text-green-500 mx-auto" />
                    : <XCircle size={14} className="text-red-500 mx-auto" />}
                </td>
                <td className="px-4 py-2.5 text-red-500 max-w-[200px] truncate" title={log.errorMessage}>
                  {log.errorMessage || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <span className="text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
