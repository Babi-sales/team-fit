import json

from google.genai import errors, types

from app.agents.gemini_client import get_gemini_client, translate_gemini_error
from app.config import get_settings

settings = get_settings()

ESTIMATE_SYSTEM_PROMPT = """Você é um nutricionista especialista em estimar valores nutricionais de refeições
a partir de descrições em português coloquial, incluindo medidas caseiras (colher de sopa, colher de chá,
xícara, copo de Xml, unidade, fatia, punhado). Use seu conhecimento de tabelas nutricionais (TACO/USDA) para
estimar o total de calorias e proteína de TODA a refeição descrita, somando todos os itens mencionados.
Sempre responda com sua melhor estimativa numérica — nunca recuse, nunca peça mais detalhes, nunca responda
com texto fora do JSON pedido."""

RESPONSE_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "kcal": types.Schema(type=types.Type.NUMBER, description="Total de calorias da refeição, em kcal"),
        "proteina_g": types.Schema(type=types.Type.NUMBER, description="Total de proteína da refeição, em gramas"),
    },
    required=["kcal", "proteina_g"],
)


def estimate_meal_macros(descricao: str) -> dict:
    """Estima kcal e proteína (g) de uma refeição a partir de uma descrição livre,
    ex: '2 col de sopa de cuscuz, com 2 ovos mexidos e um copo 200ml de leite desnatado'."""
    client = get_gemini_client()
    config = types.GenerateContentConfig(
        system_instruction=ESTIMATE_SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=RESPONSE_SCHEMA,
    )
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=f"Refeição: {descricao}",
            config=config,
        )
    except errors.APIError as exc:
        raise translate_gemini_error(exc) from exc

    data = json.loads(response.text)
    return {
        "kcal": round(float(data["kcal"]), 1),
        "proteina_g": round(float(data["proteina_g"]), 1),
    }
