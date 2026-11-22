import type { Metadata } from "next";
import { PrivacyCenter } from "./privacy-center";

export const metadata: Metadata = {
  title: "Privacy and control",
  description: "Choose what the engine may observe, see what is stored, download it or delete it.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 pb-40 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Privacy and control</h1>
      <p className="mt-3 max-w-[62ch] text-lg text-ink-muted">
        The engine adapts the interface only with your permission, only from the kinds of
        interaction you allow, and only inside this browser.
      </p>
      <div className="mt-10">
        <PrivacyCenter />
      </div>
    </main>
  );
}
