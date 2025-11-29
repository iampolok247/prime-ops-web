import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu, Bell, Calendar, MessageCircle } from 'lucide-react';
import { api } from '../lib/api.js';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [paymentNotifications, setPaymentNotifications] = useState([]);
  const [followUpNotifications, setFollowUpNotifications] = useState([]);
  const [readNotifications, setReadNotifications] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Load read notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('readNotifications');
    if (stored) {
      try {
        setReadNotifications(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse read notifications:', e);
      }
    }
  }, []);

  // Fetch unread message count
  useEffect(() => {
    const loadUnreadMessages = async () => {
      try {
        const data = await api.getUnreadMessageCount();
        setUnreadMessageCount(data.count || 0);
      } catch (error) {
        console.error('Failed to load unread messages:', error);
      }
    };

    if (user) {
      loadUnreadMessages();
      // Refresh every 10 seconds for real-time updates
      const interval = setInterval(loadUnreadMessages, 10 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch tasks and filter urgent ones
  useEffect(() => {
    const loadUrgentTasks = async () => {
      try {
        const isAdmin = ['SuperAdmin', 'Admin'].includes(user?.role);
        const data = isAdmin ? await api.listAllTasks() : await api.listMyTasks();
        const tasks = data.tasks || [];
        
        // Filter urgent tasks (overdue or due within 3 days)
        const urgent = tasks.filter(task => {
          if (task.status === 'Completed') return false;
          if (!task.dueDate) return false;
          
          const now = new Date();
          const due = new Date(task.dueDate);
          const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
          
          return diffDays <= 3;
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        setUrgentTasks(urgent);
      } catch (error) {
        console.error('Failed to load urgent tasks:', error);
      }
    };

    if (user) {
      loadUrgentTasks();
      // Refresh every minute for real-time updates
      const interval = setInterval(loadUrgentTasks, 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch payment notifications for Coordinators
  useEffect(() => {
    const loadPaymentNotifications = async () => {
      try {
        if (['Coordinator', 'Admin', 'SuperAdmin'].includes(user?.role)) {
          const data = await api.getPaymentNotifications();
          const notifications = data.notifications || [];
          
          // Filter for today and overdue only
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const urgent = notifications.filter(n => {
            if (!n.nextPaymentDate) return false;
            const paymentDate = new Date(n.nextPaymentDate);
            paymentDate.setHours(0, 0, 0, 0);
            
            // Show if overdue or due today
            return paymentDate <= today;
          }).sort((a, b) => new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate));
          
          setPaymentNotifications(urgent);
        }
      } catch (error) {
        console.error('Failed to load payment notifications:', error);
      }
    };

    if (user) {
      loadPaymentNotifications();
      // Refresh every 2 minutes for real-time updates
      const interval = setInterval(loadPaymentNotifications, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch follow-up notifications for Admission
  useEffect(() => {
    const loadFollowUpNotifications = async () => {
      try {
        if (['Admission', 'Admin', 'SuperAdmin'].includes(user?.role)) {
          const data = await api.getAdmissionFollowUpNotifications();
          const notifications = data.notifications || [];
          
          // Filter for today and overdue only
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const urgent = notifications.filter(n => {
            if (!n.nextFollowUpDate) return false;
            const followUpDate = new Date(n.nextFollowUpDate);
            followUpDate.setHours(0, 0, 0, 0);
            
            // Show if overdue or due today
            return followUpDate <= today;
          }).sort((a, b) => new Date(a.nextFollowUpDate) - new Date(b.nextFollowUpDate));
          
          setFollowUpNotifications(urgent);
        }
      } catch (error) {
        console.error('Failed to load follow-up notifications:', error);
      }
    };

    if (user) {
      loadFollowUpNotifications();
      // Refresh every 2 minutes for real-time updates
      const interval = setInterval(loadFollowUpNotifications, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch system notifications (leave, handover, etc.)
  useEffect(() => {
    const loadSystemNotifications = async () => {
      try {
        console.log('🔔 [Topbar] Loading system notifications for user:', user?.name, user?.id);
        const data = await api.getNotifications(false, 20); // Get last 20 unread
        console.log('🔔 [Topbar] System notifications response:', data);
        console.log('🔔 [Topbar] Notifications array length:', data.notifications?.length);
        console.log('🔔 [Topbar] Notifications:', JSON.stringify(data.notifications, null, 2));
        console.log('🔔 [Topbar] Unread count:', data.unreadCount);
        setSystemNotifications(data.notifications || []);
        setUnreadNotifCount(data.unreadCount || 0);
      } catch (error) {
        console.error('❌ [Topbar] Failed to load system notifications:', error);
        console.error('❌ [Topbar] Error details:', error.message);
      }
    };

    if (user) {
      loadSystemNotifications();
      // Refresh every 30 seconds for real-time updates
      const interval = setInterval(loadSystemNotifications, 30 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Clean up old read notifications (older than 7 days)
  useEffect(() => {
    const cleanup = () => {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const filtered = readNotifications.filter(n => n.readAt > sevenDaysAgo);
      if (filtered.length !== readNotifications.length) {
        setReadNotifications(filtered);
        localStorage.setItem('readNotifications', JSON.stringify(filtered));
      }
    };
    cleanup();
  }, [readNotifications]);

  // Get deadline color
  const getDeadlineColor = (dueDate, status) => {
    if (!dueDate || status === 'Completed') return null;
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' };
    }
    if (diffDays <= 1) {
      return { bg: 'bg-red-50', text: 'text-red-600', label: diffDays === 0 ? 'Due Today' : 'Due Tomorrow' };
    }
    if (diffDays <= 3) {
      return { bg: 'bg-orange-50', text: 'text-orange-600', label: `${diffDays} days left` };
    }
    return { bg: 'bg-gray-50', text: 'text-gray-600', label: null };
  };

  const PRIORITY_COLORS = {
    'Low': { bg: 'bg-blue-100', text: 'text-blue-600' },
    'Medium': { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    'High': { bg: 'bg-orange-100', text: 'text-orange-600' },
    'Critical': { bg: 'bg-red-100', text: 'text-red-600' }
  };

  const handleTaskClick = (task) => {
    // Mark notification as read
    const newRead = [...readNotifications.filter(n => n.taskId !== task._id), {
      taskId: task._id,
      readAt: Date.now()
    }];
    setReadNotifications(newRead);
    localStorage.setItem('readNotifications', JSON.stringify(newRead));
    
    setShowNotifications(false);
    
    // Store the full task object so TasksKanban can access it
    sessionStorage.setItem('openTaskId', task._id);
    sessionStorage.setItem('openTaskData', JSON.stringify(task));
    
    // Navigate to tasks board
    navigate('/tasks-board');
  };

  const handlePaymentClick = (payment) => {
    // Mark notification as read
    const newRead = [...readNotifications.filter(n => n.paymentId !== payment._id), {
      paymentId: payment._id,
      readAt: Date.now()
    }];
    setReadNotifications(newRead);
    localStorage.setItem('readNotifications', JSON.stringify(newRead));
    
    setShowNotifications(false);
    
    // Store payment ID in sessionStorage to open details modal
    sessionStorage.setItem('openPaymentId', payment._id);
    sessionStorage.setItem('openPaymentData', JSON.stringify(payment));
    
    // Navigate to due fees collection
    navigate('/coordinator/due-fees');
  };

  const handleFollowUpClick = (lead) => {
    // Mark notification as read
    const newRead = [...readNotifications.filter(n => n.leadId !== lead._id), {
      leadId: lead._id,
      readAt: Date.now()
    }];
    setReadNotifications(newRead);
    localStorage.setItem('readNotifications', JSON.stringify(newRead));
    
    setShowNotifications(false);
    
    // Navigate to admission pipeline
    navigate('/admission/pipeline');
  };

  // Count unread urgent tasks
  const unreadTaskCount = urgentTasks.filter(task => 
    !readNotifications.some(n => n.taskId === task._id)
  ).length;

  // Count unread payment notifications
  const unreadPaymentCount = paymentNotifications.filter(payment => 
    !readNotifications.some(n => n.paymentId === payment._id)
  ).length;

  // Count unread follow-up notifications
  const unreadFollowUpCount = followUpNotifications.filter(lead => 
    !readNotifications.some(n => n.leadId === lead._id)
  ).length;

  // Total unread count
  const unreadCount = unreadTaskCount + unreadPaymentCount + unreadFollowUpCount + unreadNotifCount;

  return (
    <header className="h-16 bg-navy text-white flex items-center justify-between px-4 shadow-soft">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-navy/80 rounded-lg transition"
        >
          <Menu size={20} />
        </button>
        
        {/* Logo - smaller on mobile */}
        <div className="px-2">
          <img src="https://primeacademy.org/logo-full.png" alt="Prime Academy" className="h-6 md:h-8 object-contain" />
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-3">
        {/* Message Notification */}
        <div className="relative">
          <button
            onClick={() => navigate('/messages')}
            className="relative p-2 hover:bg-navy/80 rounded-lg transition"
            title="Messages"
          >
            <MessageCircle size={20} className="text-white" />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-navy/80 rounded-lg transition"
            title="Notifications"
          >
            <Bell size={20} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <>
              {/* Backdrop to close dropdown when clicking outside */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              />
              
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-[32rem] overflow-y-auto">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between sticky top-0">
                  <h3 className="font-semibold text-navy">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {/* Payment Notifications (Coordinators Only) */}
                {['Coordinator', 'Admin', 'SuperAdmin'].includes(user?.role) && paymentNotifications.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-orange-50 border-b border-orange-200">
                      <h4 className="text-xs font-bold text-orange-700 uppercase flex items-center gap-1">
                        <Bell size={12} />
                        Payment Due ({paymentNotifications.length})
                      </h4>
                    </div>
                    <div className="divide-y max-h-48 overflow-y-auto">
                      {paymentNotifications.map(payment => {
                        const isUnread = !readNotifications.some(n => n.paymentId === payment._id);
                        const isOverdue = payment.isOverdue;
                        return (
                          <div 
                            key={payment._id}
                            onClick={() => handlePaymentClick(payment)}
                            className={`p-3 hover:bg-gray-50 cursor-pointer relative ${isUnread ? 'bg-orange-50' : ''}`}
                          >
                            {isUnread && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                            )}
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <p className={`text-sm ${isUnread ? 'font-semibold text-navy' : 'font-medium text-gray-700'}`}>
                                  {payment.lead?.leadId} — {payment.lead?.name}
                                </p>
                                <p className="text-xs text-gray-600 mt-0.5">{payment.courseName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                    <Calendar size={10} />
                                    {new Date(payment.nextPaymentDate).toLocaleDateString('en-GB')}
                                  </span>
                                  <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                                    {isOverdue ? 'OVERDUE' : 'DUE TODAY'}
                                  </span>
                                </div>
                                <p className="text-xs text-orange-700 font-semibold mt-1">
                                  Due: ৳ {payment.dueAmount || 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Follow-up Notifications (Admission/Admin/SuperAdmin) */}
                {['Admission', 'Admin', 'SuperAdmin'].includes(user?.role) && followUpNotifications.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-purple-50 border-b border-purple-200">
                      <h4 className="text-xs font-bold text-purple-700 uppercase flex items-center gap-1">
                        <Bell size={12} />
                        Follow-up Due ({followUpNotifications.length})
                      </h4>
                    </div>
                    <div className="divide-y max-h-48 overflow-y-auto">
                      {followUpNotifications.map(lead => {
                        const isUnread = !readNotifications.some(n => n.leadId === lead._id);
                        const isOverdue = lead.isOverdue;
                        const isAdminOrSA = ['Admin', 'SuperAdmin'].includes(user?.role);
                        return (
                          <div 
                            key={lead._id}
                            onClick={() => handleFollowUpClick(lead)}
                            className={`p-3 hover:bg-gray-50 cursor-pointer relative ${isUnread ? 'bg-purple-50' : ''}`}
                          >
                            {isUnread && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                            )}
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-sm flex-1 ${isUnread ? 'font-semibold text-navy' : 'font-medium text-gray-700'}`}>
                                    {lead.leadId} — {lead.name}
                                  </p>
                                  {isAdminOrSA && lead.assignedTo && (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                      👤 {lead.assignedTo.name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">{lead.interestedCourse || 'No course'} • {lead.status}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                                    <Calendar size={10} />
                                    {new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB')}
                                  </span>
                                  <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-purple-600'}`}>
                                    {isOverdue ? 'OVERDUE' : 'DUE TODAY'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {lead.phone} {lead.email && `• ${lead.email}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Task Notifications */}
                {urgentTasks.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
                      <h4 className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1">
                        <Calendar size={12} />
                        Urgent Tasks ({urgentTasks.length})
                      </h4>
                    </div>
                    <div className="divide-y max-h-48 overflow-y-auto">
                      {urgentTasks.map(task => {
                        const deadlineColor = getDeadlineColor(task.dueDate, task.status);
                        const isUnread = !readNotifications.some(n => n.taskId === task._id);
                        return (
                          <div 
                            key={task._id}
                            onClick={() => handleTaskClick(task)}
                            className={`p-3 hover:bg-gray-50 cursor-pointer relative ${isUnread ? 'bg-blue-50' : ''}`}
                          >
                            {isUnread && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className={`text-sm ${isUnread ? 'font-semibold text-navy' : 'font-medium text-gray-700'}`}>
                                  {task.title}
                                </p>
                                <div className={`text-xs mt-1 px-2 py-1 rounded inline-flex items-center gap-1 ${deadlineColor?.bg} ${deadlineColor?.text}`}>
                                  <Calendar size={10} />
                                  {new Date(task.dueDate).toLocaleDateString('en-GB')}
                                  {deadlineColor?.label && ` - ${deadlineColor.label}`}
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${PRIORITY_COLORS[task.priority]?.bg} ${PRIORITY_COLORS[task.priority]?.text}`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* System Notifications (Leave, Handover, etc.) */}
                {systemNotifications.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-200">
                      <h4 className="text-xs font-bold text-indigo-700 uppercase flex items-center gap-1">
                        <Bell size={12} />
                        System Notifications ({systemNotifications.length})
                      </h4>
                    </div>
                    <div className="divide-y max-h-96 overflow-y-auto">
                      {systemNotifications.map(notif => {
                        const isHandoverRequest = notif.type === 'LEAVE_HANDOVER_REQUEST';
                        
                        return (
                          <div 
                            key={notif._id}
                            onClick={async () => {
                              try {
                                // For handover requests, store the notification ID and navigate to My Applications
                                if (isHandoverRequest) {
                                  console.log('🔔 Handover notification clicked:', notif);
                                  // Store the leave application ID from relatedId
                                  sessionStorage.setItem('openHandoverRequestId', notif.relatedId);
                                  sessionStorage.setItem('handoverNotificationId', notif._id);
                                  setShowNotifications(false);
                                  navigate('/my-applications');
                                } else {
                                  // For other notifications, just navigate to the link
                                  await api.markNotificationRead(notif._id);
                                  setShowNotifications(false);
                                  if (notif.link) navigate(notif.link);
                                }
                                
                                // Reload notifications
                                const data = await api.getNotifications(false, 20);
                                setSystemNotifications(data.notifications || []);
                                setUnreadNotifCount(data.unreadCount || 0);
                              } catch (e) {
                                console.error('Failed to handle notification click:', e);
                              }
                            }}
                            className={`p-3 hover:bg-gray-50 cursor-pointer relative ${!notif.isRead ? 'bg-indigo-50' : ''}`}
                          >
                            {!notif.isRead && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                            )}
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <p className={`text-sm ${!notif.isRead ? 'font-semibold text-navy' : 'font-medium text-gray-700'}`}>
                                  {notif.title}
                                  {isHandoverRequest && (
                                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                      Action Required
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notif.createdAt).toLocaleString('en-GB', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {urgentTasks.length === 0 && paymentNotifications.length === 0 && followUpNotifications.length === 0 && systemNotifications.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No notifications</p>
                  </div>
                )}

                {/* See All Button - Only show if there are notifications */}
                {(urgentTasks.length > 0 || paymentNotifications.length > 0 || followUpNotifications.length > 0 || systemNotifications.length > 0) && (
                  <div className="p-3 border-t bg-gray-50 sticky bottom-0">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/notifications');
                      }}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Bell size={16} />
                      See All Notifications
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <img src={user?.avatar} alt="avatar" className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-gold object-cover"/>
        
        {/* User info - hidden on small mobile */}
        <div className="hidden sm:block text-sm leading-tight">
          <div className="font-semibold">{user?.name}</div>
          <div className="opacity-80 text-xs">{user?.designation}</div>
        </div>
        
        {/* Profile button - responsive */}
        <a href="/profile" className="hidden md:inline-flex items-center gap-1 bg-gold text-navy px-3 py-2 rounded-2xl hover:bg-lightgold transition text-sm">
          <UserIcon size={16}/> Profile
        </a>
        
        {/* Mobile profile icon */}
        <a href="/profile" className="md:hidden p-2 bg-gold text-navy rounded-full hover:bg-lightgold transition">
          <UserIcon size={16}/>
        </a>
        
        {/* Logout button - responsive */}
        <button onClick={logout} className="hidden md:inline-flex items-center gap-1 bg-white text-navy px-3 py-2 rounded-2xl hover:bg-lightgold transition text-sm">
          <LogOut size={16}/> Logout
        </button>
        
        {/* Mobile logout icon */}
        <button onClick={logout} className="md:hidden p-2 bg-white text-navy rounded-full hover:bg-lightgold transition">
          <LogOut size={16}/>
        </button>
      </div>
    </header>
  );
}
