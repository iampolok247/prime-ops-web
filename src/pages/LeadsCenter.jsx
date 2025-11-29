import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LeadsCenter() {
  const { user } = useAuth();
  const [status, setStatus] = useState('Assigned');
  const [courseFilter, setCourseFilter] = useState('All');
  const [assignedToFilter, setAssignedToFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, member-asc, member-desc
  const [courses, setCourses] = useState([]);
  const [leads, setLeads] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [histLead, setHistLead] = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkAssignTo, setBulkAssignTo] = useState('');
  const [todayAssignments, setTodayAssignments] = useState(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [distributeSelectedMembers, setDistributeSelectedMembers] = useState([]);
  const [showDistributeModal, setShowDistributeModal] = useState(false);

  const canAssign = user?.role === 'DigitalMarketing';

  const load = async () => {
    try {
      // For "Unassigned", fetch "Assigned" status and filter client-side
      const statusToFetch = status === 'Unassigned' ? 'Assigned' : status;
      const calls = [
        status === 'All Leads' ? api.listLeads() : api.listLeads(statusToFetch),
        api.listCourses()
      ];
      if (canAssign) {
        calls.push(api.listAdmissionUsers());
        calls.push(api.getTodayAssignments());
      }
      const results = await Promise.all(calls);

      const leadsResp = results[0];
      const coursesResp = results[1];
      const admissionsResp = canAssign ? results[2] : { users: [] };
      const todayResp = canAssign ? results[3] : null;

      let fetchedLeads = leadsResp?.leads || [];
      
      // If status is "Unassigned", filter for leads without assignedTo
      if (status === 'Unassigned') {
        fetchedLeads = fetchedLeads.filter(lead => !lead.assignedTo);
      }
      
      setLeads(fetchedLeads);
      setCourses(coursesResp?.courses || []);
      setAdmissions(admissionsResp?.users || []);
      setSelectedLeads([]);
      
      if (todayResp) {
        setTodayAssignments(todayResp.grouped || {});
        setTodayTotal(todayResp.total || 0);
      }
      
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, [status]); // eslint-disable-line

  const assign = async (id, assignedTo) => {
    setMsg(null); setErr(null);
    try {
      await api.assignLead(id, assignedTo);
      setMsg('Lead assigned');
      load();
    } catch (e) { setErr(e.message); }
  };

  const editLead = (lead) => {
    // Store the lead to edit in sessionStorage so LeadEntry can access it
    sessionStorage.setItem('editLead', JSON.stringify(lead));
    window.location.href = '/lead-entry?edit=' + lead._id;
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }
    setMsg(null); setErr(null);
    try {
      await api.deleteLead(id);
      setMsg('Lead deleted successfully');
      load();
    } catch (e) { setErr(e.message); }
  };

  const distributeEquallyBulk = async () => {
    if (selectedLeads.length === 0 || distributeSelectedMembers.length === 0) {
      alert('Please select leads and at least one member');
      return;
    }

    setMsg(null); setErr(null);
    setBulkAssigning(true);
    try {
      // Calculate how many leads per member
      const leadsPerMember = Math.floor(selectedLeads.length / distributeSelectedMembers.length);
      const remainder = selectedLeads.length % distributeSelectedMembers.length;

      let leadIndex = 0;
      let assignmentPromises = [];

      for (let i = 0; i < distributeSelectedMembers.length; i++) {
        const memberId = distributeSelectedMembers[i];
        // First members get the base amount + 1 if there's a remainder
        const leadsForThisMember = leadsPerMember + (i < remainder ? 1 : 0);
        const leadsToAssign = selectedLeads.slice(leadIndex, leadIndex + leadsForThisMember);
        
        if (leadsToAssign.length > 0) {
          assignmentPromises.push(
            api.bulkAssignLeads(leadsToAssign, memberId)
          );
        }
        leadIndex += leadsForThisMember;
      }

      await Promise.all(assignmentPromises);
      
      setMsg(`✓ Successfully distributed ${selectedLeads.length} leads among ${distributeSelectedMembers.length} members equally${remainder > 0 ? ` (${remainder} remainder lead(s))` : ''}`);
      setDistributeSelectedMembers([]);
      setSelectedLeads([]);
      setShowDistributeModal(false);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBulkAssigning(false);
    }
  };

  const bulkAssign = async () => {
    if (selectedLeads.length === 0 || !bulkAssignTo) return;
    setMsg(null); setErr(null);
    setBulkAssigning(true);
    try {
      const res = await api.bulkAssignLeads(selectedLeads, bulkAssignTo);
      setMsg(res.message || `${selectedLeads.length} lead(s) assigned`);
      setBulkAssignTo('');
      load();
    } catch (e) { 
      setErr(e.message); 
    } finally {
      setBulkAssigning(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l._id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = leads;
    
    // Apply course filter
    if (courseFilter !== 'All') {
      filtered = filtered.filter(l => l.interestedCourse === courseFilter);
    }
    
    // Apply assigned to filter
    if (assignedToFilter !== 'All') {
      if (assignedToFilter === 'Unassigned') {
        filtered = filtered.filter(l => !l.assignedTo);
      } else {
        filtered = filtered.filter(l => l.assignedTo?._id === assignedToFilter);
      }
    }
    
    // Sort leads
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === 'date-asc') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortBy === 'member-asc') {
        const nameA = a.assignedTo?.name || 'Unassigned';
        const nameB = b.assignedTo?.name || 'Unassigned';
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'member-desc') {
        const nameA = a.assignedTo?.name || 'Unassigned';
        const nameB = b.assignedTo?.name || 'Unassigned';
        return nameB.localeCompare(nameA);
      }
      return 0;
    });
    
    return sorted;
  }, [leads, courseFilter, assignedToFilter, sortBy]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Leads Center</h1>
        <div className="flex items-center gap-3">
          {/* Sort By */}
          <select 
            value={sortBy} 
            onChange={e=>setSortBy(e.target.value)} 
            className="border rounded-xl px-3 py-2"
          >
            <option value="date-desc">📅 Newest First</option>
            <option value="date-asc">📅 Oldest First</option>
            <option value="member-asc">👤 Member (A-Z)</option>
            <option value="member-desc">👤 Member (Z-A)</option>
          </select>

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

          {/* Course Filter */}
          <select 
            value={courseFilter} 
            onChange={e=>setCourseFilter(e.target.value)} 
            className="border rounded-xl px-3 py-2"
          >
            <option value="All">📚 All Courses</option>
            {courses.map(c => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            value={status} 
            onChange={e=>setStatus(e.target.value)} 
            className="border rounded-xl px-3 py-2"
          >
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

      {msg && <div className="mb-2 p-3 bg-green-100 text-green-700 rounded-xl">{msg}</div>}
      {err && <div className="mb-2 p-3 bg-red-100 text-red-600 rounded-xl">{err}</div>}

      {/* Today's Assignments Summary - Only for DM */}
      {canAssign && todayAssignments && Object.keys(todayAssignments).length > 0 && (
        <div className="mb-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-5 shadow-lg border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📊 Today's Lead Assignments
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-md">
              <div className="text-xs font-medium opacity-90">Total Assigned</div>
              <div className="text-3xl font-bold">{todayTotal}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(todayAssignments).map(([memberName, courses]) => {
              const memberTotal = Object.values(courses).reduce((sum, count) => sum + count, 0);
              return (
                <div key={memberName} className="bg-white rounded-xl p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {memberName.charAt(0).toUpperCase()}
                      </span>
                      {memberName}
                    </h4>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">
                      {memberTotal}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(courses).map(([courseName, count]) => (
                      <div key={courseName} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-700 font-medium">{courseName}</span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold text-xs">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Assign Bar */}
      {canAssign && selectedLeads.length > 0 && (
        <div className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-medium text-blue-900">{selectedLeads.length} lead(s) selected</span>
            <select 
              value={bulkAssignTo} 
              onChange={e=>setBulkAssignTo(e.target.value)} 
              className="border rounded-xl px-3 py-2"
            >
              <option value="">Select Admission Member</option>
              {admissions.map(a => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
            <button 
              onClick={bulkAssign}
              disabled={bulkAssigning || !bulkAssignTo}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {bulkAssigning ? 'Assigning...' : 'Assign to One'}
            </button>
            <button 
              onClick={() => setShowDistributeModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium"
              title="Distribute leads equally among selected members"
            >
              📊 Distribute Equally
            </button>
            <button 
              onClick={() => setSelectedLeads([])}
              className="px-3 py-2 text-royal hover:text-red-600"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Distribute Equally Modal */}
      {showDistributeModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowDistributeModal(false)} />
          <div className="bg-white rounded-2xl p-6 z-10 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold text-navy mb-4">📊 Distribute {selectedLeads.length} Leads Equally</h3>
            <p className="text-gray-600 mb-4">Select admission members to distribute leads equally among them</p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {admissions.map(member => (
                <label key={member._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={distributeSelectedMembers.includes(member._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDistributeSelectedMembers([...distributeSelectedMembers, member._id]);
                      } else {
                        setDistributeSelectedMembers(distributeSelectedMembers.filter(id => id !== member._id));
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.email}</div>
                  </div>
                </label>
              ))}
            </div>

            {distributeSelectedMembers.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="text-sm text-blue-900 font-medium">
                  Distribution plan:
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {Math.floor(selectedLeads.length / distributeSelectedMembers.length)} leads per member
                  {selectedLeads.length % distributeSelectedMembers.length > 0 && (
                    ` + ${selectedLeads.length % distributeSelectedMembers.length} remainder`
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => setShowDistributeModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={distributeEquallyBulk}
                disabled={distributeSelectedMembers.length === 0 || bulkAssigning}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {bulkAssigning ? 'Distributing...' : 'Confirm Distribution'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              {canAssign && (
                <th className="p-3">
                  <input 
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              <th className="text-left p-3">Lead ID</th>
              <th className="text-left p-3">Added Date</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Phone / Email</th>
              <th className="text-left p-3">Interested Course</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Lead Status</th>
              <th className="text-left p-3">Assigned To</th>
              {(user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Admission' || user?.role === 'DigitalMarketing') && <th className="text-left p-3">History</th>}
              {canAssign && <th className="text-left p-3">Action</th>}
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(l => (
              <tr key={l._id} className="border-t hover:bg-gray-50">
                {canAssign && (
                  <td className="p-3">
                    <input 
                      type="checkbox"
                      checked={selectedLeads.includes(l._id)}
                      onChange={() => toggleSelect(l._id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                )}
                <td className="p-3">{l.leadId}</td>
                <td className="p-3">
                  <div className="text-sm">
                    {new Date(l.createdAt).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </div>
                  <div className="text-xs text-royal/70">
                    {new Date(l.createdAt).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </td>
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
                {(user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Admission' || user?.role === 'DigitalMarketing') && (
                  <td className="p-3">
                    <button disabled={histLoading} onClick={async ()=>{
                      try {
                        setErr(null);
                        setHistLoading(true);
                        const res = await api.getLeadHistory(l._id);
                        setHistLead(res.lead || res);
                        setShowHistory(true);
                      } catch (e) { setErr(e.message); }
                      finally { setHistLoading(false); }
                    }} className="px-3 py-1 rounded-xl border hover:bg-[#f3f6ff]">{histLoading ? 'Loading…' : 'History'}</button>
                  </td>
                )}
                {canAssign && (
                  <td className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Edit/Delete buttons - always show for DM's leads */}
                      <button
                        onClick={() => editLead(l)}
                        className="px-2 py-1 text-sm rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                        title="Edit lead"
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => deleteLead(l._id)}
                        className="px-2 py-1 text-sm rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition"
                        title="Delete lead"
                      >
                        🗑 Delete
                      </button>
                      {/* Assign dropdown - show only if not already assigned */}
                      {!l.assignedTo ? (
                        <AssignDropdown
                          current={''}
                          options={admissions}
                          onChange={(val) => assign(l._id, val)}
                        />
                      ) : (
                        <span className="text-sm px-2 py-1 rounded-lg bg-green-50 text-green-700 font-medium whitespace-nowrap">
                          ✓ Assigned to {l.assignedTo?.name}
                        </span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr><td className="p-4 text-royal/70 text-center" colSpan={canAssign ? 11 : 9}>
                {leads.length === 0 ? 'No leads' : 'No leads match the selected filters'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {showHistory && histLead && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setShowHistory(false)} />
          <div className="bg-white rounded-xl p-4 z-10 w-full max-w-2xl shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Lead History — {histLead.leadId}</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start gap-2">
                <span className="text-royal/70 min-w-[140px]">Created At:</span>
                <strong>{histLead.createdAt ? new Date(histLead.createdAt).toLocaleString('en-GB', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : '-'}</strong>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-royal/70 min-w-[140px]">Assigned At:</span>
                <strong>{histLead.assignedAt ? new Date(histLead.assignedAt).toLocaleString('en-GB', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : <span className="text-royal/50">Not yet assigned</span>}</strong>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-royal/70 min-w-[140px]">Counseling At:</span>
                <strong>{histLead.counselingAt ? new Date(histLead.counselingAt).toLocaleString('en-GB', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : <span className="text-royal/50">Not yet in counseling</span>}</strong>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-royal/70 min-w-[140px]">Admitted At:</span>
                <strong>{histLead.admittedAt ? new Date(histLead.admittedAt).toLocaleString('en-GB', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : <span className="text-royal/50">Not yet admitted</span>}</strong>
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
                          {new Date(f.at).toLocaleString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
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

function AssignDropdown({ current, options, onChange }) {
  const [val, setVal] = useState(current || '');
  useEffect(() => setVal(current || ''), [current]);
  return (
    <div className="flex items-center gap-2">
      <select className="border rounded-xl px-3 py-2" value={val} onChange={e=>setVal(e.target.value)}>
        <option value="">Select Admission Member</option>
        {options.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
      </select>
      <button disabled={!val} onClick={()=>onChange(val)} className="px-3 py-1 rounded-lg border hover:bg-[#f3f6ff]">Assign</button>
    </div>
  );
}
