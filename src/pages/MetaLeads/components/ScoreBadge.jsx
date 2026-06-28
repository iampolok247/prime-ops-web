import { useState } from 'react';

const TEMP_STYLE = {
  Hot:  { pill: 'bg-red-100 text-red-700 border border-red-200',         dot: 'bg-red-500'    },
  Warm: { pill: 'bg-orange-100 text-orange-700 border border-orange-200', dot: 'bg-orange-400' },
  Cold: { pill: 'bg-blue-100 text-blue-700 border border-blue-200',       dot: 'bg-blue-400'   },
};

const SCORE_COLOR = (score) =>
  score >= 70 ? 'text-red-600 font-bold' :
  score >= 50 ? 'text-orange-500 font-semibold' :
                'text-blue-500';

export default function ScoreBadge({ aiScore, leadTemperature, aiReasoning }) {
  const [open, setOpen] = useState(false);
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

      {/* Hot / Warm / Cold pill + reasoning icon */}
      <div className="flex items-center gap-1">
        {style ? (
          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {leadTemperature}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 italic">pending</span>
        )}

        {/* ⓘ icon — only shown when reasoning exists */}
        {aiReasoning && (
          <div className="relative">
            <button
              onClick={() => setOpen(v => !v)}
              className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 text-[10px] font-bold flex items-center justify-center leading-none"
              title="AI reasoning"
            >
              i
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute left-5 top-0 z-20 w-52 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5">
                  <p className="text-[11px] text-gray-600 leading-snug">{aiReasoning}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
