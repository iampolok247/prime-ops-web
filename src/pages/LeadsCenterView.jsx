import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LeadsCenterView() {
  const { user } = useAuth();
  const [status, setStatus] = useState('All Leads');
  const [assignedToFilter, setAssignedToFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [leads, setLeads] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [err, setErr] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [histLead, setHistLead] = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
  }, []);

  const load = async () => {
    try {
      let q = (status === 'All Leads') ? undefined : status;
      if (status === 'Unassigned') q = 'Assigned';
      
      const [leadsRes, admissionsRes, coursesRes] = await Promise.all([
        api.listLeads(q),
        api.listAdmissionUsers().catch(() => ({ users: [] })),
        api.listCourses().catch(() => ({ courses: [] }))
      ]);
      
      let fetchedLeads = leadsRes?.leads || [];
      if (status === 'Unassigned') {
        fetchedLeads = fetchedLeads.filter(lead => !lead.assignedTo);
      }
      
      setLeads(fetchedLeads);
      setAdmissions(admissionsRes?.users || []);
      setCourses(coursesRes?.courses || []);
      setErr(null);
    } catch (e) { setErr(e.message); }
  };

  useEffect(()=>{
    load();
    // Real-time polling every 30 seconds (re-created on status change so it uses current filter)
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [status]);

  const filteredLeads = useMemo(() => {
    let result = [...leads];
    
    if (assignedToFilter !== 'All') {
      if (assignedToFilter === 'Unassigned') {
        result = result.filter(l => !l.assignedTo);
      } else {
        result = result.filter(l => l.assignedTo?._id === assignedToFilter);
      }
    }
    
    if (courseFilter !== 'All') {
      result = result.filter(l => l.interestedCourse === courseFilter);
    }
    
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      result = result.filter(l => new Date(l.createdAt) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.createdAt) <= to);
    }
    
    switch (sortBy) {
      case 'date-desc': result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case 'date-asc': result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'member-asc': result.sort((a, b) => (a.assignedTo?.name || 'zzz').localeCompare(b.assignedTo?.name || 'zzz')); break;
      case 'member-desc': result.sort((a, b) => (b.assignedTo?.name || '').localeCompare(a.assignedTo?.name || '')); break;
    }
    
    return result;
  }, [leads, assignedToFilter, courseFilter, fromDate, toDate, sortBy]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [status, assignedToFilter, courseFilter, fromDate, toDate]);

  const uniqueCourses = useMemo(() => {
    const courseSet = new Set(leads.map(l => l.interestedCourse).filter(Boolean));
    return Array.from(courseSet).sort();
  }, [leads]);

  const formatDateTime = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-navy">Leads Center</h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">From:</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" />
            <span className="text-gray-400">→</span>
            <span className="text-sm text-gray-600">To:</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" />
          </div>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="date-desc">🗓️ Newest First</option>
            <option value="date-asc">🗓️ Oldest First</option>
            <option value="member-asc">👤 Member A-Z</option>
            <option value="member-desc">👤 Member Z-A</option>
          </select>

          <select value={assignedToFilter} onChange={e=>setAssignedToFilter(e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="All">👥 All Members</option>
            <option value="Unassigned">⚠️ Unassigned</option>
            {admissions.map(a => (<option key={a._id} value={a._id}>👤 {a.name}</option>))}
          </select>

          <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="All">�� All Courses</option>
            {uniqueCourses.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>

          <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2">
            <option>All Leads</option>
            <option>Unassigned</option>
            <option>Assigned</option>
            <option>Counseling</option>
            <option>In Follow Up</option>
            <option>Admitted</option>
            <option>Not Interested</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Total: {filteredLeads.length} leads</span>
        {fromDate && toDate && (<span className="text-gray-600">Showing leads from {new Date(fromDate).toLocaleDateString('en-GB')} to {new Date(toDate).toLocaleDateString('en-GB')}</span>)}
      </div>

      {err && <div className="mb-2 text-red-600">{err}</div>}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="text-left p-3">Lead ID</th>
              <th className="text-left p-3">Added Date</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Phone / Email</th>
              <th className="text-left p-3">Course</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Assigned To</th>
              <th className="text-left p-3">History</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map(l => (
              <tr key={l._id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{l.leadId}</td>
                <td className="p-3 text-xs">
                  <div>{new Date(l.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div className="text-gray-500">{new Date(l.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                </td>
                <td className="p-3 font-medium">{l.name}</td>
                <td className="p-3"><div>{l.phone}</div><div className="text-xs text-royal/70">{l.email || '-'}</div></td>
                <td className="p-3">{l.interestedCourse || '-'}</td>
                <td className="p-3">{l.source}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    l.status === 'Admitted' ? 'bg-green-100 text-green-700' :
                    l.status === 'Not Interested' ? 'bg-red-100 text-red-700' :
                    l.status === 'Counseling' ? 'bg-blue-100 text-blue-700' :
                    l.status === 'In Follow Up' ? 'bg-yellow-100 text-yellow-700' :
                    l.status === 'Assigned' && l.assignedTo ? 'bg-purple-100 text-purple-700' :
                    l.status === 'Assigned' && !l.assignedTo ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{l.status === 'Assigned' && !l.assignedTo ? 'Unassigned' : l.status || 'New'}</span>
                </td>
                <td className="p-3">{l.assignedTo?.name || '-'}</td>
                <td className="p-3">
                  <button disabled={histLoading} onClick={async () => {
                    try {
                      setErr(null); setHistLoading(true);
                      const res = await api.getLeadHistory(l._id);
                      setHistLead(res.lead || res);
                      setShowHistory(true);
                    } catch (e) { setErr(e.message); } finally { setHistLoading(false); }
                  }} className="px-3 py-1 rounded-xl border hover:bg-[#f3f6ff] text-blue-600">{histLoading ? 'Loading…' : 'History'}</button>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (<tr><td className="p-4 text-royal/70 text-center" colSpan={9}>No leads for selected filters</td></tr>)}
          </tbody>
        </table>
      </div>

      {filteredLeads.length > itemsPerPage && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLeads.length)} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads</div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-xl border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (<button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-3 py-1 rounded-xl border ${currentPage === pageNum ? 'bg-gold text-white border-gold' : 'hover:bg-gray-100'}`}>{pageNum}</button>);
            })}
            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-xl border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      )}

      {showHistory && histLead && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setShowHistory(false)} />
          <div className="bg-white rounded-xl p-6 z-10 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">Lead History — {histLead.leadId}</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start gap-2">
                <span className="text-royal/70 min-w-[140px]">Created At:</span>
                <strong>{formatDateTime(histLead.createdAt) || '-'}</strong>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-royal/70 min-w-[140px]">Assigned At:</span>
                <strong>{histLead.assignedAt ? formatDateTime(histLead.assignedAt) : <span className="text-royal/50">Not yet assigned</span>}</strong>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-royal/70 min-w-[140px]">Counseling At:</span>
                <strong>{histLead.counselingAt ? formatDateTime(histLead.counselingAt) : <span className="text-royal/50">Not yet in counseling</span>}</strong>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-royal/70 min-w-[140px]">Admitted At:</span>
                <strong>{histLead.admittedAt ? formatDateTime(histLead.admittedAt) : <span className="text-royal/50">Not yet admitted</span>}</strong>
              </div>
              <div className="border-t pt-3 mt-2">
                <div className="font-medium mb-2">Follow-ups ({(histLead.followUps||[]).length})</div>
                <div className="pl-2">
                  {(histLead.followUps||[]).length === 0 ? (<div className="text-royal/70 italic">No follow-ups yet</div>) : (
                    (histLead.followUps||[]).map((f, i)=> (
                      <div key={i} className="mb-3 p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-royal">{formatDateTime(f.at)}{f.by?.name && <span className="ml-2 text-blue-600">— {f.by.name}</span>}</div>
                        <div className="text-sm text-royal/70 mt-1">{f.note || 'No notes'}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 text-right">
              <button onClick={()=>setShowHistory(false)} className="px-4 py-2 bg-royal text-white rounded-xl hover:bg-royal/90">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
