// Visible only to DM / Admin / SuperAdmin — never rendered in counsellor views.
const TEMP_STYLE = {
  Hot:  { pill: 'bg-red-100 text-red-700 border border-red-200',    dot: 'bg-red-500'    },
  Warm: { pill: 'bg-orange-100 text-orange-700 border border-orange-200', dot: 'bg-orange-400' },
  Cold: { pill: 'bg-blue-100 text-blue-700 border border-blue-200', dot: 'bg-blue-400'   },
};

const SCORE_COLOR = (score) =>
  score >= 70 ? 'text-red-600 font-bold' :
  score >= 50 ? 'text-orange-500 font-semibold' :
                'text-blue-500';

export default function ScoreBadge({ aiScore, leadTemperature, aiReasoning }) {
  const style = TEMP_STYLE[leadTemperature];

  return (
    <div className="flex flex-col gap-1 items-start">
      {/* Score number */}
      {aiScore != null ? (
        <span className={`text-sm tabular-nums ${SCORE_COLOR(aiScore)}`}>
          {aiScore}<span className="text-[10px] text-gray-400 font-normal">/100</span>
        </span>
      ) : (
        <span className="text-xs text-gray-400 italic">scoring…</span>
      )}

      {/* Hot / Warm / Cold pill */}
      {style ? (
        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {leadTemperature}
        </span>
      ) : (
        <span className="text-[11px] text-gray-400 italic">pending</span>
      )}

      {/* AI reasoning — short explanation */}
      {aiReasoning && (
        <span className="text-[10px] text-gray-400 italic max-w-[120px] leading-tight">
          {aiReasoning}
        </span>
      )}
    </div>
  );
}
