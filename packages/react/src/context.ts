import type { AdaptiveEngine, ConsentState } from "@aie/engine";
import { createContext } from "react";

export interface ConsentControls {
  /**
   * Whether the person answered the consent prompt.
   * `undefined` while rendering on the server or hydrating, when stored choices are not known yet.
   */
  readonly decided: boolean | undefined;
  /** Records the person's answer to the consent prompt. */
  decide(consent: Partial<ConsentState>): void;
  /** Deletes observations, choices and stored data, and asks for consent again. */
  eraseAll(): void;
}

export interface AdaptiveContextValue extends ConsentControls {
  readonly engine: AdaptiveEngine;
}

export const AdaptiveContext = createContext<AdaptiveContextValue | null>(null);
