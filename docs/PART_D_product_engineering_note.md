# Part D: Product and engineering note

## 1. Product thinking

**Who is the main user?**
The writer-editor of a small AI newsletter. One to three people, a new issue every week, and readers who are smart but not experts (founders, builders, operators). They have little time, and their name is on the work, so mistakes cost them. They write the piece themselves. They do not want a tool that writes it for them.

**What is the real problem?**
Typing is not the slow part. Two other things are:
1. **Knowing what to trust.** Turning five noisy sources into: what happened, how strong is the proof, and what is the angle? While preparing Part C, three different adoption numbers turned up from sources that could not be traced back to real data. Spotting that is the job.
2. **Writing clearly under a deadline.** First drafts drift into filler, passive voice and unexplained jargon, and writers cannot see this in their own text.

**The workflow**
`3 or more links (or pasted text)` > **research brief** (what, why, who, claims with labels, 2 or 3 angles) > the writer picks an angle > **the writer writes** > **Writing Assistant** (scores, highlights, safe one-click fixes, dismiss the rest) > compare versions > publish. The "Start writing" button carries the chosen angle from the research page to the writing page.

**What was built first, and why**

| Built | Why |
|---|---|
| Link reading with a paste-text backup | Links fail all the time (paywalls, pages built with JavaScript). The backup keeps the work moving |
| Claims labeled fact, analysis, guess or opinion, with a quote check | Trust is the main problem, so it is the main feature |
| Plain-code writing rules and reading scores | Instant, free, the same every time, with exact positions |
| AI check for jargon, heavy paragraphs and repeated words | These need judgment about the reader, which rules cannot give |
| Accept or dismiss, with a before-and-after view | The writer stays in control and sees every change |

**What was left out on purpose**
- **Writing the draft for the user.** The writer's voice is the product. The angle's hook is only a starting point.
- Accounts, saved history, teamwork and comments. A team needs them. Proving the main loop does not.
- Publishing to Substack or a CMS. A copy button gives most of the value.
- Learning the newsletter's own style. It is useful, but first we need data on what writers accept and reject.
- Watching sources over time, other languages, and image making.

**How to measure success** (these are ideas to measure, not results)

| Measure | What it tells us |
|---|---|
| Time from sources to a draft that is ready to publish | The main time saving. Compare with the writer's current way of working |
| Corrections after publishing, per issue | **The most important measure.** Faster work that causes more mistakes is a failure |
| Accept rate for each type of issue | If a type is accepted less than about 1 time in 5, it is mostly noise. Fix it or remove it |
| How often the brief is sent to the editor | Shows whether the brief is really used |
| How often a quote is not found in its source | Shows how often the AI claims too much. It should fall over time |
| How often the writer changes a claim's label | A direct measure of label quality |
| Change in reading ease, draft to final | A sanity check only (see part 3) |
| Reader replies and clicks | Slow and noisy, but this is the real result |

A warning measure: if every issue starts to sound the same, the tool is flattening the writer's voice.

## 2. Engineering

**Structure.** Next.js with thin route files. The logic that matters sits in small plain files under `src/lib/` (`writing-rules`, `text-edit`, `dedupe`). They have no web or AI parts, so they are easy to test, and the browser can use them too. All AI calls go through one function, `generateContent`, which handles the timeout, one retry and broken JSON. Changing the AI model means changing one file or one setting. Shared types describe the data. 15 tests cover the plain logic.

**What the AI does and what plain code does.** The rule: *if something has a right answer, needs exact positions, or must give the same result every time, plain code does it. If it needs judgment about a reader, the AI does it. And plain code checks the AI.*

- Plain code: sentence length, filler phrases, passive voice, reading score, reading time, applying an edit, updating positions, removing repeated issues, checking links, checking quotes.
- AI: jargon for this audience, heavy paragraphs, repeated words, claim labels, the summary, the angles.
- Checks on the AI: if a flagged piece of text is not really in the draft, it is thrown away (a highlight in the wrong place is worse than none). If a cited link was never opened, the link is removed. If a claim's quote is not in the source, the claim is downgraded.

**When links or the AI fail**
- Links are opened at the same time, and each one can fail alone.
- The 10-second timer covers the whole download. (Stopping the timer early would let a slow page hang forever.)
- Other protections: a size limit on pages, a check on the page type, skipping repeated links, and a block on private or internal addresses. The block is checked again after every redirect.
- If every link fails, the app returns a clear message listing each reason, and the writer can paste the text instead.
- Public endpoints limit each visitor and cap the input size, because every AI call uses the owner's quota.
- The AI model itself can disappear. During testing, `gemini-2.0-flash` turned out to be switched off by Google. The app now reads the model from settings. If a model is not found, it tries the next one in a short list and remembers the one that works. Other errors, such as a bad key, are not hidden by trying other models.
- The AI call has a 45-second limit and one retry for busy or rate-limit errors. Broken JSON from the AI is cleaned up, and if it still fails the app shows a clear error.
- If the AI is down, the Writing Assistant still gives rule-based feedback and says so. This was tested with no key set: the Writing route still answers normally, and the Research route returns a clean "not available" error, not a crash.
- *Not done yet:* caching, queues, a hard visitor limit (the current one is per server and kept in memory), and a way to read pages that need JavaScript.

**Checking the facts the AI reports**
What exists now: the AI must give an exact quote for each claim. Plain code then checks that the quote is really in the source text. A claim without a matching quote is flagged on screen, loses its "verified fact" label, and gets low confidence.

What this does *not* prove: a quote being in the article does not mean the claim is true, and it does not mean the claim describes the quote fairly. The label "verified fact" also says too much. It really means "the source states this as a fact". A better name would be "reported fact".

Next steps, in order:
1. Check that the numbers in a claim also appear in its quote.
2. Ask for a second, independent source before giving high confidence. "Independent" must take ownership into account. In the Part C sample, two of the three sources came from the same publisher.
3. Give more weight to original data than to news coverage, and more to news coverage than to vendor blogs.

**Bugs found and fixed during testing**
The code was tested by running it on real drafts and links. These problems were found and fixed:
1. **Accept replaced the writer's text with advice.** Clicking Accept pasted advice like "Break this into two or more shorter sentences..." over the flagged sentence. Now advice (`suggestion`) and the text to swap in (`replacement`) are separate fields. Only issues with a `replacement` can be accepted.
2. Accepting changed the text from inside another update. In development, React runs such updates twice, so a fix could be applied twice. It is now one clean step.
3. Highlight positions were off after blank lines between paragraphs. Fixed and tested.
4. A repeated phrase always highlighted its first match, and edits made after analysis were not tracked. Highlights now use positions and find the nearest match after edits.
5. AI flags whose text could not be found were pinned to the start of the document. They are now dropped.
6. False passive-voice hits ("is red", "need") and "U.S." breaking sentences in two.
7. The research page opened every link twice (browser, then server), and the server opened them one by one. Now once, all at the same time.
8. The "live" scores were not live. They update as the text changes now.
9. The step that removes repeated issues also removed good jargon flags that sat inside a long sentence. Found by running a real draft, not by the tests.
10. A capital-letter bug turned "an LLM feature" into "an Feature" after accepting a fix.
11. Smaller problems: a font import in the wrong place, the root layout was a client component, and an unused package.

**What to improve with one more day, in order**
1. **A set of about 20 real drafts with human-marked issues**, to measure how often each rule is right or wrong and to catch changes to the AI prompt that make things worse. Right now "it seems to work" is the only proof. This is the most valuable next step.
2. **Fact checking across sources** and number matching (see above).
3. **Settings per audience:** turn rules on or off, and keep a list of terms the readers already know, so "LLM" is not flagged for an AI newsletter. Accept rates would help set these.
4. Highlights inside the editor itself (today they show in a separate box), progress while loading, and caching of opened pages.
5. Better passive voice detection. Cases with a word in between, like "are already allowed", are missed today. A small grammar tagger would fix that.
6. A shared visitor limit that works across servers, and saving briefs and drafts.

## 3. Editorial judgment

**What makes writing clear and useful (for founders and operators)**
- It puts the news and the "so what" in the first two sentences.
- It is specific: real numbers, with where they came from and their limits, not "many companies".
- One idea per paragraph. Mostly short, concrete sentences. Jargon is explained or removed.
- It separates what was reported from what is guessed, and it is honest about what is unknown.
- It ends with something the reader can do. Useful means the reader can decide or act.

**How to judge a piece (written with AI help or not)**
1. **Accuracy:** can every number be traced to a page someone really opened?
2. **Proof vs wording:** does the text claim no more than the source supports?
3. **Independent sources:** are "three sources" really three?
4. **Clarity:** would a smart person outside the field follow it in one read? Reading scores and sentence length are *hints*, not goals. The final piece in Part C scores 56.7 and the first draft 38.8, but the draft is not bad *because of* the number.
5. **Insight:** does it say something the headlines did not, or just repeat them?
6. **Action** and **voice.**

**What tools should not change on their own**
- **Numbers, quotes and who said what.** Never rewrite these.
- **How strong a claim is.** A hedge word is a statement about the proof. In Part C, the tool's own "accept all" changed "essentially unfinished" to "unfinished". That is shorter, but it is a stronger claim that nobody chose. This is why the app only applies swaps that are small, local and keep the meaning. Removing hedge words is the writer's call.
- **Warnings and limits.** The notes about small samples are the honest part of the piece.
- **Passive to active, everywhere.** Passive is right when the actor is unknown or does not matter ("the data was stolen"). The tool points it out and explains. The writer decides.
- **Picking the angle, or what counts as news.** That is the editor's job and what readers pay for.
- **Voice.** Rhythm, humor, and a well-placed "actually" belong to the writer. A tool that removes them makes every issue sound the same.

**The rule behind all of this:** the tool should make the writer's judgment faster and better informed, never replace it. Every automatic change must be visible, easy to undo, and limited to cases where the meaning cannot change.
