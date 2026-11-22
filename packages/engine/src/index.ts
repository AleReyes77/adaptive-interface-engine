export {
  type AdaptiveEngine,
  createAdaptiveEngine,
  type EngineExport,
  type EngineOptions,
  type EngineSnapshot,
  NO_CONSENT_REASON,
  PAUSED_REASON,
} from "./engine";
export {
  createEventStore,
  DEFAULT_RETENTION_MS,
  DEFAULT_STORE_CAPACITY,
  type EventStore,
  type EventStoreOptions,
} from "./events/store";
export {
  CONSENT_CATEGORIES,
  type ConsentCategory,
  EVENT_CATEGORY,
  type InteractionEvent,
  type InteractionEventType,
  MAX_DURATION_MS,
  type Modality,
  sanitizeEvent,
  type TrackedEvent,
} from "./events/taxonomy";
export {
  createStaticProvider,
  type Explanation,
  type ExplanationContent,
  type ExplanationLevel,
  type ExplanationProvider,
  type ExplanationRequest,
  withFallback,
} from "./explain/provider";
export {
  type ConsentState,
  DEFAULT_CONSENT,
  hasAnyConsent,
  isCategoryAllowed,
} from "./privacy/consent";
export {
  type AdaptationProfile,
  DEFAULT_PROFILE,
  DIMENSION_KEYS,
  DIMENSIONS,
  type Dimension,
  type DimensionValue,
  isDimensionValue,
  type ProfilePatch,
  supportRank,
} from "./profile/dimensions";
export {
  DEFAULT_REASON,
  type DecisionMap,
  type DecisionSource,
  type DimensionDecision,
  OVERRIDE_REASON,
  type Resolution,
  resolveProfile,
} from "./profile/resolve";
export {
  createStabilizer,
  type PendingChange,
  type PendingChanges,
  type Stabilizer,
  type StabilizerOptions,
} from "./profile/stabilizer";
export { DEFAULT_RULES } from "./rules/defaults";
export { describeCondition } from "./rules/describe";
export { conditionSpecificity, evaluateCondition } from "./rules/evaluate";
export { findPersonalInference } from "./rules/guard";
export { type RuleValidation, validateRules } from "./rules/schema";
export type { Comparison, ComparisonOp, Condition, Rule } from "./rules/types";
export {
  computeSignals,
  DEFAULT_SIGNAL_CONFIG,
  SIGNAL_KEYS,
  type Signal,
  type SignalConfig,
  type SignalContext,
  type SignalKey,
  type SignalSnapshot,
} from "./signals/compute";
export { clamp01, decayWeight, saturate } from "./signals/decay";
