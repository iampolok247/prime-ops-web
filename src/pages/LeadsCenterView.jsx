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
            {filteredLeads.map(l => (
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
