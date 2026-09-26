import { getLocalToken, LOCAL_AUTH } from "./localAuth";
import { supabase } from "./supabaseClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function authHeader(): Promise<Record<string, string>> {
  if (LOCAL_AUTH) {
    const token = getLocalToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Chamadas de rede às vezes falham na hora (extensão do navegador
// interceptando fetch, blip de wifi) antes mesmo de chegar no servidor —
// uma segunda tentativa costuma resolver sem o usuário precisar fazer nada.
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    await sleep(400);
    return fetch(url, init);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(options.headers ?? {}),
  };
  const res = await fetchWithRetry(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    // FastAPI devolve {"detail": "..."} — usa a mensagem direto quando dá,
    // em vez de jogar o JSON cru pra tela.
    let message = `${res.status}: ${body}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.detail) {
        message = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
      }
    } catch {
      // corpo não é JSON — mantém a mensagem crua
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function withUser(path: string, userId?: string | null): string {
  if (!userId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}user_id=${userId}`;
}
