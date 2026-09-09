import { useEffect, useState } from 'react';
import { Flame, Plus, Trash2 } from 'lucide-react';
import * as db from '../lib/supabaseDb';
import { ACTIVITY_MULTIPLIERS, GOALS, calculateBMR, calculateTDEE, calculateGoalCalories } from '../lib/calorieMath';

const DEFAULT_PROFILE = { sex: 'male', age: '', heightCm: '', weightKg: '', activity: 'moderate', goal: 'maintain' };

export default function CalorieCalculator() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState([]);
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const saved = await db.getCalorieProfile();
        if (saved) setProfile(saved);
        setEntries(await db.getCalorieEntries(today));
      } catch (err) {
        console.error(err);
      }
    })();
  }, [today]);

  async function updateProfile(patch) {
    const next = { ...profile, ...patch };
    setProfile(next);
    try {
      await db.saveCalorieProfile(next);
    } catch (err) {
      console.error(err);
    }
  }

  const canCalculate = profile.age && profile.heightCm && profile.weightKg;
  const bmr = canCalculate
    ? calculateBMR({ sex: profile.sex, weightKg: Number(profile.weightKg), heightCm: Number(profile.heightCm), age: Number(profile.age) })
    : null;
  const tdee = bmr ? calculateTDEE(bmr, profile.activity) : null;
  const goalCalories = tdee ? calculateGoalCalories(tdee, profile.goal) : null;

  const consumedToday = entries.reduce((sum, e) => sum + e.calories, 0);
  const proteinToday = entries.reduce((sum, e) => sum + (e.protein || 0), 0);
  const remaining = goalCalories != null ? goalCalories - consumedToday : null;

  async function handleAddFood(e) {
    e.preventDefault();
    if (!foodName || !foodCalories) return;
    await db.addCalorieEntry(today, foodName, foodCalories, foodProtein || 0);
    setFoodName('');
    setFoodCalories('');
    setFoodProtein('');
    setEntries(await db.getCalorieEntries(today));
  }

  async function handleDeleteFood(id) {
    await db.deleteCalorieEntry(id);
    setEntries(await db.getCalorieEntries(today));
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Flame className="text-orange-500" size={22} />
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Calorie Calculator</h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-500">Your details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Sex</label>
            <select
              value={profile.sex}
              onChange={(e) => updateProfile({ sex: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Age</label>
            <input type="number" value={profile.age} onChange={(e) => updateProfile({ age: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Height (cm)</label>
            <input type="number" value={profile.heightCm} onChange={(e) => updateProfile({ heightCm: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Weight (kg)</label>
            <input type="number" value={profile.weightKg} onChange={(e) => updateProfile({ weightKg: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Activity level</label>
            <select
              value={profile.activity}
              onChange={(e) => updateProfile({ activity: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {ACTIVITY_MULTIPLIERS.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Goal</label>
            <select
              value={profile.goal}
              onChange={(e) => updateProfile({ goal: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {GOALS.map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {goalCalories != null && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-center">
            <p className="text-xs text-neutral-400">BMR</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-white">{bmr}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-center">
            <p className="text-xs text-neutral-400">TDEE</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-white">{tdee}</p>
          </div>
          <div className="rounded-2xl border border-orange-500 bg-orange-50 dark:bg-orange-500/10 p-4 text-center">
            <p className="text-xs text-orange-500 font-medium">Daily goal</p>
            <p className="text-xl font-bold text-orange-500">{goalCalories}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-500">Today's intake</h2>
          {goalCalories != null && (
            <span className={`text-sm font-semibold ${remaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {remaining >= 0 ? `${remaining} kcal left` : `${Math.abs(remaining)} kcal over`}
            </span>
          )}
        </div>

        <form onSubmit={handleAddFood} className="flex flex-col sm:flex-row gap-2">
          <input type="text" placeholder="Food / meal" value={foodName} onChange={(e) => setFoodName(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <input type="number" placeholder="kcal" value={foodCalories} onChange={(e) => setFoodCalories(e.target.value)}
            className="w-24 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <input type="number" placeholder="protein g" value={foodProtein} onChange={(e) => setFoodProtein(e.target.value)}
            className="w-24 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button type="submit" className="flex items-center justify-center gap-1 rounded-lg bg-orange-500 text-white font-semibold px-4 py-2.5 text-sm active:scale-95 transition">
            <Plus size={16} />
          </button>
        </form>

        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">{e.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-neutral-500">{e.calories} kcal</span>
                {e.protein > 0 && <span className="text-neutral-400 text-xs">{e.protein}g protein</span>}
                <button onClick={() => handleDeleteFood(e.id)} className="text-neutral-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-neutral-400">Nothing logged today yet.</p>}
        </div>

        {entries.length > 0 && (
          <div className="flex justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-sm font-semibold">
            <span className="text-neutral-900 dark:text-white">Total: {consumedToday} kcal</span>
            <span className="text-neutral-500">{proteinToday}g protein</span>
          </div>
        )}
      </div>
    </div>
  );
}
