import { useEffect, useState, useCallback } from 'react';
import { Check, Plus, Minus, Trash2, ChevronLeft } from 'lucide-react';
import * as db from '../lib/supabaseDb';
import { supabase } from '../supabaseClient';
import RestTimer from './RestTimer';

export default function WorkoutSession({ plan, onBack }) {
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const exData = await db.getExercises(plan.id);
      setExercises(exData);
      const exerciseIds = exData.map((e) => e.id);
      const logData = await db.getLogsForExercises(exerciseIds);
      const grouped = {};
      logData.forEach((log) => {
        grouped[log.exercise_id] = grouped[log.exercise_id] || [];
        grouped[log.exercise_id].push(log);
      });
      setLogs(grouped);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [plan.id]);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel(`workout_logs_${plan.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_logs' }, () => loadData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [plan.id, loadData]);

  function getSetsForExercise(exercise) {
    const existing = logs[exercise.id] || [];
    const rows = [];
    for (let i = 1; i <= exercise.target_sets; i++) {
      const found = existing.find((l) => l.set_number === i);
      rows.push(
        found || {
          exercise_id: exercise.id,
          set_number: i,
          weight_kg: '',
          reps: '',
          completed: false,
        }
      );
    }
    return rows;
  }

  function updateLocalSet(exerciseId, setNumber, field, value) {
    setLogs((prev) => {
      const rows = prev[exerciseId] ? [...prev[exerciseId]] : [];
      const idx = rows.findIndex((r) => r.set_number === setNumber);
      const base =
        idx >= 0 ? rows[idx] : { exercise_id: exerciseId, set_number: setNumber, weight_kg: '', reps: '', completed: false };
      const updated = { ...base, [field]: value };
      if (idx >= 0) rows[idx] = updated;
      else rows.push(updated);
      return { ...prev, [exerciseId]: rows };
    });
  }

  async function toggleComplete(exercise, row) {
    const nextCompleted = !row.completed;
    updateLocalSet(exercise.id, row.set_number, 'completed', nextCompleted);
    try {
      await db.upsertLog({
        exercise_id: exercise.id,
        set_number: row.set_number,
        weight_kg: row.weight_kg === '' ? 0 : Number(row.weight_kg),
        reps: row.reps === '' ? 0 : Number(row.reps),
        completed: nextCompleted,
        logged_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
    }
    if (nextCompleted) setActiveTimer(90);
  }

  async function addExercise() {
    const name = window.prompt('Exercise name (e.g. "Incline Dumbbell Press")');
    if (!name) return;
    await db.createExercise(plan.id, name, 3);
    loadData();
  }

  async function deleteExercise(exerciseId) {
    if (!window.confirm('Remove this exercise from the plan?')) return;
    await db.deleteExercise(exerciseId);
    loadData();
  }

  async function addSet(exerciseId) {
    await db.addSetToExercise(exerciseId);
    loadData();
  }

  async function removeSet(exerciseId) {
    await db.removeSetFromExercise(exerciseId);
    loadData();
  }

  const totalSets = exercises.reduce((sum, e) => sum + e.target_sets, 0);
  const completedSets = exercises.reduce(
    (sum, e) => sum + (logs[e.id] || []).filter((l) => l.completed).length,
    0
  );

  return (
    <div className="flex flex-col md:flex-row h-full gap-0 md:gap-6">
      <div className="flex-1 min-w-0 overflow-y-auto pb-40 md:pb-6">
        <div className="sticky top-0 z-10 bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur px-4 py-3 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 md:static md:bg-transparent md:border-0 md:px-0">
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800"
            aria-label="Back to plans"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-neutral-900 dark:text-white">{plan.title}</h1>
            <p className="text-xs md:text-sm text-neutral-500">
              {completedSets}/{totalSets} sets completed
            </p>
          </div>
        </div>

        <div className="px-4 md:px-0 pt-4 space-y-4">
          {loading && <p className="text-neutral-400 text-sm">Loading exercises…</p>}
          {!loading && exercises.length === 0 && (
            <p className="text-neutral-400 text-sm">No exercises yet — add your first one below.</p>
          )}

          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-neutral-900 dark:text-white">{exercise.name}</h2>
                <button
                  onClick={() => deleteExercise(exercise.id)}
                  className="text-neutral-400 hover:text-red-500 p-1"
                  aria-label={`Delete ${exercise.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 text-xs text-neutral-400 px-1">
                  <span>Set</span>
                  <span>Weight (kg)</span>
                  <span>Reps</span>
                  <span />
                </div>
                {getSetsForExercise(exercise).map((row) => (
                  <div
                    key={row.set_number}
                    className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 items-center"
                  >
                    <span className="text-sm font-medium text-neutral-500">{row.set_number}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.weight_kg}
                      onChange={(e) => updateLocalSet(exercise.id, row.set_number, 'weight_kg', e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={row.reps}
                      onChange={(e) => updateLocalSet(exercise.id, row.set_number, 'reps', e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => toggleComplete(exercise, row)}
                      aria-label={`Mark set ${row.set_number} complete`}
                      className={`h-11 w-11 rounded-xl flex items-center justify-center transition active:scale-90 ${
                        row.completed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      <Check size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => addSet(exercise.id)}
                  className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 px-2 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10"
                >
                  <Plus size={14} /> Add Set
                </button>
                {exercise.target_sets > 1 && (
                  <button
                    onClick={() => removeSet(exercise.id)}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Minus size={14} /> Remove Set
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={addExercise}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 font-medium hover:border-orange-500 hover:text-orange-500 transition"
          >
            <Plus size={18} /> Add Exercise
          </button>
        </div>
      </div>

      <div className="hidden md:block w-80 shrink-0">
        <div className="sticky top-0 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Session Progress</h3>
          <div className="h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden mb-2">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: totalSets ? `${(completedSets / totalSets) * 100}%` : '0%' }}
            />
          </div>
          <p className="text-sm text-neutral-500">
            {completedSets} of {totalSets} sets logged
          </p>
          <div className="mt-6 space-y-3">
            {exercises.map((e) => {
              const done = (logs[e.id] || []).filter((l) => l.completed).length;
              return (
                <div key={e.id} className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-300">{e.name}</span>
                  <span className="text-neutral-400">
                    {done}/{e.target_sets}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {activeTimer !== null && (
        <RestTimer
          duration={activeTimer}
          onComplete={() => {}}
          onClose={() => setActiveTimer(null)}
        />
      )}
    </div>
  );
}
