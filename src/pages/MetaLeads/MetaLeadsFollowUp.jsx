// Phase 5 — Admin/DM + Counsellor view of follow-up leads
// Features: overdue/stuck banners, bulk reschedule, quick reschedule popover,
// stuck/stale badges, follow-up history, mark-as-called, calendar view
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Clock, RefreshCw, ChevronLeft, ChevronRight, Calendar, AlertTriangle, History, PhoneCall, List, CalendarDays, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import StatusModal from './components/StatusModal.jsx';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })
  : '—';

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
  : '—';

export default function MetaLeadsFollowUp() {
  const { user } = useAuth();
  const isAdmin = ['DigitalMarketing', 'Admin', 'SuperAdmin', 'ITAdmin'].includes(user?.role);

  const [leads, setLeads]               = useState([]);
  const [admissions, setAdmissions]     = useState([]);
  const [stats, setStats]               = useState({});
  const [loading, setLoading]           = useState(false);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [counsellorFilter, setCounsellorFilter] = useState('');
  const [chipFilter, setChipFilter]     = useState(''); // '', 'overdue', 'stuck'
  const [statusTarget, setStatusTarget] = useState(null);
  const [msg, setMsg]                   = useState(null);
  const [viewMode, setViewMode]         = useState('list'); // 'list' | 'calendar'
  const [nextFollowUpFilter, setNextFollowUpFilter] = useState('all'); // all | today | yesterday | tomorrow | custom
  const [customFollowUpDate, setCustomFollowUpDate] = useState('');
  const [sortMode, setSortMode]         = useState('dateAsc'); // dateAsc | dateDesc | overdueFirst

  // Reschedule popover
  const [rescheduleId, setRescheduleId]     = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduling, setRescheduling]     = useState(false);

  // Bulk select + bulk reschedule
  const [selectedLeads, setSelectedLeads]   = useState([]);
  const [showBulkReschedule, setShowBulkReschedule] = useState(false);
  const [bulkDate, setBulkDate]             = useState('');
  const [bulkPushDays, setBulkPushDays]     = useState('');

  // History modal
  const [historyLead, setHistoryLead]   = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 3000); };

  const load = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = { status: 'In Follow Up', page: currentPage, limit: 100 };
      if (isAdmin && counsellorFilter) params.assignedTo = counsellorFilter;
      if (chipFilter === 'overdue') params.overdueOnly = 'true';
      if (chipFilter === 'stuck')   params.stuckOnly   = 'true';

      const calls = [api.listMetaLeads(params), api.getMetaLeadStats()];
      if (isAdmin) calls.push(api.listAdmissionUsers().catch(() => ({ users: [] })));

      const [leadsRes, statsRes, usersRes] = await Promise.all(calls);

      setLeads(leadsRes.leads || []);
      setTotalPages(leadsRes.pages || 1);
      setStats(statsRes || {});
      if (usersRes) setAdmissions(usersRes.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [counsellorFilter, chipFilter, isAdmin]);

  useEffect(() => { setPage(1); setSelectedLeads([]); load(1); }, [counsellorFilter, chipFilter, load]);
  useEffect(() => { load(page); }, [page]);

  const handleStatus = async (payload) => {
    await api.updateMetaLeadStatus(statusTarget._id, payload);
    flash('Status updated');
    setStatusTarget(null);
    load(page);
  };

  // #1/#7 — compute stuck/stale flags client-side from already-loaded data
  const isStuck = (lead) => (lead.followUps?.length || 0) >= 5;
  const isOverdue = (lead) => lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date();

  const toDateKey = (d) => {
    if (!d) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date(d));
  };

  const getRelativeDateKey = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return toDateKey(d);
  };

  const selectedDateKey = useMemo(() => {
    if (nextFollowUpFilter === 'today') return getRelativeDateKey(0);
    if (nextFollowUpFilter === 'yesterday') return getRelativeDateKey(-1);
    if (nextFollowUpFilter === 'tomorrow') return getRelativeDateKey(1);
    if (nextFollowUpFilter === 'custom') return customFollowUpDate;
    return '';
  }, [nextFollowUpFilter, customFollowUpDate]);

  const visibleLeads = useMemo(() => {
    const filtered = nextFollowUpFilter === 'all'
      ? leads
      : leads.filter(l => l.nextFollowUpDate && toDateKey(l.nextFollowUpDate) === selectedDateKey);

    return [...filtered].sort((a, b) => {
      const ad = a.nextFollowUpDate ? new Date(a.nextFollowUpDate).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.nextFollowUpDate ? new Date(b.nextFollowUpDate).getTime() : Number.POSITIVE_INFINITY;

      if (sortMode === 'dateDesc') {
        const av = a.nextFollowUpDate ? ad : Number.NEGATIVE_INFINITY;
        const bv = b.nextFollowUpDate ? bd : Number.NEGATIVE_INFINITY;
        return bv - av;
      }

      if (sortMode === 'overdueFirst') {
        const ao = isOverdue(a) ? 1 : 0;
        const bo = isOverdue(b) ? 1 : 0;
        if (ao !== bo) return bo - ao;
      }

      return ad - bd;
    });
  }, [leads, nextFollowUpFilter, selectedDateKey, sortMode]);

  // Quick reschedule (single)
  const handleReschedule = async (lead) => {
    if (!rescheduleDate) return;
    setRescheduling(true);
    try {
      await api.updateMetaLeadStatus(lead._id, { status: 'In Follow Up', nextFollowUpDate: rescheduleDate });
      flash(`Rescheduled — ${lead.name}`);
      setRescheduleId(null);
      setRescheduleDate('');
      load(page);
    } catch { flash('Reschedule failed'); }
    finally { setRescheduling(false); }
  };

  const quickSnooze = async (lead, days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setRescheduling(true);
    try {
      await api.updateMetaLeadStatus(lead._id, { status: 'In Follow Up', nextFollowUpDate: d.toISOString().slice(0, 10) });
      flash(`Snoozed ${days}d — ${lead.name}`);
      load(page);
    } catch { flash('Snooze failed'); }
    finally { setRescheduling(false); }
  };

  // #6 — Mark as called (logs touchpoint, no status/date change)
  const markAsCalled = async (lead, outcome = 'Called') => {
    try {
      await api.logMetaLeadTouch(lead._id, { outcome });
      flash(`Logged "${outcome}" — ${lead.name}`);
      load(page);
    } catch { flash('Failed to log touch'); }
  };

  // #3 — Bulk select + reschedule
  const toggleSelect = (id) => setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    const visibleIds = visibleLeads.map(l => l._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedLeads.includes(id));
    if (allSelected) {
      setSelectedLeads(prev => prev.filter(id => !visibleIds.includes(id)));
      return;
    }
    setSelectedLeads(prev => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleBulkReschedule = async () => {
    if (!selectedLeads.length || (!bulkDate && !bulkPushDays)) return;
    try {
      const res = await api.bulkRescheduleMetaLeads(selectedLeads, bulkDate ? { nextFollowUpDate: bulkDate } : { pushDays: bulkPushDays });
      flash(`Rescheduled ${res.rescheduled} lead(s)`);
      setSelectedLeads([]);
      setShowBulkReschedule(false);
      setBulkDate(''); setBulkPushDays('');
      load(page);
    } catch { flash('Bulk reschedule failed'); }
  };

  // #4 — Follow-up history
  const openHistory = async (lead) => {
    setHistoryLoading(true);
    setHistoryLead({ ...lead, followUps: [] });
    try {
      const res = await api.getMetaLead(lead._id);
      setHistoryLead(res.lead || res);
    } catch { flash('Failed to load history'); }
    finally { setHistoryLoading(false); }
  };

  // #8 — Calendar view grouping (by nextFollowUpDate, leads without a date go to "Unscheduled")
  const calendarGroups = visibleLeads.reduce((acc, lead) => {
    const key = lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString().slice(0, 10) : 'unscheduled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(lead);
    return acc;
  }, {});
  const sortedDateKeys = Object.keys(calendarGroups).sort((a, b) => {
    if (a === 'unscheduled') return 1;
    if (b === 'unscheduled') return -1;
    return new Date(a) - new Date(b);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-orange-500" />
          <h1 className="text-xl font-bold text-[#253985]">Follow-Up Leads</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {msg && <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full">{msg}</span>}
          {isAdmin && (
            <select value={counsellorFilter} onChange={e => setCounsellorFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none">
              <option value="">All Counsellors</option>
              {admissions.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          )}
          {/* #8 view toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white shadow text-[#253985]' : 'text-gray-400'}`}>
              <List size={14} />
            </button>
            <button onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-lg ${viewMode === 'calendar' ? 'bg-white shadow text-[#253985]' : 'text-gray-400'}`}>
              <CalendarDays size={14} />
            </button>
          </div>
          <button onClick={() => load(page)} disabled={loading}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* #2 — Overdue / Stuck summary chips */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setChipFilter(chipFilter === 'overdue' ? '' : 'overdue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition
            ${chipFilter === 'overdue' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}>
          <AlertTriangle size={14} /> {stats.followUpOverdue ?? 0} Overdue
        </button>
        <button onClick={() => setChipFilter(chipFilter === 'stuck' ? '' : 'stuck')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition
            ${chipFilter === 'stuck' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
          🔁 {stats.followUpStuck ?? 0} Stuck (5+ touches)
        </button>
        {chipFilter && (
          <button onClick={() => setChipFilter('')} className="text-xs text-gray-500 hover:text-gray-700 px-2 self-center">
            Clear filter
          </button>
        )}
        <div className="flex gap-1 bg-blue-50 p-1 rounded-xl border border-blue-100">
          {[['all', 'All'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['tomorrow', 'Tomorrow']].map(([value, label]) => (
            <button key={value} onClick={() => setNextFollowUpFilter(value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition
                ${nextFollowUpFilter === value ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-100'}`}>
              {label}
            </button>
          ))}
        </div>

        <input type="date" value={customFollowUpDate}
          onChange={e => {
            setCustomFollowUpDate(e.target.value);
            setNextFollowUpFilter(e.target.value ? 'custom' : 'all');
          }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none" />
        <select value={sortMode} onChange={e => setSortMode(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
          <option value="dateAsc">Date: Earliest First</option>
          <option value="dateDesc">Date: Latest First</option>
          <option value="overdueFirst">Date: Overdue First</option>
        </select>
      </div>

      {/* #3 — Bulk reschedule bar */}
      {selectedLeads.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-medium text-blue-900">{selectedLeads.length} lead(s) selected</span>
          <button onClick={() => setShowBulkReschedule(true)}
            className="text-sm px-4 py-1.5 bg-[#253985] text-white rounded-xl hover:bg-blue-800">
            📅 Bulk Reschedule
          </button>
          <button onClick={() => setSelectedLeads([])} className="text-sm text-gray-500 hover:text-red-600 px-2">Clear</button>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-3">
                  <input type="checkbox" checked={visibleLeads.length > 0 && visibleLeads.every(l => selectedLeads.includes(l._id))}
                    onChange={toggleSelectAll} className="w-3.5 h-3.5 cursor-pointer" />
                </th>
                <th className="px-3 py-3 text-left">Lead ID</th>
                <th className="px-3 py-3 text-left">Full Name</th>
                <th className="px-3 py-3 text-left">Contact</th>
                <th className="px-3 py-3 text-left">Course</th>
                {isAdmin && <th className="px-3 py-3 text-left">Counsellor</th>}
                <th className="px-3 py-3 text-left">Next Follow-up</th>
                <th className="px-3 py-3 text-left">Follow-up Details</th>
                <th className="px-3 py-3 text-left">Flags</th>
                <th className="px-3 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={isAdmin ? 10 : 9} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : visibleLeads.length === 0 ? (
                <tr><td colSpan={isAdmin ? 10 : 9} className="text-center py-12 text-gray-400">No follow-up leads</td></tr>
              ) : visibleLeads.map(lead => {
                const overdue = isOverdue(lead);
                const stuck   = isStuck(lead);
                const touchCount = lead.followUps?.length || 0;
                const lastTouch = touchCount ? lead.followUps[touchCount - 1] : null;
                return (
                  <tr key={lead._id} className={`hover:bg-gray-50/50 transition ${selectedLeads.includes(lead._id) ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selectedLeads.includes(lead._id)}
                        onChange={() => toggleSelect(lead._id)} className="w-3.5 h-3.5 cursor-pointer" />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[#253985] font-medium text-[11px]">{lead.leadId}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{lead.name}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs text-gray-700">{lead.phone || '—'}</p>
                      <p className="text-[10px] text-gray-400">{lead.email || ''}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[100px] truncate">{lead.interestedCourse || '—'}</td>
                    {isAdmin && <td className="px-3 py-2.5 text-xs text-gray-600">{lead.assignedTo?.name || '—'}</td>}

                    {/* Date + reschedule popover */}
                    <td className="px-3 py-2.5 relative">
                      <button onClick={() => { setRescheduleId(lead._id); setRescheduleDate(lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString().slice(0,10) : ''); }}
                        className="flex items-center gap-1 hover:underline">
                        {lead.nextFollowUpDate ? (
                          <span className={`text-[11px] font-medium ${overdue ? 'text-red-600' : 'text-orange-600'}`}>
                            {overdue ? '⚠ ' : ''}{fmtDate(lead.nextFollowUpDate)}
                          </span>
                        ) : <span className="text-gray-400 text-xs">Set date</span>}
                        <Calendar size={11} className="text-gray-300" />
                      </button>

                      {rescheduleId === lead._id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setRescheduleId(null)} />
                          <div className="absolute left-0 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Reschedule</p>
                            <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            <div className="flex gap-1 mb-2">
                              {[1, 3, 7].map(d => (
                                <button key={d} onClick={() => quickSnooze(lead, d)} disabled={rescheduling}
                                  className="flex-1 text-[10px] py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 disabled:opacity-50">
                                  +{d}d
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => setRescheduleId(null)}
                                className="flex-1 text-[11px] py-1 border border-gray-200 rounded-lg text-gray-500">Cancel</button>
                              <button onClick={() => handleReschedule(lead)} disabled={!rescheduleDate || rescheduling}
                                className="flex-1 text-[11px] py-1 bg-[#253985] text-white rounded-lg disabled:opacity-50">
                                {rescheduling ? '…' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="text-[11px] text-gray-600 space-y-0.5">
                        <p className="font-medium text-gray-700">Touches: {touchCount}</p>
                        <p className="text-gray-400">Last: {lastTouch?.at ? fmtDateTime(lastTouch.at) : '—'}</p>
                        {lastTouch?.note && <p className="text-gray-500 truncate max-w-[180px]">{lastTouch.note}</p>}
                      </div>
                    </td>

                    {/* #1/#7 Flags */}
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {stuck && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium" title={`${lead.followUps?.length || 0} touchpoints, no conversion`}>
                            🔁 Stuck
                          </span>
                        )}
                        {lead.flaggedStale && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full font-medium" title="60+ days, 6+ touches — review needed">
                            🕸 Stale
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => markAsCalled(lead)}
                          title="Mark as called — logs a touchpoint without changing status"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition">
                          <PhoneCall size={13} />
                        </button>
                        <button onClick={() => openHistory(lead)}
                          title="View follow-up history"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#253985] hover:bg-gray-100 transition">
                          <History size={13} />
                        </button>
                        <button onClick={() => setStatusTarget(lead)}
                          className="text-[11px] px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100">
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* #8 — Calendar view */
        <div className="space-y-3">
          {sortedDateKeys.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">No follow-up leads</div>
          ) : sortedDateKeys.map(dateKey => {
            const isPast = dateKey !== 'unscheduled' && new Date(dateKey) < new Date(new Date().toISOString().slice(0,10));
            return (
              <div key={dateKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between
                  ${dateKey === 'unscheduled' ? 'bg-gray-50 text-gray-500' : isPast ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  <span>{dateKey === 'unscheduled' ? 'No Date Set' : fmtDate(dateKey)}{isPast && ' (Overdue)'}</span>
                  <span className="bg-white/70 px-2 py-0.5 rounded-full">{calendarGroups[dateKey].length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {calendarGroups[dateKey].map(lead => (
                    <div key={lead._id} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/50">
                      <div>
                        <span className="font-medium text-gray-800">{lead.name}</span>
                        <span className="text-gray-400 ml-2">{lead.phone}</span>
                        {isAdmin && lead.assignedTo && <span className="text-gray-400 ml-2">· {lead.assignedTo.name}</span>}
                      </div>
                      <button onClick={() => setStatusTarget(lead)}
                        className="text-[11px] px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100">
                        Update
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination — list view only */}
      {viewMode === 'list' && totalPages > 1 && (
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

      {statusTarget && (
        <StatusModal lead={statusTarget}
          onClose={() => setStatusTarget(null)} onSubmit={handleStatus} />
      )}

      {/* #3 Bulk Reschedule Modal */}
      {showBulkReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulkReschedule(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-[#253985] mb-1">Reschedule {selectedLeads.length} Leads</h3>
            <p className="text-xs text-gray-500 mb-4">Set a fixed date for everyone, or push each lead's own date forward</p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Set fixed date</label>
                <input type="date" value={bulkDate} onChange={e => { setBulkDate(e.target.value); setBulkPushDays(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <p className="text-center text-[11px] text-gray-400">— OR —</p>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Push forward by (days)</label>
                <input type="number" min="1" value={bulkPushDays} onChange={e => { setBulkPushDays(e.target.value); setBulkDate(''); }}
                  placeholder="e.g. 7"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowBulkReschedule(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleBulkReschedule} disabled={!bulkDate && !bulkPushDays}
                className="flex-1 px-4 py-2 bg-[#253985] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* #4 Follow-up History Modal */}
      {historyLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryLead(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-[#253985]">{historyLead.name}</p>
                <p className="text-xs text-gray-400">{historyLead.leadId} · Follow-up history</p>
              </div>
              <button onClick={() => setHistoryLead(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-3">
              {historyLoading ? (
                <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
              ) : (historyLead.followUps || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No follow-up history yet</p>
              ) : (
                [...historyLead.followUps].reverse().map((f, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{f.by?.name || 'Unknown'}</span>
                      <span className="text-[10px] text-gray-400">{fmtDateTime(f.at)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{f.note || '—'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
