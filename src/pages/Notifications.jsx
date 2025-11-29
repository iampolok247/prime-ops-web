import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  AlertCircle,
  Trash2,
  CheckCheck,
  Filter
} from 'lucide-react';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [followUpNotifications, setFollowUpNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, leave, tada, handover, task, urgent, followup
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [showLeadHistory, setShowLeadHistory] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Load system notifications
      const data = await api.getNotifications(undefined, 100); // Get last 100 notifications
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      
      // Load urgent tasks
      try {
        const tasksData = await api.listMyTasks();
        const tasks = (tasksData.tasks || []).filter(t => {
          if (t.status === 'Completed') return false;
          const now = new Date();
          const due = new Date(t.dueDate);
          return due < now; // Only past due dates
        });
        setUrgentTasks(tasks);
      } catch (e) {
        console.log('Could not load urgent tasks:', e.message);
      }

      // Load follow-up notifications (for Admission/Admin/SuperAdmin)
      if (user && ['Admission', 'Admin', 'SuperAdmin'].includes(user.role)) {
        try {
          const followUpData = await api.getAdmissionFollowUpNotifications();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const urgent = (followUpData.leads || []).map(lead => {
            const nextDate = new Date(lead.nextFollowUpDate);
            nextDate.setHours(0, 0, 0, 0);
            const isOverdue = nextDate < today;
            return { ...lead, isOverdue };
          });
          
          setFollowUpNotifications(urgent);
        } catch (e) {
          console.log('Could not load follow-up notifications:', e.message);
        }
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      // Mark as read if unread
      if (!notif.isRead) {
        await api.markNotificationRead(notif._id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => 
          prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
        );
      }

      // Handle special notification types
      if (notif.type === 'LEAVE_HANDOVER_REQUEST') {
        sessionStorage.setItem('openHandoverRequestId', notif.relatedId);
        sessionStorage.setItem('handoverNotificationId', notif._id);
        navigate('/my-applications');
      } else if (notif.link) {
        navigate(notif.link);
      }
    } catch (e) {
      console.error('Failed to handle notification:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setMsg('All notifications marked as read ✓');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setErr(e.message);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this notification?')) return;
    
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setMsg('Notification deleted');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleFollowUpClick = async (lead) => {
    try {
      setErr(null);
      // Fetch full lead details with populated fields
      const response = await api.getLeadHistory(lead._id);
      const fullLead = response.lead || response;
      
      // Populate the lead data ensuring all fields are available
      setSelectedLead(fullLead);
      setShowLeadHistory(true);
    } catch (e) {
      console.error('Failed to load lead details:', e);
      setErr('Failed to load lead details: ' + e.message);
    }
  };

  const fmtDT = (d) => { 
    if (!d) return '-'; 
    try { 
      return new Date(d).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch { 
      return d; 
    } 
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    // Filter by read status
    if (filter === 'unread' && n.isRead) return false;
    if (filter === 'read' && !n.isRead) return false;

    // Filter by type
    if (typeFilter === 'leave' && !n.type.startsWith('LEAVE_')) return false;
    if (typeFilter === 'tada' && !n.type.startsWith('TADA_')) return false;
    if (typeFilter === 'handover' && !n.type.includes('HANDOVER')) return false;
    if (typeFilter === 'task' && !n.type.startsWith('TASK_')) return false;
    if (typeFilter === 'urgent') return false; // Urgent tasks are shown separately
    if (typeFilter === 'followup') return false; // Follow-ups are shown separately

    return true;
  });

  const getNotificationIcon = (type) => {
    if (type.startsWith('LEAVE_')) return <Calendar className="w-5 h-5 text-blue-600" />;
    if (type.startsWith('TADA_')) return <AlertCircle className="w-5 h-5 text-orange-600" />;
    if (type.includes('HANDOVER')) return <Users className="w-5 h-5 text-purple-600" />;
    if (type.startsWith('TASK_')) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <Bell className="w-5 h-5 text-gray-600" />;
  };

  const getNotificationColor = (type) => {
    if (type.startsWith('LEAVE_')) return 'border-blue-200 bg-blue-50';
    if (type.startsWith('TADA_')) return 'border-orange-200 bg-orange-50';
    if (type.includes('HANDOVER')) return 'border-purple-200 bg-purple-50';
    if (type.startsWith('TASK_')) return 'border-green-200 bg-green-50';
    return 'border-gray-200 bg-gray-50';
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-navy flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              All Notifications
            </h1>
            <p className="text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
            >
              <CheckCheck size={18} />
              Mark All Read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
          >
            <option value="all">All Types</option>
            <option value="urgent">Urgent Tasks</option>
            <option value="followup">Follow-up Due</option>
            <option value="leave">Leave Applications</option>
            <option value="tada">TA/DA Applications</option>
            <option value="handover">Handover Requests</option>
            <option value="task">Tasks</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {msg}
        </div>
      )}
      {err && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <XCircle size={18} />
          {err}
        </div>
      )}

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading notifications...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Urgent Tasks Section */}
          {typeFilter === 'all' || typeFilter === 'urgent' ? (
            urgentTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-navy">Urgent Tasks ({urgentTasks.length})</h2>
                </div>
                <div className="space-y-3">
                  {urgentTasks.map(task => (
                    <div
                      key={task._id}
                      onClick={() => navigate('/tasks')}
                      className="p-4 rounded-xl border-2 border-red-200 bg-red-50 cursor-pointer hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-white">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className="text-base font-semibold text-navy">{task.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{task.description || 'No description'}</p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">Overdue</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Calendar size={12} />
                            Due: {new Date(task.dueDate).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : null}

          {/* Follow-up Notifications Section */}
          {typeFilter === 'all' || typeFilter === 'followup' ? (
            followUpNotifications.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Bell className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-lg font-bold text-navy">Follow-up Due ({followUpNotifications.length})</h2>
                </div>
                <div className="space-y-3">
                  {followUpNotifications.map(lead => {
                    const isOverdue = lead.isOverdue;
                    return (
                      <div
                        key={lead._id}
                        onClick={() => handleFollowUpClick(lead)}
                        className={`p-4 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all ${
                          isOverdue ? 'border-red-200 bg-red-50' : 'border-purple-200 bg-purple-50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-white">
                            <Users className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-purple-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-navy">
                                  {lead.leadId} — {lead.name}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {lead.interestedCourse || 'No course'} • {lead.status}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {lead.phone} {lead.email && `• ${lead.email}`}
                                </p>
                                {lead.assignedTo && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    👤 Assigned to: {lead.assignedTo.name}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className={`text-xs px-2 py-1 rounded font-medium ${
                                  isOverdue ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {isOverdue ? 'OVERDUE' : 'DUE TODAY'}
                                </span>
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                  <Calendar size={12} />
                                  {new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : null}

          {/* System Notifications */}
          {filteredNotifications.length === 0 && urgentTasks.length === 0 && followUpNotifications.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <Bell size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No notifications found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : null}

          {filteredNotifications.length > 0 && (
            <div>
              {(urgentTasks.length > 0 || followUpNotifications.length > 0) && typeFilter === 'all' && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Bell className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-lg font-bold text-navy">System Notifications ({filteredNotifications.length})</h2>
                </div>
              )}
              <div className="space-y-3">
                {filteredNotifications.map(notif => {
                  const isHandoverRequest = notif.type === 'LEAVE_HANDOVER_REQUEST';
                  
                  return (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                        !notif.isRead 
                          ? getNotificationColor(notif.type) + ' border-l-4' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg ${!notif.isRead ? 'bg-white' : 'bg-gray-100'}`}>
                          {getNotificationIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className={`text-base ${!notif.isRead ? 'font-semibold text-navy' : 'font-medium text-gray-700'}`}>
                                {notif.title}
                                {isHandoverRequest && !notif.isRead && (
                                  <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                    Action Required
                                  </span>
                                )}
                                {!notif.isRead && !isHandoverRequest && (
                                  <span className="ml-2 inline-block w-2 h-2 bg-indigo-500 rounded-full"></span>
                                )}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                              
                              {/* Sender info */}
                              {notif.sender && (
                                <div className="flex items-center gap-2 mt-2">
                                  <img 
                                    src={notif.sender.avatar} 
                                    alt={notif.sender.name}
                                    className="w-5 h-5 rounded-full"
                                  />
                                  <span className="text-xs text-gray-500">
                                    from {notif.sender.name}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Delete button */}
                            <button
                              onClick={(e) => deleteNotification(notif._id, e)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete notification"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <Clock size={12} />
                            {new Date(notif.createdAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lead History Modal */}
      {showLeadHistory && selectedLead && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowLeadHistory(false)} />
          <div className="bg-white rounded-xl p-6 z-10 w-full max-w-3xl shadow-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-navy">Lead History — {selectedLead.leadId}</h3>
            
            {/* Student Info */}
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-600">Name:</span> <strong>{selectedLead.name}</strong></div>
                <div><span className="text-gray-600">Phone:</span> <strong>{selectedLead.phone || '-'}</strong></div>
                <div><span className="text-gray-600">Email:</span> <strong>{selectedLead.email || '-'}</strong></div>
                <div><span className="text-gray-600">Course:</span> <strong>{selectedLead.interestedCourse || '-'}</strong></div>
                <div><span className="text-gray-600">Status:</span> <strong className="text-indigo-600">{selectedLead.status}</strong></div>
                <div><span className="text-gray-600">Assigned To:</span> <strong>{selectedLead.assignedTo?.name || '-'}</strong></div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <div className="border-l-4 border-blue-400 pl-4 py-2">
                <div className="text-sm text-gray-600">Assigned At</div>
                <div className="font-semibold">{selectedLead.assignedAt ? fmtDT(selectedLead.assignedAt) : <span className="text-gray-400">Not recorded</span>}</div>
              </div>
              
              <div className="border-l-4 border-purple-400 pl-4 py-2">
                <div className="text-sm text-gray-600">Counseling At</div>
                <div className="font-semibold">{selectedLead.counselingAt ? fmtDT(selectedLead.counselingAt) : <span className="text-gray-400">Not yet</span>}</div>
              </div>
              
              <div className="border-l-4 border-green-400 pl-4 py-2">
                <div className="text-sm text-gray-600">Admitted At</div>
                <div className="font-semibold">{selectedLead.admittedAt ? fmtDT(selectedLead.admittedAt) : <span className="text-gray-400">Not admitted yet</span>}</div>
                {selectedLead.admittedToCourse && (
                  <div className="text-sm text-gray-600 mt-1">Course: <strong>{selectedLead.admittedToCourse.name}</strong></div>
                )}
                {selectedLead.admittedToBatch && (
                  <div className="text-sm text-gray-600">Batch: <strong>{selectedLead.admittedToBatch.name}</strong></div>
                )}
              </div>
            </div>

            {/* Follow-ups Section */}
            <div className="mt-4">
              <h4 className="font-bold text-navy mb-2">Follow-ups ({(selectedLead.followUps||[]).length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(selectedLead.followUps||[]).length === 0 ? (
                  <div className="text-gray-500 text-sm bg-gray-50 p-3 rounded-lg">No follow-ups recorded</div>
                ) : (
                  (selectedLead.followUps||[]).map((f, idx)=> (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 border-l-4 border-orange-400">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">{fmtDT(f.at)}</div>
                          {f.by?.name && <div className="text-xs text-gray-500">by {f.by.name}</div>}
                          <div className="text-sm text-gray-800 mt-1">{f.note || <span className="text-gray-400">No note</span>}</div>
                          {f.nextFollowUpDate && (
                            <div className="text-xs text-indigo-600 mt-1">Next follow-up: {new Date(f.nextFollowUpDate).toLocaleDateString('en-GB')}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes Section */}
            {selectedLead.notes && (
              <div className="mt-4">
                <h4 className="font-bold text-navy mb-2">Additional Notes</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  {selectedLead.notes}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={() => setShowLeadHistory(false)} 
                className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
