import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict


# ---------- Users ----------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    created_at: datetime


class InviteUserIn(BaseModel):
    email: str
    full_name: str
    role: str = "invited"


# ---------- Profile ----------
class ProfileIn(BaseModel):
    sexo: str | None = None
    data_nascimento: date | None = None
    altura_cm: float | None = None
    nivel_atividade: str | None = None
    restricoes_alimentares: list[str] = []
    condicoes_saude: list[str] = []
    medicamentos: str | None = None
    observacoes: str | None = None


class ProfileOut(ProfileIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    updated_at: datetime


# ---------- Goals ----------
class GoalIn(BaseModel):
    tipo: str  # perder_peso | ganhar_peso | manter_peso
    peso_meta_kg: float | None = None
    meta_kcal_dia: int | None = None
    meta_proteina_g_dia: int | None = None
    data_alvo: date | None = None


class GoalOut(GoalIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    data_inicio: date
    ativo: bool
    created_at: datetime


# ---------- Weight ----------
class WeightLogIn(BaseModel):
    data: date
    peso_kg: float
    observacao: str | None = None


class WeightLogOut(WeightLogIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID


# ---------- Body measurements ----------
class BodyMeasurementIn(BaseModel):
    data: date
    cintura_cm: float | None = None
    quadril_cm: float | None = None
    peito_cm: float | None = None
    braco_cm: float | None = None
    coxa_cm: float | None = None
    outras_medidas: dict = {}
    observacao: str | None = None


class BodyMeasurementOut(BodyMeasurementIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID


# ---------- Meal plans ----------
class MealPlanIn(BaseModel):
    titulo: str
    conteudo: str
    kcal_alvo: int | None = None
    proteina_alvo_g: int | None = None


class MealPlanOut(MealPlanIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    versao: int
    ativo: bool
    criado_em: datetime


# ---------- Training plans (plano de treino) ----------
class TrainingPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    versao: int
    titulo: str
    conteudo: str
    ativo: bool
    criado_em: datetime


# ---------- Weekly menus ----------
class WeeklyMenuIn(BaseModel):
    semana_inicio: date
    conteudo: str


class WeeklyMenuOut(WeeklyMenuIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    ativo: bool
    criado_em: datetime


# ---------- Meal logs ----------
class MealLogIn(BaseModel):
    data: date
    horario: time | None = None
    refeicao: str
    descricao: str
    # Se não informados, o backend estima automaticamente a partir da descrição (Gemini).
    kcal: float | None = None
    proteina_g: float | None = None


class MealLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    data: date
    horario: time | None = None
    refeicao: str
    descricao: str
    kcal: float
    proteina_g: float


class DailyTotals(BaseModel):
    data: date
    kcal_total: float
    proteina_total: float
    meta_kcal: int | None
    meta_proteina: int | None
    diferenca_kcal: float | None
    diferenca_proteina: float | None
    refeicoes: list[MealLogOut]


class WeeklyConsolidated(BaseModel):
    semana_inicio: date
    semana_fim: date
    media_kcal_dia: float
    media_proteina_dia: float
    meta_kcal: int | None
    meta_proteina: int | None
    dias: list[DailyTotals]
    kcal_estimado_queimado_total: float
    treinos_realizados: int


# ---------- Exercise logs ----------
class ExerciseLogIn(BaseModel):
    data: date
    tipo_exercicio: str
    duracao_min: int
    intensidade: str = "moderada"
    kcal_estimado: float | None = None
    observacao: str | None = None


class ExerciseLogOut(ExerciseLogIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID



# ---------- Chat ----------
class ChatMessageIn(BaseModel):
    conteudo: str
    agente: str = "orquestrador"


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    agente: str
    role: str
    conteudo: str
    criado_em: datetime


# ---------- Índices de saúde (IMC / RCQ / RCA) ----------
class IndicePonto(BaseModel):
    data: date
    valor: float


class HealthIndices(BaseModel):
    imc_atual: float | None
    imc_classificacao: str | None
    imc_historico: list[IndicePonto]
    rcq_atual: float | None
    rcq_classificacao: str | None
    rcq_historico: list[IndicePonto]
    rca_atual: float | None
    rca_classificacao: str | None
    rca_historico: list[IndicePonto]


# ---------- Dashboard ----------
class DashboardSummary(BaseModel):
    peso_atual_kg: float | None
    peso_inicial_kg: float | None
    peso_meta_kg: float | None
    variacao_peso_kg: float | None
    historico_peso: list[WeightLogOut]
    historico_medidas: list[BodyMeasurementOut]
    frequencia_exercicio_semana: int
    kcal_estimado_queimado_semana: float
    media_kcal_dia_semana: float
    media_proteina_dia_semana: float
    meta_kcal: int | None
    meta_proteina: int | None
    indices: HealthIndices


# ---------- Anotações (dificuldades relatadas no chat) ----------
class AdherenceNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    agente: str
    nota: str
    criado_em: datetime


# ---------- Grupo familiar ----------
class FamilyCreateIn(BaseModel):
    nome: str


class InviteFamilyMemberIn(BaseModel):
    email: str
    full_name: str


class FamilyMemberDetail(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    papel: str


class FamilyDetail(BaseModel):
    id: uuid.UUID
    nome: str
    membros: list[FamilyMemberDetail]
