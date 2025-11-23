import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Employees() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', role:'Admission', department:'', designation:'', phone:'', avatar:'' });
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);

  const canEdit = user?.role === 'Admin'; // SuperAdmin view-only

  const load = async () => {
    try {
      const { users } = await api.listUsers();
      setList(users);
    } catch (e) { setErr(e?.message || 'Failed to load'); }
  };
  useEffect(() => { load(); }, []);

  // Sort users by displayOrder (lower numbers first), then by name
  const sortedList = useMemo(() => {
    return [...list].sort((a, b) => {
      const orderA = a.displayOrder || 0;
      const orderB = b.displayOrder || 0;
      
      // If same order, sort by name
      if (orderA === orderB) {
        return (a.name || '').localeCompare(b.name || '');
      }
      
      return orderA - orderB;
    });
  }, [list]);

  const startAdd = () => {
    setEditId(null);
    setForm({ name:'', email:'', role:'Admission', department:'', designation:'', phone:'', avatar:'' });
    setOpen(true);
  };

  const startEdit = (u) => {
    setEditId(u._id);
    setForm({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'Admission',
      department: u.department || '',
      designation: u.designation || '',
      phone: u.phone || '',
      avatar: u.avatar || ''
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setOk(null);
    try {
      if (editId) {
        await api.updateUser(editId, { ...form });
        setOk('Employee updated');
      } else {
        await api.createUser({ ...form, password: 'password123' });
        setOk('Employee created (default password: password123)');
      }
      setOpen(false);
      load();
    } catch (e) { setErr(e?.message || 'Failed'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this employee?')) return;
    try {
      await api.deleteUser(id);
      setOk('Employee deleted');
      load();
    } catch (e) { setErr(e?.message || 'Delete failed'); }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    // Reorder the list
    const newList = [...sortedList];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);

    // Update displayOrder for all items
    const orders = newList.map((user, index) => ({
      id: user._id,
      displayOrder: index + 1
    }));

    try {
      await api.reorderUsers(orders);
      setOk('Employee order updated');
      load();
    } catch (e) {
      setErr(e?.message || 'Reorder failed');
    }

    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleReorderMode = () => {
    setReorderMode(!reorderMode);
    setErr(null);
    setOk(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Employee List</h1>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <button 
                onClick={toggleReorderMode} 
                className={`rounded-xl px-4 py-2 font-semibold ${reorderMode ? 'bg-royal text-white' : 'bg-gray-200 text-navy hover:bg-gray-300'}`}
              >
                {reorderMode ? '✓ Done Reordering' : '⇅ Reorder'}
              </button>
              <button onClick={startAdd} className="bg-gold text-navy rounded-xl px-4 py-2 font-semibold hover:bg-lightgold">+ Add Employee</button>
            </>
          )}
        </div>
      </div>

      {ok && <div className="mb-2 text-green-700">{ok}</div>}
      {err && <div className="mb-2 text-red-600">{err}</div>}
      {reorderMode && <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700">
        <strong>Reorder Mode:</strong> Drag and drop rows to change employee order
      </div>}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              {reorderMode && canEdit && <th className="text-left p-3">⇅</th>}
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Department</th>
              <th className="text-left p-3">Designation</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              {canEdit && !reorderMode && <th className="text-left p-3">Action</th>}
            </tr>
          </thead>
          <tbody>
            {sortedList.map((u, index) => (
              <tr 
                key={u._id} 
                className={`border-t ${reorderMode && canEdit ? 'cursor-move hover:bg-gray-50' : ''} ${draggedIndex === index ? 'opacity-50' : ''}`}
                draggable={reorderMode && canEdit}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                {reorderMode && canEdit && (
                  <td className="p-3 text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/>
                    </svg>
                  </td>
                )}
                <td className="p-3 text-royal font-semibold">{index + 1}</td>
                <td className="p-3 flex items-center gap-2">
                  <img src={u.avatar} className="w-8 h-8 rounded-full border" alt={u.name} />
                  <div>
                    <div className="font-semibold text-navy">{u.name}</div>
                  </div>
                </td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.department || '-'}</td>
                <td className="p-3">{u.designation || '-'}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.phone || '-'}</td>
                {canEdit && !reorderMode && (
                  <td className="p-3">
                    <button onClick={()=>startEdit(u)} className="px-3 py-1 rounded-lg border mr-2">Edit</button>
                    {u.role !== 'SuperAdmin' && <button onClick={()=>remove(u._id)} className="px-3 py-1 rounded-lg border hover:bg-red-50">Delete</button>}
                  </td>
                )}
              </tr>
            ))}
            {sortedList.length === 0 && (
              <tr><td className="p-4 text-royal/70" colSpan={reorderMode && canEdit ? 9 : (canEdit ? 8 : 7)}>No employees</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft p-4 w-full max-w-xl">
            <h2 className="text-xl font-bold text-navy mb-3">{editId ? 'Edit Employee' : 'Add Employee'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-royal mb-1">Name *</label>
                <input className="w-full border rounded-xl px-3 py-2" required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Email *</label>
                <input className="w-full border rounded-xl px-3 py-2" required type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Role *</label>
                <select className="w-full border rounded-xl px-3 py-2" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  <option>Admin</option>
                  <option>Accountant</option>
                  <option>Admission</option>
                  <option>Recruitment</option>
                  <option>DigitalMarketing</option>
                  <option>MotionGraphics</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Department</label>
                <input className="w-full border rounded-xl px-3 py-2" value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Designation</label>
                <input className="w-full border rounded-xl px-3 py-2" value={form.designation} onChange={e=>setForm(f=>({...f,designation:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Phone</label>
                <input className="w-full border rounded-xl px-3 py-2" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm text-royal mb-1">Avatar URL</label>
              <input className="w-full border rounded-xl px-3 py-2" value={form.avatar} onChange={e=>setForm(f=>({...f,avatar:e.target.value}))}/>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={()=>setOpen(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
              {canEdit && <button className="px-4 py-2 rounded-xl bg-gold text-navy font-semibold hover:bg-lightgold">{editId?'Save':'Create'}</button>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
