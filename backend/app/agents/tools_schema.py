"""Declarações de function calling (Gemini) usadas pelos agentes para escrever
dados estruturados no banco a partir da conversa."""

from google.genai import types

DEFINIR_META = types.FunctionDeclaration(
    name="definir_meta",
    description=(
        "Define ou atualiza a meta nutricional do usuário (objetivo, calorias e proteína "
        "diárias, peso alvo). Use somente depois de reunir informações suficientes na "
        "avaliação nutricional — não pergunte permissão, apenas defina e informe ao usuário."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "tipo": types.Schema(
                type=types.Type.STRING,
                enum=["perder_peso", "ganhar_peso", "manter_peso"],
                description="Objetivo principal do usuário",
            ),
            "peso_meta_kg": types.Schema(type=types.Type.NUMBER, description="Peso alvo em kg, se aplicável"),
            "meta_kcal_dia": types.Schema(type=types.Type.INTEGER, description="Meta de calorias totais por dia"),
            "meta_proteina_g_dia": types.Schema(type=types.Type.INTEGER, description="Meta de proteína em gramas por dia"),
        },
        required=["tipo", "meta_kcal_dia", "meta_proteina_g_dia"],
    ),
)

CRIAR_PLANO_ALIMENTAR = types.FunctionDeclaration(
    name="criar_plano_alimentar",
    description=(
        "Cria uma nova versão do plano alimentar do usuário: quantas refeições por dia, "
        "horários, composição/sugestões de cada refeição e quantidades. Chame depois de "
        "definir a meta (definir_meta). O conteúdo deve estar em markdown, organizado por refeição."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "titulo": types.Schema(type=types.Type.STRING, description="Título curto do plano"),
            "conteudo": types.Schema(
                type=types.Type.STRING,
                description="Plano completo em markdown: refeições do dia, horários, composição e quantidades",
            ),
            "kcal_alvo": types.Schema(type=types.Type.INTEGER),
            "proteina_alvo_g": types.Schema(type=types.Type.INTEGER),
        },
        required=["titulo", "conteudo"],
    ),
)

CRIAR_PLANO_TREINO = types.FunctionDeclaration(
    name="criar_plano_treino",
    description=(
        "Cria uma nova versão do plano de treino do usuário: divisão de treino, dias da semana, "
        "exercícios, séries/repetições/carga ou intensidade, e observações de progressão ou "
        "limitações físicas. Chame quando tiver informação suficiente sobre objetivo, nível e "
        "limitações — não peça permissão, publique e depois resuma. O conteúdo deve estar em "
        "markdown, organizado por dia de treino."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "titulo": types.Schema(type=types.Type.STRING, description="Título curto do plano de treino"),
            "conteudo": types.Schema(
                type=types.Type.STRING,
                description="Plano de treino completo em markdown: dias, exercícios, séries/repetições e observações",
            ),
        },
        required=["titulo", "conteudo"],
    ),
)

REGISTRAR_ANOTACAO = types.FunctionDeclaration(
    name="registrar_anotacao",
    description=(
        "Registra uma dificuldade, observação ou progresso relatado pelo usuário na conversa "
        "(ex: fome fora de hora, dificuldade para seguir o plano, dor após treino) para que o "
        "plano possa ser adaptado depois. Chame sempre que o usuário relatar algo relevante — "
        "não é preciso avisar que está registrando."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "nota": types.Schema(type=types.Type.STRING, description="Resumo objetivo do que foi relatado"),
        },
        required=["nota"],
    ),
)

CRIAR_CARDAPIO_SEMANAL = types.FunctionDeclaration(
    name="criar_cardapio_semanal",
    description=(
        "Cria o cardápio semanal com base no(s) plano(s) alimentar(es) ativo(s) do usuário "
        "(e da família, se houver, já que fazem as refeições juntos). Inclua sugestões de "
        "receitas e a quantidade em gramas de cada item, por pessoa quando os planos forem "
        "diferentes, sem nunca ultrapassar as calorias de cada refeição do plano."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "semana_inicio": types.Schema(type=types.Type.STRING, description="Data de início da semana, formato YYYY-MM-DD"),
            "conteudo": types.Schema(type=types.Type.STRING, description="Cardápio completo em markdown, dia a dia"),
        },
        required=["semana_inicio", "conteudo"],
    ),
)

TOOLS_BY_AGENT = {
    "nutricionista": types.Tool(function_declarations=[DEFINIR_META, CRIAR_PLANO_ALIMENTAR, REGISTRAR_ANOTACAO]),
    "personal": types.Tool(function_declarations=[CRIAR_PLANO_TREINO, REGISTRAR_ANOTACAO]),
    "chef": types.Tool(function_declarations=[CRIAR_CARDAPIO_SEMANAL, REGISTRAR_ANOTACAO]),
    "orquestrador": types.Tool(function_declarations=[REGISTRAR_ANOTACAO]),
}


def get_tools_for_agent(agente: str) -> list[types.Tool] | None:
    tool = TOOLS_BY_AGENT.get(agente)
    return [tool] if tool else None
