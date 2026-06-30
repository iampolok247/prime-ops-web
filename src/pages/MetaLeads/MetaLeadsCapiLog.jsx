// Meta CAPI send queue. Status changes (Counseling/In Follow Up/Admitted)
// queue an event here as 'pending' — nothing auto-fires to Meta. DM reviews
// the queue and sends selected leads or everything pending in one click.
import { useEffect, useState, useCallback } from 'react';
import { Send, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock3, Filter } from 'lucide-react';
import api from '../../lib/api.js';

const EVENT_PILL = {
  Lead:                 'bg-blue-100 text-blue-700',
  ViewContent:          'bg-orange-100 text-orange-700',
  CompleteRegistration: 'bg-green-100 text-green-700',
};

const STATUS_PILL = {
  pending: 'bg-amber-100 text-amber-700',
  sent:    'bg-green-100 text-green-700',
  failed:  'bg-red-100 text-red-700',
};

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
  : '—';

export default function MetaLeadsCapiLog() {
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending'); // default to the actionable queue
  const [eventFilter, setEventFilter]   = useState('');
  const [selected, setSelected]   = useState([]);
  const [sending, setSending]     = useState(false);
  const [sendingId, setSendingId] = useState(null); // single-row send loading state
  const [msg, setMsg]             = useState(null);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 4000); };

  const load = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 50 };
      if (statusFilter) params.sendStatus = statusFilter;
      if (eventFilter)  params.event      = eventFilter;
      const res = await api.getMetaLeadCapiLog(params);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setPendingCount(res.pendingCount || 0);
      setSentCount(res.sentCount || 0);
      setFailedCount(res.failedCount || 0);
      setTotalPages(res.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, eventFilter]);

  useEffect(() => { setPage(1); setSelected([]); load(1); }, [statusFilter, eventFilter, load]);
  useEffect(() => { load(page); }, [page]);

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelected(selected.length === logs.length ? [] : logs.map(l => l._id));

  const sendSelected = async () => {
    if (!selected.length) return;
    setSending(true);
    try {
      const res = await api.sendMetaLeadCapiEvents({ logIds: selected });
      flash(`✅ Sent: ${res.sent}  ❌ Failed: ${res.failed}`);
      setSelected([]);
      load(page);
    } catch { flash('Send failed'); }
    finally { setSending(false); }
  };

  const sendAllPending = async () => {
    if (!window.confirm(`Send all ${pendingCount} pending CAPI events to Meta now?`)) return;
    setSending(true);
    try {
      const res = await api.sendMetaLeadCapiEvents({ sendAll: true });
      flash(`✅ Sent: ${res.sent}  ❌ Failed: ${res.failed}`);
      setSelected([]);
      load(page);
    } catch { flash('Send failed'); }
    finally { setSending(false); }
  };

  const sendOne = async (log) => {
    setSendingId(log._id);
    try {
      const res = await api.sendMetaLeadCapiEvents({ logIds: [log._id] });
      flash(res.sent ? `✅ Sent — ${log.leadName}` : `❌ Failed — ${log.leadName}`);
      load(page);
    } catch { flash('Send failed'); }
    finally { setSendingId(null); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Send size={20} className="text-[#253985]" />
          <h1 className="text-xl font-bold text-[#253985]">Meta CAPI Tracking</h1>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium">{msg}</span>}
          <button onClick={() => load(page)} disabled={loading}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI cards — clickable to filter */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setStatusFilter('pending')}
          className={`text-left rounded-xl border p-3 transition ${statusFilter === 'pending' ? 'bg-amber-100 border-amber-400' : 'bg-amber-50 border-amber-200 hover:bg-amber-100'}`}>
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="text-xs mt-0.5 text-amber-600">Pending — Not Sent Yet</p>
        </button>
        <button onClick={() => setStatusFilter('sent')}
          className={`text-left rounded-xl border p-3 transition ${statusFilter === 'sent' ? 'bg-green-100 border-green-400' : 'bg-green-50 border-green-200 hover:bg-green-100'}`}>
          <p className="text-2xl font-bold text-green-700">{sentCount}</p>
          <p className="text-xs mt-0.5 text-green-600">Sent Successfully</p>
        </button>
        <button onClick={() => setStatusFilter('failed')}
          className={`text-left rounded-xl border p-3 transition ${statusFilter === 'failed' ? 'bg-red-100 border-red-400' : 'bg-red-50 border-red-200 hover:bg-red-100'}`}>
          <p className="text-2xl font-bold text-red-700">{failedCount}</p>
          <p className="text-xs mt-0.5 text-red-600">Failed</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter size={14} className="text-gray-400" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none">
          <option value="">All Status</option>
          <option value="pending">⏳ Pending</option>
          <option value="sent">✅ Sent</option>
          <option value="failed">❌ Failed</option>
        </select>
        <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none">
          <option value="">All Events</option>
          <option value="Lead">Lead</option>
          <option value="ViewContent">ViewContent</option>
          <option value="CompleteRegistration">CompleteRegistration</option>
        </select>
      </div>

      {/* Bulk send bar */}
      {statusFilter === 'pending' && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-medium text-blue-900">
            {selected.length > 0 ? `${selected.length} selected` : `${pendingCount} pending total`}
          </span>
          <button onClick={sendSelected} disabled={!selected.length || sending}
            className="text-sm px-4 py-1.5 bg-[#253985] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50">
            {sending ? 'Sending…' : `Send Selected (${selected.length})`}
          </button>
          <button onClick={sendAllPending} disabled={!pendingCount || sending}
            className="text-sm px-4 py-1.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
            {sending ? 'Sending…' : `Send All Pending (${pendingCount})`}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wide">
            <tr>
              {statusFilter === 'pending' && (
                <th className="px-3 py-3">
                  <input type="checkbox" checked={logs.length > 0 && selected.length === logs.length}
                    onChange={toggleSelectAll} className="w-3.5 h-3.5 cursor-pointer" />
                </th>
              )}
              <th className="px-4 py-3 text-left">Queued At</th>
              <th className="px-4 py-3 text-left">Lead</th>
              <th className="px-4 py-3 text-left">Lead Status</th>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-center">Send Status</th>
              <th className="px-4 py-3 text-left">Sent At</th>
              <th className="px-4 py-3 text-left">Error</th>
              {statusFilter === 'pending' && <th className="px-4 py-3 text-left">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No events found</td></tr>
            ) : logs.map(log => (
              <tr key={log._id} className={`hover:bg-gray-50/50 transition ${selected.includes(log._id) ? 'bg-blue-50/40' : ''}`}>
                {statusFilter === 'pending' && (
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selected.includes(log._id)}
                      onChange={() => toggleSelect(log._id)} className="w-3.5 h-3.5 cursor-pointer" />
                  </td>
                )}
                <td className="px-4 py-2.5 text-gray-500">{fmtDateTime(log.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-[#253985] font-medium text-[11px]">{log.leadDisplayId}</span>
                  <p className="text-[10px] text-gray-400">{log.leadName}</p>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{log.leadStatus}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${EVENT_PILL[log.event] || 'bg-gray-100 text-gray-600'}`}>
                    {log.event}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${STATUS_PILL[log.sendStatus]}`}>
                    {log.sendStatus === 'pending' && <Clock3 size={10} />}
                    {log.sendStatus === 'sent' && <CheckCircle size={10} />}
                    {log.sendStatus === 'failed' && <XCircle size={10} />}
                    {log.sendStatus}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{fmtDateTime(log.sentAt)}</td>
                <td className="px-4 py-2.5 text-red-500 max-w-[180px] truncate" title={log.errorMessage}>
                  {log.errorMessage || '—'}
                </td>
                {statusFilter === 'pending' && (
                  <td className="px-4 py-2.5">
                    <button onClick={() => sendOne(log)} disabled={sendingId === log._id || sending}
                      className="text-[11px] px-3 py-1 bg-[#253985] text-white rounded-lg hover:bg-blue-800 disabled:opacity-50">
                      {sendingId === log._id ? 'Sending…' : 'Send'}
                    </button>
                  </td>
                )}
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
