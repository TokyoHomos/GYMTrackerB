import { supabase } from '../supabaseClient';

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) throw new Error('Not signed in');
  return data.user.id;
}

// ==================================================================
// Plans
// ==================================================================
export async function getPlans() {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPlan(title) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('workout_plans')
    .insert({ title, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlan(id) {
  const { error } = await supabase.from('workout_plans').delete().eq('id', id);
  if (error) throw error;
}

// ==================================================================
// Exercises
// ==================================================================
export async function getExercises(planId) {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('plan_id', planId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createExercise(planId, name, targetSets = 3) {
  const existing = await getExercises(planId);
  const { data, error } = await supabase
    .from('exercises')
    .insert({ plan_id: planId, name, target_sets: targetSets, order_index: existing.length })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExercise(id) {
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function updateExercise(id, patch) {
  const { data, error } = await supabase.from('exercises').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function addSetToExercise(id) {
  const { data: current, error: readErr } = await supabase
    .from('exercises')
    .select('target_sets')
    .eq('id', id)
    .single();
  if (readErr) throw readErr;
  return updateExercise(id, { target_sets: current.target_sets + 1 });
}

export async function removeSetFromExercise(id) {
  const { data: current, error: readErr } = await supabase
    .from('exercises')
    .select('target_sets')
    .eq('id', id)
    .single();
  if (readErr) throw readErr;
  const newCount = Math.max(1, current.target_sets - 1);
  const updated = await updateExercise(id, { target_sets: newCount });
  await supabase.from('workout_logs').delete().eq('exercise_id', id).gt('set_number', newCount);
  return updated;
}

// ==================================================================
// Logs
// ==================================================================
export async function getLogsForExercises(exerciseIds) {
  if (!exerciseIds.length) return [];
  const { data, error } = await supabase.from('workout_logs').select('*').in('exercise_id', exerciseIds);
  if (error) throw error;
  return data;
}

export async function upsertLog(payload) {
  const { data, error } = await supabase
    .from('workout_logs')
    .upsert(payload, { onConflict: 'exercise_id,set_number' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ==================================================================
// Body weight
// ==================================================================
export async function getWeightEntries() {
  const { data, error } = await supabase
    .from('body_weight_logs')
    .select('*')
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data.map((e) => ({ id: e.id, date: e.log_date, weight_kg: Number(e.weight_kg) }));
}

export async function addWeightEntry(date, weightKg) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('body_weight_logs')
    .upsert({ user_id, log_date: date, weight_kg: Number(weightKg) }, { onConflict: 'user_id,log_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWeightEntry(id) {
  const { error } = await supabase.from('body_weight_logs').delete().eq('id', id);
  if (error) throw error;
}

// ==================================================================
// Body measurements
// ==================================================================
export async function getMeasurementEntries() {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data.map((e) => ({ ...e, date: e.log_date }));
}

export async function addMeasurementEntry(date, fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('body_measurements')
    .upsert({ user_id, log_date: date, ...fields }, { onConflict: 'user_id,log_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMeasurementEntry(id) {
  const { error } = await supabase.from('body_measurements').delete().eq('id', id);
  if (error) throw error;
}

// ==================================================================
// Calorie profile + entries
// ==================================================================
export async function getCalorieProfile() {
  const user_id = await getUserId();
  const { data, error } = await supabase.from('calorie_profiles').select('*').eq('user_id', user_id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    sex: data.sex,
    age: data.age ?? '',
    heightCm: data.height_cm ?? '',
    weightKg: data.weight_kg ?? '',
    activity: data.activity,
    goal: data.goal,
  };
}

export async function saveCalorieProfile(profile) {
  const user_id = await getUserId();
  const { error } = await supabase.from('calorie_profiles').upsert({
    user_id,
    sex: profile.sex,
    age: profile.age === '' ? null : Number(profile.age),
    height_cm: profile.heightCm === '' ? null : Number(profile.heightCm),
    weight_kg: profile.weightKg === '' ? null : Number(profile.weightKg),
    activity: profile.activity,
    goal: profile.goal,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return profile;
}

export async function getCalorieEntries(date) {
  let query = supabase.from('calorie_entries').select('*').order('created_at', { ascending: true });
  if (date) query = query.eq('log_date', date);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((e) => ({ id: e.id, date: e.log_date, name: e.name, calories: e.calories, protein: Number(e.protein_g || 0) }));
}

export async function addCalorieEntry(date, name, calories, protein = 0) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('calorie_entries')
    .insert({ user_id, log_date: date, name, calories: Number(calories), protein_g: Number(protein) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCalorieEntry(id) {
  const { error } = await supabase.from('calorie_entries').delete().eq('id', id);
  if (error) throw error;
}
