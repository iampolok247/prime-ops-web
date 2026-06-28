// Phase 4 — Counsellor Work Queue
// Two sections: New Leads (Assigned, not yet contacted) + Today's Follow-ups
// SSE auto-refreshes when a new lead is pushed to this counsellor.
import { useEffect, useState, useCallback } from 'react';
import { Inbox, Clock, Phone, Mail, RefreshCw, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import StatusModal from './components/StatusModal.jsx';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const fmtTime = (d) => d
  ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  : '';

export default function MetaLeadsQueue() {
  const { user } = useAuth();

  const [newLeads,     setNewLeads]     = useState([]);
  const [followUps,    setFollowUps]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [msg,          setMsg]          = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [startingId,   setStartingId]   = useState(null); // which lead is being moved to Counseling

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const [assignedRes, followUpRes] = await Promise.all([
        api.listMetaLeads({ status: 'Assigned', limit: 100 }),
        api.listMetaLeads({ status: 'In Follow Up', limit: 100 })
      ]);

      setNewLeads(assignedRes.leads || []);

      // Only show follow-ups due today or overdue
      const dueToday = (followUpRes.leads || []).filter(l => {
        if (!l.nextFollowUpDate) return true; // no date set → show always
        return new Date(l.nextFollowUpDate) <= today;
      });
      setFollowUps(dueToday);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // SSE — refresh instantly when a lead is assigned to this counsellor
  useEffect(() => {
    const base = import.meta.env.PROD ? 'https://ops-backend.primeacademy.org' : 'http://localhost:5001';
    const token = localStorage.getItem('auth_token');
    const es = new EventSource(`${base}/api/meta-leads/events?token=${token}`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'LEAD_ASSIGNED') load();
      } catch {}
    };
    return () => es.close();
  }, [load]);

  // Click "Start" on a new lead — moves it to Counseling
  const startCounseling = async (lead) => {
    setStartingId(lead._id);
    try {
      await api.updateMetaLeadStatus(lead._id, { status: 'Counseling' });
      flash(`Started counseling — ${lead.name}`);
      load();
    } catch { flash('Failed to update status'); }
    finally { setStartingId(null); }
  };

  const handleStatus = async (payload) => {
    await api.updateMetaLeadStatus(statusTarget._id, payload);
    flash('Status updated');
    setStatusTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#253985]">My Lead Queue</h1>
          <p className="text-xs text-gray-400 mt-0.5">New leads + today's follow-ups</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {msg && <div className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-xl">{msg}</div>}

      {/* ── Section 1: New Leads ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Inbox size={16} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-700">New Leads</h2>
          <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
            {newLeads.length}
          </span>
        </div>

        {newLeads.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-6 text-center text-sm text-gray-400">
            No new leads — you're all caught up
          </div>
        ) : (
          <div className="space-y-2">
            {newLeads.map(lead => (
              <div key={lead._id}
                className="bg-white border-l-4 border-blue-400 rounded-xl shadow-sm px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Phone size={10} /> {lead.phone}
                      </span>
                    )}
                    {lead.email && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Mail size={10} /> {lead.email}
                      </span>
                    )}
                  </div>
                  {lead.interestedCourse && (
                    <p className="text-[11px] text-blue-600 mt-0.5">{lead.interestedCourse}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-gray-400">{fmtDate(lead.assignedAt)}</span>
                  <button
                    onClick={() => startCounseling(lead)}
                    disabled={startingId === lead._id}
                    className="flex items-center gap-1 text-[11px] px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {startingId === lead._id ? '…' : 'Start'} <ChevronRight size={12} />
                  </button>
                  <button onClick={() => setStatusTarget(lead)}
                    className="text-[11px] px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                    Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Today's Follow-ups ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-orange-500" />
          <h2 className="text-sm font-semibold text-gray-700">Today's Follow-ups</h2>
          <span className="text-[11px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
            {followUps.length}
          </span>
        </div>

        {followUps.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-6 text-center text-sm text-gray-400">
            No follow-ups due today
          </div>
        ) : (
          <div className="space-y-2">
            {followUps.map(lead => {
              const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date();
              return (
                <div key={lead._id}
                  className={`bg-white border-l-4 rounded-xl shadow-sm px-4 py-3 flex items-center gap-4
                    ${isOverdue ? 'border-red-400' : 'border-orange-400'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Phone size={10} /> {lead.phone}
                        </span>
                      )}
                    </div>
                    {lead.nextFollowUpDate && (
                      <p className={`text-[11px] mt-0.5 ${isOverdue ? 'text-red-500 font-semibold' : 'text-orange-500'}`}>
                        {isOverdue ? 'Overdue — ' : 'Due '}{fmtDate(lead.nextFollowUpDate)} {fmtTime(lead.nextFollowUpDate)}
                      </p>
                    )}
                    {lead.notes && (
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xs">{lead.notes}</p>
                    )}
                  </div>
                  <button onClick={() => setStatusTarget(lead)}
                    className="shrink-0 text-[11px] px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                    Update
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {statusTarget && (
        <StatusModal lead={statusTarget}
          onClose={() => setStatusTarget(null)} onSubmit={handleStatus} />
      )}
    </div>
  );
}
