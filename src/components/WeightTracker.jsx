import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as db from '../lib/supabaseDb';

const RANGES = [
  { key: '7', label: '7d', days: 7 },
  { key: '30', label: '30d', days: 30 },
  { key: '90', label: '90d', days: 90 },
  { key: 'all', label: 'All', days: null },
];

export default function WeightTracker() {
  const [entries, setEntries] = useState([]);
  const [range, setRange] = useState('30');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('');

  async function refresh() {
    try {
      setEntries(await db.getWeightEntries());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!weight) return;
    await db.addWeightEntry(date, weight);
    setWeight('');
    refresh();
  }

  async function handleDelete(id) {
    await db.deleteWeightEntry(id);
    refresh();
  }

  const filtered = useMemo(() => {
    const r = RANGES.find((r) => r.key === range);
    if (!r?.days) return entries;
    const cutoff = Date.now() - r.days * 86400000;
    return entries.filter((e) => new Date(e.date).getTime() >= cutoff);
  }, [entries, range]);

  const chartData = filtered.map((e) => ({
    date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    weight: e.weight_kg,
  }));

  const stats = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0].weight_kg;
    const last = filtered[filtered.length - 1].weight_kg;
    return { first, last, delta: last - first };
  }, [filtered]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Scale className="text-orange-500" size={22} />
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Weight Tracker</h1>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
      >
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-1 rounded-lg bg-orange-500 text-white font-semibold px-4 py-2.5 text-sm active:scale-95 transition"
        >
          <Plus size={16} /> Log Weight
        </button>
      </form>

      {entries.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    range === r.key
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {stats && (
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${
                  stats.delta <= 0 ? 'text-emerald-500' : 'text-orange-500'
                }`}
              >
                {stats.delta <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                {stats.delta > 0 ? '+' : ''}
                {stats.delta.toFixed(1)} kg
              </div>
            )}
          </div>

          {chartData.length > 1 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-neutral-400" />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} stroke="currentColor" className="text-neutral-400" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                  <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-neutral-400 py-8 text-center">Log at least 2 entries to see a trend chart.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {[...entries].reverse().map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
          >
            <span className="text-sm text-neutral-500">{new Date(e.date).toLocaleDateString()}</span>
            <span className="font-semibold text-neutral-900 dark:text-white">{e.weight_kg} kg</span>
            <button onClick={() => handleDelete(e.id)} className="text-neutral-300 hover:text-red-500 p-1">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-neutral-400">No weight entries logged yet.</p>}
      </div>
    </div>
  );
}
