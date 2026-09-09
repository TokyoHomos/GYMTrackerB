import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Plus, X, Timer } from 'lucide-react';

/**
 * Floating rest timer.
 * - Desktop/tablet (md+): fixed pill/card, bottom-right.
 * - Mobile: sticky drawer pinned to the bottom of the viewport, full width,
 *   so it's always within thumb reach during a set.
 *
 * Props:
 *   duration   - initial seconds (default 90)
 *   onComplete - callback fired when timer hits 0
 *   onClose    - callback to dismiss the timer
 */
export default function RestTimer({ duration = 90, onComplete, onClose }) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    setSecondsLeft(duration);
    setRunning(true);
  }, [duration]);

  useEffect(() => {
    if (!running) return undefined;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          fireCompletionCue();
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, onComplete]);

  function fireCompletionCue() {
    // Vibration cue (mobile / PWA)
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    // Audio cue (works on both mobile & desktop)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      /* AudioContext unsupported — vibration cue still fires */
    }
  }

  const addThirty = () => setSecondsLeft((s) => s + 30);
  const toggleRunning = () => setRunning((r) => !r);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const pct = Math.max(0, Math.min(100, (secondsLeft / duration) * 100));
  const isDone = secondsLeft === 0;

  return (
    <div
      className="
        fixed z-50
        left-0 right-0 bottom-0
        md:left-auto md:right-6 md:bottom-6 md:w-80
        px-4 pb-[env(safe-area-inset-bottom)] md:px-0 md:pb-0
      "
    >
      <div
        className={`
          rounded-t-2xl md:rounded-2xl shadow-2xl border
          bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700
          p-4 md:p-5
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm font-medium">
            <Timer size={16} />
            Rest Timer
          </div>
          <button
            aria-label="Close rest timer"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`text-4xl md:text-5xl font-bold tabular-nums tracking-tight ${
              isDone ? 'text-emerald-500' : 'text-neutral-900 dark:text-white'
            }`}
          >
            {mm}:{ss}
          </div>

          <div className="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={addThirty}
            className="flex items-center justify-center gap-1 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-semibold text-sm active:scale-95 transition"
          >
            <Plus size={16} /> 30s
          </button>
          <button
            onClick={toggleRunning}
            className="flex items-center justify-center gap-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm active:scale-95 transition"
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-semibold text-sm active:scale-95 transition"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
