import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function OpsAttendance() {
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState([]);
  const [view, setView] = useState('today'); // 'today', 'report'
  const [reportData, setReportData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [error, setError] = useState('');

  useEffect(() => {
    if (view === 'today') {
      loadTodayAttendance();
    } else {
      loadReport();
    }
  }, [view, selectedDate]);

  const loadTodayAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getAllAttendance({ date: selectedDate });
      setAttendances(data.attendances || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getAttendanceReport(fromDate, toDate);
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return format(new Date(date), 'hh:mm a');
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">OPS Attendance</h1>

      {/* View Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setView('today')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === 'today'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Daily Attendance
        </button>
        <button
          onClick={() => setView('report')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === 'report'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Attendance Report
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
      )}

      {view === 'today' && (
        <>
          {/* Date Picker */}
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={loadTodayAttendance}
              className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Load
            </button>
          </div>

          {/* Today's Attendance Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Attendance for {format(new Date(selectedDate), 'dd MMMM yyyy')}
              </h2>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : attendances.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No attendance records for this date</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Login Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Logout Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendances.map((att) => (
                    <tr key={att._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{att.user?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{att.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {att.user?.role || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-green-600 font-medium">{formatTime(att.loginTime)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {att.logoutTime ? (
                          <span className="text-red-600 font-medium">{formatTime(att.logoutTime)}</span>
                        ) : (
                          <span className="text-yellow-600 text-sm">Still working</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatMinutes(att.totalHours)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          att.status === 'Present' 
                            ? 'bg-green-100 text-green-800'
                            : att.status === 'Late'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {att.status || 'Present'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {view === 'report' && (
        <>
          {/* Date Range Picker */}
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={loadReport}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Generate Report
              </button>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Attendance Report: {format(new Date(fromDate), 'dd MMM yyyy')} - {format(new Date(toDate), 'dd MMM yyyy')}
              </h2>
              {reportData && (
                <p className="text-sm text-gray-500 mt-1">
                  Total Working Days: {reportData.totalWorkingDays}
                </p>
              )}
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : !reportData?.report?.length ? (
              <div className="p-8 text-center text-gray-500">No data for this period</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Present Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absent Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.report.map((r) => {
                    const absentDays = r.totalDays - r.presentDays;
                    const attendancePercent = r.totalDays > 0 
                      ? Math.round((r.presentDays / r.totalDays) * 100) 
                      : 0;
                    return (
                      <tr key={r.user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{r.user.name}</div>
                          <div className="text-sm text-gray-500">{r.user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {r.user.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-green-600 font-medium">{r.presentDays}</span>
                          <span className="text-gray-400 text-sm"> / {r.totalDays}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={absentDays > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {absentDays}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-medium ${
                            attendancePercent >= 90 ? 'text-green-600' :
                            attendancePercent >= 70 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {attendancePercent}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatMinutes(r.totalMinutes)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
