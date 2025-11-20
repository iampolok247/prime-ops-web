import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Target, Calendar, TrendingUp } from 'lucide-react';

export default function MyTargets() {
  const { user } = useAuth();
  const [targets, setTargets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    setSelectedMonth(currentMonthStr);
  }, []);

  // Fetch targets when month changes
  useEffect(() => {
    if (selectedMonth && user) {
      fetchMyTargets();
    }
  }, [selectedMonth, user]);

  const fetchMyTargets = async () => {
    if (!selectedMonth || !user) return;
    setLoading(true);
    setError('');
    try {
      // Fetch only targets assigned to current user
      // For Admission role, fetch AdmissionStudent and AdmissionRevenue targets
      const studentTargets = await api.getTargets(selectedMonth, 'AdmissionStudent', user.id);
      const revenueTargets = await api.getTargets(selectedMonth, 'AdmissionRevenue', user.id);
      
      // Combine both types
      const allTargets = [
        ...(studentTargets?.targets || []),
        ...(revenueTargets?.targets || [])
      ];
      
      setTargets(allTargets);
    } catch (e) {
      setError('Failed to load targets: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value, type) => {
    if (type === 'AdmissionRevenue') {
      return `৳${value.toLocaleString()}`;
    }
    return value.toString();
  };

  const getTargetTypeLabel = (type) => {
    switch (type) {
      case 'AdmissionStudent':
        return 'Student Target';
      case 'AdmissionRevenue':
        return 'Revenue Target';
      default:
        return type;
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
            <h1 className="text-2xl font-bold text-gray-800">My Targets</h1>
            <p className="text-sm text-gray-600">View your assigned performance targets</p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* View Targets */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp size={20} />
            Targets & Achievement
          </h2>
          
          {/* Month Selector */}
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

        {/* Month Status Banner */}
        {(() => {
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth() + 1;
          const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
          const isFutureMonth = selectedMonth > currentMonthStr;
          const isCurrentMonth = selectedMonth === currentMonthStr;
          
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
            <Target size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No targets assigned for {monthOptions.find(m => m.value === selectedMonth)?.label}</p>
            <p className="text-sm mt-1">Your targets will appear here once they are set by your admin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Target Type</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Course</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Target</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Achieved</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Progress</th>
                  {targets.some(t => t.note) && (
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Note</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => {
                  const percentage = t.percentage || 0;
                  const color = percentage >= 100 ? 'green' : percentage >= 75 ? 'blue' : percentage >= 50 ? 'yellow' : 'red';
                  
                  return (
                    <tr key={t._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {getTargetTypeLabel(t.targetType)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {t.course?.name || 'All Courses'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        {formatValue(t.targetValue, t.targetType)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        {formatValue(t.achieved, t.targetType)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full bg-${color}-500`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-semibold text-${color}-600 min-w-[45px] text-right`}>
                            {percentage}%
                          </span>
                        </div>
                      </td>
                      {targets.some(t => t.note) && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {t.note || '-'}
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

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About Your Targets</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Student Target:</strong> Number of students you need to admit for specific courses</li>
          <li>• <strong>Revenue Target:</strong> Total admission fees you need to collect</li>
          <li>• Progress is updated in real-time based on your actual admissions</li>
          <li>• Contact your admin if you have questions about your targets</li>
        </ul>
      </div>
    </div>
  );
}
