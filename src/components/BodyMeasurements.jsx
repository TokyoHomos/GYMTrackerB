import { useEffect, useState } from 'react';
import { Plus, Trash2, Ruler } from 'lucide-react';
import * as db from '../lib/supabaseDb';

const FIELDS = [
  { key: 'chest_cm', label: 'Chest' },
  { key: 'waist_cm', label: 'Waist' },
  { key: 'hips_cm', label: 'Hips' },
  { key: 'biceps_cm', label: 'Biceps' },
  { key: 'thigh_cm', label: 'Thigh' },
];

export default function BodyMeasurements() {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({});

  async function refresh() {
    try {
      setEntries(await db.getMeasurementEntries());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const hasValue = FIELDS.some((f) => form[f.key]);
    if (!hasValue) return;
    const numericFields = {};
    FIELDS.forEach((f) => {
      if (form[f.key]) numericFields[f.key] = Number(form[f.key]);
    });
    await db.addMeasurementEntry(date, numericFields);
    setForm({});
    refresh();
  }

  async function handleDelete(id) {
    await db.deleteMeasurementEntry(id);
    refresh();
  }

  const latest = entries[entries.length - 1];
  const previous = entries[entries.length - 2];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Ruler className="text-orange-500" size={22} />
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Body Measurements</h1>
      </div>

      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3"
      >
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-neutral-400 mb-1 block">{f.label} (cm)</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={form[f.key] || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder="0"
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto flex items-center justify-center gap-1 rounded-lg bg-orange-500 text-white font-semibold px-4 py-2.5 text-sm active:scale-95 transition"
        >
          <Plus size={16} /> Log Measurements
        </button>
      </form>

      {latest && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <h3 className="text-sm font-semibold text-neutral-500 mb-3">Latest ({new Date(latest.date).toLocaleDateString()})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {FIELDS.map((f) => {
              const val = latest[f.key];
              const prevVal = previous?.[f.key];
              const delta = val != null && prevVal != null ? val - prevVal : null;
              return (
                <div key={f.key} className="text-center">
                  <p className="text-xs text-neutral-400">{f.label}</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">{val ?? '—'}</p>
                  {delta != null && (
                    <p className={`text-xs font-medium ${delta <= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {delta > 0 ? '+' : ''}
                      {delta.toFixed(1)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {[...entries].reverse().map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-sm"
          >
            <span className="text-neutral-500 shrink-0">{new Date(e.date).toLocaleDateString()}</span>
            <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1 text-neutral-700 dark:text-neutral-300 text-xs">
              {FIELDS.filter((f) => e[f.key] != null).map((f) => (
                <span key={f.key}>
                  {f.label}: <strong>{e[f.key]}</strong>
                </span>
              ))}
            </div>
            <button onClick={() => handleDelete(e.id)} className="text-neutral-300 hover:text-red-500 p-1 shrink-0">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-neutral-400">No measurements logged yet.</p>}
      </div>
    </div>
  );
}
