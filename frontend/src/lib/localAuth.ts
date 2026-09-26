// Login local sem Supabase — só funciona se o backend estiver com
// LOCAL_AUTH_ENABLED=true. Usar apenas em desenvolvimento.

const TOKEN_KEY = "teamfit_local_token";

export const LOCAL_AUTH = process.env.NEXT_PUBLIC_LOCAL_AUTH === "true";

export function getLocalToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export async function localLogin(email: string, fullName: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${apiUrl}/dev-auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, full_name: fullName }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.access_token);
}

export function localLogout(): void {
  localStorage.removeItem(TOKEN_KEY);
}
