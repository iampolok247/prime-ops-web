// Phase 5 — Admin/DM view of ALL counsellors' follow-up leads (not just today's)
import { useEffect, useState, useCallback } from 'react';
import { Clock, Phone, Mail, RefreshCw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import StatusModal from './components/StatusModal.jsx';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })
  : '—';

export default function MetaLeadsFollowUp() {
  const { user } = useAuth();
  const isAdmin = ['DigitalMarketing', 'Admin', 'SuperAdmin', 'ITAdmin'].includes(user?.role);

  const [leads, setLeads]               = useState([]);
  const [admissions, setAdmissions]     = useState([]);
  const [loading, setLoading]           = useState(false);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [counsellorFilter, setCounsellorFilter] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);
  const [msg, setMsg]                   = useState(null);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 3000); };

  const load = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = { status: 'In Follow Up', page: currentPage, limit: 50 };
      if (isAdmin && counsellorFilter) params.assignedTo = counsellorFilter;

      const calls = [api.listMetaLeads(params)];
      if (isAdmin) calls.push(api.listAdmissionUsers().catch(() => ({ users: [] })));

      const [leadsRes, usersRes] = await Promise.all(calls);

      setLeads(leadsRes.leads || []);
      setTotalPages(leadsRes.pages || 1);
      if (usersRes) setAdmissions(usersRes.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [counsellorFilter, isAdmin]);

  useEffect(() => { setPage(1); load(1); }, [counsellorFilter, load]);
  useEffect(() => { load(page); }, [page]);

  const handleStatus = async (payload) => {
    await api.updateMetaLeadStatus(statusTarget._id, payload);
    flash('Status updated');
    setStatusTarget(null);
    load(page);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-orange-500" />
          <h1 className="text-xl font-bold text-[#253985]">Follow-Up Leads</h1>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full">{msg}</span>}
          {isAdmin && (
            <select value={counsellorFilter} onChange={e => setCounsellorFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none">
              <option value="">All Counsellors</option>
              {admissions.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          )}
          <button onClick={() => load(page)} disabled={loading}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-3 text-left">Lead ID</th>
              <th className="px-3 py-3 text-left">Full Name</th>
              <th className="px-3 py-3 text-left">Contact</th>
              <th className="px-3 py-3 text-left">Course</th>
              {isAdmin && <th className="px-3 py-3 text-left">Counsellor</th>}
              <th className="px-3 py-3 text-left">Next Follow-up</th>
              <th className="px-3 py-3 text-left">Notes</th>
              <th className="px-3 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-gray-400">No follow-up leads</td></tr>
            ) : leads.map(lead => {
              const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date();
              return (
                <tr key={lead._id} className="hover:bg-gray-50/50 transition">
                  <td className="px-3 py-2.5 font-mono text-[#253985] font-medium text-[11px]">{lead.leadId}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{lead.name}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-xs text-gray-700">{lead.phone || '—'}</p>
                    <p className="text-[10px] text-gray-400">{lead.email || ''}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[110px] truncate">{lead.interestedCourse || '—'}</td>
                  {isAdmin && <td className="px-3 py-2.5 text-xs text-gray-600">{lead.assignedTo?.name || '—'}</td>}
                  <td className="px-3 py-2.5">
                    {lead.nextFollowUpDate ? (
                      <span className={`text-[11px] font-medium ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                        {isOverdue ? '⚠ Overdue — ' : ''}{fmtDate(lead.nextFollowUpDate)}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[150px] truncate">{lead.notes || '—'}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => setStatusTarget(lead)}
                      className="text-[11px] px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100">
                      Update
                    </button>
                  </td>
                </tr>
              );
            })}
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

      {statusTarget && (
        <StatusModal lead={statusTarget}
          onClose={() => setStatusTarget(null)} onSubmit={handleStatus} />
      )}
    </div>
  );
}
