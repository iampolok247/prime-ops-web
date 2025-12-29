import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, Eye, Edit, Trash2, Plus } from 'lucide-react';

export default function Batches() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ batchName: '', category: '', targetedStudent: '', status: 'Active' });
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const canEdit = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  const load = async () => {
    try {
      setLoading(true);
      const [batchesResp, coursesResp] = await Promise.all([
        api.listBatches(),
        api.listCourses()
      ]);
      setBatches(batchesResp?.batches || []);
      setCourses(coursesResp?.courses || []);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startAdd = () => {
    setEditId(null);
    setForm({ batchName: '', category: '', targetedStudent: '', status: 'Active' });
    setShowModal(true);
  };

  const startEdit = (batch) => {
    setEditId(batch._id);
    setForm({
      batchName: batch.batchName,
      category: batch.category,
      targetedStudent: batch.targetedStudent,
      status: batch.status
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      if (editId) {
        await api.updateBatch(editId, form);
        setMsg('Batch updated successfully');
      } else {
        await api.createBatch(form);
        setMsg('Batch created successfully');
      }
      setShowModal(false);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const remove = async (id, hasStudents) => {
    if (hasStudents) {
      alert('Cannot delete batch with admitted students');
      return;
    }
    if (!confirm('Delete this batch?')) return;
    try {
      await api.deleteBatch(id);
      setMsg('Batch deleted successfully');
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const viewReport = async (batch) => {
    try {
      const { batch: fullBatch } = await api.getBatchReport(batch._id);
      setSelectedBatch(fullBatch);
      setShowReportModal(true);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-navy">Batch Management</h1>
        {canEdit && (
          <button 
            onClick={startAdd}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-navy rounded-xl font-semibold hover:bg-lightgold"
          >
            <Plus size={18} />
            Add Batch
          </button>
        )}
      </div>

      {msg && <div className="mb-3 p-3 bg-green-100 text-green-700 rounded-xl">{msg}</div>}
      {err && <div className="mb-3 p-3 bg-red-100 text-red-600 rounded-xl">{err}</div>}

      {loading ? (
        <div className="text-center py-8 text-royal">Loading batches...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f6ff] text-royal">
              <tr>
                <th className="text-left p-3">Batch ID</th>
                <th className="text-left p-3">Batch Name</th>
                <th className="text-left p-3">Course</th>
                <th className="text-left p-3">Targeted Students</th>
                <th className="text-left p-3">Admitted Students</th>
                <th className="text-left p-3">Progress</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => {
                const admitted = batch.admittedStudents?.length || 0;
                const target = batch.targetedStudent || 0;
                const progress = target > 0 ? Math.round((admitted / target) * 100) : 0;
                
                return (
                  <tr key={batch._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{batch.batchId}</td>
                    <td className="p-3 font-semibold text-navy">{batch.batchName}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                        {batch.category}
                      </span>
                    </td>
                    <td className="p-3 text-center">{target}</td>
                    <td className="p-3 text-center font-semibold text-blue-600">{admitted}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              progress >= 100 ? 'bg-green-500' : 
                              progress >= 75 ? 'bg-blue-500' : 
                              progress >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{progress}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        batch.status === 'Active' ? 'bg-green-100 text-green-700' :
                        batch.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewReport(batch)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                          title="View Report"
                        >
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => startEdit(batch)}
                              className="p-2 rounded-lg border hover:bg-gray-100"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => remove(batch._id, admitted > 0)}
                              className="p-2 rounded-lg border hover:bg-red-50 text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {batches.length === 0 && (
                <tr><td colSpan="8" className="p-4 text-center text-royal/70">No batches found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-navy mb-4">
              {editId ? 'Edit Batch' : 'Add New Batch'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-royal mb-1">
                  Batch Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.batchName}
                  onChange={e => setForm({...form, batchName: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2"
                  placeholder="e.g., Graphics Design Batch 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-royal mb-1">
                  Course *
                </label>
                <select
                  required
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">Select Course...</option>
                  {courses.map(c => (
                    <option key={c._id} value={c.category}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-royal mb-1">
                  Targeted Students *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.targetedStudent}
                  onChange={e => setForm({...form, targetedStudent: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2"
                  placeholder="e.g., 25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-royal mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gold text-navy font-semibold hover:bg-lightgold"
              >
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-soft p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy">
                Batch Report: {selectedBatch.batchName}
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Batch Info */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="text-sm text-blue-600 mb-1">Batch ID</div>
                <div className="text-lg font-bold text-blue-800">{selectedBatch.batchId}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <div className="text-sm text-green-600 mb-1">Admitted / Target</div>
                <div className="text-lg font-bold text-green-800">
                  {selectedBatch.admittedStudents?.length || 0} / {selectedBatch.targetedStudent}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-sm text-purple-600 mb-1">Course</div>
                <div className="text-lg font-bold text-purple-800">{selectedBatch.category}</div>
              </div>
            </div>

            {/* Students List */}
            <h3 className="text-lg font-semibold text-navy mb-3">Admitted Students</h3>
            {selectedBatch.admittedStudents?.length > 0 ? (
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="text-left p-3">Lead ID</th>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Phone</th>
                      <th className="text-left p-3">Course</th>
                      <th className="text-left p-3">Admitted Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBatch.admittedStudents.map((student, idx) => (
                      <tr key={idx} className="border-t border-gray-300">
                        <td className="p-3 font-mono text-xs">{student.lead?.leadId || '-'}</td>
                        <td className="p-3 font-medium">{student.lead?.name || '-'}</td>
                        <td className="p-3">{student.lead?.phone || '-'}</td>
                        <td className="p-3">{student.lead?.interestedCourse || '-'}</td>
                        <td className="p-3">
                          {student.admittedAt ? new Date(student.admittedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-royal/70">No students admitted yet</div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowReportModal(false)}
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
