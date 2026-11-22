import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/explain/route";

function post(body: unknown, ip = "203.0.113.7") {
  return POST(
    new Request("http://localhost/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("/api/explain", () => {
  const saved = { key: process.env.ANTHROPIC_API_KEY, token: process.env.ANTHROPIC_AUTH_TOKEN };

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
  });

  afterEach(() => {
    if (saved.key !== undefined) process.env.ANTHROPIC_API_KEY = saved.key;
    if (saved.token !== undefined) process.env.ANTHROPIC_AUTH_TOKEN = saved.token;
  });

  it("reports that AI rewording is unavailable without credentials", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ available: false });
  });

  it("rejects anything other than a known topic and level", async () => {
    expect((await post({ topicId: "replication", level: "simplified", note: "hi" })).status).toBe(
      400,
    );
    expect((await post({ topicId: "../etc/passwd", level: "expert" })).status).toBe(400);
    expect((await post({ topicId: "replication", level: "loud" })).status).toBe(400);
    expect((await post("{not json")).status).toBe(400);
  });

  it("answers 501 for a valid request when no credentials are configured", async () => {
    const response = await post({ topicId: "replication", level: "simplified" });
    expect(response.status).toBe(501);
  });
});
