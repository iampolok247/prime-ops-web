import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Target, Plus, Trash2, Calendar, TrendingUp, Users, DollarSign, Briefcase } from 'lucide-react';

export default function Targets() {
  const [activeTab, setActiveTab] = useState('admission'); // 'admission' or 'recruitment'
  const [activeSubTab, setActiveSubTab] = useState('student'); // 'student' or 'revenue'
  const [courses, setCourses] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [targets, setTargets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMember, setSelectedMember] = useState(''); // Filter by team member
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    courseId: '',
    month: '',
    targetValue: '',
    assignedTo: '',
    note: ''
  });

  // Generate month options (current month + 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    for (let i = 0; i < 12; i++) {
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const month = (currentMonth + i) % 12;
      
      // Create YYYY-MM string directly without timezone issues
      const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      // Create label using the same year/month values
      const labelDate = new Date(year, month, 1);
      const label = labelDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
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

  // Fetch courses for Admission Student targets
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await api.listCourses();
        setCourses(data?.courses || []);
      } catch (e) {
        console.error('Failed to load courses:', e);
      }
    };
    fetchCourses();
  }, []);

  // Fetch team members based on active tab
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const role = activeTab === 'admission' ? 'Admission' : 'Recruitment';
        const data = await api.getTeamMembers(role);
        setTeamMembers(data?.members || []);
      } catch (e) {
        console.error('Failed to load team members:', e);
      }
    };
    fetchTeamMembers();
  }, [activeTab]);

  // Fetch targets when parameters change
  useEffect(() => {
    if (selectedMonth) {
      fetchTargets();
    }
  }, [selectedMonth, activeTab, activeSubTab, selectedMember]);

  const getTargetType = () => {
    if (activeTab === 'admission') {
      return activeSubTab === 'student' ? 'AdmissionStudent' : 'AdmissionRevenue';
    } else {
      return activeSubTab === 'student' ? 'RecruitmentCandidate' : 'RecruitmentRevenue';
    }
  };

  const fetchTargets = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    setError('');
    try {
      const targetType = getTargetType();
      const data = await api.getTargets(selectedMonth, targetType, selectedMember || null);
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

    const targetType = getTargetType();

    // Validation
    if (!formData.month || !formData.targetValue) {
      setError('Please fill all required fields');
      return;
    }

    // For AdmissionStudent, course is required
    if (targetType === 'AdmissionStudent' && !formData.courseId) {
      setError('Please select a course');
      return;
    }

    try {
      const payload = {
        targetType,
        month: formData.month,
        targetValue: parseInt(formData.targetValue),
        ...(formData.courseId && { courseId: formData.courseId }),
        ...(formData.assignedTo && { assignedTo: formData.assignedTo }),
        ...(formData.note && { note: formData.note })
      };

      await api.setTarget(payload);
      setSuccess('Target set successfully!');
      setFormData({ courseId: '', month: selectedMonth, targetValue: '', assignedTo: '', note: '' });
      fetchTargets();
    } catch (e) {
      setError('Failed to set target: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this target?')) return;
    try {
      await api.deleteTarget(id);
      setSuccess('Target deleted successfully!');
      fetchTargets();
    } catch (e) {
      setError('Failed to delete target: ' + e.message);
    }
  };

  const getValueLabel = () => {
    if (activeSubTab === 'student') {
      return activeTab === 'admission' ? 'Students' : 'Candidates';
    }
    return 'BDT';
  };

  const formatValue = (value) => {
    if (activeSubTab === 'revenue') {
      return `৳${value.toLocaleString()}`;
    }
    return value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
            <Target className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Targets</h1>
            <p className="text-sm text-gray-600">Set and track performance targets for admission and recruitment teams</p>
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

      {/* Main Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => { setActiveTab('admission'); setActiveSubTab('student'); }}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'admission'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Admission Targets
          </div>
        </button>
        <button
          onClick={() => { setActiveTab('recruitment'); setActiveSubTab('student'); }}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'recruitment'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Briefcase size={18} />
            Recruitment Targets
          </div>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('student')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSubTab === 'student'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {activeTab === 'admission' ? 'Student Target' : 'Candidate Target'}
        </button>
        <button
          onClick={() => setActiveSubTab('revenue')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSubTab === 'revenue'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign size={16} />
            Revenue Target
          </div>
        </button>
      </div>

      {/* Set Target Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Plus size={20} />
          Set New Target
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Course field - only for AdmissionStudent */}
          {getTargetType() === 'AdmissionStudent' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Target Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target ({getValueLabel()}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.targetValue}
              onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Enter target"
              required
            />
          </div>

          {/* Assign to Team Member (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Member (Optional)
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Team Target</option>
              {teamMembers.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (Optional)
            </label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Add note"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Set Target
            </button>
          </div>
        </form>
      </div>

      {/* View Targets */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp size={20} />
            Targets & Achievement
          </h2>
          <div className="flex gap-3">
            {/* Filter by Team Member */}
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Team Members</option>
              {teamMembers.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>

            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => {
                console.log('[Month Filter] Changing from', selectedMonth, 'to', e.target.value);
                setSelectedMonth(e.target.value);
              }}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Future Month Warning */}
        {(() => {
          const currentMonth = new Date().toISOString().slice(0, 7);
          const isFutureMonth = selectedMonth > currentMonth;
          const isCurrentMonth = selectedMonth === currentMonth;
          
          // Debug logging
          console.log('[Banner] currentMonth:', currentMonth, 'selectedMonth:', selectedMonth, 'isFuture:', isFutureMonth, 'isCurrent:', isCurrentMonth);
          
          if (isFutureMonth) {
            return (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-start gap-2">
                <Calendar size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Future Month Selected</p>
                  <p className="text-sm">You are viewing targets for {monthOptions.find(m => m.value === selectedMonth)?.label}. Achievement data will be calculated as the month progresses.</p>
                </div>
              </div>
            );
          }
          
          if (isCurrentMonth) {
            return (
              <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-start gap-2">
                <Calendar size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Current Month</p>
                  <p className="text-sm">Achievement is calculated up to today. Final results will be available at month end.</p>
                </div>
              </div>
            );
          }
          
          return null;
        })()}

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
                  {getTargetType() === 'AdmissionStudent' && (
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Course</th>
                  )}
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Assigned To</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Target</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Achieved</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Progress</th>
                  {targets.some(t => t.note) && (
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Note</th>
                  )}
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => {
                  const percentage = t.percentage || 0;
                  const color = percentage >= 100 ? 'green' : percentage >= 75 ? 'blue' : percentage >= 50 ? 'yellow' : 'red';
                  
                  return (
                    <tr key={t._id} className="border-b hover:bg-gray-50">
                      {getTargetType() === 'AdmissionStudent' && (
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {t.course?.name || 'N/A'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {t.assignedTo ? (
                          <div>
                            <div className="font-medium">{t.assignedTo.name}</div>
                            <div className="text-xs text-gray-500">{t.assignedTo.role}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Team Target</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        {formatValue(t.targetValue)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        {formatValue(t.achieved)}
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      {targets.some(t => t.note) && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {t.note || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(t._id)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Target"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
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
