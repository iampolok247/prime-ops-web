import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function fmtDT(d){ if (!d) return '-'; try { return new Date(d).toLocaleString(); } catch { return d; } }

export default function LeadsCenterView() {
  const { user } = useAuth();
  const [status, setStatus] = useState('All Leads');
  const [assignedToFilter, setAssignedToFilter] = useState('All');
  const [leads, setLeads] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [err, setErr] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [histLead, setHistLead] = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);

  const load = async () => {
    try {
      // For "Unassigned", fetch "Assigned" status and filter client-side
      let q = (status === 'All Leads') ? undefined : status;
      if (status === 'Unassigned') {
        q = 'Assigned';
      }
      
      const [leadsRes, admissionsRes] = await Promise.all([
        api.listLeads(q),
        api.listAdmissionUsers().catch(() => ({ users: [] }))
      ]);
      
      let fetchedLeads = leadsRes?.leads || [];
      
      // If status is "Unassigned", filter for leads without assignedTo
      if (status === 'Unassigned') {
        fetchedLeads = fetchedLeads.filter(lead => !lead.assignedTo);
      }
      
      setLeads(fetchedLeads);
      setAdmissions(admissionsRes?.users || []);
      setErr(null);
    } catch (e) { setErr(e.message); }
  };

  useEffect(()=>{ load(); }, [status]);

  // Filter leads by assigned to
  const filteredLeads = React.useMemo(() => {
    if (assignedToFilter === 'All') return leads;
    if (assignedToFilter === 'Unassigned') return leads.filter(l => !l.assignedTo);
    return leads.filter(l => l.assignedTo?._id === assignedToFilter);
  }, [leads, assignedToFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLeads.slice(startIndex, endIndex);
  }, [filteredLeads, currentPage, itemsPerPage]);

  // Reset to page 1 when filters or status change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [status, assignedToFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Leads Center (View-only)</h1>
        <div className="flex items-center gap-3">
          {/* Assigned To Filter */}
          <select 
            value={assignedToFilter} 
            onChange={e=>setAssignedToFilter(e.target.value)} 
            className="border rounded-xl px-3 py-2"
          >
            <option value="All">👥 All Members</option>
            <option value="Unassigned">⚠️ Unassigned</option>
            {admissions.map(a => (
              <option key={a._id} value={a._id}>👤 {a.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2">
            <option>All Leads</option>
            <option>Unassigned</option>
            <option>Assigned</option>
            <option>Counseling</option>
            <option>In Follow Up</option>
            <option>Admitted</option>
            <option>Not Admitted</option>
          </select>
        </div>
      </div>

      {err && <div className="mb-2 text-red-600">{err}</div>}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="text-left p-3">Lead ID</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Phone / Email</th>
              <th className="text-left p-3">Interested Course</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Lead Status</th>
              <th className="text-left p-3">Assigned To</th>
              {(user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Admission') && <th className="text-left p-3">History</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map(l => (
              <tr key={l._id} className="border-t">
                <td className="p-3">{l.leadId}</td>
                <td className="p-3">{l.name}</td>
                <td className="p-3">
                  <div>{l.phone}</div>
                  <div className="text-xs text-royal/70">{l.email || '-'}</div>
                </td>
                <td className="p-3">{l.interestedCourse || '-'}</td>
                <td className="p-3">{l.source}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    l.status === 'Admitted' ? 'bg-green-100 text-green-700' :
                    l.status === 'Not Admitted' ? 'bg-red-100 text-red-700' :
                    l.status === 'Counseling' ? 'bg-blue-100 text-blue-700' :
                    l.status === 'In Follow Up' ? 'bg-yellow-100 text-yellow-700' :
                    l.status === 'Assigned' && l.assignedTo ? 'bg-purple-100 text-purple-700' :
                    l.status === 'Assigned' && !l.assignedTo ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {l.status === 'Assigned' && !l.assignedTo ? 'Unassigned' : l.status || 'New'}
                  </span>
                </td>
                <td className="p-3">{l.assignedTo ? `${l.assignedTo.name} (${l.assignedTo.role})` : '-'}</td>
                {(user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Admission') && (
                  <td className="p-3">
                    <button disabled={histLoading} onClick={async ()=>{
                      try {
                        setErr(null);
                        setHistLoading(true);
                        const res = await api.getLeadHistory(l._id);
                        setHistLead(res.lead || res);
                        setShowHistory(true);
                      } catch (e) {
                        setErr(e.message);
                      } finally {
                        setHistLoading(false);
                      }
                    }} className="px-3 py-1 rounded-xl border hover:bg-[#f3f6ff]">
                      {histLoading ? 'Loading…' : 'History'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr><td className="p-4 text-royal/70" colSpan={7}>No leads for selected filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredLeads.length > itemsPerPage && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLeads.length)} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-xl border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page numbers - show up to 5 page buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-xl border ${
                    currentPage === pageNum
                      ? 'bg-gold text-white border-gold'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-xl border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showHistory && histLead && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setShowHistory(false)} />
          <div className="bg-white rounded-xl p-4 z-10 w-full max-w-2xl shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Lead History — {histLead.leadId}</h3>
            <div className="grid grid-cols-1 gap-2">
              <div>Assigned At: <strong>{fmtDT(histLead.assignedAt || histLead.updatedAt)}</strong></div>
              <div>Counseling At: <strong>{fmtDT(histLead.counselingAt || histLead.updatedAt)}</strong></div>
              <div>Admitted At: <strong>{fmtDT(histLead.admittedAt || histLead.updatedAt)}</strong></div>
              <div>Follow-ups ({(histLead.followUps||[]).length}):</div>
              <div className="pl-2">
                {(histLead.followUps||[]).length === 0 ? <div className="text-royal/70">No follow-ups</div> : (
                  (histLead.followUps||[]).map((f, i)=> (
                    <div key={i} className="mb-2">
                      <div className="text-sm font-medium">{fmtDT(f.at)} {f.by?.name ? ` — ${f.by.name}` : ''}</div>
                      <div className="text-royal/70">{f.note || '-'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 text-right">
              <button onClick={()=>setShowHistory(false)} className="px-3 py-2 rounded-xl border">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
