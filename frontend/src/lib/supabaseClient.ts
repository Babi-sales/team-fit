import { createClient } from "@supabase/supabase-js";

// Fallback só evita quebrar o build/SSR quando as env vars ainda não foram
// configuradas — em produção, NEXT_PUBLIC_SUPABASE_URL/ANON_KEY são obrigatórias.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
