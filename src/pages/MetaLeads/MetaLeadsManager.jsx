import { useEffect, useState, useMemo, useCallback } from 'react';
import { Facebook, Search, RefreshCw, UserCheck, ChevronLeft, ChevronRight, CheckCircle, XCircle, Filter, X, Users, Zap, Eye, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import ScoreBadge from './components/ScoreBadge.jsx';
import ValidateModal from './components/ValidateModal.jsx';
import StatusModal from './components/StatusModal.jsx';

// ── Constants ────────────────────────────────────────────────────────────────
const TABS = ['Validated', 'Assigned', 'All'];

const STATUS_PILL = {
  Pending:          'bg-gray-100 text-gray-600',
  Assigned:         'bg-blue-100 text-blue-700',
  Counseling:       'bg-indigo-100 text-indigo-700',
  'In Follow Up':   'bg-yellow-100 text-yellow-700',
  Admitted:         'bg-green-100 text-green-700',
  'Not Admitted':   'bg-gray-200 text-gray-600',
  'Not Interested': 'bg-red-100 text-red-700',
  Archived:         'bg-gray-100 text-gray-400',
};

const VAL_PILL = {
  pending:   'bg-orange-100 text-orange-700',
  validated: 'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-600',
};

const TEMP_PILL = {
  Hot:  'bg-red-100 text-red-700 border border-red-200',
  Warm: 'bg-orange-100 text-orange-700 border border-orange-200',
  Cold: 'bg-blue-100 text-blue-700 border border-blue-200',
};

const TAB_QUERY = {
  'Validated': { validationStatus: 'validated', unassignedOnly: 'true' },
  'Assigned':  { status: 'Assigned' },
  'All':       {},
};

// ── Component ────────────────────────────────────────────────────────────────
export default function MetaLeadsManager() {
  const { user } = useAuth();

  // ── Data state ──────────────────────────────────────────────────────────
  const [tab, setTab]               = useState('Validated');
  const [leads, setLeads]           = useState([]);
  const [stats, setStats]           = useState({});
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [msg, setMsg]               = useState(null);

  // ── Filter state ────────────────────────────────────────────────────────
  const [searchQ, setSearchQ]           = useState('');
  const [filterTemp, setFilterTemp]     = useState('');        // Hot / Warm / Cold
  const [filterMinScore, setMinScore]   = useState('');        // numeric min
  const [filterStatus, setFilterStatus] = useState('');        // pipeline status
  const [filterFrom, setFilterFrom]     = useState('');        // date from
  const [filterTo, setFilterTo]         = useState('');        // date to
  const [filterPlatform, setFilterPlatform] = useState('');   // Facebook / Instagram
  const [filterAssignedTo, setFilterAssignedTo] = useState(''); // counsellor userId
  const [showFilters, setShowFilters]   = useState(false);

  // ── Modal state ─────────────────────────────────────────────────────────
  const [validateTarget, setValidateTarget] = useState(null);
  const [statusTarget, setStatusTarget]     = useState(null);
  const [answersLead, setAnswersLead]       = useState(null);
  const [detailLead, setDetailLead]         = useState(null);
  const [triggeringRR, setTriggeringRR]     = useState(false);
  const [rescoring, setRescoring]           = useState(false);
  const [forceRescoring, setForceRescoring] = useState(false);
  const [showOnDuty, setShowOnDuty]         = useState(false);
  const [togglingId, setTogglingId]         = useState(null);
  const [routingLog, setRoutingLog]         = useState([]);

  // ── Bulk selection state ─────────────────────────────────────────────────
  const [selectedLeads, setSelectedLeads]   = useState([]);
  const [bulkAssignTo, setBulkAssignTo]     = useState('');
  const [bulkAssigning, setBulkAssigning]   = useState(false);
  const [showDistributeModal, setShowDistributeModal]       = useState(false);
  const [distributeSelectedMembers, setDistributeMembers]   = useState([]);
  const [reassignTarget, setReassignTarget] = useState(null); // single-lead reassign dropdown
  const [reassignTo, setReassignTo]         = useState('');
  const [reassigning, setReassigning]       = useState(false);

  const canScore = ['DigitalMarketing', 'Admin', 'SuperAdmin', 'ITAdmin'].includes(user?.role);

  // ── Active filter count badge ────────────────────────────────────────────
  const activeFilterCount = [filterTemp, filterMinScore, filterStatus, filterFrom, filterTo, filterPlatform, filterAssignedTo]
    .filter(Boolean).length;

  // ── Load data ────────────────────────────────────────────────────────────
  const load = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = { ...TAB_QUERY[tab], page: currentPage, limit: 50 };
      if (searchQ)       params.q            = searchQ;
      if (filterTemp)    params.temperature  = filterTemp;
      if (filterMinScore) params.minScore    = filterMinScore;
      if (filterStatus)  params.status       = filterStatus;
      if (filterFrom)    params.from         = filterFrom;
      if (filterTo)      params.to           = filterTo;
      if (filterPlatform) params.platform    = filterPlatform;
      if (filterAssignedTo) params.assignedTo = filterAssignedTo;

      const [leadsRes, statsRes, usersRes] = await Promise.all([
        api.listMetaLeads(params),
        api.getMetaLeadStats(),
        api.listAdmissionUsers().catch(() => ({ users: [] }))
      ]);

      setLeads(leadsRes.leads || []);
      setTotalPages(leadsRes.pages || 1);
      setStats(statsRes || {});
      setAdmissions(usersRes.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, searchQ, filterTemp, filterMinScore, filterStatus, filterFrom, filterTo, filterPlatform, filterAssignedTo]);

  useEffect(() => { setPage(1); load(1); setSelectedLeads([]); }, [tab, filterTemp, filterMinScore, filterStatus, filterFrom, filterTo, filterPlatform, filterAssignedTo]);
  useEffect(() => { load(page); }, [page]);

  // SSE — instant reload when webhook delivers a new lead
  // EventSource auto-reconnects on server restart; onopen reloads stale data after reconnect
  useEffect(() => {
    const base = import.meta.env.PROD ? 'https://ops-backend.primeacademy.org' : 'http://localhost:5001';
    const token = localStorage.getItem('auth_token');
    const es = new EventSource(`${base}/api/meta-leads/events?token=${token}`);
    let connected = false;
    es.onopen = () => {
      if (connected) load(1); // reconnected after drop (e.g. deploy) — refresh data
      connected = true;
    };
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'NEW_LEAD') { setPage(1); load(1); }
      } catch {}
    };
    return () => es.close();
  }, [load]);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 3000); };

  const clearFilters = () => {
    setFilterTemp(''); setMinScore(''); setFilterStatus('');
    setFilterFrom(''); setFilterTo(''); setFilterPlatform(''); setFilterAssignedTo('');
  };

  // ── Bulk selection helpers ────────────────────────────────────────────────
  const toggleSelect    = (id) => setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = ()   => setSelectedLeads(selectedLeads.length === leads.length ? [] : leads.map(l => l._id));

  const handleBulkAssign = async () => {
    if (!selectedLeads.length || !bulkAssignTo) return;
    setBulkAssigning(true);
    try {
      const res = await api.bulkAssignMetaLeads(selectedLeads, bulkAssignTo);
      flash(`${res.assigned} lead(s) assigned`);
      setSelectedLeads([]);
      setBulkAssignTo('');
      load(page);
    } catch { flash('Bulk assign failed'); }
    finally { setBulkAssigning(false); }
  };

  // Distribute selected leads equally across multiple chosen counsellors
  const handleDistributeEqually = async () => {
    if (!selectedLeads.length || !distributeSelectedMembers.length) return;
    setBulkAssigning(true);
    try {
      const leadsPerMember = Math.floor(selectedLeads.length / distributeSelectedMembers.length);
      const remainder = selectedLeads.length % distributeSelectedMembers.length;

      let leadIndex = 0;
      const assignmentPromises = [];
      for (let i = 0; i < distributeSelectedMembers.length; i++) {
        const memberId = distributeSelectedMembers[i];
        const count = leadsPerMember + (i < remainder ? 1 : 0);
        const slice = selectedLeads.slice(leadIndex, leadIndex + count);
        if (slice.length > 0) assignmentPromises.push(api.bulkAssignMetaLeads(slice, memberId));
        leadIndex += count;
      }

      await Promise.all(assignmentPromises);
      flash(`Distributed ${selectedLeads.length} lead(s) across ${distributeSelectedMembers.length} counsellor(s)`);
      setDistributeMembers([]);
      setSelectedLeads([]);
      setShowDistributeModal(false);
      load(page);
    } catch { flash('Distribution failed'); }
    finally { setBulkAssigning(false); }
  };

  // Single-lead reassign (works for both unassigned and already-assigned leads)
  const handleReassign = async (lead) => {
    if (!reassignTo) return;
    setReassigning(true);
    try {
      await api.assignMetaLead(lead._id, reassignTo);
      flash(`${lead.assignedTo ? 'Reassigned' : 'Assigned'} to ${admissions.find(u => u._id === reassignTo)?.name}`);
      load(page);
    } catch { flash('Reassign failed'); }
    finally { setReassigning(false); setReassignTarget(null); setReassignTo(''); }
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleValidate = async (payload) => {
    await api.validateMetaLead(validateTarget._id, payload);
    flash('Lead updated');
    load(page);
  };

  const handleStatus = async (payload) => {
    await api.updateMetaLeadStatus(statusTarget._id, payload);
    flash('Status updated');
    load(page);
  };

  const loadRoutingLog = async () => {
    try {
      const res = await api.getMetaLeadRoutingLog();
      setRoutingLog(res.log || []);
    } catch {}
  };

  const handleToggleAvailability = async (userId) => {
    setTogglingId(userId);
    try {
      const res = await api.toggleInstantLeadAvailability(userId);
      setAdmissions(prev => prev.map(u =>
        u._id === userId ? { ...u, availableForInstantLeads: res.availableForInstantLeads } : u
      ));
    } catch (e) { flash(e.message || 'Toggle failed'); }
    finally { setTogglingId(null); }
  };

  const handleToggleLeave = async (userId) => {
    setTogglingId(userId);
    try {
      const res = await api.toggleLeave(userId);
      setAdmissions(prev => prev.map(u =>
        u._id === userId ? { ...u, onLeave: res.onLeave, availableForInstantLeads: res.availableForInstantLeads } : u
      ));
    } catch { flash('Toggle leave failed'); }
    finally { setTogglingId(null); }
  };

  const handleForceRescore = async () => {
    if (!window.confirm('Re-score ALL leads? This will overwrite existing scores.')) return;
    setForceRescoring(true);
    try {
      const res = await api.forceRescoreAllMetaLeads();
      flash(res.message || 'Force scoring started');
      setTimeout(() => load(page), 10000);
    } catch { flash('Force re-score failed'); }
    finally { setForceRescoring(false); }
  };

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const res = await api.rescoreMetaLeads();
      flash(res.message || 'Scoring started');
      setTimeout(() => load(page), 8000); // reload after ~8s to show updated scores
    } catch { flash('Re-score failed'); }
    finally { setRescoring(false); }
  };

  const triggerRoundRobin = async () => {
    if (!window.confirm('Trigger round-robin assignment now?')) return;
    setTriggeringRR(true);
    try {
      const res = await api.triggerRoundRobin();
      flash(`Round-robin: ${res.assigned} leads distributed`);
      load(page);
    } catch { flash('Round-robin failed'); }
    finally { setTriggeringRR(false); }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })
    : '—';

  const fmtTime = (d) => d
    ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
    : '';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Facebook size={22} className="text-blue-600" />
          <h1 className="text-xl font-bold text-[#253985]">Meta Lead CRM</h1>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {msg && <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full">{msg}</span>}
          <button onClick={() => load(page)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
          {['Admin', 'SuperAdmin', 'DigitalMarketing'].includes(user?.role) && (
            <>
              <button onClick={handleForceRescore} disabled={forceRescoring}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50">
                <Zap size={14} /> {forceRescoring ? 'Scoring…' : 'Force Re-score All'}
              </button>
              <button onClick={handleRescore} disabled={rescoring}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50">
                <Zap size={14} /> {rescoring ? 'Scoring…' : 'Re-score Unscored'}
              </button>
              <button onClick={triggerRoundRobin} disabled={triggeringRR}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#253985] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50">
                <UserCheck size={14} /> {triggeringRR ? 'Running…' : 'Trigger Round-Robin'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Unassigned',  value: stats.validatedUnassigned ?? '—', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Hot Leads',   value: stats.byTemperature?.Hot ?? '—',  color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Warm Leads',  value: stats.byTemperature?.Warm ?? '—', color: 'bg-orange-50 border-orange-200 text-orange-600' },
          { label: 'Cold Leads',  value: stats.byTemperature?.Cold ?? '—', color: 'bg-sky-50 border-sky-200 text-sky-700' },
          { label: 'Admitted',    value: stats.byStatus?.Admitted ?? '—',  color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── On Duty Panel (Admin/DM only) ── */}
      {canScore && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <button onClick={() => { setShowOnDuty(v => !v); if (!showOnDuty) loadRoutingLog(); }}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-2xl transition">
            <div className="flex items-center gap-2">
              <Radio size={15} className="text-green-500" />
              On Duty Counsellors
              <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                {admissions.filter(u => u.availableForInstantLeads).length} active
              </span>
            </div>
            <span className="text-gray-400 text-xs">{showOnDuty ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {showOnDuty && (
            <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-4">
              {/* Counsellor toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {admissions.length === 0 && (
                  <p className="text-xs text-gray-400 col-span-4">No admission counsellors found</p>
                )}
                {admissions.map(u => (
                  <div key={u._id} className="flex flex-col gap-1.5 bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${u.onLeave ? 'bg-red-400' : u.availableForInstantLeads ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-xs font-medium text-gray-700 truncate">{u.name}</span>
                      </div>
                      <button
                        onClick={() => handleToggleAvailability(u._id)}
                        disabled={togglingId === u._id || u.onLeave}
                        title={u.onLeave ? 'Turn off leave first' : ''}
                        className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed
                          ${u.availableForInstantLeads
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                        {togglingId === u._id ? '…' : u.availableForInstantLeads ? 'On Duty' : 'Off Duty'}
                      </button>
                    </div>
                    <button
                      onClick={() => handleToggleLeave(u._id)}
                      disabled={togglingId === u._id}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition disabled:opacity-50 w-fit
                        ${u.onLeave
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-white border border-gray-200 text-gray-400 hover:bg-gray-100'}`}>
                      {u.onLeave ? '🔴 On Leave' : 'Mark Leave'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Routing log */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Recent Auto-Assignments</p>
                  <button onClick={loadRoutingLog} className="text-[10px] text-blue-500 hover:underline">Refresh</button>
                </div>
                {routingLog.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No auto-assignments yet — load to check</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {routingLog.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] bg-gray-50 rounded-lg px-3 py-1.5">
                        <span className="text-gray-700 font-medium truncate max-w-[140px]">{entry.name}</span>
                        <span className="text-gray-400 mx-2">→</span>
                        <span className="text-green-700 font-medium">{entry.counsellor}</span>
                        <span className="text-gray-400 ml-auto pl-2 shrink-0">
                          {new Date(entry.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition
              ${tab === t ? 'bg-white shadow text-[#253985]' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Search + Filter bar ── */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white flex-1 min-w-[200px]">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(1)}
            className="text-sm w-full outline-none"
            placeholder="Name, phone, email, lead ID…" />
          {searchQ && (
            <button onClick={() => setSearchQ('')} className="text-gray-300 hover:text-gray-500">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2 border rounded-xl transition
            ${showFilters || activeFilterCount > 0
              ? 'bg-[#253985] text-white border-[#253985]'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-white text-[#253985] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters}
            className="text-xs text-red-500 hover:text-red-700 px-2">
            Clear all
          </button>
        )}
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shadow-sm">

          {/* Temperature filter */}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Temperature</label>
            <select value={filterTemp} onChange={e => setFilterTemp(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">All</option>
              <option value="Hot">🔴 Hot (70+)</option>
              <option value="Warm">🟠 Warm (50–69)</option>
              <option value="Cold">🔵 Cold (&lt;50)</option>
            </select>
          </div>

          {/* Min score filter */}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Score ≥</label>
            <input type="number" min="0" max="100" value={filterMinScore}
              onChange={e => setMinScore(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. 60" />
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Lead Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">All</option>
              {['Pending','Assigned','Counseling','In Follow Up','Admitted','Not Interested','Archived'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Platform filter */}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Platform</label>
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">All</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
            </select>
          </div>

          {/* Assigned To filter */}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Assigned To</label>
            <select value={filterAssignedTo} onChange={e => setFilterAssignedTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">All</option>
              {admissions.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">From Date</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">To Date</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
      )}

      {/* ── Bulk assign bar (visible when leads are selected) ── */}
      {canScore && selectedLeads.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Users size={15} className="text-blue-600 shrink-0" />
          <span className="text-sm font-medium text-blue-900">{selectedLeads.length} lead(s) selected</span>
          <select value={bulkAssignTo} onChange={e => setBulkAssignTo(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none">
            <option value="">Select counsellor…</option>
            {admissions.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <button onClick={handleBulkAssign} disabled={!bulkAssignTo || bulkAssigning}
            className="text-sm px-4 py-1.5 bg-[#253985] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50">
            {bulkAssigning ? 'Assigning…' : 'Assign to One'}
          </button>
          <button onClick={() => setShowDistributeModal(true)}
            className="text-sm px-4 py-1.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
            title="Distribute leads equally among selected counsellors">
            📊 Distribute Equally
          </button>
          <button onClick={() => setSelectedLeads([])}
            className="text-sm text-gray-500 hover:text-red-600 px-2">
            Clear
          </button>
        </div>
      )}

      {/* ── Distribute Equally Modal ── */}
      {showDistributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDistributeModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-[#253985] mb-1">Distribute {selectedLeads.length} Leads Equally</h3>
            <p className="text-xs text-gray-500 mb-4">Select counsellors to split these leads among</p>

            <div className="space-y-1.5 max-h-64 overflow-y-auto mb-4">
              {admissions.map(member => (
                <label key={member._id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input type="checkbox"
                    checked={distributeSelectedMembers.includes(member._id)}
                    onChange={(e) => {
                      setDistributeMembers(prev => e.target.checked
                        ? [...prev, member._id]
                        : prev.filter(id => id !== member._id));
                    }}
                    className="w-4 h-4 cursor-pointer" />
                  <span className="text-sm font-medium text-gray-700">{member.name}</span>
                </label>
              ))}
            </div>

            {distributeSelectedMembers.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-3 mb-4 text-xs text-purple-800">
                {Math.floor(selectedLeads.length / distributeSelectedMembers.length)} leads per counsellor
                {selectedLeads.length % distributeSelectedMembers.length > 0 &&
                  ` (+${selectedLeads.length % distributeSelectedMembers.length} remainder)`}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setShowDistributeModal(false); setDistributeMembers([]); }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDistributeEqually}
                disabled={!distributeSelectedMembers.length || bulkAssigning}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50">
                {bulkAssigning ? 'Distributing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wide">
            <tr>
              {canScore && (
                <th className="px-3 py-3">
                  <input type="checkbox"
                    checked={leads.length > 0 && selectedLeads.length === leads.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 cursor-pointer" />
                </th>
              )}
              <th className="px-3 py-3 text-left">Lead ID</th>
              <th className="px-3 py-3 text-left">Created</th>
              <th className="px-3 py-3 text-left">Full Name</th>
              <th className="px-3 py-3 text-left">Contact</th>
              <th className="px-3 py-3 text-left">Course</th>
              {canScore && <th className="px-3 py-3 text-left">Score</th>}
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Assigned To</th>
              <th className="px-3 py-3 text-left">Actions</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={canScore ? 11 : 10} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={canScore ? 11 : 10} className="text-center py-12 text-gray-400">No leads found</td></tr>
            ) : leads.map(lead => (
              <tr key={lead._id} className={`hover:bg-gray-50/50 transition ${selectedLeads.includes(lead._id) ? 'bg-blue-50/40' : ''}`}>

                {/* Checkbox */}
                {canScore && (
                  <td className="px-3 py-2.5">
                    <input type="checkbox"
                      checked={selectedLeads.includes(lead._id)}
                      onChange={() => toggleSelect(lead._id)}
                      className="w-3.5 h-3.5 cursor-pointer" />
                  </td>
                )}

                {/* Lead ID */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    {lead.source === 'Meta Lead' && <Facebook size={11} className="text-blue-500 shrink-0" />}
                    <span className="font-mono text-[#253985] font-medium text-[11px]">{lead.leadId}</span>
                  </div>
                </td>

                {/* Created */}
                <td className="px-3 py-2.5">
                  <p className="text-xs text-gray-600">{fmtDate(lead.createdAt)}</p>
                  <p className="text-[10px] text-gray-400">{fmtTime(lead.createdAt)}</p>
                </td>

                {/* Full Name */}
                <td className="px-3 py-2.5 font-medium text-gray-800">{lead.name}</td>

                {/* Contact */}
                <td className="px-3 py-2.5">
                  <p className="text-xs text-gray-700">{lead.phone || '—'}</p>
                  <p className="text-[10px] text-gray-400">{lead.email || ''}</p>
                </td>

                {/* Course */}
                <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[110px] truncate">
                  {lead.interestedCourse || '—'}
                </td>

                {/* Score — DM/Admin only */}
                {canScore && (
                  <td className="px-3 py-2.5">
                    <ScoreBadge aiScore={lead.aiScore} leadTemperature={lead.leadTemperature} aiReasoning={lead.aiReasoning} />
                  </td>
                )}

                {/* Status */}
                <td className="px-3 py-2.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[lead.status] || ''}`}>
                    {lead.status}
                  </span>
                </td>

                {/* Assigned To */}
                <td className="px-3 py-2.5 text-xs text-gray-600">
                  {lead.assignedTo ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{lead.assignedTo.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit font-medium
                        ${lead.autoAssigned
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'}`}>
                        {lead.autoAssigned ? 'Auto' : 'Manual'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Unassigned</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    {lead.validationStatus === 'validated' && (
                      reassignTarget?._id === lead._id ? (
                        <div className="flex gap-1">
                          <select value={reassignTo} onChange={e => setReassignTo(e.target.value)}
                            className="text-[11px] border border-gray-200 rounded-lg px-1.5 py-0.5">
                            <option value="">Select…</option>
                            {admissions.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                          </select>
                          <button onClick={() => handleReassign(lead)} disabled={!reassignTo || reassigning}
                            className="text-[11px] px-2 py-0.5 bg-green-600 text-white rounded-lg disabled:opacity-50">
                            {reassigning ? '…' : 'Go'}
                          </button>
                          <button onClick={() => { setReassignTarget(null); setReassignTo(''); }}
                            className="text-[11px] px-1.5 border border-gray-200 rounded-lg">×</button>
                        </div>
                      ) : (
                        <button onClick={() => setReassignTarget(lead)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg ${lead.assignedTo
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {lead.assignedTo ? 'Reassign' : 'Assign'}
                        </button>
                      )
                    )}
                    {['Assigned', 'Counseling', 'In Follow Up'].includes(lead.status) && canScore && (
                      <button onClick={() => setStatusTarget(lead)}
                        className="text-[11px] px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100">
                        Update
                      </button>
                    )}
                  </div>
                </td>

                {/* Eye icon — detail modal */}
                <td className="px-3 py-2.5">
                  <button onClick={() => setDetailLead(lead)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#253985] hover:bg-gray-100 transition">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
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

      {/* ── Modals ── */}
      {validateTarget && (
        <ValidateModal lead={validateTarget} admissionUsers={admissions}
          onClose={() => setValidateTarget(null)} onSubmit={handleValidate} />
      )}
      {statusTarget && (
        <StatusModal lead={statusTarget}
          onClose={() => setStatusTarget(null)} onSubmit={handleStatus} />
      )}

      {/* ── Detail Modal (eye icon) ── */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailLead(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-[#253985]">{detailLead.name}</p>
                <p className="text-xs text-gray-400">{detailLead.leadId}</p>
              </div>
              <button onClick={() => setDetailLead(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              {[
                { label: 'Ad Name',            value: detailLead.metaAdName },
                { label: 'Campaign',           value: detailLead.metaCampaignName },
                { label: 'Platform',           value: detailLead.platform },
                { label: 'Type',               value: detailLead.isOrganic ? 'Organic' : 'Paid' },
                { label: 'Reason',             value: detailLead.reason },
                { label: 'Counsellor Feedback',value: detailLead.counsellorFeedback },
                { label: 'Assigned By',        value: detailLead.assignedBy?.name },
                { label: 'Assigned At',        value: detailLead.assignedAt ? fmtDate(detailLead.assignedAt) : null },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex gap-2">
                  <span className="text-gray-400 w-40 shrink-0 text-xs">{label}</span>
                  <span className="text-gray-800 text-xs font-medium">{value}</span>
                </div>
              ) : null)}

              {/* CAPI event history — real success/failure, not a misleading Yes/No */}
              <div>
                <p className="text-gray-400 text-xs mb-1.5">Meta CAPI Events</p>
                {(detailLead.capiEvents || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No CAPI events sent yet</p>
                ) : (
                  <div className="space-y-1">
                    {[...detailLead.capiEvents].reverse().map((ev, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] bg-gray-50 rounded-lg px-2.5 py-1.5">
                        <span className={`font-medium ${ev.success ? 'text-green-700' : 'text-red-600'}`}>
                          {ev.success ? '✅' : '❌'} {ev.event}
                        </span>
                        <span className="text-gray-400">{ev.at ? fmtDate(ev.at) : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detailLead.rawQuestionData && (
                <button onClick={() => { setDetailLead(null); setAnswersLead(detailLead); }}
                  className="text-[11px] text-blue-600 underline hover:text-blue-800 pt-1">
                  View raw form answers →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Raw Answers Modal ── */}
      {answersLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAnswersLead(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-[#253985]">{answersLead.name}</p>
                <p className="text-xs text-gray-400">{answersLead.leadId} · {answersLead.metaAdName || 'No ad name'}</p>
              </div>
              <button onClick={() => setAnswersLead(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-3">
              {Array.isArray(answersLead.rawQuestionData?.field_data)
                ? answersLead.rawQuestionData.field_data.map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-[11px] text-gray-400 mb-0.5 uppercase tracking-wide">{f.name}</p>
                      <p className="text-sm text-gray-800 font-medium">{f.values?.[0] || '—'}</p>
                    </div>
                  ))
                : <pre className="text-xs text-gray-600 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">
                    {JSON.stringify(answersLead.rawQuestionData, null, 2)}
                  </pre>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
