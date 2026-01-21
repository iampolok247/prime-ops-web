// web/src/pages/AdmissionPipeline.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LeadHistoryModal from '../components/LeadHistoryModal.jsx';

function fmtDT(d){ if (!d) return '-'; try { return new Date(d).toLocaleString(); } catch { return d; } }

const STATUS_TABS = [
  { key: 'Assigned', path: '/admission/assigned', label: 'Assigned Lead' },
  { key: 'Counseling', path: '/admission/counseling', label: 'Counseling' },
  { key: 'In Follow Up', path: '/admission/follow-up', label: 'In Follow-Up' },
  { key: 'Admitted', path: '/admission/admitted', label: 'Admitted' },
  { key: 'Not Interested', path: '/admission/not-interested', label: 'Not Interested' }
];

export default function AdmissionPipeline() {
  const { user } = useAuth();
  const loc = useLocation();
  const [counts, setCounts] = useState({});

  const active = useMemo(() => {
    const found = STATUS_TABS.find(t => t.path === loc.pathname);
    return found ? found.key : 'Assigned';
  }, [loc.pathname]);

  // Load counts on mount
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const { counts } = await api.getAdmissionLeadCounts();
        setCounts(counts || {});
      } catch (e) {
        console.error('Failed to load counts:', e);
      }
    };
    loadCounts();
  }, []);

  if (user?.role !== 'Admission' && user?.role !== 'Admin' && user?.role !== 'SuperAdmin' && user?.role !== 'ITAdmin') {
    return <div className="text-royal">Access denied</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-3">Admission Pipeline</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map(t => (
          <Link key={t.key} to={t.path}
            className={`px-3 py-1.5 rounded-xl border ${active===t.key ? 'bg-gold text-navy border-gold' : 'hover:bg-[#f3f6ff]'}`}>
            {t.label}
            {counts[t.key] !== undefined && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${active===t.key ? 'bg-navy text-white' : 'bg-gold text-navy'}`}>
                {counts[t.key]}
              </span>
            )}
          </Link>
        ))}
        {active === 'Admitted' && user?.role === 'Admission' && (
          <Link to="/admission/fees" className="ml-auto px-3 py-1.5 rounded-xl bg-gold text-navy font-semibold">Admission Fees</Link>
        )}
      </div>
      <PipelineTable status={active} canAct={user?.role === 'Admission' || user?.role === 'ITAdmin' || user?.role === 'Admin' || user?.role === 'SuperAdmin'} user={user} />
    </div>
  );
}

function PipelineTable({ status, canAct, user }) {
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followNote, setFollowNote] = useState('');
  const [followTarget, setFollowTarget] = useState(null);
  const [followNextDate, setFollowNextDate] = useState('');
  const [followPriority, setFollowPriority] = useState('Interested');
  const [showNotInterestedModal, setShowNotInterestedModal] = useState(false);
  const [notInterestedNote, setNotInterestedNote] = useState('');
  const [notInterestedTarget, setNotInterestedTarget] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [histLead, setHistLead] = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  
  // Course and Batch selection for admission
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitTarget, setAdmitTarget] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [feeStatus, setFeeStatus] = useState(null);
  const [checkingFeeStatus, setCheckingFeeStatus] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [currentLeadForFee, setCurrentLeadForFee] = useState(null);
  const [feeForm, setFeeForm] = useState({
    leadId: '', courseName:'', totalAmount:'', nowPaying:'', method:'Bkash',
    paymentDate: new Date().toISOString().slice(0,10), nextPaymentDate:'', note:''
  });
  const [feeMsg, setFeeMsg] = useState(null);
  const [feeErr, setFeeErr] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  
  // Filter states
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [followUpDateFilter, setFollowUpDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'nextday', 'bydate'
  const [followUpCustomDate, setFollowUpCustomDate] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [availableCourses, setAvailableCourses] = useState([]);

  const load = async () => {
    try {
      const { leads } = await api.listAdmissionLeads(status);
      setRows(leads || []);
      // Extract unique courses from leads
      const coursesSet = new Set(leads?.filter(l => l.interestedCourse).map(l => l.interestedCourse) || []);
      setAvailableCourses(Array.from(coursesSet).sort());
      setErr(null);
    } catch (e) { setErr(e.message); }
  };

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const [coursesData, batchesData] = await Promise.all([
        api.listCourses(),
        api.listBatches('Active') // Load only active batches
      ]);
      setCourses(coursesData?.courses || []);
      setBatches(batchesData?.batches || []);
    } catch (e) {
      console.error('Failed to load courses/batches:', e);
      setErr('Failed to load courses/batches: ' + e.message);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]); // eslint-disable-line

  // Direct API call for Not Interested with authentication
  const handleNotInterested = async (leadId, reason) => {
    setMsg(null); 
    setErr(null);
    try {
      console.log('NOT INTERESTED - Starting...');
      console.log('NOT INTERESTED - Lead ID:', leadId);
      console.log('NOT INTERESTED - Reason:', reason);
      
      const result = await api.updateLeadStatus(leadId, 'Not Interested', reason || '', '', '', '');
      console.log('NOT INTERESTED - API Success, result:', result);
      
      setShowNotInterestedModal(false);
      setNotInterestedNote('');
      setNotInterestedTarget(null);
      setMsg('Lead marked as Not Interested');
      
      console.log('NOT INTERESTED - Reloading data...');
      await load();
      console.log('NOT INTERESTED - Complete!');
    } catch (error) {
      console.error('NOT INTERESTED - FATAL ERROR:', error);
      console.error('NOT INTERESTED - Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response
      });
      setErr(error?.message || 'Unknown error');
      alert('Failed to mark as Not Interested: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleConfirmAdmission = async (leadId, courseId, batchId) => {
    setMsg(null); 
    setErr(null);
    try {
      console.log('CONFIRM ADMISSION - Starting...');
      console.log('CONFIRM ADMISSION - Lead ID:', leadId);
      console.log('CONFIRM ADMISSION - Course ID:', courseId);
      console.log('CONFIRM ADMISSION - Batch ID:', batchId);
      
      const result = await api.updateLeadStatus(leadId, 'Admitted', '', courseId, batchId, '');
      console.log('CONFIRM ADMISSION - API Success, result:', result);
      
      setShowAdmitModal(false);
      setAdmitTarget(null);
      setSelectedCourse('');
      setSelectedBatch('');
      setFeeStatus(null);
      setMsg('Lead admitted successfully');
      
      console.log('CONFIRM ADMISSION - Reloading data...');
      await load();
      console.log('CONFIRM ADMISSION - Complete!');
    } catch (error) {
      console.error('CONFIRM ADMISSION - FATAL ERROR:', error);
      console.error('CONFIRM ADMISSION - Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response
      });
      setErr(error?.message || 'Unknown error');
      alert('Failed to admit student: ' + (error?.message || 'Unknown error'));
    }
  };

  const act = async (id, action, notes = '', courseId = '', batchId = '', nextFollowUpDate = '') => {
    setMsg(null); setErr(null);
    try {
      await api.updateLeadStatus(id, action, notes, courseId, batchId, nextFollowUpDate);
      setMsg(`Status updated to ${action}`);
      setShowFollowModal(false);
      setFollowNote(''); setFollowTarget(null); setFollowNextDate('');
      setShowNotInterestedModal(false); setNotInterestedNote(''); setNotInterestedTarget(null);
      setShowAdmitModal(false); setAdmitTarget(null); setSelectedCourse(''); setSelectedBatch('');
      setShowHistory(false); setHistLead(null); setHistLoading(false);
      load();
    } catch (e) { 
      setErr(e.message);
      throw e; // Re-throw so the caller can handle it
    }
  };
  
  const handleAdmitClick = (rowId) => {
    setAdmitTarget(rowId);
    setSelectedCourse('');
    setSelectedBatch('');
    setFeeStatus(null);
    setShowAdmitModal(true);
    loadCourses();
    checkFeeStatus(rowId);
  };

  const checkFeeStatus = async (leadId) => {
    setCheckingFeeStatus(true);
    try {
      const result = await api.checkAdmissionFeeStatus(leadId);
      setFeeStatus(result);
    } catch (e) {
      console.error('Failed to check fee status:', e);
      setFeeStatus({ hasApprovedFee: false, message: e.message });
    } finally {
      setCheckingFeeStatus(false);
    }
  };

  const openFeesModal = (lead) => {
    setCurrentLeadForFee(lead);
    setFeeForm({
      leadId: lead._id,
      courseName: lead.interestedCourse || '',
      totalAmount: '',
      nowPaying: '',
      method: 'Bkash',
      paymentDate: new Date().toISOString().slice(0,10),
      nextPaymentDate: '',
      note: ''
    });
    setFeeMsg(null);
    setFeeErr(null);
    setShowFeesModal(true);
  };

  const submitFee = async (e) => {
    e.preventDefault();
    setFeeMsg(null);
    setFeeErr(null);
    setFeeLoading(true);
    try {
      const totalAmt = Number(feeForm.totalAmount) || 0;
      const nowPay = Number(feeForm.nowPaying) || 0;
      const payload = {
        ...feeForm,
        amount: nowPay,
        totalAmount: totalAmt,
        dueAmount: totalAmt - nowPay
      };
      await api.createAdmissionFee(payload);
      setFeeMsg('Fee submitted for review');
      setTimeout(() => {
        setShowFeesModal(false);
        setCurrentLeadForFee(null);
        setFeeForm({ leadId:'', courseName:'', totalAmount:'', nowPaying:'', method:'Bkash', paymentDate:new Date().toISOString().slice(0,10), nextPaymentDate:'', note:'' });
        setFeeMsg(null);
      }, 1500);
    } catch (e) { 
      setFeeErr(e.message); 
    } finally {
      setFeeLoading(false);
    }
  };

  // Filter rows based on search term, course, and follow-up dates
  const filteredRows = useMemo(() => {
    let filtered = rows;
    
    // Search term filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        row.leadId?.toLowerCase().includes(search) ||
        row.name?.toLowerCase().includes(search) ||
        row.phone?.includes(search) ||
        row.email?.toLowerCase().includes(search) ||
        row.interestedCourse?.toLowerCase().includes(search) ||
        row.assignedTo?.name?.toLowerCase().includes(search)
      );
    }
    
    // Course filter
    if (selectedCourseFilter) {
      filtered = filtered.filter(row => row.interestedCourse === selectedCourseFilter);
    }
    
    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(row => row.priority === priorityFilter);
    }
    
    // Follow-up date filter (only for 'In Follow Up' status)
    if (status === 'In Follow Up' && followUpDateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(row => {
        if (!row.nextFollowUpDate) return false;
        const nextDate = new Date(row.nextFollowUpDate);
        nextDate.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const nextDay = new Date(today);
        nextDay.setDate(nextDay.getDate() + 1);
        
        if (followUpDateFilter === 'today') return nextDate.getTime() === today.getTime();
        if (followUpDateFilter === 'yesterday') return nextDate.getTime() === yesterday.getTime();
        if (followUpDateFilter === 'nextday') return nextDate.getTime() === nextDay.getTime();
        if (followUpDateFilter === 'bydate' && followUpCustomDate) {
          const customDate = new Date(followUpCustomDate);
          customDate.setHours(0, 0, 0, 0);
          return nextDate.getTime() === customDate.getTime();
        }
        return false;
      });
    }
    
    return filtered;
  }, [rows, searchTerm, selectedCourseFilter, priorityFilter, status, followUpDateFilter, followUpCustomDate]);

  const actions = (row) => {
    if (!canAct) return null;
    if (status === 'Assigned') {
      return <ActionBtn onClick={()=>act(row._id,'Counseling')}>Start Counseling</ActionBtn>;
    }
    if (status === 'Counseling') {
      return (
        <div className="flex gap-2">
          <ActionBtn onClick={()=>handleAdmitClick(row._id)}>Admitted</ActionBtn>
          <ActionBtn onClick={()=>{ setFollowTarget(row._id); setFollowNote(''); setFollowNextDate(''); setFollowPriority(row.priority || 'Interested'); setShowFollowModal(true); }}>Follow-Up</ActionBtn>
          <ActionBtn variant="danger" onClick={()=>{ setNotInterestedTarget(row._id); setNotInterestedNote(''); setShowNotInterestedModal(true); }}>Not Interested</ActionBtn>
          <ActionBtn onClick={async ()=>{
            try {
              setErr(null);
              setHistLoading(true);
              const res = await api.getLeadHistory(row._id);
              setHistLead(res.lead || res);
              setShowHistory(true);
            } catch (e) { setErr(e.message); }
            finally { setHistLoading(false); }
          }}>{histLoading ? 'Loading…' : 'History'}</ActionBtn>
        </div>
      );
    }
    if (status === 'In Follow Up') {
        return (
          <div className="flex gap-2">
            <ActionBtn onClick={()=>handleAdmitClick(row._id)}>Admitted</ActionBtn>
            <ActionBtn onClick={()=>{ setFollowTarget(row._id); setFollowNote(''); setFollowNextDate(''); setFollowPriority(row.priority || 'Interested'); setShowFollowModal(true); }}>Follow-Up Again</ActionBtn>
            <ActionBtn variant="danger" onClick={()=>{ setNotInterestedTarget(row._id); setNotInterestedNote(''); setShowNotInterestedModal(true); }}>Not Interested</ActionBtn>
            <ActionBtn onClick={async ()=>{
              try {
                setErr(null);
                setHistLoading(true);
                const res = await api.getLeadHistory(row._id);
                setHistLead(res.lead || res);
                setShowHistory(true);
              } catch (e) { setErr(e.message); }
              finally { setHistLoading(false); }
            }}>{histLoading ? 'Loading…' : 'History'}</ActionBtn>
          </div>
        );
    }
    if (status === 'Admitted') {
      return (
        <ActionBtn onClick={async ()=>{
          try {
            setErr(null);
            setHistLoading(true);
            const res = await api.getLeadHistory(row._id);
            setHistLead(res.lead || res);
            setShowHistory(true);
          } catch (e) { setErr(e.message); }
          finally { setHistLoading(false); }
        }}>{histLoading ? 'Loading…' : 'History'}</ActionBtn>
      );
    }
    if (status === 'Not Interested') {
      return (
        <ActionBtn onClick={async ()=>{
          try {
            setErr(null);
            setHistLoading(true);
            const res = await api.getLeadHistory(row._id);
            setHistLead(res.lead || res);
            setShowHistory(true);
          } catch (e) { setErr(e.message); }
          finally { setHistLoading(false); }
        }}>{histLoading ? 'Loading…' : 'History'}</ActionBtn>
      );
    }
    return <span className="text-royal/60">—</span>;
  };

  return (
    <div>
      {msg && <div className="mb-2 text-green-700">{msg}</div>}
      {err && <div className="mb-2 text-red-600">{err}</div>}
      
      {/* Filters Section */}
      <div className="mb-4 bg-white rounded-xl shadow-soft p-4 flex flex-wrap gap-3 items-center">
        {/* Course Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Course:</label>
          <select 
            value={selectedCourseFilter}
            onChange={e => setSelectedCourseFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Courses</option>
            {availableCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </div>

        {/* Priority Filter (only for In Follow Up status) */}
        {status === 'In Follow Up' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Priority:</label>
            <select 
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All Priorities</option>
              <option value="Very Interested">Very Interested</option>
              <option value="Interested">Interested</option>
              <option value="Few Interested">Few Interested</option>
              <option value="Not Interested">Not Interested</option>
            </select>
          </div>
        )}

        {/* Follow-Up Date Filter (only for In Follow Up status) */}
        {status === 'In Follow Up' && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Follow-up Date:</label>
              <select 
                value={followUpDateFilter}
                onChange={e => {
                  setFollowUpDateFilter(e.target.value);
                  if (e.target.value !== 'bydate') setFollowUpCustomDate('');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="nextday">Next Day</option>
                <option value="bydate">By Date</option>
              </select>
            </div>
            
            {followUpDateFilter === 'bydate' && (
              <div className="flex items-center gap-2">
                <input 
                  type="date"
                  value={followUpCustomDate}
                  onChange={e => setFollowUpCustomDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}
          </>
        )}
        
        {/* Reset Filters Button */}
        {(selectedCourseFilter || priorityFilter !== 'all' || followUpDateFilter !== 'all' || followUpCustomDate) && (
          <button 
            onClick={() => {
              setSelectedCourseFilter('');
              setPriorityFilter('all');
              setFollowUpDateFilter('all');
              setFollowUpCustomDate('');
            }}
            className="ml-auto px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>
      
      {/* Search Bar */}
      <div className="mb-4 bg-white rounded-xl shadow-soft p-4">
        <div className="relative">
          <input 
            type="text"
            placeholder="🔍 Search by Lead ID, Name, Phone, Email, Course, or Assigned Member..."
            className="w-full border border-blue-300 rounded-lg px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-gray-600 mt-2">
            📋 Showing {filteredRows.length} of {rows.length} lead(s)
          </p>
        )}
      </div>

      {showAdmitModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setShowAdmitModal(false)} />
          <div className="bg-white rounded-xl p-6 z-10 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold text-navy mb-4">Admit Student</h3>
            
            {/* Fee Status Check */}
            {checkingFeeStatus ? (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <div className="inline-block animate-spin">⏳</div>
                  <p className="text-sm text-blue-700 ml-2">Checking admission fees...</p>
                </div>
              </div>
            ) : !feeStatus?.hasApprovedFee ? (
              <div className="mb-4 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">❌</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-red-800 mb-1">Admission Fees Not Collected or Not Approved</h4>
                    <p className="text-sm text-red-700 mb-3">Please collect and get approval for admission fees before marking student as admitted.</p>
                    <button 
                      type="button"
                      onClick={() => {
                        setShowAdmitModal(false);
                        const leadForFee = rows.find(r => r._id === admitTarget);
                        if (leadForFee) openFeesModal(leadForFee);
                      }}
                      className="inline-block px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                    >
                      � Collect Admission Fees
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-green-800">Admission Fees Approved</h4>
                    <p className="text-sm text-green-700">You can proceed with admission.</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCourse}
                  onChange={e=>setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  disabled={coursesLoading || !feeStatus?.hasApprovedFee}
                  required
                >
                  <option value="">{coursesLoading ? 'Loading...' : 'Select a course'}</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.courseId})</option>
                  ))}
                </select>
                {courses.length === 0 && !coursesLoading && (
                  <p className="text-xs text-red-600 mt-1">No courses available</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBatch}
                  onChange={e=>setSelectedBatch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  disabled={coursesLoading || !feeStatus?.hasApprovedFee}
                  required
                >
                  <option value="">{coursesLoading ? 'Loading...' : 'Select a batch'}</option>
                  {batches.map(b => (
                    <option key={b._id} value={b._id}>
                      {b.batchName} - {b.category} ({b.admittedStudents?.length || 0}/{b.targetedStudent})
                    </option>
                  ))}
                </select>
                {batches.length === 0 && !coursesLoading && (
                  <p className="text-xs text-red-600 mt-1">No active batches available. Contact admin to create a batch.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button 
                type="button" 
                onClick={()=>{ setShowAdmitModal(false); setAdmitTarget(null); setSelectedCourse(''); setSelectedBatch(''); setFeeStatus(null); }} 
                className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={async ()=>{
                  if (!admitTarget || !selectedCourse || !selectedBatch) {
                    alert('Please select both course and batch');
                    return;
                  }
                  await handleConfirmAdmission(admitTarget, selectedCourse, selectedBatch);
                }}
                className="px-4 py-2 rounded-xl bg-gold text-navy font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedCourse || !selectedBatch || coursesLoading || !feeStatus?.hasApprovedFee}
              >
                Confirm Admission
              </button>
            </div>
          </div>
        </div>
      )}
      {showFeesModal && currentLeadForFee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={submitFee} className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-lg transform transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#053867]">Collect Admission Fees</h3>
                <p className="text-xs text-gray-500 mt-1">Student: <span className="font-semibold">{currentLeadForFee.name}</span> ({currentLeadForFee.leadId})</p>
              </div>
              <button type="button" onClick={()=>{ setShowFeesModal(false); setCurrentLeadForFee(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {feeMsg && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">✅ {feeMsg}</div>}
            {feeErr && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">❌ {feeErr}</div>}

            <div className="space-y-3">
              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Lead ID</span>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" 
                    value={currentLeadForFee.leadId} disabled/>
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Student Name</span>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" 
                    value={currentLeadForFee.name} disabled/>
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Course Name *</span>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" 
                    required
                    value={feeForm.courseName} 
                    onChange={e=>setFeeForm(f=>({...f,courseName:e.target.value}))}
                  >
                    <option value="">Select Course...</option>
                    {courses.map(c => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block">
                    <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Total Amount *</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">৳</span>
                      <input type="number" className="w-full border border-green-300 rounded-lg pl-7 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-400 bg-green-50" 
                        required placeholder="0" min="0"
                        value={feeForm.totalAmount || ''} onChange={e=>setFeeForm(f=>({...f,totalAmount:e.target.value}))}/>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block">
                    <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Now Paying *</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">৳</span>
                      <input type="number" className="w-full border border-orange-300 rounded-lg pl-7 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50" 
                        required placeholder="0" min="0"
                        value={feeForm.nowPaying || ''} onChange={e=>setFeeForm(f=>({...f,nowPaying:e.target.value}))}/>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block">
                    <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Payment Method *</span>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" 
                      value={feeForm.method} onChange={e=>setFeeForm(f=>({...f,method:e.target.value}))}>
                      <option>Bkash</option>
                      <option>Nagad</option>
                      <option>Rocket</option>
                      <option>Bank Transfer</option>
                      <option>Cash on Hand</option>
                    </select>
                  </label>
                </div>

                <div>
                  <label className="block">
                    <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Payment Date *</span>
                    <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" 
                      required
                      value={feeForm.paymentDate} onChange={e=>setFeeForm(f=>({...f,paymentDate:e.target.value}))}/>
                  </label>
                </div>
              </div>

              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Next Payment Date (Optional)</span>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" 
                    value={feeForm.nextPaymentDate || ''} onChange={e=>setFeeForm(f=>({...f,nextPaymentDate:e.target.value}))}/>
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Additional Note</span>
                  <textarea rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    placeholder="Add any additional information..."
                    value={feeForm.note || ''} onChange={e=>setFeeForm(f=>({...f,note:e.target.value}))}/>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
              <button type="button" onClick={()=>{ setShowFeesModal(false); setCurrentLeadForFee(null); }} 
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors" disabled={feeLoading}>
                Cancel
              </button>
              <button type="submit" disabled={feeLoading}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#F7BA23] to-[#f5a623] text-[#053867] text-sm font-bold hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {feeLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Fee
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      {showFollowModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setShowFollowModal(false)} />
          <div className="bg-white rounded-xl p-4 z-10 w-full max-w-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Add Follow-Up Note</h3>
            <textarea rows={4} className="w-full border rounded-xl px-3 py-2 mb-3" value={followNote} onChange={e=>setFollowNote(e.target.value)} placeholder="Enter follow-up note (optional)" />
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Follow-Up Date
                </label>
                <input
                  type="date"
                  value={followNextDate}
                  onChange={e => setFollowNextDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={followPriority}
                  onChange={e => setFollowPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                >
                  <option value="Very Interested">Very Interested</option>
                  <option value="Interested">Interested</option>
                  <option value="Few Interested">Few Interested</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>{ setShowFollowModal(false); setFollowNote(''); setFollowTarget(null); setFollowNextDate(''); setFollowPriority('Interested'); }} className="px-3 py-2 rounded-xl border">Cancel</button>
              <button type="button" onClick={async ()=>{
                try {
                  setErr(null);
                  await api.addLeadFollowUp(followTarget, { note: followNote, nextFollowUpDate: followNextDate, priority: followPriority });
                  setMsg('Follow-up added successfully');
                  setShowFollowModal(false);
                  setFollowNote('');
                  setFollowTarget(null);
                  setFollowNextDate('');
                  setFollowPriority('Interested');
                  load();
                } catch (e) {
                  setErr(e.message);
                }
              }} className="px-3 py-2 rounded-xl bg-gold text-navy">Save Follow-Up</button>
            </div>
          </div>
        </div>
      )}
      {showHistory && histLead && (
        <LeadHistoryModal 
          lead={histLead} 
          onClose={() => { setShowHistory(false); setHistLead(null); load(); }} 
        />
      )}
      
      {showNotInterestedModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setShowNotInterestedModal(false)} />
          <div className="bg-white rounded-xl p-4 z-10 w-full max-w-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Reason for Not Interested</h3>
            <textarea 
              rows={6} 
              className="w-full border rounded-xl px-3 py-2 mb-3" 
              value={notInterestedNote} 
              onChange={e=>setNotInterestedNote(e.target.value)} 
              placeholder="Enter reason (optional)"
            />
            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={()=>{ setShowNotInterestedModal(false); setNotInterestedNote(''); setNotInterestedTarget(null); }} 
                className="px-3 py-2 rounded-xl border"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={async ()=>{
                  if (!notInterestedTarget) {
                    alert('No lead selected');
                    return;
                  }
                  await handleNotInterested(notInterestedTarget, notInterestedNote);
                }} 
                className="px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="p-3 text-left">Lead ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone / Email</th>
              <th className="p-3 text-center">WhatsApp</th>
              <th className="p-3 text-left">Course</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Special Filter</th>
          <th className="p-3 text-left">Assigned To</th>
          {status === 'Assigned' && <th className="p-3 text-left">Assigned At</th>}
          {status === 'Counseling' && <th className="p-3 text-left">Counseling At</th>}
          {status === 'In Follow Up' && <th className="p-3 text-left">Follow-Ups</th>}
          {status === 'In Follow Up' && <th className="p-3 text-left">Priority</th>}
          {status === 'In Follow Up' && <th className="p-3 text-left">Next Follow-Up Date</th>}
          {status === 'Admitted' && <th className="p-3 text-left">Admitted At</th>}
            <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(r => (
              <tr key={r._id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div>{r.leadId}</div>
                    {((r.followUps||[]).length > 0) && (
                      <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{(r.followUps||[]).length} FU</div>
                    )}
                  </div>
                </td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">
                  <div>{r.phone}</div>
                  <div className="text-xs text-royal/70">{r.email || '-'}</div>
                </td>
                <td className="p-3 text-center">
                  {r.phone && (
                    <a 
                      href={`https://wa.me/${r.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                      title={`WhatsApp ${r.phone}`}
                    >
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </a>
                  )}
                </td>
                <td className="p-3">{r.interestedCourse || '-'}</td>
                <td className="p-3">{r.source}</td>
                <td className="p-3 text-sm text-gray-600">{r.specialFilter || '-'}</td>
                <td className="p-3">{r.assignedTo ? r.assignedTo.name : '-'}</td>
                {status === 'Assigned' && <td className="p-3">{fmtDT(r.assignedAt || r.updatedAt)}</td>}
                {status === 'Counseling' && <td className="p-3">{fmtDT(r.counselingAt || r.updatedAt)}</td>}
                {status === 'In Follow Up' && <td className="p-3">
                  {((r.followUps||[]).length === 0) ? <div className="text-royal/70">No follow-ups</div> : (
                    <div className="flex flex-col gap-1">
                      {(r.followUps||[]).map((f,idx)=> (
                        <div key={idx} className="text-xs">
                          <div className="font-medium">{fmtDT(f.at)}</div>
                          <div className="text-royal/70">{f.note || '-'} {f.by?.name ? ` — ${f.by.name}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>}
                {status === 'In Follow Up' && <td className="p-3">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-lg inline-block ${
                    r.priority === 'Very Interested' ? 'text-green-800 bg-green-100' :
                    r.priority === 'Interested' ? 'text-blue-800 bg-blue-100' :
                    r.priority === 'Few Interested' ? 'text-yellow-800 bg-yellow-100' :
                    r.priority === 'Not Interested' ? 'text-red-800 bg-red-100' :
                    'text-gray-800 bg-gray-100'
                  }`}>
                    {r.priority || 'Interested'}
                  </div>
                </td>}
                {status === 'In Follow Up' && <td className="p-3">
                  {!r.nextFollowUpDate ? (
                    <div className="text-royal/70 text-xs">-</div>
                  ) : (
                    <div className={`text-sm font-semibold px-2 py-1 rounded-lg ${
                      (() => {
                        if (!r.nextFollowUpDate) return 'text-gray-600 bg-gray-50';
                        const nextDate = new Date(r.nextFollowUpDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        nextDate.setHours(0, 0, 0, 0);
                        if (nextDate.getTime() < today.getTime()) return 'text-red-700 bg-red-50';
                        if (nextDate.getTime() === today.getTime()) return 'text-orange-700 bg-orange-50';
                        return 'text-green-700 bg-green-50';
                      })()
                    }`}>
                      {new Date(r.nextFollowUpDate).toLocaleDateString()}
                    </div>
                  )}
                </td>}
                {status === 'Admitted' && <td className="p-3">{fmtDT(r.admittedAt || r.updatedAt)}</td>}
                <td className="p-3">{actions(r)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="p-4 text-royal/70" colSpan={status === 'In Follow Up' ? '10' : '8'}>No leads</td></tr>
            )}
            {rows.length > 0 && filteredRows.length === 0 && (
              <tr><td className="p-4 text-royal/70 text-center" colSpan={status === 'In Follow Up' ? '10' : '8'}>
                No leads found matching your filters
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, variant = 'default' }) {
  const cls =
    variant === 'danger'
      ? 'px-3 py-1 rounded-lg border text-red-700 hover:bg-red-50'
      : 'px-3 py-1 rounded-lg border hover:bg-[#f3f6ff]';
  return <button onClick={onClick} className={cls}>{children}</button>;
}
