import { NextRequest } from "next/server";
import { aiLimiter } from "../_lib/rateLimiter";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  // ── Rate limiting ───────────────────────────────────────────────────────────
  const limit = aiLimiter.check(clientIp(req));
  if (!limit.allowed) {
    return Response.json({ message: limit.message }, { status: 429 });
  }

  const { areas } = await req.json() as { areas: { id: string; name: string; text: string }[] };

  // ── Generate statement ──────────────────────────────────────────────────────
  // TODO: replace `mockGenerate` with real Gemini call once API key is set.
  // Swap out only this function — everything else (streaming, rate limiting) stays.
  const statement = mockGenerate(areas);

  // ── Stream response word-by-word ────────────────────────────────────────────
  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      const words = statement.split(" ");
      for (let i = 0; i < words.length; i++) {
        controller.enqueue(encoder.encode((i === 0 ? "" : " ") + words[i]));
        await new Promise(r => setTimeout(r, 40 + Math.random() * 30));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ── Mock (replace with Gemini) ─────────────────────────────────────────────────
// When Gemini is ready, delete this function and call the Gemini SDK here instead.
// The prompt to pass: build it from `areas` — each area's name + text as context.
function mockGenerate(areas: { name: string; text: string }[]): string {
  const filled = areas.filter(a => a.text?.trim());
  if (filled.length === 0) {
    return "Define your vision in each life area first, then generate your purpose statement.";
  }
  return (
    "I live with deep intention across every dimension of life — building a legacy " +
    "of purpose, presence, and contribution that outlasts my years and uplifts " +
    "every person I have the privilege to walk alongside."
  );
}
