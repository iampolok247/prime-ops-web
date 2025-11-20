import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const DEADLINE_THRESHOLD_DAYS = Number(import.meta.env.VITE_DEADLINE_THRESHOLD_DAYS || 3);

const toLocal = (d) => new Date(d).toLocaleString();
const fmtDateInput = (d) => new Date(d).toISOString().slice(0, 16);
const todayPlusDays = (n=3) => {
  const d = new Date();
  d.setDate(d.getDate()+n);
  return fmtDateInput(d);
};

const rowClassByDeadline = (deadline, status, completedAt) => {
  if (status === 'Completed') {
    if (completedAt && new Date(completedAt) <= new Date(deadline)) return 'bg-green-50';
    return 'bg-red-50';
  }
  const now = new Date();
  const dl = new Date(deadline);
  const diffDays = Math.floor((dl - now) / (1000*60*60*24));
  if (diffDays <= 0) return 'bg-red-50';            // overdue
  if (diffDays <= DEADLINE_THRESHOLD_DAYS) return 'bg-yellow-50'; // near
  return ''; // default white/gray via table
};

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('InProgress');
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', category:'', deadline: todayPlusDays(3) });

  const hasMyTask = user && user.role !== 'SuperAdmin'; // SA has no My Task per product rules

  const load = async () => {
    try {
      const { tasks } = await api.listMyTasks(status);
      setTasks(tasks);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { if (hasMyTask) load(); }, [status, hasMyTask]);

  const toggleStatus = async (t) => {
    try {
      const next = t.status === 'InProgress' ? 'Completed' : 'InProgress';
      await api.updateTaskStatus(t._id, next);
      setOk('Status updated');
      load();
    } catch (e) { setErr(e?.message || 'Failed to update'); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setOk(null);
    try {
      await api.addSelfTask({ ...form });
      setOpen(false);
      setForm({ title:'', description:'', category:'', deadline: todayPlusDays(3) });
      setOk('Task added');
      load();
    } catch (e) { setErr(e?.message || 'Failed to add'); }
  };

  if (!hasMyTask) {
    return <div className="text-royal">Super Admin has no My Task.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">My Task</h1>
        <div className="flex items-center gap-3">
          <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <button onClick={()=>setOpen(true)} className="bg-gold text-navy rounded-xl px-4 py-2 font-semibold hover:bg-lightgold">+ Add My Task</button>
        </div>
      </div>

      {ok && <div className="mb-2 text-green-700">{ok}</div>}
      {err && <div className="mb-2 text-red-600">{err}</div>}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
  <table className="min-w-full text-sm">
    <thead className="bg-[#f3f6ff] text-royal">
      <tr>
        <th className="text-left p-3">Task</th>
        <th className="text-left p-3">Assigned By</th> {/* ✅ new column */}
        <th className="text-left p-3">Status</th>
        <th className="text-left p-3">Deadline</th>
        <th className="text-left p-3">Completed</th>
        <th className="text-left p-3">Action</th>
      </tr>
    </thead>
    <tbody>
      {tasks.map(t => (
        <tr key={t._id} className={`border-t ${rowClassByDeadline(t.deadline, t.status, t.completedAt)}`}>
          <td className="p-3">
            <div className="font-semibold text-navy">{t.title}</div>
            {t.description && <div className="text-royal/80">{t.description}</div>}
            {t.category && <div className="text-xs text-royal/70 mt-1">Category: {t.category}</div>}
          </td>
          <td className="p-3">
            {t.assignedBy?.name}
            <span className="text-xs text-royal/70"> ({t.assignedBy?.role})</span>
          </td>
          <td className="p-3">{t.status === 'InProgress' ? 'In Progress' : 'Completed'}</td>
          <td className="p-3">{toLocal(t.deadline)}</td>
          <td className="p-3">{t.completedAt ? toLocal(t.completedAt) : '-'}</td>
          <td className="p-3">
            <button onClick={()=>toggleStatus(t)} className="px-3 py-1 rounded-lg border hover:bg-[#f3f6ff]">
              {t.status === 'InProgress' ? 'Mark Completed' : 'Mark In-Progress'}
            </button>
          </td>
        </tr>
      ))}
      {tasks.length === 0 && (
        <tr><td className="p-4 text-royal/70" colSpan="6">No tasks</td></tr> 
      )}
    </tbody>
  </table>
</div>


      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft p-4 w-full max-w-xl">
            <h2 className="text-xl font-bold text-navy mb-3">Add My Task</h2>
            <label className="block text-sm text-royal mb-1">Title *</label>
            <input className="w-full border rounded-xl px-3 py-2 mb-3" value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} required/>

            <label className="block text-sm text-royal mb-1">Description</label>
            <textarea className="w-full border rounded-xl px-3 py-2 mb-3" rows="3" value={form.description} onChange={e=>setForm(f=>({ ...f, description: e.target.value }))}/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-royal mb-1">Category</label>
                <input className="w-full border rounded-xl px-3 py-2" value={form.category} onChange={e=>setForm(f=>({ ...f, category: e.target.value }))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Deadline *</label>
                <input type="datetime-local" className="w-full border rounded-xl px-3 py-2" value={form.deadline} onChange={e=>setForm(f=>({ ...f, deadline: e.target.value }))} required/>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={()=>setOpen(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
              <button className="px-4 py-2 rounded-xl bg-gold text-navy font-semibold hover:bg-lightgold">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
