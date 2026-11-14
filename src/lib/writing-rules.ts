import type { WritingIssue, WritingMetrics, IssueSeverity, IssueType } from '@/types';

// ─── Filler Phrases ──────────────────────────────────────────────────────────

const FILLER_PHRASES = [
  'in order to',
  'it is important to note that',
  'at the end of the day',
  'due to the fact that',
  'for all intents and purposes',
  'it goes without saying',
  'needless to say',
  'basically',
  'essentially',
  'literally',
  'actually',
  'in terms of',
  'with regards to',
  'at this point in time',
  'in the process of',
];

const FILLER_SUGGESTIONS: Record<string, string> = {
  'in order to': 'to',
  'it is important to note that': '(remove — just state the point directly)',
  'at the end of the day': 'ultimately',
  'due to the fact that': 'because',
  'for all intents and purposes': 'effectively',
  'it goes without saying': '(remove — if it goes without saying, don\'t say it)',
  'needless to say': '(remove — just state the point)',
  'basically': '(remove or replace with a precise term)',
  'essentially': '(remove or replace with a precise term)',
  'literally': '(remove unless describing something truly literal)',
  'actually': '(remove or rephrase)',
  'in terms of': 'regarding',
  'with regards to': 'regarding',
  'at this point in time': 'now',
  'in the process of': 'currently',
};

/** Text that can safely be swapped in. '' means delete the phrase. Fillers not listed here are advice-only. */
const FILLER_REPLACEMENTS: Record<string, string> = {
  'in order to': 'to',
  'it is important to note that': '',
  'at the end of the day': 'ultimately',
  'due to the fact that': 'because',
  'for all intents and purposes': 'effectively',
  'it goes without saying': '',
  'needless to say': '',
  'basically': '',
  'essentially': '',
  'literally': '',
  'actually': '',
  'in terms of': 'regarding',
  'with regards to': 'regarding',
  'at this point in time': 'now',
};

// ─── Passive Voice ───────────────────────────────────────────────────────────

// Matches common passive constructions: "was created", "is being used", "were given"
const PASSIVE_REGEX =
  /\b(am|is|are|was|were|be|been|being)\s+(being\s+)?(\w+ed|built|bought|brought|caught|chosen|cut|dealt|done|drawn|driven|eaten|fallen|felt|fought|found|forgotten|frozen|given|gone|grown|heard|held|hidden|hit|hung|hurt|kept|known|laid|led|left|lent|let|lain|lost|made|meant|met|paid|put|read|ridden|risen|run|said|sat|seen|sent|set|shaken|shot|shown|shrunk|shut|sung|sunk|slept|slid|spoken|spent|spun|spread|stood|stolen|struck|stuck|stung|strung|sworn|swept|swum|swung|taken|taught|thought|thrown|told|torn|understood|woken|won|worn|wound|written)\b/gi;

// Words ending in "ed" that are not past participles ("is red", "is a need").
const NOT_PARTICIPLES = new Set([
  'red', 'bed', 'need', 'speed', 'seed', 'weed', 'deed', 'creed', 'greed',
  'breed', 'indeed', 'hundred', 'sacred', 'naked', 'wicked', 'embed', 'shed', 'sled',
  'wed', 'ted',
]);

// ─── Sentence Splitting ──────────────────────────────────────────────────────

const ABBREVIATION_REGEX =
  /\b(?:[A-Za-z]\.){2,}|\b(?:e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms|Prof|Inc|Ltd|Corp|No)\.|\b\d+\.\d+/g;

/**
 * Split text into sentences. Abbreviations ("U.S.", "e.g.") and decimals are masked
 * with a same-length placeholder so offsets always refer to the original text.
 */
export function splitSentences(text: string): { text: string; start: number }[] {
  const masked = text.replace(ABBREVIATION_REGEX, (m) => m.replace(/\./g, '\u2024'));
  const sentences: { text: string; start: number }[] = [];
  const regex = /[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(masked)) !== null) {
    const raw = match[0];
    const leading = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      const start = match.index + leading;
      sentences.push({ text: text.slice(start, start + trimmed.length), start });
    }
    if (match[0].length === 0) regex.lastIndex++;
  }

  return sentences;
}

function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

// ─── Syllable Counting (Heuristic) ──────────────────────────────────────────

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 2) return 1;

  // Count vowel groups
  const vowelGroups = w.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;

  // Subtract silent e at end
  if (w.endsWith('e') && !w.endsWith('le') && count > 1) {
    count--;
  }

  // Common suffix adjustments
  if (w.endsWith('es') && !w.endsWith('ses') && !w.endsWith('zes') && count > 1) {
    count--;
  }

  return Math.max(1, count);
}

// ─── Main Analysis ──────────────────────────────────────────────────────────

export function analyzeWritingRules(text: string): WritingIssue[] {
  const issues: WritingIssue[] = [];
  let idCounter = 1;

  function makeId(): string {
    return `rule-${idCounter++}`;
  }

  // (a) Long sentences
  const sentences = splitSentences(text);
  for (const sentence of sentences) {
    const wc = countWords(sentence.text);
    if (wc > 35) {
      const severity: IssueSeverity = wc > 50 ? 'important' : 'warning';
      issues.push({
        id: makeId(),
        type: 'long_sentence' as IssueType,
        severity,
        text: sentence.text,
        explanation: `This sentence is ${wc} words long. Sentences over 35 words are harder to read and comprehend. Consider splitting it into shorter sentences.`,
        suggestion: 'Break this into two or more shorter sentences for clarity.',
        startIndex: sentence.start,
        endIndex: sentence.start + sentence.text.length,
      });
    }
  }

  // (b) Passive voice
  let passiveMatch: RegExpExecArray | null;
  PASSIVE_REGEX.lastIndex = 0;
  while ((passiveMatch = PASSIVE_REGEX.exec(text)) !== null) {
    const matchedText = passiveMatch[0];
    const participle = matchedText.trim().split(/\s+/).pop()!.toLowerCase();
    if (NOT_PARTICIPLES.has(participle)) continue;
    issues.push({
      id: makeId(),
      type: 'passive_voice' as IssueType,
      severity: 'suggestion',
      text: matchedText,
      explanation:
        'This appears to use passive voice. Active voice is generally more direct and engaging for readers.',
      suggestion: `Consider rewriting "${matchedText}" in active voice by identifying the actor performing the action.`,
      startIndex: passiveMatch.index,
      endIndex: passiveMatch.index + matchedText.length,
    });
  }

  // (c) Filler phrases
  for (const phrase of FILLER_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fillerRegex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let fillerMatch: RegExpExecArray | null;

    while ((fillerMatch = fillerRegex.exec(text)) !== null) {
      const matchedText = fillerMatch[0];
      const suggestion = FILLER_SUGGESTIONS[phrase] || `Remove or replace "${phrase}".`;
      issues.push({
        id: makeId(),
        type: 'filler_phrase' as IssueType,
        severity: 'suggestion',
        text: matchedText,
        explanation: `"${matchedText}" is a filler phrase that adds length without adding meaning. Tighter writing is more impactful.`,
        suggestion,
        replacement: FILLER_REPLACEMENTS[phrase],
        startIndex: fillerMatch.index,
        endIndex: fillerMatch.index + matchedText.length,
      });
    }
  }

  // Sort by position in text
  issues.sort((a, b) => a.startIndex - b.startIndex);

  return issues;
}

// ─── Metrics ────────────────────────────────────────────────────────────────

function fleschReadingEase(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0;
  const score =
    206.835 -
    1.015 * (totalWords / totalSentences) -
    84.6 * (totalSyllables / totalWords);
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

function scoreToGrade(score: number): string {
  if (score >= 90) return '5th Grade';
  if (score >= 80) return '6th Grade';
  if (score >= 70) return '7th Grade';
  if (score >= 60) return '8th–9th Grade';
  if (score >= 50) return '10th–12th Grade';
  if (score >= 30) return 'College Level';
  return 'Post-Graduate Level';
}

function scoreToExplanation(score: number): string {
  if (score >= 90)
    return 'Very easy to read. Easily understood by an average 11-year-old student.';
  if (score >= 80)
    return 'Easy to read. Conversational English for consumers.';
  if (score >= 70)
    return 'Fairly easy to read. Good for a broad audience.';
  if (score >= 60)
    return 'Plain English. Easily understood by 13- to 15-year-old students. Good for most newsletters.';
  if (score >= 50)
    return 'Fairly difficult to read. Some readers may struggle with complex passages.';
  if (score >= 30)
    return 'Difficult to read. Best understood by college graduates. Consider simplifying for a general audience.';
  return 'Very difficult to read. Best understood by university graduates. This may be too dense for a newsletter.';
}

export function computeMetrics(text: string): WritingMetrics {
  if (!text.trim()) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      avgSentenceLength: 0,
      avgWordsPerParagraph: 0,
      readingTimeMinutes: 0,
      readabilityScore: 0,
      readabilityGrade: 'N/A',
      readabilityExplanation: 'No text to analyze.',
    };
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const sentences = splitSentences(text);
  const sentenceCount = Math.max(sentences.length, 1);

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = Math.max(paragraphs.length, 1);

  const avgSentenceLength =
    Math.round((wordCount / sentenceCount) * 10) / 10;
  const avgWordsPerParagraph =
    Math.round((wordCount / paragraphCount) * 10) / 10;

  const readingTimeMinutes = Math.round((wordCount / 238) * 10) / 10;

  const totalSyllables = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0
  );
  const readabilityScore = fleschReadingEase(
    wordCount,
    sentenceCount,
    totalSyllables
  );
  const readabilityGrade = scoreToGrade(readabilityScore);
  const readabilityExplanation = scoreToExplanation(readabilityScore);

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    avgSentenceLength,
    avgWordsPerParagraph,
    readingTimeMinutes,
    readabilityScore,
    readabilityGrade,
    readabilityExplanation,
  };
}
