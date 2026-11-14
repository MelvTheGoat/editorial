import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWritingRules, computeMetrics, splitSentences } from '../src/lib/writing-rules';
import { applyIssueReplacement, locateIssue } from '../src/lib/text-edit';
import type { WritingIssue } from '../src/types';

const words = (n: number) => Array(n).fill('word').join(' ');

test('every issue offset points at exactly its text (incl. after paragraph breaks)', () => {
  const text = `Intro sentence.\n\n${words(40)}. Basically, the model was trained by a lab.`;
  const issues = analyzeWritingRules(text);
  assert.ok(issues.length >= 3);
  for (const i of issues) assert.equal(text.slice(i.startIndex, i.endIndex), i.text, i.type);
});

test('long-sentence thresholds: 36 words = warning, 51 words = important, 35 = none', () => {
  const sev = (n: number) => analyzeWritingRules(words(n) + '.').find((i) => i.type === 'long_sentence')?.severity;
  assert.equal(sev(35), undefined);
  assert.equal(sev(36), 'warning');
  assert.equal(sev(51), 'important');
});

test('abbreviations and decimals do not split sentences', () => {
  const s = splitSentences('The U.S. government used Gemini 2.0 Flash, e.g. for tests. It worked.');
  assert.equal(s.length, 2);
});

test('passive voice: catches real passives, ignores "is red" / "need"', () => {
  const hits = (t: string) => analyzeWritingRules(t).filter((i) => i.type === 'passive_voice').map((i) => i.text);
  assert.deepEqual(hits('The model was trained by a lab.'), ['was trained']);
  assert.deepEqual(hits('The agent is red. We need speed. It is a need.'), []);
});

test('filler phrases carry a real replacement; advice-only issues carry none', () => {
  const issues = analyzeWritingRules('We did it in order to win. ' + words(40) + '.');
  const filler = issues.find((i) => i.type === 'filler_phrase')!;
  assert.equal(filler.replacement, 'to');
  const long = issues.find((i) => i.type === 'long_sentence')!;
  assert.equal(long.replacement, undefined); // must never be auto-applied
});

test('accepting a replacement edits text and shifts later offsets', () => {
  const text = 'We left in order to win. It was basically a draw.';
  const issues = analyzeWritingRules(text) as WritingIssue[];
  const first = issues.find((i) => i.text === 'in order to')!;
  const r1 = applyIssueReplacement(text, issues, first.id)!;
  assert.equal(r1.text, 'We left to win. It was basically a draw.');
  const second = r1.issues.find((i) => i.text === 'basically')!;
  assert.equal(r1.text.slice(second.startIndex, second.endIndex), 'basically');
  const r2 = applyIssueReplacement(r1.text, r1.issues, second.id)!;
  assert.equal(r2.text, 'We left to win. It was a draw.');
});

test('deleting a sentence-initial filler re-capitalises the next word', () => {
  const text = 'Basically, agents act. They plan.';
  const issues = analyzeWritingRules(text);
  const r = applyIssueReplacement(text, issues, issues.find((i) => i.type === 'filler_phrase')!.id)!;
  assert.equal(r.text, 'Agents act. They plan.');
});

test('advice-only issues and double-accept are no-ops (StrictMode-safe)', () => {
  const text = 'We left in order to win.';
  const issues = analyzeWritingRules(text);
  const f = issues.find((i) => i.type === 'filler_phrase')!;
  const once = applyIssueReplacement(text, issues, f.id)!;
  assert.equal(applyIssueReplacement(once.text, once.issues, f.id), null);
  const passive = analyzeWritingRules('The model was trained by a lab.')[0];
  assert.equal(applyIssueReplacement('The model was trained by a lab.', [passive], passive.id), null);
});

test('locateIssue picks the occurrence nearest the stored offset', () => {
  const text = 'basically one. basically two.';
  const second = { text: 'basically', startIndex: 15, endIndex: 24 };
  assert.equal(locateIssue(text, second), 15);
  assert.equal(locateIssue('x ' + text, second), 17); // draft edited upstream: re-anchors to the right one
});

test('metrics: empty text is safe, word counts are right', () => {
  assert.equal(computeMetrics('   ').wordCount, 0);
  assert.equal(computeMetrics('One two three. Four five.').wordCount, 5);
  assert.equal(computeMetrics('One two three. Four five.').sentenceCount, 2);
});

import { deduplicateIssues } from '../src/lib/dedupe';
test('dedupe: an LLM issue mostly covered by a rule issue is dropped; a separate one is kept', () => {
  const rule = { id: 'rule-1', type: 'long_sentence', severity: 'warning', text: 'x', explanation: '', startIndex: 0, endIndex: 100 } as WritingIssue;
  const overlapping = { id: 'llm-1000', type: 'complex_paragraph', severity: 'suggestion', text: 'y', explanation: '', startIndex: 10, endIndex: 90 } as WritingIssue;
  const separate = { id: 'llm-1001', type: 'jargon', severity: 'suggestion', text: 'z', explanation: '', startIndex: 200, endIndex: 210 } as WritingIssue;
  const out = deduplicateIssues([rule, overlapping, separate]).map((i) => i.id);
  assert.deepEqual(out, ['rule-1', 'llm-1001']);
});

test('dedupe: a small jargon issue INSIDE a long rule span is kept (containment is not duplication)', () => {
  const longRule = { id: 'rule-1', type: 'long_sentence', severity: 'warning', text: 'x', explanation: '', startIndex: 0, endIndex: 300 } as WritingIssue;
  const jargon = { id: 'llm-1000', type: 'jargon', severity: 'suggestion', text: 'evals', explanation: '', startIndex: 120, endIndex: 125 } as WritingIssue;
  assert.deepEqual(deduplicateIssues([longRule, jargon]).map((i) => i.id), ['rule-1', 'llm-1000']);
});

test('replacement keeps capitalisation sensible: "Due to the fact that" -> "Because", but "LLM feature" stays lowercase', () => {
  const mk = (text: string, replacement: string): WritingIssue =>
    ({ id: 'llm-1', type: 'jargon', severity: 'suggestion', text, explanation: '', replacement, startIndex: 3, endIndex: 3 + text.length } as WritingIssue);
  const a = 'An LLM feature works.';
  const r1 = applyIssueReplacement(a, [mk('LLM feature', 'feature built on a large language model')], 'llm-1')!;
  assert.equal(r1.text, 'An feature built on a large language model works.');
  const b = 'X. Due to the fact that it works.';
  const issue = { ...mk('Due to the fact that', 'because'), startIndex: 3, endIndex: 23 };
  assert.equal(applyIssueReplacement(b, [issue], 'llm-1')!.text, 'X. Because it works.');
});

import { isPrivateIp, validateFetchableUrl } from '../src/lib/url-fetcher';
import { checkRateLimit, RATE_LIMITS } from '../src/lib/rate-limit';

test('SSRF guard: blocks private/loopback/metadata addresses and odd schemes, allows public sites', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.1.1', '172.16.0.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '93.184.216.34']) assert.equal(isPrivateIp(ip), false, ip);
  assert.ok(validateFetchableUrl('http://localhost:3000/x'));
  assert.ok(validateFetchableUrl('http://[::1]/'));
  assert.ok(validateFetchableUrl('file:///etc/passwd'));
  assert.ok(validateFetchableUrl('https://user:pw@example.com/'));
  assert.equal(validateFetchableUrl('https://venturebeat.com/some/article'), null);
});

test('rate limiter: allows up to max, then blocks with a wait time, then recovers', () => {
  const req = new Request('http://x', { headers: { 'x-forwarded-for': '203.0.113.9' } });
  const { max, windowMs } = RATE_LIMITS.llm;
  const t0 = 1_000_000;
  for (let i = 0; i < max; i++) assert.equal(checkRateLimit(req, 'llm', t0 + i), null);
  const wait = checkRateLimit(req, 'llm', t0 + max);
  assert.ok(typeof wait === 'number' && wait >= 1);
  assert.equal(checkRateLimit(req, 'llm', t0 + windowMs + max + 1), null);
  const other = new Request('http://x', { headers: { 'x-forwarded-for': '198.51.100.7' } });
  assert.equal(checkRateLimit(other, 'llm', t0), null); // different client unaffected
});
