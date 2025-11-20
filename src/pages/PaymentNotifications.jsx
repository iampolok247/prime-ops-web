import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { AlertCircle, Calendar, DollarSign } from 'lucide-react';

export default function PaymentNotifications() {
  const { user } = useAuth();
  
  if (user?.role !== 'Coordinator' && user?.role !== 'Admin' && user?.role !== 'SuperAdmin') {
    return <div className="text-royal">Access denied</div>;
  }

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { notifications: data } = await api.getPaymentNotifications();
        setNotifications(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const overdueNotifs = notifications.filter(n => n.isOverdue);
  const upcomingNotifs = notifications.filter(n => !n.isOverdue);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy">Payment Reminders</h1>
        <p className="text-gray-600 mt-1">Upcoming and overdue payment notifications</p>
      </div>

      {/* Overdue Section */}
      {overdueNotifs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-red-600" size={24} />
            <h2 className="text-xl font-bold text-red-600">Overdue Payments ({overdueNotifs.length})</h2>
          </div>
          <div className="space-y-3">
            {overdueNotifs.map(n => (
              <div key={n._id} className="bg-red-50 border-2 border-red-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-navy">{n.lead?.leadId} — {n.lead?.name}</h3>
                      <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold">OVERDUE</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-700">
                      <div>📞 {n.lead?.phone}</div>
                      {n.lead?.email && <div>📧 {n.lead.email}</div>}
                      <div>📚 Course: {n.courseName}</div>
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} />
                        Due: ৳ {n.dueAmount || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        Expected: {new Date(n.nextPaymentDate).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/coordinator/due-fees"
                    className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Follow Up
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Section */}
      {upcomingNotifs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-orange-600" size={24} />
            <h2 className="text-xl font-bold text-orange-600">Upcoming Payments ({upcomingNotifs.length})</h2>
          </div>
          <div className="space-y-3">
            {upcomingNotifs.map(n => (
              <div key={n._id} className="bg-orange-50 border border-orange-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-navy">{n.lead?.leadId} — {n.lead?.name}</h3>
                      <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
                        {n.daysUntil} DAYS LEFT
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-700">
                      <div>📞 {n.lead?.phone}</div>
                      {n.lead?.email && <div>📧 {n.lead.email}</div>}
                      <div>📚 Course: {n.courseName}</div>
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} />
                        Due: ৳ {n.dueAmount || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        Due Date: {new Date(n.nextPaymentDate).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/coordinator/due-fees"
                    className="ml-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notifications.length === 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 text-lg">No upcoming or overdue payments</p>
        </div>
      )}
    </div>
  );
}
