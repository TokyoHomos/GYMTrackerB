// Mifflin-St Jeor equation — the most widely validated BMR formula.
export const ACTIVITY_MULTIPLIERS = [
  { key: 'sedentary', label: 'Sedentary (little/no exercise)', value: 1.2 },
  { key: 'light', label: 'Light (1-3 days/week)', value: 1.375 },
  { key: 'moderate', label: 'Moderate (3-5 days/week)', value: 1.55 },
  { key: 'active', label: 'Active (6-7 days/week)', value: 1.725 },
  { key: 'very_active', label: 'Very active (2x/day, hard training)', value: 1.9 },
];

export const GOALS = [
  { key: 'lose', label: 'Lose weight', deltaPerDay: -500 },
  { key: 'maintain', label: 'Maintain weight', deltaPerDay: 0 },
  { key: 'gain', label: 'Gain weight', deltaPerDay: 300 },
];

export function calculateBMR({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

export function calculateTDEE(bmr, activityKey) {
  const activity = ACTIVITY_MULTIPLIERS.find((a) => a.key === activityKey) || ACTIVITY_MULTIPLIERS[0];
  return Math.round(bmr * activity.value);
}

export function calculateGoalCalories(tdee, goalKey) {
  const goal = GOALS.find((g) => g.key === goalKey) || GOALS[1];
  return Math.round(tdee + goal.deltaPerDay);
}
