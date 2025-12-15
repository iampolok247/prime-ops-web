import React, { useEffect, useState, useMemo } from 'react';
import { api, fmtBDTEn } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  DollarSign, 
  TrendingUp, 
  Facebook, 
  Instagram, 
  Youtube, 
  Linkedin, 
  Twitter,
  Search,
  FileText,
  Calendar,
  Plus,
  Trash2,
  Users,
  Eye,
  Target,
  Edit2,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';

export default function DMMetrics() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth()).toISOString().slice(0, 7);
  });

  // Generate months from November 2025 onwards (backwards compatible)
  const generateMonths = () => {
    const months = [];
    const startDate = new Date(2025, 10); // November 2025
    const today = new Date();
    
    let current = new Date(startDate);
    while (current <= today) {
      const yearMonth = current.toISOString().slice(0, 7);
      months.push(yearMonth);
      current.setMonth(current.getMonth() + 1);
    }
    
    return months.reverse(); // Latest first
  };
  
  // Error boundary
  try {
    if (user?.role !== 'DigitalMarketing') {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <p className="text-xl text-gray-600">Only Digital Marketing can access this page.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Digital Marketing Metrics
          </h1>
          <p className="text-gray-600 mt-1">Track expenses, social media performance, SEO activities, and ad campaigns</p>
        </div>

        {/* Month Filter */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <label className="text-sm font-semibold text-gray-700">Filter by Month:</label>
            </div>
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg bg-white font-medium text-gray-700 focus:border-blue-500 focus:outline-none transition-colors hover:border-gray-300"
            >
              {generateMonths().map(month => {
                const [year, monthNum] = month.split('-');
                const monthName = new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return <option key={month} value={month}>{monthName}</option>;
              })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Costs selectedMonth={selectedMonth} />
          <Social selectedMonth={selectedMonth} />
          <SEOReports selectedMonth={selectedMonth} />
        </div>

        {/* Ad Campaigns Section */}
        <Campaigns selectedMonth={selectedMonth} />
      </div>
    );
  } catch (error) {
    console.error('DMMetrics error:', error);
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center bg-red-50 p-6 rounded-lg border border-red-200">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-red-700 font-semibold">Error loading DM Metrics</p>
          <p className="text-red-600 text-sm mt-2">{error.message}</p>
        </div>
      </div>
    );
  }
}

function Costs({ selectedMonth }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), purpose:'Meta Ads', amount:0 });
  const [msg, setMsg] = useState(null); 
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const resp = await api.listDMCosts();
      let arr = [];
      if (Array.isArray(resp)) arr = resp;
      else if (Array.isArray(resp?.costs)) arr = resp.costs;
      else if (Array.isArray(resp?.items)) arr = resp.items;
      else arr = [];
      setList(Array.isArray(arr) ? arr : []);
      setErr(null);
    } catch (e) { 
      console.error('Failed to load DM costs:', e);
      setErr(e.message || 'Failed to load costs');
      setList([]);
    }
  };
  
  // Filter costs by selected month
  const filteredList = useMemo(() => {
    if (!selectedMonth) return list;
    return (Array.isArray(list) ? list : []).filter(item => {
      const itemMonth = new Date(item.date).toISOString().slice(0, 7);
      return itemMonth === selectedMonth;
    });
  }, [list, selectedMonth]);

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); 
    setMsg(null); 
    setErr(null);
    try { 
      await api.createDMCost(form); 
      setMsg('Cost added successfully!'); 
      setForm({ date: new Date().toISOString().slice(0,10), purpose:'Meta Ads', amount:0 }); 
      await load(); 
    } catch (e) { 
      console.error('Failed to add cost:', e);
      setErr(e.message || 'Failed to add cost');
    }
  };
  
  const remove = async (id) => {
    if (!confirm('Are you sure you want to delete this cost entry?')) return;
    try { 
      await api.deleteDMCost(id); 
      await load(); 
    } catch (e) { 
      console.error('Failed to delete cost:', e);
      setErr(e.message || 'Failed to delete');
    }
  };

  const stats = useMemo(() => {
    try {
      const total = (Array.isArray(filteredList) ? filteredList : []).reduce((sum, item) => {
        const amt = Number(item?.amount) || 0;
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
      
      const byPurpose = {};
      (Array.isArray(filteredList) ? filteredList : []).forEach(item => {
        if (item && item.purpose) {
          const amt = Number(item.amount) || 0;
          byPurpose[item.purpose] = (byPurpose[item.purpose] || 0) + (isNaN(amt) ? 0 : amt);
        }
      });
      return { total, byPurpose };
    } catch (e) {
      console.error('Error calculating stats:', e);
      return { total: 0, byPurpose: {} };
    }
  }, [filteredList]);

  const purposeColors = {
    'Meta Ads': 'bg-blue-100 text-blue-800',
    'LinkedIn Ads': 'bg-cyan-100 text-cyan-800',
    'Software Purchase': 'bg-purple-100 text-purple-800',
    'Subscription': 'bg-orange-100 text-orange-800',
    'Others': 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Marketing Expenses</h2>
              <p className="text-sm text-white/80">Track your advertising costs</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80">Total Spent</p>
            <p className="text-2xl font-bold">{fmtBDTEn(stats.total)}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {msg && (
          <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg">
            ✓ {msg}
          </div>
        )}
        {err && (
          <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
            ✗ {err}
          </div>
        )}

        {/* Stats Summary */}
        {Object.keys(stats.byPurpose).length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            {Object.entries(stats.byPurpose).map(([purpose, amount]) => (
              <div key={purpose} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="text-xs text-gray-600">{purpose}</div>
                <div className="text-sm font-bold text-gray-800">{fmtBDTEn(amount)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add Form */}
        <form onSubmit={add} className="mb-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">Add New Expense</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Date</label>
              <input 
                type="date" 
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-pink-500 focus:outline-none transition-colors" 
                value={form.date} 
                onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Purpose</label>
              <select 
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-pink-500 focus:outline-none transition-colors" 
                value={form.purpose} 
                onChange={e=>setForm(f=>({...f,purpose:e.target.value}))}
                required
              >
                <option>Meta Ads</option>
                <option>LinkedIn Ads</option>
                <option>Software Purchase</option>
                <option>Subscription</option>
                <option>Others</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Amount (BDT)</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-pink-500 focus:outline-none transition-colors" 
                value={form.amount} 
                onChange={e=>setForm(f=>({...f,amount:e.target.value}))}
                placeholder="0.00"
                required
              />
            </div>
            <button className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg px-4 py-2.5 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>
        </form>

        {/* Expenses List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No expenses recorded for this month</p>
            </div>
          ) : (
            filteredList.map(r=>(
              <div key={r._id} className="group bg-gray-50 hover:bg-gray-100 rounded-lg p-3 border border-gray-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {new Date(r.date).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${purposeColors[r.purpose] || purposeColors['Others']}`}>
                        {r.purpose}
                      </span>
                      <span className="text-sm font-bold text-gray-800">{fmtBDTEn(r.amount)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={()=>remove(r._id)} 
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Social({ selectedMonth }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    facebookFollowers: 0, instagramFollowers: 0, facebookGroupMembers: 0, youtubeSubscribers: 0,
    linkedInFollowers: 0, xFollowers: 0, pinterestView: 0, bloggerImpression: 0, totalReach: 0
  });
  const [msg, setMsg] = useState(null); 
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const resp = await api.listSocial();
      // server exposes latest metrics as { metrics: { ... }, updatedAt }
      const m = resp?.metrics || resp?.social || {};
      if (m && typeof m === 'object' && Object.keys(m).length > 0) {
        const mapped = {
          facebookFollowers: Number(m.facebookFollowers) || 0,
          instagramFollowers: Number(m.instagramFollowers) || 0,
          facebookGroupMembers: Number(m.facebookGroupMembers) || 0,
          youtubeSubscribers: Number(m.youtubeSubscribers) || 0,
          linkedInFollowers: Number(m.linkedInFollowers) || 0,
          xFollowers: Number(m.xFollowers) || 0,
          pinterestView: Number(m.pinterestView) || 0,
          bloggerImpression: Number(m.bloggerImpression) || 0,
          totalReach: Number(m.totalReach) || 0
        };
        setForm(f => ({ ...f, ...mapped }));
        setList([{ _id: resp?.updatedAt || 'latest', date: resp?.updatedAt || form.date, ...mapped }]);
        setErr(null);
      } else {
        setList([]);
        setErr(null);
      }
    } catch (e) { 
      console.error('Failed to load social metrics:', e);
      setErr(e.message || 'Failed to load social metrics');
      setList([]);
    }
  };
  
  // Filter social metrics by selected month
  const filteredList = useMemo(() => {
    if (!selectedMonth) return list;
    return (Array.isArray(list) ? list : []).filter(item => {
      const itemMonth = new Date(item.date).toISOString().slice(0, 7);
      return itemMonth === selectedMonth;
    });
  }, [list, selectedMonth]);

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); 
    setMsg(null); 
    setErr(null);
    try { 
      await api.createSocial(form); 
      setMsg('Social metrics updated successfully!'); 
      await load(); 
    } catch (e) { 
      console.error('Failed to save social metrics:', e);
      setErr(e.message || 'Failed to save social metrics');
    }
  };

  const socialPlatforms = [
    { key: 'facebookFollowers', label: 'Facebook', icon: Facebook, color: 'from-blue-500 to-blue-600' },
    { key: 'instagramFollowers', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
    { key: 'facebookGroupMembers', label: 'FB Group', icon: Users, color: 'from-blue-400 to-blue-500' },
    { key: 'youtubeSubscribers', label: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-600' },
    { key: 'linkedInFollowers', label: 'LinkedIn', icon: Linkedin, color: 'from-cyan-500 to-cyan-600' },
    { key: 'xFollowers', label: 'X (Twitter)', icon: Twitter, color: 'from-gray-700 to-gray-800' },
    { key: 'pinterestView', label: 'Pinterest', icon: Eye, color: 'from-red-600 to-red-700' },
    { key: 'bloggerImpression', label: 'Blogger', icon: FileText, color: 'from-orange-500 to-orange-600' },
    { key: 'totalReach', label: 'Total Reach', icon: Target, color: 'from-green-500 to-green-600' }
  ];

  const totalFollowers = useMemo(() => {
    return form.facebookFollowers + form.instagramFollowers + form.facebookGroupMembers + 
           form.youtubeSubscribers + form.linkedInFollowers + form.xFollowers;
  }, [form]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-5">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Social Media Metrics</h2>
              <p className="text-sm text-white/80">Track your social presence</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80">Total Followers</p>
            <p className="text-2xl font-bold">{totalFollowers.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {msg && (
          <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg">
            ✓ {msg}
          </div>
        )}
        {err && (
          <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
            ✗ {err}
          </div>
        )}

        {/* Current Metrics Display */}
        {filteredList.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            {socialPlatforms.map(platform => {
              const Icon = platform.icon;
              const value = form[platform.key];
              return (
                <div key={platform.key} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1.5 bg-gradient-to-r ${platform.color} rounded-lg`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{platform.label}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-800">{value.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Update Form */}
        <form onSubmit={add} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-900">Update Metrics</h3>
          </div>
          
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">Date</label>
            <input 
              type="date" 
              className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 focus:border-purple-500 focus:outline-none transition-colors bg-white" 
              value={form.date} 
              onChange={e=>setForm(f=>({...f,date:e.target.value}))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {socialPlatforms.map(platform => (
              <div key={platform.key}>
                <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1">
                  <platform.icon className="w-3 h-3" />
                  {platform.label}
                </label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 focus:border-purple-500 focus:outline-none transition-colors bg-white text-sm" 
                  value={form[platform.key]} 
                  onChange={e=>setForm(f=>({...f,[platform.key]:Number(e.target.value)}))}
                />
              </div>
            ))}
          </div>

          <button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg px-4 py-2.5 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Update Metrics
          </button>
        </form>

        {/* Last Updated Info */}
        {filteredList.length > 0 && (
          <div className="mt-3 text-xs text-gray-500 text-center">
            Last updated: {new Date(filteredList[0].date).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SEOReports({ selectedMonth }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), typeOfWork:'Blogpost', challenge:'', details:'' });
  const [msg, setMsg] = useState(null); const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const resp = await api.listSEO();
      let arr = [];
      if (Array.isArray(resp)) arr = resp;
      else if (Array.isArray(resp?.seo)) arr = resp.seo;
      else if (Array.isArray(resp?.items)) arr = resp.items;
      setList(arr);
    } catch (e) { setErr(e.message); }
  };
  
  // Filter SEO reports by selected month
  const filteredList = useMemo(() => {
    if (!selectedMonth) return list;
    return (Array.isArray(list) ? list : []).filter(item => {
      const itemMonth = new Date(item.date).toISOString().slice(0, 7);
      return itemMonth === selectedMonth;
    });
  }, [list, selectedMonth]);

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); setMsg(null); setErr(null);
    try { 
      await api.createSEO(form); 
      setMsg('SEO report added successfully!'); 
      setForm({ date: new Date().toISOString().slice(0,10), typeOfWork:'Blogpost', challenge:'', details:'' });
      setOpen(false); 
      load(); 
    } catch (e) { setErr(e.message); }
  };

  const typeColors = {
    'Blogpost': 'bg-green-100 text-green-800',
    'Backlink': 'bg-blue-100 text-blue-800',
    'Social Bookmarking': 'bg-purple-100 text-purple-800',
    'Keyword Research': 'bg-orange-100 text-orange-800',
    'Others': 'bg-gray-100 text-gray-800'
  };

  const stats = useMemo(() => {
    const byType = {};
    filteredList.forEach(item => {
      byType[item.typeOfWork] = (byType[item.typeOfWork] || 0) + 1;
    });
    return { total: filteredList.length, byType };
  }, [filteredList]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 p-5">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">SEO Activities</h2>
              <p className="text-sm text-white/80">Track your SEO work</p>
            </div>
          </div>
          <button 
            onClick={()=>setOpen(true)} 
            className="bg-white text-green-600 rounded-lg px-4 py-2 font-semibold hover:bg-green-50 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Report
          </button>
        </div>
      </div>

      <div className="p-5">
        {msg && (
          <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg">
            ✓ {msg}
          </div>
        )}
        {err && (
          <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
            ✗ {err}
          </div>
        )}

        {/* Stats Summary */}
        {stats.total > 0 && (
          <div className="mb-4 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-green-900">Summary</h3>
              <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold">{stats.total} Reports</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="bg-white rounded-lg p-2 border border-green-200">
                  <div className="text-xs text-gray-600">{type}</div>
                  <div className="text-lg font-bold text-gray-800">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No SEO reports for this month</p>
              <button 
                onClick={()=>setOpen(true)}
                className="mt-3 text-green-600 hover:text-green-700 font-medium text-sm"
              >
                Add your first report →
              </button>
            </div>
          ) : (
            filteredList.map(r=>(
              <div key={r._id} className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 border border-gray-200 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {new Date(r.date).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[r.typeOfWork] || typeColors['Others']}`}>
                    {r.typeOfWork}
                  </span>
                </div>
                {r.challenge && (
                  <div className="mb-1">
                    <span className="text-xs text-gray-500 font-medium">Challenge:</span>
                    <p className="text-sm text-gray-700 mt-0.5">{r.challenge}</p>
                  </div>
                )}
                {r.details && (
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Details:</span>
                    <p className="text-sm text-gray-700 mt-0.5">{r.details}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={add} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Add SEO Report</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none transition-colors" 
                    value={form.date} 
                    onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type of Work</label>
                  <select 
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none transition-colors" 
                    value={form.typeOfWork} 
                    onChange={e=>setForm(f=>({...f,typeOfWork:e.target.value}))}
                    required
                  >
                    <option>Blogpost</option>
                    <option>Backlink</option>
                    <option>Social Bookmarking</option>
                    <option>Keyword Research</option>
                    <option>Others</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Challenge</label>
                <input 
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none transition-colors" 
                  value={form.challenge} 
                  onChange={e=>setForm(f=>({...f,challenge:e.target.value}))}
                  placeholder="What challenges did you face?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                <textarea 
                  rows="4" 
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none transition-colors resize-none" 
                  value={form.details} 
                  onChange={e=>setForm(f=>({...f,details:e.target.value}))}
                  placeholder="Describe the work you did..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={()=>setOpen(false)} 
                className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Save Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// =============== Ad Campaigns Component ===============
function Campaigns({ selectedMonth }) {
  const [platform, setPlatform] = useState('Meta Ads');
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState(null);
  const [formData, setFormData] = useState({
    campaignName: '',
    platform: 'Meta Ads',
    boostType: 'Leads',
    cost: '',
    leads: '',
    postEngagements: '',
    thruPlays: '',
    impressions: '',
    reach: '',
    notes: '',
    campaignDate: new Date().toISOString().slice(0, 7)
  });

  // Filter campaigns by selected month
  const filteredCampaigns = useMemo(() => {
    if (!selectedMonth) return campaigns;
    return (Array.isArray(campaigns) ? campaigns : []).filter(item => {
      const itemMonth = new Date(item.campaignDate || item.createdAt).toISOString().slice(0, 7);
      return itemMonth === selectedMonth;
    });
  }, [campaigns, selectedMonth]);

  // Recalculate summary based on filtered campaigns
  const filteredSummary = useMemo(() => {
    if (!filteredCampaigns.length || !summary) return summary;
    
    let totalCost = 0;
    let totalLeads = 0;
    let totalImpressions = 0;
    
    filteredCampaigns.forEach(campaign => {
      totalCost += Number(campaign.cost) || 0;
      totalLeads += Number(campaign.leads) || 0;
      totalImpressions += Number(campaign.impressions) || 0;
    });
    
    return {
      totalCost,
      totalLeads,
      avgCostPerLead: totalLeads > 0 ? totalCost / totalLeads : 0,
      totalImpressions
    };
  }, [filteredCampaigns, summary]);

  useEffect(() => {
    fetchCampaigns();
  }, [platform]);

  async function fetchCampaigns() {
    setLoading(true);
    setErr(null);
    try {
      const [campaignsResp, summaryResp] = await Promise.all([
        api.listDMCampaigns(platform).catch(e => { 
          console.warn('Campaigns fetch failed', e); 
          return { campaigns: [] }; 
        }),
        api.getDMCampaignsSummary(platform).catch(e => { 
          console.warn('Summary fetch failed', e); 
          return { summary: null }; 
        })
      ]);
      
      // Ensure campaigns is always an array
      const campaignsList = Array.isArray(campaignsResp?.campaigns) ? campaignsResp.campaigns : [];
      setCampaigns(campaignsList);
      
      // Ensure summary is safe
      const summaryData = (summaryResp?.summary && typeof summaryResp.summary === 'object') ? summaryResp.summary : null;
      setSummary(summaryData);
    } catch (e) {
      console.error('Failed to fetch campaigns:', e);
      setErr(e.message || 'Failed to load campaigns');
      setCampaigns([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cost: Number(formData.cost),
        leads: Number(formData.leads) || 0,
        postEngagements: Number(formData.postEngagements) || 0,
        thruPlays: Number(formData.thruPlays) || 0,
        impressions: Number(formData.impressions) || 0,
        reach: Number(formData.reach) || 0
      };

      if (editingId) {
        await api.updateDMCampaign(editingId, payload);
      } else {
        await api.createDMCampaign(payload);
      }

      // Set selected month to the campaign's month to show it immediately
      setSelectedMonth(formData.campaignDate);
      
      setFormData({
        campaignName: '',
        platform: 'Meta Ads',
        boostType: 'Leads',
        cost: '',
        leads: '',
        postEngagements: '',
        thruPlays: '',
        impressions: '',
        reach: '',
        notes: '',
        campaignDate: new Date().toISOString().slice(0, 7)
      });
      setShowForm(false);
      setEditingId(null);
      await fetchCampaigns();
    } catch (e) {
      alert('Error: ' + (e.message || 'Failed to save campaign'));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.deleteDMCampaign(id);
      await fetchCampaigns();
    } catch (e) {
      alert('Error: ' + (e.message || 'Failed to delete'));
    }
  }

  function handleEdit(campaign) {
    setFormData({
      campaignName: campaign.campaignName || '',
      platform: campaign.platform || 'Meta Ads',
      boostType: campaign.boostType || 'Leads',
      cost: (campaign.cost || 0).toString(),
      leads: (campaign.leads || 0).toString(),
      postEngagements: (campaign.postEngagements || 0).toString(),
      thruPlays: (campaign.thruPlays || 0).toString(),
      impressions: (campaign.impressions || 0).toString(),
      reach: (campaign.reach || 0).toString(),
      notes: campaign.notes || '',
      campaignDate: campaign.campaignDate || new Date().toISOString().slice(0, 7)
    });
    setEditingId(campaign._id);
    setShowForm(true);
  }

  function downloadReport() {
    if (filteredCampaigns.length === 0) {
      alert('No campaigns to export for this month');
      return;
    }

    const [year, month] = selectedMonth.split('-');
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Create CSV content
    const headers = ['Campaign Name', 'Platform', 'Type', 'Cost (৳)', 'Leads', 'Engagements', 'ThruPlays', 'Impressions', 'Reach', 'CPL (৳)', 'Notes'];
    const rows = filteredCampaigns.map(c => [
      c.campaignName || '',
      c.platform || '',
      c.boostType || '',
      (c.cost || 0).toFixed(2),
      c.leads || 0,
      c.postEngagements || 0,
      c.thruPlays || 0,
      c.impressions || 0,
      c.reach || 0,
      c.costPerLead ? c.costPerLead.toFixed(2) : '0',
      c.notes || ''
    ]);

    // Add summary
    const summaryRows = [
      [],
      ['SUMMARY'],
      ['Total Cost', (Number(filteredSummary?.totalCost) || 0).toFixed(2)],
      ['Total Leads', Number(filteredSummary?.totalLeads) || 0],
      ['Average CPL', (Number(filteredSummary?.avgCostPerLead) || 0).toFixed(2)],
      ['Total Impressions', Number(filteredSummary?.totalImpressions) || 0]
    ];

    const csvContent = [
      [`Campaign Report - ${monthName}`],
      [],
      [headers.join(',')],
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...summaryRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Campaign-Report-${monthName.replace(/ /g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Ad Campaigns
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
            title="Download monthwise report"
          >
            <Download className="w-4 h-4" /> Download Report
          </button>
          <button 
            onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({campaignName: '', platform: 'Meta Ads', boostType: 'Leads', cost: '', leads: '', postEngagements: '', thruPlays: '', impressions: '', reach: '', notes: '', campaignDate: new Date().toISOString().slice(0, 7)}); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Campaign'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {err && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm">
          ✗ {err}
        </div>
      )}

      {/* Platform Selection */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium">Platform:</label>
        <select 
          value={platform} 
          onChange={e => setPlatform(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white text-sm"
        >
          <option value="Meta Ads">Meta Ads</option>
          <option value="LinkedIn Ads">LinkedIn Ads</option>
        </select>
      </div>

      {/* Summary Cards */}
      {filteredSummary && typeof filteredSummary === 'object' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
            <div className="text-xs text-blue-600 font-semibold uppercase">Total Cost</div>
            <div className="text-xl font-bold text-blue-900 mt-1">৳{(Number(filteredSummary.totalCost) || 0).toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
            <div className="text-xs text-green-600 font-semibold uppercase">Total Leads</div>
            <div className="text-xl font-bold text-green-900 mt-1">{Number(filteredSummary.totalLeads) || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
            <div className="text-xs text-purple-600 font-semibold uppercase">Avg CPL</div>
            <div className="text-xl font-bold text-purple-900 mt-1">৳{(Number(filteredSummary.avgCostPerLead) || 0).toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
            <div className="text-xs text-orange-600 font-semibold uppercase">Impressions</div>
            <div className="text-xl font-bold text-orange-900 mt-1">{((Number(filteredSummary.totalImpressions) || 0) / 1000).toFixed(1)}K</div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Campaign' : 'Add New Campaign'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Campaign Name *</label>
              <input 
                type="text" 
                name="campaignName" 
                value={formData.campaignName}
                onChange={handleFormChange}
                required 
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="e.g., AI For Personal Camp"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Campaign Month *</label>
              <select 
                name="campaignDate" 
                value={formData.campaignDate}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border rounded text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const d = new Date(2025, 10 + i);
                  const yearMonth = d.toISOString().slice(0, 7);
                  const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  return <option key={yearMonth} value={yearMonth}>{monthName}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Platform *</label>
              <select 
                name="platform" 
                value={formData.platform}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border rounded text-sm"
              >
                <option value="Meta Ads">Meta Ads</option>
                <option value="LinkedIn Ads">LinkedIn Ads</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Boost Type *</label>
              <select 
                name="boostType" 
                value={formData.boostType}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border rounded text-sm"
              >
                <option value="Leads">Leads</option>
                <option value="Engagements">Engagements</option>
                <option value="ThruPlays">ThruPlays</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Cost (৳) *</label>
              <input 
                type="number" 
                name="cost" 
                value={formData.cost}
                onChange={handleFormChange}
                required 
                step="0.01"
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Leads</label>
              <input 
                type="number" 
                name="leads" 
                value={formData.leads}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Engagements</label>
              <input 
                type="number" 
                name="postEngagements" 
                value={formData.postEngagements}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">ThruPlays</label>
              <input 
                type="number" 
                name="thruPlays" 
                value={formData.thruPlays}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Impressions</label>
              <input 
                type="number" 
                name="impressions" 
                value={formData.impressions}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Reach</label>
              <input 
                type="number" 
                name="reach" 
                value={formData.reach}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div className="lg:col-span-3 flex gap-2">
              <button 
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
              >
                {editingId ? 'Update' : 'Add'} Campaign
              </button>
              <button 
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="overflow-x-auto">
        {loading && filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading campaigns...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No campaigns for this month. Add one to get started!</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Campaign</th>
                <th className="px-3 py-2 text-left font-semibold">Type</th>
                <th className="px-3 py-2 text-right font-semibold">Cost (৳)</th>
                <th className="px-3 py-2 text-right font-semibold">Leads</th>
                <th className="px-3 py-2 text-right font-semibold">Eng</th>
                <th className="px-3 py-2 text-right font-semibold">Impressions</th>
                <th className="px-3 py-2 text-right font-semibold">Reach</th>
                <th className="px-3 py-2 text-right font-semibold">CPL</th>
                <th className="px-3 py-2 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((campaign, idx) => (
                <tr key={campaign._id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                  <td className="px-3 py-2">{campaign.campaignName || '—'}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {campaign.boostType || 'N/A'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{(campaign.cost || 0).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-right">{campaign.leads || 0}</td>
                  <td className="px-3 py-2 text-right">{campaign.postEngagements || 0}</td>
                  <td className="px-3 py-2 text-right">{((campaign.impressions || 0) / 1000).toFixed(1)}K</td>
                  <td className="px-3 py-2 text-right">{((campaign.reach || 0) / 1000).toFixed(1)}K</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700">
                    {campaign.costPerLead ? `৳${Number(campaign.costPerLead).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button 
                      onClick={() => handleEdit(campaign)}
                      className="text-blue-600 hover:text-blue-800 inline-block mr-2"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(campaign._id)}
                      className="text-red-600 hover:text-red-800 inline-block"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
