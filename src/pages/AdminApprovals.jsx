import React, { useState, useEffect } from 'react';
import { api, fmtBDTEn } from '../lib/api.js';
import { 
  Calendar, 
  PlaneTakeoff, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  FileText,
  Users,
  MessageSquare,
  Send,
  HelpCircle
} from 'lucide-react';

export default function AdminApprovals() {
  const [activeTab, setActiveTab] = useState('leave');
  const [leaveFilter, setLeaveFilter] = useState('Pending');
  const [tadaFilter, setTADAFilter] = useState('Pending');
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [tadaApplications, setTADAApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [actionType, setActionType] = useState(''); // 'approve', 'reject', or 'request_details'
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    loadLeaveApplications();
    loadTADAApplications();
  }, []);

  useEffect(() => {
    loadLeaveApplications();
  }, [leaveFilter]);

  useEffect(() => {
    loadTADAApplications();
  }, [tadaFilter]);

  const loadLeaveApplications = async () => {
    try {
      const resp = await api.getAllLeaveApplications(leaveFilter === 'All' ? '' : leaveFilter);
      setLeaveApplications(resp.applications || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadTADAApplications = async () => {
    try {
      const resp = await api.getAdminTADAApplications(tadaFilter === 'All' ? '' : tadaFilter);
      setTADAApplications(resp.applications || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleLeaveAction = async () => {
    setLoading(true); setErr(null); setMsg(null);
    try {
      if (actionType === 'approve') {
        await api.approveLeaveApplication(selectedApp._id, reviewNote);
        setMsg(`Leave application approved for ${selectedApp.employee.name}`);
      } else {
        await api.rejectLeaveApplication(selectedApp._id, reviewNote);
        setMsg(`Leave application rejected for ${selectedApp.employee.name}`);
      }
      setShowModal(false);
      setReviewNote('');
      loadLeaveApplications();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTADAAction = async () => {
    setLoading(true); setErr(null); setMsg(null);
    try {
      if (actionType === 'approve') {
        await api.approveTADAApplication(selectedApp._id, reviewNote);
        setMsg(`TA/DA application approved for ${selectedApp.employee.name}`);
      } else {
        await api.rejectTADAApplication(selectedApp._id, reviewNote);
        setMsg(`TA/DA application rejected for ${selectedApp.employee.name}`);
      }
      setShowModal(false);
      setReviewNote('');
      loadTADAApplications();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = (app, type) => {
    setSelectedApp(app);
    setActionType('approve');
    setShowModal(true);
  };

  const openRejectModal = (app, type) => {
    setSelectedApp(app);
    setActionType('reject');
    setReviewNote('');
    setShowModal(true);
  };

  const openRequestDetailsModal = (app, type) => {
    setSelectedApp(app);
    setActionType('request_details');
    setReviewNote('');
    setShowModal(true);
  };

  const handleRequestDetails = async () => {
    if (!reviewNote.trim()) {
      setErr('Please enter what details you need');
      return;
    }
    setLoading(true); setErr(null); setMsg(null);
    try {
      const endpoint = activeTab === 'leave' 
        ? `/api/leave/${selectedApp._id}/request-details`
        : `/api/tada/${selectedApp._id}/request-details`;
      
      await api.authFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ detailsRequested: reviewNote })
      });
      
      setMsg(`Details request sent to ${selectedApp.employee.name}`);
      setShowModal(false);
      setReviewNote('');
      activeTab === 'leave' ? loadLeaveApplications() : loadTADAApplications();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Application Approvals
        </h1>
        <p className="text-gray-600 mt-1">Review and approve leave and TA/DA applications</p>
      </div>

      {/* Messages */}
      {msg && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
          <p className="text-green-800 font-medium">{msg}</p>
        </div>
      )}
      {err && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <p className="text-red-800 font-medium">{err}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('leave')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'leave'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Leave Applications
          </button>
          <button
            onClick={() => setActiveTab('tada')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'tada'
                ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <PlaneTakeoff className="w-5 h-5" />
            TA/DA Applications
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'leave' && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Filter:</label>
                <select
                  value={leaveFilter}
                  onChange={e => setLeaveFilter(e.target.value)}
                  className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option>All</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
                <span className="text-sm text-gray-500">({leaveApplications.length} applications)</span>
              </div>

              {/* Applications List */}
              {leaveApplications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>No leave applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveApplications.map(app => (
                    <div key={app._id} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {app.employee.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{app.employee.name}</p>
                            <p className="text-xs text-gray-500">{app.employee.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(app.status)}`}>
                            {app.status}
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {app.leaveType}
                          </span>
                          {/* Application Date for Admin view */}
                          {app.createdAt && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                              {new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3 bg-white rounded-lg p-3 border border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">Start Date</p>
                          <p className="font-medium text-gray-800 text-sm">
                            {new Date(app.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">End Date</p>
                          <p className="font-medium text-gray-800 text-sm">
                            {new Date(app.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="font-medium text-gray-800 text-sm">{app.totalDays} day(s)</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Reason</p>
                        <p className="text-sm text-gray-700">{app.reason}</p>
                      </div>

                      {app.handoverTo && (
                        <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                          <p className="text-xs font-medium text-indigo-700 mb-2 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Responsibility Handover
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{app.handoverTo.name}</p>
                              <p className="text-xs text-gray-600">{app.handoverTo.role}</p>
                              {app.handoverNote && <p className="text-xs text-gray-600 mt-1 italic">"{app.handoverNote}"</p>}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              app.handoverStatus === 'Accepted' ? 'bg-green-100 text-green-800' :
                              app.handoverStatus === 'Denied' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {app.handoverStatus === 'Accepted' && '✓ '}
                              {app.handoverStatus === 'Denied' && '✗ '}
                              {app.handoverStatus === 'Pending' && '⏳ '}
                              {app.handoverStatus}
                            </span>
                          </div>
                        </div>
                      )}

                      {app.status === 'Pending' && (
                        <div>
                          <div className="flex gap-2 mb-2">
                            <button
                              onClick={() => openApproveModal(app, 'leave')}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg px-4 py-2 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => openRequestDetailsModal(app, 'leave')}
                              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg px-4 py-2 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <HelpCircle className="w-4 h-4" />
                              Ask Details
                            </button>
                            <button
                              onClick={() => openRejectModal(app, 'leave')}
                              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg px-4 py-2 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Click to add comment/reason before submitting
                          </p>
                        </div>
                      )}

                      {app.detailsRequested && (
                        <div className="mt-3 p-4 rounded-lg border-l-4 bg-blue-50 border-blue-400">
                          <div className="flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-blue-700 uppercase">
                                ℹ️ Details Requested
                              </p>
                              <p className="text-sm text-gray-700 mt-2">{app.detailsRequested}</p>
                              {app.detailsRequestedBy && (
                                <p className="text-xs text-gray-500 mt-2">
                                  by {app.detailsRequestedBy.name} on {new Date(app.detailsRequestedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {app.reviewNote && (
                        <div className={`mt-3 p-4 rounded-lg border-l-4 ${app.status === 'Approved' ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-600" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-700 uppercase">
                                {app.status === 'Approved' ? '✓ Admin Comment' : '✗ Rejection Reason'}
                              </p>
                              <p className="text-sm text-gray-700 mt-2">{app.reviewNote}</p>
                              {app.reviewedBy && (
                                <p className="text-xs text-gray-500 mt-2">
                                  by {app.reviewedBy.name} on {new Date(app.reviewedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tada' && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Filter:</label>
                <select
                  value={tadaFilter}
                  onChange={e => setTADAFilter(e.target.value)}
                  className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-orange-500 focus:outline-none"
                >
                  <option>All</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
                <span className="text-sm text-gray-500">({tadaApplications.length} applications)</span>
              </div>

              {/* Applications List */}
              {tadaApplications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <PlaneTakeoff className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>No TA/DA applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tadaApplications.map(app => (
                    <div key={app._id} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 flex items-center justify-center text-white font-bold">
                            {app.employee.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{app.employee.name}</p>
                            <p className="text-xs text-gray-500">{app.employee.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(app.adminStatus)}`}>
                            {app.adminStatus}
                          </span>
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            {app.applicationType}
                          </span>
                          {/* Application Date for Admin view */}
                          {app.createdAt && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                              {new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3 bg-white rounded-lg p-3 border border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">Travel Date</p>
                          <p className="font-medium text-gray-800 text-sm">
                            {new Date(app.travelDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="font-bold text-gray-800 text-lg">{fmtBDTEn(app.amount)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Destination</p>
                          <p className="font-medium text-gray-800">{app.destination}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Purpose</p>
                        <p className="text-sm text-gray-700">{app.purpose}</p>
                      </div>

                      {app.description && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Description</p>
                          <p className="text-sm text-gray-700">{app.description}</p>
                        </div>
                      )}

                      {app.adminStatus === 'Pending' && (
                        <div>
                          <div className="flex gap-2 mb-2">
                            <button
                              onClick={() => openApproveModal(app, 'tada')}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg px-4 py-2 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => openRequestDetailsModal(app, 'tada')}
                              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg px-4 py-2 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <HelpCircle className="w-4 h-4" />
                              Ask Details
                            </button>
                            <button
                              onClick={() => openRejectModal(app, 'tada')}
                              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg px-4 py-2 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Click to add comment/reason before submitting
                          </p>
                        </div>
                      )}

                      {app.detailsRequested && (
                        <div className="mt-3 p-4 rounded-lg border-l-4 bg-blue-50 border-blue-400">
                          <div className="flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-blue-700 uppercase">
                                ℹ️ Details Requested
                              </p>
                              <p className="text-sm text-gray-700 mt-2">{app.detailsRequested}</p>
                              {app.detailsRequestedBy && (
                                <p className="text-xs text-gray-500 mt-2">
                                  by {app.detailsRequestedBy.name} on {new Date(app.detailsRequestedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {app.adminReviewNote && (
                        <div className={`mt-3 p-4 rounded-lg border-l-4 ${app.adminStatus === 'Approved' ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-600" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-700 uppercase">
                                {app.adminStatus === 'Approved' ? '✓ Admin Comment' : '✗ Rejection Reason'}
                              </p>
                              <p className="text-sm text-gray-700 mt-2">{app.adminReviewNote}</p>
                              {app.adminReviewedBy && (
                                <p className="text-xs text-gray-500 mt-2">
                                  by {app.adminReviewedBy.name} on {new Date(app.adminReviewedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {app.adminStatus === 'Approved' && (
                        <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-xs font-medium text-blue-800">
                            ✓ Approved - Sent to Accountant for payment {app.paymentStatus === 'Paid' ? '(Already Paid)' : '(Pending Payment)'}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${
                actionType === 'approve' ? 'bg-green-100' : 
                actionType === 'request_details' ? 'bg-blue-100' : 
                'bg-red-100'
              }`}>
                {actionType === 'approve' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : actionType === 'request_details' ? (
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                {actionType === 'approve' ? 'Approve' : actionType === 'request_details' ? 'Request More Details' : 'Reject'} Application
              </h3>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Employee:</p>
              <p className="font-semibold text-gray-800">{selectedApp.employee.name}</p>
              <p className="text-xs text-gray-500 mt-1">{selectedApp.employee.role}</p>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <label className="block text-sm font-medium text-gray-700">
                  {actionType === 'approve' ? 'Comment (Optional)' : actionType === 'request_details' ? 'What details do you need? *' : 'Reason for Rejection *'}
                </label>
              </div>
              <textarea
                rows="4"
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none resize-none text-sm"
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder={
                  actionType === 'approve' ? 'Add any comments about this application...' : 
                  actionType === 'request_details' ? 'Please specify what additional information you need...' :
                  'Please provide a reason for rejection...'
                }
                required={actionType !== 'approve'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {actionType === 'approve' 
                  ? 'Your comment will be sent to the applicant via notification'
                  : actionType === 'request_details'
                  ? 'The applicant will be asked to provide these details. Application will remain pending.'
                  : 'The applicant will receive this reason in a notification'}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setReviewNote(''); }}
                className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={
                  actionType === 'request_details' 
                    ? handleRequestDetails
                    : activeTab === 'leave' ? handleLeaveAction : handleTADAAction
                }
                disabled={loading || (actionType !== 'approve' && !reviewNote.trim())}
                className={`px-5 py-2.5 rounded-lg text-white font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionType === 'approve'
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : actionType === 'request_details'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionType === 'approve' ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Approve & Notify
                      </>
                    ) : actionType === 'request_details' ? (
                      <>
                        <HelpCircle className="w-4 h-4" />
                        Send Details Request
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Reject & Notify
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
