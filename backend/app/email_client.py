"""Envio de e-mails transacionais via Resend.

Em produção, convite e reset de senha idealmente são gerados/controlados pelo
Supabase Auth (token, expiração, segurança) — só a entrega passa a ser pelo
Resend, configurado como SMTP no painel do Supabase. As funções de convite e
reset aqui são para o modo local (sem Supabase) e para testar o template.

Envio é "best-effort": se RESEND_API_KEY não estiver configurada, ou o envio
falhar, isso é apenas registrado em log — nunca derruba o fluxo que criou o
usuário.
"""

import logging

import resend

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_configured = False

_WRAPPER = """
<div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #0b0b0b;">
  {body}
</div>
""".strip()

_FOOTER = """
<p style="font-size: 14px; line-height: 1.6; color: #52514e;">Equipe Team Fit</p>
""".strip()


def _ensure_configured() -> bool:
    global _configured
    if not settings.resend_api_key:
        return False
    if not _configured:
        resend.api_key = settings.resend_api_key
        _configured = True
    return True


def _send(to_email: str, subject: str, body_html: str, contexto: str) -> None:
    if not _ensure_configured():
        logger.info("RESEND_API_KEY não configurada — pulando e-mail de %s para %s", contexto, to_email)
        return
    try:
        resend.Emails.send(
            {
                "from": settings.resend_from_email,
                "to": [to_email],
                "subject": subject,
                "html": _WRAPPER.format(body=body_html),
            }
        )
    except Exception:
        # Best-effort: falha no envio nunca deve impedir a ação que disparou o e-mail.
        logger.exception("Falha ao enviar e-mail de %s para %s", contexto, to_email)


def send_welcome_email(to_email: str, full_name: str) -> None:
    body = f"""
    <h1 style="font-size: 20px;">Bem-vindo(a) ao Team Fit, {full_name}!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #52514e;">
      Sua conta foi criada. Para começar, preencha seu perfil de saúde e depois vá até o
      <strong>Chat</strong> conversar com a nutricionista — ela avalia seu perfil e monta
      seu plano alimentar automaticamente.
    </p>
    {_FOOTER}
    """
    _send(to_email, "Bem-vindo(a) ao Team Fit!", body, "boas-vindas")


def send_invite_email(to_email: str, full_name: str, invited_by: str, app_url: str) -> None:
    body = f"""
    <h1 style="font-size: 20px;">{invited_by} te convidou para o Team Fit</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #52514e;">
      Olá, {full_name}! Você agora tem acesso ao Team Fit, o app de acompanhamento de saúde,
      nutrição e treino.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #52514e;">
      Acesse <a href="{app_url}">{app_url}</a> e entre com este e-mail ({to_email}) para começar.
    </p>
    {_FOOTER}
    """
    _send(to_email, f"{invited_by} te convidou para o Team Fit", body, "convite")


def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> None:
    body = f"""
    <h1 style="font-size: 20px;">Redefinir sua senha</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #52514e;">
      Olá, {full_name}! Recebemos um pedido para redefinir a senha da sua conta no Team Fit.
    </p>
    <p style="font-size: 14px; line-height: 1.6;">
      <a href="{reset_link}" style="background:#2a78d6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
        Redefinir senha
      </a>
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #898781;">
      Se você não pediu isso, pode ignorar este e-mail com segurança.
    </p>
    {_FOOTER}
    """
    _send(to_email, "Redefinir sua senha — Team Fit", body, "redefinição de senha")
