'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { WritingAnalysis, WritingIssue, IssueType, WritingMetrics } from '@/types';
import Icon, { type IconName } from '@/components/Icon';
import { computeMetrics } from '@/lib/writing-rules';
import { applyIssueReplacement, locateIssue } from '@/lib/text-edit';

// Lazy-load the diff viewer to avoid SSR issues
const ReactDiffViewer = dynamic(() => import('react-diff-viewer-continued'), { ssr: false });

// ─── Constants ────────────────────────────────────────────────
const ISSUE_META: Record<
  IssueType,
  { label: string; bg: string; text: string; highlightClass: string; icon: IconName }
> = {
  long_sentence: {
    label: 'Long Sentence',
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    highlightClass: 'highlight-long_sentence',
    icon: 'ruler',
  },
  passive_voice: {
    label: 'Passive Voice',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    highlightClass: 'highlight-passive_voice',
    icon: 'repeat',
  },
  filler_phrase: {
    label: 'Filler Phrase',
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    highlightClass: 'highlight-filler_phrase',
    icon: 'scissors',
  },
  jargon: {
    label: 'Jargon',
    bg: 'bg-green-100',
    text: 'text-green-800',
    highlightClass: 'highlight-jargon',
    icon: 'beaker',
  },
  complex_paragraph: {
    label: 'Complex',
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    highlightClass: 'highlight-complex_paragraph',
    icon: 'layers',
  },
  repetitive_phrasing: {
    label: 'Repetitive',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    highlightClass: 'highlight-repetitive_phrasing',
    icon: 'repeat',
  },
};

const ALL_ISSUE_TYPES = Object.keys(ISSUE_META) as IssueType[];

// ─── Helpers ──────────────────────────────────────────────────
function readabilityColor(score: number) {
  if (score >= 70) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function readabilityBg(score: number) {
  if (score >= 70) return 'bg-green-50 border-green-200';
  if (score >= 50) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

// ─── Metrics cards ─────────────────────────────────────────────
const MetricsGrid = ({ metrics }: { metrics: WritingMetrics }) => {
    const cards = [
      { icon: 'document' as IconName, label: 'Words', value: metrics.wordCount },
      { icon: 'message' as IconName, label: 'Sentences', value: metrics.sentenceCount },
      { icon: 'ruler' as IconName, label: 'Avg Length', value: `${metrics.avgSentenceLength} words` },
      { icon: 'clock' as IconName, label: 'Reading Time', value: `${metrics.readingTimeMinutes} min` },
      {
        icon: 'chart' as IconName,
        label: 'Readability',
        value: metrics.readabilityScore,
        extra: (
          <span className={`text-xs ${readabilityColor(metrics.readabilityScore)}`}>
            {metrics.readabilityGrade}
          </span>
        ),
        tooltip: metrics.readabilityExplanation,
        highlight: true,
      },
    ];

    return (
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-3 text-center ${
              card.highlight
                ? readabilityBg(metrics.readabilityScore)
                : 'bg-white border-editorial-border'
            }`}
            title={card.tooltip}
          >
            <div className="flex justify-center text-editorial-muted mb-1"><Icon name={card.icon} className="w-5 h-5" /></div>
            <div className="text-lg font-semibold text-editorial-text">{card.value}</div>
            <div className="text-xs text-editorial-muted">{card.label}</div>
            {card.extra && <div className="mt-0.5">{card.extra}</div>}
          </div>
        ))}
      </div>
    );
};

// ─── Component ────────────────────────────────────────────────
export default function WritingPage() {
  // State
  const [originalText, setOriginalText] = useState('');
  const [currentText, setCurrentText] = useState('');
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);
  const [issues, setIssues] = useState<WritingIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<IssueType>>(new Set(ALL_ISSUE_TYPES));
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const issueRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load draft from sessionStorage (from Research page)
  useEffect(() => {
    const draft = sessionStorage.getItem('editorial_draft');
    if (draft) {
      setCurrentText(draft);
      sessionStorage.removeItem('editorial_draft');
    }
  }, []);

  // ── Analyze ─────────────────────────────────────────────────
  const analyze = async () => {
    if (!currentText.trim()) return;
    setIsAnalyzing(true);
    setError('');
    setAnalysis(null);
    setOriginalText(currentText);

    try {
      const res = await fetch('/api/writing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const a: WritingAnalysis = data.analysis;
      setAnalysis(a);
      setIssues(a.issues.map((iss) => ({ ...iss, accepted: false, rejected: false })));
      setActiveFilters(new Set(ALL_ISSUE_TYPES));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Accept / Reject ─────────────────────────────────────────
  // Pure update: compute the new text and issues together, then set both.
  // (State updaters must not have side effects: React runs them twice in development.)
  const acceptIssue = (id: string) => {
    const result = applyIssueReplacement(currentText, issues, id);
    if (!result) return;
    setCurrentText(result.text);
    setIssues(result.issues);
  };

  const rejectIssue = useCallback((id: string) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === id ? { ...i, rejected: true, accepted: false } : i)),
    );
  }, []);

  // ── Filtered & Counted issues ───────────────────────────────
  const filteredIssues = useMemo(
    () => issues.filter((i) => activeFilters.has(i.type)),
    [issues, activeFilters],
  );

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<IssueType, number>> = {};
    issues.forEach((i) => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });
    return counts;
  }, [issues]);

  const liveMetrics = useMemo(() => computeMetrics(currentText), [currentText]);
  const totalIssues = issues.length;
  const acceptedCount = issues.filter((i) => i.accepted).length;
  const rejectedCount = issues.filter((i) => i.rejected).length;

  // ── Toggle filter ───────────────────────────────────────────
  const toggleFilter = (type: IssueType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // ── Build highlighted text ──────────────────────────────────
  const highlightedContent = useMemo(() => {
    if (!analysis || issues.length === 0) return null;

    // Build highlight ranges from active (non-accepted) issues, matching by text
    type Range = { start: number; end: number; type: IssueType; id: string };
    const ranges: Range[] = [];

    issues.forEach((issue) => {
      if (issue.accepted || issue.rejected) return;
      if (!activeFilters.has(issue.type)) return;
      const idx = locateIssue(currentText, issue);
      if (idx === -1) return;
      ranges.push({ start: idx, end: idx + issue.text.length, type: issue.type, id: issue.id });
    });

    // On overlap keep the more specific (shorter) span, so a filler phrase inside a long
    // sentence stays visible instead of being swallowed by the sentence highlight.
    const bySize = [...ranges].sort((a, b) => a.end - a.start - (b.end - b.start));
    const cleaned: Range[] = [];
    for (const r of bySize) {
      if (!cleaned.some((c) => r.start < c.end && c.start < r.end)) cleaned.push(r);
    }
    cleaned.sort((a, b) => a.start - b.start);

    // Build React elements
    const elements: React.ReactNode[] = [];
    let cursor = 0;

    cleaned.forEach((range, i) => {
      if (range.start > cursor) {
        elements.push(
          <span key={`t-${i}`}>{currentText.slice(cursor, range.start)}</span>,
        );
      }
      const meta = ISSUE_META[range.type];
      elements.push(
        <span
          key={`h-${i}`}
          className={`${meta.highlightClass} cursor-pointer rounded px-0.5 transition-all hover:ring-2 hover:ring-brand-400 ${
            activeIssueId === range.id ? 'ring-2 ring-brand-500' : ''
          }`}
          title={meta.label}
          onClick={() => {
            setActiveIssueId(range.id);
            const el = issueRefs.current[range.id];
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        >
          {currentText.slice(range.start, range.end)}
        </span>,
      );
      cursor = range.end;
    });

    if (cursor < currentText.length) {
      elements.push(<span key="tail">{currentText.slice(cursor)}</span>);
    }

    return elements;
  }, [currentText, issues, activeFilters, analysis, activeIssueId]);

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-editorial-text flex items-center gap-3"><Icon name="pencil" className="w-8 h-8 text-brand-600" />Writing Assistant</h1>
        <p className="text-editorial-muted mt-2">
          Paste your draft below and get AI-powered feedback on readability, style, and clarity.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Left Column — Editor ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Textarea */}
          <div className="bg-white rounded-2xl border border-editorial-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-editorial-border bg-stone-50">
              <span className="text-sm font-medium text-editorial-muted">Draft Editor</span>
              <span className="text-xs text-editorial-muted">
                {currentText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Paste your newsletter draft here…"
              className="editor-content w-full px-5 py-4 text-sm resize-y border-none focus:ring-0"
              rows={12}
            />
          </div>

          {/* Analyze button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!currentText.trim() || isAnalyzing}
              onClick={analyze}
              className={`
                px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                ${
                  currentText.trim() && !isAnalyzing
                    ? 'bg-brand-600 hover:bg-brand-700 shadow-sm hover:shadow'
                    : 'bg-stone-300 cursor-not-allowed'
                }
              `}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing…
                </span>
              ) : (
                'Analyze Draft'
              )}
            </button>
            {error && <span className="text-sm text-red-600 inline-flex items-center gap-1"><Icon name="alert" className="w-4 h-4" />{error}</span>}
          </div>

          {/* Highlighted preview */}
          {analysis && highlightedContent && (
            <div className="bg-white rounded-2xl border border-editorial-border shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-editorial-border bg-stone-50">
                <span className="text-sm font-medium text-editorial-muted">
                  Highlighted Issues Preview
                </span>
              </div>
              <div className="editor-content px-5 py-4 text-sm whitespace-pre-wrap leading-relaxed">
                {highlightedContent}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column — Feedback Panel ── */}
        <div className="lg:col-span-2 space-y-4">
          {!analysis && !isAnalyzing && (
            <div className="bg-white rounded-2xl border border-editorial-border shadow-sm p-8 text-center">
              <div className="flex justify-center mb-3 text-stone-300"><Icon name="document" className="w-12 h-12" /></div>
              <h3 className="font-semibold text-editorial-text mb-1">No Analysis Yet</h3>
              <p className="text-sm text-editorial-muted">
                Paste your draft and click &quot;Analyze Draft&quot; to get AI-powered feedback.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="bg-white rounded-2xl border border-editorial-border shadow-sm p-8 text-center">
              <div className="w-8 h-8 border-[3px] border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-editorial-muted">Analyzing your draft…</p>
            </div>
          )}

          {analysis && (
            <>
              {/* Metrics */}
              <MetricsGrid metrics={liveMetrics} />

              {/* Overall Feedback */}
              <div className="bg-white rounded-2xl border border-editorial-border shadow-sm p-5">
                <h3 className="text-sm font-semibold text-editorial-text mb-2">Overall Feedback</h3>
                <p className="text-sm text-editorial-muted leading-relaxed mb-3">
                  {analysis.overallFeedback}
                </p>
                {analysis.strengths.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-green-700 mb-1">
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-editorial-text flex gap-2">
                          <Icon name="check" className="w-4 h-4 text-green-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Issue Stats & Filters */}
              <div className="bg-white rounded-2xl border border-editorial-border shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-editorial-text">
                    Issues ({totalIssues})
                  </h3>
                  <div className="flex gap-2 text-xs text-editorial-muted">
                    <span className="text-green-600 inline-flex items-center gap-0.5"><Icon name="check" className="w-3.5 h-3.5" />{acceptedCount}</span>
                    <span className="text-red-500 inline-flex items-center gap-0.5"><Icon name="x" className="w-3.5 h-3.5" />{rejectedCount}</span>
                    <span>{totalIssues - acceptedCount - rejectedCount} pending</span>
                  </div>
                </div>

                {/* Filter toggles */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {ALL_ISSUE_TYPES.map((type) => {
                    const meta = ISSUE_META[type];
                    const count = typeCounts[type] || 0;
                    const active = activeFilters.has(type);
                    if (count === 0) return null;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleFilter(type)}
                        className={`
                          inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all
                          ${
                            active
                              ? `${meta.bg} ${meta.text} ring-1 ring-current/20`
                              : 'bg-stone-100 text-stone-400 line-through'
                          }
                        `}
                      >
                        <Icon name={meta.icon} className="w-3.5 h-3.5" /> {meta.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Issue cards */}
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredIssues.length === 0 && (
                    <p className="text-sm text-editorial-muted text-center py-4">
                      No issues match current filters.
                    </p>
                  )}
                  {filteredIssues.map((issue) => {
                    const meta = ISSUE_META[issue.type];
                    const isExpanded = expandedIssue === issue.id;
                    const isDimmed = issue.accepted || issue.rejected;

                    return (
                      <div
                        key={issue.id}
                        ref={(el) => { issueRefs.current[issue.id] = el; }}
                        className={`
                          rounded-xl border p-4 transition-all
                          ${
                            activeIssueId === issue.id
                              ? 'border-brand-400 shadow-md ring-1 ring-brand-200'
                              : 'border-editorial-border'
                          }
                          ${isDimmed ? 'opacity-50' : ''}
                        `}
                        onClick={() => setActiveIssueId(issue.id)}
                      >
                        {/* Badge + status */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}
                          >
                            <Icon name={meta.icon} className="w-3.5 h-3.5" /> {meta.label}
                          </span>
                          {issue.accepted && (
                            <span className="text-xs text-green-600 font-medium inline-flex items-center gap-1"><Icon name="check" className="w-3.5 h-3.5" />Accepted</span>
                          )}
                          {issue.rejected && (
                            <span className="text-xs text-red-500 font-medium line-through">
                              Rejected
                            </span>
                          )}
                        </div>

                        {/* Flagged text */}
                        <div
                          className="text-sm text-editorial-text mb-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedIssue(isExpanded ? null : issue.id);
                          }}
                        >
                          <span className={`font-mono text-xs ${meta.bg} px-1 rounded`}>
                            {isExpanded
                              ? `"${issue.text}"`
                              : `"${issue.text.length > 80 ? issue.text.slice(0, 80) + '…' : issue.text}"`}
                          </span>
                        </div>

                        {/* Explanation */}
                        <p className="text-xs text-editorial-muted leading-relaxed mb-2">
                          {issue.explanation}
                        </p>

                        {/* Suggestion */}
                        {issue.suggestion && (
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2">
                            <p className="text-xs text-green-800">
                              <span className="font-semibold">Suggestion:</span> {issue.suggestion}
                            </p>
                          </div>
                        )}

                        {/* Accept / Reject buttons */}
                        {!issue.accepted && !issue.rejected && (
                          <div className="flex gap-2 mt-2">
                            {issue.replacement !== undefined && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acceptIssue(issue.id);
                                }}
                                className="px-3 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors"
                              >
                                {issue.replacement === '' ? 'Remove it' : `Replace with “${issue.replacement}”`}
                              </button>
                            )}
                            {issue.replacement === undefined && (
                              <span className="text-xs text-editorial-muted self-center">Edit in the draft, then re-analyze.</span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                rejectIssue(issue.id);
                              }}
                              className="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Comparison View ── */}
      {analysis && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all border
                ${
                  showComparison
                    ? 'bg-brand-50 border-brand-300 text-brand-700'
                    : 'bg-white border-editorial-border text-editorial-muted hover:bg-stone-50'
                }
              `}
            >
              {showComparison ? 'Hide comparison' : 'Compare versions'}
            </button>
            {showComparison && originalText !== currentText && (
              <span className="text-xs text-editorial-muted">
                Showing differences between original and current draft
              </span>
            )}
          </div>

          {showComparison && (
            <div className="bg-white rounded-2xl border border-editorial-border shadow-sm overflow-hidden">
              {originalText === currentText ? (
                <div className="p-8 text-center text-sm text-editorial-muted">
                  No changes have been made yet. Accept suggestions to see differences.
                </div>
              ) : (
                <div className="text-sm">
                  <ReactDiffViewer
                    oldValue={originalText}
                    newValue={currentText}
                    splitView={true}
                    leftTitle="Original"
                    rightTitle="Current"
                    useDarkTheme={false}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
