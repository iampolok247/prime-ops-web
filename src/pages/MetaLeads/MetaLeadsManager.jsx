import { useEffect, useState, useMemo, useCallback } from 'react';
import { Facebook, Search, RefreshCw, UserCheck, ChevronLeft, ChevronRight, CheckCircle, XCircle, Filter, X, Users, Zap } from 'lucide-react';
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
  'Validated': { validationStatus: 'validated' },
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
  const [showFilters, setShowFilters]   = useState(false);

  // ── Modal state ─────────────────────────────────────────────────────────
  const [validateTarget, setValidateTarget] = useState(null);
  const [statusTarget, setStatusTarget]     = useState(null);
  const [answersLead, setAnswersLead]       = useState(null);
  const [assignTarget, setAssignTarget]     = useState(null);
  const [assignTo, setAssignTo]             = useState('');
  const [assigning, setAssigning]           = useState(false);
  const [triggeringRR, setTriggeringRR]     = useState(false);
  const [rescoring, setRescoring]           = useState(false);

  // ── Bulk selection state ─────────────────────────────────────────────────
  const [selectedLeads, setSelectedLeads]   = useState([]);
  const [bulkAssignTo, setBulkAssignTo]     = useState('');
  const [bulkAssigning, setBulkAssigning]   = useState(false);

  const canScore = ['DigitalMarketing', 'Admin', 'SuperAdmin', 'ITAdmin'].includes(user?.role);

  // ── Active filter count badge ────────────────────────────────────────────
  const activeFilterCount = [filterTemp, filterMinScore, filterStatus, filterFrom, filterTo, filterPlatform]
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
  }, [tab, searchQ, filterTemp, filterMinScore, filterStatus, filterFrom, filterTo, filterPlatform]);

  useEffect(() => { setPage(1); load(1); setSelectedLeads([]); }, [tab, filterTemp, filterMinScore, filterStatus, filterFrom, filterTo, filterPlatform]);
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
    setFilterFrom(''); setFilterTo(''); setFilterPlatform('');
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

  const handleQuickAssign = async (lead) => {
    if (!assignTo) return;
    setAssigning(true);
    try {
      await api.assignMetaLead(lead._id, assignTo);
      flash(`Assigned to ${admissions.find(u => u._id === assignTo)?.name}`);
      load(page);
    } catch { flash('Assignment failed'); }
    finally { setAssigning(false); setAssignTarget(null); setAssignTo(''); }
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
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

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
          { label: 'Pending Review',  value: stats.pending ?? '—',             color: 'bg-orange-50 border-orange-200 text-orange-700' },
          { label: 'Unassigned',      value: stats.validatedUnassigned ?? '—', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Hot Leads',       value: stats.byTemperature?.Hot ?? '—',  color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Warm Leads',      value: stats.byTemperature?.Warm ?? '—', color: 'bg-orange-50 border-orange-200 text-orange-600' },
          { label: 'Admitted',        value: stats.byStatus?.Admitted ?? '—',  color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

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
            {bulkAssigning ? 'Assigning…' : 'Assign'}
          </button>
          <button onClick={() => setSelectedLeads([])}
            className="text-sm text-gray-500 hover:text-red-600 px-2">
            Clear
          </button>
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
              <th className="px-3 py-3 text-left">Ad / Campaign</th>
              <th className="px-3 py-3 text-left">Full Name</th>
              <th className="px-3 py-3 text-left">Contact</th>
              <th className="px-3 py-3 text-left">Course</th>
              <th className="px-3 py-3 text-left">Raw Answers</th>
              {canScore && <th className="px-3 py-3 text-left">Score</th>}
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Reason</th>
              <th className="px-3 py-3 text-left">Counsellor Feedback</th>
              <th className="px-3 py-3 text-center">CAPI</th>
              <th className="px-3 py-3 text-left">Platform</th>
              <th className="px-3 py-3 text-left">Type</th>
              <th className="px-3 py-3 text-left">Assigned To</th>
              <th className="px-3 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={canScore ? 17 : 16} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={canScore ? 17 : 16} className="text-center py-12 text-gray-400">No leads found</td></tr>
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
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${VAL_PILL[lead.validationStatus] || ''}`}>
                    {lead.validationStatus}
                  </span>
                </td>

                {/* Created */}
                <td className="px-3 py-2.5 text-gray-500">{fmtDate(lead.createdAt)}</td>

                {/* Ad / Campaign */}
                <td className="px-3 py-2.5 max-w-[130px]">
                  <p className="truncate text-gray-700">{lead.metaAdName || '—'}</p>
                  <p className="truncate text-gray-400 text-[10px]">{lead.metaCampaignName || ''}</p>
                </td>

                {/* Full Name */}
                <td className="px-3 py-2.5 font-medium text-gray-800">{lead.name}</td>

                {/* Contact */}
                <td className="px-3 py-2.5">
                  <p className="text-gray-700">{lead.phone || '—'}</p>
                  <p className="text-[10px] text-gray-400">{lead.email || ''}</p>
                </td>

                {/* Course */}
                <td className="px-3 py-2.5 text-gray-600 max-w-[100px] truncate">
                  {lead.interestedCourse || '—'}
                </td>

                {/* Raw Answers */}
                <td className="px-3 py-2.5">
                  {lead.rawQuestionData
                    ? <button onClick={() => setAnswersLead(lead)}
                        className="text-[11px] text-blue-600 underline hover:text-blue-800">
                        View answers
                      </button>
                    : '—'}
                </td>

                {/* Score — DM/Admin only */}
                {canScore && (
                  <td className="px-3 py-2.5">
                    <ScoreBadge aiScore={lead.aiScore} leadTemperature={lead.leadTemperature} />
                  </td>
                )}

                {/* Status */}
                <td className="px-3 py-2.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[lead.status] || ''}`}>
                    {lead.status}
                  </span>
                </td>

                {/* Reason */}
                <td className="px-3 py-2.5 max-w-[90px]">
                  <span className="truncate block text-gray-500">{lead.reason || '—'}</span>
                </td>

                {/* Counsellor Feedback */}
                <td className="px-3 py-2.5 max-w-[110px]">
                  <span className="truncate block text-gray-500">{lead.counsellorFeedback || '—'}</span>
                </td>

                {/* Sent to CAPI */}
                <td className="px-3 py-2.5 text-center">
                  {lead.sentToCapi
                    ? <CheckCircle size={14} className="text-green-500 mx-auto" />
                    : <XCircle    size={14} className="text-gray-300 mx-auto" />}
                </td>

                {/* Platform */}
                <td className="px-3 py-2.5 text-gray-600">{lead.platform || '—'}</td>

                {/* Organic / Paid */}
                <td className="px-3 py-2.5">
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium
                    ${lead.isOrganic ? 'bg-teal-100 text-teal-700' : 'bg-purple-100 text-purple-700'}`}>
                    {lead.isOrganic ? 'Organic' : 'Paid'}
                  </span>
                </td>

                {/* Assigned To */}
                <td className="px-3 py-2.5 text-gray-600">
                  {lead.assignedTo
                    ? <span className="font-medium">{lead.assignedTo.name}</span>
                    : <span className="text-gray-400 italic">Unassigned</span>}
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                  <div className="flex gap-1 flex-wrap">
                    {lead.validationStatus === 'pending' && canScore && (
                      <button onClick={() => setValidateTarget(lead)}
                        className="text-[11px] px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Review
                      </button>
                    )}
                    {lead.validationStatus === 'validated' && !lead.assignedTo && (
                      assignTarget?._id === lead._id ? (
                        <div className="flex gap-1">
                          <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                            className="text-[11px] border border-gray-200 rounded-lg px-1.5 py-0.5">
                            <option value="">Select…</option>
                            {admissions.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                          </select>
                          <button onClick={() => handleQuickAssign(lead)} disabled={!assignTo || assigning}
                            className="text-[11px] px-2 py-0.5 bg-green-600 text-white rounded-lg disabled:opacity-50">
                            {assigning ? '…' : 'Go'}
                          </button>
                          <button onClick={() => setAssignTarget(null)}
                            className="text-[11px] px-1.5 border border-gray-200 rounded-lg">×</button>
                        </div>
                      ) : (
                        <button onClick={() => setAssignTarget(lead)}
                          className="text-[11px] px-2.5 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                          Assign
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
