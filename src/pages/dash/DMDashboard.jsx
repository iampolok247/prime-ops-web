// web/src/pages/dash/DMDashboard.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { api, fmtBDT } from '../../lib/api.js';
import { 
  Users, 
  TrendingUp, 
  DollarSign,
  BarChart2,
  Facebook,
  Linkedin,
  FileText,
  Target,
  Download
} from 'lucide-react';

function todayISO(){ return new Date().toISOString().slice(0,10); }
function firstOfMonthISO(){ const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); }

export default function DMDashboard() {
  const [err, setErr] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    loadAll();
  }, []);

  const parseRange = () => {
    if (period === 'lifetime') return { from: null, to: null };
    if (period === 'custom' && from && to) return { from: new Date(from), to: new Date(to) };
    const now = new Date();
    let f = new Date();
    if (period === 'daily') { f.setDate(now.getDate() - 1); }
    else if (period === 'weekly') { f.setDate(now.getDate() - 7); }
    else if (period === 'monthly') { f.setMonth(now.getMonth() - 1); }
    else if (period === 'yearly') { f.setFullYear(now.getFullYear() - 1); }
    return { from: f, to: now };
  };

  async function loadAll() {
    setLoading(true);
    try {
      const [leadsResp, tasksResp, costsResp] = await Promise.all([
        api.listLeads().catch(()=>({ leads: [] })),
        api.listMyTasks().catch(()=>({ tasks: [] })),
        api.listDMCosts().catch(()=>({ items: [] }))
      ]);
      setLeads(leadsResp?.leads || []);
      setTasks(tasksResp?.tasks || []);
      const c = Array.isArray(costsResp) ? costsResp : (costsResp?.items || costsResp?.costs || []);
      setCosts(c || []);
      setErr('');
    } catch(e) {
      setErr(e.message || 'Failed to load dashboard data');
    } finally { setLoading(false); }
  }

  const inRange = (d, fromD, toD) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    if (fromD && t < fromD.getTime()) return false;
    if (toD && t > toD.getTime()) return false;
    return true;
  };

  const { from: rangeFrom, to: rangeTo } = parseRange();

  const metrics = useMemo(()=>{
    const fromD = rangeFrom ? new Date(rangeFrom) : null;
    const toD = rangeTo ? new Date(rangeTo) : null;

    const leadsInRange = leads.filter(l => inRange(l.createdAt || l.date || l._id && null, fromD, toD) || (!fromD && !toD));
    const totalLeads = leadsInRange.length;

    const sourceCounts = { meta:0, linkedin:0, manual:0, others:0 };
    leadsInRange.forEach(l => {
      const s = (l.source || '').toLowerCase();
      if (s.includes('meta')) sourceCounts.meta++;
      else if (s.includes('linkedin') || s.includes('linked in')) sourceCounts.linkedin++;
      else if (s.includes('manual')) sourceCounts.manual++;
      else sourceCounts.others++;
    });

    const tasksInRange = tasks.filter(t => inRange(t.createdAt || t.createdAt, fromD, toD) || (!fromD && !toD));
    const totalTasksCompleted = tasksInRange.filter(t => (t.status || '').toLowerCase() === 'completed').length;

    const costsInRange = costs.filter(c => inRange(c.date || c.createdAt, fromD, toD) || (!fromD && !toD));
    const totalExpense = costsInRange.reduce((s, x) => s + (Number(x.amount) || 0), 0);

    const series = [];
    if (fromD && toD) {
      const cur = new Date(fromD);
      while (cur <= toD) {
        const key = cur.toISOString().slice(0,10);
        const count = leads.filter(l => {
          const d = new Date(l.createdAt || l.date || l._id && null);
          return d && d.toISOString().slice(0,10) === key;
        }).length;
        series.push({ date: key, value: count });
        cur.setDate(cur.getDate()+1);
      }
    }

    const contentPublished = tasksInRange.filter(t => {
      const cat = (t.category || '').toLowerCase();
      return (cat.includes('content') || cat.includes('published')) && (t.status || '').toLowerCase() === 'completed';
    }).length;

    return { totalLeads, sourceCounts, totalTasksCompleted, totalExpense, series, contentPublished };
  }, [leads, tasks, costs, rangeFrom, rangeTo]);

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Digital Marketing Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Track your marketing performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={period} 
            onChange={e=>setPeriod(e.target.value)} 
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
                value={from} 
                onChange={e=>setFrom(e.target.value)} 
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
              <span className="text-gray-500 font-medium">to</span>
              <input 
                type="date" 
                value={to} 
                onChange={e=>setTo(e.target.value)} 
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </>
          )}
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-700 font-medium">{err}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Leads */}
        <div className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Total Leads</p>
            <h3 className="text-2xl font-bold text-white">{metrics.totalLeads}</h3>
          </div>
        </div>

        {/* Meta Leads */}
        <div className="group relative bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Facebook className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Meta Leads</p>
            <h3 className="text-2xl font-bold text-white">{metrics.sourceCounts.meta}</h3>
          </div>
        </div>

        {/* LinkedIn Leads */}
        <div className="group relative bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Linkedin className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">LinkedIn Leads</p>
            <h3 className="text-2xl font-bold text-white">{metrics.sourceCounts.linkedin}</h3>
          </div>
        </div>

        {/* Manual Leads */}
        <div className="group relative bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Manual Leads</p>
            <h3 className="text-2xl font-bold text-white">{metrics.sourceCounts.manual}</h3>
          </div>
        </div>

        {/* Total Expense */}
        <div className="group relative bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Total Expense</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDT(metrics.totalExpense)}</h3>
          </div>
        </div>
      </div>

      {/* Download Reports Section */}
      <DMReportsDownload />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Leads Over Time</h3>
              <p className="text-sm text-gray-500 mt-1">Daily lead generation trend</p>
            </div>
          </div>
          <LineChart data={metrics.series} />
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800">Lead Sources</h3>
            <p className="text-sm text-gray-500 mt-1">Distribution by channel</p>
          </div>
          <PieChart parts={metrics.sourceCounts} />
        </div>
      </div>

      {/* Content Published */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-white/80 text-sm font-medium">Total Content Published</p>
            <h3 className="text-4xl font-bold text-white mt-1">{metrics.contentPublished}</h3>
            <p className="text-white/60 text-xs mt-2">Completed content tasks</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DMReportsDownload() {
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [reportFrom, setReportFrom] = useState(firstOfMonthISO());
  const [reportTo, setReportTo] = useState(todayISO());
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const downloadDMReport = async () => {
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

      // Fetch all DM data in parallel
      const [leadsRes, tasksRes, costsRes, socialRes, seoRes] = await Promise.all([
        api.listLeads().catch(() => ({ leads: [] })),
        api.listAllTasks().catch(() => ({ tasks: [] })),
        api.listDMCosts().catch(() => ({ items: [] })),
        api.listSocial().catch(() => ({ metrics: {} })),
        api.listSEO().catch(() => ({ items: [] }))
      ]);

      const allLeads = leadsRes?.leads || [];
      const allTasks = tasksRes?.tasks || [];
      const allCosts = Array.isArray(costsRes) ? costsRes : (costsRes?.items || costsRes?.costs || []);
      const socialMetrics = socialRes?.metrics || {};
      const allSEO = Array.isArray(seoRes) ? seoRes : (seoRes?.items || seoRes?.seo || []);

      // Filter by date range
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const filteredLeads = allLeads.filter(l => {
        const d = new Date(l.createdAt || l.date);
        return d >= fromDate && d <= toDate;
      });

      const filteredTasks = allTasks.filter(t => {
        const d = new Date(t.createdAt || t.deadline);
        return d >= fromDate && d <= toDate && t.assignedTo?.some(u => u.role === 'DigitalMarketing');
      });

      const filteredCosts = allCosts.filter(c => {
        const d = new Date(c.date);
        return d >= fromDate && d <= toDate;
      });

      const filteredSEO = allSEO.filter(s => {
        const d = new Date(s.date);
        return d >= fromDate && d <= toDate;
      });

      // Calculate metrics
      const totalLeads = filteredLeads.length;
      const leadsBySource = {};
      filteredLeads.forEach(l => {
        const source = l.source || 'Unknown';
        leadsBySource[source] = (leadsBySource[source] || 0) + 1;
      });

      const taskStats = {
        todo: filteredTasks.filter(t => t.status === 'To-Do').length,
        inProgress: filteredTasks.filter(t => t.status === 'In Progress').length,
        completed: filteredTasks.filter(t => t.status === 'Completed').length,
        total: filteredTasks.length
      };

      const totalCost = filteredCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const costByPurpose = {};
      filteredCosts.forEach(c => {
        const purpose = c.purpose || 'Others';
        costByPurpose[purpose] = (costByPurpose[purpose] || 0) + (Number(c.amount) || 0);
      });

      const seoByType = {};
      filteredSEO.forEach(s => {
        const type = s.typeOfWork || 'Others';
        seoByType[type] = (seoByType[type] || 0) + 1;
      });

      // Generate CSV content
      let csv = `Digital Marketing Report\n`;
      csv += `Period: ${from} to ${to}\n`;
      csv += `Generated: ${new Date().toLocaleString()}\n\n`;

      // Leads Section
      csv += `=== LEADS ===\n`;
      csv += `Total Leads,${totalLeads}\n\n`;
      csv += `Leads by Source\n`;
      csv += `Source Name,Number of Leads\n`;
      Object.entries(leadsBySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
        csv += `${source},${count}\n`;
      });
      csv += `\n`;

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

      // Costs Section
      csv += `=== MARKETING EXPENSES ===\n`;
      csv += `Total Cost,${totalCost} BDT\n\n`;
      csv += `Cost by Purpose Name\n`;
      csv += `Purpose Name,Amount (BDT)\n`;
      Object.entries(costByPurpose).sort((a, b) => b[1] - a[1]).forEach(([purpose, amount]) => {
        csv += `${purpose},${amount}\n`;
      });
      csv += `\n`;

      // Social Media Metrics
      csv += `=== SOCIAL MEDIA METRICS ===\n`;
      csv += `Platform,Value\n`;
      csv += `Facebook Followers,${socialMetrics.facebookFollowers || 0}\n`;
      csv += `Instagram Followers,${socialMetrics.instagramFollowers || 0}\n`;
      csv += `Facebook Group Members,${socialMetrics.facebookGroupMembers || 0}\n`;
      csv += `YouTube Subscribers,${socialMetrics.youtubeSubscribers || 0}\n`;
      csv += `LinkedIn Followers,${socialMetrics.linkedInFollowers || 0}\n`;
      csv += `X (Twitter) Followers,${socialMetrics.xFollowers || 0}\n`;
      csv += `Pinterest Views,${socialMetrics.pinterestView || 0}\n`;
      csv += `Blogger Impressions,${socialMetrics.bloggerImpression || 0}\n`;
      csv += `Total Reach,${socialMetrics.totalReach || 0}\n\n`;

      // SEO Activities
      csv += `=== SEO ACTIVITIES ===\n`;
      csv += `Total Activities,${filteredSEO.length}\n\n`;
      csv += `Activities by Type\n`;
      csv += `Type,Count\n`;
      Object.entries(seoByType).forEach(([type, count]) => {
        csv += `${type},${count}\n`;
      });
      csv += `\n`;

      // SEO Details
      if (filteredSEO.length > 0) {
        csv += `SEO Activity Details\n`;
        csv += `Date,Type,Challenge,Details\n`;
        filteredSEO.forEach(s => {
          const date = new Date(s.date).toLocaleDateString();
          const type = (s.typeOfWork || '').replace(/,/g, ';');
          const challenge = (s.challenge || '').replace(/,/g, ';').replace(/\n/g, ' ');
          const details = (s.details || '').replace(/,/g, ';').replace(/\n/g, ' ');
          csv += `${date},"${type}","${challenge}","${details}"\n`;
        });
        csv += `\n`;
      }

      // Detailed Costs
      if (filteredCosts.length > 0) {
        csv += `=== DETAILED EXPENSES ===\n`;
        csv += `Date,Purpose Name,Amount (BDT),Notes\n`;
        filteredCosts.forEach(c => {
          const date = new Date(c.date).toLocaleDateString();
          const purpose = (c.purpose || 'N/A').replace(/,/g, ';');
          const notes = (c.notes || c.description || 'N/A').replace(/,/g, ';').replace(/\n/g, ' ');
          csv += `${date},"${purpose}",${c.amount || 0},"${notes}"\n`;
        });
      }

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DM_Report_${from}_to_${to}.csv`;
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
    <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
              <Download className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Download Comprehensive Reports
            </h3>
          </div>
          <p className="text-gray-600 text-sm">
            Export detailed reports including leads, tasks, costs, social metrics, and SEO activities
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={reportPeriod}
            onChange={e => setReportPeriod(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
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
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
              <span className="text-gray-500 font-medium self-center">to</span>
              <input
                type="date"
                value={reportTo}
                onChange={e => setReportTo(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </>
          )}

          <button
            onClick={downloadDMReport}
            disabled={downloading}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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

function LineChart({ data }){
  const width = 600, height = 220, padding = 40;
  
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
  
  const max = Math.max(...data.map(d=>d.value), 1);
  const stepX = (width - padding*2) / Math.max(1, data.length-1);
  
  const points = data.map((d,i)=>{
    const x = padding + i*stepX;
    const y = height - padding - (max ? (d.value / max) * (height - padding*2) : 0);
    return `${x},${y}`;
  }).join(' ');
  
  const area = `${points} ${padding + (data.length-1)*stepX},${height-padding} ${padding},${height-padding}`;
  
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Grid */}
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
        
        <polygon fill="url(#lineGradient)" points={area} />
        <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Points */}
        {data.map((d,i)=>{
          const x = padding + i*stepX;
          const y = height - padding - (max ? (d.value / max) * (height - padding*2) : 0);
          return <circle key={i} cx={x} cy={y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />;
        })}
      </svg>
    </div>
  );
}

function PieChart({ parts }){
  const total = Object.values(parts || {}).reduce((s,n)=>s+(n||0),0);
  const entries = Object.entries(parts || {});
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
        <div className="text-center">
          <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">No data</p>
        </div>
      </div>
    );
  }
  
  let acc = 0;
  const size = 160; 
  const cx = size/2; 
  const cy = size/2; 
  const r = size/2 - 4;
  const innerR = r * 0.6;
  
  const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b'];
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-md">
          {entries.map(([k,v], idx) => {
            const start = acc/total * Math.PI*2;
            acc += v||0;
            const end = acc/total * Math.PI*2;
            const x1 = cx + r * Math.cos(start - Math.PI/2);
            const y1 = cy + r * Math.sin(start - Math.PI/2);
            const x2 = cx + r * Math.cos(end - Math.PI/2);
            const y2 = cy + r * Math.sin(end - Math.PI/2);
            const ix1 = cx + innerR * Math.cos(start - Math.PI/2);
            const iy1 = cy + innerR * Math.sin(start - Math.PI/2);
            const ix2 = cx + innerR * Math.cos(end - Math.PI/2);
            const iy2 = cy + innerR * Math.sin(end - Math.PI/2);
            const large = end - start > Math.PI ? 1 : 0;
            
            const path = `
              M ${x1} ${y1}
              A ${r} ${r} 0 ${large} 1 ${x2} ${y2}
              L ${ix2} ${iy2}
              A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1}
              Z
            `;
            
            return (
              <path 
                key={k} 
                d={path} 
                fill={colors[idx % colors.length]}
                stroke="#fff" 
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
          
          <circle cx={cx} cy={cy} r={innerR} fill="white" />
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#6b7280">Total</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1f2937">{total}</text>
        </svg>
      </div>
      
      <div className="flex flex-col gap-2 w-full">
        {entries.map(([k,v], idx)=> {
          const percentage = ((v/total) * 100).toFixed(1);
          return (
            <div key={k} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <span 
                  style={{background: colors[idx % colors.length]}} 
                  className="w-3 h-3 rounded-full shadow-sm"
                />
                <span className="text-sm font-medium text-gray-700 capitalize">{k}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{percentage}%</span>
                <span className="text-sm font-bold text-gray-800">{v}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
