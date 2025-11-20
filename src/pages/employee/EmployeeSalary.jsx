import React, { useEffect, useState } from 'react';
import { api, fmtBDTEn } from '../../lib/api.js';

export default function EmployeeSalary(){
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ userId:'', totalSalary:0 });

  useEffect(()=>{ (async ()=>{ await loadUsers(); loadRecords(); })(); }, []);

  const loadUsers = async ()=>{
    try {
      // prefer public list so Accountant and other roles can access dropdown
        const resp = await (api.listUsersPublic ? api.listUsersPublic() : api.listUsers());
        const list = Array.isArray(resp) ? resp : (resp?.users || []);
      setUsers(list);
      return list;
    } catch(e){ setUsers([]); return []; }
  };
  const loadRecords = ()=>{
    try { const raw = localStorage.getItem('employeeSalaryRecords'); setRecords(raw ? JSON.parse(raw) : []); } catch(e){ setRecords([]); }
  };
  const saveRecords = (arr)=>{ localStorage.setItem('employeeSalaryRecords', JSON.stringify(arr)); setRecords(arr); };

  const startAdd = async ()=>{
    const list = (!users || users.length === 0) ? await loadUsers() : users;
    setEditId(null);
    setForm({ userId: (list && list[0]) ? list[0]._id : '', totalSalary: 0 });
    setShowModal(true);
  };
  const startEdit = (r)=>{ setEditId(r.id); setForm({ userId: r.userId, totalSalary: r.totalSalary }); setShowModal(true); };

  const onSubmit = (e)=>{ e?.preventDefault?.(); if (!form.userId) return alert('Select employee'); if (editId){ const next = records.map(r=> r.id===editId ? {...r, ...form} : r); saveRecords(next); } else { const id = `s_${Date.now()}`; const next = [{ id, ...form }, ...records]; saveRecords(next); } setShowModal(false); };

  const onDelete = (id)=>{ if (!confirm('Delete salary record?')) return; saveRecords(records.filter(r=>r.id!==id)); };

  const findUser = (id)=> users.find(u=>u._id===id) || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Employee Salary</h1>
        <div>
          <button onClick={startAdd} className="bg-gold text-navy rounded-xl px-4 py-2">+ Add Salary</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="p-3 text-left">Emp Id</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Designation</th>
              <th className="p-3 text-left">Total Salary</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r=>{
              const u = findUser(r.userId);
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{(u._id||'').slice(0,8)}</td>
                  <td className="p-3">{u.name || '-'}</td>
                  <td className="p-3">{u.designation || '-'}</td>
                  <td className="p-3">{fmtBDTEn(r.totalSalary||0)}</td>
                  <td className="p-3"><button onClick={()=>startEdit(r)} className="px-3 py-1 rounded-lg border mr-2">Edit</button><button onClick={()=>onDelete(r.id)} className="px-3 py-1 rounded-lg border hover:bg-red-50 text-red-700">Delete</button></td>
                </tr>
              );
            })}
            {records.length === 0 && <tr><td className="p-4 text-royal/70" colSpan={5}>No salary records</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setShowModal(false)} />
          <div className="bg-white rounded-xl p-4 z-10 w-full max-w-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">{editId ? 'Edit Salary' : 'Add Salary'}</h3>
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2">
              <label className="text-sm text-royal">Employee</label>
              <select className="border rounded-xl px-3 py-2" value={form.userId} onChange={e=>setForm(f=>({...f,userId:e.target.value}))}>
                {!users || users.length === 0 ? (
                  <option value="">Loading employees...</option>
                ) : (
                  <>
                    <option value="">-- select employee --</option>
                    {users.map(u=> <option key={u._id} value={u._id}>{u.name} ({u.designation || '—'})</option>)}
                  </>
                )}
              </select>

              <input type="number" className="border rounded-xl px-3 py-2" placeholder="Total Salary" value={form.totalSalary} onChange={e=>setForm(f=>({...f,totalSalary:Number(e.target.value)}))} />

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
                <button className="bg-gold text-navy rounded-xl px-4 py-2">{editId ? 'Save' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
