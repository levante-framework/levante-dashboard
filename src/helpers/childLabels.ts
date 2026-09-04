/**
 * Returns the uppercase Latin letter (A–Z) for the given zero-based index.
 * Indexes of 26 or greater wrap around (e.g. 0 → "A", 25 → "Z", 26 → "A").
 */
export function getChildLetter(childLabelIndex: number): string {
  return String.fromCharCode(65 + (childLabelIndex % 26));
}

/** Returns a "Child X" label (e.g. "Child A"), or "" if the index is not a number. */
export function getChildLabel(childLabelIndex: unknown): string {
  if (typeof childLabelIndex !== 'number') return '';
  return `Child ${getChildLetter(childLabelIndex)}`;
}
