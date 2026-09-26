import asyncio
from typing import Awaitable, Callable

from google.genai import errors, types

from app.agents.gemini_client import get_gemini_client, translate_gemini_error
from app.agents.prompts import AGENT_PROMPTS
from app.agents.tools_schema import get_tools_for_agent
from app.config import get_settings

settings = get_settings()

ToolExecutor = Callable[[str, dict], Awaitable[dict]]

MAX_TOOL_ROUNDS = 5


def _to_gemini_history(history: list[dict]) -> list[types.Content]:
    """Converte histórico {role: user|assistant} para o formato do Gemini
    (role: user|model)."""
    return [
        types.Content(role="model" if item["role"] == "assistant" else "user", parts=[types.Part(text=item["content"])])
        for item in history
    ]


async def ask_agent(
    agente: str,
    user_context: str,
    history: list[dict],
    user_message: str,
    execute_tool: ToolExecutor | None = None,
) -> str:
    client = get_gemini_client()
    system_prompt = AGENT_PROMPTS.get(agente, AGENT_PROMPTS["orquestrador"])
    full_system = f"{system_prompt}\n\n--- Contexto do usuário ---\n{user_context}"

    tools = get_tools_for_agent(agente) if execute_tool else None
    config = types.GenerateContentConfig(system_instruction=full_system, tools=tools)
    chat = client.chats.create(model=settings.gemini_model, config=config, history=_to_gemini_history(history))

    try:
        response = await asyncio.to_thread(chat.send_message, user_message)

        for _ in range(MAX_TOOL_ROUNDS):
            if not response.function_calls:
                break
            function_response_parts = []
            for call in response.function_calls:
                result = await execute_tool(call.name, dict(call.args))
                function_response_parts.append(
                    types.Part.from_function_response(name=call.name, response={"result": result})
                )
            response = await asyncio.to_thread(chat.send_message, function_response_parts)

        # Depois de chamar ferramentas o modelo às vezes encerra o turno sem
        # texto nenhum — pede um resumo pra sempre ter algo pra mostrar/salvar.
        if not response.text:
            response = await asyncio.to_thread(
                chat.send_message, "Resuma em 1-2 frases o que você acabou de fazer."
            )
    except errors.APIError as exc:
        raise translate_gemini_error(exc) from exc

    return response.text or "Pronto — atualizei suas informações."
