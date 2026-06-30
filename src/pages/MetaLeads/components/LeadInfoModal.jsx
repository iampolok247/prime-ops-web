import { X, MessageCircle } from 'lucide-react';

// Counsellor-facing info popup — shows AI reasoning (qualitative only,
// no score/temperature) + the lead's raw form Q&A so the counsellor can
// prep before calling. Reused by My Pipeline and My Queue.
export default function LeadInfoModal({ lead, onClose }) {
  const fieldData = lead.rawQuestionData?.field_data;
  let answers = [];

  if (Array.isArray(fieldData)) {
    answers = fieldData.map(f => ({ q: f.name, a: f.values?.[0] }));
  } else if (typeof fieldData === 'string') {
    try {
      const parsed = JSON.parse(fieldData);
      if (Array.isArray(parsed)) {
        answers = parsed.map(f => ({ q: f.name, a: Array.isArray(f.values) ? f.values[0] : f.values }));
      } else if (parsed && typeof parsed === 'object') {
        answers = Object.entries(parsed).map(([q, v]) => ({ q, a: Array.isArray(v) ? v[0] : v }));
      }
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-[#253985]">{lead.name}</p>
            <p className="text-xs text-gray-400">{lead.leadId} · {lead.interestedCourse || 'No course'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* AI reasoning — qualitative summary only, no score shown */}
          {lead.aiReasoning && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageCircle size={12} className="text-blue-500" />
                <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">AI Summary</p>
              </div>
              <p className="text-sm text-blue-900">{lead.aiReasoning}</p>
            </div>
          )}

          {/* Raw form answers */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Form Answers</p>
            {answers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No form answers available</p>
            ) : (
              <div className="space-y-2">
                {answers.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-[11px] text-gray-400 mb-0.5 uppercase tracking-wide">{item.q}</p>
                    <p className="text-sm text-gray-800 font-medium">{item.a || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
