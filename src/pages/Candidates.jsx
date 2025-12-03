// web/src/pages/Candidates.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "recruited", label: "Recruited" }
];

export default function Candidates() {
  const [tab, setTab] = useState("");
  const [items, setItems] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showRecruit, setShowRecruit] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [showDetails, setShowDetails] = useState(null);

  const load = async (status = tab) => {
    const data = await api.listCandidates(status);
    setItems(data);
  };

  useEffect(() => { load(""); }, []);
  useEffect(() => { (async () => { setEmployers(await api.listEmployers()); setJobs(await api.listJobs()); })(); }, []);
  useEffect(() => { load(tab); }, [tab]);

  return (
    <div className="p-4 md:p-6 space-y-4 font-[Poppins]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#053867]">Candidates</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-2xl bg-[#F7BA23] text-[#053867] hover:bg-[#F3CE49]">
          Add Candidate
        </button>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full border ${t.key===tab ? 'bg-[#253985] text-white' : 'bg-white text-[#253985] border-[#253985]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white shadow rounded-2xl p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[#053867]">
              <th className="py-2">CanID</th>
              <th className="py-2">Name</th>
              <th className="py-2">Interest</th>
              <th className="py-2">Source</th>
              <th className="py-2">Trained</th>
              <th className="py-2">Date</th>
              <th className="py-2">CV</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c._id} className="border-t">
                <td className="py-2">{c.canId}</td>
                <td className="py-2">{c.name}</td>
                <td className="py-2">{c.jobInterest}</td>
                <td className="py-2">{c.source}</td>
                <td className="py-2">{c.trained ? 'Yes' : 'No'}</td>
                <td className="py-2">{new Date(c.date).toLocaleDateString('en-GB')}</td>
                <td className="py-2">{c.cvLink ? <a className="text-[#253985] underline" href={c.cvLink} target="_blank">View</a> : '-'}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowDetails(c)} 
                      className="px-3 py-1 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-1"
                      title="View details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Details
                    </button>
                    <button 
                      onClick={() => setShowEdit(c)} 
                      className="px-3 py-1 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1"
                      title="Edit candidate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    {!c.recruited ? (
                      <button onClick={() => setShowRecruit(c)} className="px-3 py-1 rounded-xl bg-[#253985] text-white hover:bg-[#053867] transition-colors">Recruit</button>
                    ) : (
                      <span className="px-2 py-1 rounded bg-green-100 text-green-700">Recruited</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="py-2 text-gray-500" colSpan={8}>No candidates</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {showEdit && <EditModal candidate={showEdit} onClose={() => setShowEdit(null)} onSaved={() => { setShowEdit(null); load(tab); }} />}
      {showDetails && <DetailsModal candidate={showDetails} onClose={() => setShowDetails(null)} />}
      {showRecruit && <RecruitModal
        candidate={showRecruit}
        employers={employers}
        jobs={jobs.filter(j => j.status === 'Active')}
        onClose={() => setShowRecruit(null)}
        onSaved={() => { setShowRecruit(null); load(tab); }}
      />}
    </div>
  );
}

function AddModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ canId: '', name: '', phone: '', email: '', jobInterest: '', source: 'Facebook', trained: false, cvLink: '' });
  const [validating, setValidating] = useState(false);
  const [canIdError, setCanIdError] = useState('');

  const validateCanId = async (canId) => {
    if (!canId.trim()) {
      setCanIdError('');
      return;
    }
    setValidating(true);
    try {
      const items = await api.listCandidates();
      const exists = items.some(c => c.canId.toLowerCase() === canId.trim().toLowerCase());
      setCanIdError(exists ? 'This Candidate ID already exists' : '');
    } catch (e) {
      console.error('Validation error:', e);
    } finally {
      setValidating(false);
    }
  };

  const handleCanIdChange = (v) => {
    setForm(f => ({ ...f, canId: v }));
    setCanIdError('');
  };

  const submit = async () => {
    if (!form.canId) return alert('Candidate ID is required');
    if (canIdError) return alert(canIdError);
    if (!form.name || !form.jobInterest) return alert('Name & Job Interest required');
    if (!form.phone) return alert('Phone number is required');
    
    try {
      await api.addCandidate(form);
      onSaved();
    } catch (e) {
      alert(e.message || 'Failed to add candidate');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-2xl space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h3 className="text-2xl font-bold text-[#053867]">Add New Candidate</h3>
            <p className="text-sm text-gray-500 mt-1">Fill in the candidate information below</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
            <label className="block">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[#253985]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-sm font-semibold text-[#053867]">Candidate ID *</span>
              </div>
              <input 
                type="text" 
                value={form.canId} 
                onChange={e => handleCanIdChange(e.target.value)}
                onBlur={() => validateCanId(form.canId)}
                className={`w-full border-2 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 transition-all ${canIdError ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-blue-300 focus:ring-blue-400 bg-white'}`}
                placeholder="e.g., CAN-2025-0001"
              />
              <div className="mt-2 min-h-[20px]">
                {validating && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking availability...
                  </span>
                )}
                {canIdError && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {canIdError}
                  </span>
                )}
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">Name *</span>
                <input 
                  type="text"
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="Full name"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">Phone *</span>
                <input 
                  type="tel"
                  value={form.phone} 
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="e.g., 01712345678"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">Email</span>
                <input 
                  type="email"
                  value={form.email} 
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="example@email.com"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">Job Interest *</span>
                <input 
                  type="text"
                  value={form.jobInterest} 
                  onChange={e => setForm(f => ({ ...f, jobInterest: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="e.g., Software Developer"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">CV Source</span>
                <select 
                  value={form.source} 
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all bg-white"
                >
                  {['Facebook','LinkedIn','Bdjobs','Reference','Prime Academy','Others'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">CV Link</span>
                <input 
                  type="url"
                  value={form.cvLink} 
                  onChange={e => setForm(f => ({ ...f, cvLink: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="Google Drive or OneDrive link"
                />
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.trained} 
                onChange={e => setForm(f => ({ ...f, trained: e.target.checked }))}
                className="w-5 h-5 text-[#253985] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#253985] cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-[#053867]">Trained by Prime Academy</span>
                <p className="text-xs text-gray-500">Check if this candidate completed training</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={submit} 
            disabled={validating || !!canIdError}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#253985] to-[#053867] text-white font-medium hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Candidate
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ candidate, onClose, onSaved }) {
  const [form, setForm] = useState({ 
    canId: candidate?.canId || '',
    name: candidate?.name || '', 
    phone: candidate?.phone || '',
    email: candidate?.email || '',
    jobInterest: candidate?.jobInterest || '', 
    source: candidate?.source || 'Facebook', 
    trained: candidate?.trained || false, 
    cvLink: candidate?.cvLink || '' 
  });
  const [validating, setValidating] = useState(false);
  const [canIdError, setCanIdError] = useState('');

  const validateCanId = async (canId) => {
    if (!canId.trim() || canId.trim() === candidate.canId) {
      setCanIdError('');
      return;
    }
    setValidating(true);
    try {
      const items = await api.listCandidates();
      const exists = items.some(c => c._id !== candidate._id && c.canId.toLowerCase() === canId.trim().toLowerCase());
      setCanIdError(exists ? 'This Candidate ID already exists' : '');
    } catch (e) {
      console.error('Validation error:', e);
    } finally {
      setValidating(false);
    }
  };

  const handleCanIdChange = (v) => {
    setForm(f => ({ ...f, canId: v }));
    setCanIdError('');
  };

  const submit = async () => {
    if (!form.canId) return alert('Candidate ID is required');
    if (canIdError) return alert(canIdError);
    if (!form.name || !form.jobInterest) return alert('Name & Job Interest required');
    if (!form.phone) return alert('Phone number is required');
    
    try {
      await api.updateCandidate(candidate._id, form);
      onSaved();
    } catch (e) {
      alert(e.message || 'Failed to update candidate');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-2xl space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h3 className="text-2xl font-bold text-[#053867]">Edit Candidate</h3>
            <p className="text-sm text-gray-500 mt-1">Update candidate information</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
            <label className="block">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[#253985]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-sm font-semibold text-[#053867]">Candidate ID *</span>
              </div>
              <input 
                type="text" 
                value={form.canId || ''} 
                onChange={e => handleCanIdChange(e.target.value)}
                onBlur={() => validateCanId(form.canId)}
                className={`w-full border-2 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 transition-all ${canIdError ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-blue-300 focus:ring-blue-400 bg-white'}`}
                placeholder="e.g., CAN-2025-0001"
              />
              <div className="mt-2 min-h-[20px]">
                {validating && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking availability...
                  </span>
                )}
                {canIdError && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {canIdError}
                  </span>
                )}
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">Name *</span>
                <input 
                  type="text"
                  value={form.name || ''} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="Full name"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">Phone *</span>
                <input 
                  type="tel"
                  value={form.phone || ''} 
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="e.g., 01712345678"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">Email</span>
                <input 
                  type="email"
                  value={form.email || ''} 
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="example@email.com"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">Job Interest *</span>
                <input 
                  type="text"
                  value={form.jobInterest || ''} 
                  onChange={e => setForm(f => ({ ...f, jobInterest: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="e.g., Software Developer"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">CV Source</span>
                <select 
                  value={form.source || 'Facebook'} 
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all bg-white"
                >
                  {['Facebook','LinkedIn','Bdjobs','Reference','Prime Academy','Others'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-[#053867] mb-2 block">CV Link</span>
                <input 
                  type="url"
                  value={form.cvLink || ''} 
                  onChange={e => setForm(f => ({ ...f, cvLink: e.target.value }))}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
                  placeholder="Google Drive or OneDrive link"
                />
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.trained} 
                onChange={e => setForm(f => ({ ...f, trained: e.target.checked }))}
                className="w-5 h-5 text-[#253985] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#253985] cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-[#053867]">Trained by Prime Academy</span>
                <p className="text-xs text-gray-500">Check if this candidate completed training</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={submit} 
            disabled={validating || !!canIdError}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Update Candidate
          </button>
        </div>
      </div>
    </div>
  );
}

function RecruitModal({ candidate, employers, jobs, onClose, onSaved }) {
  const [form, setForm] = useState({ employerId: '', jobId: '', date: new Date().toISOString().slice(0,10) });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.employerId || !form.jobId) return alert('Please select employer and job position');
    setSubmitting(true);
    try {
      await api.recruitCandidate(candidate._id, form);
      onSaved();
    } catch (e) {
      alert(e.message || 'Failed to recruit candidate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h3 className="text-2xl font-bold text-[#253985]">Recruit Candidate</h3>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold">{candidate.name}</span> • {candidate.canId}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block">
              <span className="text-sm font-semibold text-[#053867] mb-2 block">Select Employer *</span>
              <select 
                value={form.employerId} 
                onChange={e => setForm(f => ({ ...f, employerId: e.target.value }))}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all bg-white"
              >
                <option value="">Choose an employer...</option>
                {employers.map(e => (
                  <option key={e._id} value={e._id}>{e.name} ({e.empId})</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-sm font-semibold text-[#053867] mb-2 block">Select Job Position *</span>
              <select 
                value={form.jobId} 
                onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all bg-white"
              >
                <option value="">Choose a job position...</option>
                {jobs.map(j => (
                  <option key={j._id} value={j._id}>{j.position} — {j.jobId}</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-sm font-semibold text-[#053867] mb-2 block">Recruitment Date</span>
              <input 
                type="date"
                value={form.date} 
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent transition-all"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button 
            onClick={onClose} 
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={submit} 
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirm Recruitment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({ candidate, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-3xl space-y-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 sticky top-0 bg-white">
          <div>
            <h3 className="text-2xl font-bold text-[#253985]">Candidate Details</h3>
            <p className="text-sm text-gray-600 mt-1">Complete information about {candidate.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailRow label="Candidate ID" value={candidate.canId} />
          <DetailRow label="Name" value={candidate.name} />
          <DetailRow 
            label="Phone" 
            value={candidate.phone || <span className="text-gray-400">Not provided</span>} 
          />
          <DetailRow 
            label="Email" 
            value={candidate.email || <span className="text-gray-400">Not provided</span>} 
          />
          <DetailRow label="Job Interest" value={candidate.jobInterest} />
          <DetailRow label="CV Source" value={candidate.source} />
          <DetailRow 
            label="Training Status" 
            value={
              <span className={`px-2 py-1 rounded text-sm ${candidate.trained ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {candidate.trained ? 'Trained' : 'Not Trained'}
              </span>
            } 
          />
          <DetailRow 
            label="Date Added" 
            value={new Date(candidate.date).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })} 
          />
          <DetailRow 
            label="CV Link" 
            value={
              candidate.cvLink ? (
                <a 
                  href={candidate.cvLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  View CV
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span className="text-gray-400">No CV link</span>
              )
            } 
          />
          <DetailRow 
            label="Recruitment Status" 
            value={
              <span className={`px-2 py-1 rounded text-sm font-medium ${candidate.recruited ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {candidate.recruited ? 'Recruited' : 'Available'}
              </span>
            } 
          />
        </div>

        {candidate.recruited && (
          <div className="pt-6 border-t border-gray-200">
            <h4 className="text-lg font-bold text-[#053867] mb-4">Recruitment Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailRow 
                label="Employer" 
                value={candidate.employer?.name || 'N/A'} 
              />
              <DetailRow 
                label="Job Position" 
                value={candidate.job?.position || 'N/A'} 
              />
              {candidate.recruitedDate && (
                <DetailRow 
                  label="Recruitment Date" 
                  value={new Date(candidate.recruitedDate).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })} 
                />
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-4 border-t border-gray-200">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-base font-medium text-gray-800">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type='text' }) {
  return (
    <label className="text-sm text-[#053867] space-y-1">
      <span>{label}</span>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#253985]" />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  const opts = Array.isArray(options) ? options.map(v => ({label: v, value: v})) : options;
  return (
    <label className="text-sm text-[#053867] space-y-1">
      <span>{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#253985]">
        <option value="">Select...</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[#053867]">
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
