from functools import lru_cache

from google import genai

from app.config import get_settings

settings = get_settings()


class AIServiceError(Exception):
    """Erro ao falar com o Gemini — cota esgotada, indisponibilidade temporária, etc.
    Sempre traz uma mensagem em português já pronta para mostrar ao usuário."""


@lru_cache
def get_gemini_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def translate_gemini_error(error: Exception) -> AIServiceError:
    """Converte um erro do SDK do Gemini numa mensagem amigável em português."""
    status_code = getattr(error, "code", None) or getattr(error, "status_code", None)
    if status_code == 429:
        return AIServiceError(
            "A cota gratuita do Gemini de hoje acabou (limite do plano free). "
            "Tente novamente mais tarde ou use uma chave com plano pago."
        )
    if status_code in (503, 500, 502, 504):
        return AIServiceError(
            "O serviço de IA (Gemini) está temporariamente indisponível. Tente novamente em instantes."
        )
    return AIServiceError(f"Não foi possível falar com o serviço de IA agora ({error}).")
