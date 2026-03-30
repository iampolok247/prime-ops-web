import React, { useEffect, useState, useMemo } from 'react';import React, { useEffect, useState } from 'react';

import { api } from '../lib/api.js';import { api } from '../lib/api.js';

import { useAuth } from '../context/AuthContext.jsx';import { useAuth } from '../context/AuthContext.jsx';



export default function LeadsCenterView() {function fmtDT(d){ if (!d) return '-'; try { return new Date(d).toLocaleString(); } catch { return d; } }

  const { user } = useAuth();

  const [status, setStatus] = useState('All Leads');export default function LeadsCenterView() {

  const [assignedToFilter, setAssignedToFilter] = useState('All');  const { user } = useAuth();

  const [courseFilter, setCourseFilter] = useState('All');  const [status, setStatus] = useState('All Leads');

  const [sortBy, setSortBy] = useState('date-desc');  const [assignedToFilter, setAssignedToFilter] = useState('All');

  const [leads, setLeads] = useState([]);  const [leads, setLeads] = useState([]);

  const [admissions, setAdmissions] = useState([]);  const [admissions, setAdmissions] = useState([]);

  const [courses, setCourses] = useState([]);  const [err, setErr] = useState(null);

  const [err, setErr] = useState(null);  const [showHistory, setShowHistory] = useState(false);

  const [showHistory, setShowHistory] = useState(false);  const [histLead, setHistLead] = useState(null);

  const [histLead, setHistLead] = useState(null);  const [histLoading, setHistLoading] = useState(false);

  const [histLoading, setHistLoading] = useState(false);  

    // Pagination state

  // Date range filter state  const [currentPage, setCurrentPage] = useState(1);

  const [fromDate, setFromDate] = useState('');  const [itemsPerPage] = useState(100);

  const [toDate, setToDate] = useState('');

    const load = async () => {

  // Pagination state    try {

  const [currentPage, setCurrentPage] = useState(1);      // For "Unassigned", fetch "Assigned" status and filter client-side

  const [itemsPerPage] = useState(100);      let q = (status === 'All Leads') ? undefined : status;

      if (status === 'Unassigned') {

  // Set default date to today        q = 'Assigned';

  useEffect(() => {      }

    const today = new Date().toISOString().split('T')[0];      

    setFromDate(today);      const [leadsRes, admissionsRes] = await Promise.all([

    setToDate(today);        api.listLeads(q),

  }, []);        api.listAdmissionUsers().catch(() => ({ users: [] }))

      ]);

  const load = async () => {      

    try {      let fetchedLeads = leadsRes?.leads || [];

      // For "Unassigned", fetch "Assigned" status and filter client-side      

      let q = (status === 'All Leads') ? undefined : status;      // If status is "Unassigned", filter for leads without assignedTo

      if (status === 'Unassigned') {      if (status === 'Unassigned') {

        q = 'Assigned';        fetchedLeads = fetchedLeads.filter(lead => !lead.assignedTo);

      }      }

            

      const [leadsRes, admissionsRes, coursesRes] = await Promise.all([      setLeads(fetchedLeads);

        api.listLeads(q),      setAdmissions(admissionsRes?.users || []);

        api.listAdmissionUsers().catch(() => ({ users: [] })),      setErr(null);

        api.listCourses().catch(() => ({ courses: [] }))    } catch (e) { setErr(e.message); }

      ]);  };

      

      let fetchedLeads = leadsRes?.leads || [];  useEffect(()=>{ load(); }, [status]);

      

      // If status is "Unassigned", filter for leads without assignedTo  // Filter leads by assigned to

      if (status === 'Unassigned') {  const filteredLeads = React.useMemo(() => {

        fetchedLeads = fetchedLeads.filter(lead => !lead.assignedTo);    if (assignedToFilter === 'All') return leads;

      }    if (assignedToFilter === 'Unassigned') return leads.filter(l => !l.assignedTo);

          return leads.filter(l => l.assignedTo?._id === assignedToFilter);

      setLeads(fetchedLeads);  }, [leads, assignedToFilter]);

      setAdmissions(admissionsRes?.users || []);

      setCourses(coursesRes?.courses || []);  // Pagination logic

      setErr(null);  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

    } catch (e) { setErr(e.message); }  const paginatedLeads = React.useMemo(() => {

  };    const startIndex = (currentPage - 1) * itemsPerPage;

    const endIndex = startIndex + itemsPerPage;

  useEffect(()=>{ load(); }, [status]);    return filteredLeads.slice(startIndex, endIndex);

  }, [filteredLeads, currentPage, itemsPerPage]);

  // Filter and sort leads

  const filteredLeads = useMemo(() => {  // Reset to page 1 when filters or status change

    let result = [...leads];  React.useEffect(() => {

        setCurrentPage(1);

    // Filter by assigned to  }, [status, assignedToFilter]);

    if (assignedToFilter !== 'All') {

      if (assignedToFilter === 'Unassigned') {  return (

        result = result.filter(l => !l.assignedTo);    <div>

      } else {      <div className="flex items-center justify-between mb-3">

        result = result.filter(l => l.assignedTo?._id === assignedToFilter);        <h1 className="text-2xl font-bold text-navy">Leads Center (View-only)</h1>

      }        <div className="flex items-center gap-3">

    }          {/* Assigned To Filter */}

              <select 

    // Filter by course            value={assignedToFilter} 

    if (courseFilter !== 'All') {            onChange={e=>setAssignedToFilter(e.target.value)} 

      result = result.filter(l => l.interestedCourse === courseFilter);            className="border rounded-xl px-3 py-2"

    }          >

                <option value="All">👥 All Members</option>

    // Filter by date range            <option value="Unassigned">⚠️ Unassigned</option>

    if (fromDate) {            {admissions.map(a => (

      const from = new Date(fromDate);              <option key={a._id} value={a._id}>👤 {a.name}</option>

      from.setHours(0, 0, 0, 0);            ))}

      result = result.filter(l => {          </select>

        const created = new Date(l.createdAt);

        return created >= from;          {/* Status Filter */}

      });          <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2">

    }            <option>All Leads</option>

    if (toDate) {            <option>Unassigned</option>

      const to = new Date(toDate);            <option>Assigned</option>

      to.setHours(23, 59, 59, 999);            <option>Counseling</option>

      result = result.filter(l => {            <option>In Follow Up</option>

        const created = new Date(l.createdAt);            <option>Admitted</option>

        return created <= to;            <option>Not Admitted</option>

      });          </select>

    }        </div>

          </div>

    // Sort

    switch (sortBy) {      {err && <div className="mb-2 text-red-600">{err}</div>}

      case 'date-desc':

        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));      <div className="bg-white rounded-2xl shadow-soft overflow-auto">

        break;        <table className="min-w-full text-sm">

      case 'date-asc':          <thead className="bg-[#f3f6ff] text-royal">

        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));            <tr>

        break;              <th className="text-left p-3">Lead ID</th>

      case 'member-asc':              <th className="text-left p-3">Name</th>

        result.sort((a, b) => (a.assignedTo?.name || 'zzz').localeCompare(b.assignedTo?.name || 'zzz'));              <th className="text-left p-3">Phone / Email</th>

        break;              <th className="text-left p-3">Interested Course</th>

      case 'member-desc':              <th className="text-left p-3">Source</th>

        result.sort((a, b) => (b.assignedTo?.name || '').localeCompare(a.assignedTo?.name || ''));              <th className="text-left p-3">Lead Status</th>

        break;              <th className="text-left p-3">Assigned To</th>

      default:              {(user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Admission') && <th className="text-left p-3">History</th>}

        break;            </tr>

    }          </thead>

              <tbody>

    return result;            {paginatedLeads.map(l => (

  }, [leads, assignedToFilter, courseFilter, fromDate, toDate, sortBy]);              <tr key={l._id} className="border-t">

                <td className="p-3">{l.leadId}</td>

  // Pagination logic                <td className="p-3">{l.name}</td>

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);                <td className="p-3">

  const paginatedLeads = useMemo(() => {                  <div>{l.phone}</div>

    const startIndex = (currentPage - 1) * itemsPerPage;                  <div className="text-xs text-royal/70">{l.email || '-'}</div>

    const endIndex = startIndex + itemsPerPage;                </td>

    return filteredLeads.slice(startIndex, endIndex);                <td className="p-3">{l.interestedCourse || '-'}</td>

  }, [filteredLeads, currentPage, itemsPerPage]);                <td className="p-3">{l.source}</td>

                <td className="p-3">

  // Reset to page 1 when filters or status change                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${

  useEffect(() => {                    l.status === 'Admitted' ? 'bg-green-100 text-green-700' :

    setCurrentPage(1);                    l.status === 'Not Admitted' ? 'bg-red-100 text-red-700' :

  }, [status, assignedToFilter, courseFilter, fromDate, toDate]);                    l.status === 'Counseling' ? 'bg-blue-100 text-blue-700' :

                    l.status === 'In Follow Up' ? 'bg-yellow-100 text-yellow-700' :

  // Get unique courses from leads                    l.status === 'Assigned' && l.assignedTo ? 'bg-purple-100 text-purple-700' :

  const uniqueCourses = useMemo(() => {                    l.status === 'Assigned' && !l.assignedTo ? 'bg-orange-100 text-orange-700' :

    const courseSet = new Set(leads.map(l => l.interestedCourse).filter(Boolean));                    'bg-gray-100 text-gray-700'

    return Array.from(courseSet).sort();                  }`}>

  }, [leads]);                    {l.status === 'Assigned' && !l.assignedTo ? 'Unassigned' : l.status || 'New'}

                  </span>

  const formatDateTime = (date) => {                </td>

    if (!date) return null;                <td className="p-3">{l.assignedTo ? `${l.assignedTo.name} (${l.assignedTo.role})` : '-'}</td>

    return new Date(date).toLocaleString('en-GB', {                 {(user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Admission') && (

      day: '2-digit',                   <td className="p-3">

      month: 'short',                     <button disabled={histLoading} onClick={async ()=>{

      year: 'numeric',                      try {

      hour: '2-digit',                        setErr(null);

      minute: '2-digit',                        setHistLoading(true);

      hour12: true                        const res = await api.getLeadHistory(l._id);

    });                        setHistLead(res.lead || res);

  };                        setShowHistory(true);

                      } catch (e) {

  return (                        setErr(e.message);

    <div>                      } finally {

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">                        setHistLoading(false);

        <h1 className="text-2xl font-bold text-navy">Leads Center</h1>                      }

                            }} className="px-3 py-1 rounded-xl border hover:bg-[#f3f6ff]">

        <div className="flex flex-wrap items-center gap-3">                      {histLoading ? 'Loading…' : 'History'}

          {/* Date Range Filter */}                    </button>

          <div className="flex items-center gap-2">                  </td>

            <span className="text-sm text-gray-600">From:</span>                )}

            <input              </tr>

              type="date"            ))}

              value={fromDate}            {filteredLeads.length === 0 && (

              onChange={(e) => setFromDate(e.target.value)}              <tr><td className="p-4 text-royal/70" colSpan={7}>No leads for selected filters</td></tr>

              className="border rounded-xl px-3 py-2 text-sm"            )}

            />          </tbody>

            <span className="text-gray-400">→</span>        </table>

            <span className="text-sm text-gray-600">To:</span>      </div>

            <input

              type="date"      {/* Pagination Controls */}

              value={toDate}      {filteredLeads.length > itemsPerPage && (

              onChange={(e) => setToDate(e.target.value)}        <div className="mt-4 flex items-center justify-between">

              className="border rounded-xl px-3 py-2 text-sm"          <div className="text-sm text-gray-600">

            />            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLeads.length)} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads

          </div>          </div>

          <div className="flex gap-2">

          {/* Sort By */}            <button

          <select               onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}

            value={sortBy}               disabled={currentPage === 1}

            onChange={e => setSortBy(e.target.value)}               className="px-3 py-1 rounded-xl border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"

            className="border rounded-xl px-3 py-2"            >

          >              Previous

            <option value="date-desc">🗓️ Newest First</option>            </button>

            <option value="date-asc">🗓️ Oldest First</option>            

            <option value="member-asc">👤 Member A-Z</option>            {/* Page numbers - show up to 5 page buttons */}

            <option value="member-desc">👤 Member Z-A</option>            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {

          </select>              let pageNum;

              if (totalPages <= 5) {

          {/* Assigned To Filter */}                pageNum = i + 1;

          <select               } else if (currentPage <= 3) {

            value={assignedToFilter}                 pageNum = i + 1;

            onChange={e=>setAssignedToFilter(e.target.value)}               } else if (currentPage >= totalPages - 2) {

            className="border rounded-xl px-3 py-2"                pageNum = totalPages - 4 + i;

          >              } else {

            <option value="All">👥 All Members</option>                pageNum = currentPage - 2 + i;

            <option value="Unassigned">⚠️ Unassigned</option>              }

            {admissions.map(a => (              

              <option key={a._id} value={a._id}>👤 {a.name}</option>              return (

            ))}                <button

          </select>                  key={pageNum}

                  onClick={() => setCurrentPage(pageNum)}

          {/* Course Filter */}                  className={`px-3 py-1 rounded-xl border ${

          <select                     currentPage === pageNum

            value={courseFilter}                       ? 'bg-gold text-white border-gold'

            onChange={e => setCourseFilter(e.target.value)}                       : 'hover:bg-gray-100'

            className="border rounded-xl px-3 py-2"                  }`}

          >                >

            <option value="All">📚 All Courses</option>                  {pageNum}

            {uniqueCourses.map(c => (                </button>

              <option key={c} value={c}>{c}</option>              );

            ))}            })}

          </select>            

            <button

          {/* Status Filter */}              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}

          <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2">              disabled={currentPage === totalPages}

            <option>All Leads</option>              className="px-3 py-1 rounded-xl border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"

            <option>Unassigned</option>            >

            <option>Assigned</option>              Next

            <option>Counseling</option>            </button>

            <option>In Follow Up</option>          </div>

            <option>Admitted</option>        </div>

            <option>Not Interested</option>      )}

          </select>

        </div>      {showHistory && histLead && (

      </div>        <div className="fixed inset-0 flex items-center justify-center z-50">

          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setShowHistory(false)} />

      {/* Stats Summary */}          <div className="bg-white rounded-xl p-4 z-10 w-full max-w-2xl shadow-lg">

      <div className="mb-4 flex items-center gap-4 text-sm">            <h3 className="text-lg font-semibold mb-2">Lead History — {histLead.leadId}</h3>

        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">            <div className="grid grid-cols-1 gap-2">

          Total: {filteredLeads.length} leads              <div>Assigned At: <strong>{fmtDT(histLead.assignedAt || histLead.updatedAt)}</strong></div>

        </span>              <div>Counseling At: <strong>{fmtDT(histLead.counselingAt || histLead.updatedAt)}</strong></div>

        {fromDate && toDate && (              <div>Admitted At: <strong>{fmtDT(histLead.admittedAt || histLead.updatedAt)}</strong></div>

          <span className="text-gray-600">              <div>Follow-ups ({(histLead.followUps||[]).length}):</div>

            Showing leads from {new Date(fromDate).toLocaleDateString('en-GB')} to {new Date(toDate).toLocaleDateString('en-GB')}              <div className="pl-2">

          </span>                {(histLead.followUps||[]).length === 0 ? <div className="text-royal/70">No follow-ups</div> : (

        )}                  (histLead.followUps||[]).map((f, i)=> (

      </div>                    <div key={i} className="mb-2">

                      <div className="text-sm font-medium">{fmtDT(f.at)} {f.by?.name ? ` — ${f.by.name}` : ''}</div>

      {err && <div className="mb-2 text-red-600">{err}</div>}                      <div className="text-royal/70">{f.note || '-'}</div>

                    </div>

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">                  ))

        <table className="min-w-full text-sm">                )}

          <thead className="bg-[#f3f6ff] text-royal">              </div>

            <tr>            </div>

              <th className="text-left p-3">Lead ID</th>            <div className="mt-4 text-right">

              <th className="text-left p-3">Added Date</th>              <button onClick={()=>setShowHistory(false)} className="px-3 py-2 rounded-xl border">Close</button>

              <th className="text-left p-3">Name</th>            </div>

              <th className="text-left p-3">Phone / Email</th>          </div>

              <th className="text-left p-3">Course</th>        </div>

              <th className="text-left p-3">Source</th>      )}

              <th className="text-left p-3">Status</th>    </div>

              <th className="text-left p-3">Assigned To</th>  );

              <th className="text-left p-3">History</th>}

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
                <td className="p-3">
                  <div>{l.phone}</div>
                  <div className="text-xs text-royal/70">{l.email || '-'}</div>
                </td>
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
                  }`}>
                    {l.status === 'Assigned' && !l.assignedTo ? 'Unassigned' : l.status || 'New'}
                  </span>
                </td>
                <td className="p-3">{l.assignedTo?.name || '-'}</td>
                <td className="p-3">
                  <button 
                    disabled={histLoading} 
                    onClick={async () => {
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
                    }} 
                    className="px-3 py-1 rounded-xl border hover:bg-[#f3f6ff] text-blue-600"
                  >
                    {histLoading ? 'Loading…' : 'History'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr><td className="p-4 text-royal/70 text-center" colSpan={9}>No leads for selected filters</td></tr>
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

      {/* Lead History Modal */}
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
                  {(histLead.followUps||[]).length === 0 ? (
                    <div className="text-royal/70 italic">No follow-ups yet</div>
                  ) : (
                    (histLead.followUps||[]).map((f, i)=> (
                      <div key={i} className="mb-3 p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-royal">
                          {formatDateTime(f.at)}
                          {f.by?.name && <span className="ml-2 text-blue-600">— {f.by.name}</span>}
                        </div>
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
