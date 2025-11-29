import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Target, Plus, Trash2, Calendar, TrendingUp, User, Users } from 'lucide-react';

export default function AdmissionTargets() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [targets, setTargets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    courseId: '',
    month: '',
    target: ''
  });

  // Generate month options (current month + 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const yearMonth = date.toISOString().slice(0, 7); // YYYY-MM
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value: yearMonth, label });
    }
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Set default month to current month
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    setSelectedMonth(currentMonth);
    setFormData({ ...formData, month: currentMonth });
  }, []);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log('Fetching courses...');
        const data = await api.listCourses();
        console.log('Courses response:', data);
        setCourses(data?.courses || []);
        if (!data?.courses || data.courses.length === 0) {
          setError('No courses found. Please add courses first.');
        }
      } catch (e) {
        console.error('Failed to load courses:', e);
        setError('Failed to load courses: ' + e.message);
      }
    };
    fetchCourses();
  }, []);

  // Fetch targets when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchTargets();
    }
  }, [selectedMonth]);

  const fetchTargets = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdmissionTargets(selectedMonth);
      setTargets(data?.targets || []);
    } catch (e) {
      setError('Failed to load targets: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.courseId || !formData.month || !formData.target) {
      setError('Please fill all fields');
      return;
    }

    try {
      await api.setAdmissionTarget({
        courseId: formData.courseId,
        month: formData.month,
        target: parseInt(formData.target)
      });
      setSuccess('Target set successfully!');
      setFormData({ courseId: '', month: selectedMonth, target: '' });
      fetchTargets();
    } catch (e) {
      setError('Failed to set target: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this target?')) return;
    try {
      await api.deleteAdmissionTarget(id);
      setSuccess('Target deleted successfully!');
      fetchTargets();
    } catch (e) {
      setError('Failed to delete target: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Target className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admission Targets</h1>
            <p className="text-sm text-gray-600">Set and manage monthly admission targets by course</p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Set Target Form - Only for Admin/SuperAdmin */}
      {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus size={20} />
            Set New Target
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course {courses.length > 0 && <span className="text-xs text-gray-500">({courses.length} available)</span>}
            </label>
            <select
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              disabled={courses.length === 0}
            >
              <option value="">{courses.length === 0 ? 'No courses available' : 'Select Course'}</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="text-xs text-red-600 mt-1">Please add courses first from the Courses page</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target</label>
            <input
              type="number"
              min="0"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter target"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Set Target
            </button>
          </div>
        </form>
        </div>
      )}

      {/* View Targets by Month */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Calendar size={20} />
            Targets & Achievement
          </h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading targets...</div>
        ) : targets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No targets set for {monthOptions.find(m => m.value === selectedMonth)?.label}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Course Name</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Target</th>
                  {user?.role === 'Admission' ? (
                    <>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">
                        <div className="flex items-center justify-center gap-1">
                          <User size={14} />
                          My Achievement
                        </div>
                      </th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">
                        <div className="flex items-center justify-center gap-1">
                          <Users size={14} />
                          Team Achievement
                        </div>
                      </th>
                    </>
                  ) : (
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Achieved</th>
                  )}
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Progress</th>
                  {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => {
                  const percentage = t.percentage || 0;
                  const teamPercentage = t.teamPercentage || 0;
                  const color = percentage >= 100 ? 'green' : percentage >= 75 ? 'blue' : percentage >= 50 ? 'yellow' : 'red';
                  const teamColor = teamPercentage >= 100 ? 'green' : teamPercentage >= 75 ? 'blue' : teamPercentage >= 50 ? 'yellow' : 'red';
                  
                  return (
                    <tr key={t._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {t.course?.name || 'Unknown Course'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        {t.target}
                      </td>
                      {user?.role === 'Admission' ? (
                        <>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm font-semibold text-gray-700">{t.achieved}</span>
                              <span className={`text-xs font-semibold text-${color}-600`}>{percentage}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm font-semibold text-gray-700">{t.teamAchieved || 0}</span>
                              <span className={`text-xs font-semibold text-${teamColor}-600`}>{teamPercentage}%</span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          {t.achieved}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {user?.role === 'Admission' ? (
                          <div className="flex flex-col gap-2">
                            {/* My Progress */}
                            <div className="flex items-center gap-2">
                              <User size={12} className="text-gray-500" />
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full bg-${color}-500`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                            {/* Team Progress */}
                            <div className="flex items-center gap-2">
                              <Users size={12} className="text-gray-500" />
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full bg-${teamColor}-500`}
                                  style={{ width: `${Math.min(teamPercentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full bg-${color}-500`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold text-${color}-600`}>
                              {percentage}%
                            </span>
                          </div>
                        )}
                      </td>
                      {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(t._id)}
                            className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Target"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
