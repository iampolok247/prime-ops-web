import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Employees() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', role:'Admission', department:'', designation:'', phone:'', avatar:'', displayOrder:0 });
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

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
    setForm({ name:'', email:'', role:'Admission', department:'', designation:'', phone:'', avatar:'', displayOrder:0, isSuperAdmin:false });
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
      avatar: u.avatar || '',
      displayOrder: u.displayOrder || 0,
      isSuperAdmin: u.role === 'SuperAdmin'
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setOk(null);
    try {
      if (editId) {
        // For SuperAdmin, only send displayOrder
        let payload;
        if (form.isSuperAdmin) {
          payload = { displayOrder: form.displayOrder };
        } else {
          const { isSuperAdmin, ...rest } = form;
          payload = rest;
        }
        await api.updateUser(editId, payload);
        setOk('Employee updated');
      } else {
        const { isSuperAdmin, ...rest } = form;
        await api.createUser({ ...rest, password: 'password123' });
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Employee List</h1>
        {canEdit && <button onClick={startAdd} className="bg-gold text-navy rounded-xl px-4 py-2 font-semibold hover:bg-lightgold">+ Add Employee</button>}
      </div>

      {ok && <div className="mb-2 text-green-700">{ok}</div>}
      {err && <div className="mb-2 text-red-600">{err}</div>}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="text-left p-3">Order</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Department</th>
              <th className="text-left p-3">Designation</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              {canEdit && <th className="text-left p-3">Action</th>}
            </tr>
          </thead>
          <tbody>
            {sortedList.map((u, index) => (
              <tr key={u._id} className="border-t">
                <td className="p-3 text-navy font-semibold">{u.displayOrder || 0}</td>
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
                {canEdit && (
                  <td className="p-3">
                    <button onClick={()=>startEdit(u)} className="px-3 py-1 rounded-lg border mr-2">Edit</button>
                    {u.role !== 'SuperAdmin' && <button onClick={()=>remove(u._id)} className="px-3 py-1 rounded-lg border hover:bg-red-50">Delete</button>}
                  </td>
                )}
              </tr>
            ))}
            {sortedList.length === 0 && (
              <tr><td className="p-4 text-royal/70" colSpan={canEdit ? 8 : 7}>No employees</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft p-4 w-full max-w-xl">
            <h2 className="text-xl font-bold text-navy mb-3">{editId ? 'Edit Employee' : 'Add Employee'}</h2>
            {form.isSuperAdmin && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
                <strong>Note:</strong> Only Display Order can be changed for Super Admin accounts.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-royal mb-1">Display Order *</label>
                <input 
                  className="w-full border rounded-xl px-3 py-2" 
                  type="number" 
                  min="0"
                  required
                  value={form.displayOrder} 
                  onChange={e=>setForm(f=>({...f,displayOrder:parseInt(e.target.value) || 0}))}
                  placeholder="e.g., 1, 2, 3..."
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first (1, 2, 3...)</p>
              </div>
              {!form.isSuperAdmin && (
                <>
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
                </>
              )}
            </div>
            {!form.isSuperAdmin && (
              <div className="mt-3">
                <label className="block text-sm text-royal mb-1">Avatar URL</label>
                <input className="w-full border rounded-xl px-3 py-2" value={form.avatar} onChange={e=>setForm(f=>({...f,avatar:e.target.value}))}/>
              </div>
            )}
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
