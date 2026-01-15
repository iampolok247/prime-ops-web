import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Video, 
  Image, 
  Phone, 
  UserCheck,
  Activity,
  Target,
  Calendar
} from 'lucide-react';

export default function HeadOfCreativeDashboard() {
  const [stats, setStats] = useState({
    dm: { totalLeads: 0, metaLeads: 0, linkedinLeads: 0, manualLeads: 0, totalExpense: 0 },
    mg: { total: 0, done: 0, inProgress: 0, queued: 0 },
    admission: { assigned: 0, counseling: 0, followUp: 0, admitted: 0, notInterested: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const { from, to } = computeRange();
      
      // Fetch DM Dashboard data
      const dmData = await api.getDMDashboard(from, to).catch(() => ({ 
        totalLeads: 0, metaLeads: 0, linkedinLeads: 0, manualLeads: 0, totalExpense: 0 
      }));
      
      // Fetch MG Stats
      const mgData = await api.getMGStats().catch(() => ({ 
        total: 0, done: 0, inProgress: 0, queued: 0 
      }));
      
      // Fetch Admission Dashboard data
      const admissionData = await api.getAdmissionDashboard(from, to).catch(() => ({ 
        assigned: 0, counseling: 0, followUp: 0, admitted: 0, notInterested: 0 
      }));

      setStats({
        dm: dmData,
        mg: mgData,
        admission: admissionData
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  function computeRange() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (period === 'daily') {
      return { 
        from: today.toISOString().slice(0, 10), 
        to: today.toISOString().slice(0, 10) 
      };
    }
    
    if (period === 'weekly') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { 
        from: weekAgo.toISOString().slice(0, 10), 
        to: today.toISOString().slice(0, 10) 
      };
    }
    
    if (period === 'monthly') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { 
        from: monthStart.toISOString().slice(0, 10), 
        to: today.toISOString().slice(0, 10) 
      };
    }
    
    if (period === 'yearly') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { 
        from: yearStart.toISOString().slice(0, 10), 
        to: today.toISOString().slice(0, 10) 
      };
    }
    
    return { from: null, to: null };
  }

  const periodLabels = {
    daily: 'Today',
    weekly: 'Last 7 Days',
    monthly: 'This Month',
    yearly: 'This Year'
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Creative Department Dashboard</h1>
          <p className="text-royal/70 mt-1">Overview of Digital Marketing, Motion Graphics, and Admission Performance</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border rounded-xl bg-white text-navy font-medium shadow-sm hover:shadow-md transition-shadow"
        >
          <option value="daily">Today</option>
          <option value="weekly">Last 7 Days</option>
          <option value="monthly">This Month</option>
          <option value="yearly">This Year</option>
        </select>
      </div>

      {/* Digital Marketing Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-navy">Digital Marketing</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Leads"
            value={stats.dm.totalLeads || 0}
            icon={<Users className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
            textColor="text-white"
          />
          <StatCard
            title="Meta Leads"
            value={stats.dm.metaLeads || 0}
            icon={<Target className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-purple-500 to-purple-600"
            textColor="text-white"
          />
          <StatCard
            title="LinkedIn Leads"
            value={stats.dm.linkedinLeads || 0}
            icon={<Activity className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-cyan-500 to-cyan-600"
            textColor="text-white"
          />
          <StatCard
            title="Total Expense"
            value={`৳${(stats.dm.totalExpense || 0).toLocaleString()}`}
            icon={<DollarSign className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-pink-500 to-pink-600"
            textColor="text-white"
          />
        </div>
      </div>

      {/* Motion Graphics Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-navy">Motion Graphics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Productions"
            value={stats.mg.total || 0}
            icon={<Video className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-violet-500 to-violet-600"
            textColor="text-white"
          />
          <StatCard
            title="Completed"
            value={stats.mg.done || 0}
            icon={<UserCheck className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-green-500 to-green-600"
            textColor="text-white"
          />
          <StatCard
            title="In Progress"
            value={stats.mg.inProgress || 0}
            icon={<Activity className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-orange-500 to-orange-600"
            textColor="text-white"
          />
          <StatCard
            title="Queued"
            value={stats.mg.queued || 0}
            icon={<Calendar className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-amber-500 to-amber-600"
            textColor="text-white"
          />
        </div>
      </div>

      {/* Admission Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-navy">Admission Pipeline</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Assigned"
            value={stats.admission.assigned || 0}
            icon={<Users className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-blue-400 to-blue-500"
            textColor="text-white"
          />
          <StatCard
            title="Counseling"
            value={stats.admission.counseling || 0}
            icon={<Phone className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-purple-400 to-purple-500"
            textColor="text-white"
          />
          <StatCard
            title="Follow-up"
            value={stats.admission.followUp || 0}
            icon={<Activity className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-orange-400 to-orange-500"
            textColor="text-white"
          />
          <StatCard
            title="Admitted"
            value={stats.admission.admitted || 0}
            icon={<UserCheck className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-green-400 to-green-500"
            textColor="text-white"
          />
          <StatCard
            title="Not Interested"
            value={stats.admission.notInterested || 0}
            icon={<Image className="w-8 h-8" />}
            bgColor="bg-gradient-to-br from-red-400 to-red-500"
            textColor="text-white"
          />
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <h3 className="text-lg font-bold text-navy mb-4">Performance Summary ({periodLabels[period]})</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-royal/70 mb-1">Lead Generation</div>
            <div className="text-2xl font-bold text-navy">{stats.dm.totalLeads || 0}</div>
            <div className="text-xs text-green-600 mt-1">Digital Marketing</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-royal/70 mb-1">Content Produced</div>
            <div className="text-2xl font-bold text-navy">{stats.mg.done || 0}</div>
            <div className="text-xs text-purple-600 mt-1">Motion Graphics</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-royal/70 mb-1">Students Admitted</div>
            <div className="text-2xl font-bold text-navy">{stats.admission.admitted || 0}</div>
            <div className="text-xs text-blue-600 mt-1">Admission</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor, textColor }) {
  return (
    <div className={`${bgColor} ${textColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-3">
        <div className="opacity-80">{icon}</div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-90 font-medium">{title}</div>
    </div>
  );
}
