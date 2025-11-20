import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  UserPlus, 
  Upload, 
  Phone, 
  Mail, 
  BookOpen, 
  Tag,
  FileText,
  CheckCircle,
  AlertCircle,
  Facebook,
  Linkedin,
  Edit3,
  Globe
} from 'lucide-react';

export default function LeadEntry() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name:'', phone:'', email:'', interestedCourse:'', source:'Manually Generated Lead' });
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [fileErr, setFileErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const isDM = user?.role === 'DigitalMarketing';

  const submitSingle = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null); setLoading(true);
    try {
      await api.createLead(form);
      setMsg('Lead added successfully! 🎉');
      setForm({ name:'', phone:'', email:'', interestedCourse:'', source:'Manually Generated Lead' });
    } catch (e) { 
      setErr(e.message); 
    } finally {
      setLoading(false);
    }
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null); setLoading(true);
    try {
      const { created, skipped } = await api.bulkUploadLeads(csv);
      setMsg(`Bulk upload completed! ✓ Created: ${created} leads | ⊗ Skipped: ${skipped} duplicates/invalid`);
      setCsv('');
    } catch (e) { 
      setErr(e.message); 
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (source) => {
    if (source.includes('Meta')) return Facebook;
    if (source.includes('LinkedIn')) return Linkedin;
    if (source.includes('Manual')) return Edit3;
    return Globe;
  };

  if (!isDM) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-xl text-gray-600">Only Digital Marketing can add or upload leads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Lead Entry
        </h1>
        <p className="text-gray-600 mt-1">Add new leads individually or upload in bulk via CSV</p>
      </div>

      {/* Global Messages */}
      {msg && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-800 font-medium">{msg}</p>
          </div>
        </div>
      )}
      {err && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">{err}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Lead Form */}
        <form onSubmit={submitSingle} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-5">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Add Single Lead</h2>
                <p className="text-sm text-white/80">Enter lead details manually</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Name Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                Full Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" 
                placeholder="Enter lead's full name"
                required 
                value={form.name} 
                onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              />
            </div>

            {/* Phone Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 text-green-600" />
                Phone Number
              </label>
              <input 
                type="tel"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" 
                placeholder="+880 1XXX-XXXXXX"
                value={form.phone} 
                onChange={e=>setForm(f=>({...f,phone:e.target.value}))}
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 text-purple-600" />
                Email Address
              </label>
              <input 
                type="email"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" 
                placeholder="email@example.com"
                value={form.email} 
                onChange={e=>setForm(f=>({...f,email:e.target.value}))}
              />
            </div>

            {/* Interested Course Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 text-orange-600" />
                Interested Course
              </label>
              <input 
                type="text"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" 
                placeholder="e.g., Graphic Design, Web Development"
                value={form.interestedCourse} 
                onChange={e=>setForm(f=>({...f,interestedCourse:e.target.value}))}
              />
            </div>

            {/* Source Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 text-pink-600" />
                Lead Source
              </label>
              <div className="relative">
                <select 
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors appearance-none bg-white pr-10" 
                  value={form.source} 
                  onChange={e=>setForm(f=>({...f,source:e.target.value}))}
                >
                  <option>Meta Lead</option>
                  <option>LinkedIn Lead</option>
                  <option>Manually Generated Lead</option>
                  <option>Others</option>
                </select>
                {React.createElement(getSourceIcon(form.source), { 
                  className: "absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg px-6 py-3 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding Lead...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Add Lead
                </>
              )}
            </button>
          </div>
        </form>

        {/* Bulk CSV Upload */}
        <form onSubmit={submitBulk} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-pink-600 p-5">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Bulk Upload (CSV)</h2>
                <p className="text-sm text-white/80">Import multiple leads at once</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* CSV Format Info */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">Required CSV Format</h3>
                  <p className="text-xs text-blue-700 mb-2">
                    Your CSV file must have these exact headers:
                  </p>
                  <code className="block bg-white px-3 py-2 rounded border border-blue-300 text-xs text-gray-800 font-mono">
                    Name,Phone,Email,InterestedCourse,Source
                  </code>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 First row should be headers, data starts from second row
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 text-orange-600" />
                Upload CSV File
              </label>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".csv,text/csv" 
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-8 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-orange-500 file:to-pink-600 file:text-white file:font-semibold hover:file:shadow-lg file:cursor-pointer cursor-pointer hover:border-orange-400 transition-colors"
                  onChange={async (e)=>{
                    setFileErr(null); setErr(null); setMsg(null);
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const name = (f.name || '').toLowerCase();
                    const isCsv = f.type === 'text/csv' || name.endsWith('.csv');
                    if (!isCsv) {
                      setFileErr('Please select a valid CSV file (.csv)');
                      return;
                    }
                    try {
                      const text = await f.text();
                      setCsv(text);
                      setMsg(`File loaded: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`);
                    } catch (err) {
                      setFileErr('Unable to read file. Please try again.');
                    }
                  }} 
                />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-xs text-gray-500 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Paste CSV */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-pink-600" />
                Paste CSV Content
              </label>
              <textarea 
                rows="8" 
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none transition-colors font-mono text-sm resize-none" 
                placeholder="Name,Phone,Email,InterestedCourse,Source&#10;John Doe,01712345678,john@example.com,Graphic Design,Meta Lead&#10;Jane Smith,01798765432,jane@example.com,Web Development,LinkedIn Lead"
                value={csv} 
                onChange={e=>setCsv(e.target.value)} 
              />
              {csv && (
                <p className="text-xs text-gray-600 mt-2">
                  📊 {csv.split('\n').filter(line => line.trim()).length - 1} leads detected
                </p>
              )}
            </div>

            {fileErr && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <p className="text-red-800 text-sm">{fileErr}</p>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading || !csv}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg px-6 py-3 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload CSV
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
