// web/src/pages/AdmissionFees.jsx
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdmissionFees() {
  const { user } = useAuth();
  if (user?.role !== 'Admission' && user?.role !== 'Admin' && user?.role !== 'SuperAdmin' && user?.role !== 'Accountant' && user?.role !== 'Coordinator' && user?.role !== 'ITAdmin') {
    return <div className="text-royal">Access denied</div>;
  }

  const [fees, setFees] = useState([]);
  const [assignedLeads, setAssignedLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({
    leadId: '', 
    courses: [{ courseName:'', totalAmount:'', nowPaying:'' }], // Array of courses
    method:'Bkash',
    paymentDate: new Date().toISOString().slice(0,10), 
    nextPaymentDate:'', 
    note:''
  });

  const canSubmit = user?.role === 'Admission';

  const load = async () => {
    try {
      const [{ fees }, leadsResp, coursesResp] = await Promise.all([
        api.listAdmissionFees(),
        api.listAdmissionLeads(), // Get all assigned leads (will be filtered by backend)
        api.listCourses() // Load courses for dropdown
      ]);
      setFees(fees || []);
      setCourses(coursesResp?.courses || []);
      // Filter out "Admitted" and "Not Admitted" leads - only show leads that can still be processed
      const eligibleLeads = (leadsResp?.leads || []).filter(
        lead => lead.status !== 'Admitted' && lead.status !== 'Not Admitted'
      );
      setAssignedLeads(eligibleLeads);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault(); setMsg(null); setErr(null);
    try {
      // Submit each course fee separately
      const submissions = form.courses.map(course => {
        const totalAmt = Number(course.totalAmount) || 0;
        const nowPay = Number(course.nowPaying) || 0;
        return {
          leadId: form.leadId,
          courseName: course.courseName,
          amount: nowPay,
          totalAmount: totalAmt,
          dueAmount: totalAmt - nowPay,
          method: form.method,
          paymentDate: form.paymentDate,
          nextPaymentDate: form.nextPaymentDate,
          note: form.note
        };
      });

      // Submit all fees
      await Promise.all(submissions.map(payload => api.createAdmissionFee(payload)));
      
      setMsg(`${submissions.length} fee(s) submitted for review`);
      setOpen(false);
      setForm({ 
        leadId:'', 
        courses: [{ courseName:'', totalAmount:'', nowPaying:'' }],
        method:'Bkash', 
        paymentDate:new Date().toISOString().slice(0,10), 
        nextPaymentDate:'', 
        note:'' 
      });
      setSearchTerm(''); // Reset search
      load();
    } catch (e) { setErr(e.message); }
  };

  const addCourse = () => {
    setForm(f => ({
      ...f,
      courses: [...f.courses, { courseName:'', totalAmount:'', nowPaying:'' }]
    }));
  };

  const removeCourse = (index) => {
    if (form.courses.length === 1) return; // Keep at least one
    setForm(f => ({
      ...f,
      courses: f.courses.filter((_, i) => i !== index)
    }));
  };

  const updateCourse = (index, field, value) => {
    setForm(f => ({
      ...f,
      courses: f.courses.map((c, i) => i === index ? {...c, [field]: value} : c)
    }));
  };

  // Filter leads based on search term
  const filteredLeads = React.useMemo(() => {
    if (!searchTerm.trim()) return assignedLeads;
    const search = searchTerm.toLowerCase();
    return assignedLeads.filter(lead => 
      lead.leadId?.toLowerCase().includes(search) ||
      lead.name?.toLowerCase().includes(search) ||
      lead.phone?.includes(search) ||
      lead.email?.toLowerCase().includes(search)
    );
  }, [assignedLeads, searchTerm]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Admission Fees Collection</h1>
        {canSubmit && <button onClick={()=>setOpen(true)} className="bg-gold text-navy rounded-xl px-4 py-2 font-semibold">Collect Admission Fees</button>}
      </div>

      {msg && <div className="mb-2 text-green-700">{msg}</div>}
      {err && <div className="mb-2 text-red-600">{err}</div>}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="p-3 text-left">Lead</th>
              <th className="p-3 text-left">Course</th>
              <th className="p-3 text-left">Total Amount</th>
              <th className="p-3 text-left">Paid</th>
              <th className="p-3 text-left">Due</th>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-left">Payment Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {fees.map(f => (
              <tr key={f._id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  {f.lead?.leadId} — {f.lead?.name}
                  <div className="text-xs text-royal/70">{f.lead?.phone} {f.lead?.email ? `• ${f.lead.email}` : ''}</div>
                </td>
                <td className="p-3">{f.courseName}</td>
                <td className="p-3 font-semibold">৳ {f.totalAmount || 0}</td>
                <td className="p-3 text-green-600 font-semibold">৳ {f.amount || 0}</td>
                <td className="p-3 text-orange-600 font-semibold">৳ {f.dueAmount || 0}</td>
                <td className="p-3">{f.method}</td>
                <td className="p-3">{new Date(f.paymentDate).toLocaleDateString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    f.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    f.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {f.status}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button 
                    onClick={() => { setSelectedFee(f); setDetailsOpen(true); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {fees.length === 0 && (
              <tr><td className="p-4 text-royal/70" colSpan="9">No fees yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

            {open && canSubmit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-lg transform transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#053867]">Collect Admission Fees</h3>
                <p className="text-xs text-gray-500 mt-1">Fill in the payment details</p>
              </div>
              <button type="button" onClick={()=>setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-[#053867] mb-1.5 block flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Select Student (Your Assigned Leads - Not Admitted) *
                  </span>
                  
                  {/* Search Input */}
                  <div className="relative mb-2">
                    <input 
                      type="text"
                      placeholder="🔍 Search by Lead ID, Name, Phone, or Email..."
                      className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Dropdown */}
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white max-h-48" 
                    required
                    size="5"
                    value={form.leadId} 
                    onChange={e=>setForm(f=>({...f,leadId:e.target.value}))}
                  >
                    <option value="">Choose student...</option>
                    {filteredLeads.length === 0 && searchTerm && (
                      <option value="" disabled>No leads found matching "{searchTerm}"</option>
                    )}
                    {filteredLeads.length === 0 && !searchTerm && (
                      <option value="" disabled>No eligible leads assigned to you</option>
                    )}
                    {filteredLeads.map(l => (
                      <option key={l._id} value={l._id}>
                        {l.leadId} — {l.name} ({l.phone}) — Status: {l.status}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    📋 Showing {filteredLeads.length} of {assignedLeads.length} eligible lead(s)
                  </p>
                </label>
              </div>

              {/* Courses Section - Multiple Courses Support */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#053867]">📚 Course(s) & Payment Details</h4>
                  <button
                    type="button"
                    onClick={addCourse}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Another Course
                  </button>
                </div>

                {form.courses.map((course, index) => (
                  <div key={index} className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">Course #{index + 1}</span>
                      {form.courses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCourse(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block">
                          <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Course Name *</span>
                          <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" 
                            required
                            value={course.courseName} 
                            onChange={e => updateCourse(index, 'courseName', e.target.value)}
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
                              <input 
                                type="number" 
                                className="w-full border border-green-300 rounded-lg pl-7 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-400 bg-green-50" 
                                required 
                                placeholder="0" 
                                min="0"
                                value={course.totalAmount || ''} 
                                onChange={e => updateCourse(index, 'totalAmount', e.target.value)}
                              />
                            </div>
                          </label>
                        </div>

                        <div>
                          <label className="block">
                            <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Now Paying *</span>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">৳</span>
                              <input 
                                type="number" 
                                className="w-full border border-orange-300 rounded-lg pl-7 pr-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50" 
                                required 
                                placeholder="0" 
                                min="0"
                                value={course.nowPaying || ''} 
                                onChange={e => updateCourse(index, 'nowPaying', e.target.value)}
                              />
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block">
                    <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Payment Method *</span>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" 
                      value={form.method} onChange={e=>setForm(f=({...f,method:e.target.value}))}>
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
                      value={form.paymentDate} onChange={e=>setForm(f=({...f,paymentDate:e.target.value}))}/>
                  </label>
                </div>
              </div>

              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Next Payment Date (Optional)</span>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" 
                    value={form.nextPaymentDate || ''} onChange={e=>setForm(f=>({...f,nextPaymentDate:e.target.value}))}/>
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-[#053867] mb-1.5 block">Additional Note</span>
                  <textarea rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    placeholder="Add any additional information..."
                    value={form.note || ''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
              <button type="button" onClick={()=>setOpen(false)} 
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#F7BA23] to-[#f5a623] text-[#053867] text-sm font-bold hover:shadow-lg transition-all flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details Modal */}
      {detailsOpen && selectedFee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-5">
              <div>
                <h3 className="text-xl font-bold text-[#053867]">Fee Collection Details</h3>
                <p className="text-xs text-gray-500 mt-1">Complete information about this payment</p>
              </div>
              <button type="button" onClick={()=>{setDetailsOpen(false); setSelectedFee(null);}} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Student Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-[#053867] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Student Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Lead ID:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.lead?.leadId}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.lead?.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.lead?.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.lead?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Course & Payment Information */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-[#053867] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Payment Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Course:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.courseName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment Method:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.method}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <p className="font-bold text-lg text-[#053867]">৳ {selectedFee.totalAmount || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount Paid:</span>
                    <p className="font-bold text-lg text-green-600">৳ {selectedFee.amount || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Amount:</span>
                    <p className="font-bold text-lg text-orange-600">৳ {selectedFee.dueAmount || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedFee.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        selectedFee.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedFee.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-[#053867] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Important Dates
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Payment Date:</span>
                    <p className="font-semibold text-[#053867]">{new Date(selectedFee.paymentDate).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Next Payment Date:</span>
                    <p className="font-semibold text-[#053867]">
                      {selectedFee.nextPaymentDate ? new Date(selectedFee.nextPaymentDate).toLocaleDateString('en-GB') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted At:</span>
                    <p className="font-semibold text-[#053867]">{new Date(selectedFee.createdAt).toLocaleString('en-GB')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Updated:</span>
                    <p className="font-semibold text-[#053867]">{new Date(selectedFee.updatedAt).toLocaleString('en-GB')}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedFee.note && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-[#053867] mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Additional Notes
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedFee.note}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
              <button 
                onClick={()=>{setDetailsOpen(false); setSelectedFee(null);}}
                className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
