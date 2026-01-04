import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, fmtBDTEn } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Wallet,
  PieChart as PieChartIcon,
  BarChart2,
  Settings,
  Building2
} from 'lucide-react';

export default function AccountingDashboard() {
  const { user } = useAuth();
  
  if (!['Accountant','Admin','SuperAdmin'].includes(user?.role)) {
    return <div className="text-royal">Only Accountant, Admin or SuperAdmin can access this dashboard.</div>;
  }

  const [range, setRange] = useState({
    period: 'monthly',
    from: new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10),
    to: new Date().toISOString().slice(0,10)
  });
  const [data, setData] = useState({ totalIncome:0, totalExpense:0, profit:0 });
  const [balances, setBalances] = useState({ bankBalance: 0, pettyCash: 0 });
  const [err, setErr] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showHeadsModal, setShowHeadsModal] = useState(false);
  const [heads, setHeads] = useState({ incomes: [], expenses: [] });

  const load = async () => {
    try {
      let qFrom, qTo;
      const now = new Date();
      
      if (range.period === 'custom') { 
        qFrom = range.from; 
        qTo = range.to; 
      }
      else if (range.period === 'lifetime') { 
        qFrom = undefined; 
        qTo = undefined; 
      }
      else if (range.period === 'daily') {
        // Today only
        qFrom = now.toISOString().slice(0,10);
        qTo = now.toISOString().slice(0,10);
      }
      else if (range.period === 'weekly') {
        // This week (Monday to Sunday)
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - mondayOffset);
        qFrom = monday.toISOString().slice(0,10);
        qTo = now.toISOString().slice(0,10);
      }
      else if (range.period === 'monthly') {
        // This month (e.g., January 1 - January 31)
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        qFrom = firstDay.toISOString().slice(0,10);
        qTo = now.toISOString().slice(0,10);
      }
      else if (range.period === 'yearly') {
        // This year (January 1 - December 31)
        const firstDay = new Date(now.getFullYear(), 0, 1);
        qFrom = firstDay.toISOString().slice(0,10);
        qTo = now.toISOString().slice(0,10);
      }
      
      const [d, incResp, expResp, balResp] = await Promise.all([
        api.accountingSummary(qFrom, qTo),
        api.listIncome().catch(()=>({ income: [] })),
        api.listExpenses().catch(()=>({ expenses: [] })),
        api.getBankBalances().catch(()=>({ bankBalance: 0, pettyCash: 0 }))
      ]);
      setData(d || { totalIncome:0, totalExpense:0, profit:0 });
      setIncomes(Array.isArray(incResp) ? incResp : (incResp?.income || []));
      setExpenses(Array.isArray(expResp) ? expResp : (expResp?.expenses || []));
      setBalances(balResp || { bankBalance: 0, pettyCash: 0 });
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line
  
  // Reload when period or custom dates change
  useEffect(() => { 
    if (range.period !== 'custom') {
      load(); 
    }
  }, [range.period]); // eslint-disable-line

  const location = useLocation();
  useEffect(() => {
    try {
      const raw = localStorage.getItem('accountHeads');
      setHeads(raw ? JSON.parse(raw) : { incomes: [], expenses: [] });
    } catch (e) { setHeads({ incomes: [], expenses: [] }); }
    try {
      const qp = new URLSearchParams(location.search || '');
      const open = qp.get('openHeads') || qp.get('openHeadsModal');
      if (open) setShowHeadsModal(true);
    } catch (e) { /* ignore */ }
  }, [location.search]);

  const netBalance = (data.totalIncome || 0) - (data.totalExpense || 0);
  const series = makeSeries(incomes, expenses, range);
  const breakdown = makeBreakdown(expenses);

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Accounting Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Financial overview and metrics</p>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-700 font-medium">{err}</p>
        </div>
      )}

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <select 
          value={range.period} 
          onChange={e=>setRange(r=>({...r,period:e.target.value}))} 
          className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="lifetime">Lifetime</option>
          <option value="custom">Custom</option>
        </select>
        {range.period === 'custom' && (
          <>
            <input 
              type="date" 
              value={range.from} 
              onChange={e=>setRange(r=>({...r,from:e.target.value}))} 
              className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <span className="text-gray-500 font-medium">to</span>
            <input 
              type="date" 
              value={range.to} 
              onChange={e=>setRange(r=>({...r,to:e.target.value}))} 
              className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </>
        )}
        <button 
          onClick={load} 
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg"
        >
          Apply
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Income */}
        <div className="group relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Total Income</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(data.totalIncome || 0)}</h3>
          </div>
        </div>

        {/* Total Expense */}
        <div className="group relative bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Total Expense</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(data.totalExpense || 0)}</h3>
          </div>
        </div>

        {/* Profit/Loss */}
        <div className={`group relative ${netBalance >= 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-red-600 to-rose-700'} rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">{netBalance >= 0 ? 'Profit' : 'Loss'}</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(Math.abs(netBalance))}</h3>
          </div>
        </div>

        {/* New Course Sale */}
        <div className="group relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">New Course Sale</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(data.admissionFeesIncome || 0)}</h3>
          </div>
        </div>

        {/* Collected Dues */}
        <div className="group relative bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Collected Dues</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(data.dueCollectionIncome || 0)}</h3>
          </div>
        </div>

        {/* Present Dues */}
        <div className="group relative bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Present Dues</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(data.presentDues || 0)}</h3>
          </div>
        </div>

        {/* Recruitment Income */}
        <div className="group relative bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Recruitment Income</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(data.recruitmentIncome || 0)}</h3>
          </div>
        </div>

        {/* Cash in Bank */}
        <div className="group relative bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Cash in Bank</p>
            <h3 className={`text-2xl font-bold ${balances.bankBalance < 0 ? 'text-red-200' : 'text-white'}`}>
              {fmtBDTEn(balances.bankBalance || 0)}</h3>
          </div>
        </div>

        {/* Petty Cash */}
        <div className="group relative bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-medium mb-1">Petty Cash</p>
            <h3 className="text-2xl font-bold text-white">{fmtBDTEn(balances.pettyCash || 0)}</h3>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Income by Source Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Income by Source</h3>
              <p className="text-sm text-gray-500 mt-1">Revenue distribution breakdown</p>
            </div>
            <PieChartIcon className="w-5 h-5 text-gray-400" />
          </div>
          <PieChart data={[
            { label: 'Admission Fees', value: data.admissionFeesIncome || 0, color: '#10b981' },
            { label: 'Recruitment', value: data.recruitmentIncome || 0, color: '#3b82f6' },
            { label: 'Due Collections', value: data.dueCollectionIncome || 0, color: '#f59e0b' },
            { label: 'Other', value: data.otherIncome || 0, color: '#8b5cf6' }
          ].filter(item => item.value > 0)} />
        </div>

        {/* Expense by Head Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Expense by Head</h3>
              <p className="text-sm text-gray-500 mt-1">Distribution breakdown</p>
            </div>
            <PieChartIcon className="w-5 h-5 text-gray-400" />
          </div>
          <PieChart data={breakdown} />
        </div>
      </div>

      {/* Modal */}
      {showHeadsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={()=>setShowHeadsModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl transform transition-all" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Account Heads Management
              </h2>
              <button 
                onClick={()=>setShowHeadsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <HeadEditor kind="incomes" heads={heads.incomes} onChange={(arr)=>setHeads(h=>({ ...h, incomes: arr }))} />
              <HeadEditor kind="expenses" heads={heads.expenses} onChange={(arr)=>setHeads(h=>({ ...h, expenses: arr }))} />
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={()=>setShowHeadsModal(false)} 
                className="px-6 py-2 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Close
              </button>
              <button 
                onClick={()=>{ localStorage.setItem('accountHeads', JSON.stringify(heads)); setShowHeadsModal(false); }} 
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeadEditor({ kind, heads = [], onChange }){
  const [list, setList] = useState(heads || []);
  const [val, setVal] = useState('');
  
  useEffect(()=>{ setList(heads || []); }, [heads]);
  
  const add = ()=>{ 
    if (!val.trim()) return; 
    const next = [val.trim(), ...list]; 
    setList(next); 
    setVal(''); 
    onChange && onChange(next); 
  };
  
  const remove = (i)=>{ 
    const next = list.filter((_,idx)=>idx!==i); 
    setList(next); 
    onChange && onChange(next); 
  };

  const isIncome = kind === 'incomes';
  const bgColor = isIncome ? 'from-green-50 to-emerald-50' : 'from-red-50 to-rose-50';
  const accentColor = isIncome ? 'from-green-600 to-emerald-600' : 'from-red-600 to-rose-600';

  return (
    <div className="space-y-3">
      <h4 className={`text-lg font-bold bg-gradient-to-r ${accentColor} bg-clip-text text-transparent`}>
        {kind === 'incomes' ? 'Income Heads' : 'Expense Heads'}
      </h4>
      
      <div className="flex gap-2">
        <input 
          value={val} 
          onChange={e=>setVal(e.target.value)} 
          placeholder={isIncome ? 'New income head' : 'New expense head'} 
          className="border-2 border-gray-200 rounded-xl px-4 py-2 flex-1 focus:border-blue-500 focus:outline-none transition-colors"
          onKeyPress={(e) => e.key === 'Enter' && add()}
        />
        <button 
          onClick={add} 
          className={`px-4 py-2 bg-gradient-to-r ${accentColor} text-white rounded-xl hover:opacity-90 transition-opacity font-medium shadow-lg`}
        >
          Add
        </button>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {list.map((h, i)=> (
          <div key={h + i} className={`flex items-center justify-between bg-gradient-to-r ${bgColor} rounded-xl px-4 py-3 hover:shadow-md transition-all`}>
            <span className="text-gray-800 font-medium">{h}</span>
            <button 
              onClick={()=>remove(i)} 
              className="px-3 py-1 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors font-medium"
            >
              Remove
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No {kind === 'incomes' ? 'income' : 'expense'} heads defined</p>
          </div>
        )}
      </div>
    </div>
  );
}

function makeSeries(incomes = [], expenses = [], range) {
  let from, to;
  if (range.period === 'custom') { from = new Date(range.from); to = new Date(range.to); }
  else if (range.period === 'lifetime') { return []; }
  else {
    const now = new Date();
    from = new Date();
    if (range.period === 'daily') from.setDate(now.getDate() - 1);
    else if (range.period === 'weekly') from.setDate(now.getDate() - 7);
    else if (range.period === 'monthly') from.setMonth(now.getMonth() - 1);
    else if (range.period === 'yearly') from.setFullYear(now.getFullYear() - 1);
    to = now;
  }
  if (!from || !to) return [];
  const out = [];
  const cur = new Date(from);
  while (cur <= to) {
    const key = cur.toISOString().slice(0,10);
    const incSum = incomes.filter(i=> new Date(i.date).toISOString().slice(0,10) === key).reduce((s,x)=>s+(Number(x.amount)||0),0);
    const expSum = expenses.filter(e=> new Date(e.date).toISOString().slice(0,10) === key).reduce((s,x)=>s+(Number(x.amount)||0),0);
    out.push({ date: key, income: incSum, expense: expSum });
    cur.setDate(cur.getDate()+1);
  }
  return out;
}

function makeBreakdown(expenses = []){
  const map = {};
  (expenses || []).forEach(e=>{ const k = e.purpose || e.category || 'Other'; map[k] = (map[k]||0) + Number(e.amount||0); });
  return Object.entries(map).map(([label, value]) => ({ label, value }));
}

function LineChartDual({ data }) {
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
  
  const w = 600, h = 250;
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const padding = { left: 50, right: 30, top: 20, bottom: 40 };
  const graphWidth = w - padding.left - padding.right;
  const graphHeight = h - padding.top - padding.bottom;
  const xStep = graphWidth / (data.length - 1 || 1);
  const yScale = (val) => padding.top + graphHeight - ((val / maxVal) * graphHeight);

  const incomePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${padding.left + i * xStep},${yScale(d.income)}`).join(' ');
  const expensePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${padding.left + i * xStep},${yScale(d.expense)}`).join(' ');
  
  const incomeArea = `${incomePath} L${padding.left + (data.length - 1) * xStep},${padding.top + graphHeight} L${padding.left},${padding.top + graphHeight} Z`;
  const expenseArea = `${expensePath} L${padding.left + (data.length - 1) * xStep},${padding.top + graphHeight} L${padding.left},${padding.top + graphHeight} Z`;

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="mx-auto">
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
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + graphHeight * (1 - ratio)}
              x2={w - padding.right}
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
              {Math.round(maxVal * ratio)}
            </text>
          </g>
        ))}

        {/* Area fills */}
        <path d={incomeArea} fill="url(#incomeGradient)" />
        <path d={expenseArea} fill="url(#expenseGradient)" />

        {/* Lines */}
        <path d={incomePath} stroke="#10b981" strokeWidth="3" fill="none" />
        <path d={expensePath} stroke="#ef4444" strokeWidth="3" fill="none" />

        {/* Data points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={padding.left + i * xStep} cy={yScale(d.income)} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
            <circle cx={padding.left + i * xStep} cy={yScale(d.expense)} r="4" fill="#ef4444" stroke="white" strokeWidth="2" />
            <text 
              x={padding.left + i * xStep} 
              y={h - padding.bottom + 20} 
              fontSize="12" 
              textAnchor="middle" 
              fill="#374151"
              fontWeight="500"
            >
              {d.date.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function PieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
        <div className="text-center">
          <PieChartIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">No data available</p>
        </div>
      </div>
    );
  }
  
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-52 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
        <div className="text-center">
          <PieChartIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">No expense recorded</p>
        </div>
      </div>
    );
  }

  const colors = [
    { base: "#3b82f6", gradient: "url(#gradient0)" },
    { base: "#8b5cf6", gradient: "url(#gradient1)" },
    { base: "#ec4899", gradient: "url(#gradient2)" },
    { base: "#f59e0b", gradient: "url(#gradient3)" },
    { base: "#10b981", gradient: "url(#gradient4)" },
    { base: "#ef4444", gradient: "url(#gradient5)" },
    { base: "#06b6d4", gradient: "url(#gradient6)" },
    { base: "#a855f7", gradient: "url(#gradient7)" },
  ];

  let currentAngle = -90;
  const cx = 120, cy = 120;
  const outerRadius = 90;
  const innerRadius = 60;

  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 360;
    const startAngle = currentAngle * Math.PI / 180;
    const endAngle = (currentAngle + sliceAngle) * Math.PI / 180;
    
    const x1 = cx + outerRadius * Math.cos(startAngle);
    const y1 = cy + outerRadius * Math.sin(startAngle);
    const x2 = cx + outerRadius * Math.cos(endAngle);
    const y2 = cy + outerRadius * Math.sin(endAngle);
    
    const x3 = cx + innerRadius * Math.cos(endAngle);
    const y3 = cy + innerRadius * Math.sin(endAngle);
    const x4 = cx + innerRadius * Math.cos(startAngle);
    const y4 = cy + innerRadius * Math.sin(startAngle);
    
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const path = `M${x1},${y1} A${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2},${y2} L${x3},${y3} A${innerRadius},${innerRadius} 0 ${largeArc},0 ${x4},${y4} Z`;
    
    const percentage = ((d.value / total) * 100).toFixed(1);
    currentAngle += sliceAngle;
    
    return { path, color: colors[i % colors.length], label: d.label, percentage, value: d.value };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="240" height="240" className="mx-auto">
        <defs>
          {colors.map((c, i) => (
            <linearGradient key={i} id={`gradient${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={c.base} stopOpacity="0.9" />
              <stop offset="100%" stopColor={c.base} stopOpacity="0.6" />
            </linearGradient>
          ))}
        </defs>
        {slices.map((slice, i) => (
          <path 
            key={i} 
            d={slice.path} 
            fill={slice.color.gradient}
            stroke="white"
            strokeWidth="2"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="12" fill="#6b7280" fontWeight="500">
          Total
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="18" fill="#1f2937" fontWeight="bold">
          {fmtBDTEn(total)}
        </text>
      </svg>
      
      <div className="grid grid-cols-2 gap-2 w-full">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[i % colors.length].base }}
            ></div>
            <span className="text-gray-700 font-medium truncate">
              {slice.label}
            </span>
            <span className="text-gray-500 ml-auto">
              {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
