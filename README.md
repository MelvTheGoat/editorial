# AI Editorial Workspace

A small web app that helps a newsletter writer with two jobs: **researching** a story and **editing** a draft.

## What it does

**1. Research Assistant** (`/research`)
- You give it 3 or more article links (or paste the text).
- It reads them and writes a short brief: what happened, why it matters, and who should care.
- It lists the main claims and labels each one: fact, analysis, guess, or opinion.
- For each claim it checks that the quote it relies on really appears in the article.
- It suggests 2 or 3 angles for the newsletter.

**2. Writing Assistant** (`/writing`)
- You paste a draft.
- It shows word count, reading time and a reading-ease score.
- It highlights long sentences, passive voice, filler phrases, jargon, heavy paragraphs and repeated words.
- Where a fix is safe, you can accept it with one click. Otherwise it gives advice and you rewrite the text yourself.
- You can compare the new version with the old one.

## Read more

- [Part C: sample editorial output](docs/PART_C_sample_editorial_output.md) (sources, a rough draft, the feedback, and the final piece)
- [Part D: product and engineering note](docs/PART_D_product_engineering_note.md)

## Run it on your computer

You need Node.js 18 or newer and a free Gemini API key from https://aistudio.google.com/app/apikey.

```bash
npm install
cp .env.example .env.local     # on Windows PowerShell: copy .env.example .env.local
```

Open `.env.local` and add your key:

```
GEMINI_API_KEY=your_key_here
```

Then start the app:

```bash
npm run dev
```

Open http://localhost:3000.

Other commands:

```bash
npm test         # runs the 15 tests (no API key needed)
npm run build    # makes the production build
```

**Model name:** Google switches off old Gemini models from time to time. You can choose one with `GEMINI_MODEL` in `.env.local`. If you don't, the app tries `gemini-3.6-flash`, then `gemini-3.8-flash`, then `gemini-2.5-flash`.

**No key?** The app still starts. The Writing Assistant then gives rule-based feedback only, and says so on screen. The Research Assistant shows a clear error.

## Put it online (Render)

The repo includes a `render.yaml` file, so Render can read the settings below on its own (**New > Blueprint**). You can also set them by hand:

1. `package.json` must be at the top level of the repo.
2. On https://render.com choose **New > Web Service** and pick the repo.
3. Use these settings:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

4. Add these environment variables:
   - `GEMINI_API_KEY`: your key (needed)
   - `NODE_VERSION`: `20`
   - `NEXT_PUBLIC_SITE_URL`: the live link, with no `/` at the end (optional)
5. After it deploys, open `/api/health`. You should see `"llmConfigured":true`.

On Render's free plan the site goes to sleep when nobody uses it. The first visit after a break can take about a minute.

Keep the real key out of Git. It lives in `.env.local` on your computer and in Render's environment settings.

## How it works

The main idea: **the AI suggests, and plain code checks.**

| Job | Done by | Why |
|---|---|---|
| Sentence length, filler words, passive voice, reading score | Plain code | These have clear answers, must give the same result every time, and need exact positions in the text |
| Making an edit and updating the other highlights | Plain code | The AI should never rewrite the writer's text directly |
| Jargon, heavy paragraphs, repeated words | The AI | These need judgment about the reader |
| Summary, claim labels, angles | The AI | These need reading and understanding |
| Is the quote really in the article? | Plain code | The AI's answer is checked against the real article text |
| Is a highlight really in the draft? | Plain code | A highlight that can't be found in the draft is thrown away |

Every issue has two separate fields: `suggestion` (advice for the writer) and `replacement` (exact text that can be swapped in). **Only issues that have a `replacement` get an Accept button.**

A claim marked "verified fact" only means the article states it as a fact and the quote was found in the article. It does not mean the claim is true.

```
src/
  app/
    api/fetch-url/route.ts        opens one link
    api/research/route.ts         opens all links, asks the AI, checks the answer
    api/writing/analyze/route.ts  rule checks + AI checks, merged
    api/health/route.ts           shows if the app is set up
    research/page.tsx             Research page
    writing/page.tsx              Writing page
  components/                     nav bar and icons
  lib/
    writing-rules.ts   rule checks and reading score
    text-edit.ts       applies an accepted fix and moves the other highlights
    dedupe.ts          removes repeated issues
    url-fetcher.ts     opens web pages safely
    rate-limit.ts      stops one visitor using too much
    gemini.ts          talks to the AI (timeout, retry, model fallback)
  types/index.ts       shared data shapes
tests/                 the test file
```

## What happens when something goes wrong

- Links are opened at the same time. If one fails, the others still work, and each link shows its own status.
- A link that takes more than 10 seconds is stopped. If every link fails, the app says why and you can paste the text instead.
- If the AI is slow or busy, the app waits and tries once more. If it still fails, the Writing Assistant gives rule-based feedback only.
- If the AI sends back broken data, the app shows a clear error and does not crash.
- The app refuses links to private or internal addresses, and checks again after each redirect.
- Each visitor is limited to 10 AI requests a minute. Drafts are limited to 50,000 characters.

## Known limits

- Pages that need JavaScript to show their text, or that are behind a paywall, can't be read. Paste the text instead.
- Only the first 12,000 characters of each article are used.
- Passive voice is found with a pattern, so it can miss some cases (for example "are **already** allowed") and flag some by mistake. Treat it as a hint.
- The reading score uses a simple syllable counter, so it is an estimate.
- The visitor limit is kept in memory, so it slows down casual misuse but is not a hard cap. A shared store such as Redis would make it hard.
- Nothing is saved. Drafts and briefs live only in the browser tab.

## Tests

`npm test` runs 15 tests. They check, for example, that highlights sit in the right place, that accepting a fix changes the text correctly, that unsafe web addresses are blocked, and that the visitor limit works.
