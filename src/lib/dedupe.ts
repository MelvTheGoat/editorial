import type { WritingIssue } from '@/types';

/**
 * Merge rule-based and LLM issues, dropping LLM issues that duplicate a rule issue.
 *
 * "Duplicate" means the two spans are nearly the same region (intersection-over-union >= 0.5),
 * e.g. the LLM flagging a "complex paragraph" that is really the same sentence the long-sentence
 * rule already flagged. A small LLM span that merely sits INSIDE a big rule span (a jargon term
 * inside a long sentence) is a different, useful finding and is kept. Rule issues win ties because
 * they are deterministic and have exact positions.
 */
export function deduplicateIssues(issues: WritingIssue[]): WritingIssue[] {
  const ruleIssues = issues.filter((i) => i.id.startsWith('rule-'));
  const otherIssues = issues.filter((i) => !i.id.startsWith('rule-'));
  const result: WritingIssue[] = [...ruleIssues];

  for (const llmIssue of otherIssues) {
    const duplicate = ruleIssues.some((r) => {
      const inter = Math.min(r.endIndex, llmIssue.endIndex) - Math.max(r.startIndex, llmIssue.startIndex);
      if (inter <= 0) return false;
      const union = Math.max(r.endIndex, llmIssue.endIndex) - Math.min(r.startIndex, llmIssue.startIndex);
      return inter / union >= 0.5;
    });
    if (!duplicate) result.push(llmIssue);
  }

  return result.sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
}
