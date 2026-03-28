import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckCircle, XCircle, Clock, Calendar, User, FileText, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function LeaveApprovalPage() {
  const { user } = useAuth();
  
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  
  const [rejectModal, setRejectModal] = useState({
    open: false,
    id: null,
    note: ''
  });

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await api.getPrimaryPendingLeaveApplications();
      setApplications(data.applications || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this leave application?')) return;
    
    try {
      setProcessing(id);
      await api.primaryApproveLeaveApplication(id, '');
      loadApplications();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.note.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      setProcessing(rejectModal.id);
      await api.primaryRejectLeaveApplication(rejectModal.id, rejectModal.note);
      setRejectModal({ open: false, id: null, note: '' });
      loadApplications();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const getLeaveTypeBadge = (type) => {
    const colors = {
      'Sick Leave': 'bg-red-100 text-red-800',
      'Casual Leave': 'bg-blue-100 text-blue-800',
      'Annual Leave': 'bg-green-100 text-green-800',
      'Emergency Leave': 'bg-orange-100 text-orange-800',
      'Unpaid Leave': 'bg-gray-100 text-gray-800',
      'Other': 'bg-purple-100 text-purple-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  const getHandoverStatusBadge = (status) => {
    if (!status) return null;
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Accepted: 'bg-green-100 text-green-800',
      Denied: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
        Handover: {status}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Leave Application Approval
        </h1>
        <p className="text-gray-600 mt-1">Review and provide primary approval for leave applications</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Two-Tier Approval Process</h3>
            <p className="text-sm text-blue-700 mt-1">
              After your primary approval, the application will be sent to Admin for final approval.
              If you reject, the application will be directly rejected.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 shadow-lg text-white mb-6 max-w-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-white/80 font-medium">Pending Approval</span>
        </div>
        <h2 className="text-3xl font-bold">{applications.length}</h2>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-lg text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">All Caught Up!</h3>
          <p className="text-gray-500">No pending leave applications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <div key={app._id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header Row */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === app._id ? null : app._id)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{app.employee?.name}</h3>
                      {getLeaveTypeBadge(app.leaveType)}
                      {getHandoverStatusBadge(app.handoverStatus)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {app.employee?.role}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {fmtDate(app.startDate)} - {fmtDate(app.endDate)}
                      </span>
                      <span className="font-medium text-blue-600">{app.totalDays} days</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedId === app._id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === app._id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Reason for Leave</h4>
                    <p className="text-gray-600 bg-white p-3 rounded-lg border border-gray-200">{app.reason}</p>
                  </div>

                  {app.handoverTo && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Responsibility Handover</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">To: <strong>{app.handoverTo?.name}</strong></span>
                        {getHandoverStatusBadge(app.handoverStatus)}
                      </div>
                      {app.handoverNote && (
                        <p className="text-sm text-gray-500 mt-1">Note: {app.handoverNote}</p>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-4">
                    Applied on: {fmtDate(app.createdAt)}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(app._id)}
                      disabled={processing === app._id}
                      className="px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve (Send to Admin)
                    </button>
                    <button
                      onClick={() => setRejectModal({ open: true, id: app._id, note: '' })}
                      disabled={processing === app._id}
                      className="px-5 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
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
              <h3 className="text-lg font-bold">Reject Leave Application</h3>
            </div>
            <p className="text-gray-600 mb-4">
              This will directly reject the leave application. The employee will be notified.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
              <textarea
                value={rejectModal.note}
                onChange={e => setRejectModal({ ...rejectModal, note: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
                placeholder="Please provide a reason for rejection"
                rows={3}
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModal({ open: false, id: null, note: '' })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectModal.note.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
