// Local-only data layer. Same shape as the eventual Supabase tables
// (workout_plans, exercises, workout_logs) so swapping this out for
// real Supabase calls later is a drop-in replacement — see
// src/supabaseClient.js + schema.sql for the DB version.

const KEYS = {
  plans: 'gym-tracker:plans',
  exercises: 'gym-tracker:exercises',
  logs: 'gym-tracker:logs',
};

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// ---------------- Plans ----------------
export function getPlans() {
  return read(KEYS.plans).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function createPlan(title) {
  const plan = { id: uid(), title, created_at: new Date().toISOString() };
  const plans = read(KEYS.plans);
  plans.push(plan);
  write(KEYS.plans, plans);
  return plan;
}

export function deletePlan(id) {
  write(KEYS.plans, read(KEYS.plans).filter((p) => p.id !== id));
  // cascade delete exercises + their logs
  const remainingExercises = read(KEYS.exercises).filter((e) => e.plan_id !== id);
  const deletedExerciseIds = read(KEYS.exercises)
    .filter((e) => e.plan_id === id)
    .map((e) => e.id);
  write(KEYS.exercises, remainingExercises);
  write(
    KEYS.logs,
    read(KEYS.logs).filter((l) => !deletedExerciseIds.includes(l.exercise_id))
  );
}

// ---------------- Exercises ----------------
export function getExercises(planId) {
  return read(KEYS.exercises)
    .filter((e) => e.plan_id === planId)
    .sort((a, b) => a.order_index - b.order_index);
}

export function createExercise(planId, name, targetSets = 3) {
  const exercises = read(KEYS.exercises);
  const exercise = {
    id: uid(),
    plan_id: planId,
    name,
    target_sets: targetSets,
    order_index: exercises.filter((e) => e.plan_id === planId).length,
    created_at: new Date().toISOString(),
  };
  exercises.push(exercise);
  write(KEYS.exercises, exercises);
  return exercise;
}

export function deleteExercise(id) {
  write(KEYS.exercises, read(KEYS.exercises).filter((e) => e.id !== id));
  write(KEYS.logs, read(KEYS.logs).filter((l) => l.exercise_id !== id));
}

export function updateExercise(id, patch) {
  const exercises = read(KEYS.exercises);
  const idx = exercises.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  exercises[idx] = { ...exercises[idx], ...patch };
  write(KEYS.exercises, exercises);
  return exercises[idx];
}

export function addSetToExercise(id) {
  const exercises = read(KEYS.exercises);
  const idx = exercises.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  exercises[idx] = { ...exercises[idx], target_sets: exercises[idx].target_sets + 1 };
  write(KEYS.exercises, exercises);
  return exercises[idx];
}

export function removeSetFromExercise(id) {
  const exercises = read(KEYS.exercises);
  const idx = exercises.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const newCount = Math.max(1, exercises[idx].target_sets - 1);
  exercises[idx] = { ...exercises[idx], target_sets: newCount };
  write(KEYS.exercises, exercises);
  // drop any logged set beyond the new count
  write(
    KEYS.logs,
    read(KEYS.logs).filter((l) => !(l.exercise_id === id && l.set_number > newCount))
  );
  return exercises[idx];
}

// ---------------- Logs ----------------
export function getLogsForExercises(exerciseIds) {
  return read(KEYS.logs).filter((l) => exerciseIds.includes(l.exercise_id));
}

export function upsertLog(payload) {
  const logs = read(KEYS.logs);
  const idx = logs.findIndex(
    (l) => l.exercise_id === payload.exercise_id && l.set_number === payload.set_number
  );
  if (idx >= 0) {
    logs[idx] = { ...logs[idx], ...payload };
  } else {
    logs.push({ id: uid(), ...payload });
  }
  write(KEYS.logs, logs);
  return payload;
}

// ==================================================================
// Body weight log
// ==================================================================
KEYS.bodyWeight = 'gym-tracker:body-weight';

export function getWeightEntries() {
  return read(KEYS.bodyWeight).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function addWeightEntry(date, weightKg) {
  const entries = read(KEYS.bodyWeight);
  const idx = entries.findIndex((e) => e.date === date);
  const entry = { id: idx >= 0 ? entries[idx].id : uid(), date, weight_kg: Number(weightKg) };
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  write(KEYS.bodyWeight, entries);
  return entry;
}

export function deleteWeightEntry(id) {
  write(KEYS.bodyWeight, read(KEYS.bodyWeight).filter((e) => e.id !== id));
}

// ==================================================================
// Body measurements log
// ==================================================================
KEYS.measurements = 'gym-tracker:measurements';

export function getMeasurementEntries() {
  return read(KEYS.measurements).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function addMeasurementEntry(date, fields) {
  // fields: { chest_cm, waist_cm, hips_cm, biceps_cm, thigh_cm }
  const entries = read(KEYS.measurements);
  const idx = entries.findIndex((e) => e.date === date);
  const entry = { id: idx >= 0 ? entries[idx].id : uid(), date, ...fields };
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  write(KEYS.measurements, entries);
  return entry;
}

export function deleteMeasurementEntry(id) {
  write(KEYS.measurements, read(KEYS.measurements).filter((e) => e.id !== id));
}

// ==================================================================
// Calorie / food log
// ==================================================================
KEYS.calorieProfile = 'gym-tracker:calorie-profile';
KEYS.calorieEntries = 'gym-tracker:calorie-entries';

export function getCalorieProfile() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.calorieProfile)) || null;
  } catch {
    return null;
  }
}

export function saveCalorieProfile(profile) {
  localStorage.setItem(KEYS.calorieProfile, JSON.stringify(profile));
  return profile;
}

export function getCalorieEntries(date) {
  const all = read(KEYS.calorieEntries);
  return date ? all.filter((e) => e.date === date) : all;
}

export function addCalorieEntry(date, name, calories, protein = 0) {
  const entries = read(KEYS.calorieEntries);
  const entry = { id: uid(), date, name, calories: Number(calories), protein: Number(protein) };
  entries.push(entry);
  write(KEYS.calorieEntries, entries);
  return entry;
}

export function deleteCalorieEntry(id) {
  write(KEYS.calorieEntries, read(KEYS.calorieEntries).filter((e) => e.id !== id));
}
