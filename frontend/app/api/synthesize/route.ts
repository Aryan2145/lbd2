import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { aiLimiter } from "../_lib/rateLimiter";

const ROLE_LABELS: Record<string, { title: string; question: string; trigger: string }> = {
  spouse: {
    title: "Partner",
    question: "How do I want to be remembered as a partner?",
    trigger: "Your partner is sitting alone in a coffee shop, thinking about you. What do you want to be true in their mind in that moment?",
  },
  child: {
    title: "Children",
    question: "What do I want my children to carry from me?",
    trigger: "Your child is now a parent themselves, putting their own child to sleep and thinking about you. What do you want them to be feeling about you?",
  },
  parent: {
    title: "Parents",
    question: "How do I honor my parents through my actions?",
    trigger: "Your mother or father is sitting in their favourite chair at home, quietly looking at an old photo of you. What do you want to be going through their mind?",
  },
  colleague: {
    title: "Colleagues",
    question: "What was my professional reputation among peers?",
    trigger: "Someone who worked with you for years is in a job interview. They are asked — who is the one person who shaped how you work? What do you want them to say about you?",
  },
  friend: {
    title: "Friends",
    question: "What kind of friend was I during their hardest times?",
    trigger: "Your friend group is having a get-together. You are the only one missing. Your name comes up. What do you want them to be saying about you?",
  },
  social: {
    title: "Community",
    question: "What impact did I leave on my community?",
    trigger: "A community leader is reviewing the list of people who could work on an important event. Your name shows up. The leader stops for a while, thinking about you. What do you want to be going through their mind?",
  },
};

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

  const { roles } = await req.json() as { roles: Record<string, string> };

  const filled = Object.entries(roles).filter(([, text]) => text?.trim());
  if (filled.length === 0) {
    return Response.json({ message: "Fill in at least one role before synthesizing." }, { status: 400 });
  }

  const roleContext = filled.map(([id, text]) => {
    const meta = ROLE_LABELS[id];
    return meta
      ? `ROLE — ${meta.title}\nTHEY WROTE: "${text.trim()}"\nTRIGGER: ${meta.trigger}`
      : `ROLE — ${id}\nTHEY WROTE: "${text.trim()}"`;
  }).join("\n\n");

  const prompt = `You are helping someone uncover the single sentence that captures the story their life is being written to tell — not what they do, not how they behave, but the deeper reason their life is moving in the direction it is moving.

The person was given six imaginative situations. In each one, someone close to them is in a private moment, and the person was asked what they want to be true in that moment. Their answers reveal not just who they are today, but the story their life is still being written to tell. Your job is to find the single thread running through all six answers — the deeper WHY that connects everything they wrote.

Before writing the sentence, identify the nature of this person in one word — are they a builder, a protector, a challenger, a nurturer, a connector, a teacher, a witness, or something else? Use this word silently as your compass. Do not include it in the output.

Then ask yourself — given this nature, what is the irreducible purpose this person is here to serve? That is the WHY.

Your output must follow every rule below without exception:

RULES:
1. Return exactly ONE sentence of maximum 15 words. Count the words before outputting. If you exceed 15 words, cut until you reach 15. If you write two sentences you have completely failed.
2. Write in first person, present tense — as a living direction the person is walking in, not a destination already reached.
3. Capture WHY this person exists, not HOW they behave. Go straight to the WHY — do not open by listing or summarizing what they wrote.
4. You MUST use at least one specific word, phrase, or image directly taken from what they wrote. Do not invent language they did not use.
5. The sentence must be specific enough that it could ONLY belong to this person. If it could fit anyone, rewrite it.
6. Start with a person, a moment, or a plain action — never an abstraction. Do not open with "I am", "I create", "I strive", "Something of me", "A part of me", or any phrase that starts in the air rather than on the ground. Never use the constructions "something of me", "a part of me", "lives in", "lives quietly", or any phrase that replaces a real meaning with a vague poetic feeling.
7. Write the way a normal person speaks while having chai with a close friend. No poetic words, no literary phrasing, no words that sound beautiful but feel distant. If a word feels even slightly elevated, replace it.
8. Every word must carry the same emotional tone. Read the sentence and find the one word that feels heavier or more strained than the rest — replace it until the whole sentence breathes together.

Self-check before outputting: Count your words — is it under 15? Could a completely different person have written this? Would a 12 year old understand it instantly? If any answer is wrong, rewrite.

Return only the single sentence — no intro, no quotes, no explanation.

The person's answers across their six roles:
${roleContext}`;

  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 80,
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
        console.error("[synthesize] Claude error:", err);
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
