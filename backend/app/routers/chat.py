import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.client import ask_agent
from app.agents.context import build_user_context
from app.agents.gemini_client import AIServiceError
from app.agents.tools_exec import execute_tool
from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import ChatMessage
from app.schemas import ChatMessageIn, ChatMessageOut

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/history", response_model=list[ChatMessageOut])
async def get_history(
    agente: str | None = Query(None),
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    stmt = select(ChatMessage).where(ChatMessage.user_id == target_id)
    if agente:
        stmt = stmt.where(ChatMessage.agente == agente)
    result = await db.execute(stmt.order_by(ChatMessage.criado_em))
    return result.scalars().all()


@router.post("", response_model=ChatMessageOut)
async def send_message(
    payload: ChatMessageIn,
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)

    user_msg = ChatMessage(user_id=target_id, agente=payload.agente, role="user", conteudo=payload.conteudo)
    db.add(user_msg)
    await db.commit()

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == target_id, ChatMessage.agente == payload.agente)
        .order_by(ChatMessage.criado_em.desc())
        .limit(20)
    )
    history_rows = list(reversed(history_result.scalars().all()))[:-1]  # exclude the message we just added
    history = [{"role": row.role, "content": row.conteudo} for row in history_rows]

    context = await build_user_context(db, target_id, payload.agente)

    async def _execute_tool(name: str, args: dict) -> dict:
        return await execute_tool(name, args, db, target_id, payload.agente)

    try:
        resposta = await ask_agent(payload.agente, context, history, payload.conteudo, execute_tool=_execute_tool)
    except AIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    assistant_msg = ChatMessage(
        user_id=target_id, agente=payload.agente, role="assistant", conteudo=resposta or "Pronto."
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)
    return assistant_msg
