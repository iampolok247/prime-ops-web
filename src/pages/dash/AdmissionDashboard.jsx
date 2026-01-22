// web/src/pages/dash/AdmissionDashboard.jsx
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ClipboardList, 
  PhoneCall,
  GraduationCap,
  TrendingUp,
  BarChart2,
  Download,
  Filter
} from 'lucide-react';

function fmtDT(d){ if (!d) return '-'; try { return new Date(d).toLocaleString(); } catch { return d; } }

function LineChartDualSmall({ data }){
  const width = 700, height = 220, padding = 40;
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
        <div className="text-center">
          <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">No data available</p>
        </div>
      </div>
    );
  }
  
  const max = Math.max(...data.map(d=>Math.max(d.leads||0,d.admitted||0)), 1);
  const stepX = (width - padding*2) / Math.max(1, data.length-1);
  
  const leadsPoints = data.map((d,i)=>`${padding + i*stepX},${height - padding - (max ? (d.leads / max) * (height - padding*2) : 0)}`).join(' ');
  const admittedPoints = data.map((d,i)=>`${padding + i*stepX},${height - padding - (max ? (d.admitted / max) * (height - padding*2) : 0)}`).join(' ');
  
  // Create gradient fill areas
  const leadsArea = `${leadsPoints} ${padding + (data.length-1)*stepX},${height-padding} ${padding},${height-padding}`;
  const admittedArea = `${admittedPoints} ${padding + (data.length-1)*stepX},${height-padding} ${padding},${height-padding}`;
  
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
        <defs>
          <linearGradient id="leadsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="admittedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={height - padding - (height - padding*2) * ratio}
            x2={width - padding}
            y2={height - padding - (height - padding*2) * ratio}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}
        
        {/* Area fills */}
        <polygon fill="url(#leadsGradient)" points={leadsArea} />
        <polygon fill="url(#admittedGradient)" points={admittedArea} />
        
        {/* Lines */}
        <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={leadsPoints} strokeLinecap="round" strokeLinejoin="round" />
        <polyline fill="none" stroke="#10b981" strokeWidth="3" points={admittedPoints} strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + i * stepX;
          const yLeads = height - padding - (max ? (d.leads / max) * (height - padding*2) : 0);
          const yAdmitted = height - padding - (max ? (d.admitted / max) * (height - padding*2) : 0);
          return (
            <g key={i}>
              <circle cx={x} cy={yLeads} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
              <circle cx={x} cy={yAdmitted} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const STATUSES = [
  { key:'Assigned', label:'Assigned' },
  { key:'Counseling', label:'Counseling' },
  { key:'In Follow Up', label:'In Follow-Up' },
  { key:'Admitted', label:'Admitted' },
  { key:'Not Interested', label:'Not Interested' },
];

export default function AdmissionDashboard() {
  const { user } = useAuth();
  const [err, setErr] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [allLeads, setAllLeads] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchCategoryFilter, setBatchCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  
  // Admin/SuperAdmin specific filters
  const [admissionUsers, setAdmissionUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [reportData, setReportData] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const isAdminOrSA = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const isAdmission = user?.role === 'Admission';

  // Load all leads and batches once
  useEffect(()=> {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      // Fetch all leads and batches
      const promises = [
        api.listAdmissionLeads().catch(()=>({ leads: [] })),
        api.listBatches().catch(()=>({ batches: [] }))
      ];
      
      // If Admin/SuperAdmin, also load admission users and reports
      if (isAdminOrSA) {
        promises.push(api.listAdmissionUsers().catch(()=>({ users: [] })));
      }
      
      const results = await Promise.all(promises);
      const [leadsResp, batchesResp, usersResp] = results;
      
      const leads = leadsResp?.leads || leadsResp || [];
      setAllLeads(Array.isArray(leads) ? leads : []);
      setBatches(batchesResp?.batches || []);
      
      if (isAdminOrSA && usersResp) {
        const users = usersResp?.users || [];
        setAdmissionUsers(Array.isArray(users) ? users : []);
      }
      
      // Load initial report data for both Admin/SuperAdmin and Admission
      if (isAdminOrSA || isAdmission) {
        loadReports();
      }
      
      setErr('');
    } catch(e) { 
      setErr(e.message || 'Failed to load'); 
    } finally {
      setLoading(false);
    }
  }

  async function loadReports() {
    if (!isAdminOrSA && !isAdmission) return;
    
    try {
      const { from: rangeFrom, to: rangeTo } = parseRange();
      const fromDate = rangeFrom ? rangeFrom.toISOString().slice(0, 10) : undefined;
      const toDate = rangeTo ? rangeTo.toISOString().slice(0, 10) : undefined;
      
      // For Admission users, use their own ID. For Admin/SuperAdmin, use selectedUser
      const userId = isAdmission ? user._id : (selectedUser === 'all' ? undefined : selectedUser);
      const data = await api.getAdmissionReports(userId, fromDate, toDate);
      setReportData(data);
    } catch(e) {
      console.error('Failed to load reports:', e);
    }
  }

  // Reload reports when filters change
  useEffect(() => {
    if (isAdmission || (isAdminOrSA && admissionUsers.length > 0)) {
      loadReports();
    }
  }, [selectedUser, period, from, to]);

  const parseRange = () => {
    if (period === 'lifetime') return { from: null, to: null };
    if (period === 'custom') {
      if (from && to) {
        const f = new Date(from);
        f.setHours(0, 0, 0, 0);
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        return { from: f, to: t };
      }
      // If custom selected but dates not set yet, return null to show all data
      return { from: null, to: null };
    }
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    let f = new Date();
    f.setHours(0, 0, 0, 0); // Start of day
    
    if (period === 'daily') { 
      // Today only: from = today at 00:00, to = today at 23:59:59
      f.setDate(now.getDate());
      return { from: f, to: now };
    }
    else if (period === 'weekly') { f.setDate(now.getDate() - 7); }
    else if (period === 'monthly') { f.setMonth(now.getMonth() - 1); }
    else if (period === 'yearly') { f.setFullYear(now.getFullYear() - 1); }
    return { from: f, to: now };
  };

  const inRange = (d, fromD, toD) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    if (fromD && t < fromD.getTime()) return false;
    if (toD && t > toD.getTime()) return false;
    return true;
  };

  const { from: rangeFrom, to: rangeTo } = parseRange();

  const metrics = React.useMemo(() => {
    const fromD = rangeFrom ? new Date(rangeFrom) : null;
    const toD = rangeTo ? new Date(rangeTo) : null;

    const leadsInRange = allLeads.filter(l => inRange(l.createdAt, fromD, toD) || (!fromD && !toD));

    const counts = {};
    // "Assigned" card shows TOTAL leads created in the period (all statuses)
    counts['Assigned'] = leadsInRange.length;
    
    // Counseling count from API (LeadActivity based)
    const counselingFromStats = reportData?.stats?.counseling;
    const counselingFromReports = reportData?.reports?.reduce((sum, r) => sum + (r.stats?.counseling || 0), 0);
    counts['Counseling'] = counselingFromStats || counselingFromReports || 0;
    
    console.log('[Dashboard] Metrics calculation:', {
      period,
      rangeFrom: rangeFrom?.toISOString(),
      rangeTo: rangeTo?.toISOString(),
      reportData: reportData ? 'exists' : 'null',
      counselingFromStats,
      counselingFromReports,
      finalCounseling: counts['Counseling']
    });
    
    // Other cards show current status counts
    STATUSES.forEach(s => {
      if (s.key !== 'Assigned' && s.key !== 'Counseling') {
        counts[s.key] = leadsInRange.filter(l => l.status === s.key).length;
      }
    });

    // Compute series for chart
    const series = [];
    if (fromD && toD) {
      const cur = new Date(fromD);
      while (cur <= toD) {
        const key = cur.toISOString().slice(0,10);
        const leadsCount = allLeads.filter(l => {
          const d = new Date(l.createdAt);
          return d && d.toISOString().slice(0,10) === key;
        }).length;
        const admittedCount = allLeads.filter(l => {
          const d = l.admittedAt ? new Date(l.admittedAt) : null;
          return d && d.toISOString().slice(0,10) === key;
        }).length;
        series.push({ date: key, leads: leadsCount, admitted: admittedCount });
        cur.setDate(cur.getDate()+1);
      }
    }

    // Calculate report metrics from the same leadsInRange data
    const reportMetrics = {
      totalLeads: leadsInRange.length,
      assigned: leadsInRange.filter(l => l.status === 'Assigned').length,
      counseling: counts['Counseling'] || 0, // Use API count (from LeadActivity)
      inFollowUp: leadsInRange.filter(l => l.status === 'In Follow Up').length,
      admitted: leadsInRange.filter(l => l.status === 'Admitted').length,
  notAdmitted: leadsInRange.filter(l => ['Not Admitted','Not Interested'].includes(l.status)).length
    };
    
    const conversionRate = reportMetrics.totalLeads > 0 
      ? ((reportMetrics.admitted / reportMetrics.totalLeads) * 100).toFixed(2)
      : '0.00';

    return { counts, series, reportMetrics, conversionRate };
  }, [allLeads, rangeFrom, rangeTo, reportData]);

  const getStatusIcon = (key) => {
    const icons = {
      'Assigned': <ClipboardList className="w-5 h-5 text-white" />,
      'Counseling': <PhoneCall className="w-5 h-5 text-white" />,
      'In Follow Up': <Users className="w-5 h-5 text-white" />,
      'Admitted': <GraduationCap className="w-5 h-5 text-white" />,
  'Not Interested': <UserX className="w-5 h-5 text-white" />
    };
    return icons[key] || <Users className="w-5 h-5 text-white" />;
  };

  const getStatusColor = (key) => {
    const colors = {
      'Assigned': 'from-blue-500 to-indigo-600',
      'Counseling': 'from-purple-500 to-violet-600',
      'In Follow Up': 'from-orange-500 to-amber-600',
      'Admitted': 'from-green-500 to-emerald-600',
  'Not Interested': 'from-red-500 to-pink-600'
    };
    return colors[key] || 'from-gray-500 to-slate-600';
  };

  // Download report as CSV
  const downloadReport = () => {
    if (!reportData) return;
    
    setDownloadingReport(true);
    try {
      let csvContent = '';
      
      if (selectedUser === 'all') {
        // Download all users report with overall summary at top (using local metrics)
        csvContent = 'ADMISSION TEAM REPORT\n';
        csvContent += `Period: ${period === 'custom' && from && to ? `${from} to ${to}` : period}\n`;
        csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Overall Summary First (from local metrics to match displayed data)
        csvContent += 'OVERALL TEAM SUMMARY\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Total Leads,${metrics.reportMetrics?.totalLeads || 0}\n`;
        csvContent += `Assigned,${metrics.reportMetrics?.assigned || 0}\n`;
        csvContent += `Counseling,${metrics.reportMetrics?.counseling || 0}\n`;
        csvContent += `In Follow Up,${metrics.reportMetrics?.inFollowUp || 0}\n`;
        csvContent += `Admitted,${metrics.reportMetrics?.admitted || 0}\n`;
  csvContent += `Not Interested,${metrics.reportMetrics?.notAdmitted || 0}\n`;
        csvContent += `Conversion Rate,${metrics.conversionRate || '0.00'}%\n\n`;
        
        // Individual Reports by Name (Alphabetically sorted)
        if (reportData && reportData.reports && reportData.reports.length > 0) {
          csvContent += 'INDIVIDUAL REPORTS BY TEAM MEMBER\n\n';
          
          // Sort reports by user name
          const sortedReports = [...reportData.reports].sort((a, b) => 
            a.user.name.localeCompare(b.user.name)
          );
          
          sortedReports.forEach((r, index) => {
            csvContent += `${index + 1}. ${r.user.name.toUpperCase()}\n`;
            csvContent += `Email: ${r.user.email}\n`;
            csvContent += `Total Leads,${r.stats.totalLeads}\n`;
            csvContent += `Assigned,${r.stats.assigned}\n`;
            csvContent += `Counseling,${r.stats.counseling}\n`;
            csvContent += `In Follow Up,${r.stats.inFollowUp}\n`;
            csvContent += `Admitted,${r.stats.admitted}\n`;
            csvContent += `Not Interested,${r.stats.notAdmitted}\n`;
            csvContent += `Conversion Rate,${r.conversionRate}%\n\n`;
          });
        }
      } else {
        // Download individual user report with lead details
        csvContent = `Admission Report - ${reportData.user.name}\n`;
        csvContent += `Email: ${reportData.user.email}\n`;
        csvContent += `Period: ${period === 'custom' && from && to ? `${from} to ${to}` : period}\n`;
        csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        csvContent += 'SUMMARY\n';
        csvContent += `Total Leads,${reportData.stats.totalLeads}\n`;
        csvContent += `Assigned,${reportData.stats.assigned}\n`;
        csvContent += `Counseling,${reportData.stats.counseling}\n`;
        csvContent += `In Follow Up,${reportData.stats.inFollowUp}\n`;
        csvContent += `Admitted,${reportData.stats.admitted}\n`;
  csvContent += `Not Interested,${reportData.stats.notAdmitted}\n`;
        csvContent += `Conversion Rate,${reportData.conversionRate}%\n\n`;
        
        csvContent += 'LEAD DETAILS\n';
        csvContent += 'Lead ID,Name,Phone,Email,Status,Course,Created At,Admitted At\n';
        
        if (reportData.leads && reportData.leads.length > 0) {
          reportData.leads.forEach(lead => {
            const row = [
              lead.leadId || '',
              lead.name || '',
              lead.phone || '',
              lead.email || '',
              lead.status || '',
              lead.interestedCourse || '',
              lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '',
              lead.admittedAt ? new Date(lead.admittedAt).toLocaleDateString() : ''
            ];
            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
          });
        }
      }
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const fileName = selectedUser === 'all' 
        ? `admission-report-all-${new Date().toISOString().slice(0, 10)}.csv`
        : `admission-report-${reportData.user.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
      
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
      console.error('Download failed:', e);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Admission Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Track student admissions and pipeline</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={period} 
            onChange={e => setPeriod(e.target.value)} 
            className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="lifetime">Lifetime</option>
            <option value="custom">Custom</option>
          </select>
          {period === 'custom' && (
            <>
              <input 
                type="date" 
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors" 
                value={from} 
                onChange={e => setFrom(e.target.value)} 
              />
              <span className="text-gray-500 font-medium">to</span>
              <input 
                type="date" 
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors" 
                value={to} 
                onChange={e => setTo(e.target.value)} 
              />
            </>
          )}
        </div>
      </div>      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-700 font-medium">{err}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {STATUSES.map(s=>(
          <div key={s.key} className={`group relative bg-gradient-to-br ${getStatusColor(s.key)} rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  {getStatusIcon(s.key)}
                </div>
              </div>
              <p className="text-white/80 text-xs font-medium mb-1">{s.label}</p>
              <h3 className="text-2xl font-bold text-white">{metrics.counts[s.key] ?? 0}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Batch Overview Section */}
      {batches.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Active Batches Overview</h3>
              <p className="text-sm text-gray-500 mt-1">Track progress across all batches</p>
            </div>
            {/* Category Filter */}
            <select 
              value={batchCategoryFilter} 
              onChange={e => setBatchCategoryFilter(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors text-sm"
            >
              <option value="All">📚 All Categories</option>
              {[...new Set(batches.filter(b => b.status === 'Active').map(b => b.category))].map(cat => (
                <option key={cat} value={cat}>📁 {cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {batches
              .filter(b => b.status === 'Active' && (batchCategoryFilter === 'All' || b.category === batchCategoryFilter))
              .map(batch => {
                const admitted = batch.admittedStudents?.length || 0;
                const target = batch.targetedStudent || 0;
                const progress = target > 0 ? Math.round((admitted / target) * 100) : 0;
                
                return (
                  <div 
                    key={batch._id} 
                    className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                  >
                    {/* Batch Header - Compact */}
                    <div className="mb-2">
                      <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1" title={batch.batchName}>
                        {batch.batchName}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {batch.category}
                        </span>
                        <span className="text-xs font-mono text-gray-500">{batch.batchId.split('-').pop()}</span>
                      </div>
                    </div>

                    {/* Stats - Compact Row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="bg-white rounded p-2 flex-1 text-center">
                        <div className="text-xs text-gray-500">Target</div>
                        <div className="text-lg font-bold text-gray-800">{target}</div>
                      </div>
                      <div className="bg-white rounded p-2 flex-1 text-center">
                        <div className="text-xs text-gray-500">Admitted</div>
                        <div className="text-lg font-bold text-blue-600">{admitted}</div>
                      </div>
                    </div>

                    {/* Progress Bar - Compact */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${
                          progress >= 100 ? 'text-green-600' : 
                          progress >= 75 ? 'text-blue-600' : 
                          progress >= 50 ? 'text-yellow-600' : 'text-orange-600'
                        }`}>
                          {progress}%
                        </span>
                        {progress >= 100 && <span className="text-xs">🎉</span>}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            progress >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                            progress >= 75 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 
                            progress >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' : 
                            'bg-gradient-to-r from-orange-500 to-red-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      {admitted < target && (
                        <div className="text-center text-xs text-gray-500">
                          {target - admitted} left
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {batches.filter(b => b.status === 'Active' && (batchCategoryFilter === 'All' || b.category === batchCategoryFilter)).length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">
                {batchCategoryFilter === 'All' ? 'No active batches available' : `No active batches in "${batchCategoryFilter}" category`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Admin/SuperAdmin Reports Section */}
      {isAdminOrSA && (
        <div className="bg-white rounded-xl p-6 shadow-xl border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Admission Team Reports</h3>
              <p className="text-sm text-gray-500 mt-1">Overall performance and individual metrics</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="all">📊 Overall Team Report</option>
                {admissionUsers.map(u => (
                  <option key={u._id} value={u._id}>
                    👤 {u.name} - Individual Report
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={downloadReport}
              disabled={(selectedUser === 'all' ? !metrics.reportMetrics : !reportData) || downloadingReport}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Download size={18} />
              {downloadingReport ? 'Downloading...' : selectedUser === 'all' ? 'Download All Team Reports' : 'Download Individual Report'}
            </button>
          </div>

          {/* Overall Team Summary - Show by default */}
          {selectedUser === 'all' && (
            <div className="mb-6">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users size={18} className="text-purple-600" />
                Overall Team Performance
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-200">
                  <div className="text-xs text-blue-600 mb-1 font-medium">Total Leads</div>
                  <div className="text-2xl font-bold text-blue-700">{metrics.reportMetrics?.totalLeads || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center border border-green-200">
                  <div className="text-xs text-green-600 mb-1 font-medium">Admitted</div>
                  <div className="text-2xl font-bold text-green-700">{metrics.reportMetrics?.admitted || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center border border-orange-200">
                  <div className="text-xs text-orange-600 mb-1 font-medium">In Progress</div>
                  <div className="text-2xl font-bold text-orange-700">
                    {(metrics.reportMetrics?.counseling || 0) + (metrics.reportMetrics?.inFollowUp || 0)}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 text-center border border-red-200">
                  <div className="text-xs text-red-600 mb-1 font-medium">Not Interested</div>
                  <div className="text-2xl font-bold text-red-700">{metrics.reportMetrics?.notAdmitted || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center border border-purple-200">
                  <div className="text-xs text-purple-600 mb-1 font-medium">Conversion Rate</div>
                  <div className="text-2xl font-bold text-purple-700">{metrics.conversionRate || '0.00'}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Individual User Report Summary */}
          {reportData && selectedUser !== 'all' && (
            <div className="mb-6">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <UserCheck size={18} className="text-blue-600" />
                  Individual Report - {reportData.user?.name}
                  <span className="text-xs font-normal text-gray-500 ml-2">({reportData.user?.email})</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Total Leads</div>
                    <div className="text-xl font-bold text-blue-600">{reportData.stats?.totalLeads || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Admitted</div>
                    <div className="text-xl font-bold text-green-600">{reportData.stats?.admitted || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">In Progress</div>
                    <div className="text-xl font-bold text-orange-600">
                      {(reportData.stats?.counseling || 0) + (reportData.stats?.inFollowUp || 0)}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Not Interested</div>
                    <div className="text-xl font-bold text-red-600">{reportData.stats?.notAdmitted || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Conversion Rate</div>
                    <div className="text-xl font-bold text-purple-600">{reportData.conversionRate || 0}%</div>
                  </div>
                </div>

                {/* Lead Details for Individual User */}
                {reportData.leads && reportData.leads.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-semibold text-gray-700 mb-2 text-sm">Lead Details ({reportData.leads.length} total)</h5>
                    <div className="max-h-64 overflow-y-auto bg-white rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="border-b">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Lead ID</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Name</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Status</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Course</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.leads.slice(0, 10).map((lead, idx) => (
                            <tr key={lead._id || idx} className="border-b hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs font-mono">{lead.leadId}</td>
                              <td className="px-3 py-2 text-xs">{lead.name}</td>
                              <td className="px-3 py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  lead.status === 'Admitted' ? 'bg-green-100 text-green-700' :
                                  ['Not Admitted','Not Interested'].includes(lead.status) ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {lead.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs">{lead.interestedCourse || '-'}</td>
                              <td className="px-3 py-2 text-xs">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.leads.length > 10 && (
                        <div className="text-center py-2 text-xs text-gray-500 bg-gray-50">
                          Showing 10 of {reportData.leads.length} leads. Download report for complete list.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Leads vs Admitted</h3>
            <p className="text-sm text-gray-500 mt-1">Conversion tracking over time</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-gray-600 font-medium">Leads</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-600 font-medium">Admitted</span>
            </div>
          </div>
        </div>
        <LineChartDualSmall data={metrics.series} />
      </div>
    </div>
  );
}
