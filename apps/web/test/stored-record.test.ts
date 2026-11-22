import { describe, expect, it } from "vitest";
import { describeStoredRecord } from "@/lib/stored-record";

describe("describeStoredRecord", () => {
  it("reports an empty record", () => {
    expect(describeStoredRecord(null)).toEqual({ kind: "empty" });
  });

  it("pretty-prints a valid record", () => {
    expect(describeStoredRecord('{"decided":true}')).toEqual({
      kind: "json",
      text: '{\n  "decided": true\n}',
    });
  });

  it("does not throw on a corrupted record, and shows it as unreadable", () => {
    expect(describeStoredRecord("{bad")).toEqual({ kind: "unreadable", raw: "{bad" });
  });
});
