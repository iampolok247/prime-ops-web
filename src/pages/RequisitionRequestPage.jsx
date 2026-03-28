import React, { useEffect, useState } from 'react';
import { api, fmtBDTEn, fmtDate } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Check, Clock, FileText, DollarSign, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

export default function RequisitionRequestPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('pending'); // pending or paid
  const [requisitions, setRequisitions] = useState([]);
  const [paidRequisitions, setPaidRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [payModal, setPayModal] = useState({ open: false, id: null, totalAmount: 0, paidAmount: '', paymentNote: '' });

  const loadApproved = async () => {
    try {
      setLoading(true);
      const data = await api.getApprovedRequisitions();
      setRequisitions(data.requisitions || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPaid = async () => {
    try {
      setLoading(true);
      const data = await api.getPaidRequisitions();
      setPaidRequisitions(data.requisitions || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      loadApproved();
    } else {
      loadPaid();
    }
  }, [activeTab]);

  const handleMarkPaid = async () => {
    try {
      await api.markRequisitionPaid(
        payModal.id,
        Number(payModal.paidAmount) || payModal.totalAmount,
        payModal.paymentNote
      );
      setPayModal({ open: false, id: null, totalAmount: 0, paidAmount: '', paymentNote: '' });
      loadApproved();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const displayRequisitions = activeTab === 'pending' ? requisitions : paidRequisitions;

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Requisition Requests
        </h1>
        <p className="text-gray-600 mt-1">Approved requisitions awaiting payment</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-white/80 font-medium">Pending Payment</span>
          </div>
          <h2 className="text-2xl font-bold">{requisitions.length}</h2>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="text-white/80 font-medium">Total Paid Amount</span>
          </div>
          <h2 className="text-2xl font-bold">
            {fmtBDTEn(paidRequisitions.reduce((sum, r) => sum + (r.paidAmount || r.totalAmount || 0), 0))}
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Pending Payment ({requisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'paid'
              ? 'bg-green-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Paid History
        </button>
      </div>

      {/* Requisition List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : displayRequisitions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-lg text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">
            {activeTab === 'pending' ? 'No Pending Requisitions' : 'No Paid Requisitions'}
          </h3>
          <p className="text-gray-500">
            {activeTab === 'pending'
              ? 'All approved requisitions have been paid.'
              : 'No payment history yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayRequisitions.map(req => (
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
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
                        req.status === 'Approved' 
                          ? 'bg-amber-100 text-amber-800 border-amber-200' 
                          : 'bg-green-100 text-green-800 border-green-200'
                      }`}>
                        {req.status === 'Approved' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {req.status === 'Approved' ? 'Awaiting Payment' : 'Paid'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800">{req.subject}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
                      <span>Dept: {req.department}</span>
                      <span>By: {req.requestedBy?.name}</span>
                      <span>Approved: {fmtDate(req.approvedAt)}</span>
                      {req.status === 'Paid' && (
                        <span>Paid: {fmtDate(req.paidAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="text-lg font-bold text-gray-800">{fmtBDTEn(req.totalAmount)}</p>
                    </div>
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

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                    <p><strong>Approved By:</strong> {req.approvedBy?.name}</p>
                    {req.status === 'Paid' && (
                      <>
                        <p><strong>Paid By:</strong> {req.paidBy?.name}</p>
                        <p><strong>Paid Amount:</strong> {fmtBDTEn(req.paidAmount)}</p>
                        {req.paymentNote && <p><strong>Note:</strong> {req.paymentNote}</p>}
                      </>
                    )}
                  </div>

                  {/* Mark as Paid Button */}
                  {req.status === 'Approved' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setPayModal({ 
                          open: true, 
                          id: req._id, 
                          totalAmount: req.totalAmount,
                          paidAmount: req.totalAmount.toString(),
                          paymentNote: ''
                        })}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium flex items-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" /> Mark as Paid
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pay Modal */}
      {payModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirm Payment</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount (BDT)</label>
              <input
                type="number"
                value={payModal.paidAmount}
                onChange={e => setPayModal({ ...payModal, paidAmount: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                placeholder="Enter paid amount"
              />
              <p className="text-xs text-gray-500 mt-1">Requisition Amount: {fmtBDTEn(payModal.totalAmount)}</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note (Optional)</label>
              <textarea
                value={payModal.paymentNote}
                onChange={e => setPayModal({ ...payModal, paymentNote: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                placeholder="Add any payment note..."
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPayModal({ open: false, id: null, totalAmount: 0, paidAmount: '', paymentNote: '' })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
