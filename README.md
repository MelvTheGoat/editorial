# AI Editorial Workspace

A small web app for newsletter writers: research a story, then edit the draft.

**Live:** `<your-render-url>`

## What it does

**Research (`/research`)**: Add 3+ article links (or paste text). You get a short brief (what happened, why it matters, who should care), claims labeled as fact, analysis, guess or opinion, a check that each quote really appears in the article, and 2-3 newsletter angles.

**Writing (`/writing`)**: Paste a draft. You get word count, reading time and a reading-ease score. Long sentences, passive voice, filler, jargon, heavy paragraphs and repeated words are highlighted. Safe fixes can be accepted with one click, and you can compare old and new versions.

## Run it locally

You need Node 18+ and a free [Gemini API key](https://aistudio.google.com/app/apikey).

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# add GEMINI_API_KEY=your_key to .env.local
npm run dev                  # http://localhost:3000
```

`npm test` runs 15 tests (no key needed). Without a key, Writing gives rule-based feedback only and Research shows an error. Set `GEMINI_MODEL` to pick a model.

## Deploy (Render)

New > Blueprint (uses `render.yaml`). Set `GEMINI_API_KEY` and `NODE_VERSION=20`. Health check: `/api/health`.

## Key decisions

- **AI suggests, code checks.** Sentence length, passive voice, filler and readability are plain code (same result every time, exact positions). Summaries, claim labels, jargon and angles use the AI.
- **The AI never rewrites text directly.** Each issue has *advice* and an optional *replacement*. Only issues with a replacement get an Accept button.
- **Quotes are verified.** Each quote is checked against the real article text. Highlights not found in the draft are dropped.
- **"Verified fact" means the article states it and the quote exists.** It does not mean the claim is true.

## Failure handling

- Links load in parallel, and one failure doesn't block the rest.
- 10-second timeout per link, and private or internal addresses are blocked.
- AI calls retry once, then fall back to rule-based feedback.
- Broken AI output shows a clear error instead of crashing.
- Rate limit: 10 AI requests per minute. Draft limit: 50,000 characters.

## Known limits

- JavaScript-only and paywalled pages can't be read (paste the text instead).
- Only the first 12,000 characters of each article are used.
- Passive-voice detection is pattern-based, so treat it as a hint.
- The rate limit is in-memory, and nothing is saved.

## Tools used

*(Add which AI tools you used and what you built, tested and verified yourself. The assignment requires this.)*
