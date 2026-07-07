// Counsellor (Admission) view — score fields are NEVER rendered here.
// The API also strips them server-side as a second line of defence.
import { useEffect, useState } from 'react';
import { Phone, Mail, Calendar, RefreshCw, ChevronLeft, ChevronRight, Info, Search, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import StatusModal from './components/StatusModal.jsx';
import LeadInfoModal from './components/LeadInfoModal.jsx';

const TABS = ['Assigned', 'Counseling', 'In Follow Up', 'Admitted', 'Not Interested', 'All'];

const STATUS_PILL = {
  Assigned:        'bg-blue-100 text-blue-700',
  Counseling:      'bg-indigo-100 text-indigo-700',
  'In Follow Up':  'bg-yellow-100 text-yellow-700',
  Admitted:        'bg-green-100 text-green-700',
  'Not Admitted':  'bg-gray-200 text-gray-600',
  'Not Interested':'bg-red-100 text-red-700',
};

export default function MetaLeadsPipeline() {
  const { user } = useAuth();

  const [tab, setTab]         = useState('Assigned');
  const [leads, setLeads]     = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusTarget, setStatusTarget] = useState(null);
  const [infoLead, setInfoLead] = useState(null);
  const [msg, setMsg]         = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [courseOptions, setCourseOptions] = useState([]);

  const loadCourseOptions = async () => {
    try {
      const res = await api.getMetaLeadCourses();
      setCourseOptions(res.courses || []);
    } catch (e) {
      console.error(e);
    }
  };

  const load = async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 50 };
      if (tab !== 'All') params.status = tab;
      if (searchQ) params.q = searchQ;
      if (filterCourse) params.course = filterCourse;

      const [leadsRes, statsRes] = await Promise.all([
        api.listMetaLeads(params),
        api.getMetaLeadStats()
      ]);

      setLeads(leadsRes.leads || []);
      setTotalPages(leadsRes.pages || 1);
      setStats(statsRes.byStatus || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); load(1); }, [tab, searchQ, filterCourse]);
  useEffect(() => { load(page); }, [page]);
  useEffect(() => { loadCourseOptions(); }, []);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(null), 3000); };

  const handleStatus = async (payload) => {
    await api.updateMetaLeadStatus(statusTarget._id, payload);
    flash('Status updated');
    load(page);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-[#253985]">My Lead Pipeline</h1>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full">{msg}</span>}
          <button onClick={() => { load(page); loadCourseOptions(); }}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Assigned',       value: stats.Assigned ?? 0,        color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Counseling',     value: stats.Counseling ?? 0,      color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
          { label: 'In Follow Up',   value: stats['In Follow Up'] ?? 0, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Admitted',       value: stats.Admitted ?? 0,        color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition
              ${tab === t ? 'bg-white shadow text-[#253985]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
            {stats[t] != null && t !== 'All' && (
              <span className="ml-1 text-[10px] opacity-60">({stats[t]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Course filter */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white flex-1 min-w-[240px]">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="text-sm w-full outline-none"
            placeholder="Search by number, name, email, lead ID..."
          />
          {searchQ && (
            <button onClick={() => setSearchQ('')} className="text-gray-300 hover:text-gray-500" aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={filterCourse}
          onChange={e => setFilterCourse(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">All Courses</option>
          {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Lead</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Course</th>
              <th className="px-4 py-3 text-left">Next Follow-Up</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Info</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No leads in this stage</td></tr>
            ) : leads.map(lead => (
              <tr key={lead._id} className="hover:bg-gray-50/50 transition">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{lead.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{lead.leadId}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Phone size={11} className="text-gray-400" />
                    <span>{lead.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                    <Mail size={11} />
                    <span>{lead.email || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">
                  {lead.interestedCourse || '—'}
                </td>
                <td className="px-4 py-3">
                  {lead.nextFollowUpDate ? (
                    <div className="flex items-center gap-1 text-xs text-yellow-700">
                      <Calendar size={12} />
                      {formatDate(lead.nextFollowUpDate)}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[lead.status] || 'bg-gray-100 text-gray-500'}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => setInfoLead(lead)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#253985] hover:bg-gray-100 transition">
                    <Info size={14} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  {['Assigned', 'Counseling', 'In Follow Up'].includes(lead.status) && (
                    <button
                      onClick={() => setStatusTarget(lead)}
                      className="text-xs px-2.5 py-1 bg-[#253985] text-white rounded-lg hover:bg-blue-800"
                    >
                      Update
                    </button>
                  )}
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

      {statusTarget && (
        <StatusModal
          lead={statusTarget}
          onClose={() => setStatusTarget(null)}
          onSubmit={handleStatus}
        />
      )}

      {infoLead && (
        <LeadInfoModal lead={infoLead} onClose={() => setInfoLead(null)} />
      )}
    </div>
  );
}
