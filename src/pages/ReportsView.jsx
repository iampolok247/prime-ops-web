// web/src/pages/ReportsView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api, fmtBDT } from '../lib/api.js';

function todayISO() { return new Date().toISOString().slice(0,10); }
function firstOfMonthISO() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
}

// quick CSV maker
function toCSV(rows) {
  const head = Object.keys(rows[0] || {});
  const lines = [
    head.join(','),
    ...rows.map(r => head.map(h => JSON.stringify(r[h] ?? '')).join(','))
  ];
  return lines.join('\n');
}

export default function ReportsView() {
  const [from, setFrom] = useState(firstOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.reportsOverview(from, to);
      setData(res);
      setErr('');
    } catch (e) {
      setErr(e.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* on mount */ }, []);
  const onApply = (e) => { e.preventDefault(); load(); };

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { title: 'Accounting — Income', val: data.accounting.income },
      { title: 'Accounting — Expense', val: data.accounting.expense },
      { title: 'Accounting — Net', val: data.accounting.net },
      { title: 'Admission — Collected', val: data.admission.collected },
      { title: 'Recruitment — Income', val: data.recruitment.income },
      { title: 'Recruitment — Expense', val: data.recruitment.expense },
      { title: 'Recruitment — Net', val: data.recruitment.net },
      { title: 'Digital Marketing — Cost', val: data.dm.cost },
      { title: 'Combined — Income', val: data.combined.income },
      { title: 'Combined — Expense', val: data.combined.expense },
      { title: 'Combined — Net', val: data.combined.net }
    ];
  }, [data]);

  const csvBlobUrl = useMemo(() => {
    if (!data) return '';
    const rows = [
      { Section: 'Accounting', Metric: 'Income', Amount: data.accounting.income },
      { Section: 'Accounting', Metric: 'Expense', Amount: data.accounting.expense },
      { Section: 'Accounting', Metric: 'Net', Amount: data.accounting.net },
      { Section: 'Admission', Metric: 'Collected', Amount: data.admission.collected },
      { Section: 'Recruitment', Metric: 'Income', Amount: data.recruitment.income },
      { Section: 'Recruitment', Metric: 'Expense', Amount: data.recruitment.expense },
      { Section: 'Recruitment', Metric: 'Net', Amount: data.recruitment.net },
      { Section: 'Digital Marketing', Metric: 'Cost', Amount: data.dm.cost },
      { Section: 'Combined', Metric: 'Income', Amount: data.combined.income },
      { Section: 'Combined', Metric: 'Expense', Amount: data.combined.expense },
      { Section: 'Combined', Metric: 'Net', Amount: data.combined.net }
    ];
    const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8;' });
    return URL.createObjectURL(blob);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Consolidated Reports</h1>
        <form onSubmit={onApply} className="flex items-center gap-2">
          <input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)} />
          <span className="text-royal">to</span>
          <input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)} />
          <button className="btn btn-primary">Apply</button>
          {csvBlobUrl && (
            <a className="btn" href={csvBlobUrl} download={`reports_${from}_to_${to}.csv`}>Export CSV</a>
          )}
        </form>
      </div>

      {err && <div className="text-red-600">{err}</div>}
      {loading && <div>Loading…</div>}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {cards.map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-royal text-sm">{c.title}</div>
                <div className={`text-2xl font-extrabold ${c.title.includes('Net') ? (c.val >= 0 ? 'text-green-600' : 'text-red-600') : 'text-navy'}`}>
                  {fmtBDT(c.val)}
                </div>
              </div>
            ))}
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="font-semibold text-navy mb-2">Summary</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-royal">
                    <th className="py-2">Section</th>
                    <th>Metric</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <Row s="Accounting" m="Income" a={data.accounting.income} />
                  <Row s="Accounting" m="Expense" a={data.accounting.expense} />
                  <Row s="Accounting" m="Net" a={data.accounting.net} />
                  <Row s="Admission" m="Collected" a={data.admission.collected} />
                  <Row s="Recruitment" m="Income" a={data.recruitment.income} />
                  <Row s="Recruitment" m="Expense" a={data.recruitment.expense} />
                  <Row s="Recruitment" m="Net" a={data.recruitment.net} />
                  <Row s="Digital Marketing" m="Cost" a={data.dm.cost} />
                  <Row s="Combined" m="Income" a={data.combined.income} />
                  <Row s="Combined" m="Expense" a={data.combined.expense} />
                  <Row s="Combined" m="Net" a={data.combined.net} />
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ s, m, a }) {
  return (
    <tr className="border-t">
      <td className="py-2">{s}</td>
      <td>{m}</td>
      <td className="font-semibold">{fmtBDT(a)}</td>
    </tr>
  );
}
