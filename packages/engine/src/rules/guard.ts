/**
 * Defense in depth against personal inference.
 *
 * The primary guarantee is structural: rules can only read interaction signals and only write
 * interface dimensions, so there is nowhere to store a conclusion about a person. This guard adds
 * a second line: rule text that talks about diagnoses, disabilities, health, age or other personal
 * traits is rejected, so such a rule cannot even be proposed, in English or Spanish.
 */
const FORBIDDEN_TERMS: readonly RegExp[] = [
  // English
  /\bdiagnos\w*/,
  /\bdisabilit\w*/,
  /\bdisabled\b/,
  /\bimpair\w*/,
  /\bdyslexi\w*/,
  /\bdyscalcul\w*/,
  /\badhd\b/,
  /\bautis\w*/,
  /\basperger\w*/,
  /\bdementia\b/,
  /\balzheimer\w*/,
  /\bparkinson\w*/,
  /\bcognitive\b/,
  /\bneuro(?:diverg|typ)\w*/,
  /\biq\b/,
  /\bintelligence\b/,
  /\banxi\w*/,
  /\bdepress(?:ed|ion|ive)\b/,
  /\bmental\b/,
  /\bhealth\w*/,
  /\bill(?:ness)?\b/,
  /\bdisorders?\b/,
  /\bsyndromes?\b/,
  /\bmedical\w*/,
  /\bmedication\w*/,
  /\bage[ds]?\b/,
  /\belderly\b/,
  /\bseniors?\b/,
  /\bgender\w*/,
  /\bethnic\w*/,
  /\breligio\w*/,
  /\bpregnan\w*/,
  /\bpersonality\b/,
  /\bmood\w*/,
  // Spanish (accents are stripped before matching)
  /\bdiscapaci\w*/,
  /\bdeterioro\b/,
  /\bdislexi\w*/,
  /\bdiscalculi\w*/,
  /\btdah\b/,
  /\bautist\w*/,
  /\bdemencia\b/,
  /\bcognitiv\w*/,
  /\bansiedad\b/,
  /\bansios[oa]s?\b/,
  /\bdepresi\w*/,
  /\bsalud\b/,
  /\benferm\w*/,
  /\btrastorno\w*/,
  /\bsindrome\w*/,
  /\bmedic[oa]s?\b/,
  /\bedad\b/,
  /\bancian[oa]s?\b/,
  /\bgenero\b/,
  /\betnia\w*/,
  /\bembaraz\w*/,
  /\bpersonalidad\b/,
  /\bemocion\w*/,
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Returns the forbidden terms found in a rule's id and description (empty when the rule is clean). */
export function findPersonalInference(rule: {
  readonly id: string;
  readonly description: string;
}): string[] {
  const text = normalize(`${rule.id.replaceAll("-", " ")} ${rule.description}`);
  const found = new Set<string>();
  for (const pattern of FORBIDDEN_TERMS) {
    const match = pattern.exec(text);
    if (match) found.add(match[0]);
  }
  return [...found];
}
