"use client";

import type { DimensionValue } from "@aie/engine";
import { useCallback, useState } from "react";
import { useDimension, useTrack } from "../hooks";

export type ConfirmationLevel = DimensionValue<"confirmation">;

export interface IrreversibleConfirmationOptions {
  readonly actionId: string;
  /** The exact name the person must type at the strict level. */
  readonly resourceName: string;
}

export interface IrreversibleConfirmation {
  /** The level of the open dialog (locked when it opened), or the live level when closed. */
  readonly level: ConfirmationLevel;
  readonly isOpen: boolean;
  readonly requiresAcknowledgement: boolean;
  readonly requiresTypedName: boolean;
  readonly typed: string;
  readonly acknowledged: boolean;
  readonly canConfirm: boolean;
  request(): void;
  cancel(): void;
  /** Returns true when the action may proceed. */
  confirm(): boolean;
  setTyped(value: string): void;
  setAcknowledged(value: boolean): void;
}

/**
 * Headless logic for confirming an irreversible action.
 *
 * - standard: a plain confirmation.
 * - elevated: the person must acknowledge the consequences.
 * - strict: the person must type the resource name.
 *
 * The level is locked when the dialog opens, so the requirements never change under someone's
 * cursor, even if the profile changes while the dialog is open.
 */
export function useIrreversibleConfirmation({
  actionId,
  resourceName,
}: IrreversibleConfirmationOptions): IrreversibleConfirmation {
  const live = useDimension("confirmation");
  const track = useTrack();
  const [locked, setLocked] = useState<ConfirmationLevel | null>(null);
  const [typed, setTyped] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const level = locked ?? live;
  const requiresAcknowledgement = level === "elevated";
  const requiresTypedName = level === "strict";
  const canConfirm =
    locked !== null &&
    (!requiresAcknowledgement || acknowledged) &&
    (!requiresTypedName || typed.trim() === resourceName);

  const request = useCallback(() => {
    setLocked(live);
    setTyped("");
    setAcknowledged(false);
    track({ type: "irreversible.requested", actionId });
  }, [live, track, actionId]);

  const cancel = useCallback(() => {
    if (locked === null) return;
    setLocked(null);
    track({ type: "irreversible.cancelled", actionId });
  }, [locked, track, actionId]);

  const confirm = useCallback(() => {
    if (!canConfirm) return false;
    setLocked(null);
    track({ type: "irreversible.confirmed", actionId });
    return true;
  }, [canConfirm, track, actionId]);

  return {
    level,
    isOpen: locked !== null,
    requiresAcknowledgement,
    requiresTypedName,
    typed,
    acknowledged,
    canConfirm,
    request,
    cancel,
    confirm,
    setTyped,
    setAcknowledged,
  };
}
