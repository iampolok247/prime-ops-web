import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DollarSign, AlertCircle, Calendar, TrendingUp, Users } from 'lucide-react';

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  
  if (user?.role !== 'Coordinator' && user?.role !== 'Admin' && user?.role !== 'SuperAdmin') {
    return <div className="text-royal">Access denied</div>;
  }

  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, notifData] = await Promise.all([
          api.getCoordinatorDashboardStats(),
          api.getPaymentNotifications()
        ]);
        setStats(statsData);
        setNotifications(notifData.notifications || []);
      } catch (e) {
        console.error('Load failed:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const StatCard = ({ icon, label, value, color, link }) => (
    <Link to={link} className={`bg-white rounded-2xl shadow-soft p-6 hover:shadow-lg transition-shadow border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-navy">{value}</p>
        </div>
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color.replace('border-', 'bg-').replace('-500', '-100')}`}>
          {icon}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy">Coordinator Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage due fees and payment collections</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          icon={<Users size={28} className="text-blue-600" />}
          label="Total Students with Dues"
          value={stats?.totalWithDues || 0}
          color="border-blue-500"
          link="/coordinator/due-fees"
        />
        <StatCard
          icon={<AlertCircle size={28} className="text-red-600" />}
          label="Overdue Payments"
          value={stats?.overdue || 0}
          color="border-red-500"
          link="/coordinator/notifications"
        />
        <StatCard
          icon={<Calendar size={28} className="text-orange-600" />}
          label="Due This Week"
          value={stats?.dueThisWeek || 0}
          color="border-orange-500"
          link="/coordinator/notifications"
        />
        <StatCard
          icon={<DollarSign size={28} className="text-green-600" />}
          label="Total Due Amount"
          value={`৳ ${(stats?.totalDueAmount || 0).toLocaleString()}`}
          color="border-green-500"
          link="/coordinator/due-fees"
        />
      </div>

      {user?.role === 'Coordinator' && (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center gap-4">
            <TrendingUp size={40} />
            <div>
              <p className="text-lg font-semibold">Your Follow-ups Today</p>
              <p className="text-3xl font-bold mt-1">{stats?.myFollowUpsToday || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Notifications */}
      <div className="bg-white rounded-2xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-navy flex items-center gap-2">
            <Calendar className="text-orange-500" size={24} />
            Upcoming & Overdue Payments
          </h2>
          <Link to="/coordinator/notifications" className="text-blue-600 hover:underline text-sm font-medium">
            View All
          </Link>
        </div>

        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No upcoming or overdue payments</p>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((n) => (
              <Link
                key={n._id}
                to="/coordinator/due-fees"
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-navy">
                    {n.lead?.leadId} — {n.lead?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {n.lead?.phone} {n.lead?.email && `• ${n.lead.email}`}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Course: {n.courseName} | Due: ৳ {n.dueAmount || 0}
                  </p>
                </div>
                <div className="text-right ml-4">
                  {n.isOverdue ? (
                    <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      Overdue
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      {n.daysUntil} days left
                    </span>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(n.nextPaymentDate).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
