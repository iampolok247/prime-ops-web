// Meta Leads Center — DM side of the Meta CRM (mirrors Leads Center).
// Meta ad leads arrive from Make.com as "Pending Validation"; DM validates or
// rejects (with a bad-lead reason), then assigns validated leads to the
// Admission team. Admission works them in the Meta Pipeline (/meta-crm/*).
import React, { useEffect, useMemo, useState } from 'react';
import { api, metaPipelineApi } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LeadHistoryModal from '../../components/LeadHistoryModal.jsx';
import { QualityReasonSelect, QualityBadge } from '../../lib/leadQuality.jsx';

const VIEWS = [
  { key: 'pending', label: 'Pending Validation', count: s => s.pending },
  { key: 'unassigned', label: 'Unassigned', count: s => s.unassigned },
  { key: 'Assigned', label: 'Assigned', count: s => s.byStatus?.Assigned },
  { key: 'In Follow Up', label: 'In Follow-Up', count: s => s.byStatus?.['In Follow Up'] },
  { key: 'Admitted', label: 'Admitted', count: s => s.byStatus?.Admitted },
  { key: 'Not Interested', label: 'Not Interested', count: s => s.byStatus?.['Not Interested'] },
  { key: 'rejected', label: 'Rejected', count: s => s.rejected },
  { key: 'quality', label: '📉 Lead Quality Report' },
  { key: 'auto', label: '⚙️ Auto-Assign' }
];

const TEMP_CLS = { Hot: 'bg-red-100 text-red-700', Warm: 'bg-orange-100 text-orange-700', Cold: 'bg-blue-100 text-blue-700' };

function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return (
    <>
      <div className="text-sm">{dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      <div className="text-xs text-royal/70">{dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
    </>
  );
}

export default function MetaLeadsCenter() {
  const { user } = useAuth();
  const canManage = ['DigitalMarketing', 'Admin', 'SuperAdmin'].includes(user?.role);

  const [view, setView] = useState('pending');
  const [stats, setStats] = useState({});
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [todayAssignments, setTodayAssignments] = useState(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  // Filters
  const [courseFilter, setCourseFilter] = useState('All');
  const [assignedToFilter, setAssignedToFilter] = useState('All');
  const [tempFilter, setTempFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Bulk assign / distribute
  const [bulkAssignTo, setBulkAssignTo] = useState('');
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distributeSelectedMembers, setDistributeSelectedMembers] = useState([]);

  // Reject modal (single or bulk) — reason from the bad-lead list
  const [rejectTarget, setRejectTarget] = useState(null); // lead id | 'bulk'
  const [rejectReason, setRejectReason] = useState('');

  // History
  const [histLead, setHistLead] = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  // Lead quality report
  const [quality, setQuality] = useState(null);

  const loadStats = async () => {
    try { setStats(await api.getMetaLeadStats()); } catch { /* counts are optional */ }
  };

  const load = async () => {
    setErr(null);
    try {
      if (view === 'quality') {
        setQuality(await api.getMetaQualityReport(fromDate, toDate));
      } else if (view === 'auto') {
        // AutoAssignSettings loads its own data
      } else {
        const { leads } = await api.listMetaLeads(view);
        setLeads(leads || []);
      }
      setSelectedLeads([]);
      loadStats();
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, [view]); // eslint-disable-line
  useEffect(() => { if (view === 'quality') load(); }, [fromDate, toDate]); // eslint-disable-line

  useEffect(() => {
    (async () => {
      try {
        const calls = [api.listCourses()];
        if (canManage) calls.push(api.listAdmissionUsers(), api.getMetaTodayAssignments());
        const [c, a, t] = await Promise.all(calls);
        setCourses(c?.courses || []);
        if (a) setAdmissions(a.users || []);
        if (t) { setTodayAssignments(t.grouped || {}); setTodayTotal(t.total || 0); }
      } catch (e) { setErr(e.message); }
    })();
  }, [canManage]);

  const refreshToday = async () => {
    if (!canManage) return;
    try { const t = await api.getMetaTodayAssignments(); setTodayAssignments(t.grouped || {}); setTodayTotal(t.total || 0); } catch { /* optional */ }
  };

  const run = async (fn, success) => {
    setMsg(null); setErr(null); setBusy(true);
    try {
      const res = await fn();
      setMsg(res?.message || success);
      await load();
      refreshToday();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const validate = (id) => run(() => api.validateMetaLead(id, 'validate'), 'Lead validated');
  const bulkValidate = () => run(() => api.bulkValidateMetaLeads(selectedLeads, 'validate'), 'Leads validated');
  const submitReject = async () => {
    if (!rejectReason) { setErr('Please select a reason'); return; }
    const target = rejectTarget;
    setRejectTarget(null);
    await run(
      () => target === 'bulk'
        ? api.bulkValidateMetaLeads(selectedLeads, 'reject', rejectReason)
        : api.validateMetaLead(target, 'reject', rejectReason),
      'Lead rejected'
    );
    setRejectReason('');
  };
  const assign = (id, assignedTo) => run(() => api.assignMetaLead(id, assignedTo), 'Lead assigned');
  const bulkAssign = () => bulkAssignTo && run(() => api.bulkAssignMetaLeads(selectedLeads, bulkAssignTo), 'Leads assigned')
    .then(() => setBulkAssignTo(''));
  const distributeEqually = () => {
    if (!distributeSelectedMembers.length) return;
    const members = distributeSelectedMembers;
    const per = Math.floor(selectedLeads.length / members.length);
    const remainder = selectedLeads.length % members.length;
    let idx = 0;
    const chunks = members.map((m, i) => {
      const n = per + (i < remainder ? 1 : 0);
      const ids = selectedLeads.slice(idx, idx + n); idx += n;
      return [m, ids];
    }).filter(([, ids]) => ids.length);
    setShowDistributeModal(false);
    return run(
      () => Promise.all(chunks.map(([m, ids]) => api.bulkAssignMetaLeads(ids, m))).then(() => null),
      `✓ Distributed ${selectedLeads.length} leads among ${members.length} members`
    ).then(() => setDistributeSelectedMembers([]));
  };
  const deleteLead = (id) => {
    if (!window.confirm('Delete this lead?')) return;
    run(() => api.deleteMetaLead(id), 'Lead deleted');
  };
  const bulkDelete = () => {
    if (!window.confirm(`Delete ${selectedLeads.length} selected lead(s)?`)) return;
    run(() => Promise.all(selectedLeads.map(id => api.deleteMetaLead(id))).then(() => null), `✓ Deleted ${selectedLeads.length} lead(s)`);
  };
  const rescore = () => run(() => api.rescoreMetaLeads(), 'Scoring started');
  const openHistory = async (id) => {
    setErr(null); setHistLoading(true);
    try { const res = await metaPipelineApi.getLeadHistory(id); setHistLead(res.lead || res); }
    catch (e) { setErr(e.message); }
    finally { setHistLoading(false); }
  };

  const downloadCSV = () => {
    const rows = leads.filter(l => selectedLeads.includes(l._id));
    const headers = ['Lead ID', 'Name', 'Phone', 'Email', 'Course', 'Campaign', 'Ad', 'Platform', 'AI Score', 'Temperature',
      'Validation', 'Status', 'Assigned To', 'Lead Quality', 'Quality Reason', 'Created'];
    const data = rows.map(l => [l.leadId, l.name, l.phone, l.email, l.interestedCourse, l.metaCampaignName, l.metaAdName, l.platform,
      l.aiScore ?? '', l.leadTemperature || '', l.validationStatus, l.status, l.assignedTo?.name || 'Unassigned',
      l.leadQuality || '', l.qualityReason || '', l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '']);
    const csv = [headers.join(','), ...data.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `meta_leads_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setMsg(`✓ Downloaded ${rows.length} leads as CSV`);
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const courseOptions = useMemo(() => {
    const set = new Set(courses.map(c => c.name));
    leads.forEach(l => l.interestedCourse && set.add(l.interestedCourse));
    return Array.from(set).sort();
  }, [courses, leads]);

  const filteredLeads = useMemo(() => {
    let f = leads;
    if (fromDate || toDate) {
      f = f.filter(l => {
        const d = new Date(l.createdAt); d.setHours(0, 0, 0, 0);
        if (fromDate) { const from = new Date(fromDate); from.setHours(0, 0, 0, 0); if (d < from) return false; }
        if (toDate) { const to = new Date(toDate); to.setHours(23, 59, 59, 999); if (d > to) return false; }
        return true;
      });
    }
    if (courseFilter !== 'All') f = f.filter(l => (l.interestedCourse || '') === courseFilter);
    if (assignedToFilter !== 'All') f = f.filter(l => l.assignedTo?._id === assignedToFilter);
    if (tempFilter !== 'All') f = f.filter(l => (l.leadTemperature || 'Unscored') === tempFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q.length >= 3) {
      const tokens = q.split(/\s+/);
      f = f.filter(l => {
        const hay = [l.leadId, l.name, l.phone, l.email, l.metaCampaignName].filter(Boolean).join(' ').toLowerCase();
        return tokens.every(t => hay.includes(t));
      });
    }
    return f;
  }, [leads, fromDate, toDate, courseFilter, assignedToFilter, tempFilter, searchQuery]);

  useEffect(() => { setCurrentPage(1); }, [view, courseFilter, assignedToFilter, tempFilter, fromDate, toDate, searchQuery]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginated = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => setSelectedLeads(selectedLeads.length === filteredLeads.length ? [] : filteredLeads.map(l => l._id));
  const toggleSelect = (id) => setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const isPending = view === 'pending';
  const canAssignView = !['pending', 'rejected', 'quality'].includes(view);
  const showQualityCol = ['Not Interested', 'rejected'].includes(view);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-navy">Meta Leads Center</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border-0 outline-none text-sm" />
            <span className="text-gray-400">→</span>
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border-0 outline-none text-sm" />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate(''); }} className="ml-2 text-red-500 hover:text-red-700 text-sm font-medium" title="Clear date filter">✕</button>
            )}
          </div>
          {!['quality', 'auto'].includes(view) && (
            <>
              <div className="border rounded-xl px-3 py-2 bg-white flex items-center">
                <input type="search" placeholder="Search ID, name, phone, email, campaign (3+ chars)" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} className="border-0 outline-none text-sm w-72" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="text-sm text-gray-500 ml-2">✕</button>}
              </div>
              <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="border rounded-xl px-3 py-2">
                <option value="All">📚 All Courses</option>
                {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {!['pending', 'unassigned', 'rejected'].includes(view) && (
                <select value={assignedToFilter} onChange={e => setAssignedToFilter(e.target.value)} className="border rounded-xl px-3 py-2">
                  <option value="All">👥 All Members</option>
                  {admissions.map(a => <option key={a._id} value={a._id}>👤 {a.name}</option>)}
                </select>
              )}
              <select value={tempFilter} onChange={e => setTempFilter(e.target.value)} className="border rounded-xl px-3 py-2">
                <option value="All">🌡️ All Scores</option>
                <option value="Hot">🔥 Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
                <option value="Unscored">Unscored</option>
              </select>
              {canManage && (
                <button onClick={rescore} disabled={busy} className="px-3 py-2 rounded-xl border hover:bg-[#f3f6ff] text-sm" title="AI-score leads that have no score yet">
                  🤖 Rescore
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* View tabs (same style as Admission Pipeline) */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {VIEWS.map(t => {
          const count = t.count ? t.count(stats) : undefined;
          return (
            <button key={t.key} onClick={() => setView(t.key)}
              className={`px-3 py-1.5 rounded-xl border ${view === t.key ? 'bg-gold text-navy border-gold' : 'hover:bg-[#f3f6ff]'}`}>
              {t.label}
              {count !== undefined && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${view === t.key ? 'bg-navy text-white' : 'bg-gold text-navy'}`}>{count || 0}</span>
              )}
            </button>
          );
        })}
      </div>

      {msg && <div className="mb-2 p-3 bg-green-100 text-green-700 rounded-xl">{msg}</div>}
      {err && <div className="mb-2 p-3 bg-red-100 text-red-600 rounded-xl">{err}</div>}

      {view === 'auto' ? (
        <AutoAssignSettings admissions={admissions} canManage={canManage} />
      ) : view === 'quality' ? (
        <QualityReport data={quality} />
      ) : (
        <>
          {/* Today's assignments */}
          {canManage && canAssignView && todayAssignments && Object.keys(todayAssignments).length > 0 && (
            <div className="mb-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-5 shadow-lg border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">📊 Today's Meta Lead Assignments</h3>
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-md">
                  <div className="text-xs font-medium opacity-90">Total Assigned</div>
                  <div className="text-3xl font-bold">{todayTotal}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(todayAssignments).map(([member, byCourse]) => (
                  <div key={member} className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-800">{member}</h4>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">
                        {Object.values(byCourse).reduce((s, n) => s + n, 0)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(byCourse).map(([course, n]) => (
                        <div key={course} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-700 font-medium">{course}</span>
                          <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold text-xs">{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk action bar */}
          {canManage && selectedLeads.length > 0 && (
            <div className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 flex items-center gap-3 flex-wrap">
              <span className="font-medium text-blue-900">{selectedLeads.length} lead(s) selected</span>
              {isPending && (
                <>
                  <button onClick={bulkValidate} disabled={busy} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium">✓ Validate Selected</button>
                  <button onClick={() => { setRejectReason(''); setRejectTarget('bulk'); }} disabled={busy} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium">✕ Reject Selected</button>
                </>
              )}
              {canAssignView && (
                <>
                  <select value={bulkAssignTo} onChange={e => setBulkAssignTo(e.target.value)} className="border rounded-xl px-3 py-2">
                    <option value="">Select Admission Member</option>
                    {admissions.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                  <button onClick={bulkAssign} disabled={busy || !bulkAssignTo} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {view === 'unassigned' ? 'Assign to One' : 'Re-assign to One'}
                  </button>
                  <button onClick={() => setShowDistributeModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium">📊 Distribute Equally</button>
                </>
              )}
              <button onClick={downloadCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium">📥 Download CSV</button>
              {view !== 'Admitted' && (
                <button onClick={bulkDelete} disabled={busy} className="px-4 py-2 bg-red-50 text-red-700 border border-red-300 rounded-xl hover:bg-red-100 disabled:opacity-50 font-medium">🗑️ Delete</button>
              )}
              <button onClick={() => setSelectedLeads([])} className="px-3 py-2 text-royal hover:text-red-600">Clear Selection</button>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-soft overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f6ff] text-royal">
                <tr>
                  {canManage && (
                    <th className="p-3">
                      <input type="checkbox" checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                        onChange={toggleSelectAll} className="w-4 h-4 cursor-pointer" />
                    </th>
                  )}
                  <th className="text-left p-3">Lead ID</th>
                  <th className="text-left p-3">Added Date</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Phone / Email</th>
                  <th className="text-left p-3">Interested Course</th>
                  <th className="text-left p-3">Campaign / Ad</th>
                  <th className="text-left p-3">AI Score</th>
                  <th className="text-left p-3">Assigned To</th>
                  {showQualityCol && <th className="text-left p-3">Lead Quality</th>}
                  <th className="text-left p-3">History</th>
                  {canManage && <th className="text-left p-3">Action</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map(l => (
                  <tr key={l._id} className="border-t hover:bg-gray-50">
                    {canManage && (
                      <td className="p-3">
                        <input type="checkbox" checked={selectedLeads.includes(l._id)} onChange={() => toggleSelect(l._id)} className="w-4 h-4 cursor-pointer" />
                      </td>
                    )}
                    <td className="p-3">{l.leadId}</td>
                    <td className="p-3">{fmtDate(l.createdAt)}</td>
                    <td className="p-3">{l.name}</td>
                    <td className="p-3">
                      <div>{l.phone || '-'}</div>
                      <div className="text-xs text-royal/70">{l.email || '-'}</div>
                    </td>
                    <td className="p-3">{l.interestedCourse || '-'}</td>
                    <td className="p-3 max-w-[220px]">
                      <div className="truncate" title={l.metaCampaignName}>{l.metaCampaignName || (l.source !== 'Meta Lead' ? l.source : '-')}</div>
                      {l.metaAdName && <div className="text-xs text-royal/70 truncate" title={l.metaAdName}>{l.metaAdName}</div>}
                      {l.platform && <div className="text-xs text-royal/50">{l.platform}</div>}
                    </td>
                    <td className="p-3">
                      {l.leadTemperature ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${TEMP_CLS[l.leadTemperature] || 'bg-gray-100'}`} title={l.aiReasoning || ''}>
                          {l.leadTemperature}{l.aiScore != null ? ` · ${l.aiScore}` : ''}
                        </span>
                      ) : <span className="text-royal/50 text-xs">Unscored</span>}
                    </td>
                    <td className="p-3">
                      {l.assignedTo ? l.assignedTo.name : '-'}
                      {l.autoAssigned && <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold" title="Auto-assigned by course rule">AUTO</span>}
                    </td>
                    {showQualityCol && <td className="p-3"><QualityBadge quality={l.leadQuality} reason={l.qualityReason} /></td>}
                    <td className="p-3">
                      <button disabled={histLoading} onClick={() => openHistory(l._id)} className="px-3 py-1 rounded-xl border hover:bg-[#f3f6ff]">
                        {histLoading ? 'Loading…' : 'History'}
                      </button>
                    </td>
                    {canManage && (
                      <td className="p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isPending && (
                            <>
                              <button onClick={() => validate(l._id)} disabled={busy}
                                className="px-2 py-1 text-sm rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100">✓ Validate</button>
                              <button onClick={() => { setRejectReason(''); setRejectTarget(l._id); }} disabled={busy}
                                className="px-2 py-1 text-sm rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100">✕ Reject</button>
                            </>
                          )}
                          {view === 'rejected' && (
                            <button onClick={() => validate(l._id)} disabled={busy}
                              className="px-2 py-1 text-sm rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100">↺ Restore & Validate</button>
                          )}
                          {view === 'unassigned' && (
                            <AssignDropdown options={admissions} onChange={(val) => assign(l._id, val)} />
                          )}
                          {canAssignView && l.assignedTo && (
                            <span className="text-sm px-2 py-1 rounded-lg bg-green-50 text-green-700 font-medium whitespace-nowrap">✓ {l.assignedTo.name}</span>
                          )}
                          {l.status !== 'Admitted' && (
                            <button onClick={() => deleteLead(l._id)} className="px-2 py-1 text-sm rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100" title="Delete lead">🗑</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr><td className="p-4 text-royal/70 text-center" colSpan={12}>
                    {leads.length === 0 ? 'No leads' : 'No leads match the selected filters'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredLeads.length > itemsPerPage && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-3 py-1 rounded-xl border hover:bg-gray-100 disabled:opacity-50">Previous</button>
                <span className="px-3 py-1 text-sm text-gray-600">Page {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-xl border hover:bg-gray-100 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setRejectTarget(null)} />
          <div className="bg-white rounded-xl p-6 z-10 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold text-navy mb-2">
              Reject {rejectTarget === 'bulk' ? `${selectedLeads.length} Lead(s)` : 'Lead'} as Bad Lead
            </h3>
            <p className="text-sm text-gray-600 mb-3">The reason is sent to Meta as a "Disqualified" lead so ads bring fewer junk leads.</p>
            <QualityReasonSelect value={rejectReason} onChange={setRejectReason} badOnly />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button onClick={submitReject} disabled={!rejectReason || busy} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Distribute equally modal */}
      {showDistributeModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowDistributeModal(false)} />
          <div className="bg-white rounded-2xl p-6 z-10 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold text-navy mb-4">📊 Distribute {selectedLeads.length} Leads Equally</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {admissions.map(m => (
                <label key={m._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={distributeSelectedMembers.includes(m._id)} className="w-4 h-4 cursor-pointer"
                    onChange={e => setDistributeSelectedMembers(e.target.checked
                      ? [...distributeSelectedMembers, m._id]
                      : distributeSelectedMembers.filter(id => id !== m._id))} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.email}</div>
                  </div>
                </label>
              ))}
            </div>
            {distributeSelectedMembers.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-xs text-blue-700">
                {Math.floor(selectedLeads.length / distributeSelectedMembers.length)} leads per member
                {selectedLeads.length % distributeSelectedMembers.length > 0 && ` + ${selectedLeads.length % distributeSelectedMembers.length} remainder`}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowDistributeModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={distributeEqually} disabled={!distributeSelectedMembers.length || busy}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-medium">Confirm Distribution</button>
            </div>
          </div>
        </div>
      )}

      {histLead && (
        <LeadHistoryModal lead={histLead} pipelineApi={metaPipelineApi} onClose={() => { setHistLead(null); load(); }} />
      )}
    </div>
  );
}

// One counsellor per course. New Meta leads for that course are assigned to them
// the moment they arrive. Courses left on "DM assigns manually" (or whose
// counsellor is on leave) wait in Pending Validation as before.
function AutoAssignSettings({ admissions, canManage }) {
  const [rows, setRows] = useState(null);
  const [savingCourse, setSavingCourse] = useState(null);
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  const load = async () => {
    try { setRows((await api.getMetaCourseAssignments()).rows || []); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const save = async (courseName, counsellorId) => {
    setSavingCourse(courseName); setNote(null); setError(null);
    try {
      await api.setMetaCourseAssignment(courseName, counsellorId);
      const who = admissions.find(a => a._id === counsellorId)?.name;
      setNote(counsellorId ? `✓ New "${courseName}" leads will go to ${who}` : `✓ "${courseName}" leads will wait for DM to assign`);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSavingCourse(null); }
  };

  if (!rows) return <div className="text-royal/70">Loading…</div>;
  const shown = rows.filter(r => r.courseName.toLowerCase().includes(filter.trim().toLowerCase()));
  const setCount = rows.filter(r => r.counsellor).length;

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <b>How it works:</b> when a new Meta lead arrives, OPS looks at its course. If a counsellor is set below,
        the lead is assigned to them immediately (no validation step) and they get a notification.
        If no counsellor is set — or the counsellor is marked <b>On Leave</b> — the lead waits in
        <b> Pending Validation</b> for the DM. The course name must match the Meta form name.
      </div>
      {note && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{note}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search course…"
          className="border rounded-xl px-3 py-2 text-sm bg-white w-72" />
        <span className="text-sm text-gray-600">{setCount} of {rows.length} courses auto-assigned</span>
      </div>
      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="text-left p-3">Course</th>
              <th className="text-left p-3">Auto-assign to</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Last changed</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(r => {
              const c = r.counsellor;
              return (
                <tr key={r.courseName} className="border-t">
                  <td className="p-3 font-medium text-gray-800">
                    {r.courseName}
                    {r.inactiveCourse && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">course inactive</span>}
                  </td>
                  <td className="p-3">
                    <select
                      value={c?._id || ''}
                      disabled={!canManage || savingCourse === r.courseName}
                      onChange={e => save(r.courseName, e.target.value)}
                      className={`border rounded-xl px-3 py-2 min-w-[220px] ${c ? 'border-green-300 bg-green-50' : 'bg-white'}`}
                    >
                      <option value="">— DM assigns manually —</option>
                      {admissions.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    {savingCourse === r.courseName ? <span className="text-gray-500">Saving…</span>
                      : !c ? <span className="text-gray-500">Waits for DM</span>
                      : c.onLeave || c.isActive === false ? <span className="px-2 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-medium">{c.name} is {c.onLeave ? 'on leave' : 'inactive'} — leads wait for DM</span>
                      : <span className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium">Auto → {c.name}</span>}
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {r.updatedAt ? `${new Date(r.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}${r.updatedBy?.name ? ` · ${r.updatedBy.name}` : ''}` : '-'}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-royal/70">No courses</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssignDropdown({ options, onChange }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex items-center gap-2">
      <select className="border rounded-xl px-3 py-2" value={val} onChange={e => setVal(e.target.value)}>
        <option value="">Select Admission Member</option>
        {options.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
      </select>
      <button disabled={!val} onClick={() => onChange(val)} className="px-3 py-1 rounded-lg border hover:bg-[#f3f6ff]">Assign</button>
    </div>
  );
}

// Which campaigns / ads bring bad leads, and why.
function QualityReport({ data }) {
  if (!data) return <div className="text-royal/70">Loading…</div>;
  const bad = data.byReason.filter(r => r.quality === 'Bad');
  const lost = data.byReason.filter(r => r.quality === 'Lost');
  const Reasons = ({ title, rows, cls }) => (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex-1 min-w-[280px]">
      <h3 className="font-bold text-navy mb-3">{title}</h3>
      {rows.length === 0 ? <div className="text-sm text-royal/60">No data yet</div> : rows.map(r => (
        <div key={r.reason} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
          <span>{r.reason || '(no reason)'}</span>
          <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${cls}`}>{r.count}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <Reasons title="❌ Bad leads (sent to Meta as Disqualified)" rows={bad} cls="bg-red-100 text-red-700" />
        <Reasons title="🟡 Genuine, not converted (sent as Not Interested)" rows={lost} cls="bg-yellow-100 text-yellow-800" />
      </div>
      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="text-left p-3">Campaign</th>
              <th className="text-left p-3">Ad</th>
              <th className="text-right p-3">Leads</th>
              <th className="text-right p-3">Bad</th>
              <th className="text-right p-3">Bad %</th>
              <th className="text-right p-3">Not Converted</th>
              <th className="text-right p-3">Admitted</th>
            </tr>
          </thead>
          <tbody>
            {data.byCampaignAd.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{r.campaign}</td>
                <td className="p-3">{r.ad}</td>
                <td className="p-3 text-right">{r.total}</td>
                <td className="p-3 text-right">{r.bad}</td>
                <td className={`p-3 text-right font-semibold ${r.badRate >= 30 ? 'text-red-600' : r.badRate >= 15 ? 'text-orange-600' : 'text-green-700'}`}>{r.badRate}%</td>
                <td className="p-3 text-right">{r.lost}</td>
                <td className="p-3 text-right">{r.admitted}</td>
              </tr>
            ))}
            {data.byCampaignAd.length === 0 && <tr><td className="p-4 text-center text-royal/70" colSpan={7}>No leads in this period</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
