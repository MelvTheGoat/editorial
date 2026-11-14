// ========== Research Assistant Types ==========

export interface SourceInput {
  url: string;
  title?: string;
  manualText?: string;
}

export interface FetchedSource {
  url: string;
  title: string;
  content: string;
  fetchedAt: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface FactItem {
  claim: string;
  source: string;
  sourceUrl: string;
  classification: 'verified_fact' | 'analysis' | 'speculation' | 'opinion';
  confidence: 'high' | 'medium' | 'low';
  /** Verbatim snippet from the source the model says supports the claim. */
  evidenceQuote?: string;
  /** True only if evidenceQuote was found in the fetched source text (checked in code, not by the LLM). */
  quoteVerified?: boolean;
}

export interface NewsletterAngle {
  headline: string;
  hook: string;
  targetAudience: string;
  keyPoints: string[];
}

export interface ResearchBrief {
  id: string;
  createdAt: string;
  sources: FetchedSource[];
  summary: {
    whatHappened: string;
    whyItMatters: string;
    whoShouldCare: string;
  };
  facts: FactItem[];
  angles: NewsletterAngle[];
  rawSourceCount: number;
  successfulSourceCount: number;
}

// ========== Writing Assistant Types ==========

export type IssueType =
  | 'long_sentence'
  | 'passive_voice'
  | 'filler_phrase'
  | 'jargon'
  | 'complex_paragraph'
  | 'repetitive_phrasing';

export type IssueSeverity = 'suggestion' | 'warning' | 'important';

export interface WritingIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  text: string;
  explanation: string;
  /** Human-readable advice. Never inserted into the text. */
  suggestion?: string;
  /** Exact text that may replace the flagged span. Empty string = delete. Undefined = advice only (no one-click accept). */
  replacement?: string;
  startIndex: number;
  endIndex: number;
  accepted?: boolean;
  rejected?: boolean;
}

export interface WritingMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  avgWordsPerParagraph: number;
  readingTimeMinutes: number;
  readabilityScore: number;
  readabilityGrade: string;
  readabilityExplanation: string;
}

export interface WritingAnalysis {
  metrics: WritingMetrics;
  issues: WritingIssue[];
  overallFeedback: string;
  strengths: string[];
}

// ========== API Types ==========

export interface ResearchRequest {
  sources: SourceInput[];
}

export interface ResearchResponse {
  brief: ResearchBrief;
}

export interface WritingAnalyzeRequest {
  text: string;
}

export interface WritingAnalyzeResponse {
  analysis: WritingAnalysis;
}

export interface FetchUrlRequest {
  url: string;
}

export interface FetchUrlResponse {
  source: FetchedSource;
}
