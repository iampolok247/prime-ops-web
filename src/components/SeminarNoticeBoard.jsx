// Seminar notice board — shown at the top of every employee's dashboard.
// Upcoming / live seminars as cards; ended seminars move to the archive by themselves
// (the server decides by end time, and the board re-checks every minute).
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, GraduationCap, Mic, Clock, Video, Copy, Check, Archive, ChevronLeft, Settings2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const SEMINAR_MANAGE_ROLES = ['DigitalMarketing', 'Admin', 'SuperAdmin'];

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtFull = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

// "LIVE" while running; otherwise a friendly relative label + countdown
export function seminarStatus(s, now) {
  const start = new Date(s.startAt).getTime();
  const end = new Date(s.endAt).getTime();
  if (now >= end) return { kind: 'ended', label: 'Ended' };
  if (now >= start) return { kind: 'live', label: 'Live now' };
  const mins = Math.round((start - now) / 60000);
  const days = Math.round((startOfDay(start) - startOfDay(now)) / 86400000);
  let countdown;
  if (mins < 60) countdown = `in ${mins} min`;
  else if (mins < 24 * 60) countdown = `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  else countdown = null; // the day label (Tomorrow / Monday) already says it
  const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : new Date(s.startAt).toLocaleDateString('en-GB', { weekday: 'long' });
  return { kind: mins <= 60 ? 'soon' : days === 0 ? 'today' : 'later', label, countdown };
}

const CHIP = {
  live: 'bg-red-500 text-white',
  soon: 'bg-orange-100 text-orange-700',
  today: 'bg-gold/20 text-navy',
  later: 'bg-royal/10 text-royal',
  ended: 'bg-gray-100 text-gray-500'
};

function CopyLinkButton({ link, className = '' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy meeting link"
      onClick={async () => {
        try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
      }}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-royal hover:bg-[#f3f6ff] transition ${className}`}
    >
      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
    </button>
  );
}

export function SeminarCard({ s, now, actions }) {
  const st = seminarStatus(s, now);
  const start = new Date(s.startAt);
  const live = st.kind === 'live';
  return (
    <div className={`relative bg-white rounded-2xl border overflow-hidden flex transition hover:shadow-soft ${live ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'}`}>
      {/* Date block */}
      <div className={`w-20 shrink-0 flex flex-col items-center justify-center py-4 ${live ? 'bg-red-500 text-white' : 'bg-gradient-to-b from-gold to-lightgold text-navy'}`}>
        <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{start.toLocaleDateString('en-GB', { month: 'short' })}</div>
        <div className="text-3xl font-bold leading-none my-1">{start.getDate()}</div>
        <div className="text-[11px] font-medium opacity-80">{start.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
      </div>

      <div className="flex-1 min-w-0 p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${CHIP[st.kind]}`}>
            {live && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            {st.label}{st.countdown && <span className="font-medium opacity-80">· {st.countdown}</span>}
          </span>
          {actions}
        </div>
        <h3 className="font-bold text-navy leading-snug line-clamp-2" title={s.title}>{s.title}</h3>

        <div className="mt-2 space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2 min-w-0"><GraduationCap size={15} className="text-royal shrink-0" /><span className="text-gray-400">Mentor</span><span className="font-medium text-gray-800 truncate">{s.mentorName}</span></div>
          <div className="flex items-center gap-2 min-w-0"><Mic size={15} className="text-royal shrink-0" /><span className="text-gray-400">Host</span><span className="font-medium text-gray-800 truncate">{s.hostName}</span></div>
          <div className="flex items-center gap-2"><Clock size={15} className="text-royal shrink-0" />
            <span className="font-medium text-gray-800 whitespace-nowrap">{fmtTime(s.startAt)} – {fmtTime(s.endAt)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <a
            href={s.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-semibold transition ${live ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-navy hover:bg-royal text-white'}`}
          >
            <Video size={16} /> {live ? 'Join now' : 'Meeting link'}
          </a>
          <CopyLinkButton link={s.meetingLink} />
        </div>
      </div>
    </div>
  );
}

export default function SeminarNoticeBoard() {
  const { user } = useAuth();
  const canManage = SEMINAR_MANAGE_ROLES.includes(user?.role);
  const [view, setView] = useState('upcoming');
  const [seminars, setSeminars] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = async (v = view) => {
    try {
      const { seminars } = await api.listSeminars(v);
      setSeminars(seminars || []);
    } catch { /* the board is optional — never break the dashboard */ }
    finally { setLoaded(true); }
  };

  useEffect(() => { load(view); }, [view]); // eslint-disable-line
  // Tick every minute (countdowns), refetch every 5 minutes (new notices)
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60 * 1000);
    const refresh = setInterval(() => load(), 5 * 60 * 1000);
    return () => { clearInterval(tick); clearInterval(refresh); };
  }, [view]); // eslint-disable-line

  // Hide seminars that ended since the last fetch — they belong to the archive now
  const visible = useMemo(
    () => (view === 'upcoming' ? seminars.filter(s => new Date(s.endAt).getTime() > now) : seminars),
    [seminars, view, now]
  );

  if (!loaded) return null;

  return (
    <section className="mb-6 rounded-2xl overflow-hidden shadow-soft bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy via-royal to-navy px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
            <Megaphone size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Seminar Notice</h2>
            <p className="text-white/60 text-xs">
              {view === 'upcoming'
                ? (visible.length ? `${visible.length} upcoming seminar${visible.length > 1 ? 's' : ''}` : 'No upcoming seminars')
                : 'Past seminars'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === 'upcoming' ? (
            <button onClick={() => setView('archived')} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10">
              <Archive size={14} /> Archive
            </button>
          ) : (
            <button onClick={() => setView('upcoming')} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10">
              <ChevronLeft size={14} /> Upcoming
            </button>
          )}
          {canManage && (
            <Link to="/seminars" className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-gold hover:bg-lightgold px-3 py-1.5 rounded-lg">
              <Settings2 size={14} /> Manage
            </Link>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 bg-[#f7f9ff]">
        {view === 'upcoming' ? (
          visible.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">
              No seminar is scheduled right now.{canManage && <> <Link to="/seminars" className="text-royal font-medium underline">Post one</Link></>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map(s => <SeminarCard key={s._id} s={s} now={now} />)}
            </div>
          )
        ) : (
          <ArchiveTable seminars={visible} />
        )}
      </div>
    </section>
  );
}

export function ArchiveTable({ seminars, actions }) {
  if (!seminars.length) return <div className="text-center py-6 text-sm text-gray-500">No past seminars yet.</div>;
  return (
    <div className="overflow-auto rounded-xl border border-gray-100 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-[#f3f6ff] text-royal">
          <tr>
            <th className="text-left p-3">Date & Time</th>
            <th className="text-left p-3">Seminar</th>
            <th className="text-left p-3">Mentor</th>
            <th className="text-left p-3">Host</th>
            <th className="text-left p-3">Link</th>
            {actions && <th className="text-left p-3">Action</th>}
          </tr>
        </thead>
        <tbody>
          {seminars.map(s => (
            <tr key={s._id} className="border-t text-gray-600">
              <td className="p-3 whitespace-nowrap">{fmtFull(s.startAt)}</td>
              <td className="p-3 font-medium text-gray-800">{s.title}</td>
              <td className="p-3">{s.mentorName}</td>
              <td className="p-3">{s.hostName}</td>
              <td className="p-3"><a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="text-royal hover:underline">Open</a></td>
              {actions && <td className="p-3">{actions(s)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
