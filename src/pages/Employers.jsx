// web/src/pages/Employers.jsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Employers() {
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => setItems(await api.listEmployers());
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 font-[Poppins]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#053867]">Employers</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-2xl bg-[#F7BA23] text-[#053867] hover:bg-[#F3CE49]">Add Employer</button>
      </div>

      <div className="bg-white shadow rounded-2xl p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[#053867]">
              <th className="py-2">EmpID</th><th className="py-2">Name</th><th className="py-2">Address</th><th className="py-2">Job Location</th><th className="py-2">MoU Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map(e => (
              <tr key={e._id} className="border-t">
                <td className="py-2">{e.empId}</td>
                <td className="py-2">{e.name}</td>
                <td className="py-2">{e.address || '-'}</td>
                <td className="py-2">{e.jobLocation || '-'}</td>
                <td className="py-2">{e.mouDate ? new Date(e.mouDate).toLocaleDateString('en-GB') : '-'}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="py-2 text-gray-500" colSpan={5}>No employers</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false); load();}} />}
    </div>
  );
}

function AddModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ empId: '', name: '', address: '', jobLocation: '', mouDate: '' });
  const [validating, setValidating] = useState(false);
  const [empIdError, setEmpIdError] = useState('');

  const validateEmpId = async (empId) => {
    if (!empId.trim()) {
      setEmpIdError('');
      return;
    }
    setValidating(true);
    try {
      const items = await api.listEmployers();
      const exists = items.some(e => e.empId.toLowerCase() === empId.trim().toLowerCase());
      setEmpIdError(exists ? 'This Employer ID already exists' : '');
    } catch (e) {
      console.error('Validation error:', e);
    } finally {
      setValidating(false);
    }
  };

  const handleEmpIdChange = (v) => {
    setForm(f => ({ ...f, empId: v }));
    setEmpIdError('');
  };

  const submit = async () => {
    if (!form.empId) return alert('Employer ID is required');
    if (empIdError) return alert(empIdError);
    if (!form.name) return alert('Name is required');
    await api.addEmployer(form);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h3 className="text-xl font-bold text-[#253985]">Add Employer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
          <label className="block">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-[#253985]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-sm font-semibold text-[#053867]">Employer ID *</span>
            </div>
            <input 
              type="text" 
              value={form.empId} 
              onChange={e => handleEmpIdChange(e.target.value)}
              onBlur={() => validateEmpId(form.empId)}
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-lg font-mono focus:outline-none focus:ring-2 transition-all ${empIdError ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-blue-300 focus:ring-blue-400 bg-white'}`}
              placeholder="e.g., EMP-2025-0001"
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
              {empIdError && (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {empIdError}
                </span>
              )}
            </div>
          </label>
        </div>

        <Field label="Name *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
        <Field label="Address" value={form.address} onChange={v=>setForm(f=>({...f,address:v}))}/>
        <Field label="Job Location" value={form.jobLocation} onChange={v=>setForm(f=>({...f,jobLocation:v}))}/>
        <Field label="MoU Date" type="date" value={form.mouDate} onChange={v=>setForm(f=>({...f,mouDate:v}))}/>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={submit} className="px-4 py-2 rounded-2xl bg-[#F7BA23] text-[#053867] hover:bg-[#F3CE49]">Save</button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, value, onChange, type='text' }) {
  return (
    <label className="text-sm text-[#053867] space-y-1 block">
      <span>{label}</span>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#253985]"/>
    </label>
  );
}
