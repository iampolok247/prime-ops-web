import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtBDTEn } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PlusCircle, Edit2, Trash2 } from 'lucide-react';

export default function IncomePage() {
  const { user } = useAuth();
  const isAcc = user?.role === 'Accountant';
  if (!isAcc && user?.role !== 'Admin' && user?.role !== 'SuperAdmin') {
    return <div className="text-royal">Access denied</div>;
  }

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), source:'Other', amount:0, note:'' });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const nav = useNavigate();
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try { const { income } = await api.listIncome(); setRows(income || []); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const add = async (e) => {
    e?.preventDefault?.(); setMsg(null); setErr(null);
    try { 
      if (editingId) {
        await api.updateIncome(editingId, form); 
        setMsg('Income updated');
      } else {
        await api.addIncome(form); 
        setMsg('Income added');
      }
      setForm({ date: new Date().toISOString().slice(0,10), source:'Other', amount:0, note:'' }); 
      setShowModal(false); 
      setEditingId(null);
      load(); 
    } catch (e) { setErr(e.message); }
  };

  const startEdit = (row) => {
    setForm({ date: row.date?.slice(0,10) || new Date().toISOString().slice(0,10), source: row.source, amount: row.amount, note: row.note || '' });
    setEditingId(row._id);
    setShowModal(true);
  };

  const remove = async (id) => {
    if (!confirm('Delete this income entry?')) return;
    try { 
      await api.deleteIncome(id); 
      setMsg('Income deleted');
      load(); 
    } catch (e) { setErr(e.message); }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ date: new Date().toISOString().slice(0,10), source:'Other', amount:0, note:'' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Income</h1>
      </div>
      {msg && <div className="mb-2 text-green-700">{msg}</div>}
      {err && <div className="mb-2 text-red-600">{err}</div>}

      {isAcc && (
        <div className="mb-3">
          <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 bg-gold text-navy rounded-xl px-4 py-2"><PlusCircle className="w-5 h-5"/> Add Income</button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={closeModal} />
          <div className="bg-white rounded-xl p-4 z-10 w-full max-w-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">{editingId ? 'Edit Income' : 'Add Income'}</h3>
            <form onSubmit={add} className="grid grid-cols-1 gap-2">
              <input type="date" className="border rounded-xl px-3 py-2" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
              {/* Purpose select populated from account heads */}
              <PurposeSelect kind="incomes" value={form.source} onChange={(v)=>setForm(f=>({...f,source:v}))} />
              <div className="text-right text-sm mt-1">
                <button type="button" onClick={()=>{ setShowModal(false); nav('/accounting/dashboard?openHeads=1'); }} className="text-blue-600 underline">Manage Account Heads</button>
              </div>
              <input type="number" className="border rounded-xl px-3 py-2" placeholder="Amount" value={form.amount} onChange={e=>setForm(f=>({...f,amount:Number(e.target.value)}))}/>
              <input className="border rounded-xl px-3 py-2" placeholder="Note" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border">Cancel</button>
                <button className="bg-gold text-navy rounded-xl px-4 py-2">{editingId ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Note</th>
              {isAcc && <th className="p-3 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r._id} className="border-t hover:bg-gray-50">
                <td className="p-3">{new Date(r.date).toLocaleDateString()}</td>
                <td className="p-3">{r.source}</td>
                <td className="p-3 font-semibold text-green-600">{fmtBDTEn(r.amount)}</td>
                <td className="p-3">{r.note || '-'}</td>
                {isAcc && (
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => startEdit(r)} 
                        className="flex items-center gap-1 px-3 py-1 rounded-lg border border-blue-300 hover:bg-blue-50 text-blue-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button 
                        onClick={() => remove(r._id)} 
                        className="flex items-center gap-1 px-3 py-1 rounded-lg border border-red-300 hover:bg-red-50 text-red-700 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-4 text-royal/70" colSpan={isAcc ? 5 : 4}>No entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurposeSelect({ kind = 'incomes', value, onChange }){
  // read heads from localStorage
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
