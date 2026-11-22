import type { Modality } from "@aie/engine";
import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { installModalityTracking } from "../src/modality";

function track(options?: { throttleMs?: number; now?: () => number }) {
  const reports: Modality[] = [];
  const uninstall = installModalityTracking(window, (m) => reports.push(m), options);
  return { reports, uninstall };
}

let uninstall: () => void = () => {};
afterEach(() => uninstall());

describe("installModalityTracking", () => {
  it("reports keyboard navigation, shortcuts and pointer and touch input", () => {
    let now = 0;
    const t = track({ throttleMs: 1_000, now: () => (now += 5_000) });
    uninstall = t.uninstall;
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.pointerDown(window, { pointerType: "mouse" });
    fireEvent.pointerDown(window, { pointerType: "touch" });
    expect(t.reports).toEqual(["keyboard", "keyboard", "pointer", "touch"]);
  });

  it("treats typing in a text field as typing, but Tab as navigation", () => {
    let now = 0;
    const t = track({ now: () => (now += 5_000) });
    uninstall = t.uninstall;
    const input = document.createElement("input");
    document.body.append(input);
    fireEvent.keyDown(input, { key: "ArrowLeft" });
    fireEvent.keyDown(input, { key: "a" });
    expect(t.reports).toEqual([]);
    fireEvent.keyDown(input, { key: "Tab" });
    expect(t.reports).toEqual(["keyboard"]);
    input.remove();
  });

  it("treats arrow keys on a checkbox as navigation", () => {
    const t = track();
    uninstall = t.uninstall;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    document.body.append(checkbox);
    fireEvent.keyDown(checkbox, { key: "ArrowDown" });
    expect(t.reports).toEqual(["keyboard"]);
    checkbox.remove();
  });

  it("throttles repeated reports of the same modality", () => {
    let now = 0;
    const t = track({ throttleMs: 1_000, now: () => now });
    uninstall = t.uninstall;
    fireEvent.keyDown(window, { key: "Tab" });
    now = 500;
    fireEvent.keyDown(window, { key: "Tab" });
    now = 1_000;
    fireEvent.keyDown(window, { key: "Tab" });
    expect(t.reports).toEqual(["keyboard", "keyboard"]);
  });

  it("stops listening once uninstalled", () => {
    const t = track();
    t.uninstall();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(t.reports).toEqual([]);
  });
});
