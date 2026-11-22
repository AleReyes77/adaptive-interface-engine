import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console/console-shell";

export const metadata: Metadata = {
  title: "Console",
  description:
    "A fictional operations console that adapts explanations, form help, process layout and confirmations to how it is being used.",
};

export default function ConsolePage() {
  return <ConsoleShell />;
}
