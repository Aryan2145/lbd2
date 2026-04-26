import { NextRequest } from "next/server";

// Simulates Claude's streaming response.
// In production, this proxies to the Nest.js backend which calls the Claude API.
export async function POST(req: NextRequest) {
  const { roles } = await req.json();

  // Build the statement from role inputs — deterministic mock for now.
  // The real backend sends this prompt to Claude and streams back the response.
  const statement = buildPurposeStatement(roles);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const words = statement.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? "" : " ") + words[i];
        controller.enqueue(encoder.encode(chunk));
        // Variable delay to simulate natural language generation rhythm
        await delay(40 + Math.random() * 35);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildPurposeStatement(_roles: Record<string, string>): string {
  // Static high-quality mock statement — replace with live Claude call in backend.
  return (
    "I live to build a legacy so deeply rooted in love and discipline that " +
    "my family carries its warmth for generations, and every person I lead " +
    "rises further because of how I chose to show up. I rise each morning " +
    "to prove that ambition and presence are not in conflict — they are the " +
    "same force, expressed differently across every role life has entrusted " +
    "to me. My truest measure of success is not what I built, but the " +
    "character of the people who stood beside me while I built it."
  );
}
