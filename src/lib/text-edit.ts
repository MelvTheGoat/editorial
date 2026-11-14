import type { WritingIssue } from '@/types';

/**
 * Find where an issue currently sits in the text.
 * Trusts the stored offsets if they still match; otherwise picks the occurrence
 * nearest to the stored offset (handles edits made after analysis). Returns -1 if gone.
 */
export function locateIssue(text: string, issue: Pick<WritingIssue, 'text' | 'startIndex' | 'endIndex'>): number {
  if (text.slice(issue.startIndex, issue.endIndex) === issue.text) return issue.startIndex;
  let best = -1;
  let from = 0;
  while (true) {
    const idx = text.indexOf(issue.text, from);
    if (idx === -1) break;
    if (best === -1 || Math.abs(idx - issue.startIndex) < Math.abs(best - issue.startIndex)) best = idx;
    from = idx + 1;
  }
  return best;
}

/**
 * Apply an issue's replacement to the text and shift every other issue's offsets.
 * Pure function: returns new text + issues, or null if the issue cannot be applied.
 * An empty replacement deletes the span, along with a trailing comma/space, and
 * re-capitalises the next word if the span started a sentence.
 */
export function applyIssueReplacement(
  text: string,
  issues: WritingIssue[],
  id: string
): { text: string; issues: WritingIssue[] } | null {
  const issue = issues.find((i) => i.id === id);
  if (!issue || issue.replacement === undefined || issue.accepted) return null;

  const original = text;
  const start = locateIssue(original, issue);
  if (start === -1) return null;
  let end = start + issue.text.length;
  let replacement = issue.replacement;

  if (replacement === '') {
    const trailing = /^[,;:]?\s+/.exec(text.slice(end));
    if (trailing) end += trailing[0].length;
    const startsSentence = start === 0 || /[.!?\n]\s*$/.test(text.slice(0, start));
    if (startsSentence) {
      const next = text.slice(end, end + 1);
      text = text.slice(0, end) + next.toUpperCase() + text.slice(end + 1);
    }
  } else if (/^[A-Z][a-z]/.test(issue.text) && /^[a-z]/.test(replacement)) {
    // Title-case original ("Due to...") -> capitalise; an acronym ("LLM feature") is not a sentence start.
    replacement = replacement[0].toUpperCase() + replacement.slice(1);
  }

  const newText = text.slice(0, start) + replacement + text.slice(end);
  const delta = replacement.length - (end - start);

  const updated = issues.map((i) => {
    if (i.id === id) return { ...i, accepted: true, rejected: false };
    const loc = locateIssue(original, i);
    if (loc === -1) return i;
    // Issues after the edit shift; issues overlapping the edit become stale and are dropped from highlights by locateIssue.
    if (loc >= end) return { ...i, startIndex: loc + delta, endIndex: loc + delta + i.text.length };
    return { ...i, startIndex: loc, endIndex: loc + i.text.length };
  });

  return { text: newText, issues: updated };
}
