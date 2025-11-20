import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Courses() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCourse, setViewCourse] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:'', category:'', duration:'', regularFee:0, discountFee:0, teacher:'', details:'', status:'Active' });
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  const canEdit = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  // Get unique categories from courses
  const categories = ['All', ...new Set(list.map(c => c.category).filter(Boolean))];

  // Filter courses by category
  const filteredList = categoryFilter === 'All' 
    ? list 
    : list.filter(c => c.category === categoryFilter);

  const load = async () => {
    try {
      const { courses } = await api.listCourses();
      setList(courses);
    } catch (e) { setErr(e?.message || 'Failed to load'); }
  };
  useEffect(() => { load(); }, []);

  const startAdd = () => {
    setEditId(null);
    setForm({ name:'', category:'', duration:'', regularFee:0, discountFee:0, teacher:'', details:'', status:'Active' });
    setOpen(true);
  };

  const startView = (c) => {
    setViewCourse(c);
    setViewOpen(true);
  };

  const startEdit = (c) => {
    setEditId(c._id);
    setForm({
      name:c.name, category:c.category, duration:c.duration, regularFee:c.regularFee, discountFee:c.discountFee,
      teacher:c.teacher, details:c.details, status:c.status
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setOk(null);
    try {
      if (editId) {
        await api.updateCourse(editId, { ...form });
        setOk('Course updated');
      } else {
        await api.createCourse({ ...form });
        setOk('Course created');
      }
      setOpen(false);
      load();
    } catch (e) { setErr(e?.message || 'Failed'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this course?')) return;
    try {
      await api.deleteCourse(id);
      setOk('Course deleted');
      load();
    } catch (e) { setErr(e?.message || 'Delete failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Courses</h1>
        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select 
            value={categoryFilter} 
            onChange={e=>setCategoryFilter(e.target.value)} 
            className="border rounded-xl px-4 py-2 text-sm"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'All' ? '📚 All Categories' : `📁 ${cat}`}
              </option>
            ))}
          </select>
          {canEdit && <button onClick={startAdd} className="bg-gold text-navy rounded-xl px-4 py-2 font-semibold hover:bg-lightgold">+ Add Course</button>}
        </div>
      </div>

      {ok && <div className="mb-2 p-3 bg-green-100 text-green-700 rounded-xl">{ok}</div>}
      {err && <div className="mb-2 p-3 bg-red-100 text-red-600 rounded-xl">{err}</div>}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="text-left p-3">Course ID</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Duration</th>
              <th className="text-left p-3">Regular Fee</th>
              <th className="text-left p-3">Discount Fee</th>
              <th className="text-left p-3">Teacher</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map(c => (
              <tr key={c._id} className="border-t hover:bg-gray-50">
                <td className="p-3">{c.courseId}</td>
                <td className="p-3 font-semibold text-navy">{c.name}</td>
                <td className="p-3">
                  {c.category ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                      {c.category}
                    </span>
                  ) : '-'}
                </td>
                <td className="p-3">{c.duration || '-'}</td>
                <td className="p-3">৳ {c.regularFee}</td>
                <td className="p-3">৳ {c.discountFee}</td>
                <td className="p-3">{c.teacher || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    c.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-3">
                  <button onClick={()=>startView(c)} className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 mr-2">View</button>
                  {canEdit && (
                    <>
                      <button onClick={()=>startEdit(c)} className="px-3 py-1 rounded-lg border mr-2">Edit</button>
                      <button onClick={()=>remove(c._id)} className="px-3 py-1 rounded-lg border hover:bg-red-50">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filteredList.length === 0 && (
              <tr><td className="p-4 text-royal/70 text-center" colSpan="9">
                {list.length === 0 ? 'No courses' : 'No courses in this category'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft p-4 w-full max-w-2xl">
            <h2 className="text-xl font-bold text-navy mb-3">{editId ? 'Edit Course' : 'Add Course'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-royal mb-1">Course Name *</label>
                <input className="w-full border rounded-xl px-3 py-2" required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Category</label>
                <input className="w-full border rounded-xl px-3 py-2" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Duration</label>
                <input className="w-full border rounded-xl px-3 py-2" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Regular Fee</label>
                <input type="number" className="w-full border rounded-xl px-3 py-2" value={form.regularFee} onChange={e=>setForm(f=>({...f,regularFee:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Discount Fee</label>
                <input type="number" className="w-full border rounded-xl px-3 py-2" value={form.discountFee} onChange={e=>setForm(f=>({...f,discountFee:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Teacher</label>
                <input className="w-full border rounded-xl px-3 py-2" value={form.teacher} onChange={e=>setForm(f=>({...f,teacher:e.target.value}))}/>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-royal mb-1">Details</label>
                <textarea rows="3" className="w-full border rounded-xl px-3 py-2" value={form.details} onChange={e=>setForm(f=>({...f,details:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm text-royal mb-1">Status</label>
                <select className="w-full border rounded-xl px-3 py-2" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={()=>setOpen(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
              {canEdit && <button className="px-4 py-2 rounded-xl bg-gold text-navy font-semibold hover:bg-lightgold">{editId ? 'Save' : 'Create'}</button>}
            </div>
          </form>
        </div>
      )}

      {/* View Course Details Modal */}
      {viewOpen && viewCourse && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-soft p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-navy">Course Details</h2>
              <button onClick={() => setViewOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              {/* Course ID & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Course ID</div>
                  <div className="text-lg font-semibold text-navy">{viewCourse.courseId}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div className={`text-lg font-semibold ${viewCourse.status === 'Active' ? 'text-green-600' : 'text-gray-600'}`}>
                    {viewCourse.status}
                  </div>
                </div>
              </div>

              {/* Course Name */}
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="text-sm text-blue-600 mb-1">Course Name</div>
                <div className="text-xl font-bold text-navy">{viewCourse.name}</div>
              </div>

              {/* Category & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Category</div>
                  <div className="text-lg font-semibold text-navy">{viewCourse.category || 'Not specified'}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Duration</div>
                  <div className="text-lg font-semibold text-navy">{viewCourse.duration || 'Not specified'}</div>
                </div>
              </div>

              {/* Fees */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
                  <div className="text-sm text-yellow-700 mb-1">Regular Fee</div>
                  <div className="text-2xl font-bold text-yellow-800">৳ {viewCourse.regularFee.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                  <div className="text-sm text-green-700 mb-1">Discount Fee</div>
                  <div className="text-2xl font-bold text-green-800">৳ {viewCourse.discountFee.toLocaleString()}</div>
                  {viewCourse.regularFee > viewCourse.discountFee && (
                    <div className="text-xs text-green-600 mt-1">
                      Save ৳{(viewCourse.regularFee - viewCourse.discountFee).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Teacher */}
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-sm text-purple-600 mb-1">Teacher/Instructor</div>
                <div className="text-lg font-semibold text-purple-800">{viewCourse.teacher || 'Not assigned'}</div>
              </div>

              {/* Details */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="text-sm text-gray-600 mb-2">Course Details</div>
                <div className="text-gray-800 whitespace-pre-wrap">
                  {viewCourse.details || 'No details provided'}
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <span className="font-semibold">Created:</span> {new Date(viewCourse.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">Updated:</span> {new Date(viewCourse.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setViewOpen(false)} 
                className="px-6 py-2 rounded-xl bg-navy text-white font-semibold hover:bg-navy/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
