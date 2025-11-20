import React, { useState, useEffect } from 'react';
import { api, fmtBDTEn } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckCircle, XCircle, Clock, Eye, User, Calendar, DollarSign, CreditCard } from 'lucide-react';

export default function DueCollectionApproval() {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isAccountant = user?.role === 'Accountant';
  const canApprove = isAccountant;

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.getDueCollections(filter);
      setCollections(res.dueCollections || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]); // eslint-disable-line

  const handleApprove = async (id) => {
    setActionLoading(true);
    setErr(null);
    setMsg(null);
    try {
      await api.approveDueCollection(id, reviewNote);
      setMsg('Due collection approved successfully!');
      setShowDetailModal(false);
      setReviewNote('');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!reviewNote.trim()) {
      setErr('Please provide a reason for rejection');
      return;
    }
    setActionLoading(true);
    setErr(null);
    setMsg(null);
    try {
      await api.rejectDueCollection(id, reviewNote);
      setMsg('Due collection rejected');
      setShowDetailModal(false);
      setReviewNote('');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailModal = (collection) => {
    setSelectedCollection(collection);
    setReviewNote(collection.reviewNote || '');
    setShowDetailModal(true);
    setErr(null);
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status) => {
    if (status === 'Approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-semibold">
          <CheckCircle className="w-3 h-3" /> Approved
        </span>
      );
    }
    if (status === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-semibold">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Due Collection Approval</h1>
          <p className="text-royal/60 mt-1">Review and approve due fee collections from coordinators</p>
        </div>
      </div>

      {msg && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <p className="text-green-700 font-medium">{msg}</p>
        </div>
      )}

      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-700 font-medium">{err}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-soft p-2 inline-flex gap-2">
        {['Pending', 'Approved', 'Rejected', 'All'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status === 'All' ? '' : status)}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === (status === 'All' ? '' : status)
                ? 'bg-gradient-to-r from-gold to-yellow-500 text-navy shadow-md'
                : 'text-royal/60 hover:text-royal hover:bg-gray-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-royal/60">Loading...</div>
        ) : collections.length === 0 ? (
          <div className="p-8 text-center text-royal/60">No due collections found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#f3f6ff] text-royal">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold">Lead ID</th>
                  <th className="p-3 text-left text-sm font-semibold">Student Name</th>
                  <th className="p-3 text-left text-sm font-semibold">Amount</th>
                  <th className="p-3 text-left text-sm font-semibold">Payment Date</th>
                  <th className="p-3 text-left text-sm font-semibold">Coordinator</th>
                  <th className="p-3 text-left text-sm font-semibold">Status</th>
                  <th className="p-3 text-left text-sm font-semibold">Submitted</th>
                  <th className="p-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection, idx) => (
                  <tr 
                    key={collection._id} 
                    className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <td className="p-3 text-sm font-medium text-royal">
                      {collection.lead?.leadId || '—'}
                    </td>
                    <td className="p-3 text-sm text-royal">
                      {collection.lead?.name || '—'}
                    </td>
                    <td className="p-3 text-sm font-bold text-green-600">
                      {fmtBDTEn(collection.amount || 0)}
                    </td>
                    <td className="p-3 text-sm text-royal">
                      {fmtDate(collection.paymentDate)}
                    </td>
                    <td className="p-3 text-sm text-royal">
                      {collection.coordinator?.name || '—'}
                    </td>
                    <td className="p-3 text-sm">
                      {getStatusBadge(collection.status)}
                    </td>
                    <td className="p-3 text-sm text-royal/60">
                      {fmtDate(collection.submittedAt)}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openDetailModal(collection)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-royal/10 text-royal hover:bg-royal/20 transition-colors text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedCollection && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowDetailModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-navy to-royal p-6 text-white">
              <h3 className="text-2xl font-bold">Due Collection Details</h3>
              <p className="text-white/80 mt-1">Review and take action on this due collection</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-navy flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Student Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-royal/60">Lead ID:</span>
                    <p className="font-semibold text-royal">{selectedCollection.lead?.leadId || '—'}</p>
                  </div>
                  <div>
                    <span className="text-royal/60">Name:</span>
                    <p className="font-semibold text-royal">{selectedCollection.lead?.name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-royal/60">Phone:</span>
                    <p className="font-semibold text-royal">{selectedCollection.lead?.phone || '—'}</p>
                  </div>
                  <div>
                    <span className="text-royal/60">Email:</span>
                    <p className="font-semibold text-royal">{selectedCollection.lead?.email || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-green-50 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-navy flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-royal/60">Amount Collected:</span>
                    <p className="text-xl font-bold text-green-600">{fmtBDTEn(selectedCollection.amount || 0)}</p>
                  </div>
                  <div>
                    <span className="text-royal/60">Payment Method:</span>
                    <p className="font-semibold text-royal flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      {selectedCollection.paymentMethod || 'Cash'}
                    </p>
                  </div>
                  <div>
                    <span className="text-royal/60">Payment Date:</span>
                    <p className="font-semibold text-royal flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {fmtDate(selectedCollection.paymentDate)}
                    </p>
                  </div>
                  {selectedCollection.nextPaymentDate && (
                    <div>
                      <span className="text-royal/60">Next Payment Date:</span>
                      <p className="font-semibold text-royal flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {fmtDate(selectedCollection.nextPaymentDate)}
                      </p>
                    </div>
                  )}
                </div>
                {selectedCollection.note && (
                  <div className="pt-2 border-t border-green-200">
                    <span className="text-royal/60 text-sm">Coordinator Note:</span>
                    <p className="text-royal mt-1">{selectedCollection.note}</p>
                  </div>
                )}
              </div>

              {/* Coordinator Info */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <h4 className="font-semibold text-navy">Collected By</h4>
                <div className="text-sm">
                  <p className="font-semibold text-royal">{selectedCollection.coordinator?.name || '—'}</p>
                  <p className="text-royal/60">{selectedCollection.coordinator?.email || '—'}</p>
                  <p className="text-royal/60 text-xs mt-1">
                    Submitted: {fmtDate(selectedCollection.submittedAt)}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <span className="text-sm font-medium text-royal">Current Status:</span>
                {getStatusBadge(selectedCollection.status)}
              </div>

              {/* Review Section */}
              {selectedCollection.status === 'Pending' && canApprove && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Review Note (Optional for approval, required for rejection)
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                    placeholder="Add your review comments..."
                  />
                </div>
              )}

              {/* Reviewed Info (for Approved/Rejected) */}
              {selectedCollection.status !== 'Pending' && selectedCollection.reviewedBy && (
                <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold text-navy">Review Information</h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-royal/60">Reviewed By:</span>{' '}
                      <span className="font-semibold text-royal">{selectedCollection.reviewedBy?.name || '—'}</span>
                    </p>
                    <p>
                      <span className="text-royal/60">Reviewed At:</span>{' '}
                      <span className="font-semibold text-royal">{fmtDate(selectedCollection.reviewedAt)}</span>
                    </p>
                    {selectedCollection.reviewNote && (
                      <div className="pt-2 border-t border-purple-200">
                        <span className="text-royal/60">Review Note:</span>
                        <p className="text-royal mt-1">{selectedCollection.reviewNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-gray-50 p-6 flex justify-end gap-3 border-t">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors font-medium"
                disabled={actionLoading}
              >
                Close
              </button>
              {selectedCollection.status === 'Pending' && canApprove && (
                <>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedCollection._id)}
                    className="px-6 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedCollection._id)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-colors font-medium shadow-lg disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
