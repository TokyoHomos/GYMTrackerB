import { useEffect, useState } from 'react';
import { Plus, Dumbbell, Trash2, ChevronRight } from 'lucide-react';
import * as db from '../lib/supabaseDb';
import { supabase } from '../supabaseClient';

export default function PlanList({ selectedPlanId, onSelectPlan }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setPlans(await db.getPlans());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // Realtime: reflect changes made from another device instantly
    const channel = supabase
      .channel('workout_plans_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_plans' }, refresh)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function createPlan() {
    const title = window.prompt('Plan name (e.g. "Push Day")');
    if (!title) return;
    await db.createPlan(title);
    refresh();
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this plan and all its exercises/logs?')) return;
    await db.deletePlan(id);
    refresh();
    if (selectedPlanId === id) onSelectPlan(null);
  }

  return (
    <div className="p-4 md:p-0 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-neutral-900 dark:text-white">Your Plans</h2>
        <button
          onClick={createPlan}
          className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600"
        >
          <Plus size={16} /> New
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-400">Loading plans…</p>}
      {!loading && plans.length === 0 && (
        <p className="text-sm text-neutral-400">No plans yet. Create your first workout split.</p>
      )}

      {plans.map((plan) => (
        <button
          key={plan.id}
          onClick={() => onSelectPlan(plan)}
          className={`w-full flex items-center gap-3 text-left rounded-2xl border p-4 transition ${
            selectedPlanId === plan.id
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-orange-300'
          }`}
        >
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Dumbbell size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-neutral-900 dark:text-white truncate">{plan.title}</p>
            <p className="text-xs text-neutral-400">
              {new Date(plan.created_at).toLocaleDateString()}
            </p>
          </div>
          <Trash2
            size={16}
            className="text-neutral-300 hover:text-red-500 shrink-0"
            onClick={(e) => handleDelete(plan.id, e)}
          />
          <ChevronRight size={16} className="text-neutral-300 shrink-0 hidden md:block" />
        </button>
      ))}
    </div>
  );
}
