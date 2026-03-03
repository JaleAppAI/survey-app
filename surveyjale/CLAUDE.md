# SurveyJale — CLAUDE.md

Project context and architectural guidelines for Claude Code sessions.

---

## Project Overview

A React-based survey application that supports both typed and voice responses. Voice input is transcribed via AssemblyAI. The app is designed to be reusable across different survey campaigns — questions and conditional logic live in the database, not in the code. Admins can update question sets without touching the codebase.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 (Create React App) | Hosted on Vercel |
| Serverless API | Vercel Serverless Functions | Proxy layer — all external API calls go through here |
| Transcription | AssemblyAI | Free tier: 180 hrs audio. Used for cross-device speech-to-text, including iPhone |
| Database | Supabase (Postgres) | Stores responses, questions, and conditional logic |
| Auth | Supabase Auth | Protects admin view — only authorised users can read results |
| Deployment | Vercel | Hosts both the React frontend and serverless functions |

---

## Architecture

### Security Model
- **API keys never reach the browser.** AssemblyAI and Supabase service-role keys are stored as Vercel environment variables and accessed only within serverless functions.
- All sensitive operations (submitting a response, fetching questions, uploading audio) are routed through `/api/*` serverless functions.
- Serverless functions handle: input validation, response size limits, and basic rate limiting to prevent spam submissions.
- Supabase Row Level Security (RLS) is enabled — responses can only be written or read via the server functions, never directly from the browser.

### Speech Transcription Flow
1. User records audio in the browser (MediaRecorder API).
2. Audio blob is sent to a Vercel serverless function (`/api/transcribe`).
3. The function uploads the audio to AssemblyAI and polls for the transcript.
4. Transcript text is returned to the frontend and populated into the response field.
- AssemblyAI is used instead of the Web Speech API because browser speech recognition is not supported on iPhone (iOS Safari).

### Data Flow
1. Questions and conditional logic are fetched from Supabase on load (via a serverless function).
2. User fills in responses (typed or transcribed).
3. On submission, responses are posted to Supabase via a serverless function.
4. Admin view fetches all responses, protected behind Supabase Auth.

### Question & Conditional Logic Schema
Questions are stored in the database with fields that control branching behaviour — e.g. a response to Q1 may skip or show Q3. This keeps the frontend logic generic and data-driven. Never hardcode question text or flow in the React components.

---

## Project Structure

```
surveyjale/
├── public/
├── src/
│   ├── App.js              # Root component, renders active question set
│   ├── App.css             # Global app styles (background, layout)
│   ├── index.js            # React entry point
│   ├── index.css           # Base body/font styles
│   └── Components/
│       ├── Question.js     # Renders a single survey question (text + voice)
│       └── Question.css    # Question component styles
├── api/                    # Vercel serverless functions (to be created)
│   ├── transcribe.js       # Proxies audio upload to AssemblyAI
│   ├── submit.js           # Writes responses to Supabase
│   └── questions.js        # Fetches question set from Supabase
├── CLAUDE.md
└── package.json
```

---

## Styling Guidelines

- **Brand colors:** White, grey, and blue (primary).
- **No inline styles** — all styles live in co-located `.css` files next to their component.
- Component cards use white backgrounds, grey borders (`#dde3ed`), and blue (`#2563eb`) as the accent.
- No box shadows on buttons. Hover state = color change only.
- Page background: light grey (`#f1f4f9`).

---

## Key Constraints & Decisions

- **Do not use the Web Speech API** — it fails silently on iOS. All transcription goes through AssemblyAI via a server function.
- **Do not call AssemblyAI or Supabase directly from the frontend.** Always route through `/api/*` functions.
- **Do not hardcode questions** in React components. Questions are fetched from the database.
- Keep serverless functions thin — validate input, call the external service, return the result. No business logic in the database layer.
- The app must work on mobile, including iPhone Safari.

---

## Environment Variables

Stored in Vercel (never committed to the repo). Local development uses a `.env.local` file (gitignored).

```
ASSEMBLYAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # Server-side only, never exposed to browser
SUPABASE_ANON_KEY=           # Safe for use in serverless functions for auth checks
```

---

## Development

```bash
npm start       # Run locally on http://localhost:3000
npm test        # Run test suite
npm run build   # Production build
```

For serverless functions locally, use the Vercel CLI:
```bash
vercel dev      # Runs frontend + /api/* functions together
```
