import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtBDTEn } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PlusCircle } from 'lucide-react';

function PurposeSelect({ kind = 'expenses', value, onChange }){
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem('accountHeads') || '{}'); } catch(e){ raw = {}; }
  const list = (raw && raw[kind]) ? raw[kind] : [];
  const [custom, setCustom] = useState('');
  const selected = value || '';
  const handle = (v)=>{
    if (v === '__other__') { onChange(custom); } else { onChange(v); }
  };
  return (
    <div>
      <label className="block text-sm text-royal mb-1">Purpose</label>
      <select className="border rounded-xl px-3 py-2 w-full mb-2" value={selected || ''} onChange={e=>handle(e.target.value)}>
        {(!list || list.length === 0) ? <option value="">No heads defined</option> : <><option value="">-- select purpose --</option>{list.map(h=> <option key={h} value={h}>{h}</option>)}</>}
        <option value="__other__">Other (enter manually)</option>
      </select>
      {selected === '__other__' || (!selected && custom) ? (
        <input className="border rounded-xl px-3 py-2" placeholder="Enter purpose" value={custom} onChange={e=>{ setCustom(e.target.value); onChange(e.target.value); }} />
      ) : null}
    </div>
  );
}

export default function ExpensePage() {
  const { user } = useAuth();
  const isAcc = user?.role === 'Accountant';
  if (!isAcc && user?.role !== 'Admin' && user?.role !== 'SuperAdmin') {
    return <div className="text-royal">Access denied</div>;
  }

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), purpose:'', amount:0, note:'' });
  const [showModal, setShowModal] = useState(false);
  const nav = useNavigate();
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try { const { expenses } = await api.listExpenses(); setRows(expenses || []); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const add = async (e) => {
    e?.preventDefault?.(); setMsg(null); setErr(null);
    try { await api.addExpense(form); setMsg('Expense added'); setForm({ ...form, purpose:'', amount:0, note:'' }); setShowModal(false); load(); } catch (e) { setErr(e.message); }
  };
  const remove = async (id) => {
    if (!confirm('Delete expense?')) return;
    try { await api.deleteExpense(id); load(); } catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Expense</h1>
      </div>
      {msg && <div className="mb-2 text-green-700">{msg}</div>}
      {err && <div className="mb-2 text-red-600">{err}</div>}

      {isAcc && (
        <div className="mb-3">
          <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 bg-gold text-navy rounded-xl px-4 py-2"><PlusCircle className="w-5 h-5"/> Add Expense</button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setShowModal(false)} />
          <div className="bg-white rounded-xl p-4 z-10 w-full max-w-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Add Expense</h3>
            <form onSubmit={add} className="grid grid-cols-1 gap-2">
              <input type="date" className="border rounded-xl px-3 py-2" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
              {/* Purpose select from account heads */}
              <PurposeSelect kind="expenses" value={form.purpose} onChange={(v)=>setForm(f=>({...f,purpose:v}))} />
              <div className="text-right text-sm mt-1">
                <button type="button" onClick={()=>{ setShowModal(false); nav('/accounting/dashboard?openHeads=1'); }} className="text-blue-600 underline">Manage Account Heads</button>
              </div>
              <input type="number" className="border rounded-xl px-3 py-2" placeholder="Amount" value={form.amount} onChange={e=>setForm(f=>({...f,amount:Number(e.target.value)}))}/>
              <input className="border rounded-xl px-3 py-2" placeholder="Note" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
                <button className="bg-gold text-navy rounded-xl px-4 py-2">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}


      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Purpose</th><th className="p-3 text-left">Amount</th><th className="p-3 text-left">Note</th>{isAcc && <th className="p-3 text-left">Action</th>}</tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r._id} className="border-t">
                <td className="p-3">{new Date(r.date).toLocaleDateString()}</td>
                <td className="p-3">{r.purpose}</td>
                <td className="p-3">{fmtBDTEn(r.amount)}</td>
                <td className="p-3">{r.note || '-'}</td>
                {isAcc && <td className="p-3"><button onClick={()=>remove(r._id)} className="px-3 py-1 rounded-lg border hover:bg-red-50 text-red-700">Delete</button></td>}
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-4 text-royal/70" colSpan={isAcc?5:4}>No entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
