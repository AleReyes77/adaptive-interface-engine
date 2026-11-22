const COMMITMENTS = [
  {
    title: "It never guesses who you are",
    body: "No diagnosis, disability, age or personal trait is inferred. Signals describe what happened in the interface, and rules that mention a personal trait are rejected before they can run.",
  },
  {
    title: "It never records what you type",
    body: "Events carry field names and error codes like “range”, never values. Identifiers that look like names or emails are dropped.",
  },
  {
    title: "It never sends your behavior anywhere",
    body: "Observations live in this tab's memory and expire after 20 minutes. Only your choices are saved on this device.",
  },
  {
    title: "It never changes things silently",
    body: "Every adapted area is marked and explains why. You can keep the standard version, pin any setting, pause, or delete everything.",
  },
];

export function Commitments() {
  return (
    <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
      {COMMITMENTS.map((c) => (
        <li key={c.title} className="border-s-2 border-ink ps-4">
          <h3 className="font-bold">{c.title}</h3>
          <p className="mt-1 text-ink-muted">{c.body}</p>
        </li>
      ))}
    </ul>
  );
}
