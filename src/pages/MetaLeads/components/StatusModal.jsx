import { useState } from 'react';
import { X } from 'lucide-react';

const STATUSES = ['Counseling', 'In Follow Up', 'Admitted', 'Not Admitted', 'Not Interested'];

const STATUS_COLOR = {
  Counseling:       'bg-blue-100 text-blue-700',
  'In Follow Up':   'bg-yellow-100 text-yellow-700',
  Admitted:         'bg-green-100 text-green-700',
  'Not Admitted':   'bg-gray-100 text-gray-600',
  'Not Interested': 'bg-red-100 text-red-700',
};

export default function StatusModal({ lead, onClose, onSubmit }) {
  const [status, setStatus]               = useState('');
  const [notes, setNotes]                 = useState('');
  const [reason, setReason]               = useState('');
  const [counsellorFeedback, setFeedback] = useState('');
  const [nextFollowUpDate, setFollowDate] = useState('');
  const [admittedToCourse, setAdmCourse] = useState(lead.interestedCourse || '');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!status) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ status, notes, reason, counsellorFeedback, nextFollowUpDate, admittedToCourse });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <p className="text-xs text-gray-400 font-mono">{lead.leadId}</p>
            <h2 className="font-semibold text-gray-800">{lead.name}</h2>
            <p className="text-xs text-gray-500">{lead.interestedCourse || 'No course'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Status grid */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">New Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition
                    ${status === s
                      ? `${STATUS_COLOR[s]} border-current ring-2 ring-offset-1 ring-blue-300`
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Optional notes…"
            />
          </div>

          {/* Col 11: Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. Budget constraints, already enrolled…" />
          </div>

          {/* Col 12: Counsellor Feedback */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Counsellor Feedback</label>
            <textarea value={counsellorFeedback} onChange={e => setFeedback(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Internal feedback from counselling session…" />
          </div>

          {/* Conditional: follow-up date */}
          {status === 'In Follow Up' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Next Follow-Up Date</label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={e => setFollowDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          )}

          {/* Conditional: admitted course */}
          {status === 'Admitted' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Admitted to Course</label>
              <input
                type="text"
                value={admittedToCourse}
                onChange={e => setAdmCourse(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                placeholder="Course name…"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={!status || loading}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-white bg-[#253985] hover:bg-blue-800 disabled:opacity-40">
              {loading ? 'Saving…' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
