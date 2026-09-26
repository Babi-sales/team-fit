import uuid
from datetime import date, datetime
from datetime import time as time_of_day

from pydantic import BaseModel, ConfigDict, Field


# ---------- Auth ----------
class LoginIn(BaseModel):
    password: str = Field(max_length=128)


# ---------- People ----------
class PersonIn(BaseModel):
    sex: str | None = None
    birth_date: date | None = None
    height_cm: float | None = Field(default=None, gt=0, le=300)
    activity_level: str | None = None
    dietary_restrictions: list[str] = []
    health_conditions: list[str] = []
    medications: str | None = None
    notes: str | None = None


class PersonOut(PersonIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    slug: str
    name: str
    updated_at: datetime


# ---------- Goals ----------
class GoalIn(BaseModel):
    goal_type: str  # lose_weight | gain_weight | maintain_weight
    target_weight_kg: float | None = Field(default=None, gt=0, le=500)
    target_kcal_day: int | None = Field(default=None, gt=0, le=10000)
    target_protein_g_day: int | None = Field(default=None, gt=0, le=1000)
    target_date: date | None = None


class GoalOut(GoalIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    person_id: uuid.UUID
    start_date: date
    active: bool
    created_at: datetime


# ---------- Weight ----------
class WeightLogIn(BaseModel):
    date: date
    weight_kg: float = Field(gt=0, le=500)
    note: str | None = None


class WeightLogOut(WeightLogIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    person_id: uuid.UUID


# ---------- Body measurements ----------
class BodyMeasurementIn(BaseModel):
    date: date
    waist_cm: float | None = Field(default=None, gt=0, le=300)
    hip_cm: float | None = Field(default=None, gt=0, le=300)
    chest_cm: float | None = Field(default=None, gt=0, le=300)
    arm_cm: float | None = Field(default=None, gt=0, le=200)
    thigh_cm: float | None = Field(default=None, gt=0, le=200)
    neck_cm: float | None = Field(default=None, gt=0, le=100)
    other_measurements: dict = {}
    note: str | None = None


class BodyMeasurementOut(BodyMeasurementIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    person_id: uuid.UUID


# ---------- Foods (nutrition reference table) ----------
class FoodIn(BaseModel):
    name: str
    category: str | None = None
    kcal_per_100g: float = Field(ge=0, le=9000)
    protein_per_100g: float = Field(default=0, ge=0, le=100)
    carbs_per_100g: float = Field(default=0, ge=0, le=100)
    fat_per_100g: float = Field(default=0, ge=0, le=100)
    default_portion_g: float | None = Field(default=None, gt=0)
    default_portion_label: str | None = None
    source: str | None = None


class FoodOut(FoodIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime


# ---------- Training plans ----------
class TrainingPlanIn(BaseModel):
    title: str
    content: str


class TrainingPlanOut(TrainingPlanIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    person_id: uuid.UUID
    version: int
    active: bool
    created_at: datetime


# ---------- Meal logs ----------
class MealLogItemIn(BaseModel):
    food_id: uuid.UUID | None = None
    quantity_g: float | None = Field(default=None, gt=0, le=10000)
    # Only used when food_id is not set (e.g. a restaurant item with no match
    # in the food table) — kcal/protein are then taken as-is, not computed.
    free_text_description: str | None = None
    kcal: float | None = Field(default=None, ge=0, le=20000)
    protein_g: float | None = Field(default=None, ge=0, le=2000)


class MealLogItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    meal_log_id: uuid.UUID
    food_id: uuid.UUID | None
    food_name: str | None = None
    free_text_description: str | None
    quantity_g: float | None
    kcal: float
    protein_g: float


class MealLogIn(BaseModel):
    date: date
    meal_type: str
    time: time_of_day | None = None


class MealLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    person_id: uuid.UUID
    date: date
    meal_type: str
    time: time_of_day | None = None
    items: list[MealLogItemOut] = []


class DailyTotals(BaseModel):
    date: date
    total_kcal: float
    total_protein: float
    target_kcal: int | None
    target_protein: int | None
    kcal_diff: float | None
    protein_diff: float | None
    meals: list[MealLogOut]


class DailyKcalPoint(BaseModel):
    date: date
    total_kcal: float
    target_kcal: int | None


# ---------- Health indices (BMI / waist-hip ratio / waist-height ratio) ----------
class IndexPoint(BaseModel):
    date: date
    value: float


class HealthIndices(BaseModel):
    bmi_current: float | None
    bmi_classification: str | None
    bmi_history: list[IndexPoint]
    whr_current: float | None
    whr_classification: str | None
    whr_history: list[IndexPoint]
    whtr_current: float | None
    whtr_classification: str | None
    whtr_history: list[IndexPoint]


# ---------- Dashboard ----------
class DashboardSummary(BaseModel):
    current_weight_kg: float | None
    initial_weight_kg: float | None
    target_weight_kg: float | None
    weight_change_kg: float | None
    weight_history: list[WeightLogOut]
    measurement_history: list[BodyMeasurementOut]
    target_kcal: int | None
    target_protein: int | None
    daily_kcal_series: list[DailyKcalPoint]
    indices: HealthIndices
