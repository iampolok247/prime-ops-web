import React, { useState, useEffect } from 'react';
import { api, fmtBDTEn } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Calendar, 
  PlaneTakeoff, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  MapPin,
  Send,
  Users,
  UserCheck,
  UserX,
  Edit2,
  Trash2
} from 'lucide-react';

export default function MyApplications() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leave');
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [tadaApplications, setTADAApplications] = useState([]);
  const [handoverRequests, setHandoverRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showTADAForm, setShowTADAForm] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(null);
  const [handoverAction, setHandoverAction] = useState('');
  const [handoverNote, setHandoverNote] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [editingTADAId, setEditingTADAId] = useState(null);

  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: '',
    handoverTo: ''
  });

  const [tadaForm, setTADAForm] = useState({
    applicationType: 'TA/DA',
    purpose: '',
    travelDate: '',
    destination: '',
    amount: '',
    description: ''
  });

  const isSuperAdmin = user?.role === 'SuperAdmin';

  useEffect(() => {
    if (!isSuperAdmin) {
      loadApplications();
      loadEmployees();
      loadHandoverRequests();
    }
  }, []);

  // Check for handover request from notification
  useEffect(() => {
    const checkHandoverNotification = async () => {
      const handoverRequestId = sessionStorage.getItem('openHandoverRequestId');
      const notificationId = sessionStorage.getItem('handoverNotificationId');
      
      if (handoverRequestId && handoverRequests.length > 0) {
        console.log('🔔 Opening handover modal for request:', handoverRequestId);
        
        // Find the handover request by leave application ID
        const request = handoverRequests.find(r => r._id === handoverRequestId);
        
        if (request) {
          setShowHandoverModal(request);
          setActiveTab('handover'); // Switch to handover tab
          
          // Mark notification as read
          if (notificationId) {
            try {
              await api.markNotificationRead(notificationId);
            } catch (e) {
              console.error('Failed to mark notification as read:', e);
            }
          }
        }
        
        // Clear sessionStorage
        sessionStorage.removeItem('openHandoverRequestId');
        sessionStorage.removeItem('handoverNotificationId');
      }
    };

    if (handoverRequests.length > 0) {
      checkHandoverNotification();
    }
  }, [handoverRequests]);

  const loadApplications = async () => {
    try {
      const [leaveResp, tadaResp] = await Promise.all([
        api.getMyLeaveApplications(),
        api.getMyTADAApplications()
      ]);
      setLeaveApplications(leaveResp.applications || []);
      setTADAApplications(tadaResp.applications || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadEmployees = async () => {
    try {
      const resp = await api.listUsers();
      // Filter out SuperAdmin and current user
      setEmployees((resp.users || []).filter(u => u.role !== 'SuperAdmin' && u._id !== user?.id));
    } catch (e) {
      console.error('Failed to load employees:', e);
    }
  };

  const loadHandoverRequests = async () => {
    try {
      const resp = await api.getHandoverRequests();
      setHandoverRequests(resp.requests || []);
    } catch (e) {
      console.error('Failed to load handover requests:', e);
    }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null); setLoading(true);
    try {
      const payload = { ...leaveForm };
      if (!payload.handoverTo) delete payload.handoverTo;
      
      if (editingLeaveId) {
        // Update existing application
        await api.updateLeaveApplication(editingLeaveId, payload);
        setMsg('Leave application updated successfully! 🎉');
        setEditingLeaveId(null);
      } else {
        // Create new application
        await api.createLeaveApplication(payload);
        setMsg('Leave application submitted successfully! 🎉');
      }
      
      setLeaveForm({ leaveType: 'Casual Leave', startDate: '', endDate: '', reason: '', handoverTo: '' });
      setShowLeaveForm(false);
      loadApplications();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHandoverResponse = async () => {
    if (!showHandoverModal) return;
    if (handoverAction === 'deny' && !handoverNote.trim()) {
      setErr('Please provide a reason for denying the handover');
      return;
    }
    
    setLoading(true);
    setMsg(null);
    setErr(null);
    
    try {
      if (handoverAction === 'accept') {
        await api.acceptHandover(showHandoverModal._id, handoverNote);
        setMsg('Handover request accepted successfully! ✅');
      } else {
        await api.denyHandover(showHandoverModal._id, handoverNote);
        setMsg('Handover request denied');
      }
      
      // Close modal and reset
      setShowHandoverModal(null);
      setHandoverNote('');
      setHandoverAction('');
      
      // Reload data
      loadHandoverRequests();
      loadApplications();
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitTADA = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null); setLoading(true);
    try {
      if (editingTADAId) {
        // Update existing application
        await api.updateTADAApplication(editingTADAId, tadaForm);
        setMsg('TA/DA application updated successfully! 🎉');
        setEditingTADAId(null);
      } else {
        // Create new application
        await api.createTADAApplication(tadaForm);
        setMsg('TA/DA application submitted successfully! 🎉');
      }
      
      setTADAForm({ applicationType: 'TA/DA', purpose: '', travelDate: '', destination: '', amount: '', description: '' });
      setShowTADAForm(false);
      loadApplications();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLeave = (leave) => {
    setEditingLeaveId(leave._id);
    setLeaveForm({
      leaveType: leave.leaveType,
      startDate: leave.startDate.split('T')[0],
      endDate: leave.endDate.split('T')[0],
      reason: leave.reason,
      handoverTo: leave.handoverTo?._id || ''
    });
    setShowLeaveForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!confirm('Are you sure you want to delete this leave application? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setMsg(null);
    setErr(null);
    
    try {
      await api.deleteLeaveApplication(leaveId);
      setMsg('Leave application deleted successfully');
      loadApplications();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTADA = (tada) => {
    setEditingTADAId(tada._id);
    setTADAForm({
      applicationType: tada.applicationType,
      purpose: tada.purpose,
      travelDate: tada.travelDate.split('T')[0],
      destination: tada.destination || '',
      amount: tada.amount,
      description: tada.description || ''
    });
    setShowTADAForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTADA = async (tadaId) => {
    if (!confirm('Are you sure you want to delete this TA/DA application? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setMsg(null);
    setErr(null);
    
    try {
      await api.deleteTADAApplication(tadaId);
      setMsg('TA/DA application deleted successfully');
      loadApplications();
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      'Rejected': 'bg-red-100 text-red-800',
      'Paid': 'bg-blue-100 text-blue-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Approved': return CheckCircle;
      case 'Rejected': return XCircle;
      case 'Paid': return CheckCircle;
      default: return Clock;
    }
  };

  if (isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-xl text-gray-600">SuperAdmin cannot apply for leave or TA/DA.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          My Applications
        </h1>
        <p className="text-gray-600 mt-1">Apply for leave and travel allowance</p>
      </div>

      {/* Messages */}
      {msg && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 font-medium">{msg}</p>
        </div>
      )}
      {err && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 font-medium">{err}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setShowLeaveForm(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-6 hover:shadow-lg transition-all flex items-center justify-center gap-3"
        >
          <Calendar className="w-6 h-6" />
          <span className="text-lg font-semibold">Apply for Leave</span>
        </button>
        <button
          onClick={() => setShowTADAForm(true)}
          className="bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl p-6 hover:shadow-lg transition-all flex items-center justify-center gap-3"
        >
          <PlaneTakeoff className="w-6 h-6" />
          <span className="text-lg font-semibold">Apply for TA/DA</span>
        </button>
      </div>

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
            Leave Applications ({leaveApplications.length})
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
            TA/DA Applications ({tadaApplications.length})
          </button>
          <button
            onClick={() => setActiveTab('handover')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'handover'
                ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Handover Requests ({handoverRequests.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'leave' && (
            <div className="space-y-4">
              {leaveApplications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>No leave applications yet</p>
                </div>
              ) : (
                leaveApplications.map(app => (
                  <div key={app._id} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(app.status)}`}>
                          {React.createElement(getStatusIcon(app.status), { className: "w-4 h-4 inline mr-1" })}
                          {app.status}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {app.leaveType}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="font-medium text-gray-800">
                          {new Date(app.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">End Date</p>
                        <p className="font-medium text-gray-800">
                          {new Date(app.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="font-medium text-gray-800">{app.totalDays} day(s)</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{app.reason}</p>
                    </div>
                    {app.handoverTo && (
                      <div className="p-3 rounded-lg bg-indigo-50 mb-3">
                        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Responsibility Handover
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{app.handoverTo.name} ({app.handoverTo.role})</p>
                            {app.handoverNote && <p className="text-xs text-gray-600 mt-1">{app.handoverNote}</p>}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            app.handoverStatus === 'Accepted' ? 'bg-green-100 text-green-800' :
                            app.handoverStatus === 'Denied' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {app.handoverStatus === 'Accepted' && <UserCheck className="w-3 h-3 inline mr-1" />}
                            {app.handoverStatus === 'Denied' && <UserX className="w-3 h-3 inline mr-1" />}
                            {app.handoverStatus === 'Pending' && <Clock className="w-3 h-3 inline mr-1" />}
                            {app.handoverStatus}
                          </span>
                        </div>
                      </div>
                    )}
                    {app.reviewNote && (
                      <div className={`p-3 rounded-lg ${app.status === 'Approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="text-xs font-medium text-gray-600 mb-1">Review Note</p>
                        <p className="text-sm text-gray-700">{app.reviewNote}</p>
                        {app.reviewedBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            by {app.reviewedBy.name} on {new Date(app.reviewedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                    {app.status === 'Pending' && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleEditLeave(app)}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLeave(app._id)}
                          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tada' && (
            <div className="space-y-4">
              {tadaApplications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <PlaneTakeoff className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>No TA/DA applications yet</p>
                </div>
              ) : (
                tadaApplications.map(app => (
                  <div key={app._id} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(app.adminStatus)}`}>
                          {React.createElement(getStatusIcon(app.adminStatus), { className: "w-4 h-4 inline mr-1" })}
                          Admin: {app.adminStatus}
                        </span>
                        {app.adminStatus === 'Approved' && (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(app.paymentStatus)}`}>
                            {React.createElement(getStatusIcon(app.paymentStatus), { className: "w-4 h-4 inline mr-1" })}
                            Payment: {app.paymentStatus}
                          </span>
                        )}
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          {app.applicationType}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Travel Date</p>
                        <p className="font-medium text-gray-800">
                          {new Date(app.travelDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="font-medium text-gray-800 text-lg">{fmtBDTEn(app.amount)}</p>
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
                    {app.adminReviewNote && (
                      <div className={`p-3 rounded-lg mb-2 ${app.adminStatus === 'Approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="text-xs font-medium text-gray-600 mb-1">Admin Review</p>
                        <p className="text-sm text-gray-700">{app.adminReviewNote}</p>
                        {app.adminReviewedBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            by {app.adminReviewedBy.name} on {new Date(app.adminReviewedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                    {app.paymentNote && (
                      <div className="p-3 rounded-lg bg-blue-50">
                        <p className="text-xs font-medium text-gray-600 mb-1">Payment Note</p>
                        <p className="text-sm text-gray-700">{app.paymentNote}</p>
                        {app.paidBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            Paid by {app.paidBy.name} on {new Date(app.paidAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                    {app.adminStatus === 'Pending' && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleEditTADA(app)}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTADA(app._id)}
                          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'handover' && (
            <div className="space-y-4">
              {handoverRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>No handover requests</p>
                </div>
              ) : (
                handoverRequests.map(req => (
                  <div key={req._id} className="bg-gradient-to-br from-indigo-50 to-white rounded-lg p-5 border border-indigo-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {req.employee.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{req.employee.name}</p>
                            <p className="text-xs text-gray-500">{req.employee.role}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {req.leaveType}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-white rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="font-medium text-gray-800 text-sm">
                          {new Date(req.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">End Date</p>
                        <p className="font-medium text-gray-800 text-sm">
                          {new Date(req.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="font-medium text-gray-800 text-sm">{req.totalDays} day(s)</p>
                      </div>
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-600 mb-1">Leave Reason</p>
                      <p className="text-sm text-gray-700">{req.reason}</p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowHandoverModal(req); setHandoverAction('accept'); }}
                        className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-2.5 rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-5 h-5" />
                        Accept Handover
                      </button>
                      <button
                        onClick={() => { setShowHandoverModal(req); setHandoverAction('deny'); }}
                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-2.5 rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <UserX className="w-5 h-5" />
                        Deny Handover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Handover Response Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            {/* If no action selected yet, show both options */}
            {!handoverAction ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Handover Request</h3>
                  </div>
                  <button
                    onClick={() => { setShowHandoverModal(null); setHandoverNote(''); setHandoverAction(''); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-sm font-semibold text-indigo-900 mb-3">
                    {showHandoverModal.employee.name} has requested you to handle their responsibilities
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Leave Type:</span>
                      <span className="text-sm font-semibold text-gray-800">{showHandoverModal.leaveType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Duration:</span>
                      <span className="text-sm font-semibold text-gray-800">{showHandoverModal.totalDays} day(s)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">From:</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {new Date(showHandoverModal.startDate).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">To:</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {new Date(showHandoverModal.endDate).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    {showHandoverModal.reason && (
                      <div className="mt-3 pt-3 border-t border-indigo-200">
                        <span className="text-xs text-gray-600 block mb-1">Reason:</span>
                        <p className="text-sm text-gray-700">{showHandoverModal.reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setHandoverAction('deny')}
                    className="flex-1 px-5 py-3 rounded-lg border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
                  >
                    <UserX size={18} />
                    Deny
                  </button>
                  <button
                    onClick={() => setHandoverAction('accept')}
                    className="flex-1 px-5 py-3 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 text-white font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <UserCheck size={18} />
                    Accept
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${handoverAction === 'accept' ? 'bg-gradient-to-r from-green-500 to-teal-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}>
                      {handoverAction === 'accept' ? <UserCheck className="w-5 h-5 text-white" /> : <UserX className="w-5 h-5 text-white" />}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {handoverAction === 'accept' ? 'Accept' : 'Deny'} Handover
                    </h3>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">From: <span className="font-semibold text-gray-800">{showHandoverModal.employee.name}</span></p>
                  <p className="text-sm text-gray-600 mb-2">Leave Type: <span className="font-semibold text-gray-800">{showHandoverModal.leaveType}</span></p>
                  <p className="text-sm text-gray-600">Duration: <span className="font-semibold text-gray-800">{showHandoverModal.totalDays} day(s)</span></p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {handoverAction === 'accept' ? 'Note (Optional)' : 'Reason for Denial *'}
                  </label>
                  <textarea
                    rows="3"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none resize-none"
                    value={handoverNote}
                    onChange={e => setHandoverNote(e.target.value)}
                    placeholder={handoverAction === 'accept' ? 'Add any notes...' : 'Please explain why you are denying this request...'}
                    required={handoverAction === 'deny'}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setHandoverAction(''); setHandoverNote(''); }}
                    className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleHandoverResponse}
                    disabled={loading || (handoverAction === 'deny' && !handoverNote.trim())}
                    className={`px-5 py-2.5 rounded-lg font-medium text-white ${
                      handoverAction === 'accept' 
                        ? 'bg-gradient-to-r from-green-500 to-teal-600 hover:shadow-lg' 
                        : 'bg-gradient-to-r from-red-500 to-pink-600 hover:shadow-lg'
                    } disabled:opacity-50 transition-all`}
                  >
                    {loading ? 'Processing...' : handoverAction === 'accept' ? 'Confirm Accept' : 'Confirm Deny'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Leave Application Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={submitLeave} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {editingLeaveId ? 'Edit Leave Application' : 'Apply for Leave'}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  value={leaveForm.leaveType}
                  onChange={e => setLeaveForm(f => ({ ...f, leaveType: e.target.value }))}
                  required
                >
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                  <option>Annual Leave</option>
                  <option>Emergency Leave</option>
                  <option>Unpaid Leave</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    value={leaveForm.startDate}
                    onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    value={leaveForm.endDate}
                    onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsibility Handover To</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  value={leaveForm.handoverTo}
                  onChange={e => setLeaveForm(f => ({ ...f, handoverTo: e.target.value }))}
                >
                  <option value="">-- No Handover Required --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Optional: Select a colleague to handle your responsibilities during leave</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  rows="4"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none resize-none"
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Please explain your reason for leave..."
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveForm(false);
                  setEditingLeaveId(null);
                  setLeaveForm({ leaveType: 'Casual Leave', startDate: '', endDate: '', reason: '', handoverTo: '' });
                }}
                className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TA/DA Application Modal */}
      {showTADAForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={submitTADA} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg">
                  <PlaneTakeoff className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {editingTADAId ? 'Edit TA/DA Application' : 'Apply for TA/DA'}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Type *</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-orange-500 focus:outline-none"
                  value={tadaForm.applicationType}
                  onChange={e => setTADAForm(f => ({ ...f, applicationType: e.target.value }))}
                  required
                >
                  <option>TA</option>
                  <option>DA</option>
                  <option>TA/DA</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Travel Date *</label>
                  <input
                    type="date"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-orange-500 focus:outline-none"
                    value={tadaForm.travelDate}
                    onChange={e => setTADAForm(f => ({ ...f, travelDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (BDT) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-orange-500 focus:outline-none"
                    value={tadaForm.amount}
                    onChange={e => setTADAForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-orange-500 focus:outline-none"
                  value={tadaForm.destination}
                  onChange={e => setTADAForm(f => ({ ...f, destination: e.target.value }))}
                  placeholder="e.g., Dhaka to Chittagong"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-orange-500 focus:outline-none"
                  value={tadaForm.purpose}
                  onChange={e => setTADAForm(f => ({ ...f, purpose: e.target.value }))}
                  placeholder="e.g., Business meeting, Training session"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  rows="3"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-orange-500 focus:outline-none resize-none"
                  value={tadaForm.description}
                  onChange={e => setTADAForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Additional details about your travel..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTADAForm(false);
                  setEditingTADAId(null);
                  setTADAForm({ applicationType: 'TA/DA', purpose: '', travelDate: '', destination: '', amount: '', description: '' });
                }}
                className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
