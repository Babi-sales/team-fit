export type PersonSlug = "paulo" | "barbara";

export interface Person {
  id: string;
  slug: PersonSlug;
  name: string;
  sex: string | null;
  birth_date: string | null;
  height_cm: number | null;
  activity_level: string | null;
  dietary_restrictions: string[];
  health_conditions: string[];
  medications: string | null;
  notes: string | null;
  updated_at: string;
}

export type GoalType = "lose_weight" | "gain_weight" | "maintain_weight";

export interface Goal {
  id: string;
  person_id: string;
  goal_type: GoalType;
  target_weight_kg: number | null;
  target_kcal_day: number | null;
  target_protein_g_day: number | null;
  start_date: string;
  target_date: string | null;
  active: boolean;
  created_at: string;
}

export interface WeightLog {
  id: string;
  person_id: string;
  date: string;
  weight_kg: number;
  note: string | null;
}

export interface BodyMeasurement {
  id: string;
  person_id: string;
  date: string;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  neck_cm: number | null;
  other_measurements: Record<string, unknown>;
  note: string | null;
}

export interface Food {
  id: string;
  name: string;
  category: string | null;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  default_portion_g: number | null;
  default_portion_label: string | null;
  source: string | null;
  created_at: string;
}

export type MealType = "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "supper";

export interface MealLogItem {
  id: string;
  meal_log_id: string;
  food_id: string | null;
  free_text_description: string | null;
  quantity_g: number | null;
  kcal: number;
  protein_g: number;
}

export interface MealLog {
  id: string;
  person_id: string;
  date: string;
  meal_type: MealType;
  time: string | null;
  items: MealLogItem[];
}

export interface DailyTotals {
  date: string;
  total_kcal: number;
  total_protein: number;
  target_kcal: number | null;
  target_protein: number | null;
  kcal_diff: number | null;
  protein_diff: number | null;
  meals: MealLog[];
}

export interface DailyKcalPoint {
  date: string;
  total_kcal: number;
  target_kcal: number | null;
}

export interface TrainingPlan {
  id: string;
  person_id: string;
  version: number;
  title: string;
  content: string;
  active: boolean;
  created_at: string;
}

export interface IndexPoint {
  date: string;
  value: number;
}

export interface HealthIndices {
  bmi_current: number | null;
  bmi_classification: string | null;
  bmi_history: IndexPoint[];
  whr_current: number | null;
  whr_classification: string | null;
  whr_history: IndexPoint[];
  whtr_current: number | null;
  whtr_classification: string | null;
  whtr_history: IndexPoint[];
}

export interface DashboardSummary {
  current_weight_kg: number | null;
  initial_weight_kg: number | null;
  target_weight_kg: number | null;
  weight_change_kg: number | null;
  weight_history: WeightLog[];
  measurement_history: BodyMeasurement[];
  target_kcal: number | null;
  target_protein: number | null;
  daily_kcal_series: DailyKcalPoint[];
  indices: HealthIndices;
}
