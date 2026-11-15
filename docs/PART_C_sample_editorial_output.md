# Part C: Sample Editorial Output

**Topic:** AI agents are getting more capable, but not much more reliable.
**For:** founders, builders and operators.
**Researched:** 10 November 2026.

## Sources

1. VentureBeat Intelligence, [VB Pulse Agentic Reliability and Evals Report](https://venturebeat.com/vb-pulse-agentic-reliability-and-evals-report) (survey of 106 people, October 2026). Main data.
2. Carl Franzen, VentureBeat, [Enterprise AI is entering an evaluation gap](https://venturebeat.com/orchestration/enterprise-ai-is-entering-an-evaluation-gap-agents-are-gaining-autonomy-faster-than-companies-can-verify-them) (10 July 2026). Source of the recommendations.
3. Rabanser et al., Princeton, [Towards a Science of AI Agent Reliability](https://arxiv.org/abs/2602.16666) (preprint, February 2026). Independent evidence.

Sources 1 and 2 are both VentureBeat's own work, so they don't confirm each other. Source 3 is the independent one.

## Research brief

**What happened.** A survey and a university study point the same way: agents pass their tests, then fail in real use. Benchmark scores rise faster than reliability.

**Why it matters.** Teams treat "it passed our tests" as "safe to automate." The data says a passed test is weak proof, and many teams wouldn't notice a failure.

**Who should care.** Founders and operators trying agents, engineers who own agent quality, and anyone about to remove a human approval step.

**Angles**
1. *Your AI agent passed its tests. That doesn't mean it works.* (chosen)
2. *People are the monitoring system.* Remove the humans and you remove the only alarm.
3. *Smarter isn't steadier.* The Princeton finding.

**Left out on purpose:** the "85% pilot, 5% reach production" and "88% never reach production" figures (second-hand, disagree with each other, couldn't be traced to a source), and VentureBeat's July vs September trust figures (different groups and wording, so no real trend).

## First draft (379 words)

```
Agents Are Getting Smarter, But Are They Getting More Reliable?

Basically, it is important to note that the AI agent hype cycle has reached a point where almost every enterprise is experimenting with agentic workflows, but at this point in time the real question is no longer whether agents can do impressive things in a demo.

A survey was conducted by VentureBeat Intelligence in October, and 106 qualified AI practitioners were asked what actually happens after agents are shipped. It was found that 42% of respondents who run evals before release said that an agent or LLM feature that passed those evals had subsequently failed over the past year, and a quarter of them said that this had actually happened more than once.

Due to the fact that most teams are still relying on humans to notice when an agent goes wrong, which was the case for 39% of respondents who named no automated checks or monitoring thresholds at all, and given that about half of the failures that were reported ended up reaching customers in the form of incorrect output or an escalation or even churn, it seems that the observability story for agents is essentially unfinished.

Meanwhile, autonomy is being expanded. Some 24% of agent deployers say their agents are already allowed to push changes to production without human-in-the-loop review for low-risk changes. That number was 47% in September, so it is falling, but those that skip review reported failures at 76% versus 46% for those that keep review. It is important to note that these groups are small and the survey is self-selected, so the results are directional.

Researchers at Princeton came at the same problem from the other direction. Fourteen models were evaluated across 18 months of releases, and it was found that accuracy rose steadily while reliability, measured as consistency, robustness, predictability and safety, improved only modestly. Literally the models are getting better at the demo and not much better at the Tuesday afternoon.

At the end of the day, what this means is that teams need to treat reliability as a product requirement. Reliability should be measured, reliability should be monitored, and reliability should be tested repeatedly. Agents that are deployed without a regression suite and inline quality assertions are essentially a bet.
```

## Feedback on the draft

| Check | Found |
|---|---|
| Long sentences | 3 (75, 46 and 44 words) |
| Filler phrases | 11 ("basically," "it is important to note that," "due to the fact that," "at the end of the day," and others) |
| Passive voice | 12 ("was conducted," "were asked," "be measured," and others) |
| Jargon | "agentic workflows," "evals," "LLM," "human-in-the-loop," "regression suite," "inline quality assertions" |
| Heavy paragraph | The "Meanwhile" paragraph: four numbers and a warning in four sentences |
| Repeated word | "reliability" appears 6 times in the last paragraph |

*The jargon, heavy-paragraph and repeated-word flags are illustrative. Paste the draft into `/writing` for live results. The sentence, filler and passive-voice counts and the scores below are live output.*

**Overall:** The facts are strong and the draft is honest about the survey's limits. But paragraphs open with throat-clearing and the long sentences bury the number. Biggest fix: start each paragraph with its verb and its number.

**One-click fixes alone aren't enough.** Accepting every safe fix took the draft from 379 to 368 words and reading ease from 38.8 to 44.0. The long sentences and passive voice stayed, because they need a rewrite, not a swap. It also changed "is **essentially** unfinished" to "is unfinished," which is a stronger claim nobody chose to make. That is why the tool leaves meaning-changing edits to the writer.

## Final piece (420 words)

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

**Sources**

- VentureBeat Intelligence, [VB Pulse Agentic Reliability and Evals Report](https://venturebeat.com/vb-pulse-agentic-reliability-and-evals-report) (October 2026). 106 respondents, self-selected.
- Carl Franzen, VentureBeat, [Enterprise AI is entering an evaluation gap](https://venturebeat.com/orchestration/enterprise-ai-is-entering-an-evaluation-gap-agents-are-gaining-autonomy-faster-than-companies-can-verify-them) (10 July 2026). Source of the recommendations.
- Rabanser et al., Princeton, [Towards a Science of AI Agent Reliability](https://arxiv.org/abs/2602.16666) (preprint, February 2026).

## Before and after

| | Words | Avg. sentence | Reading ease | Long sentences | Passive | Filler |
|---|---|---|---|---|---|---|
| First draft | 379 | 25.3 | 38.8 | 3 | 12 | 11 |
| After one-click fixes | 368 | 24.5 | 44.0 | 3 | 10 | 0 |
| **Final piece** | 420 | **12.7** | **56.7** | **0** | **0** | **0** |

The final piece is longer than the draft on purpose. The added sentences explain "evals," flag weak data, and give the reader something to do.

Every number was checked against its source page. Two are hedged in the text (47% to 24%, and 76% vs 46%) because the survey itself calls them weak. The recommendations are credited to VentureBeat and not presented as proven. Nothing is quoted; all source material is reworded.
