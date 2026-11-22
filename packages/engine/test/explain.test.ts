import { describe, expect, it } from "vitest";
import { createStaticProvider, withFallback } from "../src/explain/provider";

const content = {
  replication: {
    expert: "Synchronous quorum replication, RF=3.",
    standard: "Each write is copied to three servers before it is confirmed.",
    simplified: "Your data is saved in three places, so losing one server loses nothing.",
  },
};

describe("explanation providers", () => {
  it("serves authored content for each level", async () => {
    const provider = createStaticProvider(content);
    await expect(
      provider.explain({ topicId: "replication", level: "simplified" }),
    ).resolves.toEqual({ text: content.replication.simplified, source: "static" });
  });

  it("rejects unknown topics", async () => {
    const provider = createStaticProvider(content);
    await expect(provider.explain({ topicId: "nope", level: "expert" })).rejects.toThrow(/nope/);
  });

  it("falls back when the primary provider fails", async () => {
    const failing = { explain: () => Promise.reject(new Error("offline")) };
    const provider = withFallback(failing, createStaticProvider(content));
    await expect(provider.explain({ topicId: "replication", level: "expert" })).resolves.toEqual({
      text: content.replication.expert,
      source: "static",
    });
  });
});
