// web/src/components/LeadHistoryModal.jsx
import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const fmtDT = (d) => { 
  if (!d) return '-'; 
  try { 
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch { 
    return d; 
  } 
};

export default function LeadHistoryModal({ lead, onClose, onUpdate }) {
  const { user } = useAuth();
  const [followUpNote, setFollowUpNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [priority, setPriority] = useState(lead?.priority || 'Interested');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const isAdmission = user?.role === 'Admission';
  const canAddFollowUp = isAdmission && lead.status !== 'Admitted' && lead.status !== 'Not Admitted';

  const handleAddFollowUp = async () => {
    if (!followUpNote.trim() && !nextFollowUpDate) {
      setErr('Please add a note or select next follow-up date');
      return;
    }

    try {
      setSaving(true);
      setErr(null);
      await api.addLeadFollowUp(lead._id, {
        note: followUpNote.trim(),
        nextFollowUpDate: nextFollowUpDate || undefined,
        priority: priority
      });
      setMsg('Follow-up added successfully');
      setFollowUpNote('');
      setNextFollowUpDate('');
      setTimeout(() => {
        setMsg(null);
        if (onUpdate) onUpdate();
      }, 1500);
    } catch (e) {
      setErr(e.message || 'Failed to add follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAdmitted = async () => {
    if (!confirm('Mark this lead as Admitted?')) return;
    try {
      setSaving(true);
      await api.updateLeadStatus(lead._id, 'Admitted');
      setMsg('Lead marked as Admitted');
      setTimeout(() => {
        if (onUpdate) onUpdate();
        onClose();
      }, 1000);
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  const handleMarkNotAdmitted = async () => {
    const reason = prompt('Reason for not admitting (optional):');
    if (reason === null) return; // User cancelled
    try {
      setSaving(true);
      await api.updateLeadStatus(lead._id, 'Not Admitted', reason);
      setMsg('Lead marked as Not Admitted');
      setTimeout(() => {
        if (onUpdate) onUpdate();
        onClose();
      }, 1000);
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
      <div className="bg-white rounded-xl p-6 z-10 w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-navy">Lead History — {lead.leadId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        {msg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {msg}
          </div>
        )}
        {err && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {err}
          </div>
        )}
        
        {/* Student Info */}
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-600">Name:</span> <strong>{lead.name}</strong></div>
            <div><span className="text-gray-600">Phone:</span> <strong>{lead.phone || '-'}</strong></div>
            <div><span className="text-gray-600">Email:</span> <strong>{lead.email || '-'}</strong></div>
            <div><span className="text-gray-600">Course:</span> <strong>{lead.interestedCourse || '-'}</strong></div>
            <div><span className="text-gray-600">Status:</span> <strong className="text-indigo-600">{lead.status}</strong></div>
            <div><span className="text-gray-600">Assigned To:</span> <strong>{lead.assignedTo?.name || '-'}</strong></div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3 mb-4">
          <div className="border-l-4 border-blue-400 pl-4 py-2">
            <div className="text-sm text-gray-600">Assigned At</div>
            <div className="font-semibold">{lead.assignedAt ? fmtDT(lead.assignedAt) : <span className="text-gray-400">Not recorded</span>}</div>
          </div>
          
          <div className="border-l-4 border-purple-400 pl-4 py-2">
            <div className="text-sm text-gray-600">Counseling At</div>
            <div className="font-semibold">{lead.counselingAt ? fmtDT(lead.counselingAt) : <span className="text-gray-400">Not yet</span>}</div>
          </div>
          
          <div className="border-l-4 border-green-400 pl-4 py-2">
            <div className="text-sm text-gray-600">Admitted At</div>
            <div className="font-semibold">{lead.admittedAt ? fmtDT(lead.admittedAt) : <span className="text-gray-400">Not admitted yet</span>}</div>
            {lead.admittedToCourse && (
              <div className="text-sm text-gray-600 mt-1">Course: <strong>{lead.admittedToCourse.name}</strong></div>
            )}
            {lead.admittedToBatch && (
              <div className="text-sm text-gray-600">Batch: <strong>{lead.admittedToBatch.name}</strong></div>
            )}
          </div>
        </div>

        {/* Follow-ups Section */}
        <div className="mb-4">
          <h4 className="font-bold text-navy mb-2">Follow-ups ({(lead.followUps||[]).length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(lead.followUps||[]).length === 0 ? (
              <div className="text-gray-500 text-sm bg-gray-50 p-3 rounded-lg">No follow-ups recorded</div>
            ) : (
              (lead.followUps||[]).map((f, idx)=> (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 border-l-4 border-orange-400">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700">{fmtDT(f.at)}</div>
                      {f.by?.name && <div className="text-xs text-gray-500">by {f.by.name}</div>}
                      <div className="text-sm text-gray-800 mt-1">{f.note || <span className="text-gray-400">No note</span>}</div>
                      {f.nextFollowUpDate && (
                        <div className="text-xs text-indigo-600 mt-1">Next follow-up: {new Date(f.nextFollowUpDate).toLocaleDateString('en-GB')}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Follow-up Form (Only for Admission) */}
        {canAddFollowUp && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-bold text-navy mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Add Follow-up Note
            </h4>
            <textarea
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Enter follow-up note..."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Next Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Very Interested">Very Interested</option>
                  <option value="Interested">Interested</option>
                  <option value="Few Interested">Few Interested</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleAddFollowUp}
              disabled={saving}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Add Follow-up'}
            </button>
          </div>
        )}

        {/* Additional Notes */}
        {lead.notes && (
          <div className="mb-4">
            <h4 className="font-bold text-navy mb-2">Additional Notes</h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              {lead.notes}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {isAdmission && lead.status !== 'Admitted' && lead.status !== 'Not Admitted' && (
            <>
              <button
                onClick={handleMarkAdmitted}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Mark Admitted
              </button>
              <button
                onClick={handleMarkNotAdmitted}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                ✗ Not Admitted
              </button>
            </>
          )}
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
