// Structured lead-quality feedback for Meta CRM leads.
// Keep in sync with prime-ops-api/utils/leadQuality.js
//   Bad  → sent to Meta as "Disqualified" (junk lead — Meta learns to avoid these)
//   Lost → sent to Meta as "Not Interested" (genuine lead that did not convert)
export const BAD_LEAD_REASONS = [
  'Wrong / invalid number',
  'Fake / spam',
  'Did not fill the form',
  'Unreachable (5+ tries)',
  'Irrelevant / wrong course',
  'Duplicate lead',
  'Asking for free',
  'Far from location',
];

export const LOST_LEAD_REASONS = [
  'Fee / budget issue',
  'Schedule / timing issue',
  'Location issue',
  'Joined elsewhere',
  'Just exploring',
  'Other',
];

export function QualityReasonSelect({ value, onChange, badOnly = false, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold ${className}`}
      required
    >
      <option value="">-- Select reason --</option>
      <optgroup label="❌ Bad lead (junk — Meta will learn from this)">
        {BAD_LEAD_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
      </optgroup>
      {!badOnly && (
        <optgroup label="🟡 Genuine lead, not converted">
          {LOST_LEAD_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </optgroup>
      )}
    </select>
  );
}

export function QualityBadge({ quality, reason }) {
  if (!quality) return <span className="text-royal/50">-</span>;
  const cls = quality === 'Bad' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800';
  return (
    <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${cls}`} title={reason}>
      {quality === 'Bad' ? 'Bad lead' : 'Not converted'}{reason ? `: ${reason}` : ''}
    </span>
  );
}
