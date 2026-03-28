import React, { useEffect, useState } from 'react';
import { api, fmtBDTEn, fmtDate } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Plus, Trash2, FileText, Check, X, Clock, Eye, ChevronDown, ChevronUp } from 'lucide-react';

const DEPARTMENTS = [
  'IT',
  'HR & Admin',
  'Sales',
  'Digital Marketing',
  'Recruitment',
  'Media Graphic',
  'SEO',
  'Finance',
  'Management',
  'Other'
];

export default function RequisitionPage() {
  const { user } = useAuth();
  const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role);
  
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '' });
  
  const [form, setForm] = useState({
    subject: '',
    department: user?.role === 'IT' ? 'IT' : '',
    items: [{ sl: 1, particulars: '', estimatedCost: '' }],
    amountInWords: ''
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.listRequisitions();
      setRequisitions(data.requisitions || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { sl: form.items.length + 1, particulars: '', estimatedCost: '' }]
    });
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    const newItems = form.items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sl: i + 1 }));
    setForm({ ...form, items: newItems });
  };

  const updateItem = (idx, field, value) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const totalAmount = form.items.reduce((sum, item) => sum + (Number(item.estimatedCost) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        subject: form.subject,
        department: form.department,
        items: form.items.map(item => ({
          description: item.particulars,
          quantity: 1,
          unitPrice: Number(item.estimatedCost) || 0,
          estimatedCost: Number(item.estimatedCost) || 0
        })),
        totalAmount,
        amountInWords: form.amountInWords
      };
      await api.createRequisition(payload);
      setForm({
        subject: '',
        department: '',
        items: [{ sl: 1, particulars: '', estimatedCost: '' }],
        amountInWords: ''
      });
      setShowForm(false);
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.updateRequisitionStatus(id, status);
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleReject = async () => {
    try {
      await api.updateRequisitionStatus(rejectModal.id, 'Rejected', rejectModal.reason);
      setRejectModal({ open: false, id: null, reason: '' });
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this requisition?')) return;
    try {
      await api.deleteRequisition(id);
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Verified: 'bg-blue-100 text-blue-800 border-blue-200',
      Approved: 'bg-green-100 text-green-800 border-green-200',
      Rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    const icons = {
      Pending: <Clock className="w-3 h-3" />,
      Verified: <Eye className="w-3 h-3" />,
      Approved: <Check className="w-3 h-3" />,
      Rejected: <X className="w-3 h-3" />
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Requisition Form
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Manage and approve requisition requests' : 'Submit requisition requests for approval'}
          </p>
        </div>
        {!isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-medium shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Requisition
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Add Form */}
      {showForm && !isAdmin && (
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6 border border-gray-100">
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-800">REQUISITION FORM</h3>
            <p className="text-sm text-gray-500">প্রাইম একাডেমি লিমিটেড</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject / বিষয়</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Enter subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department / বিভাগ</label>
                <select
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Items / আইটেম</label>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b w-16">SL</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b">Particulars / বিবরণ</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b w-40">Est. Cost (BDT)</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 border-b w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-3 py-2 text-center text-gray-600">{item.sl}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.particulars}
                            onChange={e => updateItem(idx, 'particulars', e.target.value)}
                            required
                            className="w-full px-3 py-1.5 border border-gray-200 rounded focus:border-blue-500 focus:outline-none text-sm"
                            placeholder="Enter description"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.estimatedCost}
                            onChange={e => updateItem(idx, 'estimatedCost', e.target.value)}
                            required
                            min="0"
                            className="w-full px-3 py-1.5 border border-gray-200 rounded focus:border-blue-500 focus:outline-none text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="px-3 py-2 text-right font-medium text-gray-700">Total / মোট:</td>
                      <td className="px-3 py-2 font-bold text-gray-900">{fmtBDTEn(totalAmount)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            {/* Amount in Words */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount in Words / টাকা কথায়</label>
              <input
                type="text"
                value={form.amountInWords}
                onChange={e => setForm({ ...form, amountInWords: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Five Thousand Taka Only"
              />
            </div>

            {/* Declaration */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Declaration:</strong> I hereby declare that requisition for mentioned items are made in accordance 
                with the demand of the respective department/individual.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium"
              >
                Submit Requisition
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requisition List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : requisitions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-lg text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">No Requisitions</h3>
          <p className="text-gray-500">
            {isAdmin ? 'No requisitions submitted yet.' : 'Click "New Requisition" to create one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requisitions.map(req => (
            <div key={req._id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header Row */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === req._id ? null : req._id)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {req.requisitionNo}
                      </span>
                      {getStatusBadge(req.status)}
                    </div>
                    <h3 className="font-semibold text-gray-800">{req.subject}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
                      <span>Dept: {req.department}</span>
                      <span>By: {req.requestedBy?.name}</span>
                      <span>Date: {fmtDate(req.createdAt)}</span>
                      <span className="font-medium text-gray-800">Total: {fmtBDTEn(req.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedId === req._id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === req._id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  {/* Items Table */}
                  <table className="w-full mb-4 border border-gray-200 rounded-lg bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b w-12">SL</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b">Particulars</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 border-b w-32">Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.items?.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-center text-gray-600">{idx + 1}</td>
                          <td className="px-3 py-2 text-gray-800">{item.description}</td>
                          <td className="px-3 py-2 text-right text-gray-800">{fmtBDTEn(item.estimatedCost)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td colSpan="2" className="px-3 py-2 text-right font-medium text-gray-700">Total:</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">{fmtBDTEn(req.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {req.amountInWords && (
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>In Words:</strong> {req.amountInWords}
                    </p>
                  )}

                  {req.rejectionReason && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                      <p className="text-sm text-red-700"><strong>Rejection Reason:</strong> {req.rejectionReason}</p>
                    </div>
                  )}

                  {/* Admin Actions */}
                  {isAdmin && req.status === 'Pending' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleStatusUpdate(req._id, 'Verified')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" /> Verify
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(req._id, 'Approved')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectModal({ open: true, id: req._id, reason: '' })}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                  {isAdmin && req.status === 'Verified' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleStatusUpdate(req._id, 'Approved')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectModal({ open: true, id: req._id, reason: '' })}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}

                  {/* Owner Delete (only pending) */}
                  {!isAdmin && req.status === 'Pending' && req.requestedBy?._id === user?._id && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleDelete(req._id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Reject Requisition</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
              <textarea
                value={rejectModal.reason}
                onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModal({ open: false, id: null, reason: '' })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
