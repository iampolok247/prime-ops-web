import React, { useEffect, useState } from 'react';
import { api, fmtBDTEn, fmtDate } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Plus, DollarSign, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, CreditCard, Trash2, User, Phone, BookOpen, XCircle } from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Rocket', 'Card', 'Other'];

export default function ManualDuePage() {
  const { user } = useAuth();
  
  const [dues, setDues] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, paidAmount: 0, dueAmount: 0, pendingCount: 0, pendingApprovals: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    studentName: '',
    studentPhone: '',
    studentEmail: '',
    leadId: '',
    courseName: '',
    batchName: '',
    totalAmount: '',
    description: '',
    dueDate: ''
  });
  
  const [collectModal, setCollectModal] = useState({ 
    open: false, 
    dueId: null, 
    maxAmount: 0,
    amount: '', 
    method: 'Cash', 
    note: '' 
  });

  const loadSummary = async () => {
    try {
      const data = await api.getManualDueSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error loading summary:', err);
    }
  };

  const loadDues = async () => {
    try {
      setLoading(true);
      const data = await api.listManualDues(statusFilter);
      setDues(data.dues || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadDues();
  }, [statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createManualDue({
        studentName: form.studentName,
        studentPhone: form.studentPhone,
        studentEmail: form.studentEmail,
        leadId: form.leadId,
        courseName: form.courseName,
        batchName: form.batchName,
        totalAmount: Number(form.totalAmount),
        description: form.description,
        dueDate: form.dueDate || null
      });
      setForm({ studentName: '', studentPhone: '', studentEmail: '', leadId: '', courseName: '', batchName: '', totalAmount: '', description: '', dueDate: '' });
      setShowForm(false);
      loadDues();
      loadSummary();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleCollect = async () => {
    try {
      await api.collectManualDuePayment(
        collectModal.dueId,
        Number(collectModal.amount),
        collectModal.method,
        collectModal.note
      );
      setCollectModal({ open: false, dueId: null, maxAmount: 0, amount: '', method: 'Cash', note: '' });
      loadDues();
      loadSummary();
      alert('Payment submitted for approval!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this due?')) return;
    try {
      await api.deleteManualDue(id);
      loadDues();
      loadSummary();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-red-100 text-red-800 border-red-200',
      Partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Paid: 'bg-green-100 text-green-800 border-green-200'
    };
    const icons = {
      Pending: <AlertCircle className="w-3 h-3" />,
      Partial: <Clock className="w-3 h-3" />,
      Paid: <CheckCircle className="w-3 h-3" />
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-orange-100 text-orange-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Manual Due Entry
          </h1>
          <p className="text-gray-600 mt-1">Add old dues and collect payments (approval required)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-medium shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Due Entry
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-white/80 font-medium text-sm">Total Due</span>
          </div>
          <h2 className="text-2xl font-bold">{fmtBDTEn(summary.totalAmount)}</h2>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="text-white/80 font-medium text-sm">Collected</span>
          </div>
          <h2 className="text-2xl font-bold">{fmtBDTEn(summary.paidAmount)}</h2>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-white/80 font-medium text-sm">Remaining</span>
          </div>
          <h2 className="text-2xl font-bold">{fmtBDTEn(summary.dueAmount)}</h2>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-white/80 font-medium text-sm">Pending Entries</span>
          </div>
          <h2 className="text-2xl font-bold">{summary.pendingCount}</h2>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-white/80 font-medium text-sm">Pending Approvals</span>
          </div>
          <h2 className="text-2xl font-bold">{summary.pendingApprovals}</h2>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Due Entry</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                <input
                  type="text"
                  value={form.studentName}
                  onChange={e => setForm({ ...form, studentName: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="text"
                  value={form.studentPhone}
                  onChange={e => setForm({ ...form, studentPhone: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.studentEmail}
                  onChange={e => setForm({ ...form, studentEmail: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="student@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead ID</label>
                <input
                  type="text"
                  value={form.leadId}
                  onChange={e => setForm({ ...form, leadId: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="LEAD-2025-XXX-XXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
                <input
                  type="text"
                  value={form.courseName}
                  onChange={e => setForm({ ...form, courseName: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Course name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                <input
                  type="text"
                  value={form.batchName}
                  onChange={e => setForm({ ...form, batchName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Batch number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Due Amount (BDT) *</label>
                <input
                  type="number"
                  value={form.totalAmount}
                  onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                  required
                  min="1"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Why this due exists, any additional info..."
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium"
              >
                Add Due Entry
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['all', 'Pending', 'Partial', 'Paid'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Dues List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : dues.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-lg text-center">
          <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">No Due Entries Found</h3>
          <p className="text-gray-500">Click "Add Due Entry" to create a new manual due entry.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dues.map(due => (
            <div key={due._id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header Row */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === due._id ? null : due._id)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-800">{due.studentName}</h3>
                      {getStatusBadge(due.status)}
                      {due.leadId && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{due.leadId}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {due.studentPhone}</span>
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {due.courseName}</span>
                      {due.batchName && <span>Batch: {due.batchName}</span>}
                      {due.dueDate && <span className="text-orange-600">Due: {fmtDate(due.dueDate)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total: {fmtBDTEn(due.totalAmount)}</p>
                      <p className="text-sm text-green-600">Paid: {fmtBDTEn(due.paidAmount)}</p>
                      <p className="text-sm font-bold text-red-600">Due: {fmtBDTEn(due.dueAmount)}</p>
                    </div>
                    {expandedId === due._id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === due._id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  {due.description && (
                    <p className="text-sm text-gray-600 mb-4"><strong>Note:</strong> {due.description}</p>
                  )}
                  {due.studentEmail && (
                    <p className="text-sm text-gray-600 mb-4"><strong>Email:</strong> {due.studentEmail}</p>
                  )}

                  {/* Payment History */}
                  {due.payments && due.payments.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment History</h4>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Amount</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Method</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Collected By</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Approved By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {due.payments.map((payment, idx) => (
                              <tr key={idx} className="border-t border-gray-100">
                                <td className="px-3 py-2 text-sm text-gray-600">{fmtDate(payment.collectedAt)}</td>
                                <td className="px-3 py-2 text-sm font-medium text-green-600">{fmtBDTEn(payment.amount)}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{payment.method}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{payment.collectedBy?.name || '-'}</td>
                                <td className="px-3 py-2">{getPaymentStatusBadge(payment.status)}</td>
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {payment.approvedBy?.name || '-'}
                                  {payment.status === 'Rejected' && payment.rejectionNote && (
                                    <span className="block text-xs text-red-600">({payment.rejectionNote})</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {due.status !== 'Paid' && (
                      <button
                        onClick={() => setCollectModal({ 
                          open: true, 
                          dueId: due._id, 
                          maxAmount: due.dueAmount,
                          amount: '', 
                          method: 'Cash', 
                          note: '' 
                        })}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium flex items-center gap-1"
                      >
                        <CreditCard className="w-4 h-4" /> Collect Payment
                      </button>
                    )}
                    {due.paidAmount === 0 && (
                      <button
                        onClick={() => handleDelete(due._id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Collect Payment Modal */}
      {collectModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Collect Payment</h3>
            <p className="text-sm text-orange-600 mb-4">
              ⚠️ This payment will need Accountant approval before being marked as collected.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (Max: {fmtBDTEn(collectModal.maxAmount)})
                </label>
                <input
                  type="number"
                  value={collectModal.amount}
                  onChange={e => setCollectModal({ ...collectModal, amount: e.target.value })}
                  max={collectModal.maxAmount}
                  min="1"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={collectModal.method}
                  onChange={e => setCollectModal({ ...collectModal, method: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={collectModal.note}
                  onChange={e => setCollectModal({ ...collectModal, note: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  placeholder="Payment note"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setCollectModal({ open: false, dueId: null, maxAmount: 0, amount: '', method: 'Cash', note: '' })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCollect}
                disabled={!collectModal.amount || Number(collectModal.amount) <= 0}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:opacity-50"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
