// web/src/pages/dash/MyLite.jsx
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Clock } from 'lucide-react';

export default function MyLite() {
  const [openTasks, setOpenTasks] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState(null);

  async function loadTasks() {
    const tasks = await api.listMyTasks().catch(()=>[]);
    setOpenTasks((tasks || []).filter(t => (t.status || '').toLowerCase() !== 'done').length);
  }

  useEffect(()=> {
    loadTasks();
    // Fetch today's attendance
    (async () => {
      try {
        const data = await api.getTodayAttendance();
        setTodayAttendance(data.attendance);
      } catch (error) {
        console.error('Failed to load today attendance:', error);
      }
    })();
    // Real-time polling every 30 seconds
    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy">My Dashboard</h1>
        {/* Today's Attendance */}
        {todayAttendance?.loginTime && (
          <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-xl border border-green-200">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              Today Login: {new Date(todayAttendance.loginTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-royal text-sm">My Open Tasks</div>
          <div className="text-3xl font-extrabold">{openTasks}</div>
        </div>
      </div>
    </div>
  );
}
