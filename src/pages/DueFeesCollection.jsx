import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Search, Eye, Calendar, Phone, Mail, DollarSign, AlertCircle } from 'lucide-react';

export default function DueFeesCollection() {
  const { user } = useAuth();
  
  if (user?.role !== 'Coordinator' && user?.role !== 'Admin' && user?.role !== 'SuperAdmin') {
    return <div className="text-royal">Access denied</div>;
  }

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [history, setHistory] = useState(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [collectDueOpen, setCollectDueOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const [followUpForm, setFollowUpForm] = useState({
    followUpType: 'Call',
    note: '',
    amountPromised: '',
    updatedNextPaymentDate: ''
  });

  const [collectDueForm, setCollectDueForm] = useState({
    collectingAmount: '',
    paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().slice(0, 10),
    nextPaymentDate: '',
    note: ''
  });

  const loadStudents = async () => {
    try {
      const { students: data } = await api.getStudentsWithDues();
      setStudents(data || []);
      setFilteredStudents(data || []);
      
      // Check if we need to auto-open a student's details after loading
      const openPaymentId = sessionStorage.getItem('openPaymentId');
      if (openPaymentId && data && data.length > 0) {
        const student = data.find(s => s._id === openPaymentId);
        if (student) {
          // Use setTimeout to ensure modal opens after render
          setTimeout(() => {
            openDetails(student);
          }, 100);
          // Clear the sessionStorage
          sessionStorage.removeItem('openPaymentId');
          sessionStorage.removeItem('openPaymentData');
        }
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStudents(students);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = students.filter(s => 
        s.lead?.leadId?.toLowerCase().includes(term) ||
        s.lead?.name?.toLowerCase().includes(term) ||
        s.lead?.phone?.includes(term) ||
        s.courseName?.toLowerCase().includes(term)
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, students]);

  const openDetails = async (student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
    try {
      const data = await api.getStudentHistory(student._id);
      setHistory(data);
    } catch (e) {
      setErr(e.message);
    }
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedStudent(null);
    setHistory(null);
    setFollowUpOpen(false);
    setCollectDueOpen(false);
    setFollowUpForm({ followUpType: 'Call', note: '', amountPromised: '', updatedNextPaymentDate: '' });
    setCollectDueForm({ collectingAmount: '', paymentMethod: 'Cash', paymentDate: new Date().toISOString().slice(0, 10), nextPaymentDate: '', note: '' });
  };

  const openCollectDue = (student) => {
    setSelectedStudent(student);
    setCollectDueOpen(true);
    setCollectDueForm({ collectingAmount: '', paymentMethod: 'Cash', paymentDate: new Date().toISOString().slice(0, 10), nextPaymentDate: '', note: '' });
  };

  const openFollowUp = (student) => {
    setSelectedStudent(student);
    setFollowUpOpen(true);
    setFollowUpForm({ followUpType: 'Call', note: '', amountPromised: '', updatedNextPaymentDate: '' });
  };

  const submitFollowUp = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (user?.role !== 'Coordinator') {
      setErr('Only Coordinators can add follow-ups');
      return;
    }

    try {
      await api.addFollowUp({
        admissionFeeId: selectedStudent._id,
        leadId: selectedStudent.lead._id,
        ...followUpForm,
        amountPromised: Number(followUpForm.amountPromised) || 0
      });
      setMsg('Follow-up added successfully');
      setFollowUpOpen(false);
      setFollowUpForm({ followUpType: 'Call', note: '', amountPromised: '', updatedNextPaymentDate: '' });
      setSelectedStudent(null);
      
      // Reload students list
      loadStudents();
    } catch (e) {
      setErr(e.message);
    }
  };

  const submitCollectDue = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (user?.role !== 'Coordinator') {
      setErr('Only Coordinators can collect payments');
      return;
    }

    const collectingAmount = Number(collectDueForm.collectingAmount) || 0;
    
    if (collectingAmount <= 0) {
      setErr('Collecting amount must be greater than 0');
      return;
    }

    if (collectingAmount > selectedStudent.dueAmount) {
      setErr(`Cannot collect more than due amount (৳${selectedStudent.dueAmount})`);
      return;
    }

    try {
      // Update the admission fee with new payment
      await api.updateAdmissionFeePayment({
        admissionFeeId: selectedStudent._id,
        additionalPayment: collectingAmount,
        paymentMethod: collectDueForm.paymentMethod,
        paymentDate: collectDueForm.paymentDate,
        nextPaymentDate: collectDueForm.nextPaymentDate,
        note: collectDueForm.note
      });

      setMsg(`Successfully submitted due collection of ৳${collectingAmount} for approval`);
      setCollectDueOpen(false);
      setCollectDueForm({ collectingAmount: '', paymentMethod: 'Cash', paymentDate: new Date().toISOString().slice(0, 10), nextPaymentDate: '', note: '' });
      setSelectedStudent(null);
      
      // Reload students list
      loadStudents();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const isOverdue = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy">Due Fees Collection</h1>
          <p className="text-gray-600 mt-1">Manage and follow up on pending student payments</p>
        </div>
      </div>

      {msg && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">{msg}</div>}
      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{err}</div>}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by Lead ID, Name, Phone, or Course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="p-3 text-left">Student</th>
              <th className="p-3 text-left">Course</th>
              <th className="p-3 text-left">Total Amount</th>
              <th className="p-3 text-left">Paid</th>
              <th className="p-3 text-left">Due</th>
              <th className="p-3 text-left">Next Payment</th>
              <th className="p-3 text-left">Admitted Date</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(s => (
              <tr key={s._id} className={`border-t hover:bg-gray-50 ${isOverdue(s.nextPaymentDate) ? 'bg-red-50' : ''}`}>
                <td className="p-3">
                  <div className="font-semibold text-navy">{s.lead?.leadId} — {s.lead?.name}</div>
                  <div className="text-xs text-gray-600 flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      {s.lead?.phone}
                    </span>
                    {s.lead?.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} />
                        {s.lead?.email}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">{s.courseName}</td>
                <td className="p-3 font-semibold">৳ {s.totalAmount || 0}</td>
                <td className="p-3 text-green-600 font-semibold">৳ {s.amount || 0}</td>
                <td className="p-3 text-orange-600 font-bold">৳ {s.dueAmount || 0}</td>
                <td className="p-3">
                  {s.nextPaymentDate ? (
                    <div>
                      <div className="font-medium">{new Date(s.nextPaymentDate).toLocaleDateString('en-GB')}</div>
                      {isOverdue(s.nextPaymentDate) && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium mt-1">
                          <AlertCircle size={12} />
                          Overdue
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">Not set</span>
                  )}
                </td>
                <td className="p-3">
                  {s.lead?.admittedAt ? new Date(s.lead.admittedAt).toLocaleDateString('en-GB') : 'N/A'}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openCollectDue(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                    >
                      <DollarSign size={14} />
                      Collect Due
                    </button>
                    <button
                      onClick={() => openFollowUp(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors"
                    >
                      <Phone size={14} />
                      Follow Up
                    </button>
                    <button
                      onClick={() => openDetails(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                    >
                      <Eye size={14} />
                      Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-gray-500">
                  {searchTerm ? 'No students found matching your search' : 'No students with due fees'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {detailsOpen && selectedStudent && history && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-navy">Student Payment Details</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedStudent.lead?.leadId} — {selectedStudent.lead?.name}</p>
                </div>
                <button onClick={closeDetails} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-bold text-navy mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Student Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Lead ID:</span> <span className="font-semibold">{selectedStudent.lead?.leadId}</span></div>
                    <div><span className="text-gray-600">Name:</span> <span className="font-semibold">{selectedStudent.lead?.name}</span></div>
                    <div><span className="text-gray-600">Phone:</span> <span className="font-semibold">{selectedStudent.lead?.phone}</span></div>
                    <div><span className="text-gray-600">Email:</span> <span className="font-semibold">{selectedStudent.lead?.email || 'N/A'}</span></div>
                    <div><span className="text-gray-600">Admitted:</span> <span className="font-semibold">{selectedStudent.lead?.admittedAt ? new Date(selectedStudent.lead.admittedAt).toLocaleDateString('en-GB') : 'N/A'}</span></div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h4 className="font-bold text-navy mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Payment Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Course:</span> <span className="font-semibold">{selectedStudent.courseName}</span></div>
                    <div><span className="text-gray-600">Total Amount:</span> <span className="font-bold text-lg">৳ {selectedStudent.totalAmount || 0}</span></div>
                    <div><span className="text-gray-600">Amount Paid:</span> <span className="font-bold text-lg text-green-600">৳ {selectedStudent.amount || 0}</span></div>
                    <div><span className="text-gray-600">Due Amount:</span> <span className="font-bold text-lg text-orange-600">৳ {selectedStudent.dueAmount || 0}</span></div>
                    <div><span className="text-gray-600">Payment Method:</span> <span className="font-semibold">{selectedStudent.method}</span></div>
                  </div>
                </div>
              </div>

              {/* Payment Dates */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h4 className="font-bold text-navy mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Important Dates
                </h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Payment Date:</span>
                    <p className="font-semibold">{new Date(selectedStudent.paymentDate).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Next Payment Date:</span>
                    <p className="font-semibold">
                      {selectedStudent.nextPaymentDate ? new Date(selectedStudent.nextPaymentDate).toLocaleDateString('en-GB') : 'Not set'}
                    </p>
                    {isOverdue(selectedStudent.nextPaymentDate) && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium mt-1">
                        <AlertCircle size={12} />
                        Overdue
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted:</span>
                    <p className="font-semibold">{new Date(selectedStudent.createdAt).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
              </div>

              {/* Follow-up History */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-navy flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Follow-up History ({history.followUps?.length || 0})
                  </h4>
                  {user?.role === 'Coordinator' && (
                    <button
                      onClick={() => setFollowUpOpen(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      Add Follow-up
                    </button>
                  )}
                </div>

                {history.followUps && history.followUps.length > 0 ? (
                  <div className="space-y-3">
                    {history.followUps.map((f) => (
                      <div key={f._id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-2">
                              {f.followUpType}
                            </span>
                            <span className="text-xs text-gray-600">
                              by {f.coordinator?.name} • {new Date(f.createdAt).toLocaleString('en-GB')}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{f.note}</p>
                        {(f.amountPromised > 0 || f.updatedNextPaymentDate) && (
                          <div className="flex gap-4 text-xs text-gray-600 mt-2 pt-2 border-t">
                            {f.amountPromised > 0 && (
                              <span>Amount Promised: ৳ {f.amountPromised}</span>
                            )}
                            {f.updatedNextPaymentDate && (
                              <span>Next Payment Updated: {new Date(f.updatedNextPaymentDate).toLocaleDateString('en-GB')}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No follow-ups yet</p>
                )}
              </div>

              {/* Add Follow-up Form */}
              {followUpOpen && user?.role === 'Coordinator' && (
                <div className="bg-white border-2 border-blue-300 rounded-xl p-5">
                  <h4 className="font-bold text-navy mb-4">Add New Follow-up</h4>
                  <form onSubmit={submitFollowUp} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-1.5">Follow-up Type *</label>
                      <select
                        value={followUpForm.followUpType}
                        onChange={(e) => setFollowUpForm(f => ({ ...f, followUpType: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option>Call</option>
                        <option>SMS</option>
                        <option>Email</option>
                        <option>Visit</option>
                        <option>WhatsApp</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-navy mb-1.5">Notes *</label>
                      <textarea
                        rows="3"
                        value={followUpForm.note}
                        onChange={(e) => setFollowUpForm(f => ({ ...f, note: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Enter follow-up details..."
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-navy mb-1.5">Amount Promised (Optional)</label>
                        <input
                          type="number"
                          value={followUpForm.amountPromised}
                          onChange={(e) => setFollowUpForm(f => ({ ...f, amountPromised: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-navy mb-1.5">Update Next Payment Date (Optional)</label>
                        <input
                          type="date"
                          value={followUpForm.updatedNextPaymentDate}
                          onChange={(e) => setFollowUpForm(f => ({ ...f, updatedNextPaymentDate: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFollowUpOpen(false);
                          setFollowUpForm({ followUpType: 'Call', note: '', amountPromised: '', updatedNextPaymentDate: '' });
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        Save Follow-up
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={closeDetails}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Due Modal */}
      {collectDueOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-navy">Collect Due Payment</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedStudent.lead?.leadId} — {selectedStudent.lead?.name}</p>
                </div>
                <button onClick={() => { setCollectDueOpen(false); setSelectedStudent(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={submitCollectDue} className="p-6 space-y-4">
              {/* Payment Summary */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-bold text-navy mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <p className="font-bold text-lg">৳ {selectedStudent.totalAmount || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Paid So Far:</span>
                    <p className="font-bold text-lg text-green-600">৳ {selectedStudent.amount || 0}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Due Amount:</span>
                    <p className="font-bold text-2xl text-orange-600">৳ {selectedStudent.dueAmount || 0}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Collecting Amount Now *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">৳</span>
                  <input
                    type="number"
                    value={collectDueForm.collectingAmount}
                    onChange={(e) => setCollectDueForm(f => ({ ...f, collectingAmount: e.target.value }))}
                    className="w-full border-2 border-green-300 rounded-lg pl-8 pr-3 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50"
                    placeholder="0"
                    min="1"
                    max={selectedStudent.dueAmount}
                    required
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">Maximum: ৳ {selectedStudent.dueAmount}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1.5">Payment Method *</label>
                  <select
                    value={collectDueForm.paymentMethod}
                    onChange={(e) => setCollectDueForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select payment method</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Mobile Banking (bKash)">Mobile Banking (bKash)</option>
                    <option value="Mobile Banking (Nagad)">Mobile Banking (Nagad)</option>
                    <option value="Mobile Banking (Rocket)">Mobile Banking (Rocket)</option>
                    <option value="Check">Check</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1.5">Payment Date *</label>
                  <input
                    type="date"
                    value={collectDueForm.paymentDate}
                    onChange={(e) => setCollectDueForm(f => ({ ...f, paymentDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Next Payment Date (Optional)</label>
                <input
                  type="date"
                  value={collectDueForm.nextPaymentDate}
                  onChange={(e) => setCollectDueForm(f => ({ ...f, nextPaymentDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedStudent.nextPaymentDate && (
                  <p className="text-xs text-gray-600 mt-1">
                    Current: {new Date(selectedStudent.nextPaymentDate).toLocaleDateString('en-GB')}
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-1">Set when customer will make next payment</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Note (Optional)</label>
                <textarea
                  rows="2"
                  value={collectDueForm.note}
                  onChange={(e) => setCollectDueForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add any notes about this collection..."
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setCollectDueOpen(false); setSelectedStudent(null); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign size={16} />
                  Collect Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow Up Modal */}
      {followUpOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-navy">Add Follow-up</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedStudent.lead?.leadId} — {selectedStudent.lead?.name}</p>
                </div>
                <button onClick={() => { setFollowUpOpen(false); setSelectedStudent(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={submitFollowUp} className="p-6 space-y-4">
              {/* Due Amount Display */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Due Amount:</span>
                  <span className="font-bold text-xl text-orange-600">৳ {selectedStudent.dueAmount || 0}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Follow-up Type *</label>
                <select
                  value={followUpForm.followUpType}
                  onChange={(e) => setFollowUpForm(f => ({ ...f, followUpType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option>Call</option>
                  <option>SMS</option>
                  <option>Email</option>
                  <option>Visit</option>
                  <option>WhatsApp</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Notes *</label>
                <textarea
                  rows="3"
                  value={followUpForm.note}
                  onChange={(e) => setFollowUpForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter follow-up details, conversation summary, student response..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Amount Promised (Optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                  <input
                    type="number"
                    value={followUpForm.amountPromised}
                    onChange={(e) => setFollowUpForm(f => ({ ...f, amountPromised: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Update Next Payment Date (Optional)</label>
                <input
                  type="date"
                  value={followUpForm.updatedNextPaymentDate}
                  onChange={(e) => setFollowUpForm(f => ({ ...f, updatedNextPaymentDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedStudent.nextPaymentDate && (
                  <p className="text-xs text-gray-600 mt-1">
                    Current: {new Date(selectedStudent.nextPaymentDate).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setFollowUpOpen(false); setSelectedStudent(null); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Phone size={16} />
                  Save Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
