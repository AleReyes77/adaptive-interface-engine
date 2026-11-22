import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { TOPICS, type TopicId } from "@/content/topics";

/**
 * Optional AI rewording of authored explanations.
 *
 * Privacy contract: the request carries only a topic id and a level, both from closed lists.
 * The prompt is built server-side from authored text, so nothing about the reader, and nothing
 * the reader typed, can reach the model.
 */

const MODEL = "claude-opus-5-5";
const CACHE_TTL_MS = 60 * 60 * 1000;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 20 };

const LEVEL_GUIDE = {
  expert:
    "for an operator who already knows distributed systems: dense, precise, technical terms allowed, at most 40 words",
  standard:
    "for a developer who is new to this system: plain technical language, one short paragraph, at most 70 words",
  simplified:
    "for someone with no technical background: everyday words, no jargon, a concrete comparison if it helps, at most 90 words",
} as const;

const SYSTEM_PROMPT = `You reword short explanations for the help panel of an infrastructure console.
Keep every fact in the source text and add no new facts, numbers or advice.
Reply with the reworded paragraph only: no preamble, no headings, no markdown.`;

const topicIds = Object.keys(TOPICS) as [TopicId, ...TopicId[]];

const requestSchema = z.strictObject({
  topicId: z.enum(topicIds),
  level: z.enum(["expert", "standard", "simplified"]),
});

const cache = new Map<string, { text: string; expires: number }>();
const hits = new Map<string, number[]>();

function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** A small per-client limiter. In-memory, so it is per instance: enough for a demo deployment. */
function allow(client: string, now = Date.now()): boolean {
  const recent = (hits.get(client) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(client, recent);
    return false;
  }
  recent.push(now);
  hits.set(client, recent);
  return true;
}

let client: Anthropic | null = null;

export function GET() {
  return Response.json({ available: hasCredentials() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body with topicId and level." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Unknown topic or level." }, { status: 400 });
  }
  if (!hasCredentials()) {
    return Response.json({ error: "AI rewording is not configured." }, { status: 501 });
  }

  const { topicId, level } = parsed.data;
  const key = `${topicId}:${level}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return Response.json({ text: cached.text });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(ip)) {
    return Response.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const topic = TOPICS[topicId];
  client ??= new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4_000,
      // A short rewrite does not need deep reasoning.
      output_config: { effort: "low" },
      // If a safety classifier declines, the API retries on a suitable model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Reword this explanation ${LEVEL_GUIDE[level]}.

<source>
${topic.standard}
</source>

<reference_versions>
Condensed: ${topic.expert}
Plain language: ${topic.simplified}
</reference_versions>`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "The rewrite was declined." }, { status: 502 });
    }

    const text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim();
    if (!text) return Response.json({ error: "Empty rewrite." }, { status: 502 });

    cache.set(key, { text, expires: Date.now() + CACHE_TTL_MS });
    return Response.json({ text });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "The AI service is busy." }, { status: 503 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "AI credentials are invalid." }, { status: 501 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: "The AI service failed." }, { status: 502 });
    }
    throw error;
  }
}
