import uuid
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import AppUser, FamilyMember

settings = get_settings()
bearer_scheme = HTTPBearer()


@dataclass
class CurrentUser:
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    # Ids dos usuários que este usuário pode gerenciar como Chefe da Família
    # (inclui o próprio id quando ele é chefe). Vazio se não for chefe de nenhum grupo.
    family_member_ids: frozenset[uuid.UUID] = field(default_factory=frozenset)

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    supabase_user_id = payload.get("sub")
    if not supabase_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sem identificação de usuário")

    result = await db.execute(select(AppUser).where(AppUser.id == uuid.UUID(supabase_user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário autenticado no Supabase mas ainda não cadastrado no app. Peça a um admin para te convidar.",
        )

    family_member_ids: frozenset[uuid.UUID] = frozenset()
    chief_result = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == user.id, FamilyMember.papel == "chefe")
    )
    chief_membership = chief_result.scalar_one_or_none()
    if chief_membership is not None:
        members_result = await db.execute(
            select(FamilyMember.user_id).where(FamilyMember.family_id == chief_membership.family_id)
        )
        family_member_ids = frozenset(row[0] for row in members_result.all())

    return CurrentUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        family_member_ids=family_member_ids,
    )


async def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem fazer isso")
    return current_user


def resolve_target_user_id(requested_user_id: uuid.UUID | None, current_user: CurrentUser) -> uuid.UUID:
    """Admins podem consultar/editar dados de qualquer usuário via ?user_id=.
    O Chefe da Família pode consultar/editar dados dos membros do seu grupo.
    Demais usuários só podem acessar os próprios dados."""
    if requested_user_id is None or requested_user_id == current_user.id:
        return current_user.id
    if current_user.is_admin or requested_user_id in current_user.family_member_ids:
        return requested_user_id
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você só pode acessar seus próprios dados")
