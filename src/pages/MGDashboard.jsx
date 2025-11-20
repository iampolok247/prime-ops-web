import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api.js';
import { Film, Image, FileImage, Video, TrendingUp, Calendar, Download } from 'lucide-react';

function todayISO(){ return new Date().toISOString().slice(0,10); }
function firstOfMonthISO(){ const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); }

export default function MGDashboard() {
  const [works, setWorks] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  
  // filters
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    loadAll();
    // Real-time polling every 30 seconds
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const resp = await api.listMGWorks().catch(() => ({ works: [] }));
      const allWorks = resp?.works || resp || [];
      setWorks(Array.isArray(allWorks) ? allWorks : []);
      setErr('');
    } catch (e) {
      setErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

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
      return { from: null, to: null };
    }
    const now = new Date();
    let f = new Date();
    if (period === 'daily') { f.setDate(now.getDate() - 1); }
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

  const stats = useMemo(() => {
    const fromD = rangeFrom ? new Date(rangeFrom) : null;
    const toD = rangeTo ? new Date(rangeTo) : null;

    const worksInRange = works.filter(w => inRange(w.createdAt, fromD, toD) || (!fromD && !toD));

    return {
      totalProduction: worksInRange.length,
      // Match actual model enum values
      adDesign: worksInRange.filter(w => w.type === 'Ad').length,
      bannerDesign: worksInRange.filter(w => w.type === 'Banner').length,
      // Video production includes Reel, Short, Explainer
      videoProduction: worksInRange.filter(w => 
        w.type === 'Reel' || w.type === 'Short' || w.type === 'Explainer'
      ).length,
      other: worksInRange.filter(w => w.type === 'Other').length,
      // Match actual status enum values
      queued: worksInRange.filter(w => w.status === 'Queued').length,
      inProgress: worksInRange.filter(w => w.status === 'InProgress' || w.status === 'Review').length,
      done: worksInRange.filter(w => w.status === 'Done').length,
      hold: worksInRange.filter(w => w.status === 'Hold').length
    };
  }, [works, rangeFrom, rangeTo]);

  // Pie chart data
  const pieData = [
    { label: 'Ad', value: stats.adDesign, color: '#3b82f6' },
    { label: 'Banner', value: stats.bannerDesign, color: '#10b981' },
    { label: 'Video (Reel/Short/Explainer)', value: stats.videoProduction, color: '#f59e0b' },
    { label: 'Other', value: stats.other, color: '#6366f1' }
  ].filter(item => item.value > 0);

  const totalForPie = pieData.reduce((sum, item) => sum + item.value, 0);

  // Generate pie chart paths
  const generatePieChart = () => {
    if (totalForPie === 0) return [];
    
    let currentAngle = -90; // Start from top
    return pieData.map((item, index) => {
      const percentage = item.value / totalForPie;
      const angle = percentage * 360;
      
      const startAngle = (currentAngle * Math.PI) / 180;
      const endAngle = ((currentAngle + angle) * Math.PI) / 180;
      
      const x1 = 50 + 40 * Math.cos(startAngle);
      const y1 = 50 + 40 * Math.sin(startAngle);
      const x2 = 50 + 40 * Math.cos(endAngle);
      const y2 = 50 + 40 * Math.sin(endAngle);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      const path = [
        `M 50 50`,
        `L ${x1} ${y1}`,
        `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
        `Z`
      ].join(' ');
      
      currentAngle += angle;
      
      return { ...item, path, percentage: Math.round(percentage * 100) };
    });
  };

  const pieChartPaths = generatePieChart();

  // Bar chart data for status distribution
  const maxStatusValue = Math.max(stats.queued, stats.inProgress, stats.done, 1);
  const barData = [
    { label: 'Queued', value: stats.queued, color: '#ef4444', height: (stats.queued / maxStatusValue) * 100 },
    { label: 'In Progress', value: stats.inProgress, color: '#3b82f6', height: (stats.inProgress / maxStatusValue) * 100 },
    { label: 'Done', value: stats.done, color: '#10b981', height: (stats.done / maxStatusValue) * 100 }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Motion Graphics Dashboard</h1>
          <p className="text-gray-600 mt-1">Production analytics and performance metrics</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm">Updating...</span>
          </div>
        )}
      </div>

      {err && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{err}</div>}
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 text-navy font-semibold mb-3">
          <Calendar size={20} />
          <span>Time Period</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={period} 
            onChange={e => setPeriod(e.target.value)} 
            className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="lifetime">Lifetime</option>
            <option value="custom">Custom Range</option>
          </select>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={from} 
                onChange={e=>setFrom(e.target.value)} 
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <span className="text-gray-500">to</span>
              <input 
                type="date" 
                value={to} 
                onChange={e=>setTo(e.target.value)} 
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Total Production</p>
              <p className="text-4xl font-bold">{stats.totalProduction}</p>
            </div>
            <Film size={48} className="text-purple-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Ad</p>
              <p className="text-4xl font-bold">{stats.adDesign}</p>
            </div>
            <Image size={48} className="text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Banner</p>
              <p className="text-4xl font-bold">{stats.bannerDesign}</p>
            </div>
            <FileImage size={48} className="text-green-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">Video (Reel/Short/Explainer)</p>
              <p className="text-4xl font-bold">{stats.videoProduction}</p>
            </div>
            <Video size={48} className="text-orange-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* Download Reports Section */}
      <MGReportsDownload />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Production Type Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-navy mb-4">Production Type Distribution</h3>
          
          {totalForPie === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <Film size={48} className="mx-auto mb-2 opacity-50" />
                <p>No production data available</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Pie Chart SVG */}
              <div className="flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-64 h-64">
                  {pieChartPaths.map((item, index) => (
                    <g key={index}>
                      <path
                        d={item.path}
                        fill={item.color}
                        stroke="white"
                        strokeWidth="0.5"
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    </g>
                  ))}
                  {/* Center circle for donut effect */}
                  <circle cx="50" cy="50" r="20" fill="white" />
                  <text 
                    x="50" 
                    y="47" 
                    textAnchor="middle" 
                    fontSize="4"
                    fontWeight="600"
                    fill="#1e3a8a"
                  >
                    Total
                  </text>
                  <text 
                    x="50" 
                    y="55" 
                    textAnchor="middle" 
                    fontSize="8"
                    fontWeight="700"
                    fill="#1e3a8a"
                  >
                    {totalForPie}
                  </text>
                </svg>
              </div>
              
              {/* Legend */}
              <div className="flex-1 space-y-3">
                {pieChartPaths.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-navy">{item.value}</span>
                      <span className="text-sm text-gray-500 ml-2">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar Chart - Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Status Distribution
          </h3>
          
          {stats.totalProduction === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <TrendingUp size={48} className="mx-auto mb-2 opacity-50" />
                <p>No status data available</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bar Chart */}
              <div className="flex items-end justify-around gap-4 h-64 px-4">
                {barData.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-sm font-bold text-navy">{item.value}</div>
                    <div 
                      className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
                      style={{ 
                        backgroundColor: item.color,
                        height: `${item.height}%`,
                        minHeight: item.value > 0 ? '20px' : '0'
                      }}
                    />
                    <div className="text-xs text-gray-600 text-center font-medium">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                {barData.map((item, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                    <p className="text-xl font-bold text-navy">{item.value}</p>
                    <p className="text-xs text-gray-500">
                      {stats.totalProduction > 0 
                        ? `${Math.round((item.value / stats.totalProduction) * 100)}%` 
                        : '0%'
                      }
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MGReportsDownload() {
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [reportFrom, setReportFrom] = useState(firstOfMonthISO());
  const [reportTo, setReportTo] = useState(todayISO());
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const downloadMGReport = async () => {
    setDownloading(true);
    setMsg('');
    setErr('');
    
    try {
      let from, to;
      
      if (reportPeriod === 'daily') {
        from = todayISO();
        to = todayISO();
      } else if (reportPeriod === 'monthly') {
        from = firstOfMonthISO();
        to = todayISO();
      } else if (reportPeriod === 'custom') {
        from = reportFrom;
        to = reportTo;
      }

      // Fetch all MG works data and tasks in parallel
      const [worksRes, tasksRes] = await Promise.all([
        api.listMGWorks().catch(() => ({ works: [] })),
        api.listAllTasks().catch(() => ({ tasks: [] }))
      ]);

      const allWorks = worksRes?.works || worksRes || [];
      const allTasks = tasksRes?.tasks || [];

      // Filter by date range
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const filteredWorks = allWorks.filter(w => {
        const d = new Date(w.createdAt || w.date);
        return d >= fromDate && d <= toDate;
      });

      // Filter tasks assigned to Motion Graphics team
      const filteredTasks = allTasks.filter(t => {
        const d = new Date(t.createdAt || t.deadline);
        const isMGTask = t.assignedTo?.some(u => u.role === 'MotionGraphics');
        return (d >= fromDate && d <= toDate) && isMGTask;
      });

      // Calculate metrics
      const totalProduction = filteredWorks.length;

      // Task Statistics
      const taskStats = {
        todo: filteredTasks.filter(t => t.status === 'To-Do').length,
        inProgress: filteredTasks.filter(t => t.status === 'In Progress').length,
        completed: filteredTasks.filter(t => t.status === 'Completed').length,
        total: filteredTasks.length
      };

      // Production by Type
      const productionByType = {};
      filteredWorks.forEach(w => {
        const type = w.type || 'Unknown';
        productionByType[type] = (productionByType[type] || 0) + 1;
      });

      // Production by Status
      const productionByStatus = {};
      filteredWorks.forEach(w => {
        const status = w.status || 'Unknown';
        productionByStatus[status] = (productionByStatus[status] || 0) + 1;
      });

      // Production by Priority
      const productionByPriority = {};
      filteredWorks.forEach(w => {
        const priority = w.priority || 'Unknown';
        productionByPriority[priority] = (productionByPriority[priority] || 0) + 1;
      });

      // Production by Platform
      const productionByPlatform = {};
      filteredWorks.forEach(w => {
        const platform = w.platform || 'Unknown';
        productionByPlatform[platform] = (productionByPlatform[platform] || 0) + 1;
      });

      // Generate CSV content
      let csv = `Motion Graphics Report\n`;
      csv += `Period: ${from} to ${to}\n`;
      csv += `Generated: ${new Date().toLocaleString()}\n\n`;

      // Summary Section
      csv += `=== PRODUCTION SUMMARY ===\n`;
      csv += `Total Production,${totalProduction}\n\n`;

      // Tasks Section
      csv += `=== TASKS ===\n`;
      csv += `Status,Count\n`;
      csv += `To-Do,${taskStats.todo}\n`;
      csv += `In Progress,${taskStats.inProgress}\n`;
      csv += `Completed,${taskStats.completed}\n`;
      csv += `Total,${taskStats.total}\n\n`;

      // Detailed Tasks
      if (filteredTasks.length > 0) {
        csv += `Task Details\n`;
        csv += `Task Name,Status,Priority,Deadline,Assigned To\n`;
        filteredTasks.forEach(t => {
          const name = (t.title || 'Untitled').replace(/,/g, ';');
          const status = t.status || 'N/A';
          const priority = t.priority || 'N/A';
          const deadline = t.deadline ? new Date(t.deadline).toLocaleDateString() : 'N/A';
          const assignedTo = t.assignedTo?.map(u => u.name || 'Unknown').join('; ') || 'Unassigned';
          csv += `"${name}",${status},${priority},${deadline},"${assignedTo}"\n`;
        });
        csv += `\n`;
      }

      // Production by Type
      csv += `Production by Type\n`;
      csv += `Type Name,Count\n`;
      Object.entries(productionByType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        csv += `${type},${count}\n`;
      });
      csv += `\n`;

      // Production by Status
      csv += `Production by Status\n`;
      csv += `Status,Count\n`;
      Object.entries(productionByStatus).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
        csv += `${status},${count}\n`;
      });
      csv += `\n`;

      // Production by Priority
      csv += `Production by Priority\n`;
      csv += `Priority,Count\n`;
      Object.entries(productionByPriority).sort((a, b) => b[1] - a[1]).forEach(([priority, count]) => {
        csv += `${priority},${count}\n`;
      });
      csv += `\n`;

      // Production by Platform
      csv += `Production by Platform\n`;
      csv += `Platform,Count\n`;
      Object.entries(productionByPlatform).sort((a, b) => b[1] - a[1]).forEach(([platform, count]) => {
        csv += `${platform},${count}\n`;
      });
      csv += `\n`;

      // Detailed Production List
      if (filteredWorks.length > 0) {
        csv += `=== DETAILED PRODUCTION LIST ===\n`;
        csv += `Title,Type,Status,Priority,Platform,Assignee,Deadline,Created Date,Notes\n`;
        filteredWorks.forEach(w => {
          const title = (w.title || 'Untitled').replace(/,/g, ';');
          const type = w.type || 'N/A';
          const status = w.status || 'N/A';
          const priority = w.priority || 'N/A';
          const platform = w.platform || 'N/A';
          const assignee = w.assignedTo?.name || 'Unassigned';
          const deadline = w.deadline ? new Date(w.deadline).toLocaleDateString() : 'N/A';
          const createdDate = w.createdAt ? new Date(w.createdAt).toLocaleDateString() : 'N/A';
          const notes = (w.notes || w.description || 'N/A').replace(/,/g, ';').replace(/\n/g, ' ');
          csv += `"${title}",${type},${status},${priority},${platform},"${assignee}",${deadline},${createdDate},"${notes}"\n`;
        });
        csv += `\n`;
      }

      // Performance Metrics
      const completedWorks = filteredWorks.filter(w => w.status === 'Done');
      const inProgressWorks = filteredWorks.filter(w => w.status === 'InProgress' || w.status === 'Review');
      const queuedWorks = filteredWorks.filter(w => w.status === 'Queued');
      const holdWorks = filteredWorks.filter(w => w.status === 'Hold');

      csv += `=== PERFORMANCE METRICS ===\n`;
      csv += `Metric,Value\n`;
      csv += `Total Production,${totalProduction}\n`;
      csv += `Completed Works,${completedWorks.length}\n`;
      csv += `In Progress Works,${inProgressWorks.length}\n`;
      csv += `Queued Works,${queuedWorks.length}\n`;
      csv += `On Hold Works,${holdWorks.length}\n`;
      csv += `Production Completion Rate,${totalProduction > 0 ? Math.round((completedWorks.length / totalProduction) * 100) : 0}%\n`;
      csv += `Total Tasks,${taskStats.total}\n`;
      csv += `Completed Tasks,${taskStats.completed}\n`;
      csv += `In Progress Tasks,${taskStats.inProgress}\n`;
      csv += `Pending Tasks,${taskStats.todo}\n`;
      csv += `Task Completion Rate,${taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%\n`;

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MG_Report_${from}_to_${to}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setMsg('✓ Report downloaded successfully!');
    } catch (e) {
      setErr('Failed to download report: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-gray-200 hover:border-purple-300 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md">
              <Download className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Download Comprehensive Reports
            </h3>
          </div>
          <p className="text-gray-600 text-sm">
            Export detailed reports including tasks, production works, status, types, and performance metrics
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={reportPeriod}
            onChange={e => setReportPeriod(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-purple-400 focus:border-purple-500 focus:outline-none transition-colors"
          >
            <option value="daily">Today</option>
            <option value="monthly">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {reportPeriod === 'custom' && (
            <>
              <input
                type="date"
                value={reportFrom}
                onChange={e => setReportFrom(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-purple-400 focus:border-purple-500 focus:outline-none transition-colors"
              />
              <span className="text-gray-500 font-medium self-center">to</span>
              <input
                type="date"
                value={reportTo}
                onChange={e => setReportTo(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-purple-400 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </>
          )}

          <button
            onClick={downloadMGReport}
            disabled={downloading}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Report
              </>
            )}
          </button>
        </div>
      </div>

      {msg && (
        <div className="mt-4 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
          <p className="text-green-700 font-medium text-sm">{msg}</p>
        </div>
      )}

      {err && (
        <div className="mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-red-700 font-medium text-sm">{err}</p>
        </div>
      )}
    </div>
  );
}
