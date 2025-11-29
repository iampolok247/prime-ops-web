import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const fmtDateInput = (d) => new Date(d).toISOString().slice(0, 16); // for datetime-local
const todayPlusDays = (n=3) => {
  const d = new Date();
  d.setDate(d.getDate()+n);
  return fmtDateInput(d);
};

export default function AssignTasks() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('InProgress');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', category:'', assignedTo:'', deadline: todayPlusDays(3) });
  const [editingTask, setEditingTask] = useState(null);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  const canAssign = user?.role === 'SuperAdmin' || user?.role === 'Admin';

  const loadUsers = async () => {
    try {
      const { users } = await api.listUsers();
      setUsers(users);
    } catch (e) { /* ignore in UI */ }
  };
  const loadTasks = async () => {
    try {
      const { tasks } = await api.listAllTasks(status);
      setTasks(tasks);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { if (canAssign) loadUsers(); }, [canAssign]);
  useEffect(() => { if (canAssign) loadTasks(); }, [status, canAssign]);

  const nonSuperAdmins = useMemo(() => users.filter(u => u.role !== 'SuperAdmin'), [users]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setOk(null);
    try {
      if (editingTask) {
        // Update existing task
        await api.updateTask(editingTask._id, { ...form });
        setOk('Task updated');
      } else {
        // Create new task
        await api.assignTask({ ...form });
        setOk('Task assigned');
      }
      setOpen(false);
      setEditingTask(null);
      setForm({ title:'', description:'', category:'', assignedTo:'', deadline: todayPlusDays(3) });
      loadTasks();
    } catch (e) { setErr(e?.message || 'Failed to save task'); }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      category: task.category || '',
      assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo[0]?._id : task.assignedTo?._id || '',
      deadline: task.dueDate ? fmtDateInput(task.dueDate) : todayPlusDays(3)
    });
    setOpen(true);
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setErr(null); setOk(null);
    try {
      await api.deleteTask(taskId);
      setOk('Task deleted');
      loadTasks();
    } catch (e) { setErr(e?.message || 'Failed to delete task'); }
  };

  const handleCloseModal = () => {
    setOpen(false);
    setEditingTask(null);
    setForm({ title:'', description:'', category:'', assignedTo:'', deadline: todayPlusDays(3) });
  };

  if (!canAssign) return <div className="text-royal">You do not have permission to view this page.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Assign Task</h1>
        <div className="flex items-center gap-3">
          <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <button onClick={()=>setOpen(true)} className="bg-gold text-navy rounded-xl px-4 py-2 font-semibold hover:bg-lightgold">+ Assign Task</button>
        </div>
      </div>

      {ok && <div className="mb-2 text-green-700">{ok}</div>}
      {err && <div className="mb-2 text-red-600">{err}</div>}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
  <table className="min-w-full text-sm">
    <thead className="bg-[#f3f6ff] text-royal">
      <tr>
        <th className="text-left p-3">Task</th>
        <th className="text-left p-3">Assignee</th>
        <th className="text-left p-3">Assigned By</th>
        <th className="text-left p-3">Status</th>
        <th className="text-left p-3">Deadline</th>
        <th className="text-center p-3">Actions</th>
      </tr>
    </thead>
    <tbody>
      {tasks.map(t => {
        // Check if current user is the one who assigned this task
        const canEditDelete = t.assignedBy?._id === user?.id;
        
        return (
          <tr key={t._id} className="border-t">
            <td className="p-3">
              <div className="font-semibold text-navy">{t.title}</div>
              {t.description && <div className="text-royal/80">{t.description}</div>}
              {t.category && <div className="text-xs text-royal/70 mt-1">Category: {t.category}</div>}
            </td>
            <td className="p-3">
              {Array.isArray(t.assignedTo) 
                ? t.assignedTo.map(u => u.name).join(', ')
                : t.assignedTo?.name
              }
              {' '}
              <span className="text-xs text-royal/70">
                ({Array.isArray(t.assignedTo) ? t.assignedTo[0]?.role : t.assignedTo?.role})
              </span>
            </td>
            <td className="p-3">{t.assignedBy?.name} <span className="text-xs text-royal/70">({t.assignedBy?.role})</span></td>
            <td className="p-3">{t.status === 'InProgress' || t.status === 'In Progress' ? 'In Progress' : t.status === 'Completed' ? 'Completed' : t.status}</td>
            <td className="p-3">{t.dueDate ? new Date(t.dueDate).toLocaleString() : t.deadline ? new Date(t.deadline).toLocaleString() : '-'}</td>
            <td className="p-3 text-center">
              {canEditDelete ? (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleEdit(t)}
                    className="text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded transition-colors text-xs font-medium"
                    title="Edit Task"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t._id)}
                    className="text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded transition-colors text-xs font-medium"
                    title="Delete Task"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400">-</span>
              )}
            </td>
          </tr>
        );
      })}
      {tasks.length === 0 && (
        <tr><td className="p-4 text-royal/70" colSpan="6">No tasks</td></tr>
      )}
    </tbody>
  </table>
</div>


      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft p-4 w-full max-w-xl">
            <h2 className="text-xl font-bold text-navy mb-3">
              {editingTask ? 'Edit Task' : 'Assign Task'}
            </h2>
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
                <label className="block text-sm text-royal mb-1">Assign To *</label>
                <select className="w-full border rounded-xl px-3 py-2" value={form.assignedTo} onChange={e=>setForm(f=>({ ...f, assignedTo: e.target.value }))} required>
                  <option value="" disabled>Select user</option>
                  {nonSuperAdmins.map(u => (
                    <option key={u._id} value={u._id}>{u.name} — {u.role}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm text-royal mb-1">Deadline *</label>
              <input type="datetime-local" className="w-full border rounded-xl px-3 py-2" value={form.deadline} onChange={e=>setForm(f=>({ ...f, deadline: e.target.value }))} required/>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-xl border hover:bg-gray-50">Cancel</button>
              <button className="px-4 py-2 rounded-xl bg-gold text-navy font-semibold hover:bg-lightgold">
                {editingTask ? 'Update' : 'Assign'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
