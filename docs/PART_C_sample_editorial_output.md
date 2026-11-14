# Part C: Sample editorial output

**Topic:** AI agents are getting more capable, but not much more reliable.
**Who it is for:** founders, builders and operators who read a weekly AI newsletter.
**Research done:** 10 November 2026.

## What is live output and what is a sample

| Part | Status |
|---|---|
| Finding and reading the three sources | Done from the live pages |
| Rule-based feedback (long sentences, passive voice, filler, scores) | Live output of `src/lib/writing-rules.ts` on the draft below |
| Merging feedback, one-click fixes, before and after scores | Live output of the app's own code |
| AI feedback (jargon, heavy paragraphs, repeated words) and the research brief | **Sample.** Shown in the same format the app uses. Paste the draft into `/writing` to see live AI output |

---

## 1. Sources

| # | Source | Date | What it gives us |
|---|---|---|---|
| 1 | VentureBeat Intelligence, [VB Pulse Agentic Reliability and Evals Report](https://venturebeat.com/vb-pulse-agentic-reliability-and-evals-report) | Survey in Oct 2026, published 6 Nov | Main data: 106 people answered. Covers failures after passing tests, human review, and how teams find failures |
| 2 | Carl Franzen, VentureBeat, [Enterprise AI is entering an evaluation gap](https://venturebeat.com/orchestration/enterprise-ai-is-entering-an-evaluation-gap-agents-are-gaining-autonomy-faster-than-companies-can-verify-them) | 10 Jul 2026 | Why passing a test does not mean an agent works, and what to do about it |
| 3 | Rabanser, Kapoor, Kirgis, Liu, Utpala, Narayanan (Princeton), [Towards a Science of AI Agent Reliability](https://arxiv.org/abs/2602.16666) | Feb 2026 (preprint) | Separate research: 14 models over 18 months. Skill went up a lot. Reliability went up only a little |

**A warning about the sources.** Sources 1 and 2 both come from VentureBeat's own survey work, so they do not confirm each other. Source 3 is the independent one, and it uses a different kind of evidence (benchmarks, not a survey). The final piece says this where it matters.

## 2. Research brief (sample, in the app's format)

**What happened.** Survey data and a university study now point the same way. Companies ship agents that pass their own tests, then see them fail in real use. Meanwhile, benchmark scores keep rising faster than reliability.

**Why it matters.** Teams that add agents to their work often treat "it passed our tests" as "it is safe to automate". The data says a passed test is weak proof. Many teams also would not notice a failure.

**Who should care.** Founders and operators trying out agents. Engineers who own agent quality. Anyone about to remove a human approval step.

| # | Claim | Source | Label | Confidence | Note |
|---|---|---|---|---|---|
| 1 | Of people who test before release, 42% say an agent or AI feature passed its tests and later failed in the past year. 25% say it happened more than once | 1 | Fact (as reported) | Medium | Small group (106), people chose to answer |
| 2 | In 49% of those cases the worst failure reached customers. In 37% it was caught inside the company | 1 | Fact (as reported) | Medium | The survey question said "customer-facing", which does not quite match. The final piece says "reached customers" |
| 3 | 39% would first hear about bad output from a person (someone checking, a customer, a support ticket), not from an automatic check | 1 | Fact (as reported) | Medium | |
| 4 | Teams with automatic monitoring report more failures (63% vs 34%) | 1 | Fact (as reported) | Medium | |
| 5 | The likely reason is that teams without monitoring miss their failures | 1 | Analysis | Medium | The report calls this the most likely reason and says it cannot rule out others |
| 6 | 24% let agents push low-risk changes to production with no human review. It was 47% in September | 1 | Fact (as reported) | Low | The report says the change may only reflect who answered |
| 7 | Skipping review: 76% report failures. Keeping review: 46%. (21 and 59 people) | 1 | Fact (as reported) | Low | Does not prove skipping review causes failures |
| 8 | Across 14 models over 18 months, accuracy rose steadily and reliability rose only a little | 3 | Fact (as reported) | High | A preprint. Peer review not checked |
| 9 | Run tasks many times, turn every incident into a test, and give agents freedom based on the risk | 2 | Opinion | n/a | These are recommendations, and the piece says so |

**Angles for the newsletter**
1. *"Your AI agent passed its tests. That doesn't mean it works."* (chosen). The testing gap, for operators.
2. *"People are the monitoring system."* Teams without automatic checks depend on humans to notice problems. Removing the humans removes the only alarm.
3. *"Smarter isn't steadier."* The Princeton finding, for readers who like research.

### Left out on purpose

- **"85% of companies pilot agents but only 5% reach production" (Cisco).** It was only found second-hand, in news coverage of a talk. The original Cisco data could not be found.
- **"88% of agents never reach production."** This comes from vendor blogs, it disagrees with the 85/5 figure, and it could not be traced to a source. Two numbers that cannot be checked and disagree are worse than none.
- **VentureBeat's July figure (5% fully trust automatic tests) and the September figure (17%).** The groups and the wording were different, so putting them side by side would suggest a trend that is not real.

---

## 3a. The rough first draft (379 words)

```
Agents Are Getting Smarter, But Are They Getting More Reliable?

Basically, it is important to note that the AI agent hype cycle has reached a point where almost every enterprise is experimenting with agentic workflows, but at this point in time the real question is no longer whether agents can do impressive things in a demo.

A survey was conducted by VentureBeat Intelligence in October, and 106 qualified AI practitioners were asked what actually happens after agents are shipped. It was found that 42% of respondents who run evals before release said that an agent or LLM feature that passed those evals had subsequently failed over the past year, and a quarter of them said that this had actually happened more than once.

Due to the fact that most teams are still relying on humans to notice when an agent goes wrong, which was the case for 39% of respondents who named no automated checks or monitoring thresholds at all, and given that about half of the failures that were reported ended up reaching customers in the form of incorrect output or an escalation or even churn, it seems that the observability story for agents is essentially unfinished.

Meanwhile, autonomy is being expanded. Some 24% of agent deployers say their agents are already allowed to push changes to production without human-in-the-loop review for low-risk changes. That number was 47% in September, so it is falling, but those that skip review reported failures at 76% versus 46% for those that keep review. It is important to note that these groups are small and the survey is self-selected, so the results are directional.

Researchers at Princeton came at the same problem from the other direction. Fourteen models were evaluated across 18 months of releases, and it was found that accuracy rose steadily while reliability, measured as consistency, robustness, predictability and safety, improved only modestly. Literally the models are getting better at the demo and not much better at the Tuesday afternoon.

At the end of the day, what this means is that teams need to treat reliability as a product requirement. Reliability should be measured, reliability should be monitored, and reliability should be tested repeatedly. Agents that are deployed without a regression suite and inline quality assertions are essentially a bet.
```

Problems added on purpose: filler phrases, passive voice, a 75-word sentence, unexplained jargon (*agentic workflows, evals, LLM, human-in-the-loop, observability, regression suite, inline quality assertions*), and the word "reliability" repeated.

## 3b. Feedback from the Writing Assistant

### Scores (live)

| | Words | Average sentence | Reading ease | Level | Reading time |
|---|---|---|---|---|---|
| First draft | 379 | 25.3 words | 38.8 | College | 1.6 min |

### Rule-based findings (live): 26 issues

| Type | Count | Examples |
|---|---|---|
| Long sentence | 3 | One with 75 words (marked *important*). Two with 46 and 44 words (marked *warning*, over 35) |
| Filler phrase | 11 | "Basically", "it is important to note that" (twice), "at this point in time", "due to the fact that", "actually" (twice), "essentially" (twice), "literally", "at the end of the day" |
| Passive voice | 12 | "was conducted", "were asked", "are shipped", "was found" (twice), "were reported", "is being expanded", "were evaluated", and four in the last paragraph ("be measured", "be monitored", "be tested", "are deployed") |

Each filler phrase has either a safe replacement (for example *due to the fact that* becomes *because*) or a delete option. Long sentences and passive voice are advice only.

### AI findings (sample): 8 issues

| Type | Flagged text | Why |
|---|---|---|
| Jargon | "agentic workflows" | Insider word |
| Jargon | "run evals before release" | "Evals" is never explained, and the whole piece depends on it |
| Jargon | "LLM feature" | The short form is never spelled out |
| Jargon | "human-in-the-loop review" | "Review by a person" means the same |
| Jargon | "a regression suite and inline quality assertions" | Two unexplained terms in the closing advice |
| Heavy paragraph | "Meanwhile, autonomy is being expanded." | Four numbers and a warning in four sentences |
| Heavy paragraph | The 75-word sentence | *Same text as the long-sentence rule, so the merge step removes it* |
| Repeated words | "Reliability should be measured, reliability should be..." | "Reliability" appears 3 times in one sentence and 6 times in the last paragraph |

**Overall feedback (sample).** Strong facts, weak writing. The numbers are specific, the sources are recent, and the draft is honest about the survey's limits. But most paragraphs start with throat-clearing, and the longest sentences hide the number the reader came for. The biggest fix: start each paragraph with its verb and its number.

### After merging (live)

26 rule issues + 8 AI issues = **33 issues** after removing repeats (1 repeat removed). **17 have a one-click fix and 16 are advice only.** The advice-only ones are the long sentences, the passive voice and the heavy-paragraph flags.

> The merge step was tested on this exact draft. It wrongly removed three good jargon flags because they sat inside a long sentence. The rule was changed so that only highlights covering almost the same text count as repeats, and a test was added.

### What "accept all fixes" does (live)

Accepting every one-click fix changes the draft like this: 379 to 368 words, reading ease 38.8 to 44.0, passive phrases 12 to 10, and long sentences still 3. **It tidies the text but cannot make it good.** The long sentences and passive voice stay, because they need to be rewritten, not swapped.

It also shows why some edits must stay with the writer. The one-click pass changed "the observability story for agents is **essentially** unfinished" to "...is unfinished". That is a stronger claim, not just a shorter sentence, and nobody chose to make it. Part D explains more.

## 3c. The final piece

*Rewritten using the feedback above. Every number was checked against its source page. 420 words.*

# Your AI agent passed its tests. That doesn't mean it works.

*A new survey and a Princeton study point to the same gap: agents are getting more capable faster than they're getting dependable.*

Almost every enterprise is experimenting with AI agents. The harder question is what happens after they ship.

VentureBeat Intelligence put that question to 106 AI practitioners in October. Among those whose teams run evals (automated tests of an agent's output) before release, 42% said an agent or LLM feature that passed its tests went on to fail in the past year. A quarter said it happened more than once. In about half of those cases, the worst failure reached customers.

Many teams wouldn't have caught it themselves. Thirty-nine percent said a person would spot bad output first: an engineer sampling results, a colleague, a customer, or a spike in support tickets. Teams with automated monitoring reported more failures (63%, against 34%). The likelier explanation, according to VentureBeat, is that the other teams are missing theirs, not that they have fewer.

Some companies are removing human review anyway. Twenty-four percent of agent deployers let agents push low-risk changes to production without a person signing off, down from 47% in September. VentureBeat says it can't rule out that a different mix of respondents explains that drop. Those who skip review also reported more failures than those who require it, 76% against 46%. But the groups are small (21 and 59 people) and self-selected. Treat it as a signal, not proof.

Independent research points the same way. A Princeton team tested 14 models released over 18 months. Accuracy climbed steadily. Reliability, which they measured as consistency, robustness, predictability and safety, improved only modestly. The models are getting better at the demo, and only slightly better at doing the same job correctly every time.

## What to do this week

- **Test repeatability, not just success.** Run the same task many times with different phrasing. One good run shows an agent *can* do the job, not that it *will*.
- **Turn every incident into a permanent test.** A customer escalation or failed tool call should become a regression test (a check that re-runs before every release).
- **Match autonomy to consequences.** Let agents act alone on low-stakes work like summaries and tagging. Keep a person in the loop for payments, customer messages, deploys and deletions.
- **Monitor whether outputs are right, not just whether the agent is up.** Uptime dashboards can look perfect while customers get wrong answers.

If your agent's only credential is that it passed a test, you have a demo.

---

**Sources**

- VentureBeat Intelligence, [VB Pulse Agentic Reliability and Evals Report (October 2026)](https://venturebeat.com/vb-pulse-agentic-reliability-and-evals-report), 106 qualified respondents, self-selected sample.
- Carl Franzen, VentureBeat, [Enterprise AI is entering an evaluation gap](https://venturebeat.com/orchestration/enterprise-ai-is-entering-an-evaluation-gap-agents-are-gaining-autonomy-faster-than-companies-can-verify-them) (July 10, 2026), source of the testing recommendations above.
- Rabanser, Kapoor, Kirgis, Liu, Utpala and Narayanan, Princeton University, [Towards a Science of AI Agent Reliability](https://arxiv.org/abs/2602.16666) (arXiv preprint, February 2026).

### Before and after (live scores)

| | Words | Average sentence | Reading ease | Level | Long sentences | Passive | Filler |
|---|---|---|---|---|---|---|---|
| First draft | 379 | 25.3 | 38.8 | College | 3 | 12 | 11 |
| After "accept all" | 368 | 24.5 | 44.0 | College | 3 | 10 | 0 |
| **Final piece** | 420 | **12.7** | **56.7** | 10th to 12th grade | **0** | **0** | **0** |

The final piece is *longer* than the draft. It adds the meaning of "evals", the warnings about the data, and the "what to do this week" list. Shorter is not the goal. Each added sentence helps the reader act, or keeps a claim honest.

### Notes on the final piece

- Every number was traced to its source page. Two are hedged in the text (47% to 24%, and 76% vs 46%) because the survey's own notes say they are weak.
- The "what to do this week" list is credited to VentureBeat's advice and the Princeton findings. It is not presented as proven fact.
- No long quotes are used. Everything from the sources is put in new words.
