import React, { useEffect, useState } from 'react';
import { api, fmtBDTEn, fmtDate } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Plus, Trash2, DollarSign, Calendar, FileText } from 'lucide-react';

export default function PreviousIncomePage() {
  const { user } = useAuth();
  const canEdit = ['Accountant', 'Admin', 'SuperAdmin'].includes(user?.role);
  
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'Other'
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.listPreviousIncome();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createPreviousIncome({
        amount: Number(form.amount),
        description: form.description,
        date: form.date,
        category: form.category
      });
      setForm({ amount: '', description: '', date: new Date().toISOString().slice(0, 10), category: 'Other' });
      setShowForm(false);
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.deletePreviousIncome(id);
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Previous Income
          </h1>
          <p className="text-gray-600 mt-1">Manual entries for income before software implementation</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-medium shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Entry
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Total Card */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 shadow-lg text-white max-w-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-white/80 font-medium">Total Previous Income</span>
          </div>
          <h2 className="text-3xl font-bold">{fmtBDTEn(total)}</h2>
        </div>
      </div>

      {/* Add Form */}
      {showForm && canEdit && (
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Entry</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (BDT)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
                min="0"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="Admission Fees">Admission Fees</option>
                <option value="Recruitment Income">Recruitment Income</option>
                <option value="Dues Collection">Dues Collection</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Enter description"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">All Entries ({entries.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No previous income entries yet</p>
            {canEdit && <p className="text-sm mt-1">Click "Add Entry" to create one</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Added By</th>
                  {canEdit && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map(entry => (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {fmtDate(entry.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        entry.category === 'Admission Fees' ? 'bg-green-100 text-green-700' :
                        entry.category === 'Recruitment Income' ? 'bg-blue-100 text-blue-700' :
                        entry.category === 'Dues Collection' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{entry.description}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">{fmtBDTEn(entry.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.createdBy?.name || 'Unknown'}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
