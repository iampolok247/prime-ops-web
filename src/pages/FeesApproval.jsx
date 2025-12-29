import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function FeesApproval() {
  const { user } = useAuth();
  if (user?.role !== 'Accountant') {
    return <div className="text-royal">Only Accountant can approve fees.</div>;
  }

  const [status, setStatus] = useState('Pending');
  const [rows, setRows] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    try {
      const { fees } = await api.listFeesForApproval(status);
      setRows(fees || []);
      setErr(null);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, [status]); // eslint-disable-line

  const approve = async (id) => {
    setMsg(null); setErr(null);
    try { await api.approveFee(id); setMsg('Approved'); load(); } catch (e) { setErr(e.message); }
  };
  const reject = async (id) => {
    setMsg(null); setErr(null);
    try { await api.rejectFee(id); setMsg('Rejected'); load(); } catch (e) { setErr(e.message); }
  };
  const cancelPayment = async () => {
    if (!cancelReason.trim()) {
      setErr('Please provide a cancellation reason');
      return;
    }
    setMsg(null); setErr(null); setCancelling(true);
    try {
      await api.cancelFee(selectedFee._id, cancelReason);
      setMsg('Payment cancelled successfully');
      setShowCancelModal(false);
      setCancelReason('');
      setDetailsOpen(false);
      setSelectedFee(null);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-navy">Fees Approval</h1>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2">
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>
      </div>
      {msg && <div className="mb-2 text-green-700">{msg}</div>}
      {err && <div className="mb-2 text-red-600">{err}</div>}

      <div className="bg-white rounded-2xl shadow-soft overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f6ff] text-royal">
            <tr>
              <th className="p-3 text-left">Lead</th>
              <th className="p-3 text-left">Course</th>
              <th className="p-3 text-left">Total Amount</th>
              <th className="p-3 text-left">Paid</th>
              <th className="p-3 text-left">Due</th>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-left">Payment Date</th>
              <th className="p-3 text-left">Submitted By</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(f => (
              <tr key={f._id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  {f.lead?.leadId} — {f.lead?.name}
                  <div className="text-xs text-royal/70">{f.lead?.phone} {f.lead?.email ? `• ${f.lead.email}` : ''}</div>
                </td>
                <td className="p-3">{f.courseName}</td>
                <td className="p-3 font-semibold">৳ {f.totalAmount || 0}</td>
                <td className="p-3 text-green-600 font-semibold">৳ {f.amount || 0}</td>
                <td className="p-3 text-orange-600 font-semibold">৳ {f.dueAmount || 0}</td>
                <td className="p-3">{f.method}</td>
                <td className="p-3">{new Date(f.paymentDate).toLocaleDateString()}</td>
                <td className="p-3">{f.submittedBy?.name || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    f.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    f.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {f.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => { setSelectedFee(f); setDetailsOpen(true); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Details
                    </button>
                    {status === 'Pending' && (
                      <>
                        <button onClick={()=>approve(f._id)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition-colors">
                          Approve
                        </button>
                        <button onClick={()=>reject(f._id)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-4 text-royal/70" colSpan="10">No items</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {detailsOpen && selectedFee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-5">
              <div>
                <h3 className="text-xl font-bold text-[#053867]">Fee Collection Details</h3>
                <p className="text-xs text-gray-500 mt-1">Complete information about this payment</p>
              </div>
              <button type="button" onClick={()=>{setDetailsOpen(false); setSelectedFee(null);}} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Student Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-[#053867] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Student Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Lead ID:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.lead?.leadId}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.lead?.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.lead?.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.lead?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Course & Payment Information */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-[#053867] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Payment Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Course:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.courseName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment Method:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.method}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <p className="font-bold text-lg text-[#053867]">৳ {selectedFee.totalAmount || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount Paid:</span>
                    <p className="font-bold text-lg text-green-600">৳ {selectedFee.amount || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Amount:</span>
                    <p className="font-bold text-lg text-orange-600">৳ {selectedFee.dueAmount || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedFee.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        selectedFee.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedFee.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted By:</span>
                    <p className="font-semibold text-[#053867]">{selectedFee.submittedBy?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-[#053867] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Important Dates
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Payment Date:</span>
                    <p className="font-semibold text-[#053867]">{new Date(selectedFee.paymentDate).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Next Payment Date:</span>
                    <p className="font-semibold text-[#053867]">
                      {selectedFee.nextPaymentDate ? new Date(selectedFee.nextPaymentDate).toLocaleDateString('en-GB') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted At:</span>
                    <p className="font-semibold text-[#053867]">{new Date(selectedFee.createdAt).toLocaleString('en-GB')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Updated:</span>
                    <p className="font-semibold text-[#053867]">{new Date(selectedFee.updatedAt).toLocaleString('en-GB')}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedFee.note && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-[#053867] mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Additional Notes
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedFee.note}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
              {status === 'Pending' && (
                <>
                  <button 
                    onClick={()=>{approve(selectedFee._id); setDetailsOpen(false); setSelectedFee(null);}}
                    className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors">
                    Approve
                  </button>
                  <button 
                    onClick={()=>{reject(selectedFee._id); setDetailsOpen(false); setSelectedFee(null);}}
                    className="px-5 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
                    Reject
                  </button>
                </>
              )}
              {status === 'Approved' && (
                <button 
                  onClick={()=>{ setShowCancelModal(true); }}
                  className="px-5 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Payment
                </button>
              )}
              <button 
                onClick={()=>{setDetailsOpen(false); setSelectedFee(null);}}
                className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Payment Modal */}
      {showCancelModal && selectedFee && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-40" onClick={()=>!cancelling && setShowCancelModal(false)} />
          <div className="bg-white rounded-xl p-6 z-10 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-navy mb-4">Cancel Payment</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will revert the fee status to <strong>Pending</strong> for re-approval. Please provide a reason for cancellation.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={cancelling}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                placeholder="Enter the reason for cancelling this approved payment..."
              />
            </div>

            {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); setErr(null); }}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
                Close
              </button>
              <button
                onClick={cancelPayment}
                disabled={cancelling || !cancelReason.trim()}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
