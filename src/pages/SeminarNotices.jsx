// Seminar Notices — Digital Marketing posts seminars (name, mentor, host, date/time,
// meeting link). They appear on every employee's dashboard and archive themselves
// once the seminar has ended.
import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { SeminarCard, ArchiveTable } from '../components/SeminarNoticeBoard.jsx';

const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240];
const EMPTY = { title: '', mentorName: '', hostName: '', date: '', time: '', durationMinutes: 120, meetingLink: '' };

const pad = (n) => String(n).padStart(2, '0');
function toForm(s) {
  const d = new Date(s.startAt);
  return {
    title: s.title, mentorName: s.mentorName, hostName: s.hostName,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    durationMinutes: s.durationMinutes || 120, meetingLink: s.meetingLink
  };
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-navy mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-gray-400 mt-1 block">{hint}</span>}
    </label>
  );
}
const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold bg-white';

export default function SeminarNotices() {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [archived, setArchived] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      const [u, a] = await Promise.all([api.listSeminars('upcoming'), api.listSeminars('archived')]);
      setUpcoming(u.seminars || []);
      setArchived(a.seminars || []);
      setNow(Date.now());
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const resetForm = () => { setForm(EMPTY); setEditingId(null); };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    const startAt = new Date(`${form.date}T${form.time}`);
    if (Number.isNaN(startAt.getTime())) { setErr('Please pick a valid date and time'); return; }
    if (!editingId && startAt.getTime() + Number(form.durationMinutes) * 60000 <= Date.now()) {
      setErr('This date and time has already passed'); return;
    }
    const payload = {
      title: form.title, mentorName: form.mentorName, hostName: form.hostName,
      startAt: startAt.toISOString(), durationMinutes: Number(form.durationMinutes), meetingLink: form.meetingLink
    };
    setSaving(true);
    try {
      if (editingId) await api.updateSeminar(editingId, payload);
      else await api.createSeminar(payload);
      setMsg(editingId ? 'Seminar updated' : 'Seminar posted — it now shows on every dashboard');
      resetForm();
      load();
    } catch (e2) { setErr(e2.message); }
    finally { setSaving(false); }
  };

  const edit = (s) => { setEditingId(s._id); setForm(toForm(s)); setMsg(null); setErr(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async (s) => {
    if (!window.confirm(`Delete "${s.title}"?`)) return;
    try { await api.deleteSeminar(s._id); setMsg('Seminar deleted'); if (editingId === s._id) resetForm(); load(); }
    catch (e) { setErr(e.message); }
  };

  const cardActions = (s) => (
    <div className="flex items-center gap-1">
      <button onClick={() => edit(s)} title="Edit" className="p-1.5 rounded-lg text-royal hover:bg-[#f3f6ff]"><Pencil size={15} /></button>
      <button onClick={() => remove(s)} title="Delete" className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
    </div>
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-gold/20 flex items-center justify-center"><Megaphone size={22} className="text-navy" /></div>
        <div>
          <h1 className="text-2xl font-bold text-navy leading-tight">Seminar Notices</h1>
          <p className="text-sm text-gray-500">Posted seminars show on every employee's dashboard and move to the archive after they end.</p>
        </div>
      </div>

      {msg && <div className="mb-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{msg}</div>}
      {err && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={submit} className="lg:col-span-2 bg-white rounded-2xl shadow-soft p-5 space-y-4 h-fit lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy">{editingId ? 'Edit seminar' : 'New seminar'}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"><X size={14} /> Cancel edit</button>
            )}
          </div>
          <Field label="Seminar name *">
            <input className={inputCls} value={form.title} onChange={set('title')} required placeholder="e.g. Free Seminar on Data Science Career" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mentor name *">
              <input className={inputCls} value={form.mentorName} onChange={set('mentorName')} required />
            </Field>
            <Field label="Host name *">
              <input className={inputCls} value={form.hostName} onChange={set('hostName')} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *">
              <input type="date" className={inputCls} value={form.date} onChange={set('date')} required />
            </Field>
            <Field label="Start time *">
              <input type="time" className={inputCls} value={form.time} onChange={set('time')} required />
            </Field>
          </div>
          <Field label="Duration" hint="The notice moves to the archive when the seminar ends.">
            <select className={inputCls} value={form.durationMinutes} onChange={set('durationMinutes')}>
              {DURATIONS.map(m => <option key={m} value={m}>{m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? 's' : ''}`}</option>)}
            </select>
          </Field>
          <Field label="Meeting link *">
            <input className={inputCls} value={form.meetingLink} onChange={set('meetingLink')} required placeholder="https://meet.google.com/... or Zoom link" />
          </Field>
          <button type="submit" disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold text-navy font-bold hover:bg-lightgold disabled:opacity-50">
            {editingId ? <><Pencil size={16} /> {saving ? 'Saving…' : 'Save changes'}</> : <><Plus size={16} /> {saving ? 'Posting…' : 'Post seminar'}</>}
          </button>
        </form>

        {/* Lists */}
        <div className="lg:col-span-3">
          <div className="flex gap-2 mb-4">
            {[['upcoming', `Upcoming (${upcoming.length})`], ['archived', `Archive (${archived.length})`]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-xl border text-sm ${tab === k ? 'bg-gold text-navy border-gold font-semibold' : 'bg-white hover:bg-[#f3f6ff]'}`}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'upcoming' ? (
            upcoming.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-soft p-8 text-center text-gray-500 text-sm">No upcoming seminars. Post one with the form.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map(s => <SeminarCard key={s._id} s={s} now={now} actions={cardActions(s)} />)}
              </div>
            )
          ) : (
            <ArchiveTable seminars={archived} actions={(s) => (
              <button onClick={() => remove(s)} className="text-red-600 hover:underline text-xs">Delete</button>
            )} />
          )}
        </div>
      </div>
    </div>
  );
}
