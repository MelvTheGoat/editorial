'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import type {
  SourceInput,
  FetchedSource,
  ResearchBrief,
  FactItem,
  NewsletterAngle,
} from '@/types';

// ─── Types ────────────────────────────────────────────────────
interface SourceEntry {
  id: string;
  mode: 'url' | 'paste';
  url: string;
  manualText: string;
  title: string;
  fetchStatus: 'idle' | 'fetching' | 'fetched' | 'error';
  fetchError?: string;
}

const CLASSIFICATION_COLORS: Record<FactItem['classification'], { bg: string; text: string; label: string }> = {
  verified_fact: { bg: 'bg-green-100', text: 'text-green-800', label: 'Verified Fact' },
  analysis: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Analysis' },
  speculation: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Speculation' },
  opinion: { bg: 'bg-red-100', text: 'text-red-800', label: 'Opinion' },
};

const CONFIDENCE_DOTS: Record<string, string> = {
  high: 'bg-green-500',
  medium: 'bg-yellow-500',
  low: 'bg-red-400',
};

// ─── Helpers ──────────────────────────────────────────────────
let nextId = 1;
function makeId() {
  return `src-${nextId++}`;
}

function defaultEntry(): SourceEntry {
  return { id: makeId(), mode: 'url', url: '', manualText: '', title: '', fetchStatus: 'idle' };
}

// ─── Component ────────────────────────────────────────────────
export default function ResearchPage() {
  const router = useRouter();

  // Source inputs
  const [sources, setSources] = useState<SourceEntry[]>([
    defaultEntry(),
    defaultEntry(),
    defaultEntry(),
  ]);

  // Brief output
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Source CRUD ─────────────────────────────────────────────
  const updateSource = useCallback((id: string, patch: Partial<SourceEntry>) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const addSource = () => setSources((prev) => [...prev, defaultEntry()]);

  const removeSource = (id: string) => {
    if (sources.length <= 3) return;
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  // ── Fetch single URL ───────────────────────────────────────
  const fetchUrl = async (entry: SourceEntry) => {
    if (!entry.url.trim()) return;
    updateSource(entry.id, { fetchStatus: 'fetching', fetchError: undefined });
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: entry.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const fetched: FetchedSource = data.source;
      updateSource(entry.id, {
        fetchStatus: fetched.status === 'success' ? 'fetched' : 'error',
        title: fetched.title || '',
        fetchError: fetched.error,
      });
    } catch (err: unknown) {
      updateSource(entry.id, {
        fetchStatus: 'error',
        fetchError: err instanceof Error ? err.message : 'Failed to fetch',
      });
    }
  };

  // ── Generate Brief ─────────────────────────────────────────
  const validCount = sources.filter(
    (s) => (s.mode === 'url' && s.url.trim()) || (s.mode === 'paste' && s.manualText.trim()),
  ).length;

  const canGenerate = validCount >= 3 && !isGenerating;

  const generate = async () => {
    setIsGenerating(true);
    setError('');
    setBrief(null);

    try {
      // Step 1 — the server fetches all URLs in parallel (no separate browser-side fetch)
      setProgressMsg('Fetching and analysing sources…');
      setSources((prev) =>
        prev.map((s) => (s.mode === 'url' && s.url.trim() ? { ...s, fetchStatus: 'fetching', fetchError: undefined } : s)),
      );

      // Step 2 — build payload
      setProgressMsg('Analyzing sources with AI…');
      const payload: SourceInput[] = sources
        .filter((s) => (s.mode === 'url' && s.url.trim()) || (s.mode === 'paste' && s.manualText.trim()))
        .map((s) => ({
          url: s.mode === 'url' ? s.url : '',
          title: s.title || undefined,
          manualText: s.mode === 'paste' ? s.manualText : undefined,
        }));

      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: payload }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      setProgressMsg('Building research brief…');
      const data = await res.json();
      const result: ResearchBrief = data.brief;
      setBrief(result);
      // Reflect per-source outcome back onto the input cards.
      setSources((prev) =>
        prev.map((s) => {
          if (s.mode !== 'url') return s;
          const hit = result.sources.find((r) => r.url === s.url);
          if (!hit) return s;
          return { ...s, fetchStatus: hit.status === 'success' ? 'fetched' : 'error', title: hit.title || s.title, fetchError: hit.error };
        }),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSources((prev) => prev.map((s) => (s.fetchStatus === 'fetching' ? { ...s, fetchStatus: 'idle' } : s)));
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  // ── Copy Brief ─────────────────────────────────────────────
  const copyBrief = () => {
    if (!brief) return;
    const lines: string[] = [];
    lines.push('# Research Brief\n');
    lines.push('## What Happened');
    lines.push(brief.summary.whatHappened + '\n');
    lines.push('## Why It Matters');
    lines.push(brief.summary.whyItMatters + '\n');
    lines.push('## Who Should Care');
    lines.push(brief.summary.whoShouldCare + '\n');
    lines.push('## Evidence & Facts');
    brief.facts.forEach((f, i) => {
      lines.push(`${i + 1}. [${f.classification}${f.quoteVerified ? '' : ', UNVERIFIED QUOTE'}] ${f.claim} — ${f.source} ${f.sourceUrl}`);
    });
    lines.push('');
    lines.push('## Newsletter Angles');
    brief.angles.forEach((a, i) => {
      lines.push(`\n### Angle ${i + 1}: ${a.headline}`);
      lines.push(`Hook: ${a.hook}`);
      lines.push(`Target: ${a.targetAudience}`);
      lines.push(`Key points: ${a.keyPoints.join('; ')}`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Start Writing ──────────────────────────────────────────
  const startWriting = () => {
    if (!brief || brief.angles.length === 0) {
      router.push('/writing');
      return;
    }
    const angle = brief.angles[0];
    const draft = `# ${angle.headline}\n\n${angle.hook}\n\n${angle.keyPoints.map((p) => `- ${p}`).join('\n')}`;
    sessionStorage.setItem('editorial_draft', draft);
    router.push('/writing');
  };

  // ─── Status icon helper ────────────────────────────────────
  const StatusIcon = ({ status }: { status: SourceEntry['fetchStatus'] }) => {
    switch (status) {
      case 'idle':
        return <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />;
      case 'fetching':
        return (
          <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin inline-block" />
        );
      case 'fetched':
        return <Icon name="check" className="w-4 h-4 text-green-600" />;
      case 'error':
        return <Icon name="x" className="w-4 h-4 text-red-500" />;
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-editorial-text flex items-center gap-3"><Icon name="search" className="w-8 h-8 text-brand-600" />Research Assistant</h1>
        <p className="text-editorial-muted mt-2">
          Add at least 3 sources to generate a comprehensive research brief with AI-extracted facts and newsletter angles.
        </p>
      </div>

      {/* ──────── Input Section ──────── */}
      <section className="bg-white rounded-2xl border border-editorial-border shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Sources</h2>

        <div className="space-y-4">
          {sources.map((entry, idx) => (
            <div
              key={entry.id}
              className="relative border border-editorial-border rounded-xl p-4 bg-stone-50/50"
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-editorial-muted">Source {idx + 1}</span>
                <div className="flex items-center gap-3">
                  {/* Mode toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      updateSource(entry.id, { mode: entry.mode === 'url' ? 'paste' : 'url' })
                    }
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
                  >
                    {entry.mode === 'url' ? 'Paste text instead' : 'Use URL instead'}
                  </button>
                  {sources.length > 3 && (
                    <button
                      type="button"
                      onClick={() => removeSource(entry.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {entry.mode === 'url' ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      placeholder="https://example.com/article"
                      value={entry.url}
                      onChange={(e) => updateSource(entry.id, { url: e.target.value })}
                      className="w-full rounded-lg border border-editorial-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-shadow"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchUrl(entry)}
                    disabled={!entry.url.trim() || entry.fetchStatus === 'fetching'}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium disabled:text-stone-300"
                  >
                    Check
                  </button>
                  <div className="w-6 flex justify-center">
                    <StatusIcon status={entry.fetchStatus} />
                  </div>
                </div>
              ) : (
                <textarea
                  rows={4}
                  placeholder="Paste the article text here…"
                  value={entry.manualText}
                  onChange={(e) => updateSource(entry.id, { manualText: e.target.value })}
                  className="w-full rounded-lg border border-editorial-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-shadow resize-y"
                />
              )}

              {entry.fetchError && (
                <p className="text-xs text-red-500 mt-2 inline-flex items-center gap-1"><Icon name="alert" className="w-3.5 h-3.5" />{entry.fetchError}</p>
              )}
              {entry.fetchStatus === 'fetched' && entry.title && (
                <p className="text-xs text-green-700 mt-2 truncate">Fetched: {entry.title}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5">
          <button
            type="button"
            onClick={addSource}
            className="text-sm text-brand-600 hover:text-brand-800 font-medium transition-colors"
          >
            + Add Another Source
          </button>

          <button
            type="button"
            disabled={!canGenerate}
            onClick={generate}
            className={`
              px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all
              ${
                canGenerate
                  ? 'bg-brand-600 hover:bg-brand-700 shadow-sm hover:shadow'
                  : 'bg-stone-300 cursor-not-allowed'
              }
            `}
          >
            {isGenerating ? 'Generating…' : 'Generate Research Brief'}
          </button>
        </div>

        {/* Progress / Error */}
        {isGenerating && progressMsg && (
          <div className="mt-4 flex items-center gap-3 text-sm text-brand-700 bg-brand-50 rounded-lg px-4 py-3">
            <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            {progressMsg}
          </div>
        )}
        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <Icon name="alert" className="w-4 h-4 inline -mt-0.5" /> {error}
          </div>
        )}
      </section>

      {/* ──────── Output Section ──────── */}
      {brief && (
        <section className="space-y-6 animate-in">
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={copyBrief}
              className="px-4 py-2 rounded-lg border border-editorial-border text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              {copied ? 'Copied' : 'Copy brief'}
            </button>
            <button
              type="button"
              onClick={startWriting}
              className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 shadow-sm transition-all"
            >
              Start writing
            </button>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-editorial-border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="document" className="w-5 h-5 text-brand-600" /> <span>Summary</span>
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {([
                ['What Happened', brief.summary.whatHappened],
                ['Why It Matters', brief.summary.whyItMatters],
                ['Who Should Care', brief.summary.whoShouldCare],
              ] as const).map(([label, value]) => (
                <div key={label} className="bg-stone-50 rounded-xl p-4">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-editorial-muted mb-2">
                    {label}
                  </h3>
                  <p className="text-sm leading-relaxed text-editorial-text">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence & Facts */}
          <div className="bg-white rounded-2xl border border-editorial-border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="chart" className="w-5 h-5 text-brand-600" /> <span>Evidence &amp; Facts</span>
              <span className="ml-auto text-xs text-editorial-muted font-normal">
                {brief.facts.length} items
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-editorial-border text-left">
                    <th className="pb-2 pr-4 font-medium text-editorial-muted">Claim</th>
                    <th className="pb-2 pr-4 font-medium text-editorial-muted w-28">Classification</th>
                    <th className="pb-2 pr-4 font-medium text-editorial-muted w-24">Confidence</th>
                    <th className="pb-2 font-medium text-editorial-muted w-32">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-editorial-border/50">
                  {brief.facts.map((fact, i) => {
                    const cls = CLASSIFICATION_COLORS[fact.classification];
                    return (
                      <tr key={i} className="hover:bg-stone-50/50">
                        <td className="py-3 pr-4 leading-relaxed">
                          {fact.claim}
                          {fact.evidenceQuote && (
                            <span className="block mt-1 text-xs text-editorial-muted italic">
                              {fact.quoteVerified ? 'Quote found in source: ' : 'Warning, quote NOT found in source text: '}
                              “{fact.evidenceQuote}”
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls.bg} ${cls.text}`}
                          >
                            {cls.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-1.5 text-xs text-editorial-muted">
                            <span
                              className={`w-2 h-2 rounded-full ${CONFIDENCE_DOTS[fact.confidence]}`}
                            />
                            {fact.confidence}
                          </span>
                        </td>
                        <td className="py-3">
                          {fact.sourceUrl ? (
                            <a
                              href={fact.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 hover:underline truncate block max-w-[10rem]"
                            >
                              {fact.source}
                            </a>
                          ) : (
                            <span className="text-editorial-muted truncate block max-w-[10rem]">
                              {fact.source}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Newsletter Angles */}
          <div className="bg-white rounded-2xl border border-editorial-border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="lightbulb" className="w-5 h-5 text-brand-600" /> <span>Newsletter Angles</span>
            </h2>
            <div className="space-y-4">
              {brief.angles.map((angle: NewsletterAngle, i: number) => (
                <div
                  key={i}
                  className="border border-editorial-border rounded-xl p-5 hover:shadow-sm transition-shadow"
                >
                  <h3 className="font-semibold text-editorial-text mb-1">{angle.headline}</h3>
                  <p className="text-sm text-editorial-muted italic mb-3">{angle.hook}</p>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full font-medium">
                      <Icon name="target" className="w-3.5 h-3.5" /> {angle.targetAudience}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {angle.keyPoints.map((kp, j) => (
                      <li key={j} className="text-sm text-editorial-text flex gap-2">
                        <span className="text-brand-400 mt-0.5">•</span>
                        {kp}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div className="bg-white rounded-2xl border border-editorial-border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="paperclip" className="w-5 h-5 text-brand-600" /> <span>Sources</span>
              <span className="ml-auto text-xs text-editorial-muted font-normal">
                {brief.successfulSourceCount}/{brief.rawSourceCount} fetched
              </span>
            </h2>
            <ul className="space-y-2">
              {brief.sources.map((src, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {src.status === 'success' ? (
                    <Icon name="check" className="w-4 h-4 text-green-600" />
                  ) : (
                    <Icon name="x" className="w-4 h-4 text-red-500" />
                  )}
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline truncate"
                  >
                    {src.title || src.url}
                  </a>
                  {src.error && (
                    <span className="text-xs text-red-500 ml-auto">{src.error}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
