import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { aiLimiter } from "../_lib/rateLimiter";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
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

  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        });
        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        console.error("[generate-purpose] Claude error:", err);
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
