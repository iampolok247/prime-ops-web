import { useEffect, useState } from 'react';
import { Activity as ActivityIcon, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiBase = import.meta.env.PROD ? 'http://31.97.228.226:5000' : 'http://localhost:5001';
      const res = await fetch(`${apiBase}/api/activities?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiBase = import.meta.env.PROD ? 'http://31.97.228.226:5000' : 'http://localhost:5001';
      const res = await fetch(`${apiBase}/api/activities/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('Error:', error);
      setStats(null);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'LOGIN': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Activity Log</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Activities</div>
            <div className="text-2xl font-bold">{stats.totalActivities || 0}</div>
          </div>
          {(stats.actionStats || []).map(stat => (
            <div key={stat._id} className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">{stat._id}</div>
              <div className="text-2xl font-bold">{stat.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Activities Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {activities.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No activities yet
                </td>
              </tr>
            ) : (
              activities.map(activity => (
                <tr key={activity._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div>{format(new Date(activity.createdAt), 'MMM dd, yyyy')}</div>
                        <div className="text-xs text-gray-500">{format(new Date(activity.createdAt), 'HH:mm:ss')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{activity.userName}</div>
                        <div className="text-xs text-gray-500">{activity.userRole}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(activity.action)}`}>
                      {activity.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium">{activity.resourceType}</div>
                    {activity.resourceName && (
                      <div className="text-xs text-gray-500">{activity.resourceName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {activity.description}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
