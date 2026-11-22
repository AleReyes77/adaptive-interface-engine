import Link from "next/link";
import { Commitments } from "@/components/commitments";
import { HeroDemo } from "@/components/hero-demo";

const REPO_URL = "https://github.com/AleReyes77/adaptive-interface-engine";

const PIPELINE = [
  {
    title: "Observe",
    body: "Only the interaction events you allowed: help opened, a field rejected (as a code), a step that took 40 seconds, keyboard in use.",
  },
  {
    title: "Measure",
    body: "Seven signals with time decay. Recent behavior counts most and old behavior fades within minutes, so one bad moment is not a label.",
  },
  {
    title: "Decide",
    body: "Declarative rules map signals to interface changes. Each rule carries the sentence you read when you ask why something changed.",
  },
  {
    title: "Stabilize",
    body: "Extra help arrives at once. It is withdrawn only after the pattern has held for 20 seconds, so the interface never flickers.",
  },
  {
    title: "Explain",
    body: "Every adapted area is marked in the margin and explains itself, with a one-click way back to the standard version.",
  },
];

const DIMENSIONS = [
  [
    "Explanations",
    "You ask for help or go back repeatedly",
    "Plain-language wording instead of jargon",
  ],
  [
    "Instructions",
    "You finish steps quickly and without errors",
    "Routine instructions step aside",
  ],
  ["Field help", "A form keeps rejecting values", "Guidance appears next to every field"],
  ["Navigation", "You mostly use the keyboard", "Shortcut hints and stronger focus outlines"],
  [
    "Process layout",
    "A multi-step process causes back-and-forth",
    "One step at a time, with progress",
  ],
  [
    "Risky actions",
    "You move fast, or hesitate, near an irreversible action",
    "Typing the name, or confirming consequences",
  ],
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-32 sm:px-6">
      <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <h1 className="max-w-[16ch] text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Interfaces that adapt to how people use them.
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg text-ink-muted">
            Most interfaces look the same on day one and in year five. The Adaptive Interface Engine
            notices friction, like repeated help requests, rejected fields or back-and-forth in a
            process, and adjusts explanations, help and confirmations to match. Every change is
            explained and reversible, and it all runs in the browser.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/console"
              className="rounded-md bg-ink px-5 py-2.5 font-semibold text-paper hover:opacity-90"
            >
              Open the console
            </Link>
            <a
              href={REPO_URL}
              className="rounded-md border border-ink px-5 py-2.5 font-semibold hover:bg-sunken"
            >
              Read the source
            </a>
          </div>
        </div>
        <HeroDemo />
      </section>

      <section aria-labelledby="how" className="border-t border-line py-14">
        <h2 id="how" className="text-2xl font-bold sm:text-3xl">
          How it decides
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-5 md:gap-6">
          {PIPELINE.map((step, i) => (
            <li key={step.title} className="relative">
              <span className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full border-2 border-ink font-bold">
                  {i + 1}
                </span>
                <span className="text-lg font-bold">{step.title}</span>
              </span>
              <p className="mt-3 text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="adapts" className="border-t border-line py-14">
        <h2 id="adapts" className="text-2xl font-bold sm:text-3xl">
          What it can change
        </h2>
        <p className="mt-3 max-w-[62ch] text-ink-muted">
          The engine can only touch these six parts of the interface. Nothing else is in its
          vocabulary, so there is nowhere to store a conclusion about a person.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-start">
            <thead>
              <tr className="border-b-2 border-ink text-start">
                <th scope="col" className="py-2 pe-6 text-start font-bold">
                  Part
                </th>
                <th scope="col" className="py-2 pe-6 text-start font-bold">
                  Changes when
                </th>
                <th scope="col" className="py-2 text-start font-bold">
                  What you see
                </th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map(([part, when, what]) => (
                <tr key={part} className="border-b border-line align-top">
                  <th scope="row" className="py-3 pe-6 text-start font-semibold">
                    {part}
                  </th>
                  <td className="py-3 pe-6 text-ink-muted">{when}</td>
                  <td className="py-3">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="never" className="border-t border-line py-14">
        <h2 id="never" className="text-2xl font-bold sm:text-3xl">
          What it will never do
        </h2>
        <div className="mt-8">
          <Commitments />
        </div>
      </section>

      <footer className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-8 text-sm text-ink-muted">
        <span>Built by Jose Alejandro Varela Reyes. MIT licensed.</span>
        <a href={REPO_URL} className="underline underline-offset-4 hover:text-ink">
          Source on GitHub
        </a>
        <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
          Privacy and control
        </Link>
      </footer>
    </main>
  );
}
