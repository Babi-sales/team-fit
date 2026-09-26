export type Role = "admin" | "invited";

export interface FamilyMemberDetail {
  user_id: string;
  full_name: string;
  email: string;
  papel: "chefe" | "membro";
}

export interface FamilyDetail {
  id: string;
  nome: string;
  membros: FamilyMemberDetail[];
}

export interface AdherenceNote {
  id: string;
  user_id: string;
  agente: string;
  nota: string;
  criado_em: string;
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  sexo: string | null;
  data_nascimento: string | null;
  altura_cm: number | null;
  nivel_atividade: string | null;
  restricoes_alimentares: string[];
  condicoes_saude: string[];
  medicamentos: string | null;
  observacoes: string | null;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  tipo: "perder_peso" | "ganhar_peso" | "manter_peso";
  peso_meta_kg: number | null;
  meta_kcal_dia: number | null;
  meta_proteina_g_dia: number | null;
  data_inicio: string;
  data_alvo: string | null;
  ativo: boolean;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  data: string;
  peso_kg: number;
  observacao: string | null;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  data: string;
  cintura_cm: number | null;
  quadril_cm: number | null;
  peito_cm: number | null;
  braco_cm: number | null;
  coxa_cm: number | null;
  outras_medidas: Record<string, unknown>;
  observacao: string | null;
}

export interface MealPlan {
  id: string;
  user_id: string;
  versao: number;
  titulo: string;
  conteudo: string;
  kcal_alvo: number | null;
  proteina_alvo_g: number | null;
  ativo: boolean;
  criado_em: string;
}

export interface TrainingPlan {
  id: string;
  user_id: string;
  versao: number;
  titulo: string;
  conteudo: string;
  ativo: boolean;
  criado_em: string;
}

export interface WeeklyMenu {
  id: string;
  user_id: string;
  semana_inicio: string;
  conteudo: string;
  ativo: boolean;
  criado_em: string;
}

export interface MealLog {
  id: string;
  user_id: string;
  data: string;
  horario: string | null;
  refeicao: string;
  descricao: string;
  kcal: number;
  proteina_g: number;
}

export interface DailyTotals {
  data: string;
  kcal_total: number;
  proteina_total: number;
  meta_kcal: number | null;
  meta_proteina: number | null;
  diferenca_kcal: number | null;
  diferenca_proteina: number | null;
  refeicoes: MealLog[];
}

export interface WeeklyConsolidated {
  semana_inicio: string;
  semana_fim: string;
  media_kcal_dia: number;
  media_proteina_dia: number;
  meta_kcal: number | null;
  meta_proteina: number | null;
  dias: DailyTotals[];
  kcal_estimado_queimado_total: number;
  treinos_realizados: number;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  data: string;
  tipo_exercicio: string;
  duracao_min: number;
  intensidade: string;
  kcal_estimado: number | null;
  observacao: string | null;
}

export interface ChatMessageOut {
  id: string;
  user_id: string;
  agente: string;
  role: "user" | "assistant";
  conteudo: string;
  criado_em: string;
}

export interface IndicePonto {
  data: string;
  valor: number;
}

export interface HealthIndices {
  imc_atual: number | null;
  imc_classificacao: string | null;
  imc_historico: IndicePonto[];
  rcq_atual: number | null;
  rcq_classificacao: string | null;
  rcq_historico: IndicePonto[];
  rca_atual: number | null;
  rca_classificacao: string | null;
  rca_historico: IndicePonto[];
}

export interface DashboardSummary {
  peso_atual_kg: number | null;
  peso_inicial_kg: number | null;
  peso_meta_kg: number | null;
  variacao_peso_kg: number | null;
  historico_peso: WeightLog[];
  historico_medidas: BodyMeasurement[];
  frequencia_exercicio_semana: number;
  kcal_estimado_queimado_semana: number;
  media_kcal_dia_semana: number;
  media_proteina_dia_semana: number;
  meta_kcal: number | null;
  meta_proteina: number | null;
  indices: HealthIndices;
}
