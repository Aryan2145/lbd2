import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiLimiter } from "../_lib/rateLimiter";

const ROLE_LABELS: Record<string, { title: string; question: string }> = {
  spouse:    { title: "Partner",          question: "How do I want to be remembered as a partner?" },
  child:     { title: "Children",         question: "What values do I want my children to say I embodied?" },
  parent:    { title: "Parents",          question: "How do I honor my parents through my actions?" },
  colleague: { title: "Colleagues",       question: "What was my professional reputation among peers?" },
  friend:    { title: "Friends",          question: "What kind of friend was I during their hardest times?" },
  social:    { title: "Community Leader", question: "What impact did I leave on my community?" },
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model  = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

  const { roles } = await req.json() as { roles: Record<string, string> };

  const filled = Object.entries(roles).filter(([, text]) => text?.trim());
  if (filled.length === 0) {
    return Response.json({ message: "Fill in at least one role before synthesizing." }, { status: 400 });
  }

  // ── Build prompt ────────────────────────────────────────────────────────────
  const roleContext = filled.map(([id, text]) => {
    const meta = ROLE_LABELS[id];
    return meta
      ? `- ${meta.title} (${meta.question})\n  "${text.trim()}"`
      : `- ${id}: "${text.trim()}"`;
  }).join("\n");

  const prompt = `You are a life purpose coach helping someone define their personal legacy and life purpose.

Based on how this person wants to be remembered across their most important roles, craft a single powerful personal purpose statement.

Rules:
- First-person, present tense — write as if it is already true
- 2–3 sentences, deeply personal and specific to THEIR words — do not be generic
- Poetic but grounded — draw from the specific things they wrote
- Do NOT use openers like "I am committed to", "I strive to", or "My mission is"
- Do NOT use the word "legacy" as the first word
- Return only the purpose statement — no intro, no quotes, no explanation

How they want to be remembered across their roles:
${roleContext}`;

  // ── Stream Gemini response ──────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch {
        controller.enqueue(encoder.encode("Generation failed. Please try again."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
