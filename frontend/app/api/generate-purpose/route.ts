import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiLimiter } from "../_lib/rateLimiter";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Singleton — one client for the lifetime of the process
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model  = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: NextRequest) {
  // ── Rate limiting ───────────────────────────────────────────────────────────
  const limit = aiLimiter.check(clientIp(req));
  if (!limit.allowed) {
    return Response.json({ message: limit.message }, { status: 429 });
  }

  const { areas } = await req.json() as {
    areas: { id: string; name: string; text: string }[];
  };

  const filled = areas.filter(a => a.text?.trim());
  if (filled.length === 0) {
    return Response.json(
      { message: "Add your vision to at least one area before generating." },
      { status: 400 }
    );
  }

  // ── Build prompt ────────────────────────────────────────────────────────────
  const areaContext = filled
    .map(a => `- ${a.name}: ${a.text.trim()}`)
    .join("\n");

  const prompt = `You are a life purpose coach. Based on this person's 10-year vision across their life areas, craft a single powerful personal purpose statement.

Rules:
- First-person, present tense — write as if it is already true
- 2–3 sentences, deeply personal and specific to their vision
- Poetic but clear — no corporate jargon
- Do NOT use openers like "I am committed to", "I strive to", or "My mission is"
- Return only the purpose statement — no intro, no quotes, no explanation

Their vision:
${areaContext}`;

  // ── Stream Gemini response ──────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
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
