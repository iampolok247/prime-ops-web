import React, { useState, useEffect } from 'react';
import { api, fmtBDTEn } from '../lib/api.js';
import { 
  DollarSign,
  CheckCircle,
  Clock,
  User,
  Calendar,
  MapPin,
  FileText
} from 'lucide-react';

export default function TADAPayments() {
  const [filter, setFilter] = useState('Pending');
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentNote, setPaymentNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const loadApplications = async () => {
    try {
      const resp = await api.getAccountantTADAApplications(filter === 'All' ? '' : filter);
      setApplications(resp.applications || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const handlePay = async () => {
    setLoading(true); setErr(null); setMsg(null);
    try {
      await api.payTADAApplication(selectedApp._id, paymentNote);
      setMsg(`Payment processed for ${selectedApp.employee.name} - ${fmtBDTEn(selectedApp.amount)}`);
      setShowPayModal(false);
      setPaymentNote('');
      loadApplications();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPending = applications.filter(a => a.paymentStatus === 'Pending').reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = applications.filter(a => a.paymentStatus === 'Paid').reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          TA/DA Payments
        </h1>
        <p className="text-gray-600 mt-1">Process approved travel allowance and dearness allowance payments</p>
      </div>

      {/* Messages */}
      {msg && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 font-medium">{msg}</p>
        </div>
      )}
      {err && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <p className="text-red-800 font-medium">{err}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-1">Pending Payments</p>
              <p className="text-3xl font-bold">{fmtBDTEn(totalPending)}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Clock className="w-8 h-8" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-6 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-1">Paid Total</p>
              <p className="text-3xl font-bold">{fmtBDTEn(totalPaid)}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Filter */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Payment Status:</label>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Paid</option>
            </select>
            <span className="text-sm text-gray-500">({applications.length} applications)</span>
          </div>
        </div>

        {/* List */}
        <div className="p-6">
          {applications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <DollarSign className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p>No TA/DA applications for payment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map(app => (
                <div key={app._id} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {app.employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-lg">{app.employee.name}</p>
                        <p className="text-sm text-gray-500">{app.employee.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.paymentStatus === 'Pending' ? (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Pending Payment
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Paid
                        </span>
                      )}
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {app.applicationType}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 bg-white rounded-lg p-4 border border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Travel Date
                      </p>
                      <p className="font-medium text-gray-800">
                        {new Date(app.travelDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Destination
                      </p>
                      <p className="font-medium text-gray-800">{app.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Amount
                      </p>
                      <p className="font-bold text-gray-800 text-xl">{fmtBDTEn(app.amount)}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Purpose
                    </p>
                    <p className="text-sm text-gray-700">{app.purpose}</p>
                  </div>

                  {app.description && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Description</p>
                      <p className="text-sm text-gray-700">{app.description}</p>
                    </div>
                  )}

                  {app.adminReviewNote && (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Admin Approval Note</p>
                      <p className="text-sm text-gray-700">{app.adminReviewNote}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Approved by {app.adminReviewedBy?.name} on {new Date(app.adminReviewedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {app.paymentStatus === 'Pending' ? (
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setShowPayModal(true);
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg px-6 py-3 font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-5 h-5" />
                      Process Payment - {fmtBDTEn(app.amount)}
                    </button>
                  ) : (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Payment Confirmation</p>
                      {app.paymentNote && (
                        <p className="text-sm text-gray-700 mb-2">{app.paymentNote}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Paid by {app.paidBy?.name} on {new Date(app.paidAt).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Process Payment</h3>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Employee:</span>
                <span className="font-semibold text-gray-800">{selectedApp.employee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Type:</span>
                <span className="font-semibold text-gray-800">{selectedApp.applicationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-bold text-gray-800 text-xl">{fmtBDTEn(selectedApp.amount)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Note (Optional)
              </label>
              <textarea
                rows="3"
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none resize-none"
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                placeholder="Add payment confirmation details or transaction reference..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowPayModal(false); setPaymentNote(''); }}
                className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
