# Part D: Product and Engineering Note

## Product thinking

**Who it's for.** The writer-editor of a small weekly AI newsletter. Their readers are smart but not experts, they have little time, and their name is on the work. They want help with the writing, not a tool that writes it for them.

**The problem I chose.** Typing isn't the slow part. Two other things are:
1. **Knowing what to trust.** While researching Part C, I found three different adoption numbers that I couldn't trace back to real data. Catching that is the job.
2. **Writing clearly on a deadline.** Drafts drift into filler, passive voice and unexplained jargon, and writers can't see it in their own text.

**The workflow.** Add 3+ links (or paste text) → research brief with labeled claims and 2-3 angles → pick an angle → write the draft → run it through the Writing Assistant → accept or dismiss fixes → compare versions.

**What I built first.** Link reading with a paste-text backup (links fail often), claim labels with a quote check (trust is the main problem), plain-code writing rules, and accept/dismiss with a before-and-after view so the writer stays in control.

**What I left out on purpose.** Writing the draft for the user (the writer's voice is the product), accounts and saved history, publishing to a CMS, learning a newsletter's house style, and watching sources over time. I also skipped the Pocket-style "push" input, where a browser extension saves articles or tweets straight into the app. Links and pasted text cover the same need for now, and an extension is a separate build that doesn't prove the main loop. Tweets work if you paste the text. None of these are needed to prove the main loop.

**How I'd measure success.**
- Corrections after publishing, per issue. This matters most. Faster work that causes more mistakes is a failure.
- Time from sources to a publish-ready draft.
- Accept rate per issue type. Under about 1 in 5 means it's mostly noise.
- How often a claim's quote isn't found in its source, and how often the writer changes a claim's label.
- Reader replies and clicks. Slow and noisy, but the real result.

I'd also watch for every issue starting to sound the same, which would mean the tool is flattening the writer's voice.

## Engineering

**Structure.** A Next.js app with thin route files. The logic that matters lives in small plain files in `src/lib/` (writing rules, text edits, de-duplication), so it's easy to test. Every AI call goes through one function that handles the timeout, one retry and broken output. 15 tests cover the plain logic.

**What uses AI and what doesn't.** My rule: if something has a right answer, needs exact positions, or must give the same result every time, plain code does it. If it needs judgment about a reader, the AI does it. Plain code then checks the AI.
- **Plain code:** sentence length, filler, passive voice, reading score, applying edits, link checks, quote checks.
- **AI:** jargon, heavy paragraphs, repeated words, claim labels, summary, angles.
- **Checks on the AI:** a highlight not found in the draft is dropped, a link that was never opened is removed, and a claim whose quote isn't in the source loses its "verified fact" label.

**When things fail.**
- Links load in parallel, so one failure doesn't block the rest. Each has a 10-second limit, a size limit, and a block on private addresses (rechecked after redirects).
- If every link fails, the app explains why and the writer can paste the text.
- The AI call has a 45-second limit and one retry. If it still fails, Writing falls back to rule-based feedback and says so. Research shows a clean error.
- Google switched off a model I was using mid-testing, so the model is now a setting with a short fallback list.
- Not done: caching, a hard rate limit (it's in memory), and reading JavaScript-only pages.

**Do the sources support the claims?** Each claim needs an exact quote, and code checks that the quote is really in the article. This does *not* prove the claim is true, so "verified fact" really means "the source states this as fact." I'd rename it "reported fact."

**Bugs I found by running real drafts.** The worst one: clicking Accept pasted advice text over the writer's sentence. I split each issue into `suggestion` (advice) and `replacement` (text to swap in), and only issues with a replacement get an Accept button. I also fixed highlights drifting after blank lines, and a clean-up step that wrongly deleted good jargon flags inside long sentences.

**With one more day.**
1. Build a set of about 20 real drafts with human-marked issues, so I can measure how often each rule is right instead of relying on "it seems to work."
2. Check that numbers in a claim appear in its quote, and require a second *independent* source for high confidence. In Part C, two of my three sources came from the same publisher.
3. Per-audience settings, like a list of terms readers already know, so "LLM" isn't flagged for an AI newsletter.
4. Better passive-voice detection (it misses cases like "are already allowed") and highlights inside the editor itself.

## Editorial judgment

**What makes writing clear and useful.** The news and the "so what" come in the first two sentences. It uses specific numbers with their source and limits, not "many companies." Each paragraph has one idea, jargon is explained, and what was reported is kept separate from what is guessed. It ends with something the reader can do.

**How I'd tell if the assistant improves a draft.** I'd check that every number traces to a page, that nothing claims more than its source, and that a smart outsider follows it in one read. Reading scores are hints, not goals. My final piece scores 56.7 against 38.8 for the draft, but the draft isn't bad *because of* that number.

**What the tool should never change on its own.**
- **Numbers, quotes and who said what.**
- **How strong a claim is.** Hedge words are statements about the evidence. When I tested "accept all," it changed "essentially unfinished" to "unfinished," which is a stronger claim nobody chose. So the app only applies small swaps that can't change the meaning.
- **Warnings and limits.** The notes about small samples are the honest part of the piece.
- **Passive to active.** Passive is right when the actor is unknown. The tool explains, and the writer decides.
- **The angle and what counts as news.** That's the editor's job.
- **Voice.** Rhythm and humor belong to the writer.

The tool should make the writer's judgment faster, never replace it.

## Tools used

I used AI to assist me, not to do the work. The decisions, the logic and the implementation are mine. AI helped most with the user interface, and it also helped me refine my work and add points I'd missed.

**What I did myself**
- Decided what to build and why: the split between plain code and AI, the writing rules, the quote check, and the accept/dismiss flow.
- Built the logic: the writing checks, the text-edit and highlight handling, the link fetching and its failure handling, and the research and writing routes.
- Wrote my sample piece and the Part C and Part D notes. AI then helped me tighten the wording.
- Set up the GitHub repo and deployed the app on Render.

**Where AI helped**
- **The user interface.** This is where I leaned on AI the most. I told it what each page needed to do, and it helped me build the screens.
- **Refining my work.** I used Claude (Anthropic) to review my code, catch bugs, and suggest points I hadn't thought of. I made the final call on what went in.
- **Inside the app.** The Google Gemini API writes the research brief and finds jargon, heavy paragraphs and repeated words. The model is set with `GEMINI_MODEL`.

**How I tested it**
- Ran the app locally and tried both pages with the sample draft and links.
- Checked the highlights, one-click fixes, dismiss button and before-and-after view.
- Ran the 15 automated tests (`npm test`), a TypeScript check and a production build.
- Sent real requests to each API route: no API key, bad links, private addresses, too many requests, and drafts that are too long.
- Checked every number in the final piece against its source page.
