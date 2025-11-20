// web/src/pages/dash/AdminOverview.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api, fmtBDTEn } from '../../lib/api.js';
import { 
  Wallet, 
  CreditCard, 
  BarChart2, 
  BookOpen, 
  Users, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  GraduationCap,
  UserCheck,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from 'lucide-react';

function todayISO(){ return new Date().toISOString().slice(0,10); }
function firstOfMonthISO(){ const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); }

export default function AdminOverview() {
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState(firstOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [report, setReport] = useState(null);
  const [courses, setCourses] = useState([]);
  const [leads, setLeads] = useState([]);
  const [admissionLeads, setAdmissionLeads] = useState([]);
  const [recruited, setRecruited] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [targets, setTargets] = useState([]);
  const [err, setErr] = useState('');

  function parseRange() {
    if (period === 'custom' && from && to) return { from: new Date(from), to: new Date(to) };
    if (period === 'lifetime') return { from: null, to: null };
    const now = new Date();
    let f = new Date();
    if (period === 'daily') f.setDate(now.getDate() - 1);
    else if (period === 'weekly') f.setDate(now.getDate() - 7);
    else if (period === 'monthly') f.setMonth(now.getMonth() - 1);
    else if (period === 'yearly') f.setFullYear(now.getFullYear() - 1);
    return { from: f, to: now };
  }

  const load = async () => {
    try {
      // compute from/to to send to server for all period types (except lifetime)
      let qFrom, qTo;
      if (period === 'custom') { qFrom = from; qTo = to; }
      else if (period === 'lifetime') { qFrom = undefined; qTo = undefined; }
      else {
        // compute server-friendly YYYY-MM-DD
        const now = new Date();
        const f = new Date();
        if (period === 'daily') f.setDate(now.getDate() - 1);
        else if (period === 'weekly') f.setDate(now.getDate() - 7);
        else if (period === 'monthly') f.setMonth(now.getMonth() - 1);
        else if (period === 'yearly') f.setFullYear(now.getFullYear() - 1);
        qFrom = f.toISOString().slice(0,10);
        qTo = now.toISOString().slice(0,10);
      }
      // Get current month for targets
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const [r, cs, ls, als, recs, t, inc, exp, tgt] = await Promise.all([
        api.reportsOverview(qFrom, qTo),
        api.listCourses().catch(()=>({ courses: [] })),
        api.listLeads().catch(()=>({ leads: [] })),
        api.listAdmissionLeads().catch(()=>({ leads: [] })),
        api.listRecruited().catch(()=>[]),
        api.listAllTasks().catch(()=>({ tasks: [] })),
        api.listIncome().catch(()=>[]),
        api.listExpenses().catch(()=>[]),
        api.getAdmissionTargets(currentMonth).catch(()=>({ targets: [] }))
      ]);
      setReport(r);
      setCourses(cs?.courses || []);
      setLeads(ls?.leads || []);
      setAdmissionLeads(als?.leads || []);
      setRecruited(Array.isArray(recs) ? recs : (recs?.candidates || []));
      setTasks(t?.tasks || []);
      setIncomes(Array.isArray(inc) ? inc : (inc?.income || []));
      setExpenses(Array.isArray(exp) ? exp : (exp?.expenses || []));
      setTargets(tgt?.targets || []);
      setErr('');
    } catch(e) { setErr(e.message || 'Failed to load'); }
  };

  useEffect(()=>{ load(); }, []);

  const { from: rangeFrom, to: rangeTo } = parseRange();

  const filteredLeads = useMemo(()=>{
    if (!rangeFrom && !rangeTo) return leads;
    return leads.filter(l=>{ const d=new Date(l.createdAt||l.date||l._id&&null); return d && (!rangeFrom||d>=rangeFrom) && (!rangeTo||d<=rangeTo); });
  }, [leads, rangeFrom, rangeTo]);

  const filteredAdmission = useMemo(()=>{
    if (!rangeFrom && !rangeTo) return admissionLeads;
    return admissionLeads.filter(l=>{ const d=new Date(l.createdAt||l.date||l._id&&null); return d && (!rangeFrom||d>=rangeFrom) && (!rangeTo||d<=rangeTo); });
  }, [admissionLeads, rangeFrom, rangeTo]);

  const filteredTasks = useMemo(()=>{
    if (!rangeFrom && !rangeTo) return tasks;
    return tasks.filter(t=>{ const d=new Date(t.createdAt||t.deadline||null); return d && (!rangeFrom||d>=rangeFrom) && (!rangeTo||d<=rangeTo); });
  }, [tasks, rangeFrom, rangeTo]);

  const totalIncome = report?.combined?.income ?? 0;
  const totalExpense = report?.combined?.expense ?? 0;
  const totalNet = report?.combined?.net ?? (totalIncome - totalExpense);
  const totalActiveCourses = (courses || []).filter(c=>c.status==='Active').length;
  const totalLeads = filteredLeads.length;
  const totalAdmitted = filteredAdmission.filter(l=> (l.status||'').toLowerCase() === 'admitted').length;
  const totalRecruited = (recruited || []).length;

  // prepare income/expense timeseries by day
  const series = useMemo(()=>{
    if (!rangeFrom || !rangeTo) return [];
    const out = [];
    const cur = new Date(rangeFrom);
    while (cur <= rangeTo) {
      const key = cur.toISOString().slice(0,10);
      const incSum = (incomes || []).filter(i=> new Date(i.date).toISOString().slice(0,10) === key).reduce((s,x)=>s+(Number(x.amount)||0),0);
      const expSum = (expenses || []).filter(e=> new Date(e.date).toISOString().slice(0,10) === key).reduce((s,x)=>s+(Number(x.amount)||0),0);
      out.push({ date: key, income: incSum, expense: expSum });
      cur.setDate(cur.getDate()+1);
    }
    return out;
  }, [incomes, expenses, rangeFrom, rangeTo]);

  const expenseBreakdown = useMemo(()=>{
    // combine accounting expenses + dm costs by purpose/category
    const map = {};
    (expenses || []).forEach(e=>{ const k = e.category || e.purpose || 'Other'; map[k] = (map[k]||0)+Number(e.amount||0); });
    return map;
  }, [expenses]);

  const onApply = (e)=>{ e?.preventDefault?.(); load(); };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your business overview</p>
        </div>
        <form onSubmit={onApply} className="flex flex-wrap items-center gap-2">
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
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors" 
                value={from} 
                onChange={e=>setFrom(e.target.value)} 
              />
              <span className="text-gray-500 font-medium">to</span>
              <input 
                type="date" 
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors" 
                value={to} 
                onChange={e=>setTo(e.target.value)} 
              />
            </>
          )}
          <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
            Apply
          </button>
        </form>
      </div>

      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-700 font-medium">{err}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income Card */}
        <div className="group relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Total Income</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(totalIncome)}</h3>
          </div>
        </div>

        {/* Total Expense Card */}
        <div className="group relative bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <ArrowDownRight className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Total Expense</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(totalExpense)}</h3>
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <BarChart2 className="w-4 h-4 text-white/70" />
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Net Balance</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(totalNet)}</h3>
          </div>
        </div>

        {/* Active Courses Card */}
        <div className="group relative bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white font-medium">Active</span>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Active Courses</p>
            <h3 className="text-2xl font-bold text-white">{totalActiveCourses}</h3>
          </div>
        </div>

        {/* Total Leads Card */}
        <div className="group relative bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white font-medium">Leads</span>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Total Leads</p>
            <h3 className="text-2xl font-bold text-white">{totalLeads}</h3>
          </div>
        </div>

        {/* Admitted Students Card */}
        <div className="group relative bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white font-medium">Students</span>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Admitted Students</p>
            <h3 className="text-2xl font-bold text-white">{totalAdmitted}</h3>
          </div>
        </div>

        {/* Recruited People Card */}
        <div className="group relative bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white font-medium">Team</span>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Recruited People</p>
            <h3 className="text-2xl font-bold text-white">{totalRecruited}</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Chart */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Income vs Expense</h3>
              <p className="text-sm text-gray-500 mt-1">Financial trend over time</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600 font-medium">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-600 font-medium">Expense</span>
              </div>
            </div>
          </div>
          <LineChartDual data={series} />
        </div>

        {/* Admission Target Table */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <div className="mb-6 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <Target className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Admission Targets</h3>
              <p className="text-sm text-gray-500 mt-1">Current month performance (view only)</p>
            </div>
          </div>
          
          {targets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="font-medium">No targets set for this month</p>
              <p className="text-sm mt-1">Admins can set targets from the Admission Targets page</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Course Name</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Target</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Achieved</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((t, idx) => {
                    const percentage = t.percentage || 0;
                    const color = percentage >= 100 ? 'green' : percentage >= 75 ? 'blue' : percentage >= 50 ? 'yellow' : 'red';
                    const bgColor = percentage >= 100 ? 'bg-green-500' : percentage >= 75 ? 'bg-blue-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500';
                    const textColor = percentage >= 100 ? 'text-green-600' : percentage >= 75 ? 'text-blue-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600';
                    
                    return (
                      <tr key={t._id} className={`border-b hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <GraduationCap size={16} className="text-purple-600" />
                            <span className="text-sm font-medium text-gray-800">
                              {t.course?.name || 'Unknown Course'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                            {t.target}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center px-3 py-1 ${bgColor} bg-opacity-10 ${textColor} rounded-full text-sm font-semibold`}>
                            {t.achieved}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 rounded-full ${bgColor} transition-all duration-500 ease-out`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold ${textColor} min-w-[45px] text-right`}>
                              {percentage}%
                            </span>
                          </div>
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
    </div>
  );
}

function LineChartDual({ data }){
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
  
  const max = Math.max(...data.map(d=>Math.max(d.income||0,d.expense||0)), 1);
  const stepX = (width - padding*2) / Math.max(1, data.length-1);
  
  const incomePoints = data.map((d,i)=>`${padding + i*stepX},${height - padding - (max ? (d.income / max) * (height - padding*2) : 0)}`).join(' ');
  const expensePoints = data.map((d,i)=>`${padding + i*stepX},${height - padding - (max ? (d.expense / max) * (height - padding*2) : 0)}`).join(' ');
  
  // Create gradient fill areas
  const incomeArea = `${incomePoints} ${padding + (data.length-1)*stepX},${height-padding} ${padding},${height-padding}`;
  const expenseArea = `${expensePoints} ${padding + (data.length-1)*stepX},${height-padding} ${padding},${height-padding}`;
  
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
        <defs>
          <linearGradient id="incomeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
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
        <polygon fill="url(#incomeGradient)" points={incomeArea} />
        <polygon fill="url(#expenseGradient)" points={expenseArea} />
        
        {/* Lines */}
        <polyline fill="none" stroke="#10b981" strokeWidth="3" points={incomePoints} strokeLinecap="round" strokeLinejoin="round" />
        <polyline fill="none" stroke="#ef4444" strokeWidth="3" points={expensePoints} strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + i * stepX;
          const yIncome = height - padding - (max ? (d.income / max) * (height - padding*2) : 0);
          const yExpense = height - padding - (max ? (d.expense / max) * (height - padding*2) : 0);
          return (
            <g key={i}>
              <circle cx={x} cy={yIncome} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
              <circle cx={x} cy={yExpense} r="4" fill="#ef4444" stroke="white" strokeWidth="2" />
            </g>
          );
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
          <p className="text-gray-500 font-medium">No expense data</p>
        </div>
      </div>
    );
  }
  
  let acc = 0;
  const size = 160; 
  const cx = size/2; 
  const cy = size/2; 
  const r = size/2 - 4;
  const innerR = r * 0.6; // Donut chart
  
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#f97316'  // orange
  ];
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-md">
          <defs>
            {entries.map(([k], idx) => (
              <linearGradient key={k} id={`gradient-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors[idx % colors.length]} stopOpacity="1" />
                <stop offset="100%" stopColor={colors[idx % colors.length]} stopOpacity="0.7" />
              </linearGradient>
            ))}
          </defs>
          
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
            
            // Donut path
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
                fill={`url(#gradient-${idx})`}
                stroke="#fff" 
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
          
          {/* Center circle */}
          <circle cx={cx} cy={cy} r={innerR} fill="white" />
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#6b7280">
            Total
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1f2937">
            {total}
          </text>
        </svg>
      </div>
      
      {/* Legend */}
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
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {k.replace(/([A-Z])/g,' $1')}
                </span>
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
