import uuid
from datetime import date, datetime
from datetime import time as time_of_day

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Person(Base):
    __tablename__ = "people"
    __table_args__ = (CheckConstraint("slug in ('paulo', 'barbara')"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    sex: Mapped[str | None] = mapped_column(String)
    birth_date: Mapped[date | None] = mapped_column(Date)
    height_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    activity_level: Mapped[str | None] = mapped_column(String)
    dietary_restrictions: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    health_conditions: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    medications: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("people.id", ondelete="CASCADE"))
    goal_type: Mapped[str] = mapped_column(String, nullable=False)
    target_weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 1))
    target_kcal_day: Mapped[int | None] = mapped_column(Integer)
    target_protein_g_day: Mapped[int | None] = mapped_column(Integer)
    start_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    target_date: Mapped[date | None] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WeightLog(Base):
    __tablename__ = "weight_logs"
    __table_args__ = (UniqueConstraint("person_id", "date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("people.id", ondelete="CASCADE"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Numeric(5, 1), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BodyMeasurement(Base):
    __tablename__ = "body_measurements"
    __table_args__ = (UniqueConstraint("person_id", "date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("people.id", ondelete="CASCADE"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    waist_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    hip_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    chest_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    arm_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    thigh_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    neck_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    other_measurements: Mapped[dict] = mapped_column(JSONB, default=dict)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Food(Base):
    """Nutrition reference table (per 100g). Content (name/category) is in
    Portuguese — it's what the app displays."""

    __tablename__ = "foods"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str | None] = mapped_column(String)
    kcal_per_100g: Mapped[float] = mapped_column(Numeric(6, 1), nullable=False)
    protein_per_100g: Mapped[float] = mapped_column(Numeric(5, 1), default=0)
    carbs_per_100g: Mapped[float] = mapped_column(Numeric(5, 1), default=0)
    fat_per_100g: Mapped[float] = mapped_column(Numeric(5, 1), default=0)
    default_portion_g: Mapped[float | None] = mapped_column(Numeric(6, 1))
    default_portion_label: Mapped[str | None] = mapped_column(String)
    source: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("people.id", ondelete="CASCADE"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[str] = mapped_column(String, nullable=False)
    time: Mapped[time_of_day | None] = mapped_column(Time)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items: Mapped[list["MealLogItem"]] = relationship(back_populates="meal_log", cascade="all, delete-orphan")


class MealLogItem(Base):
    """Either `food_id` + `quantity_g` (kcal/protein computed from the food's
    per-100g values) or `free_text_description` with manually entered kcal/protein
    (e.g. a restaurant item with no matching food)."""

    __tablename__ = "meal_log_items"
    __table_args__ = (
        CheckConstraint("food_id is not null or free_text_description is not null"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("meal_logs.id", ondelete="CASCADE"))
    food_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("foods.id", ondelete="SET NULL"))
    free_text_description: Mapped[str | None] = mapped_column(Text)
    quantity_g: Mapped[float | None] = mapped_column(Numeric(6, 1))
    kcal: Mapped[float] = mapped_column(Numeric(6, 1), default=0)
    protein_g: Mapped[float] = mapped_column(Numeric(6, 1), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    meal_log: Mapped["MealLog"] = relationship(back_populates="items")
    food: Mapped["Food | None"] = relationship()


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("people.id", ondelete="CASCADE"))
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
