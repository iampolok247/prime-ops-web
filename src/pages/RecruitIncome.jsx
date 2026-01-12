// web/src/pages/RecruitIncome.jsx
import { useEffect, useMemo, useState } from "react";
import { api, fmtBDTEn } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, XCircle, Clock, AlertCircle, Edit2 } from "lucide-react";

export default function RecruitIncome() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showRejectModal, setShowRejectModal] = useState(null);

  const isAccountant = user?.role === 'Accountant' || user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const isRecruitment = user?.role === 'Recruitment' || user?.role === 'Admin' || user?.role === 'SuperAdmin';

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listRecIncome();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredItems = useMemo(() => {
    if (filterStatus === 'All') return items;
    return items.filter(item => item.status === filterStatus);
  }, [items, filterStatus]);

  const totalApproved = useMemo(
    () => items
      .filter(x => x.status === 'Approved')
      .reduce((sum, x) => sum + (Number(x.amount) || 0), 0),
    [items]
  );

  const totalPending = useMemo(
    () => items
      .filter(x => x.status === 'Pending')
      .reduce((sum, x) => sum + (Number(x.amount) || 0), 0),
    [items]
  );

  const approve = async (id) => {
    if (!confirm("Approve this income entry?")) return;
    try {
      await api.approveRecIncome(id);
      load();
    } catch (e) {
      alert(e.message || 'Failed to approve');
    }
  };

  const reject = async (id, reason) => {
    try {
      await api.rejectRecIncome(id, reason);
      setShowRejectModal(null);
      load();
    } catch (e) {
      alert(e.message || 'Failed to reject');
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this income entry?")) return;
    try {
      await api.deleteRecIncome(id);
      load();
    } catch (e) {
      alert(e.message || 'Failed to delete');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            <CheckCircle size={14} />
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            <XCircle size={14} />
            Rejected
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
            <Clock size={14} />
            Waiting for Approval
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 font-[Poppins]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#053867]">Recruitment Income</h1>
        {isRecruitment && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-2xl bg-[#F7BA23] text-[#053867] hover:bg-[#F3CE49] font-medium"
          >
            Add Income
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="text-sm opacity-90">Approved Income</div>
          <div className="text-2xl font-bold mt-1">{fmtBDTEn(totalApproved)}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="text-sm opacity-90">Pending Approval</div>
          <div className="text-2xl font-bold mt-1">{fmtBDTEn(totalPending)}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="text-sm opacity-90">Total Entries</div>
          <div className="text-2xl font-bold mt-1">{items.length}</div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 font-medium transition-colors ${filterStatus === status ? 'text-[#253985] border-b-2 border-[#253985]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {status} ({items.filter(i => status === 'All' || i.status === status).length})
          </button>
        ))}
      </div>

      <div className="bg-white shadow rounded-2xl p-4 overflow-x-auto">
        {loading && <div className="text-sm text-gray-500 mb-3">Loading…</div>}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[#053867] border-b-2">
              <th className="py-3 px-2">Date</th>
              <th className="py-3 px-2">Source</th>
              <th className="py-3 px-2">Income From</th>
              <th className="py-3 px-2">Income For</th>
              <th className="py-3 px-2">Description</th>
              <th className="py-3 px-2">Amount</th>
              <th className="py-3 px-2">Status</th>
              <th className="py-3 px-2">Submitted By</th>
              {isAccountant && <th className="py-3 px-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((r) => (
              <tr key={r._id} className="border-t hover:bg-gray-50">
                <td className="py-3 px-2">{r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-'}</td>
                <td className="py-3 px-2 font-medium">{r.source || '-'}</td>
                <td className="py-3 px-2 text-gray-600">{r.incomeFrom?.name || '-'}</td>
                <td className="py-3 px-2 text-gray-600">{r.incomeFor?.name || '-'}</td>
                <td className="py-3 px-2 text-gray-600">{r.description || '-'}</td>
                <td className="py-3 px-2 font-semibold">{fmtBDTEn(r.amount)}</td>
                <td className="py-3 px-2">{getStatusBadge(r.status)}</td>
                <td className="py-3 px-2 text-gray-600">{r.submittedBy?.name || '-'}</td>
                {isAccountant && (
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      {/* Edit button for Recruitment role when not approved */}
                      {isRecruitment && r.status !== 'Approved' && (
                        <button 
                          onClick={() => setEditingIncome(r)} 
                          className="px-3 py-1 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-medium flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                      )}
                      {r.status === 'Pending' && (
                        <>
                          <button onClick={() => approve(r._id)} className="px-3 py-1 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium">
                            Approve
                          </button>
                          <button onClick={() => setShowRejectModal(r)} className="px-3 py-1 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium">
                            Reject
                          </button>
                        </>
                      )}
                      {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
                        <button onClick={() => remove(r._id)} className="px-3 py-1 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-medium">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr><td className="py-8 text-center text-gray-500" colSpan={isAccountant ? 9 : 8}>
                No {filterStatus !== 'All' ? filterStatus.toLowerCase() : ''} income entries
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {editingIncome && <EditModal income={editingIncome} onClose={() => setEditingIncome(null)} onSaved={() => { setEditingIncome(null); load(); }} />}
      {showRejectModal && (
        <RejectModal
          income={showRejectModal}
          onClose={() => setShowRejectModal(null)}
          onReject={(reason) => reject(showRejectModal._id, reason)}
        />
      )}
    </div>
  );
}

function AddModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    source: "",
    amount: "",
    description: "",
    incomeFrom: "",
    incomeFor: ""
  });
  const [employers, setEmployers] = useState([]);
  const [recruitedCandidates, setRecruitedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [empData, candData] = await Promise.all([
          api.listEmployers(),
          api.listRecruited()
        ]);
        setEmployers(Array.isArray(empData) ? empData : []);
        setRecruitedCandidates(Array.isArray(candData) ? candData : []);
      } catch (e) {
        console.error('Failed to load dropdown data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const submit = async () => {
    if (!form.source) return alert("Source is required");
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return alert("Enter a valid amount");
    if (!form.incomeFrom) return alert("Income From (Employer) is required");
    if (!form.incomeFor) return alert("Income For (Candidate) is required");
    try {
      await api.addRecIncome({ 
        date: form.date, 
        source: form.source, 
        amount,
        description: form.description,
        incomeFrom: form.incomeFrom,
        incomeFor: form.incomeFor
      });
      onSaved();
    } catch (e) {
      alert(e.message || 'Failed to submit income');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-[#253985]" size={24} />
          <h3 className="text-lg font-semibold text-[#253985]">Submit Income for Approval</h3>
        </div>
        <p className="text-sm text-gray-600">
          This income will be sent to the Accountant for approval before being counted.
        </p>
        
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading form data...</div>
        ) : (
          <>
            <Field label="Date" type="date" value={form.date} onChange={(v)=>setForm(f=>({...f, date:v}))} />
            <Field label="Source" value={form.source} onChange={(v)=>setForm(f=>({...f, source:v}))} placeholder="Commission, Training Fee, Placement Fee, etc." />
            
            <SearchableSelect
              label="Income From (Employer) *"
              value={form.incomeFrom}
              onChange={(v)=>setForm(f=>({...f, incomeFrom:v}))}
              options={employers.map(emp => ({ value: emp._id, label: emp.name }))}
              placeholder="Select employer..."
            />
            
            <SearchableSelect
              label="Income For (Recruited Candidate) *"
              value={form.incomeFor}
              onChange={(v)=>setForm(f=>({...f, incomeFor:v}))}
              options={recruitedCandidates.map(cand => ({ value: cand._id, label: `${cand.name} (${cand.canId})` }))}
              placeholder="Select candidate..."
            />
            
            <Field label="Amount (BDT)" type="number" value={form.amount} onChange={(v)=>setForm(f=>({...f, amount:v}))} />
            <Field label="Description (Optional)" value={form.description} onChange={(v)=>setForm(f=>({...f, description:v}))} placeholder="Additional details about this income" multiline />
            
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 font-medium">
                Cancel
              </button>
              <button onClick={submit} className="px-4 py-2 rounded-2xl bg-[#F7BA23] text-[#053867] hover:bg-[#F3CE49] font-medium">
                Submit for Approval
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditModal({ income, onClose, onSaved }) {
  const [form, setForm] = useState({
    date: income.date ? new Date(income.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    source: income.source || "",
    amount: income.amount?.toString() || "",
    description: income.description || "",
    incomeFrom: income.incomeFrom?._id || "",
    incomeFor: income.incomeFor?._id || ""
  });
  const [employers, setEmployers] = useState([]);
  const [recruitedCandidates, setRecruitedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [empData, candData] = await Promise.all([
          api.listEmployers(),
          api.listRecruited()
        ]);
        setEmployers(Array.isArray(empData) ? empData : []);
        setRecruitedCandidates(Array.isArray(candData) ? candData : []);
      } catch (e) {
        console.error('Failed to load dropdown data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const submit = async () => {
    if (!form.source) return alert("Source is required");
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return alert("Enter a valid amount");
    if (!form.incomeFrom) return alert("Income From (Employer) is required");
    if (!form.incomeFor) return alert("Income For (Candidate) is required");
    try {
      await api.updateRecIncome(income._id, { 
        date: form.date, 
        source: form.source, 
        amount,
        description: form.description,
        incomeFrom: form.incomeFrom,
        incomeFor: form.incomeFor
      });
      onSaved();
    } catch (e) {
      alert(e.message || 'Failed to update income');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <Edit2 className="text-[#253985]" size={24} />
          <h3 className="text-lg font-semibold text-[#253985]">Edit Income Entry</h3>
        </div>
        <p className="text-sm text-gray-600">
          Update the income details. Changes will remain pending until approved.
        </p>
        
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading form data...</div>
        ) : (
          <>
            <Field label="Date" type="date" value={form.date} onChange={(v)=>setForm(f=>({...f, date:v}))} />
            <Field label="Source" value={form.source} onChange={(v)=>setForm(f=>({...f, source:v}))} placeholder="Commission, Training Fee, Placement Fee, etc." />
            
            <SearchableSelect
              label="Income From (Employer) *"
              value={form.incomeFrom}
              onChange={(v)=>setForm(f=>({...f, incomeFrom:v}))}
              options={employers.map(emp => ({ value: emp._id, label: emp.name }))}
              placeholder="Select employer..."
            />
            
            <SearchableSelect
              label="Income For (Recruited Candidate) *"
              value={form.incomeFor}
              onChange={(v)=>setForm(f=>({...f, incomeFor:v}))}
              options={recruitedCandidates.map(cand => ({ value: cand._id, label: `${cand.name} (${cand.canId})` }))}
              placeholder="Select candidate..."
            />
            
            <Field label="Amount (BDT)" type="number" value={form.amount} onChange={(v)=>setForm(f=>({...f, amount:v}))} />
            <Field label="Description (Optional)" value={form.description} onChange={(v)=>setForm(f=>({...f, description:v}))} placeholder="Additional details about this income" multiline />
            
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 font-medium">
                Cancel
              </button>
              <button onClick={submit} className="px-4 py-2 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-medium">
                Update Income
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SearchableSelect({ label, value, onChange, options, placeholder }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find(opt => opt.value === value);

  return (
    <label className="text-sm text-[#053867] space-y-1 block relative">
      <span className="font-medium">{label}</span>
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 cursor-pointer bg-white hover:border-[#253985] focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent flex justify-between items-center"
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? selected.label : placeholder}
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253985] text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 text-sm">No results found</div>
              ) : (
                filtered.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm ${opt.value === value ? 'bg-blue-50 text-[#253985] font-medium' : ''}`}
                  >
                    {opt.label}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </label>
  );
}

function RejectModal({ income, onClose, onReject }) {
  const [reason, setReason] = useState('');

  const submit = () => {
    if (!reason.trim()) return alert('Please provide a rejection reason');
    onReject(reason);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center gap-2">
          <XCircle className="text-red-600" size={24} />
          <h3 className="text-lg font-semibold text-red-600">Reject Income Entry</h3>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-sm">
          <div className="font-medium text-gray-700">{income.source}</div>
          <div className="text-gray-600">{fmtBDT(income.amount)}</div>
          <div className="text-gray-500 text-xs mt-1">
            Submitted by: {income.submittedBy?.name || 'Unknown'}
          </div>
        </div>
        <Field label="Rejection Reason" value={reason} onChange={setReason} placeholder="Explain why this income is being rejected" multiline />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 font-medium">
            Cancel
          </button>
          <button onClick={submit} className="px-4 py-2 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-medium">
            Reject Entry
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type='text', placeholder='', multiline=false }) {
  return (
    <label className="text-sm text-[#053867] space-y-1 block">
      <span className="font-medium">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e)=>onChange(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent"
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e)=>onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#253985] focus:border-transparent"
        />
      )}
    </label>
  );
}
