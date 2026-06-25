import { useState } from 'react';
import { X, CheckCircle, XCircle, Flame, Thermometer, Snowflake } from 'lucide-react';

// Temperature display — AI-generated, read-only for DM
const TEMP_CONFIG = {
  Hot:  { icon: <Flame size={14} />,        style: 'bg-red-50 border-red-300 text-red-700',       label: 'Hot' },
  Warm: { icon: <Thermometer size={14} />,  style: 'bg-orange-50 border-orange-300 text-orange-700', label: 'Warm' },
  Cold: { icon: <Snowflake size={14} />,    style: 'bg-blue-50 border-blue-300 text-blue-700',    label: 'Cold' },
};

export default function ValidateModal({ lead, admissionUsers, onClose, onSubmit }) {
  const [action, setAction]         = useState('validate');
  const [assignedTo, setAssignedTo] = useState('');
  const [rejectionReason, setRej]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const temp   = TEMP_CONFIG[lead.leadTemperature];
  const scored = lead.aiScore != null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ action, assignedTo: assignedTo || null, rejectionReason });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <p className="text-xs text-gray-400 font-mono">{lead.leadId}</p>
            <h2 className="font-semibold text-gray-800 text-lg leading-tight">{lead.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{lead.interestedCourse || 'No course'} · {lead.phone || lead.email || '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1"><X size={20} /></button>
        </div>

        {/* AI Score card — read only */}
        <div className="mx-5 mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">AI Score (auto-generated)</p>
          <div className="flex items-center gap-3">
            {scored ? (
              <>
                <span className={`text-3xl font-bold ${
                  lead.aiScore >= 70 ? 'text-red-600' :
                  lead.aiScore >= 50 ? 'text-orange-500' : 'text-blue-500'
                }`}>
                  {lead.aiScore}
                  <span className="text-sm text-gray-400 font-normal">/100</span>
                </span>
                {temp && (
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${temp.style}`}>
                    {temp.icon} {temp.label}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-400 italic">AI scoring in progress…</span>
            )}
          </div>
          {lead.aiReasoning && (
            <p className="text-xs text-gray-500 mt-1.5 italic">"{lead.aiReasoning}"</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Approve / Reject toggle */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">DM Decision</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAction('validate')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition
                  ${action === 'validate'
                    ? 'bg-green-50 border-green-400 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <CheckCircle size={15} /> Approve
              </button>
              <button type="button" onClick={() => setAction('reject')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition
                  ${action === 'reject'
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <XCircle size={15} /> Reject
              </button>
            </div>
          </div>

          {action === 'validate' ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Assign to Counsellor
                <span className="text-gray-400 font-normal ml-1">(optional — leave blank for 1 PM round-robin)</span>
              </label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Auto-assign at 1 PM</option>
                {admissionUsers.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rejection Reason</label>
              <textarea value={rejectionReason} onChange={e => setRej(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
                placeholder="e.g. Wrong number, duplicate, out of target area…" />
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-50
                ${action === 'validate' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {loading ? 'Saving…' : action === 'validate' ? 'Approve Lead' : 'Reject Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
