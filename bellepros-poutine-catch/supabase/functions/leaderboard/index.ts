// Bellepro's Poutine Catch — leaderboard Edge Function
//   GET  -> top 10 scores
//   POST -> submit a score: { name, score, ts, nonce, sig }
//
// SECURITY: The HMAC secret is read from the HMAC_SECRET environment variable
// (configured via `supabase secrets set HMAC_SECRET=...`). It MUST NOT be embedded
// in client code — client-side secrets are trivially extractable. The previous
// implementation shipped the secret in this file AND in index.html (base64); both
// were removed on 2026-07-23 and the secret rotated.
//
// NOTE: Until the client is refactored to obtain a server-issued per-session token
// (e.g. via Supabase Auth + a signed-challenge endpoint), POST submissions will be
// rejected. The GET (read leaderboard) path is unaffected. This is the correct
// secure state — a broken leaderboard is preferable to a trivially forgeable one.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = Deno.env.get("HMAC_SECRET") ?? "";
if (!SECRET) {
  // Fail fast at cold-start if the operator forgot to set the secret.
  console.error("FATAL: HMAC_SECRET env var is not set. POST submissions disabled.");
}
const MAX_SCORE = 100000;
const REPLAY_WINDOW_MS = 5 * 60 * 1000;

// Origins allowed to call this function. Add production game domains here.
const ALLOWED_ORIGINS = new Set([
  "https://konstadinos1.github.io",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:7890",
]);

// light profanity guard (FR-Quebec + EN); blocked names fall back to "BELLEPRO"
const BAD = [
  "fuck","shit","bitch","cunt","nigger","nigga","faggot","fag","asshole","dick",
  "pussy","whore","slut","rape","nazi","hitler","cock","retard","bastard",
  "tabarnak","calisse","calice","osti","esti","crisse","viarge","colon",
  "putain","merde","salope","connard","encule","pute","bordel","conard",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://konstadinos1.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Content-Type": "application/json",
  };
}

function sanitizeName(raw: unknown): string {
  const src = (typeof raw === "string" ? raw : "").normalize("NFC");
  // drop control chars (code < 32 or 127) and angle brackets; collapse whitespace
  let out = "";
  for (const ch of src) {
    const c = ch.codePointAt(0) ?? 0;
    out += (c < 32 || c === 127 || ch === "<" || ch === ">") ? " " : ch;
  }
  const s = out.replace(/\s+/g, " ").trim().slice(0, 12);
  if (!s) return "BELLEPRO";
  if (BAD.some((w) => s.toLowerCase().includes(w))) return "BELLEPRO";
  return s;
}

async function hmacHex(msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function topTen(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("leaderboard").select("name,score")
    .order("score", { ascending: false }).order("created_at", { ascending: true })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

Deno.serve(async (req) => {
  const H = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (req.method === "GET") {
      return new Response(JSON.stringify({ top: await topTen(supabase) }), { headers: H });
    }

    if (req.method === "POST") {
      // Refuse writes if the operator has not provisioned the secret.
      if (!SECRET) {
        return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 503, headers: H });
      }
      const body = await req.json().catch(() => ({}));
      const rawName = body.name;
      const ts = Number(body.ts);
      const nonce = String(body.nonce ?? "");
      const sig = String(body.sig ?? "");
      let score = Number(body.score);

      if (!Number.isFinite(score)) {
        return new Response(JSON.stringify({ error: "bad_score" }), { status: 400, headers: H });
      }
      score = Math.floor(score);
      if (score < 0 || score > MAX_SCORE) {
        return new Response(JSON.stringify({ error: "score_out_of_range" }), { status: 400, headers: H });
      }
      if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > REPLAY_WINDOW_MS) {
        return new Response(JSON.stringify({ error: "stale" }), { status: 400, headers: H });
      }

      // verify the signature over exactly what the client signed (raw name)
      const expected = await hmacHex(`${String(rawName ?? "")}|${score}|${ts}|${nonce}`);
      if (!timingSafeEqual(expected, sig)) {
        return new Response(JSON.stringify({ error: "bad_signature" }), { status: 401, headers: H });
      }

      const name = sanitizeName(rawName);
      const { error: insErr } = await supabase.from("leaderboard").insert({ name, score });
      if (insErr) throw insErr;

      const { count } = await supabase
        .from("leaderboard").select("*", { count: "exact", head: true }).gt("score", score);
      const rank = (count ?? 0) + 1;

      return new Response(
        JSON.stringify({ ok: true, rank, name, top: await topTen(supabase) }),
        { headers: H },
      );
    }

    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500, headers: H });
  }
});
