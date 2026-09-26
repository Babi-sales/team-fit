const API_URL = process.env.NEXT_PUBLIC_API_URL!;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Network calls sometimes fail transiently (browser extension intercepting
// fetch, a wifi blip) before ever reaching the server — a second attempt
// usually resolves it without the user having to do anything.
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
    ...(options.headers ?? {}),
  };
  const res = await fetchWithRetry(`${API_URL}${path}`, { ...options, headers, credentials: "include" });
  if (!res.ok) {
    const body = await res.text();
    // FastAPI returns {"detail": "..."} — use that message directly instead
    // of dumping raw JSON on screen.
    let message = `${res.status}: ${body}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.detail) {
        message = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
      }
    } catch {
      // body isn't JSON — keep the raw message
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function withPerson(path: string, person: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}person=${person}`;
}
