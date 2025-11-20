// web/src/pages/RecruitmentDashboard.jsx
import React, { useEffect, useState } from "react";
import { api, fmtBDT } from "../lib/api";
import { 
  Users, 
  UserCheck, 
  Briefcase, 
  Building2,
  Clock,
  TrendingUp,
  BarChart2,
  Target,
  DollarSign,
  Calendar,
  Download
} from 'lucide-react';

function todayISO(){ return new Date().toISOString().slice(0,10); }
function firstOfMonthISO(){ const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); }

export default function RecruitmentDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  
  // Target data
  const [targets, setTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [selectedTargetMonth, setSelectedTargetMonth] = useState('');
  
  // filters
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    loadAll();
    // Initialize with current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`;
    setSelectedTargetMonth(currentMonth);
    loadTargets(currentMonth);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [candResp, jobsResp, empResp] = await Promise.all([
        api.listCandidates().catch(() => ({ candidates: [] })),
        api.listJobs().catch(() => ({ jobs: [] })),
        api.listEmployers().catch(() => ({ employers: [] }))
      ]);
      setCandidates(candResp?.candidates || candResp || []);
      setJobs(jobsResp?.jobs || jobsResp || []);
      setEmployers(empResp?.employers || empResp || []);
      setErr('');
    } catch (e) {
      setErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function loadTargets(month) {
    setLoadingTargets(true);
    try {
      // Get recruitment targets for selected month
      const resp = await api.getTargets(month, null, null);
      const allTargets = resp?.targets || [];
      
      console.log('All targets for month:', month, allTargets);
      
      // Filter only recruitment targets
      const recruitmentTargets = allTargets.filter(t => 
        t.targetType === 'RecruitmentCandidate' || t.targetType === 'RecruitmentRevenue'
      );
      
      console.log('Filtered recruitment targets:', recruitmentTargets);
      
      setTargets(recruitmentTargets);
    } catch (e) {
      console.error('Failed to load targets:', e);
    } finally {
      setLoadingTargets(false);
    }
  }

  // Generate month options (last 12 months + next 3 months)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = -12; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: yearMonth, label });
    }
    
    return options;
  };

  const handleMonthChange = (month) => {
    setSelectedTargetMonth(month);
    loadTargets(month);
  };

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

  const metrics = React.useMemo(() => {
    const fromD = rangeFrom ? new Date(rangeFrom) : null;
    const toD = rangeTo ? new Date(rangeTo) : null;

    const candInRange = candidates.filter(c => inRange(c.createdAt, fromD, toD) || (!fromD && !toD));
    const jobsInRange = jobs.filter(j => inRange(j.createdAt, fromD, toD) || (!fromD && !toD));

    const totalRecruitment = candInRange.length;
    const pendingCandidate = candInRange.filter(c => c.status === 'pending').length;
    const activeJobPosition = jobsInRange.filter(j => j.status === 'active').length;
    const totalEmployer = employers.length; // Employers don't have date filter

    // Compute series for last 6 months from range end
    const series = [];
    if (toD) {
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(toD);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
        
        const monthLabel = monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        const candidatesCount = candidates.filter(c => inRange(c.createdAt, monthStart, monthEnd)).length;
        const recruitedCount = candidates.filter(c => c.status === 'recruited' && inRange(c.recruitedAt || c.updatedAt, monthStart, monthEnd)).length;
        
        series.push({ month: monthLabel, candidates: candidatesCount, recruited: recruitedCount });
      }
    }

    return { totalRecruitment, pendingCandidate, activeJobPosition, totalEmployer, series };
  }, [candidates, jobs, employers, rangeFrom, rangeTo]);

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Recruitment Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Track candidates and job positions</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recruitment */}
        <div className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Total Recruitment</p>
            <h3 className="text-2xl font-bold text-white">{metrics.totalRecruitment}</h3>
          </div>
        </div>

        {/* Pending Candidate */}
        <div className="group relative bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Pending Candidate</p>
            <h3 className="text-2xl font-bold text-white">{metrics.pendingCandidate}</h3>
          </div>
        </div>

        {/* Active Job Position */}
        <div className="group relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Active Job Position</p>
            <h3 className="text-2xl font-bold text-white">{metrics.activeJobPosition}</h3>
          </div>
        </div>

        {/* Total Employer */}
        <div className="group relative bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Total Employer</p>
            <h3 className="text-2xl font-bold text-white">{metrics.totalEmployer}</h3>
          </div>
        </div>
      </div>

      {/* Download Reports Section */}
      <RecruitmentReportsDownload />

      {/* Team Target Card */}
      {!loadingTargets && (
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Team Targets</h2>
                <p className="text-gray-500 text-sm">Recruitment performance tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={selectedTargetMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-indigo-400 focus:border-indigo-500 focus:outline-none transition-colors font-medium text-gray-700"
              >
                {generateMonthOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {targets.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-12 border-2 border-dashed border-gray-300 text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Targets Set</h3>
              <p className="text-gray-500 text-sm">
                Contact your admin to set recruitment targets for this month
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {targets.map((target) => {
              const isCandidate = target.targetType === 'RecruitmentCandidate';
              const achieved = target.achieved || 0;
              const targetValue = target.targetValue || 0;
              const percentage = targetValue > 0 ? Math.round((achieved / targetValue) * 100) : 0;
              const assignedUser = target.assignedTo?.name || 'Team';
              
              return (
                <div key={target._id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg shadow-md ${
                        isCandidate 
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                          : 'bg-gradient-to-br from-green-500 to-emerald-600'
                      }`}>
                        {isCandidate ? (
                          <Users className="w-6 h-6 text-white" />
                        ) : (
                          <DollarSign className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {isCandidate ? 'Candidates' : 'Revenue'}
                        </h3>
                        <p className="text-gray-500 text-sm">{assignedUser}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-gray-500 text-sm mb-1">Achievement</p>
                        <p className="text-3xl font-bold text-gray-800">
                          {isCandidate ? achieved : fmtBDT(achieved)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-sm mb-1">Target</p>
                        <p className="text-xl font-semibold text-gray-600">
                          {isCandidate ? targetValue : fmtBDT(targetValue)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">Progress</span>
                        <span className={`font-bold ${
                          percentage >= 100 ? 'text-green-600' :
                          percentage >= 75 ? 'text-blue-600' :
                          percentage >= 50 ? 'text-orange-600' : 'text-red-600'
                        }`}>{percentage}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentage >= 100
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                              : percentage >= 75
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                              : percentage >= 50
                              ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                              : 'bg-gradient-to-r from-red-500 to-rose-600'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {target.note && (
                      <p className="text-gray-600 text-sm mt-3 italic bg-gray-50 p-2 rounded border-l-4 border-indigo-400">
                        "{target.note}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Candidate vs Recruited</h3>
            <p className="text-sm text-gray-500 mt-1">Last 6 months performance</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-gray-600 font-medium">Candidates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-600 font-medium">Recruited</span>
            </div>
          </div>
        </div>
        <RecruitmentChart data={metrics.series} />
      </div>
    </div>
  );
}

function RecruitmentReportsDownload() {
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [reportFrom, setReportFrom] = useState(firstOfMonthISO());
  const [reportTo, setReportTo] = useState(todayISO());
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const downloadRecruitmentReport = async () => {
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

      // Fetch all recruitment data in parallel
      const [candidatesRes, jobsRes, employersRes, incomeRes, expenseRes] = await Promise.all([
        api.listCandidates().catch(() => ({ candidates: [] })),
        api.listJobs().catch(() => ({ jobs: [] })),
        api.listEmployers().catch(() => ({ employers: [] })),
        api.listRecIncome().catch(() => ({ items: [] })),
        api.listRecExpense().catch(() => ({ items: [] }))
      ]);

      const allCandidates = candidatesRes?.candidates || [];
      const allJobs = jobsRes?.jobs || [];
      const allEmployers = employersRes?.employers || [];
      const allIncome = Array.isArray(incomeRes) ? incomeRes : (incomeRes?.items || incomeRes?.income || []);
      const allExpense = Array.isArray(expenseRes) ? expenseRes : (expenseRes?.items || expenseRes?.expenses || []);

      // Filter by date range
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const filteredCandidates = allCandidates.filter(c => {
        const d = new Date(c.createdAt || c.date);
        return d >= fromDate && d <= toDate;
      });

      const filteredJobs = allJobs.filter(j => {
        const d = new Date(j.createdAt || j.date);
        return d >= fromDate && d <= toDate;
      });

      const filteredIncome = allIncome.filter(i => {
        const d = new Date(i.date);
        return d >= fromDate && d <= toDate;
      });

      const filteredExpense = allExpense.filter(e => {
        const d = new Date(e.date);
        return d >= fromDate && d <= toDate;
      });

      // Calculate metrics
      const totalCandidates = filteredCandidates.length;
      const candidatesByStatus = {};
      filteredCandidates.forEach(c => {
        const status = c.status || 'Unknown';
        candidatesByStatus[status] = (candidatesByStatus[status] || 0) + 1;
      });

      const totalJobs = filteredJobs.length;
      const jobsByStatus = {};
      filteredJobs.forEach(j => {
        const status = j.status || 'Unknown';
        jobsByStatus[status] = (jobsByStatus[status] || 0) + 1;
      });

      const totalIncome = filteredIncome.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const incomeBySource = {};
      filteredIncome.forEach(i => {
        const source = i.source || 'Others';
        incomeBySource[source] = (incomeBySource[source] || 0) + (Number(i.amount) || 0);
      });

      const totalExpense = filteredExpense.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const expenseByPurpose = {};
      filteredExpense.forEach(e => {
        const purpose = e.purpose || 'Others';
        expenseByPurpose[purpose] = (expenseByPurpose[purpose] || 0) + (Number(e.amount) || 0);
      });

      // Generate CSV content
      let csv = `Recruitment Report\n`;
      csv += `Period: ${from} to ${to}\n`;
      csv += `Generated: ${new Date().toLocaleString()}\n\n`;

      // Candidates Section
      csv += `=== CANDIDATES ===\n`;
      csv += `Total Candidates,${totalCandidates}\n\n`;
      csv += `Candidates by Status\n`;
      csv += `Status,Count\n`;
      Object.entries(candidatesByStatus).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
        csv += `${status},${count}\n`;
      });
      csv += `\n`;

      // Candidate Details
      if (filteredCandidates.length > 0) {
        csv += `Candidate Details\n`;
        csv += `Name,Phone,Email,Status,Job Position,Company,Created Date\n`;
        filteredCandidates.forEach(c => {
          const name = (c.name || 'N/A').replace(/,/g, ';');
          const phone = c.phone || 'N/A';
          const email = (c.email || 'N/A').replace(/,/g, ';');
          const status = c.status || 'N/A';
          const job = (c.jobId?.title || 'N/A').replace(/,/g, ';');
          const company = (c.employerId?.companyName || 'N/A').replace(/,/g, ';');
          const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A';
          csv += `"${name}",${phone},"${email}",${status},"${job}","${company}",${date}\n`;
        });
        csv += `\n`;
      }

      // Jobs Section
      csv += `=== JOB POSITIONS ===\n`;
      csv += `Total Jobs,${totalJobs}\n\n`;
      csv += `Jobs by Status\n`;
      csv += `Status,Count\n`;
      Object.entries(jobsByStatus).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
        csv += `${status},${count}\n`;
      });
      csv += `\n`;

      // Job Details
      if (filteredJobs.length > 0) {
        csv += `Job Position Details\n`;
        csv += `Job Title,Company,Location,Status,Salary,Requirements,Created Date\n`;
        filteredJobs.forEach(j => {
          const title = (j.title || 'N/A').replace(/,/g, ';');
          const company = (j.employerId?.companyName || 'N/A').replace(/,/g, ';');
          const location = (j.location || 'N/A').replace(/,/g, ';');
          const status = j.status || 'N/A';
          const salary = (j.salary || 'N/A').replace(/,/g, ';');
          const requirements = (j.requirements || 'N/A').replace(/,/g, ';').replace(/\n/g, ' ');
          const date = j.createdAt ? new Date(j.createdAt).toLocaleDateString() : 'N/A';
          csv += `"${title}","${company}","${location}",${status},"${salary}","${requirements}",${date}\n`;
        });
        csv += `\n`;
      }

      // Employers Section
      csv += `=== EMPLOYERS ===\n`;
      csv += `Total Employers,${allEmployers.length}\n\n`;
      if (allEmployers.length > 0) {
        csv += `Employer Details\n`;
        csv += `Company Name,Contact Person,Phone,Email,Address,Industry\n`;
        allEmployers.forEach(e => {
          const company = (e.companyName || 'N/A').replace(/,/g, ';');
          const contact = (e.contactPerson || 'N/A').replace(/,/g, ';');
          const phone = e.phone || 'N/A';
          const email = (e.email || 'N/A').replace(/,/g, ';');
          const address = (e.address || 'N/A').replace(/,/g, ';').replace(/\n/g, ' ');
          const industry = (e.industry || 'N/A').replace(/,/g, ';');
          csv += `"${company}","${contact}",${phone},"${email}","${address}","${industry}"\n`;
        });
        csv += `\n`;
      }

      // Income Section
      csv += `=== RECRUITMENT INCOME ===\n`;
      csv += `Total Income,${totalIncome} BDT\n\n`;
      csv += `Income by Source\n`;
      csv += `Source Name,Amount (BDT)\n`;
      Object.entries(incomeBySource).sort((a, b) => b[1] - a[1]).forEach(([source, amount]) => {
        csv += `${source},${amount}\n`;
      });
      csv += `\n`;

      // Detailed Income
      if (filteredIncome.length > 0) {
        csv += `Detailed Income\n`;
        csv += `Date,Source Name,Amount (BDT),Status,Notes\n`;
        filteredIncome.forEach(i => {
          const date = new Date(i.date).toLocaleDateString();
          const source = (i.source || 'N/A').replace(/,/g, ';');
          const status = i.status || 'N/A';
          const notes = (i.notes || i.description || 'N/A').replace(/,/g, ';').replace(/\n/g, ' ');
          csv += `${date},"${source}",${i.amount || 0},${status},"${notes}"\n`;
        });
        csv += `\n`;
      }

      // Expense Section
      csv += `=== RECRUITMENT EXPENSES ===\n`;
      csv += `Total Expenses,${totalExpense} BDT\n\n`;
      csv += `Expenses by Purpose Name\n`;
      csv += `Purpose Name,Amount (BDT)\n`;
      Object.entries(expenseByPurpose).sort((a, b) => b[1] - a[1]).forEach(([purpose, amount]) => {
        csv += `${purpose},${amount}\n`;
      });
      csv += `\n`;

      // Detailed Expenses
      if (filteredExpense.length > 0) {
        csv += `Detailed Expenses\n`;
        csv += `Date,Purpose Name,Amount (BDT),Notes\n`;
        filteredExpense.forEach(e => {
          const date = new Date(e.date).toLocaleDateString();
          const purpose = (e.purpose || 'N/A').replace(/,/g, ';');
          const notes = (e.notes || e.description || 'N/A').replace(/,/g, ';').replace(/\n/g, ' ');
          csv += `${date},"${purpose}",${e.amount || 0},"${notes}"\n`;
        });
        csv += `\n`;
      }

      // Summary
      csv += `=== FINANCIAL SUMMARY ===\n`;
      csv += `Total Income,${totalIncome} BDT\n`;
      csv += `Total Expenses,${totalExpense} BDT\n`;
      csv += `Net Profit,${totalIncome - totalExpense} BDT\n`;

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Recruitment_Report_${from}_to_${to}.csv`;
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
            Export detailed reports including candidates, jobs, employers, income, and expenses
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
            onClick={downloadRecruitmentReport}
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

function RecruitmentChart({ data }) {
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

  const maxValue = Math.max(...data.map(d => Math.max(d.candidates || 0, d.recruited || 0)), 1);
  const barWidth = 40;
  const barGap = 10;
  const groupWidth = barWidth * 2 + barGap;
  const padding = { left: 50, right: 30, top: 30, bottom: 60 };
  const chartWidth = padding.left + padding.right + (groupWidth + 30) * data.length;
  const chartHeight = 300;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth} height={chartHeight} className="min-w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + graphHeight * (1 - ratio)}
              x2={chartWidth - padding.right}
              y2={padding.top + graphHeight * (1 - ratio)}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <text
              x={padding.left - 10}
              y={padding.top + graphHeight * (1 - ratio) + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6b7280"
            >
              {Math.round(maxValue * ratio)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((item, index) => {
          const x = padding.left + index * (groupWidth + 30);
          const candidatesHeight = (item.candidates / maxValue) * graphHeight;
          const recruitedHeight = (item.recruited / maxValue) * graphHeight;

          return (
            <g key={index}>
              {/* Candidates bar */}
              <rect
                x={x}
                y={padding.top + graphHeight - candidatesHeight}
                width={barWidth}
                height={candidatesHeight}
                fill="url(#candidatesGradient)"
                rx="4"
              />
              <text
                x={x + barWidth / 2}
                y={padding.top + graphHeight - candidatesHeight - 5}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#3b82f6"
              >
                {item.candidates}
              </text>

              {/* Recruited bar */}
              <rect
                x={x + barWidth + barGap}
                y={padding.top + graphHeight - recruitedHeight}
                width={barWidth}
                height={recruitedHeight}
                fill="url(#recruitedGradient)"
                rx="4"
              />
              <text
                x={x + barWidth + barGap + barWidth / 2}
                y={padding.top + graphHeight - recruitedHeight - 5}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#10b981"
              >
                {item.recruited}
              </text>

              {/* Month label */}
              <text
                x={x + groupWidth / 2}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#374151"
                fontWeight="500"
              >
                {item.month}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="candidatesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="recruitedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
