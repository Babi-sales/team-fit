import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    ARRAY,
    Boolean,
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


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="invited")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    profile: Mapped["Profile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"), unique=True)
    sexo: Mapped[str | None] = mapped_column(String)
    data_nascimento: Mapped[date | None] = mapped_column(Date)
    altura_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    nivel_atividade: Mapped[str | None] = mapped_column(String)
    restricoes_alimentares: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    condicoes_saude: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    medicamentos: Mapped[str | None] = mapped_column(Text)
    observacoes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["AppUser"] = relationship(back_populates="profile")


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    tipo: Mapped[str] = mapped_column(String, nullable=False)
    peso_meta_kg: Mapped[float | None] = mapped_column(Numeric(5, 1))
    meta_kcal_dia: Mapped[int | None] = mapped_column(Integer)
    meta_proteina_g_dia: Mapped[int | None] = mapped_column(Integer)
    data_inicio: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    data_alvo: Mapped[date | None] = mapped_column(Date)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WeightLog(Base):
    __tablename__ = "weight_logs"
    __table_args__ = (UniqueConstraint("user_id", "data"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    data: Mapped[date] = mapped_column(Date, nullable=False)
    peso_kg: Mapped[float] = mapped_column(Numeric(5, 1), nullable=False)
    observacao: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BodyMeasurement(Base):
    __tablename__ = "body_measurements"
    __table_args__ = (UniqueConstraint("user_id", "data"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    data: Mapped[date] = mapped_column(Date, nullable=False)
    cintura_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    quadril_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    peito_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    braco_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    coxa_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    outras_medidas: Mapped[dict] = mapped_column(JSONB, default=dict)
    observacao: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    versao: Mapped[int] = mapped_column(Integer, nullable=False)
    titulo: Mapped[str] = mapped_column(String, nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    kcal_alvo: Mapped[int | None] = mapped_column(Integer)
    proteina_alvo_g: Mapped[int | None] = mapped_column(Integer)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    versao: Mapped[int] = mapped_column(Integer, nullable=False)
    titulo: Mapped[str] = mapped_column(String, nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WeeklyMenu(Base):
    __tablename__ = "weekly_menus"
    __table_args__ = (UniqueConstraint("user_id", "semana_inicio"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    semana_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    data: Mapped[date] = mapped_column(Date, nullable=False)
    horario: Mapped[time | None] = mapped_column(Time)
    refeicao: Mapped[str] = mapped_column(String, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    kcal: Mapped[float] = mapped_column(Numeric(6, 1), default=0)
    proteina_g: Mapped[float] = mapped_column(Numeric(6, 1), default=0)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExerciseLog(Base):
    __tablename__ = "exercise_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    data: Mapped[date] = mapped_column(Date, nullable=False)
    tipo_exercicio: Mapped[str] = mapped_column(String, nullable=False)
    duracao_min: Mapped[int] = mapped_column(Integer, nullable=False)
    intensidade: Mapped[str] = mapped_column(String, default="moderada")
    kcal_estimado: Mapped[float | None] = mapped_column(Numeric(6, 1))
    observacao: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    agente: Mapped[str] = mapped_column(String, default="orquestrador")
    role: Mapped[str] = mapped_column(String, nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AdherenceNote(Base):
    """Anotações que os agentes (nutricionista, personal, chef) registram durante o
    chat — dificuldades relatadas pelo usuário, para o plano ser adaptado depois."""

    __tablename__ = "adherence_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    agente: Mapped[str] = mapped_column(String, nullable=False)
    nota: Mapped[str] = mapped_column(Text, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Family(Base):
    __tablename__ = "families"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(String, nullable=False)
    criado_por: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FamilyMember(Base):
    """Um usuário pertence a no máximo uma família. `papel` = 'chefe' | 'membro' —
    o chefe pode registrar refeições/peso/medidas/dificuldades dos demais membros."""

    __tablename__ = "family_members"
    __table_args__ = (UniqueConstraint("user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id", ondelete="CASCADE"))
    papel: Mapped[str] = mapped_column(String, nullable=False, default="membro")
    entrou_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
