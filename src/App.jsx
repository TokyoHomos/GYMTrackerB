import { useEffect, useState } from 'react';
import { Dumbbell, Moon, Sun, LayoutList, Scale, Ruler, Flame, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';
import AuthPage from './components/AuthPage';
import PlanList from './components/PlanList';
import WorkoutSession from './components/WorkoutSession';
import WeightTracker from './components/WeightTracker';
import BodyMeasurements from './components/BodyMeasurements';
import CalorieCalculator from './components/CalorieCalculator';

const TABS = [
  { key: 'plans', label: 'Plans', icon: LayoutList },
  { key: 'weight', label: 'Weight', icon: Scale },
  { key: 'measurements', label: 'Body', icon: Ruler },
  { key: 'calories', label: 'Calories', icon: Flame },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState('plans');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('gym-tracker-theme') === 'dark'
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('gym-tracker-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  function goToTab(key) {
    setTab(key);
    if (key !== 'plans') setSelectedPlan(null);
  }

  function renderMain() {
    if (tab === 'weight') return <WeightTracker />;
    if (tab === 'measurements') return <BodyMeasurements />;
    if (tab === 'calories') return <CalorieCalculator />;
    return selectedPlan ? (
      <WorkoutSession plan={selectedPlan} onBack={() => setSelectedPlan(null)} />
    ) : (
      <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
        Select a plan to start a session
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Dumbbell className="animate-pulse text-orange-500" size={32} />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <div className="h-screen flex flex-col md:flex-row bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white overflow-hidden">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 p-5">
        <div className="flex items-center gap-2 mb-8">
          <Dumbbell className="text-orange-500" size={24} />
          <span className="font-bold text-lg">Gym Tracker</span>
        </div>

        <nav className="flex-1 space-y-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => goToTab(key)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium ${
                tab === key
                  ? 'bg-orange-500/10 text-orange-500'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>

        <div className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />} {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Dumbbell className="text-orange-500" size={22} />
          <span className="font-bold">Gym Tracker</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDarkMode((d) => !d)} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0 overflow-hidden">
        <div className="hidden md:flex h-full">
          {tab === 'plans' ? (
            <>
              <div className="w-96 shrink-0 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto p-6">
                <PlanList selectedPlanId={selectedPlan?.id} onSelectPlan={setSelectedPlan} />
              </div>
              <div className="flex-1 min-w-0 overflow-y-auto p-6">{renderMain()}</div>
            </>
          ) : (
            <div className="flex-1 min-w-0 overflow-y-auto">{renderMain()}</div>
          )}
        </div>

        <div className="md:hidden h-full overflow-y-auto pb-16">
          {tab === 'plans' ? (
            selectedPlan ? (
              <WorkoutSession plan={selectedPlan} onBack={() => setSelectedPlan(null)} />
            ) : (
              <PlanList selectedPlanId={null} onSelectPlan={setSelectedPlan} />
            )
          ) : (
            renderMain()
          )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => goToTab(key)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium ${
              tab === key ? 'text-orange-500' : 'text-neutral-400'
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
