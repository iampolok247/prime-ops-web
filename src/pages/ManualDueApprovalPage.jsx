import React, { useEffect, useState } from 'react';
import { api, fmtBDTEn, fmtDate } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckCircle, XCircle, Clock, DollarSign, User, Phone, BookOpen, AlertCircle } from 'lucide-react';

export default function ManualDueApprovalPage() {
  const { user } = useAuth();
  
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null); // Track which item is being processed
  
  const [rejectModal, setRejectModal] = useState({
    open: false,
    dueId: null,
    paymentIndex: null,
    note: ''
  });

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const data = await api.getManualDuePendingApprovals();
      setPendingPayments(data.pendingPayments || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const handleApprove = async (dueId, paymentIndex) => {
    if (!confirm('Are you sure you want to approve this payment?')) return;
    
    try {
      setProcessing(`${dueId}-${paymentIndex}`);
      await api.approveManualDuePayment(dueId, paymentIndex);
      loadPendingApprovals();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    try {
      setProcessing(`${rejectModal.dueId}-${rejectModal.paymentIndex}`);
      await api.rejectManualDuePayment(rejectModal.dueId, rejectModal.paymentIndex, rejectModal.note);
      setRejectModal({ open: false, dueId: null, paymentIndex: null, note: '' });
      loadPendingApprovals();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Manual Due Approvals
        </h1>
        <p className="text-gray-600 mt-1">Approve or reject collected payments from Coordinator</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 shadow-lg text-white mb-6 max-w-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-white/80 font-medium">Pending Approvals</span>
        </div>
        <h2 className="text-3xl font-bold">{pendingPayments.length}</h2>
      </div>

      {/* Pending Payments List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : pendingPayments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-lg text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">All Caught Up!</h3>
          <p className="text-gray-500">No pending payment approvals at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingPayments.map((item, index) => (
            <div key={`${item.dueId}-${item.paymentIndex}`} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-5">
                {/* Student Info */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{item.studentName}</h3>
                      {item.leadId && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{item.leadId}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.studentPhone}</span>
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {item.courseName}</span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-gray-500">Total Due: {fmtBDTEn(item.totalAmount)}</p>
                    <p className="text-gray-500">Remaining: {fmtBDTEn(item.dueAmount)}</p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Payment Amount</p>
                      <p className="text-2xl font-bold text-green-600">{fmtBDTEn(item.payment.amount)}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                        <span>Method: <strong>{item.payment.method}</strong></span>
                        <span>Date: <strong>{fmtDate(item.payment.collectedAt)}</strong></span>
                        <span>By: <strong>{item.payment.collectedBy?.name}</strong></span>
                      </div>
                      {item.payment.note && (
                        <p className="text-sm text-gray-600 mt-2">Note: {item.payment.note}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(item.dueId, item.paymentIndex)}
                        disabled={processing === `${item.dueId}-${item.paymentIndex}`}
                        className="px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectModal({
                          open: true,
                          dueId: item.dueId,
                          paymentIndex: item.paymentIndex,
                          note: ''
                        })}
                        disabled={processing === `${item.dueId}-${item.paymentIndex}`}
                        className="px-5 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Reject Payment</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reject this payment? Please provide a reason.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
              <textarea
                value={rejectModal.note}
                onChange={e => setRejectModal({ ...rejectModal, note: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
                placeholder="Why is this being rejected?"
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModal({ open: false, dueId: null, paymentIndex: null, note: '' })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
              >
                Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
