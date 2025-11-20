import React, { useEffect, useMemo, useState, useRef } from 'react';
import { api, fmtDate } from '../lib/api.js';

export default function MGProduction() {
  const [works, setWorks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  // modal state (lifted)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPayload, setModalPayload] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [users, setUsers] = useState([]);

  // enums for selects (keep in sync with api/models/MGWork.js)
  const TYPES = ['Reel', 'Short', 'Explainer', 'Ad', 'Banner', 'Other'];
  const PLATFORMS = ['Facebook', 'Instagram', 'YouTube', 'TikTok', 'X', 'Other'];

  // filters
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  async function loadAll() {
    setLoading(true); setErr('');
    try {
      const [list, s] = await Promise.all([api.listMGWorks(), api.mgStats()]);
      // backend may return { list } or an array directly; normalize
      const arr = Array.isArray(list) ? list : (list?.list || list?.items || []);
      setWorks(arr);
      setStats(s || {});
    } catch (e) {
      setErr(e.message || 'Failed to load');
    } finally { setLoading(false); }
  }

  async function handleSave(payload) {
    setModalSaving(true); setModalError('');
    try {
      if (!payload.title || !payload.date) throw new Error('Title and date are required');
      // if assignedTo is a display name/email, map to user _id when possible
      const toSave = { ...(payload || {}) };
      if (toSave.assignedTo && !usersById[toSave.assignedTo]) {
        const found = users.find(u => (u.name === toSave.assignedTo) || (u.email === toSave.assignedTo));
        if (found) toSave.assignedTo = found._id || found.id || found.email;
      }
      if (toSave._id) {
        await api.updateMGWork(toSave._id, toSave);
      } else {
        await api.createMGWork(toSave);
      }
      await loadAll();
      setModalVisible(false);
    } catch (e) { setModalError(e.message || 'Save failed'); }
    finally { setModalSaving(false); }
  }

  function openCreate() { setModalPayload({}); setModalError(''); setModalVisible(true); }
  function openEdit(item) { setModalPayload(item || {}); setModalError(''); setModalVisible(true); }

  async function deleteWork(id) {
    if (!id) return;
    if (!confirm('Delete this work item?')) return;
    try {
      await api.deleteMGWork(id);
      await loadAll();
    } catch (e) { alert(e.message || 'Delete failed'); }
  }

  useEffect(() => { // initial load
    // set default period range
    const now = new Date();
    let f = new Date();
    f.setMonth(now.getMonth() - 1);
    setFrom(f.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
    loadAll();
    // load users for Assigned To dropdown
    (async () => {
      try {
        const u = await api.listUsersPublic();
        // backend may return { users } or an array
        const arr = Array.isArray(u) ? u : (u?.users || []);
        setUsers(arr);
      } catch (e) {
        // non-fatal
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usersById = useMemo(() => {
    const m = {};
    users.forEach(u => {
      const id = u._id || u.id || u.email;
      m[id] = u.name || u.email || id;
    });
    return m;
  }, [users]);

  useEffect(() => {
    // whenever period/custom range changes, we refresh stats (and optionally list)
    (async () => {
      try {
        setStats(await api.mgStats());
      } catch (e) { /* ignore, show existing */ }
    })();
  }, [period, from, to]);

  // compute filtered list client-side
  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    let fFrom = from ? new Date(from) : null;
    let fTo = to ? new Date(to) : null;
    // if to exists, include whole day
    if (fTo) { fTo.setHours(23,59,59,999); }

    return works.filter(w => {
      try {
        // date field is stored as ISO string
        const d = w?.date ? new Date(w.date) : (w?.createdAt ? new Date(w.createdAt) : null);
        if (fFrom && d && d < fFrom) return false;
        if (fTo && d && d > fTo) return false;
        if (status && status !== 'all' && (w.status || '').toLowerCase() !== status.toLowerCase()) return false;
        if (!q) return true;
        const assignedName = (w.assignedTo && usersById[w.assignedTo]) ? usersById[w.assignedTo] : (w.assignedTo || '');
        const hay = `${w.title || ''} ${assignedName} ${w.type || ''} ${w.platform || ''} ${w.notes || ''}`.toLowerCase();
        return hay.includes(q);
      } catch (_) { return true; }
    });
  }, [works, from, to, status, search]);

  const counts = useMemo(() => {
    const out = { total: works.length, queued:0, inProgress:0, review:0, done:0, hold:0 };
    works.forEach(w => {
      const s = (w.status || '').toLowerCase();
      if (s === 'queued') out.queued++;
      else if (s === 'inprogress') out.inProgress++;
      else if (s === 'review') out.review++;
      else if (s === 'done') out.done++;
      else if (s === 'hold') out.hold++;
    });
    return out;
  }, [works]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Motion Graphics — Production Log</h1>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="bg-royal text-white px-3 py-2 rounded-xl">Refresh</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate">Range</label>
            <select value={period} onChange={e=>{
              const p = e.target.value; setPeriod(p);
              const now = new Date(); let f = new Date();
              if (p === 'daily') f.setDate(now.getDate()-1);
              else if (p === 'weekly') f.setDate(now.getDate()-7);
              else if (p === 'monthly') f.setMonth(now.getMonth()-1);
              else if (p === 'yearly') f.setFullYear(now.getFullYear()-1);
              else if (p === 'lifetime') { f = null; }
              if (p !== 'custom') {
                if (f) setFrom(f.toISOString().slice(0,10)); else { setFrom(''); setTo(''); }
                setTo(now.toISOString().slice(0,10));
              }
            }} className="border rounded-xl px-3 py-2">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime</option>
              <option value="custom">Custom</option>
            </select>
            {period === 'custom' && (
              <>
                <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded-xl px-3 py-2" />
                <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded-xl px-3 py-2" />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate">Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2">
              <option value="">All</option>
              <option value="Queued">Queued</option>
              <option value="InProgress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Done">Done</option>
              <option value="Hold">Hold</option>
            </select>
          </div>

          <div className="flex-1 flex items-center">
            <input placeholder="Search title, assignee, notes..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full border rounded-xl px-3 py-2" />
          </div>
        </div>
      </div>

      {err && <div className="text-red-600">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { k:'total', label:'Total', v:counts.total },
          { k:'queued', label:'Queued', v:counts.queued },
          { k:'inProgress', label:'In Progress', v:counts.inProgress },
          { k:'done', label:'Done', v:counts.done }
        ].map(x => (
          <div key={x.k} className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-royal text-sm">{x.label}</div>
            <div className="text-3xl font-extrabold">{x.v ?? 0}</div>
          </div>
        ))}
      </div>

      {/* List area */}
      <div>
        {loading ? (
          <div className="bg-white p-4 rounded-xl shadow-sm">Loading...</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filtered.map(w => (
                <div key={w._id || `${w.title}-${w.date}`} className="bg-white p-3 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-slate">{fmtDate(w.date)}</div>
                      <div className="font-semibold text-navy">{w.title}</div>
                      <div className="text-xs text-slate">{w.type} • {w.platform} • {w.durationSec ? `${Math.round(w.durationSec/60)}m` : ''}</div>
                    </div>
                    <div className="text-sm text-right">
                      <div className="px-2 py-1 rounded-full bg-slate-100 text-slate-800 text-xs">{w.status}</div>
                      <div className="text-xs text-slate mt-2">{usersById[w.assignedTo] || w.assignedTo || '-'}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={()=>openEdit(w)} className="text-royal text-sm">Edit</button>
                    <button onClick={()=>deleteWork(w._id)} className="text-red-600 text-sm">Delete</button>
                    {w.assetLink && <a className="text-royal text-sm" href={w.assetLink} target="_blank" rel="noreferrer">Asset</a>}
                  </div>
                  {w.notes && <div className="mt-2 text-xs text-slate">{w.notes}</div>}
                </div>
              ))}
              {filtered.length === 0 && <div className="text-slate">No results</div>}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-auto">
              <div className="p-3 flex items-center justify-between">
                <div className="text-sm text-slate">Showing {filtered.length} of {works.length} items</div>
                <div>
                  <button onClick={openCreate} className="bg-royal text-white px-3 py-2 rounded-xl">New Work</button>
                </div>
              </div>
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="text-left text-slate text-sm">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(w => (
                    <tr key={w._id || `${w.title}-${w.date}`} className="border-t">
                      <td className="px-4 py-3 align-top text-sm">{fmtDate(w.date)}</td>
                      <td className="px-4 py-3 align-top text-sm font-semibold">{w.title}</td>
                      <td className="px-4 py-3 align-top text-sm">{w.type}</td>
                      <td className="px-4 py-3 align-top text-sm">{w.platform}</td>
                      <td className="px-4 py-3 align-top text-sm">{usersById[w.assignedTo] || w.assignedTo || '-'}</td>
                      <td className="px-4 py-3 align-top text-sm">{w.durationSec ? `${Math.round(w.durationSec/60)}m` : '-'}</td>
                      <td className="px-4 py-3 align-top text-sm"><span className="px-2 py-1 rounded-full bg-slate-100 text-slate-800 text-xs">{w.status}</span></td>
                      <td className="px-4 py-3 align-top text-sm">{w.notes ? (w.notes.length > 120 ? `${w.notes.slice(0,120)}...` : w.notes) : '-'}</td>
                      <td className="px-4 py-3 align-top text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={()=>openEdit(w)} className="text-royal text-sm">Edit</button>
                          <button onClick={()=>deleteWork(w._id)} className="text-red-600 text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td className="p-6 text-slate" colSpan={9}>No results</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal for create/edit */}
      <MGModal visible={modalVisible} payload={modalPayload} setPayload={setModalPayload} onClose={()=>setModalVisible(false)} onSave={handleSave} saving={modalSaving} error={modalError} users={users} types={TYPES} platforms={PLATFORMS} />
    </div>
  );
}

// Modal component using closures to keep file local state-lightweight
function MGModal({ visible, payload, setPayload, onClose, onSave, saving, error, users, types, platforms }) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // debounce the query to reduce suggestion churn
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query || ''), 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    // sync query when payload changes
    if (!payload) { setQuery(''); return; }
    // if assignedTo is a user id, show that user's name; else if assignedTo matches a user name/email show that; otherwise show raw value
    const foundById = users && users.find(u => payload.assignedTo && (u._id === payload.assignedTo || u.id === payload.assignedTo));
    if (foundById) { setQuery(foundById.name || foundById.email); return; }
    const foundByText = users && users.find(u => (u.name && payload.assignedTo && u.name === payload.assignedTo) || (u.email && payload.assignedTo && u.email === payload.assignedTo));
    setQuery(foundByText ? (foundByText.name || foundByText.email) : (payload.assignedTo || ''));
  }, [payload, users]);

  if (!visible) return null;

  const suggestions = (debouncedQuery && users) ? users.filter(u => {
    const q = debouncedQuery.toLowerCase();
    return (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q));
  }).slice(0, 6) : [];

  function onSelectUser(u) {
    const id = u._id || u.id || u.email;
    const name = u.name || u.email || id;
    setPayload(p => ({ ...(p||{}), assignedTo: id }));
    setQuery(name);
    setShowSuggestions(false);
    setHighlight(-1);
  }

  function onInputKeyDown(e) {
    if (!suggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // wrap to top
      setHighlight(h => (h >= suggestions.length - 1 ? 0 : h + 1));
      setShowSuggestions(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // wrap to bottom
      setHighlight(h => (h <= 0 ? suggestions.length - 1 : h - 1));
      setShowSuggestions(true);
    } else if (e.key === 'Enter') {
      if (highlight >= 0 && highlight < suggestions.length) {
        e.preventDefault();
        onSelectUser(suggestions[highlight]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlight(-1);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-4 w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{payload && payload._id ? 'Edit' : 'New'} MG Work</h3>
          <button onClick={onClose} className="text-slate">Close</button>
        </div>
        {error && <div className="text-red-600 mt-2">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input type="date" value={payload?.date || ''} onChange={e=>setPayload(p=>({...p, date: e.target.value}))} className="border rounded-xl px-3 py-2" />
          <input placeholder="Title" value={payload?.title||''} onChange={e=>setPayload(p=>({...p, title: e.target.value}))} className="border rounded-xl px-3 py-2" />
          <select value={payload?.type||types[0]} onChange={e=>setPayload(p=>({...p, type: e.target.value}))} className="border rounded-xl px-3 py-2">
            {types.map(t=> <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={payload?.platform||platforms[0]} onChange={e=>setPayload(p=>({...p, platform: e.target.value}))} className="border rounded-xl px-3 py-2">
            {platforms.map(pf=> <option key={pf} value={pf}>{pf}</option>)}
          </select>
          <div className="relative">
            <input
              ref={inputRef}
              id="mg-assigned-input"
              aria-autocomplete="list"
              aria-controls="mg-assigned-listbox"
              aria-expanded={showSuggestions}
              aria-activedescendant={highlight >= 0 && suggestions[highlight] ? `mg-assigned-opt-${highlight}` : undefined}
              placeholder="Assigned To (type to search)"
              value={query||''}
              onChange={e=>{ setQuery(e.target.value); setPayload(p=>({...p, assignedTo: e.target.value})); setShowSuggestions(true); setHighlight(-1); }}
              onFocus={()=>setShowSuggestions(true)}
              onKeyDown={onInputKeyDown}
              className="border rounded-xl px-3 py-2 w-full"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div id="mg-assigned-listbox" role="listbox" aria-labelledby="mg-assigned-input" className="absolute z-40 bg-white border mt-1 rounded-lg w-full max-h-44 overflow-auto shadow-sm">
                {suggestions.map((u, idx)=> (
                  <div
                    id={`mg-assigned-opt-${idx}`}
                    role="option"
                    aria-selected={idx === highlight}
                    key={u._id || u.email}
                    onMouseDown={()=>onSelectUser(u)}
                    className={`px-3 py-2 cursor-pointer ${idx === highlight ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                    <div className="text-sm font-medium">{u.name || u.email}</div>
                    {u.email && <div className="text-xs text-slate">{u.email}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input placeholder="Duration (sec)" type="number" value={payload?.durationSec||''} onChange={e=>setPayload(p=>({...p, durationSec: Number(e.target.value)}))} className="border rounded-xl px-3 py-2" />
          <input placeholder="Asset Link" value={payload?.assetLink||''} onChange={e=>setPayload(p=>({...p, assetLink: e.target.value}))} className="border rounded-xl px-3 py-2 md:col-span-2" />
          <select value={payload?.status||'Queued'} onChange={e=>setPayload(p=>({...p, status: e.target.value}))} className="border rounded-xl px-3 py-2">
            <option>Queued</option>
            <option>InProgress</option>
            <option>Review</option>
            <option>Done</option>
            <option>Hold</option>
          </select>
          <textarea placeholder="Notes" value={payload?.notes||''} onChange={e=>setPayload(p=>({...p, notes: e.target.value}))} className="border rounded-xl px-3 py-2 md:col-span-2" />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-xl border">Cancel</button>
          <button onClick={()=>onSave(payload)} disabled={saving} className="px-3 py-2 rounded-xl bg-royal text-white">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// small helpers to control modal and reload from the parent area
// removed global event-based modal and reload wiring — modal is controlled by component state
