import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

describe("engine architecture", () => {
  const files = sourceFiles(SRC);

  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files)("%s does not depend on a UI framework or browser globals", (file) => {
    // Comments may mention words like "window", so only code is checked.
    const code = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/from\s+["'](react|react-dom|next)(\/[^"']*)?["']/);
    expect(code).not.toMatch(/\b(window|document|localStorage|sessionStorage|navigator)\./);
  });
});
